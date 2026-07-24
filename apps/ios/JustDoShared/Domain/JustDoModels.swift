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

public enum TaskReminderMode: String, Codable, Equatable, Sendable {
    case defaultValue = "default"
    case custom
    case none
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
    public var reminderMode: TaskReminderMode
    public var reminderOffsetsMinutes: [Int]
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
        tags: [String],
        reminderMode: TaskReminderMode = .defaultValue,
        reminderOffsetsMinutes: [Int] = []
    ) {
        self.id = id
        self.title = title
        self.categoryID = categoryID
        self.startDate = startDate
        self.endDate = endDate
        self.priority = priority
        self.isCompleted = isCompleted
        self.scheduledTime = scheduledTime
        self.reminderMode = reminderMode
        self.reminderOffsetsMinutes = reminderMode == .custom
            ? Self.normalizedReminderOffsets(reminderOffsetsMinutes)
            : []
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
        case reminderMode
        case reminderOffsetsMinutes
        case tags
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        title = try container.decode(String.self, forKey: .title)
        categoryID = try container.decodeIfPresent(UUID.self, forKey: .categoryID)
        startDate = try container.decode(String.self, forKey: .startDate)
        endDate = try container.decode(String.self, forKey: .endDate)
        priority = try container.decodeIfPresent(Priority.self, forKey: .priority)
        isCompleted = try container.decode(Bool.self, forKey: .isCompleted)
        scheduledTime = try container.decodeIfPresent(String.self, forKey: .scheduledTime)
        reminderMode = try container.decodeIfPresent(TaskReminderMode.self, forKey: .reminderMode) ?? .defaultValue
        reminderOffsetsMinutes = reminderMode == .custom
            ? Self.normalizedReminderOffsets(
                try container.decodeIfPresent([Int].self, forKey: .reminderOffsetsMinutes) ?? []
            )
            : []
        tags = try container.decode([String].self, forKey: .tags)
    }

    public static func normalizedReminderOffsets(_ offsets: [Int]) -> [Int] {
        Array(
            Array(Set(offsets.filter { (0...10_080).contains($0) }))
                .sorted()
                .prefix(3)
        )
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

public enum GoalPeriodType: String, Codable, Equatable, Sendable {
    case monthly
    case yearly
}

public enum GoalPromptType: String, Codable, Equatable, Sendable {
    case onboarding
    case monthly
    case yearly
    case reportMonthly = "report_monthly"
    case reportYearly = "report_yearly"
}

public struct Goal: Identifiable, Codable, Equatable, Sendable {
    public var id: UUID
    public var periodType: GoalPeriodType
    public var periodKey: String
    public var title: String
    public var note: String?
    public var sortOrder: Int
    public var locked: Bool
    public var lockedAt: String?
    /// Optional numeric target for quantitative goals (e.g. 책 3권).
    public var target: Int?

    public init(
        id: UUID,
        periodType: GoalPeriodType,
        periodKey: String,
        title: String,
        note: String?,
        sortOrder: Int,
        locked: Bool,
        lockedAt: String?,
        target: Int? = nil
    ) {
        self.id = id
        self.periodType = periodType
        self.periodKey = periodKey
        self.title = title
        self.note = note
        self.sortOrder = sortOrder
        self.locked = locked
        self.lockedAt = lockedAt
        self.target = target
    }
}

public struct GoalPromptDismissal: Identifiable, Codable, Equatable, Sendable {
    public var id: UUID
    public var promptType: GoalPromptType
    public var periodKey: String
    public var dismissedPermanentlyForPeriod: Bool
    public var dismissedAt: String

    public init(
        id: UUID,
        promptType: GoalPromptType,
        periodKey: String,
        dismissedPermanentlyForPeriod: Bool,
        dismissedAt: String
    ) {
        self.id = id
        self.promptType = promptType
        self.periodKey = periodKey
        self.dismissedPermanentlyForPeriod = dismissedPermanentlyForPeriod
        self.dismissedAt = dismissedAt
    }
}

public struct Settings: Codable, Equatable, Sendable {
    public var notify: Bool
    public var notifyTime: String
    public var taskBriefingNotify: Bool
    public var taskScheduleNotify: Bool
    public var habitNotify: Bool
    public var defaultTaskReminderMinutes: Int
    public var weekStart: Int
    public var plan: String
    public var justDoMode: Bool

    public init(
        notify: Bool,
        notifyTime: String,
        taskBriefingNotify: Bool = true,
        taskScheduleNotify: Bool = true,
        habitNotify: Bool = true,
        defaultTaskReminderMinutes: Int = 10,
        weekStart: Int,
        plan: String,
        justDoMode: Bool = false
    ) {
        self.notify = notify
        self.notifyTime = notifyTime
        self.taskBriefingNotify = taskBriefingNotify
        self.taskScheduleNotify = taskScheduleNotify
        self.habitNotify = habitNotify
        self.defaultTaskReminderMinutes = Self.normalizedReminderMinutes(defaultTaskReminderMinutes)
        self.weekStart = weekStart
        self.plan = plan
        self.justDoMode = justDoMode
    }

    private enum CodingKeys: String, CodingKey {
        case notify
        case notifyTime
        case taskBriefingNotify
        case taskScheduleNotify
        case habitNotify
        case defaultTaskReminderMinutes
        case weekStart
        case plan
        case justDoMode
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        notify = try container.decode(Bool.self, forKey: .notify)
        notifyTime = try container.decode(String.self, forKey: .notifyTime)
        taskBriefingNotify = try container.decodeIfPresent(Bool.self, forKey: .taskBriefingNotify) ?? notify
        taskScheduleNotify = try container.decodeIfPresent(Bool.self, forKey: .taskScheduleNotify) ?? notify
        habitNotify = try container.decodeIfPresent(Bool.self, forKey: .habitNotify) ?? notify
        defaultTaskReminderMinutes = Self.normalizedReminderMinutes(
            try container.decodeIfPresent(Int.self, forKey: .defaultTaskReminderMinutes) ?? 10
        )
        weekStart = try container.decode(Int.self, forKey: .weekStart)
        plan = try container.decode(String.self, forKey: .plan)
        justDoMode = try container.decodeIfPresent(Bool.self, forKey: .justDoMode) ?? false
    }

    private static func normalizedReminderMinutes(_ minutes: Int) -> Int {
        min(max(minutes, 0), 10_080)
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
    public var goals: [Goal]
    public var goalPromptDismissals: [GoalPromptDismissal]
    public var settings: Settings

    public init(
        view: ViewState,
        categories: [Category],
        tasks: [Task],
        habits: [Habit],
        goals: [Goal] = [],
        goalPromptDismissals: [GoalPromptDismissal] = [],
        settings: Settings
    ) {
        self.view = view
        self.categories = categories
        self.tasks = tasks
        self.habits = habits
        self.goals = goals
        self.goalPromptDismissals = goalPromptDismissals
        self.settings = settings
    }

    private enum CodingKeys: String, CodingKey {
        case view
        case categories
        case tasks
        case habits
        case goals
        case goalPromptDismissals
        case settings
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        view = try container.decode(ViewState.self, forKey: .view)
        categories = try container.decode([Category].self, forKey: .categories)
        tasks = try container.decode([Task].self, forKey: .tasks)
        habits = try container.decode([Habit].self, forKey: .habits)
        goals = try container.decodeIfPresent([Goal].self, forKey: .goals) ?? []
        goalPromptDismissals = try container.decodeIfPresent(
            [GoalPromptDismissal].self,
            forKey: .goalPromptDismissals
        ) ?? []
        settings = try container.decode(Settings.self, forKey: .settings)
    }
}
