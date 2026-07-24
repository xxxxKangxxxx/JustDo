import Foundation

public enum PlannedNotificationKind: String, Codable, Equatable, Sendable {
    case taskBriefing
    case taskSchedule
    case habit
}

public struct PlannedNotification: Identifiable, Codable, Equatable, Sendable {
    public var id: String
    public var kind: PlannedNotificationKind
    public var fireDate: Date
    public var title: String
    public var body: String
    public var targetDate: String
    public var taskIDs: [UUID]
    public var habitIDs: [UUID]

    public init(
        id: String,
        kind: PlannedNotificationKind,
        fireDate: Date,
        title: String,
        body: String,
        targetDate: String,
        taskIDs: [UUID] = [],
        habitIDs: [UUID] = []
    ) {
        self.id = id
        self.kind = kind
        self.fireDate = fireDate
        self.title = title
        self.body = body
        self.targetDate = targetDate
        self.taskIDs = taskIDs
        self.habitIDs = habitIDs
    }
}

public enum NotificationPlanner {
    private struct TaskBucket {
        var fireDate: Date
        var targetDate: String
        var briefingTasks: [Task] = []
        var scheduledTasks: [Task] = []
    }

    private struct HabitBucket {
        var fireDate: Date
        var targetDate: String
        var habits: [Habit] = []
    }

    public static func plan(
        snapshot: AppSnapshot,
        now: Date = Date(),
        horizonDays: Int = 14,
        calendar sourceCalendar: Calendar = .current
    ) -> [PlannedNotification] {
        guard snapshot.settings.notify else {
            return []
        }

        let calendar = sourceCalendar
        let startOfToday = calendar.startOfDay(for: now)
        let endDate = calendar.date(
            byAdding: .day,
            value: max(1, horizonDays),
            to: startOfToday
        ) ?? now

        var taskBuckets: [Date: TaskBucket] = [:]
        if snapshot.settings.taskBriefingNotify {
            addBriefings(
                snapshot: snapshot,
                now: now,
                endDate: endDate,
                startOfToday: startOfToday,
                calendar: calendar,
                buckets: &taskBuckets
            )
        }
        if snapshot.settings.taskScheduleNotify {
            addTaskSchedules(
                snapshot: snapshot,
                now: now,
                endDate: endDate,
                calendar: calendar,
                buckets: &taskBuckets
            )
        }

        var plans = taskBuckets.values.compactMap {
            taskPlan(from: $0, calendar: calendar)
        }

        if snapshot.settings.habitNotify {
            plans.append(
                contentsOf: habitPlans(
                    snapshot: snapshot,
                    now: now,
                    endDate: endDate,
                    startOfToday: startOfToday,
                    calendar: calendar
                )
            )
        }

        return plans
            .filter { $0.fireDate > now && $0.fireDate <= endDate }
            .sorted {
                if $0.fireDate != $1.fireDate {
                    return $0.fireDate < $1.fireDate
                }
                return $0.id < $1.id
            }
    }

    private static func addBriefings(
        snapshot: AppSnapshot,
        now: Date,
        endDate: Date,
        startOfToday: Date,
        calendar: Calendar,
        buckets: inout [Date: TaskBucket]
    ) {
        var day = startOfToday
        while day <= endDate {
            let iso = isoDate(day, calendar: calendar)
            let tasks = snapshot.tasks
                .filter { !$0.isCompleted && $0.startDate <= iso && iso <= $0.endDate }
                .sorted(by: taskOrder)

            if !tasks.isEmpty,
               let fireDate = date(iso: iso, time: snapshot.settings.notifyTime, calendar: calendar),
               fireDate > now,
               fireDate <= endDate {
                var bucket = buckets[fireDate] ?? TaskBucket(
                    fireDate: fireDate,
                    targetDate: iso
                )
                bucket.briefingTasks = tasks
                buckets[fireDate] = bucket
            }
            guard let next = calendar.date(byAdding: .day, value: 1, to: day) else {
                break
            }
            day = next
        }
    }

    private static func addTaskSchedules(
        snapshot: AppSnapshot,
        now: Date,
        endDate: Date,
        calendar: Calendar,
        buckets: inout [Date: TaskBucket]
    ) {
        for task in snapshot.tasks where !task.isCompleted && task.reminderMode != .none {
            let offsets: [Int]
            switch task.reminderMode {
            case .defaultValue:
                guard task.scheduledTime != nil else {
                    continue
                }
                offsets = [snapshot.settings.defaultTaskReminderMinutes]
            case .custom:
                offsets = task.reminderOffsetsMinutes
            case .none:
                offsets = []
            }

            let dueDate: Date
            if let scheduledTime = task.scheduledTime {
                guard let date = date(iso: task.startDate, time: scheduledTime, calendar: calendar) else {
                    continue
                }
                dueDate = date
            } else {
                guard
                    task.reminderMode == .custom,
                    let date = date(
                        iso: task.startDate,
                        time: snapshot.settings.notifyTime,
                        calendar: calendar
                    )
                else {
                    continue
                }
                dueDate = date
            }

            var fireDates = Set<Date>()
            for offset in offsets {
                if task.scheduledTime == nil && offset != 0 && offset % 1_440 != 0 {
                    continue
                }
                let candidate = calendar.date(byAdding: .minute, value: -offset, to: dueDate) ?? dueDate
                if candidate > now {
                    fireDates.insert(candidate)
                } else if dueDate > now {
                    fireDates.insert(dueDate)
                }
            }

            for fireDate in fireDates where fireDate <= endDate {
                var bucket = buckets[fireDate] ?? TaskBucket(
                    fireDate: fireDate,
                    targetDate: task.startDate
                )
                if !bucket.scheduledTasks.contains(where: { $0.id == task.id }) {
                    bucket.scheduledTasks.append(task)
                }
                buckets[fireDate] = bucket
            }
        }
    }

    private static func taskPlan(from bucket: TaskBucket, calendar: Calendar) -> PlannedNotification? {
        guard !bucket.briefingTasks.isEmpty || !bucket.scheduledTasks.isEmpty else {
            return nil
        }

        let hasBriefing = !bucket.briefingTasks.isEmpty
        let kind: PlannedNotificationKind = hasBriefing ? .taskBriefing : .taskSchedule
        let title = hasBriefing ? "오늘의 할 일" : "일정 안내"
        var bodyParts: [String] = []
        if hasBriefing {
            bodyParts.append(briefingBody(tasks: bucket.briefingTasks))
        }
        if !bucket.scheduledTasks.isEmpty {
            bodyParts.append(
                scheduleBody(
                    tasks: bucket.scheduledTasks.sorted(by: taskOrder),
                    calendar: calendar
                )
            )
        }

        let taskIDs = Array(
            Set((bucket.briefingTasks + bucket.scheduledTasks).map(\.id))
        ).sorted { $0.uuidString < $1.uuidString }
        let minute = minuteKey(bucket.fireDate, calendar: calendar)
        return PlannedNotification(
            id: "justdo.task.\(minute)",
            kind: kind,
            fireDate: bucket.fireDate,
            title: title,
            body: bodyParts.joined(separator: " "),
            targetDate: bucket.targetDate,
            taskIDs: taskIDs
        )
    }

    private static func habitPlans(
        snapshot: AppSnapshot,
        now: Date,
        endDate: Date,
        startOfToday: Date,
        calendar: Calendar
    ) -> [PlannedNotification] {
        var buckets: [Date: HabitBucket] = [:]
        var day = startOfToday

        while day <= endDate {
            let iso = isoDate(day, calendar: calendar)
            let weekday = calendar.component(.weekday, from: day) - 1
            for habit in snapshot.habits where habit.startedAt <= iso {
                guard
                    habit.log[iso] != 1,
                    let reminderTime = habit.reminderTime,
                    habitOccurs(habit, weekday: weekday),
                    let fireDate = date(iso: iso, time: reminderTime, calendar: calendar),
                    fireDate > now,
                    fireDate <= endDate
                else {
                    continue
                }
                var bucket = buckets[fireDate] ?? HabitBucket(
                    fireDate: fireDate,
                    targetDate: iso
                )
                bucket.habits.append(habit)
                buckets[fireDate] = bucket
            }
            guard let next = calendar.date(byAdding: .day, value: 1, to: day) else {
                break
            }
            day = next
        }

        return buckets.values.map { bucket in
            let habits = bucket.habits.sorted {
                $0.title.localizedStandardCompare($1.title) == .orderedAscending
            }
            return PlannedNotification(
                id: "justdo.habit.\(minuteKey(bucket.fireDate, calendar: calendar))",
                kind: .habit,
                fireDate: bucket.fireDate,
                title: "습관 알림",
                body: habitBody(habits: habits),
                targetDate: bucket.targetDate,
                habitIDs: habits.map(\.id)
            )
        }
    }

    private static func briefingBody(tasks: [Task]) -> String {
        let count = tasks.count
        if count == 1 {
            return "오늘 ‘\(tasks[0].title)’ 할 일이 예정되어 있습니다."
        }
        let examples = tasks.prefix(2).map { "‘\($0.title)’" }.joined(separator: ", ")
        return "\(examples)을 포함해 오늘 할 일 \(count)개가 예정되어 있습니다."
    }

    private static func scheduleBody(tasks: [Task], calendar: Calendar) -> String {
        let due = tasks.compactMap { task -> Date? in
            guard let time = task.scheduledTime else {
                return date(iso: task.startDate, time: "00:00", calendar: calendar)
            }
            return date(iso: task.startDate, time: time, calendar: calendar)
        }.min()
        let dateText = due.map { koreanDateTime($0, calendar: calendar) } ?? "예정된 시간에"
        if tasks.count == 1 {
            return "\(dateText) ‘\(tasks[0].title)’ 일정이 예정되어 있습니다."
        }
        let examples = tasks.prefix(2).map { "‘\($0.title)’" }.joined(separator: ", ")
        return "\(dateText) \(examples)을 포함해 \(tasks.count)개의 일정이 예정되어 있습니다."
    }

    private static func habitBody(habits: [Habit]) -> String {
        if habits.count == 1 {
            return "‘\(habits[0].title)’을 할 시간입니다."
        }
        let examples = habits.prefix(2).map { "‘\($0.title)’" }.joined(separator: ", ")
        return "\(examples)을 할 시간입니다."
    }

    private static func habitOccurs(_ habit: Habit, weekday: Int) -> Bool {
        switch habit.recurType {
        case .daily:
            true
        case .weekly:
            habit.recurDays?.contains(weekday) == true
        }
    }

    private static func taskOrder(_ lhs: Task, _ rhs: Task) -> Bool {
        switch (lhs.scheduledTime, rhs.scheduledTime) {
        case let (left?, right?) where left != right:
            left < right
        case (_?, nil):
            true
        case (nil, _?):
            false
        default:
            lhs.title.localizedStandardCompare(rhs.title) == .orderedAscending
        }
    }

    private static func date(iso: String, time: String, calendar: Calendar) -> Date? {
        let dateParts = iso.split(separator: "-").compactMap { Int($0) }
        let timeParts = time.split(separator: ":").compactMap { Int($0) }
        guard dateParts.count == 3, timeParts.count >= 2 else {
            return nil
        }
        var components = DateComponents()
        components.calendar = calendar
        components.timeZone = calendar.timeZone
        components.year = dateParts[0]
        components.month = dateParts[1]
        components.day = dateParts[2]
        components.hour = timeParts[0]
        components.minute = timeParts[1]
        return calendar.date(from: components)
    }

    private static func isoDate(_ date: Date, calendar: Calendar) -> String {
        let components = calendar.dateComponents([.year, .month, .day], from: date)
        return String(
            format: "%04d-%02d-%02d",
            components.year ?? 0,
            components.month ?? 0,
            components.day ?? 0
        )
    }

    private static func minuteKey(_ date: Date, calendar: Calendar) -> String {
        let components = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: date)
        return String(
            format: "%04d%02d%02d%02d%02d",
            components.year ?? 0,
            components.month ?? 0,
            components.day ?? 0,
            components.hour ?? 0,
            components.minute ?? 0
        )
    }

    private static func koreanDateTime(_ date: Date, calendar: Calendar) -> String {
        let components = calendar.dateComponents([.month, .day, .hour, .minute], from: date)
        let hour = components.hour ?? 0
        let period = hour < 12 ? "오전" : "오후"
        let displayHour = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour)
        let minute = components.minute ?? 0
        let time = minute == 0
            ? "\(period) \(displayHour)시"
            : "\(period) \(displayHour)시 \(minute)분"
        return "\(components.month ?? 0)월 \(components.day ?? 0)일 \(time)"
    }
}
