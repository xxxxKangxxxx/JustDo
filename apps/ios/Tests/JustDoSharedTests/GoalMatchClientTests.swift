import XCTest
@testable import JustDoShared

final class GoalMatchClientTests: XCTestCase {
    private func uuid(_ value: String) -> UUID { UUID(uuidString: value)! }

    func testGroupsRowsByGoalWithTaskAndHabitSets() {
        let goalA = uuid("AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA")
        let goalB = uuid("BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB")
        let task1 = uuid("11111111-1111-1111-1111-111111111111")
        let habit1 = uuid("22222222-2222-2222-2222-222222222222")

        let rows = [
            GoalSemanticMatchRow(goalId: goalA, itemType: "task", itemId: task1),
            GoalSemanticMatchRow(goalId: goalA, itemType: "habit", itemId: habit1),
            // Embedded goal that matched nothing: present with a nil item.
            GoalSemanticMatchRow(goalId: goalB, itemType: nil, itemId: nil),
        ]

        let map = GoalMatchClient.group(rows: rows)

        XCTAssertEqual(map[goalA]?.taskIds, [task1])
        XCTAssertEqual(map[goalA]?.habitIds, [habit1])
        // Goal B is present (embedded) but with empty sets — distinct from absent.
        XCTAssertEqual(map[goalB], GoalMatchSet())
        XCTAssertNotNil(map[goalB])
    }

    func testDecodesRpcJson() throws {
        let json = """
        [
          {"goal_id":"AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA","item_type":"task","item_id":"11111111-1111-1111-1111-111111111111"},
          {"goal_id":"AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA","item_type":null,"item_id":null}
        ]
        """.data(using: .utf8)!

        let rows = try JSONDecoder().decode([GoalSemanticMatchRow].self, from: json)
        let map = GoalMatchClient.group(rows: rows)
        XCTAssertEqual(map.count, 1)
        XCTAssertEqual(map[uuid("AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA")]?.taskIds.count, 1)
    }
}
