import CoreData
import Foundation

public enum SupabaseSyncError: Error, Equatable {
    case invalidResponse
    case httpStatus(Int, String)

    public var userMessage: String {
        switch self {
        case .invalidResponse:
            return "서버 응답을 해석하지 못했습니다."
        case .httpStatus(let status, let body):
            let compactBody = body
                .replacingOccurrences(of: "\n", with: " ")
                .trimmingCharacters(in: .whitespacesAndNewlines)
            guard !compactBody.isEmpty else {
                return "서버가 동기화 요청을 거절했습니다. (HTTP \(status))"
            }
            return "서버가 동기화 요청을 거절했습니다. (HTTP \(status)) \(compactBody)"
        }
    }
}

public struct SupabaseCredentials: Equatable, Sendable {
    public var projectURL: URL
    public var anonKey: String
    public var accessToken: String
    public var userID: UUID

    public init(
        projectURL: URL,
        anonKey: String,
        accessToken: String,
        userID: UUID
    ) {
        self.projectURL = projectURL
        self.anonKey = anonKey
        self.accessToken = accessToken
        self.userID = userID
    }
}

public protocol SupabaseRestTransport {
    func get(path: String, queryItems: [URLQueryItem]) async throws -> Data
    func upsert(path: String, queryItems: [URLQueryItem], body: Data) async throws
    func patch(path: String, queryItems: [URLQueryItem], body: Data) async throws
    func delete(path: String, queryItems: [URLQueryItem]) async throws
}

public final class URLSessionSupabaseRestTransport: SupabaseRestTransport {
    private let credentials: SupabaseCredentials
    private let session: URLSession

    public init(
        credentials: SupabaseCredentials,
        session: URLSession = .shared
    ) {
        self.credentials = credentials
        self.session = session
    }

    public func get(path: String, queryItems: [URLQueryItem]) async throws -> Data {
        try await request(
            method: "GET",
            path: path,
            queryItems: queryItems,
            body: nil,
            prefer: nil
        )
    }

    public func upsert(path: String, queryItems: [URLQueryItem], body: Data) async throws {
        _ = try await request(
            method: "POST",
            path: path,
            queryItems: queryItems,
            body: body,
            prefer: "return=minimal,resolution=merge-duplicates"
        )
    }

    public func patch(path: String, queryItems: [URLQueryItem], body: Data) async throws {
        _ = try await request(
            method: "PATCH",
            path: path,
            queryItems: queryItems,
            body: body,
            prefer: "return=minimal"
        )
    }

    public func delete(path: String, queryItems: [URLQueryItem]) async throws {
        _ = try await request(
            method: "DELETE",
            path: path,
            queryItems: queryItems,
            body: nil,
            prefer: "return=minimal"
        )
    }

    private func request(
        method: String,
        path: String,
        queryItems: [URLQueryItem],
        body: Data?,
        prefer: String?
    ) async throws -> Data {
        var components = URLComponents(
            url: credentials.projectURL.appendingPathComponent("rest/v1/\(path)"),
            resolvingAgainstBaseURL: false
        )
        components?.queryItems = queryItems
        guard let url = components?.url else {
            throw SupabaseSyncError.invalidResponse
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue(credentials.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(credentials.accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        if let prefer {
            request.setValue(prefer, forHTTPHeaderField: "Prefer")
        }

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw SupabaseSyncError.invalidResponse
        }
        guard (200..<300).contains(httpResponse.statusCode) else {
            throw SupabaseSyncError.httpStatus(
                httpResponse.statusCode,
                String(data: data, encoding: .utf8) ?? ""
            )
        }
        return data
    }
}

public final class SupabaseMutationClient {
    private let userID: UUID
    private let transport: SupabaseRestTransport
    private let encoder = JSONEncoder()

    public init(userID: UUID, transport: SupabaseRestTransport) {
        self.userID = userID
        self.transport = transport
    }

    public convenience init(credentials: SupabaseCredentials) {
        self.init(
            userID: credentials.userID,
            transport: URLSessionSupabaseRestTransport(credentials: credentials)
        )
    }

    public func apply(_ mutation: LocalMutation) async throws {
        switch mutation {
        case .categoryUpsert(let category):
            try await upsert(
                "categories",
                body: SupabaseCategoryMutationRow(category: category, userID: userID)
            )
        case .categoryDelete(let id):
            try await delete("categories", id: id)
        case .preferencesSet(let key, let value):
            try await patchPreferences(key: key, value: value)
        case .taskUpsert(let task):
            try await upsert("tasks", body: SupabaseTaskMutationRow(task: task, userID: userID))
        case .taskCompletionSet(let id, let isCompleted, let completedAt):
            try await patchTaskCompletion(
                id: id,
                isCompleted: isCompleted,
                completedAt: completedAt
            )
        case .taskDelete(let id):
            try await delete("tasks", id: id)
        case .habitUpsert(let habit):
            try await upsert("habits", body: SupabaseHabitMutationRow(habit: habit, userID: userID))
        case .habitDelete(let id):
            try await delete("habits", id: id)
        case .habitLogSet(let habitID, let iso, let value):
            if value == 1 {
                try await upsert(
                    "habit_logs",
                    queryItems: [URLQueryItem(name: "on_conflict", value: "habit_id,log_date")],
                    body: SupabaseHabitLogMutationRow(
                        habitID: habitID,
                        userID: userID,
                        logDate: iso,
                        isCompleted: true
                    )
                )
            } else {
                try await transport.delete(
                    path: "habit_logs",
                    queryItems: [
                        userFilter(),
                        URLQueryItem(name: "habit_id", value: "eq.\(habitID.uuidString.lowercased())"),
                        URLQueryItem(name: "log_date", value: "eq.\(iso)"),
                    ]
                )
            }
        case .goalUpsert(let goal):
            try await upsert("goals", body: SupabaseGoalMutationRow(goal: goal, userID: userID))
        case .goalDelete(let id):
            try await delete("goals", id: id)
        case .goalPromptDismissalUpsert(let dismissal):
            try await upsert(
                "goal_prompt_dismissals",
                queryItems: [URLQueryItem(name: "on_conflict", value: "user_id,prompt_type,period_key")],
                body: SupabaseGoalPromptDismissalMutationRow(
                    dismissal: dismissal,
                    userID: userID
                )
            )
        }
    }

    private func upsert<Row: Encodable>(
        _ path: String,
        queryItems: [URLQueryItem] = [],
        body: Row
    ) async throws {
        try await transport.upsert(
            path: path,
            queryItems: queryItems,
            body: encoder.encode(body)
        )
    }

    private func delete(_ path: String, id: UUID) async throws {
        try await transport.delete(
            path: path,
            queryItems: [
                userFilter(),
                URLQueryItem(name: "id", value: "eq.\(id.uuidString.lowercased())"),
            ]
        )
    }

    private func patchPreferences(key: PreferenceKey, value: Int) async throws {
        try await transport.patch(
            path: "users",
            queryItems: [URLQueryItem(name: "id", value: "eq.\(userID.uuidString.lowercased())")],
            body: encoder.encode(SupabaseUserPreferencesMutationRow(preferences: [key.rawValue: value]))
        )
    }

    private func patchTaskCompletion(
        id: UUID,
        isCompleted: Bool,
        completedAt: String?
    ) async throws {
        try await transport.patch(
            path: "tasks",
            queryItems: [
                userFilter(),
                URLQueryItem(name: "id", value: "eq.\(id.uuidString.lowercased())"),
            ],
            body: encoder.encode(
                SupabaseTaskCompletionMutationRow(
                    isCompleted: isCompleted,
                    completedAt: completedAt
                )
            )
        )
    }

    private func userFilter() -> URLQueryItem {
        URLQueryItem(name: "user_id", value: "eq.\(userID.uuidString.lowercased())")
    }
}

public final class SupabaseQueuedMutationFlusher {
    private let mutationClient: SupabaseMutationClient
    private let snapshotStore: CoreDataAppSnapshotStore

    public init(
        mutationClient: SupabaseMutationClient,
        snapshotStore: CoreDataAppSnapshotStore
    ) {
        self.mutationClient = mutationClient
        self.snapshotStore = snapshotStore
    }

    @discardableResult
    public func flush() async throws -> [QueuedMutation] {
        let queuedMutations = try snapshotStore.queuedMutations()
        var flushed: [QueuedMutation] = []

        for queued in queuedMutations {
            try await mutationClient.apply(queued.mutation)
            try snapshotStore.removeQueuedMutation(id: queued.id)
            flushed.append(queued)
        }

        return flushed
    }
}

public final class SupabaseSnapshotClient {
    private let userID: UUID
    private let transport: SupabaseRestTransport
    private let decoder = JSONDecoder()

    public init(userID: UUID, transport: SupabaseRestTransport) {
        self.userID = userID
        self.transport = transport
    }

    public convenience init(credentials: SupabaseCredentials) {
        self.init(
            userID: credentials.userID,
            transport: URLSessionSupabaseRestTransport(credentials: credentials)
        )
    }

    public func fetchAppSnapshot(
        view: ViewState = AppSnapshotDefaults.viewState(),
        settings: Settings = AppSnapshotDefaults.settings()
    ) async throws -> AppSnapshot {
        let resolvedCategories = try await fetchCategories()
        let resolvedTags = try await fetchTags()
        let resolvedTaskTags = try await fetchTaskTags()
        let taskRows = try await fetchTasks()
        let habitRows = try await fetchHabits()
        let habitLogRows = try await fetchHabitLogs()
        let goalRows = try await fetchGoals()
        let goalPromptDismissalRows = try await fetchGoalPromptDismissals()
        let subscriptionRows = try await fetchSubscriptions()

        let tagsByID = Dictionary(uniqueKeysWithValues: resolvedTags.map { ($0.id, $0.name) })
        let tagNamesByTaskID = Dictionary(
            grouping: resolvedTaskTags,
            by: \.taskID
        ).mapValues { joins in
            joins.compactMap { tagsByID[$0.tagID] }.sorted()
        }

        let resolvedTasks = taskRows.map { row in
            row.domain(tags: tagNamesByTaskID[row.id] ?? [])
        }

        let logsByHabitID = Dictionary(grouping: habitLogRows, by: \.habitID)
        let resolvedHabits = habitRows.map { row in
            row.domain(logs: logsByHabitID[row.id] ?? [])
        }
        var resolvedSettings = settings
        resolvedSettings.plan = subscriptionRows.contains(where: \.hasProEntitlement) ? "pro" : "free"

        return AppSnapshot(
            view: view,
            categories: resolvedCategories.map(\.domain),
            tasks: resolvedTasks,
            habits: resolvedHabits,
            goals: goalRows.map(\.domain),
            goalPromptDismissals: goalPromptDismissalRows.map(\.domain),
            settings: resolvedSettings
        )
    }

    private func fetchCategories() async throws -> [SupabaseCategoryRow] {
        try await fetch(
            "categories",
            select: "id,name,color,is_default,position,created_at",
            filteredByUser: true
        )
    }

    private func fetchTags() async throws -> [SupabaseTagRow] {
        try await fetch("tags", select: "id,name", filteredByUser: true)
    }

    private func fetchTaskTags() async throws -> [SupabaseTaskTagRow] {
        try await fetch("task_tags", select: "task_id,tag_id", filteredByUser: false)
    }

    private func fetchTasks() async throws -> [SupabaseTaskRow] {
        try await fetch(
            "tasks",
            select: "id,category_id,title,priority,start_date,end_date,scheduled_time,is_completed",
            filteredByUser: true
        )
    }

    private func fetchHabits() async throws -> [SupabaseHabitRow] {
        try await fetch(
            "habits",
            select: "id,title,emoji,created_at,recur_type,recur_days,reminder_at",
            filteredByUser: true
        )
    }

    private func fetchHabitLogs() async throws -> [SupabaseHabitLogRow] {
        try await fetch(
            "habit_logs",
            select: "habit_id,log_date,is_completed",
            filteredByUser: true
        )
    }

    private func fetchSubscriptions() async throws -> [SupabaseSubscriptionRow] {
        try await fetch(
            "user_subscriptions",
            select: "plan_name,status",
            filteredByUser: true
        )
    }

    private func fetchGoals() async throws -> [SupabaseGoalRow] {
        try await fetch(
            "goals",
            select: "id,period_type,period_key,title,note,sort_order,locked,locked_at",
            filteredByUser: true
        )
    }

    private func fetchGoalPromptDismissals() async throws -> [SupabaseGoalPromptDismissalRow] {
        try await fetch(
            "goal_prompt_dismissals",
            select: "id,prompt_type,period_key,dismissed_permanently_for_period,dismissed_at",
            filteredByUser: true
        )
    }

    private func fetch<Row: Decodable>(
        _ path: String,
        select: String,
        filteredByUser: Bool
    ) async throws -> [Row] {
        var queryItems = [URLQueryItem(name: "select", value: select)]
        if filteredByUser {
            queryItems.append(URLQueryItem(name: "user_id", value: "eq.\(userID.uuidString.lowercased())"))
        }
        let data = try await transport.get(path: path, queryItems: queryItems)
        return try decoder.decode([Row].self, from: data)
    }
}

public final class SupabaseCoreDataSync {
    private let snapshotClient: SupabaseSnapshotClient
    private let snapshotStore: CoreDataAppSnapshotStore

    public init(
        snapshotClient: SupabaseSnapshotClient,
        snapshotStore: CoreDataAppSnapshotStore
    ) {
        self.snapshotClient = snapshotClient
        self.snapshotStore = snapshotStore
    }

    @discardableResult
    public func sync(
        view: ViewState = AppSnapshotDefaults.viewState(),
        settings: Settings = AppSnapshotDefaults.settings()
    ) async throws -> AppSnapshot {
        let snapshot = try await snapshotClient.fetchAppSnapshot(
            view: view,
            settings: settings
        )
        try snapshotStore.replaceSnapshot(snapshot)
        return snapshot
    }
}

struct SupabaseCategoryRow: Decodable, Equatable {
    var id: UUID
    var name: String
    var color: String
    var isDefault: Bool
    var position: Int

    var domain: Category {
        Category(
            id: id,
            name: name,
            color: color,
            isDefault: isDefault,
            position: position
        )
    }

    private enum CodingKeys: String, CodingKey {
        case id
        case name
        case color
        case isDefault = "is_default"
        case position
    }
}

private struct SupabaseCategoryMutationRow: Encodable {
    var id: UUID
    var userID: UUID
    var name: String
    var color: String
    var isDefault: Bool
    var position: Int

    init(category: Category, userID: UUID) {
        self.id = category.id
        self.userID = userID
        self.name = category.name
        self.color = category.color
        self.isDefault = category.isDefault
        self.position = category.position
    }

    private enum CodingKeys: String, CodingKey {
        case id
        case userID = "user_id"
        case name
        case color
        case isDefault = "is_default"
        case position
    }
}

struct SupabaseTagRow: Decodable, Equatable {
    var id: UUID
    var name: String
}

struct SupabaseTaskTagRow: Decodable, Equatable {
    var taskID: UUID
    var tagID: UUID

    private enum CodingKeys: String, CodingKey {
        case taskID = "task_id"
        case tagID = "tag_id"
    }
}

struct SupabaseTaskRow: Decodable, Equatable {
    var id: UUID
    var categoryID: UUID?
    var title: String
    var priority: String?
    var startDate: String?
    var endDate: String?
    var scheduledTime: String?
    var isCompleted: Bool

    func domain(tags: [String]) -> Task {
        Task(
            id: id,
            title: title,
            categoryID: categoryID,
            startDate: startDate ?? "",
            endDate: endDate ?? startDate ?? "",
            priority: priority.flatMap(Priority.init(rawValue:)),
            isCompleted: isCompleted,
            scheduledTime: scheduledTime,
            tags: tags
        )
    }

    private enum CodingKeys: String, CodingKey {
        case id
        case categoryID = "category_id"
        case title
        case priority
        case startDate = "start_date"
        case endDate = "end_date"
        case scheduledTime = "scheduled_time"
        case isCompleted = "is_completed"
    }
}

private struct SupabaseTaskMutationRow: Encodable {
    var id: UUID
    var userID: UUID
    var categoryID: UUID?
    var title: String
    var priority: String?
    var startDate: String?
    var endDate: String?
    var scheduledTime: String?
    var isCompleted: Bool
    var completedAt: String?

    init(task: Task, userID: UUID) {
        self.id = task.id
        self.userID = userID
        self.categoryID = task.categoryID
        self.title = task.title
        self.priority = task.priority?.rawValue
        self.startDate = task.startDate.isEmpty ? nil : task.startDate
        self.endDate = task.endDate.isEmpty ? nil : task.endDate
        self.scheduledTime = task.scheduledTime
        self.isCompleted = task.isCompleted
        self.completedAt = task.isCompleted ? Self.timestamp() : nil
    }

    private static func timestamp() -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: Date())
    }

    private enum CodingKeys: String, CodingKey {
        case id
        case userID = "user_id"
        case categoryID = "category_id"
        case title
        case priority
        case startDate = "start_date"
        case endDate = "end_date"
        case scheduledTime = "scheduled_time"
        case isCompleted = "is_completed"
        case completedAt = "completed_at"
    }
}

private struct SupabaseTaskCompletionMutationRow: Encodable {
    var isCompleted: Bool
    var completedAt: String?

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(isCompleted, forKey: .isCompleted)
        if let completedAt {
            try container.encode(completedAt, forKey: .completedAt)
        } else {
            try container.encodeNil(forKey: .completedAt)
        }
    }

    private enum CodingKeys: String, CodingKey {
        case isCompleted = "is_completed"
        case completedAt = "completed_at"
    }
}

struct SupabaseHabitRow: Decodable, Equatable {
    var id: UUID
    var title: String
    var emoji: String
    var createdAt: String
    var recurType: String?
    var recurDays: [Int]?
    var reminderAt: String?

    func domain(logs: [SupabaseHabitLogRow]) -> Habit {
        let recurrence = recurType == "weekly" ? HabitRecurType.weekly : .daily
        return Habit(
            id: id,
            title: title,
            emoji: emoji,
            startedAt: String(createdAt.prefix(10)),
            recurType: recurrence,
            recurDays: recurrence == .weekly ? recurDays : nil,
            reminderTime: reminderAt,
            log: Dictionary(uniqueKeysWithValues: logs.map {
                ($0.logDate, $0.isCompleted ? 1 : 0)
            })
        )
    }

    private enum CodingKeys: String, CodingKey {
        case id
        case title
        case emoji
        case createdAt = "created_at"
        case recurType = "recur_type"
        case recurDays = "recur_days"
        case reminderAt = "reminder_at"
    }
}

private struct SupabaseHabitMutationRow: Encodable {
    var id: UUID
    var userID: UUID
    var title: String
    var emoji: String
    var recurType: String
    var recurDays: [Int]?
    var reminderAt: String?

    init(habit: Habit, userID: UUID) {
        self.id = habit.id
        self.userID = userID
        self.title = habit.title
        self.emoji = habit.emoji
        self.recurType = habit.recurType.rawValue
        self.recurDays = habit.recurType == .weekly ? habit.recurDays : nil
        self.reminderAt = habit.reminderTime
    }

    private enum CodingKeys: String, CodingKey {
        case id
        case userID = "user_id"
        case title
        case emoji
        case recurType = "recur_type"
        case recurDays = "recur_days"
        case reminderAt = "reminder_at"
    }
}

struct SupabaseHabitLogRow: Decodable, Equatable {
    var habitID: UUID
    var logDate: String
    var isCompleted: Bool

    private enum CodingKeys: String, CodingKey {
        case habitID = "habit_id"
        case logDate = "log_date"
        case isCompleted = "is_completed"
    }
}

struct SupabaseSubscriptionRow: Decodable, Equatable {
    var planName: String
    var status: String

    var hasProEntitlement: Bool {
        planName == "pro" && ["trial", "active"].contains(status)
    }

    private enum CodingKeys: String, CodingKey {
        case planName = "plan_name"
        case status
    }
}

struct SupabaseGoalRow: Decodable, Equatable {
    var id: UUID
    var periodType: String
    var periodKey: String
    var title: String
    var note: String?
    var sortOrder: Int
    var locked: Bool
    var lockedAt: String?

    var domain: Goal {
        Goal(
            id: id,
            periodType: GoalPeriodType(rawValue: periodType) ?? .monthly,
            periodKey: periodKey,
            title: title,
            note: note,
            sortOrder: sortOrder,
            locked: locked,
            lockedAt: lockedAt
        )
    }

    private enum CodingKeys: String, CodingKey {
        case id
        case periodType = "period_type"
        case periodKey = "period_key"
        case title
        case note
        case sortOrder = "sort_order"
        case locked
        case lockedAt = "locked_at"
    }
}

private struct SupabaseGoalMutationRow: Encodable {
    var id: UUID
    var userID: UUID
    var periodType: String
    var periodKey: String
    var title: String
    var note: String?
    var sortOrder: Int
    var locked: Bool
    var lockedAt: String?

    init(goal: Goal, userID: UUID) {
        self.id = goal.id
        self.userID = userID
        self.periodType = goal.periodType.rawValue
        self.periodKey = goal.periodKey
        self.title = goal.title
        self.note = goal.note
        self.sortOrder = goal.sortOrder
        self.locked = goal.locked
        self.lockedAt = goal.locked ? goal.lockedAt : nil
    }

    private enum CodingKeys: String, CodingKey {
        case id
        case userID = "user_id"
        case periodType = "period_type"
        case periodKey = "period_key"
        case title
        case note
        case sortOrder = "sort_order"
        case locked
        case lockedAt = "locked_at"
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(userID, forKey: .userID)
        try container.encode(periodType, forKey: .periodType)
        try container.encode(periodKey, forKey: .periodKey)
        try container.encode(title, forKey: .title)
        if let note {
            try container.encode(note, forKey: .note)
        } else {
            try container.encodeNil(forKey: .note)
        }
        try container.encode(sortOrder, forKey: .sortOrder)
        try container.encode(locked, forKey: .locked)
        if let lockedAt {
            try container.encode(lockedAt, forKey: .lockedAt)
        } else {
            try container.encodeNil(forKey: .lockedAt)
        }
    }
}

struct SupabaseGoalPromptDismissalRow: Decodable, Equatable {
    var id: UUID
    var promptType: String
    var periodKey: String
    var dismissedPermanentlyForPeriod: Bool
    var dismissedAt: String

    var domain: GoalPromptDismissal {
        GoalPromptDismissal(
            id: id,
            promptType: GoalPromptType(rawValue: promptType) ?? .monthly,
            periodKey: periodKey,
            dismissedPermanentlyForPeriod: dismissedPermanentlyForPeriod,
            dismissedAt: dismissedAt
        )
    }

    private enum CodingKeys: String, CodingKey {
        case id
        case promptType = "prompt_type"
        case periodKey = "period_key"
        case dismissedPermanentlyForPeriod = "dismissed_permanently_for_period"
        case dismissedAt = "dismissed_at"
    }
}

private struct SupabaseGoalPromptDismissalMutationRow: Encodable {
    var id: UUID
    var userID: UUID
    var promptType: String
    var periodKey: String
    var dismissedPermanentlyForPeriod: Bool
    var dismissedAt: String

    init(dismissal: GoalPromptDismissal, userID: UUID) {
        self.id = dismissal.id
        self.userID = userID
        self.promptType = dismissal.promptType.rawValue
        self.periodKey = dismissal.periodKey
        self.dismissedPermanentlyForPeriod = dismissal.dismissedPermanentlyForPeriod
        self.dismissedAt = dismissal.dismissedAt
    }

    private enum CodingKeys: String, CodingKey {
        case id
        case userID = "user_id"
        case promptType = "prompt_type"
        case periodKey = "period_key"
        case dismissedPermanentlyForPeriod = "dismissed_permanently_for_period"
        case dismissedAt = "dismissed_at"
    }
}

private struct SupabaseHabitLogMutationRow: Encodable {
    var habitID: UUID
    var userID: UUID
    var logDate: String
    var isCompleted: Bool

    private enum CodingKeys: String, CodingKey {
        case habitID = "habit_id"
        case userID = "user_id"
        case logDate = "log_date"
        case isCompleted = "is_completed"
    }
}

private struct SupabaseUserPreferencesMutationRow: Encodable {
    var preferences: [String: Int]
}
