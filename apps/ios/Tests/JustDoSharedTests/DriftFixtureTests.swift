import XCTest
@testable import JustDoShared

final class DriftFixtureTests: XCTestCase {
    private let decoder = JSONDecoder()
    private let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        return encoder
    }()

    func testAppSnapshotFixtureDecodes() throws {
        let snapshot = try decodeFixture("app_snapshot", as: AppSnapshot.self)

        XCTAssertEqual(snapshot.view.tab, .habit)
        XCTAssertEqual(snapshot.settings.weekStart, 1)
        XCTAssertFalse(snapshot.settings.justDoMode)
        XCTAssertEqual(snapshot.categories.map(\.name), ["취업", "업무"])
        XCTAssertEqual(snapshot.tasks.first?.categoryID?.uuidString.lowercased(), "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
        XCTAssertEqual(snapshot.tasks.first?.tags, ["취업", "서류"])
        XCTAssertEqual(snapshot.habits.first?.recurType, .weekly)
        XCTAssertEqual(snapshot.habits.first?.recurDays, [1, 3, 5])
        XCTAssertEqual(snapshot.habits.first?.reminderTime, "08:30")
        XCTAssertEqual(snapshot.habits.first?.log["2026-04-29"], 1)
    }

    func testQueuedMutationsFixtureDecodesWebShape() throws {
        let queued = try decodeFixture("queued_mutations", as: [QueuedMutation].self)

        XCTAssertEqual(queued.count, 8)
        XCTAssertEqual(queued[0].mutation, .categoryDelete(id: uuid("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")))
        XCTAssertEqual(queued[1].mutation, .preferencesSet(key: .weekStart, value: 1))
        XCTAssertEqual(queued[2].mutation, .taskDelete(id: uuid("11111111-1111-1111-1111-111111111111")))
        XCTAssertEqual(queued[4].mutation, .habitDelete(id: uuid("22222222-2222-2222-2222-222222222222")))
        XCTAssertEqual(queued[5].mutation, .habitLogSet(habitID: uuid("33333333-3333-3333-3333-333333333333"), iso: "2026-04-30", value: 1))
    }

    func testQueuedMutationEncodesWebShape() throws {
        let queued = QueuedMutation(
            id: uuid("99999999-9999-9999-9999-999999999999"),
            updatedAt: "2026-04-30T00:00:00Z",
            mutation: .habitLogSet(
                habitID: uuid("33333333-3333-3333-3333-333333333333"),
                iso: "2026-04-30",
                value: 1
            )
        )

        let data = try encoder.encode(queued)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        let mutation = try XCTUnwrap(object["mutation"] as? [String: Any])

        XCTAssertEqual(mutation["type"] as? String, "habit_log_set")
        XCTAssertEqual(mutation["habitId"] as? String, "33333333-3333-3333-3333-333333333333")
        XCTAssertEqual(mutation["iso"] as? String, "2026-04-30")
        XCTAssertEqual(mutation["value"] as? Int, 1)
    }

    func testTaskCompletionMutationEncodesCompactShape() throws {
        let queued = QueuedMutation(
            id: uuid("99999999-9999-9999-9999-999999999998"),
            updatedAt: "2026-05-21T00:00:00Z",
            mutation: .taskCompletionSet(
                id: uuid("11111111-1111-1111-1111-111111111111"),
                isCompleted: true,
                completedAt: "2026-05-21T00:00:00Z"
            )
        )

        let data = try encoder.encode(queued)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        let mutation = try XCTUnwrap(object["mutation"] as? [String: Any])

        XCTAssertEqual(mutation["type"] as? String, "task_completion_set")
        XCTAssertEqual(mutation["id"] as? String, "11111111-1111-1111-1111-111111111111")
        XCTAssertEqual(mutation["isCompleted"] as? Bool, true)
        XCTAssertEqual(mutation["completedAt"] as? String, "2026-05-21T00:00:00Z")
        XCTAssertNil(mutation["task"])
    }

    func testWidgetSnapshotFixtureDecodes() throws {
        let snapshot = try decodeFixture("widget_snapshot", as: WidgetSnapshot.self)

        XCTAssertEqual(snapshot.selectedDate, "2026-04-30")
        XCTAssertEqual(snapshot.tasks.count, 2)
        XCTAssertEqual(snapshot.habits.count, 1)
    }

    private func decodeFixture<T: Decodable>(_ name: String, as type: T.Type) throws -> T {
        let url = try XCTUnwrap(Bundle.module.url(forResource: name, withExtension: "json"))
        let data = try Data(contentsOf: url)
        return try decoder.decode(type, from: data)
    }

    private func uuid(_ raw: String) -> UUID {
        guard let value = UUID(uuidString: raw) else {
            fatalError("Invalid UUID fixture: \(raw)")
        }
        return value
    }
}
