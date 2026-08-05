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
    private struct ScheduledTask {
        var task: Task
        var reminderOffsetMinutes: Int
    }

    private struct TaskBucket {
        var fireDate: Date
        var targetDate: String
        var briefingTasks: [Task] = []
        var scheduledTasks: [ScheduledTask] = []
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

            var reminderOffsetsByFireDate: [Date: Int] = [:]
            for offset in offsets {
                if task.scheduledTime == nil && offset != 0 && offset % 1_440 != 0 {
                    continue
                }
                let candidate = calendar.date(byAdding: .minute, value: -offset, to: dueDate) ?? dueDate
                if candidate > now {
                    reminderOffsetsByFireDate[candidate] = offset
                } else if dueDate > now {
                    reminderOffsetsByFireDate[dueDate] = 0
                }
            }

            for (fireDate, reminderOffsetMinutes) in reminderOffsetsByFireDate where fireDate <= endDate {
                var bucket = buckets[fireDate] ?? TaskBucket(
                    fireDate: fireDate,
                    targetDate: task.startDate
                )
                if !bucket.scheduledTasks.contains(where: { $0.task.id == task.id }) {
                    bucket.scheduledTasks.append(
                        ScheduledTask(
                            task: task,
                            reminderOffsetMinutes: reminderOffsetMinutes
                        )
                    )
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
        let scheduledTasks = bucket.scheduledTasks.map(\.task)
        let title = hasBriefing
            ? "일정 브리핑"
            : scheduleOnlyTitle(
                scheduledTasks: bucket.scheduledTasks,
                fallback: bucket.fireDate,
                calendar: calendar
            )
        var bodyParts: [String] = []
        if hasBriefing {
            let scheduledTaskIDs = Set(scheduledTasks.map(\.id))
            let briefingOnlyTasks = bucket.briefingTasks.filter {
                !scheduledTaskIDs.contains($0.id)
            }
            bodyParts.append(
                briefingBody(
                    totalCount: bucket.briefingTasks.count,
                    examples: briefingOnlyTasks
                )
            )
        }
        if !scheduledTasks.isEmpty {
            bodyParts.append(
                hasBriefing
                    ? mergedScheduleBody(
                        tasks: scheduledTasks.sorted(by: taskOrder),
                        fallback: bucket.fireDate,
                        calendar: calendar
                    )
                    : scheduleBody(
                        tasks: scheduledTasks.sorted(by: taskOrder),
                        fireDate: bucket.fireDate,
                        calendar: calendar
                    )
            )
        }

        let taskIDs = Array(
            Set((bucket.briefingTasks + scheduledTasks).map(\.id))
        ).sorted { $0.uuidString < $1.uuidString }
        let minute = minuteKey(bucket.fireDate, calendar: calendar)
        return PlannedNotification(
            id: "justdo.task.\(minute)",
            kind: kind,
            fireDate: bucket.fireDate,
            title: title,
            body: bodyParts.joined(separator: " · "),
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

    private static func briefingBody(totalCount: Int, examples: [Task]) -> String {
        let prefix = "오늘 할 일 \(totalCount)개"
        guard let first = examples.first else {
            return prefix
        }
        if examples.count == 1 {
            return "\(prefix) · ‘\(first.title)’"
        }
        return "\(prefix) · ‘\(first.title)’ 외 \(examples.count - 1)개"
    }

    private static func scheduleBody(
        tasks: [Task],
        fireDate: Date,
        calendar: Calendar
    ) -> String {
        guard let first = tasks.first else {
            return "일정이 있어요."
        }

        let timingPhrases = tasks.map {
            scheduleTimingPhrase(task: $0, fireDate: fireDate, calendar: calendar)
        }
        if tasks.count == 1 {
            return "\(timingPhrases[0]) ‘\(first.title)’ 일정이 있어요."
        }
        if timingPhrases.allSatisfy({ $0 == timingPhrases[0] }) {
            return "\(timingPhrases[0]) ‘\(first.title)’ 외 \(tasks.count - 1)개 일정이 있어요."
        }

        let examples = zip(tasks.prefix(2), timingPhrases.prefix(2)).map { task, timing in
            "\(timing) ‘\(task.title)’"
        }.joined(separator: ", ")
        let remaining = tasks.count - min(tasks.count, 2)
        return remaining > 0
            ? "\(examples) 외 \(remaining)개 일정이 있어요."
            : "\(examples) 일정이 있어요."
    }

    private static func scheduleTimingPhrase(
        task: Task,
        fireDate: Date,
        calendar: Calendar
    ) -> String {
        let day: String
        let fireDay = calendar.startOfDay(for: fireDate)
        let targetDay = date(iso: task.startDate, time: "00:00", calendar: calendar)
        let dayDifference: Int?
        if let targetDay {
            dayDifference = calendar.dateComponents([.day], from: fireDay, to: targetDay).day
        } else {
            dayDifference = nil
        }

        switch dayDifference {
        case 0:
            day = "오늘"
        case 1:
            day = "내일"
        default:
            let parts = task.startDate.split(separator: "-").compactMap { Int($0) }
            day = parts.count == 3 ? "\(parts[1])월 \(parts[2])일" : task.startDate
        }

        guard task.scheduledTime != nil else {
            return day
        }
        let time = scheduledTimeTitle(tasks: [task], fallback: fireDate, calendar: calendar)
        return "\(day) \(time)에"
    }

    private static func mergedScheduleBody(
        tasks: [Task],
        fallback: Date,
        calendar: Calendar
    ) -> String {
        let time = scheduledTimeTitle(tasks: tasks, fallback: fallback, calendar: calendar)
        guard let first = tasks.first else {
            return "다음 일정 \(time)"
        }
        if tasks.count == 1 {
            return "다음 일정 \(time) ‘\(first.title)’"
        }
        return "다음 일정 \(time) ‘\(first.title)’ 외 \(tasks.count - 1)개"
    }

    private static func scheduleOnlyTitle(
        scheduledTasks: [ScheduledTask],
        fallback: Date,
        calendar: Calendar
    ) -> String {
        let offsets = Set(scheduledTasks.map(\.reminderOffsetMinutes))
        guard offsets.count == 1, let offset = offsets.first else {
            return "일정 알림"
        }
        if offset > 0 {
            return reminderOffsetTitle(offset)
        }

        let tasks = scheduledTasks.map(\.task)
        if tasks.allSatisfy({ $0.scheduledTime == nil }) {
            return "당일"
        }
        if tasks.contains(where: { $0.scheduledTime == nil }) {
            return "일정 알림"
        }
        return scheduledTimeTitle(tasks: tasks, fallback: fallback, calendar: calendar)
    }

    private static func reminderOffsetTitle(_ minutes: Int) -> String {
        if minutes % 10_080 == 0 {
            let weeks = minutes / 10_080
            return weeks == 1 ? "1주일 전" : "\(weeks)주 전"
        }
        if minutes % 1_440 == 0 {
            return "\(minutes / 1_440)일 전"
        }
        if minutes % 60 == 0 {
            return "\(minutes / 60)시간 전"
        }
        return "\(minutes)분 전"
    }

    private static func scheduledTimeTitle(
        tasks: [Task],
        fallback: Date,
        calendar: Calendar
    ) -> String {
        let due = tasks.compactMap { task -> Date? in
            guard let time = task.scheduledTime else {
                return nil
            }
            return date(iso: task.startDate, time: time, calendar: calendar)
        }.min() ?? fallback
        let components = calendar.dateComponents([.hour, .minute], from: due)
        return String(format: "%02d:%02d", components.hour ?? 0, components.minute ?? 0)
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

}
