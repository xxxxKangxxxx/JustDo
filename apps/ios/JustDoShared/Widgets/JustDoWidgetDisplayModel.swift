import Foundation

public enum JustDoWidgetSize: String, Codable, Equatable, Sendable {
    case small
    case medium
    case large
}

public enum WidgetDisplayMode: String, Codable, Equatable, Sendable {
    case task
    case habit
}

public struct JustDoWidgetItem: Identifiable, Equatable, Sendable {
    public enum Kind: Equatable, Sendable {
        case task
        case habit
    }

    public var id: UUID
    public var title: String
    public var subtitle: String?
    public var isDone: Bool
    public var colorHex: String
    public var kind: Kind

    public init(
        id: UUID,
        title: String,
        subtitle: String?,
        isDone: Bool,
        colorHex: String,
        kind: Kind
    ) {
        self.id = id
        self.title = title
        self.subtitle = subtitle
        self.isDone = isDone
        self.colorHex = colorHex
        self.kind = kind
    }

    public var displayMode: WidgetDisplayMode {
        switch kind {
        case .task:
            return .task
        case .habit:
            return .habit
        }
    }
}

public struct JustDoWidgetDay: Identifiable, Equatable, Sendable {
    public var id: String { iso }
    public var iso: String
    public var day: Int
    public var weekday: Int
    public var isToday: Bool
    public var isCurrentMonth: Bool
    public var holidayName: String?
    public var dotColors: [String]

    public init(
        iso: String,
        day: Int,
        weekday: Int,
        isToday: Bool,
        isCurrentMonth: Bool = true,
        holidayName: String? = nil,
        dotColors: [String]
    ) {
        self.iso = iso
        self.day = day
        self.weekday = weekday
        self.isToday = isToday
        self.isCurrentMonth = isCurrentMonth
        self.holidayName = holidayName
        self.dotColors = dotColors
    }
}

public struct JustDoWidgetDisplayModel: Equatable, Sendable {
    public var generatedAt: String
    public var selectedDate: String
    public var displayMode: WidgetDisplayMode
    public var completedCount: Int
    public var remainingCount: Int
    public var totalCount: Int
    public var taskModeColorHex: String
    public var habitModeColorHex: String
    public var items: [JustDoWidgetItem]
    public var weekDays: [JustDoWidgetDay]
    public var monthDays: [JustDoWidgetDay]

    public init(
        generatedAt: String,
        selectedDate: String,
        displayMode: WidgetDisplayMode,
        completedCount: Int,
        remainingCount: Int,
        totalCount: Int,
        taskModeColorHex: String = AppGroupWidgetDisplayModeStore.defaultTaskColor,
        habitModeColorHex: String = AppGroupWidgetDisplayModeStore.defaultHabitColor,
        items: [JustDoWidgetItem],
        weekDays: [JustDoWidgetDay],
        monthDays: [JustDoWidgetDay]
    ) {
        self.generatedAt = generatedAt
        self.selectedDate = selectedDate
        self.displayMode = displayMode
        self.completedCount = completedCount
        self.remainingCount = remainingCount
        self.totalCount = totalCount
        self.taskModeColorHex = taskModeColorHex
        self.habitModeColorHex = habitModeColorHex
        self.items = items
        self.weekDays = weekDays
        self.monthDays = monthDays
    }
}

public enum JustDoWidgetDisplayModelFactory {
    public static let habitColor = AppGroupWidgetDisplayModeStore.defaultHabitColor

    public static func make(
        from snapshot: WidgetSnapshot,
        size: JustDoWidgetSize,
        displayMode: WidgetDisplayMode = .task,
        modeColors: WidgetModeColors = WidgetModeColors(
            task: AppGroupWidgetDisplayModeStore.defaultTaskColor,
            habit: AppGroupWidgetDisplayModeStore.defaultHabitColor
        )
    ) -> JustDoWidgetDisplayModel {
        let allItems = allItems(from: snapshot, habitColor: modeColors.habit)
        let items = prioritizedItems(
            allItems.filter { $0.displayMode == displayMode }
        )
        let monthDays = monthDays(
            snapshot: snapshot,
            dotColor: modeColors.task
        )
        let limit: Int
        switch size {
        case .small:
            limit = 4
        case .medium:
            limit = 4
        case .large:
            switch monthDays.count / 7 {
            case 4:
                limit = 7
            case 5:
                limit = 6
            default:
                limit = 5
            }
        }

        return JustDoWidgetDisplayModel(
            generatedAt: snapshot.generatedAt,
            selectedDate: snapshot.selectedDate,
            displayMode: displayMode,
            completedCount: items.filter(\.isDone).count,
            remainingCount: items.filter { !$0.isDone }.count,
            totalCount: items.count,
            taskModeColorHex: modeColors.task,
            habitModeColorHex: modeColors.habit,
            items: Array(items.prefix(limit)),
            weekDays: weekDays(snapshot: snapshot, dotColor: modeColors.task),
            monthDays: monthDays
        )
    }

    private static func allItems(from snapshot: WidgetSnapshot, habitColor: String) -> [JustDoWidgetItem] {
        let categoriesByID = Dictionary(uniqueKeysWithValues: snapshot.categories.map { ($0.id, $0) })
        let taskItems = snapshot.tasks
            .filter { $0.startDate <= snapshot.selectedDate && snapshot.selectedDate <= $0.endDate }
            .map { task -> JustDoWidgetItem in
            let categoryColor = task.categoryID.flatMap { categoriesByID[$0]?.color } ?? "#6D7694"
            return JustDoWidgetItem(
                id: task.id,
                title: task.title,
                subtitle: formatClock(task.scheduledTime),
                isDone: task.isCompleted,
                colorHex: categoryColor,
                kind: .task
            )
        }

        let habitItems = snapshot.habits.filter {
            $0.startedAt <= snapshot.selectedDate && habitActiveOn($0, iso: snapshot.selectedDate)
        }.map { habit in
            JustDoWidgetItem(
                id: habit.id,
                title: "\(habit.emoji) \(habit.title)",
                subtitle: formatClock(habit.reminderTime),
                isDone: habit.log[snapshot.selectedDate] == 1,
                colorHex: habitColor,
                kind: .habit
            )
        }

        return taskItems + habitItems
    }

    private static func habitActiveOn(_ habit: Habit, iso: String) -> Bool {
        switch habit.recurType {
        case .daily:
            return true
        case .weekly:
            guard let weekday = weekdayIndex(for: iso) else {
                return false
            }
            return habit.recurDays?.contains(weekday) ?? false
        }
    }

    private static func weekdayIndex(for iso: String) -> Int? {
        guard let date = parseDate(iso) else {
            return nil
        }
        return gregorianCalendar.component(.weekday, from: date) - 1
    }

    private static func formatClock(_ value: String?) -> String? {
        guard let value, !value.isEmpty else {
            return nil
        }
        let parts = value.split(separator: ":").compactMap { Int($0) }
        guard let hour = parts.first else {
            return value
        }
        let minute = parts.dropFirst().first ?? 0
        return String(format: "%02d:%02d", min(max(hour, 0), 23), min(max(minute, 0), 59))
    }

    private static func prioritizedItems(_ items: [JustDoWidgetItem]) -> [JustDoWidgetItem] {
        items.sorted { left, right in
            if left.isDone != right.isDone {
                return !left.isDone
            }
            switch (left.subtitle, right.subtitle) {
            case let (leftTime?, rightTime?) where leftTime != rightTime:
                return leftTime < rightTime
            case (_?, nil):
                return true
            case (nil, _?):
                return false
            default:
                return left.title.localizedStandardCompare(right.title) == .orderedAscending
            }
        }
    }

    private static func weekDays(
        snapshot: WidgetSnapshot,
        dotColor: String
    ) -> [JustDoWidgetDay] {
        guard let date = parseDate(snapshot.selectedDate) else { return [] }
        let calendar = gregorianCalendar
        let weekday = calendar.component(.weekday, from: date) - 1
        let offset = (weekday - snapshot.weekStart + 7) % 7
        let start = calendar.date(byAdding: .day, value: -offset, to: date) ?? date
        let dates = (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: start) }
        let years = Set(dates.map { calendar.component(.year, from: $0) })
        let holidaysByYear = Dictionary(
            uniqueKeysWithValues: years.map { ($0, KoreanPublicHolidayCalendar.holidays(in: $0)) }
        )

        return dates.map { current in
            let iso = formatDate(current)
            let year = calendar.component(.year, from: current)
            return day(
                current,
                selectedDate: snapshot.selectedDate,
                isCurrentMonth: true,
                holidayName: holidaysByYear[year]?[iso]?.name,
                hasItems: hasItems(on: iso, snapshot: snapshot),
                dotColor: dotColor
            )
        }
    }

    private static func monthDays(
        snapshot: WidgetSnapshot,
        dotColor: String
    ) -> [JustDoWidgetDay] {
        guard let date = parseDate(snapshot.selectedDate) else { return [] }
        let calendar = gregorianCalendar
        let components = calendar.dateComponents([.year, .month], from: date)
        guard
            let first = calendar.date(from: components),
            let range = calendar.range(of: .day, in: .month, for: first)
        else {
            return []
        }

        let firstWeekday = calendar.component(.weekday, from: first) - 1
        let leadingCount = (firstWeekday - snapshot.weekStart + 7) % 7
        let totalCells = leadingCount + range.count
        let trailingCount = (7 - totalCells % 7) % 7
        let cellCount = totalCells + trailingCount
        let gridStart = calendar.date(byAdding: .day, value: -leadingCount, to: first) ?? first
        let selectedMonth = components.month
        let holidays = components.year.map(KoreanPublicHolidayCalendar.holidays(in:)) ?? [:]

        return (0..<cellCount).compactMap { offset in
            guard let current = calendar.date(byAdding: .day, value: offset, to: gridStart) else {
                return nil
            }
            let iso = formatDate(current)
            let isCurrentMonth = calendar.component(.month, from: current) == selectedMonth
            return day(
                current,
                selectedDate: snapshot.selectedDate,
                isCurrentMonth: isCurrentMonth,
                holidayName: isCurrentMonth ? holidays[iso]?.name : nil,
                hasItems: hasItems(on: iso, snapshot: snapshot),
                dotColor: dotColor
            )
        }
    }

    private static func day(
        _ date: Date,
        selectedDate: String,
        isCurrentMonth: Bool,
        holidayName: String?,
        hasItems: Bool,
        dotColor: String
    ) -> JustDoWidgetDay {
        let calendar = gregorianCalendar
        let iso = formatDate(date)
        return JustDoWidgetDay(
            iso: iso,
            day: calendar.component(.day, from: date),
            weekday: calendar.component(.weekday, from: date) - 1,
            isToday: iso == selectedDate,
            isCurrentMonth: isCurrentMonth,
            holidayName: holidayName,
            dotColors: isCurrentMonth && hasItems ? [dotColor] : []
        )
    }

    private static func hasItems(on iso: String, snapshot: WidgetSnapshot) -> Bool {
        if snapshot.tasks.contains(where: { $0.startDate <= iso && iso <= $0.endDate }) {
            return true
        }
        return snapshot.habits.contains {
            $0.startedAt <= iso && habitActiveOn($0, iso: iso)
        }
    }

    private static func parseDate(_ iso: String) -> Date? {
        dateFormatter.date(from: iso)
    }

    private static func formatDate(_ date: Date) -> String {
        dateFormatter.string(from: date)
    }

    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = gregorianCalendar
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private static let gregorianCalendar: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        return calendar
    }()
}
