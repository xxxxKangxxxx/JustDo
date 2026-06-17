import CoreData
import XCTest
@testable import JustDoShared

final class SupabaseRestSyncTests: XCTestCase {
    func testFetchAppSnapshotMapsSupabaseRows() async throws {
        let userID = uuid("99999999-9999-9999-9999-999999999999")
        let transport = FakeSupabaseRestTransport(responses: [
            "categories": """
            [{"id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","name":"Focus","color":"#4F6FD8","is_default":true,"position":0}]
            """,
            "tags": """
            [{"id":"eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee","name":"focus"}]
            """,
            "task_tags": """
            [{"task_id":"11111111-1111-1111-1111-111111111111","tag_id":"eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"}]
            """,
            "tasks": """
            [{"id":"11111111-1111-1111-1111-111111111111","category_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","title":"Proposal draft","priority":"high","start_date":"2026-04-30","end_date":"2026-04-30","scheduled_time":"09:30","is_completed":false}]
            """,
            "habits": """
            [{"id":"33333333-3333-3333-3333-333333333333","title":"Walk","emoji":"*","created_at":"2026-04-01T00:00:00Z","recur_type":"weekly","recur_days":[2,4],"reminder_at":"08:30"}]
            """,
            "habit_logs": """
            [{"habit_id":"33333333-3333-3333-3333-333333333333","log_date":"2026-04-30","is_completed":true}]
            """,
            "goals": """
            [{"id":"44444444-4444-4444-4444-444444444444","period_type":"monthly","period_key":"2026-04","title":"Interview","note":"prep","sort_order":0,"locked":true,"locked_at":"2026-04-01T00:00:00Z"}]
            """,
            "goal_prompt_dismissals": """
            [{"id":"55555555-5555-5555-5555-555555555555","prompt_type":"monthly","period_key":"2026-04","dismissed_permanently_for_period":true,"dismissed_at":"2026-04-02T00:00:00Z"}]
            """,
            "user_subscriptions": """
            [{"plan_name":"pro","status":"active"}]
            """,
        ])
        let client = SupabaseSnapshotClient(userID: userID, transport: transport)

        let snapshot = try await client.fetchAppSnapshot(
            view: AppSnapshotDefaults.viewState(selectedDate: "2026-04-30"),
            settings: AppSnapshotDefaults.settings()
        )

        XCTAssertEqual(snapshot.categories.map(\.name), ["Focus"])
        XCTAssertEqual(snapshot.tasks.map(\.title), ["Proposal draft"])
        XCTAssertEqual(snapshot.tasks.first?.tags, ["focus"])
        XCTAssertEqual(snapshot.habits.first?.recurType, .weekly)
        XCTAssertEqual(snapshot.habits.first?.recurDays, [2, 4])
        XCTAssertEqual(snapshot.habits.first?.log["2026-04-30"], 1)
        XCTAssertEqual(snapshot.goals.map(\.title), ["Interview"])
        XCTAssertEqual(snapshot.goals.first?.periodType, .monthly)
        XCTAssertEqual(snapshot.goalPromptDismissals.first?.promptType, .monthly)
        XCTAssertEqual(snapshot.settings.plan, "pro")
        XCTAssertTrue(transport.requestedUserFilters.allSatisfy { $0 == "eq.\(userID.uuidString.lowercased())" })
        XCTAssertEqual(
            Set(transport.requestedPaths),
            [
                "categories",
                "tags",
                "task_tags",
                "tasks",
                "habits",
                "habit_logs",
                "goals",
                "goal_prompt_dismissals",
                "user_subscriptions",
            ]
        )
    }

    func testFetchAppSnapshotMapsInactiveSubscriptionToFreePlan() async throws {
        let userID = uuid("99999999-9999-9999-9999-999999999999")
        let transport = FakeSupabaseRestTransport(responses: [
            "categories": "[]",
            "tags": "[]",
            "task_tags": "[]",
            "tasks": "[]",
            "habits": "[]",
            "habit_logs": "[]",
            "goals": "[]",
            "goal_prompt_dismissals": "[]",
            "user_subscriptions": """
            [{"plan_name":"pro","status":"canceled"}]
            """,
        ])
        let client = SupabaseSnapshotClient(userID: userID, transport: transport)

        let snapshot = try await client.fetchAppSnapshot(
            view: AppSnapshotDefaults.viewState(selectedDate: "2026-04-30"),
            settings: AppSnapshotDefaults.settings()
        )

        XCTAssertEqual(snapshot.settings.plan, "free")
    }

    func testSyncReplacesCoreDataMirror() async throws {
        let stack = CoreDataStack(inMemory: true)
        let store = CoreDataAppSnapshotStore(context: stack.container.viewContext)
        let transport = FakeSupabaseRestTransport(responses: [
            "categories": """
            [{"id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","name":"Focus","color":"#4F6FD8","is_default":true,"position":0}]
            """,
            "tags": "[]",
            "task_tags": "[]",
            "tasks": """
            [{"id":"11111111-1111-1111-1111-111111111111","category_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","title":"Synced task","priority":null,"start_date":"2026-04-30","end_date":"2026-04-30","scheduled_time":null,"is_completed":true}]
            """,
            "habits": "[]",
            "habit_logs": "[]",
            "goals": """
            [{"id":"44444444-4444-4444-4444-444444444444","period_type":"yearly","period_key":"2026","title":"Year goal","note":null,"sort_order":0,"locked":false,"locked_at":null}]
            """,
            "goal_prompt_dismissals": "[]",
        ])
        let client = SupabaseSnapshotClient(
            userID: uuid("99999999-9999-9999-9999-999999999999"),
            transport: transport
        )
        let sync = SupabaseCoreDataSync(snapshotClient: client, snapshotStore: store)

        _ = try await sync.sync(
            view: AppSnapshotDefaults.viewState(selectedDate: "2026-04-30"),
            settings: AppSnapshotDefaults.settings()
        )

        let loaded = try store.loadSnapshot(
            view: AppSnapshotDefaults.viewState(selectedDate: "2026-04-30"),
            settings: AppSnapshotDefaults.settings()
        )
        XCTAssertEqual(loaded.tasks.map(\.title), ["Synced task"])
        XCTAssertEqual(loaded.tasks.first?.isCompleted, true)
        XCTAssertEqual(loaded.goals.map(\.title), ["Year goal"])
    }

    func testQueuedMutationFlusherWritesTaskAndHabitLogThenRemovesQueueRows() async throws {
        let userID = uuid("99999999-9999-9999-9999-999999999999")
        let stack = CoreDataStack(inMemory: true)
        let store = CoreDataAppSnapshotStore(context: stack.container.viewContext)
        let taskMutation = QueuedMutation(
            id: uuid("90000000-0000-0000-0000-000000000001"),
            updatedAt: "2026-05-07T10:00:00Z",
            mutation: .taskUpsert(
                Task(
                    id: uuid("11111111-1111-1111-1111-111111111111"),
                    title: "Proposal draft",
                    categoryID: uuid("AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA"),
                    startDate: "2026-04-30",
                    endDate: "2026-04-30",
                    priority: .high,
                    isCompleted: true,
                    scheduledTime: "09:30",
                    tags: ["focus"]
                )
            )
        )
        let tagID = uuid("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee")
        let habitLogMutation = QueuedMutation(
            id: uuid("90000000-0000-0000-0000-000000000002"),
            updatedAt: "2026-05-07T10:01:00Z",
            mutation: .habitLogSet(
                habitID: uuid("33333333-3333-3333-3333-333333333333"),
                iso: "2026-04-30",
                value: 1
            )
        )
        try store.applyAndEnqueue(taskMutation)
        try store.applyAndEnqueue(habitLogMutation)
        let transport = FakeSupabaseRestTransport(responses: [
            "tags:upsert": """
            [{"id":"\(tagID.uuidString.lowercased())"}]
            """,
            "task_tags": "[]",
        ])

        let flushed = try await SupabaseQueuedMutationFlusher(
            mutationClient: SupabaseMutationClient(userID: userID, transport: transport),
            snapshotStore: store
        ).flush()

        XCTAssertEqual(flushed, [taskMutation, habitLogMutation])
        XCTAssertEqual(try store.queuedMutations(), [])
        XCTAssertEqual(transport.upserts.map(\.path), ["tasks", "tags", "task_tags", "habit_logs"])
        XCTAssertEqual(transport.upserts[2].queryItems.first?.name, "on_conflict")
        XCTAssertEqual(transport.upserts[2].queryItems.first?.value, "task_id,tag_id")
        XCTAssertEqual(transport.upserts[3].queryItems.first?.name, "on_conflict")
        XCTAssertEqual(transport.upserts[3].queryItems.first?.value, "habit_id,log_date")

        let taskBody = try XCTUnwrap(transport.upserts.first?.json)
        XCTAssertEqual(taskBody["user_id"] as? String, userID.uuidString.uppercased())
        XCTAssertEqual(taskBody["title"] as? String, "Proposal draft")
        XCTAssertEqual(taskBody["is_completed"] as? Bool, true)

        let tagBody = try XCTUnwrap(transport.upserts[1].json)
        XCTAssertEqual(tagBody["user_id"] as? String, userID.uuidString.uppercased())
        XCTAssertEqual(tagBody["name"] as? String, "focus")

        let taskTagBody = try XCTUnwrap(transport.upserts[2].jsonArray?.first)
        XCTAssertEqual(taskTagBody["task_id"] as? String, "11111111-1111-1111-1111-111111111111")
        XCTAssertEqual(taskTagBody["tag_id"] as? String, tagID.uuidString.uppercased())

        let habitLogBody = try XCTUnwrap(transport.upserts[3].json)
        XCTAssertEqual(habitLogBody["habit_id"] as? String, "33333333-3333-3333-3333-333333333333")
        XCTAssertEqual(habitLogBody["log_date"] as? String, "2026-04-30")
        XCTAssertEqual(habitLogBody["is_completed"] as? Bool, true)
    }

    func testQueuedMutationFlusherRemovesStaleTaskTags() async throws {
        let userID = uuid("99999999-9999-9999-9999-999999999999")
        let stack = CoreDataStack(inMemory: true)
        let store = CoreDataAppSnapshotStore(context: stack.container.viewContext)
        let taskID = uuid("11111111-1111-1111-1111-111111111111")
        let staleTagID = uuid("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee")
        let mutation = QueuedMutation(
            id: uuid("90000000-0000-0000-0000-000000000009"),
            updatedAt: "2026-05-07T10:03:00Z",
            mutation: .taskUpsert(
                Task(
                    id: taskID,
                    title: "No tag task",
                    categoryID: nil,
                    startDate: "2026-04-30",
                    endDate: "2026-04-30",
                    priority: .medium,
                    isCompleted: false,
                    scheduledTime: nil,
                    tags: []
                )
            )
        )
        try store.applyAndEnqueue(mutation)
        let transport = FakeSupabaseRestTransport(responses: [
            "task_tags": """
            [{"tag_id":"\(staleTagID.uuidString.lowercased())"}]
            """,
        ])

        _ = try await SupabaseQueuedMutationFlusher(
            mutationClient: SupabaseMutationClient(userID: userID, transport: transport),
            snapshotStore: store
        ).flush()

        XCTAssertEqual(transport.deletes.map(\.path), ["task_tags"])
        XCTAssertEqual(
            transport.deletes.first?.queryItems.map { "\($0.name)=\($0.value ?? "")" },
            [
                "task_id=eq.\(taskID.uuidString.lowercased())",
                "tag_id=in.(\(staleTagID.uuidString.lowercased()))",
            ]
        )
    }

    func testQueuedMutationFlusherDeletesHabitLogWhenValueIsZero() async throws {
        let userID = uuid("99999999-9999-9999-9999-999999999999")
        let stack = CoreDataStack(inMemory: true)
        let store = CoreDataAppSnapshotStore(context: stack.container.viewContext)
        let mutation = QueuedMutation(
            id: uuid("90000000-0000-0000-0000-000000000003"),
            updatedAt: "2026-05-07T10:02:00Z",
            mutation: .habitLogSet(
                habitID: uuid("33333333-3333-3333-3333-333333333333"),
                iso: "2026-04-30",
                value: 0
            )
        )
        try store.applyAndEnqueue(mutation)
        let transport = FakeSupabaseRestTransport(responses: [:])

        _ = try await SupabaseQueuedMutationFlusher(
            mutationClient: SupabaseMutationClient(userID: userID, transport: transport),
            snapshotStore: store
        ).flush()

        XCTAssertEqual(try store.queuedMutations(), [])
        XCTAssertEqual(transport.deletes.map(\.path), ["habit_logs"])
        XCTAssertEqual(
            transport.deletes.first?.queryItems.map { "\($0.name)=\($0.value ?? "")" },
            [
                "user_id=eq.\(userID.uuidString.lowercased())",
                "habit_id=eq.33333333-3333-3333-3333-333333333333",
                "log_date=eq.2026-04-30",
            ]
        )
    }

    func testQueuedMutationFlusherPatchesOnlyTaskCompletion() async throws {
        let userID = uuid("99999999-9999-9999-9999-999999999999")
        let stack = CoreDataStack(inMemory: true)
        let store = CoreDataAppSnapshotStore(context: stack.container.viewContext)
        let taskID = uuid("11111111-1111-1111-1111-111111111111")
        let mutation = QueuedMutation(
            id: uuid("90000000-0000-0000-0000-000000000004"),
            updatedAt: "2026-05-21T00:00:00Z",
            mutation: .taskCompletionSet(
                id: taskID,
                isCompleted: true,
                completedAt: "2026-05-21T00:00:00Z"
            )
        )
        try store.applyAndEnqueue(
            QueuedMutation(
                id: uuid("90000000-0000-0000-0000-000000000005"),
                updatedAt: "2026-05-20T00:00:00Z",
                mutation: .taskUpsert(
                    Task(
                        id: taskID,
                        title: "Proposal draft",
                        categoryID: nil,
                        startDate: "2026-04-30",
                        endDate: "2026-04-30",
                        priority: .high,
                        isCompleted: false,
                        scheduledTime: "09:30",
                        tags: []
                    )
                )
            )
        )
        try store.applyAndEnqueue(mutation)
        let transport = FakeSupabaseRestTransport(responses: [:])

        _ = try await SupabaseQueuedMutationFlusher(
            mutationClient: SupabaseMutationClient(userID: userID, transport: transport),
            snapshotStore: store
        ).flush()

        XCTAssertEqual(try store.queuedMutations(), [])
        XCTAssertEqual(transport.upserts.map(\.path), ["tasks"])
        XCTAssertEqual(transport.patches.map(\.path), ["tasks"])
        XCTAssertEqual(
            transport.patches.first?.queryItems.map { "\($0.name)=\($0.value ?? "")" },
            [
                "user_id=eq.\(userID.uuidString.lowercased())",
                "id=eq.\(taskID.uuidString.lowercased())",
            ]
        )

        let patchBody = try XCTUnwrap(transport.patches.first?.json)
        XCTAssertEqual(patchBody["is_completed"] as? Bool, true)
        XCTAssertEqual(patchBody["completed_at"] as? String, "2026-05-21T00:00:00Z")
        XCTAssertNil(patchBody["title"])
        XCTAssertNil(patchBody["category_id"])
        XCTAssertNil(patchBody["start_date"])
        XCTAssertNil(patchBody["end_date"])
        XCTAssertNil(patchBody["scheduled_time"])
    }

    func testQueuedMutationFlusherClearsCompletedAtWhenTaskIsReopened() async throws {
        let userID = uuid("99999999-9999-9999-9999-999999999999")
        let stack = CoreDataStack(inMemory: true)
        let store = CoreDataAppSnapshotStore(context: stack.container.viewContext)
        let taskID = uuid("11111111-1111-1111-1111-111111111111")
        let mutation = QueuedMutation(
            id: uuid("90000000-0000-0000-0000-000000000006"),
            updatedAt: "2026-05-21T00:00:00Z",
            mutation: .taskCompletionSet(
                id: taskID,
                isCompleted: false,
                completedAt: nil
            )
        )
        try store.applyAndEnqueue(mutation)
        let transport = FakeSupabaseRestTransport(responses: [:])

        _ = try await SupabaseQueuedMutationFlusher(
            mutationClient: SupabaseMutationClient(userID: userID, transport: transport),
            snapshotStore: store
        ).flush()

        let patchBody = try XCTUnwrap(transport.patches.first?.json)
        XCTAssertEqual(patchBody["is_completed"] as? Bool, false)
        XCTAssertTrue(patchBody["completed_at"] is NSNull)
    }

    func testQueuedMutationFlusherClearsGoalNullableFieldsWhenUnlocked() async throws {
        let userID = uuid("99999999-9999-9999-9999-999999999999")
        let stack = CoreDataStack(inMemory: true)
        let store = CoreDataAppSnapshotStore(context: stack.container.viewContext)
        let mutation = QueuedMutation(
            id: uuid("90000000-0000-0000-0000-000000000007"),
            updatedAt: "2026-05-21T00:00:00Z",
            mutation: .goalUpsert(
                Goal(
                    id: uuid("44444444-4444-4444-4444-444444444444"),
                    periodType: .yearly,
                    periodKey: "2026",
                    title: "Year goal",
                    note: nil,
                    sortOrder: 0,
                    locked: false,
                    lockedAt: "2026-05-20T00:00:00Z"
                )
            )
        )
        try store.applyAndEnqueue(mutation)
        let transport = FakeSupabaseRestTransport(responses: [:])

        _ = try await SupabaseQueuedMutationFlusher(
            mutationClient: SupabaseMutationClient(userID: userID, transport: transport),
            snapshotStore: store
        ).flush()

        let body = try XCTUnwrap(transport.upserts.first?.json)
        XCTAssertEqual(body["period_type"] as? String, "yearly")
        XCTAssertEqual(body["period_key"] as? String, "2026")
        XCTAssertEqual(body["locked"] as? Bool, false)
        XCTAssertTrue(body["locked_at"] is NSNull)
        XCTAssertTrue(body["note"] is NSNull)
    }

    private func uuid(_ raw: String) -> UUID {
        guard let value = UUID(uuidString: raw) else {
            fatalError("Invalid UUID fixture: \(raw)")
        }
        return value
    }
}

private final class FakeSupabaseRestTransport: SupabaseRestTransport {
    private let responses: [String: String]
    private(set) var requestedPaths: [String] = []
    private(set) var requestedUserFilters: [String] = []
    private(set) var upserts: [MutationRequest] = []
    private(set) var patches: [MutationRequest] = []
    private(set) var deletes: [MutationRequest] = []

    init(responses: [String: String]) {
        self.responses = responses
    }

    func get(path: String, queryItems: [URLQueryItem]) async throws -> Data {
        requestedPaths.append(path)
        if let userFilter = queryItems.first(where: { $0.name == "user_id" })?.value {
            requestedUserFilters.append(userFilter)
        }
        return Data((responses[path] ?? "[]").utf8)
    }

    func upsert(path: String, queryItems: [URLQueryItem], body: Data) async throws {
        upserts.append(try MutationRequest(path: path, queryItems: queryItems, body: body))
    }

    func upsertReturning(path: String, queryItems: [URLQueryItem], body: Data) async throws -> Data {
        upserts.append(try MutationRequest(path: path, queryItems: queryItems, body: body))
        return Data((responses["\(path):upsert"] ?? responses[path] ?? "[]").utf8)
    }

    func patch(path: String, queryItems: [URLQueryItem], body: Data) async throws {
        patches.append(try MutationRequest(path: path, queryItems: queryItems, body: body))
    }

    func delete(path: String, queryItems: [URLQueryItem]) async throws {
        deletes.append(MutationRequest(path: path, queryItems: queryItems, json: [:]))
    }
}

private struct MutationRequest {
    var path: String
    var queryItems: [URLQueryItem]
    var json: [String: Any]
    var jsonArray: [[String: Any]]?

    init(path: String, queryItems: [URLQueryItem], body: Data) throws {
        self.path = path
        self.queryItems = queryItems
        let object = try JSONSerialization.jsonObject(with: body)
        if let dictionary = object as? [String: Any] {
            self.json = dictionary
            self.jsonArray = nil
        } else {
            let array = try XCTUnwrap(object as? [[String: Any]])
            self.json = [:]
            self.jsonArray = array
        }
    }

    init(path: String, queryItems: [URLQueryItem], json: [String: Any]) {
        self.path = path
        self.queryItems = queryItems
        self.json = json
        self.jsonArray = nil
    }
}
