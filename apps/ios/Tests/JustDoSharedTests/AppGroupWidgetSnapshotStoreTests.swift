import XCTest
@testable import JustDoShared

final class AppGroupWidgetSnapshotStoreTests: XCTestCase {
    private var directoryURL: URL!
    private var store: AppGroupWidgetSnapshotStore!

    override func setUpWithError() throws {
        try super.setUpWithError()
        directoryURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("JustDoWidgetSnapshotStoreTests")
            .appendingPathComponent(UUID().uuidString)
        store = AppGroupWidgetSnapshotStore(directoryURL: directoryURL)
    }

    override func tearDownWithError() throws {
        if let directoryURL {
            try? FileManager.default.removeItem(at: directoryURL)
        }
        store = nil
        directoryURL = nil
        try super.tearDownWithError()
    }

    func testReadReturnsNilWhenSnapshotDoesNotExist() throws {
        XCTAssertNil(try store.read())
    }

    func testWriteAndReadSnapshot() throws {
        let snapshot = WidgetSnapshot(
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
                    startDate: "2026-04-01",
                    endDate: "2026-04-30",
                    priority: .high,
                    isCompleted: false,
                    scheduledTime: nil,
                    tags: ["취업", "서류"]
                ),
            ],
            habits: [
                Habit(
                    id: uuid("33333333-3333-3333-3333-333333333333"),
                    title: "운동 30분",
                    emoji: "🏃",
                    startedAt: "2026-04-01",
                    recurType: .weekly,
                    recurDays: [1, 3, 5],
                    reminderTime: "08:30",
                    log: ["2026-04-29": 1]
                ),
            ]
        )

        try store.write(snapshot)

        XCTAssertTrue(FileManager.default.fileExists(atPath: store.snapshotURL.path))
        XCTAssertEqual(try store.read(), snapshot)
    }

    func testRemoveDeletesSnapshot() throws {
        try store.write(
            WidgetSnapshot(
                generatedAt: "2026-04-30T00:00:00Z",
                selectedDate: "2026-04-30",
                categories: [],
                tasks: [],
                habits: []
            )
        )

        try store.remove()

        XCTAssertNil(try store.read())
    }

    private func uuid(_ raw: String) -> UUID {
        guard let value = UUID(uuidString: raw) else {
            fatalError("Invalid UUID fixture: \(raw)")
        }
        return value
    }
}
