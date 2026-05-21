import CoreData
import XCTest
@testable import JustDoShared

final class CoreDataAppSnapshotStoreTests: XCTestCase {
    private var stack: CoreDataStack!
    private var context: NSManagedObjectContext!
    private var store: CoreDataAppSnapshotStore!

    override func setUp() {
        super.setUp()
        stack = CoreDataStack(inMemory: true)
        context = stack.container.viewContext
        store = CoreDataAppSnapshotStore(context: context)
    }

    override func tearDown() {
        store = nil
        context = nil
        stack = nil
        super.tearDown()
    }

    func testReplaceAndLoadSnapshotRoundTrip() throws {
        let snapshot = makeSnapshot(taskTitle: "First")

        try store.replaceSnapshot(snapshot)
        let loaded = try store.loadSnapshot(
            view: snapshot.view,
            settings: snapshot.settings
        )

        XCTAssertEqual(loaded, snapshot)
        XCTAssertTrue(try store.hasMirrorData())
    }

    func testReplaceSnapshotRemovesStaleRows() throws {
        try store.replaceSnapshot(makeSnapshot(taskTitle: "First"))
        try store.replaceSnapshot(makeSnapshot(taskTitle: "Second"))

        let loaded = try store.loadSnapshot(
            view: AppSnapshotDefaults.viewState(selectedDate: "2026-04-30"),
            settings: AppSnapshotDefaults.settings()
        )

        XCTAssertEqual(loaded.tasks.map(\.title), ["Second"])
    }

    func testFindsTaskAndHabitByID() throws {
        try store.replaceSnapshot(makeSnapshot(taskTitle: "First"))

        let task = try store.task(id: UUID(uuidString: "11111111-1111-1111-1111-111111111111")!)
        let habit = try store.habit(id: UUID(uuidString: "33333333-3333-3333-3333-333333333333")!)

        XCTAssertEqual(task?.title, "First")
        XCTAssertEqual(habit?.title, "Walk")
    }

    func testTaskCompletionMutationUpdatesOnlyCompletionLocally() throws {
        let taskID = UUID(uuidString: "11111111-1111-1111-1111-111111111111")!
        try store.replaceSnapshot(makeSnapshot(taskTitle: "First"))

        try store.applyAndEnqueue(
            QueuedMutation(
                id: UUID(uuidString: "90000000-0000-0000-0000-000000000001")!,
                updatedAt: "2026-05-21T00:00:00Z",
                mutation: .taskCompletionSet(
                    id: taskID,
                    isCompleted: true,
                    completedAt: "2026-05-21T00:00:00Z"
                )
            )
        )

        let task = try store.task(id: taskID)
        XCTAssertEqual(task?.title, "First")
        XCTAssertEqual(task?.isCompleted, true)
        XCTAssertEqual(try store.queuedMutations().count, 1)
    }

    private func makeSnapshot(taskTitle: String) -> AppSnapshot {
        let categoryID = UUID(uuidString: "AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA")!
        return AppSnapshot(
            view: AppSnapshotDefaults.viewState(selectedDate: "2026-04-30"),
            categories: [
                Category(
                    id: categoryID,
                    name: "Focus",
                    color: "#4F6FD8",
                    isDefault: true,
                    position: 0
                )
            ],
            tasks: [
                Task(
                    id: UUID(uuidString: "11111111-1111-1111-1111-111111111111")!,
                    title: taskTitle,
                    categoryID: categoryID,
                    startDate: "2026-04-30",
                    endDate: "2026-04-30",
                    priority: .high,
                    isCompleted: false,
                    scheduledTime: nil,
                    tags: []
                )
            ],
            habits: [
                Habit(
                    id: UUID(uuidString: "33333333-3333-3333-3333-333333333333")!,
                    title: "Walk",
                    emoji: "*",
                    startedAt: "2026-04-01",
                    recurType: .daily,
                    recurDays: nil,
                    reminderTime: "08:30",
                    log: [:]
                )
            ],
            settings: AppSnapshotDefaults.settings()
        )
    }
}
