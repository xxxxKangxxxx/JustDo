import Foundation

public enum LocalMutation: Codable, Equatable, Sendable {
    case categoryUpsert(Category)
    case categoryDelete(id: UUID)
    case preferencesSet(key: PreferenceKey, value: Int)
    case taskUpsert(Task)
    case taskDelete(id: UUID)
    case habitUpsert(Habit)
    case habitDelete(id: UUID)
    case habitLogSet(habitID: UUID, iso: String, value: Int)
}

public enum PreferenceKey: String, Codable, Equatable, Sendable {
    case weekStart = "week_start"
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
