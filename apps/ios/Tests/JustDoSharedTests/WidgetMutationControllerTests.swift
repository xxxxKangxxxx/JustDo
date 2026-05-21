import XCTest
@testable import JustDoShared

final class WidgetMutationControllerTests: XCTestCase {
    private var directoryURL: URL!
    private var snapshotStore: AppGroupWidgetSnapshotStore!
    private var queueStore: AppGroupMutationQueueStore!
    private var controller: WidgetMutationController!

    override func setUpWithError() throws {
        try super.setUpWithError()
        directoryURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("JustDoWidgetMutationControllerTests")
            .appendingPathComponent(UUID().uuidString)
        snapshotStore = AppGroupWidgetSnapshotStore(directoryURL: directoryURL)
        queueStore = AppGroupMutationQueueStore(directoryURL: directoryURL)
        controller = WidgetMutationController(
            snapshotStore: snapshotStore,
            queueStore: queueStore,
            now: { Date(timeIntervalSince1970: 1_777_500_000) }
        )
        try snapshotStore.write(snapshot())
    }

    override func tearDownWithError() throws {
        if let directoryURL {
            try? FileManager.default.removeItem(at: directoryURL)
        }
        snapshotStore = nil
        queueStore = nil
        controller = nil
        directoryURL = nil
        try super.tearDownWithError()
    }

    func testSetTaskCompletionUpdatesSnapshotAndEnqueuesCompletionPatch() throws {
        let taskID = uuid("11111111-1111-1111-1111-111111111111")

        try controller.setTaskCompletion(
            taskID: taskID,
            isCompleted: true
        )

        let updated = try XCTUnwrap(snapshotStore.read())
        XCTAssertEqual(updated.tasks.first?.isCompleted, true)

        let queued = try queueStore.list()
        XCTAssertEqual(queued.count, 1)
        XCTAssertEqual(
            queued.first?.mutation,
            .taskCompletionSet(
                id: taskID,
                isCompleted: true,
                completedAt: "2026-04-29T22:00:00.000Z"
            )
        )
    }

    func testSetHabitLogUpdatesSnapshotAndEnqueuesHabitLogSet() throws {
        let habitID = uuid("33333333-3333-3333-3333-333333333333")

        try controller.setHabitLog(
            habitID: habitID,
            iso: "2026-04-30",
            value: 1
        )

        let updated = try XCTUnwrap(snapshotStore.read())
        XCTAssertEqual(updated.habits.first?.log["2026-04-30"], 1)
        XCTAssertEqual(
            try queueStore.list().first?.mutation,
            .habitLogSet(habitID: habitID, iso: "2026-04-30", value: 1)
        )
    }

    private func snapshot() -> WidgetSnapshot {
        WidgetSnapshot(
            generatedAt: "2026-04-30T00:00:00Z",
            selectedDate: "2026-04-30",
            categories: [
                Category(
                    id: uuid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                    name: "취업",
                    color: "#4F6FD8",
                    isDefault: true,
                    position: 0
                ),
            ],
            tasks: [
                Task(
                    id: uuid("11111111-1111-1111-1111-111111111111"),
                    title: "삼성전자 지원",
                    categoryID: uuid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                    startDate: "2026-04-30",
                    endDate: "2026-04-30",
                    priority: .high,
                    isCompleted: false,
                    scheduledTime: nil,
                    tags: []
                ),
            ],
            habits: [
                Habit(
                    id: uuid("33333333-3333-3333-3333-333333333333"),
                    title: "운동",
                    emoji: "*",
                    startedAt: "2026-04-01",
                    recurType: .daily,
                    recurDays: nil,
                    reminderTime: nil,
                    log: [:]
                ),
            ]
        )
    }

    private func uuid(_ raw: String) -> UUID {
        guard let value = UUID(uuidString: raw) else {
            fatalError("Invalid UUID fixture: \(raw)")
        }
        return value
    }
}
