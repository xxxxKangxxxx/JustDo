import CoreData
import XCTest
@testable import JustDoShared

final class AppGroupMutationQueueDrainerTests: XCTestCase {
    private var directoryURL: URL!
    private var appGroupQueueStore: AppGroupMutationQueueStore!
    private var stack: CoreDataStack!
    private var snapshotStore: CoreDataAppSnapshotStore!

    override func setUpWithError() throws {
        try super.setUpWithError()
        directoryURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("JustDoMutationQueueDrainerTests")
            .appendingPathComponent(UUID().uuidString)
        appGroupQueueStore = AppGroupMutationQueueStore(directoryURL: directoryURL)
        stack = CoreDataStack(inMemory: true)
        snapshotStore = CoreDataAppSnapshotStore(context: stack.container.viewContext)
        try snapshotStore.replaceSnapshot(makeSnapshot())
    }

    override func tearDownWithError() throws {
        if let directoryURL {
            try? FileManager.default.removeItem(at: directoryURL)
        }
        snapshotStore = nil
        stack = nil
        appGroupQueueStore = nil
        directoryURL = nil
        try super.tearDownWithError()
    }

    func testDrainAppliesMutationsAndMovesThemIntoCoreDataQueue() throws {
        let completedTask = Task(
            id: uuid("11111111-1111-1111-1111-111111111111"),
            title: "Review",
            categoryID: uuid("AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA"),
            startDate: "2026-04-30",
            endDate: "2026-04-30",
            priority: .high,
            isCompleted: true,
            scheduledTime: nil,
            tags: ["focus"]
        )
        let taskMutation = QueuedMutation(
            id: uuid("90000000-0000-0000-0000-000000000001"),
            updatedAt: "2026-05-07T10:00:00Z",
            mutation: .taskUpsert(completedTask)
        )
        let habitMutation = QueuedMutation(
            id: uuid("90000000-0000-0000-0000-000000000002"),
            updatedAt: "2026-05-07T10:01:00Z",
            mutation: .habitLogSet(
                habitID: uuid("33333333-3333-3333-3333-333333333333"),
                iso: "2026-04-30",
                value: 1
            )
        )
        try appGroupQueueStore.append(taskMutation)
        try appGroupQueueStore.append(habitMutation)

        let drained = try AppGroupMutationQueueDrainer(
            appGroupQueueStore: appGroupQueueStore,
            snapshotStore: snapshotStore
        ).drain()

        let snapshot = try snapshotStore.loadSnapshot(
            view: AppSnapshotDefaults.viewState(selectedDate: "2026-04-30"),
            settings: AppSnapshotDefaults.settings()
        )
        XCTAssertEqual(drained, [taskMutation, habitMutation])
        XCTAssertEqual(try appGroupQueueStore.list(), [])
        XCTAssertEqual(snapshot.tasks.first?.isCompleted, true)
        XCTAssertEqual(snapshot.habits.first?.log["2026-04-30"], 1)
        XCTAssertEqual(try snapshotStore.queuedMutations(), [taskMutation, habitMutation])
    }

    private func makeSnapshot() -> AppSnapshot {
        AppSnapshot(
            view: AppSnapshotDefaults.viewState(selectedDate: "2026-04-30"),
            categories: [
                Category(
                    id: uuid("AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA"),
                    name: "Focus",
                    color: "#4F6FD8",
                    isDefault: true,
                    position: 0
                ),
            ],
            tasks: [
                Task(
                    id: uuid("11111111-1111-1111-1111-111111111111"),
                    title: "Review",
                    categoryID: uuid("AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA"),
                    startDate: "2026-04-30",
                    endDate: "2026-04-30",
                    priority: .high,
                    isCompleted: false,
                    scheduledTime: nil,
                    tags: ["focus"]
                ),
            ],
            habits: [
                Habit(
                    id: uuid("33333333-3333-3333-3333-333333333333"),
                    title: "Walk",
                    emoji: "*",
                    startedAt: "2026-04-01",
                    recurType: .daily,
                    recurDays: nil,
                    reminderTime: "08:30",
                    log: [:]
                ),
            ],
            settings: AppSnapshotDefaults.settings()
        )
    }

    private func uuid(_ raw: String) -> UUID {
        guard let value = UUID(uuidString: raw) else {
            fatalError("Invalid UUID fixture: \(raw)")
        }
        return value
    }
}
