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
    public var dotColors: [String]

    public init(
        iso: String,
        day: Int,
        weekday: Int,
        isToday: Bool,
        dotColors: [String]
    ) {
        self.iso = iso
        self.day = day
        self.weekday = weekday
        self.isToday = isToday
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
        self.items = items
        self.weekDays = weekDays
        self.monthDays = monthDays
    }
}

public enum JustDoWidgetDisplayModelFactory {
    public static let habitColor = "#2F9B72"

    public static func make(
        from snapshot: WidgetSnapshot,
        size: JustDoWidgetSize,
        displayMode: WidgetDisplayMode = .task
    ) -> JustDoWidgetDisplayModel {
        let allItems = allItems(from: snapshot)
        let items = prioritizedItems(
            allItems.filter { $0.displayMode == displayMode }
        )
        let limit: Int
        switch size {
        case .small:
            limit = 4
        case .medium:
            limit = 6
        case .large:
            limit = 8
        }

        return JustDoWidgetDisplayModel(
            generatedAt: snapshot.generatedAt,
            selectedDate: snapshot.selectedDate,
            displayMode: displayMode,
            completedCount: items.filter(\.isDone).count,
            remainingCount: items.filter { !$0.isDone }.count,
            totalCount: items.count,
            items: Array(items.prefix(limit)),
            weekDays: weekDays(selectedDate: snapshot.selectedDate, items: allItems),
            monthDays: monthDays(selectedDate: snapshot.selectedDate, items: allItems)
        )
    }

    private static func allItems(from snapshot: WidgetSnapshot) -> [JustDoWidgetItem] {
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

        let habitItems = snapshot.habits.filter { habitActiveOn($0, iso: snapshot.selectedDate) }.map { habit in
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
        items.filter { !$0.isDone } + items.filter(\.isDone)
    }

    private static func weekDays(
        selectedDate: String,
        items: [JustDoWidgetItem]
    ) -> [JustDoWidgetDay] {
        guard let date = parseDate(selectedDate) else { return [] }
        let calendar = gregorianCalendar
        let weekday = calendar.component(.weekday, from: date) - 1
        let start = calendar.date(byAdding: .day, value: -weekday, to: date) ?? date

        return (0..<7).compactMap { offset in
            guard let current = calendar.date(byAdding: .day, value: offset, to: start) else {
                return nil
            }
            return day(current, selectedDate: selectedDate, dotColors: dotColors(from: items))
        }
    }

    private static func monthDays(
        selectedDate: String,
        items: [JustDoWidgetItem]
    ) -> [JustDoWidgetDay] {
        guard let date = parseDate(selectedDate) else { return [] }
        let calendar = gregorianCalendar
        let components = calendar.dateComponents([.year, .month], from: date)
        guard let first = calendar.date(from: components),
              let range = calendar.range(of: .day, in: .month, for: first)
        else {
            return []
        }

        return range.compactMap { dayIndex in
            var next = components
            next.day = dayIndex
            guard let current = calendar.date(from: next) else { return nil }
            return day(current, selectedDate: selectedDate, dotColors: dotColors(from: items))
        }
    }

    private static func day(
        _ date: Date,
        selectedDate: String,
        dotColors: [String]
    ) -> JustDoWidgetDay {
        let calendar = gregorianCalendar
        let iso = formatDate(date)
        return JustDoWidgetDay(
            iso: iso,
            day: calendar.component(.day, from: date),
            weekday: calendar.component(.weekday, from: date) - 1,
            isToday: iso == selectedDate,
            dotColors: iso == selectedDate ? Array(dotColors.prefix(3)) : []
        )
    }

    private static func dotColors(from items: [JustDoWidgetItem]) -> [String] {
        Array(Set(items.map(\.colorHex))).sorted()
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
