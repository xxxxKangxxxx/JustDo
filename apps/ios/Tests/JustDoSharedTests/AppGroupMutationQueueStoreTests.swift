import XCTest
@testable import JustDoShared

final class AppGroupMutationQueueStoreTests: XCTestCase {
    private var directoryURL: URL!
    private var store: AppGroupMutationQueueStore!

    override func setUpWithError() throws {
        try super.setUpWithError()
        directoryURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("JustDoMutationQueueStoreTests")
            .appendingPathComponent(UUID().uuidString)
        store = AppGroupMutationQueueStore(directoryURL: directoryURL)
    }

    override func tearDownWithError() throws {
        if let directoryURL {
            try? FileManager.default.removeItem(at: directoryURL)
        }
        store = nil
        directoryURL = nil
        try super.tearDownWithError()
    }

    func testAppendListRemoveAndClear() throws {
        let first = queued("90000000-0000-0000-0000-000000000001")
        let second = queued("90000000-0000-0000-0000-000000000002")

        try store.append(first)
        try store.append(second)

        XCTAssertEqual(try store.list(), [first, second])

        try store.remove(id: first.id)
        XCTAssertEqual(try store.list(), [second])

        try store.clear()
        XCTAssertEqual(try store.list(), [])
    }

    private func queued(_ id: String) -> QueuedMutation {
        QueuedMutation(
            id: uuid(id),
            updatedAt: "2026-04-30T00:00:00Z",
            mutation: .habitLogSet(
                habitID: uuid("33333333-3333-3333-3333-333333333333"),
                iso: "2026-04-30",
                value: 1
            )
        )
    }

    private func uuid(_ raw: String) -> UUID {
        guard let value = UUID(uuidString: raw) else {
            fatalError("Invalid UUID fixture: \(raw)")
        }
        return value
    }
}
