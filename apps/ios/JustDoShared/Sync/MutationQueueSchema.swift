import Foundation

public enum LocalMutation: Codable, Equatable, Sendable {
    case categoryUpsert(Category)
    case categoryDelete(id: UUID)
    case preferencesSet(key: PreferenceKey, value: Int)
    case taskUpsert(Task)
    case taskCompletionSet(id: UUID, isCompleted: Bool, completedAt: String?)
    case taskDelete(id: UUID)
    case habitUpsert(Habit)
    case habitDelete(id: UUID)
    case habitLogSet(habitID: UUID, iso: String, value: Int)

    private enum CodingKeys: String, CodingKey {
        case type
        case category
        case id
        case key
        case value
        case task
        case isCompleted
        case completedAt
        case habit
        case habitID = "habitId"
        case iso
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)

        switch type {
        case "category_upsert":
            self = .categoryUpsert(try container.decode(Category.self, forKey: .category))
        case "category_delete":
            self = .categoryDelete(id: try container.decode(UUID.self, forKey: .id))
        case "preferences_set":
            self = .preferencesSet(
                key: try container.decode(PreferenceKey.self, forKey: .key),
                value: try container.decode(Int.self, forKey: .value)
            )
        case "task_upsert":
            self = .taskUpsert(try container.decode(Task.self, forKey: .task))
        case "task_completion_set":
            self = .taskCompletionSet(
                id: try container.decode(UUID.self, forKey: .id),
                isCompleted: try container.decode(Bool.self, forKey: .isCompleted),
                completedAt: try container.decodeIfPresent(String.self, forKey: .completedAt)
            )
        case "task_delete":
            self = .taskDelete(id: try container.decode(UUID.self, forKey: .id))
        case "habit_upsert":
            self = .habitUpsert(try container.decode(Habit.self, forKey: .habit))
        case "habit_delete":
            self = .habitDelete(id: try container.decode(UUID.self, forKey: .id))
        case "habit_log_set":
            self = .habitLogSet(
                habitID: try container.decode(UUID.self, forKey: .habitID),
                iso: try container.decode(String.self, forKey: .iso),
                value: try container.decode(Int.self, forKey: .value)
            )
        default:
            throw DecodingError.dataCorruptedError(
                forKey: .type,
                in: container,
                debugDescription: "Unsupported mutation type: \(type)"
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        switch self {
        case .categoryUpsert(let category):
            try container.encode("category_upsert", forKey: .type)
            try container.encode(category, forKey: .category)
        case .categoryDelete(let id):
            try container.encode("category_delete", forKey: .type)
            try container.encode(id, forKey: .id)
        case .preferencesSet(let key, let value):
            try container.encode("preferences_set", forKey: .type)
            try container.encode(key, forKey: .key)
            try container.encode(value, forKey: .value)
        case .taskUpsert(let task):
            try container.encode("task_upsert", forKey: .type)
            try container.encode(task, forKey: .task)
        case .taskCompletionSet(let id, let isCompleted, let completedAt):
            try container.encode("task_completion_set", forKey: .type)
            try container.encode(id, forKey: .id)
            try container.encode(isCompleted, forKey: .isCompleted)
            try container.encodeIfPresent(completedAt, forKey: .completedAt)
        case .taskDelete(let id):
            try container.encode("task_delete", forKey: .type)
            try container.encode(id, forKey: .id)
        case .habitUpsert(let habit):
            try container.encode("habit_upsert", forKey: .type)
            try container.encode(habit, forKey: .habit)
        case .habitDelete(let id):
            try container.encode("habit_delete", forKey: .type)
            try container.encode(id, forKey: .id)
        case .habitLogSet(let habitID, let iso, let value):
            try container.encode("habit_log_set", forKey: .type)
            try container.encode(habitID, forKey: .habitID)
            try container.encode(iso, forKey: .iso)
            try container.encode(value, forKey: .value)
        }
    }
}

public enum PreferenceKey: String, Codable, Equatable, Sendable {
    case notify
    case notifyTime = "notify_time"
    case weekStart = "week_start"
    case justDoMode = "just_do_mode"
}

public struct QueuedMutation: Identifiable, Codable, Equatable, Sendable {
    public var id: UUID
    public var updatedAt: String
    public var mutation: LocalMutation

    public init(id: UUID, updatedAt: String, mutation: LocalMutation) {
        self.id = id
        self.updatedAt = updatedAt
        self.mutation = mutation
    }
}

public enum RemoteChange: Equatable, Sendable {
    case categoryUpserted(Category)
    case categoryDeleted(id: UUID)
    case taskUpserted(Task)
    case taskDeleted(id: UUID)
    case habitUpserted(Habit)
    case habitDeleted(id: UUID)
    case habitLogSet(habitID: UUID, iso: String, value: Int)
}

public struct WidgetSnapshot: Codable, Equatable, Sendable {
    public var generatedAt: String
    public var selectedDate: String
    public var categories: [Category]
    public var tasks: [Task]
    public var habits: [Habit]

    public init(
        generatedAt: String,
        selectedDate: String,
        categories: [Category],
        tasks: [Task],
        habits: [Habit]
    ) {
        self.generatedAt = generatedAt
        self.selectedDate = selectedDate
        self.categories = categories
        self.tasks = tasks
        self.habits = habits
    }
}
