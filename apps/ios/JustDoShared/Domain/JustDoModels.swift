import Foundation

public enum HabitRecurType: String, Codable, Equatable, Sendable {
    case daily
    case weekly
}

public enum Priority: String, Codable, Equatable, Sendable {
    case high
    case medium
    case low
}

public enum TabID: String, Codable, Equatable, Sendable {
    case home
    case habit
    case settings
}

public struct Category: Identifiable, Codable, Equatable, Sendable {
    public var id: UUID
    public var name: String
    public var color: String
    public var isDefault: Bool
    public var position: Int

    public init(
        id: UUID,
        name: String,
        color: String,
        isDefault: Bool,
        position: Int
    ) {
        self.id = id
        self.name = name
        self.color = color
        self.isDefault = isDefault
        self.position = position
    }
}

public struct Task: Identifiable, Codable, Equatable, Sendable {
    public var id: UUID
    public var title: String
    public var categoryID: UUID?
    public var startDate: String
    public var endDate: String
    public var priority: Priority?
    public var isCompleted: Bool
    public var scheduledTime: String?
    public var tags: [String]

    public init(
        id: UUID,
        title: String,
        categoryID: UUID?,
        startDate: String,
        endDate: String,
        priority: Priority?,
        isCompleted: Bool,
        scheduledTime: String?,
        tags: [String]
    ) {
        self.id = id
        self.title = title
        self.categoryID = categoryID
        self.startDate = startDate
        self.endDate = endDate
        self.priority = priority
        self.isCompleted = isCompleted
        self.scheduledTime = scheduledTime
        self.tags = tags
    }

    private enum CodingKeys: String, CodingKey {
        case id
        case title
        case categoryID = "categoryId"
        case startDate
        case endDate
        case priority
        case isCompleted
        case scheduledTime
        case tags
    }
}

public struct Habit: Identifiable, Codable, Equatable, Sendable {
    public var id: UUID
    public var title: String
    public var emoji: String
    public var startedAt: String
    public var recurType: HabitRecurType
    public var recurDays: [Int]?
    public var reminderTime: String?
    public var log: [String: Int]

    public init(
        id: UUID,
        title: String,
        emoji: String,
        startedAt: String,
        recurType: HabitRecurType,
        recurDays: [Int]?,
        reminderTime: String?,
        log: [String: Int]
    ) {
        self.id = id
        self.title = title
        self.emoji = emoji
        self.startedAt = startedAt
        self.recurType = recurType
        self.recurDays = recurDays
        self.reminderTime = reminderTime
        self.log = log
    }
}

public struct Settings: Codable, Equatable, Sendable {
    public var notify: Bool
    public var notifyTime: String
    public var weekStart: Int
    public var plan: String
    public var justDoMode: Bool

    public init(notify: Bool, notifyTime: String, weekStart: Int, plan: String, justDoMode: Bool = false) {
        self.notify = notify
        self.notifyTime = notifyTime
        self.weekStart = weekStart
        self.plan = plan
        self.justDoMode = justDoMode
    }

    private enum CodingKeys: String, CodingKey {
        case notify
        case notifyTime
        case weekStart
        case plan
        case justDoMode
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        notify = try container.decode(Bool.self, forKey: .notify)
        notifyTime = try container.decode(String.self, forKey: .notifyTime)
        weekStart = try container.decode(Int.self, forKey: .weekStart)
        plan = try container.decode(String.self, forKey: .plan)
        justDoMode = try container.decodeIfPresent(Bool.self, forKey: .justDoMode) ?? false
    }
}

public struct ViewState: Codable, Equatable, Sendable {
    public var tab: TabID
    public var year: Int
    public var month: Int
    public var selectedDate: String
    public var dark: Bool

    public init(tab: TabID, year: Int, month: Int, selectedDate: String, dark: Bool) {
        self.tab = tab
        self.year = year
        self.month = month
        self.selectedDate = selectedDate
        self.dark = dark
    }
}

public struct AppSnapshot: Codable, Equatable, Sendable {
    public var view: ViewState
    public var categories: [Category]
    public var tasks: [Task]
    public var habits: [Habit]
    public var settings: Settings

    public init(
        view: ViewState,
        categories: [Category],
        tasks: [Task],
        habits: [Habit],
        settings: Settings
    ) {
        self.view = view
        self.categories = categories
        self.tasks = tasks
        self.habits = habits
        self.settings = settings
    }
}
