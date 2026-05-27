import XCTest
@testable import JustDoShared

final class WidgetSnapshotFactoryTests: XCTestCase {
    func testFactoryKeepsFullTaskAndHabitSetForDateRollover() {
        let categoryID = UUID(uuidString: "AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA")!
        let snapshot = WidgetSnapshotFactory.make(
            from: AppSnapshot(
                view: ViewState(
                    tab: .home,
                    year: 2026,
                    month: 4,
                    selectedDate: "2026-04-30",
                    dark: false
                ),
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
                        title: "Visible",
                        categoryID: categoryID,
                        startDate: "2026-04-29",
                        endDate: "2026-04-30",
                        priority: .high,
                        isCompleted: false,
                        scheduledTime: nil,
                        tags: []
                    ),
                    Task(
                        id: UUID(uuidString: "22222222-2222-2222-2222-222222222222")!,
                        title: "Hidden",
                        categoryID: categoryID,
                        startDate: "2026-05-01",
                        endDate: "2026-05-01",
                        priority: .low,
                        isCompleted: false,
                        scheduledTime: nil,
                        tags: []
                    ),
                ],
                habits: [
                    Habit(
                        id: UUID(uuidString: "33333333-3333-3333-3333-333333333333")!,
                        title: "Daily",
                        emoji: "*",
                        startedAt: "2026-04-01",
                        recurType: .daily,
                        recurDays: nil,
                        reminderTime: nil,
                        log: [:]
                    ),
                    Habit(
                        id: UUID(uuidString: "44444444-4444-4444-4444-444444444444")!,
                        title: "Inactive weekly",
                        emoji: "*",
                        startedAt: "2026-04-01",
                        recurType: .weekly,
                        recurDays: [1],
                        reminderTime: nil,
                        log: [:]
                    ),
                ],
                settings: Settings(
                    notify: true,
                    notifyTime: "09:00",
                    weekStart: 1,
                    plan: "free"
                )
            ),
            generatedAt: "2026-05-07T00:00:00Z"
        )

        XCTAssertEqual(snapshot.generatedAt, "2026-05-07T00:00:00Z")
        XCTAssertEqual(snapshot.selectedDate, "2026-04-30")
        XCTAssertEqual(snapshot.tasks.map(\.title), ["Visible", "Hidden"])
        XCTAssertEqual(snapshot.habits.map(\.title), ["Daily", "Inactive weekly"])
    }
}
