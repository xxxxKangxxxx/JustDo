import XCTest
@testable import JustDoShared

final class WidgetDisplayModelTests: XCTestCase {
    func testSmallModelLimitsItemsToThree() {
        let model = JustDoWidgetDisplayModelFactory.make(
            from: snapshot(),
            size: .small
        )

        XCTAssertEqual(model.items.count, 3)
        XCTAssertEqual(model.displayMode, .task)
        XCTAssertEqual(model.totalCount, 4)
        XCTAssertEqual(model.completedCount, 2)
        XCTAssertEqual(model.remainingCount, 2)
        XCTAssertEqual(model.items.map(\.title), ["삼성전자 지원", "팀 보고서 제출", "업체 미팅"])
    }

    func testMediumModelIncludesWeekDays() {
        let model = JustDoWidgetDisplayModelFactory.make(
            from: snapshot(),
            size: .medium
        )

        XCTAssertEqual(model.items.count, 3)
        XCTAssertEqual(model.weekDays.count, 7)
        XCTAssertEqual(model.weekDays.first?.iso, "2026-04-26")
        XCTAssertEqual(model.weekDays.last?.iso, "2026-05-02")
        XCTAssertEqual(model.weekDays.first(where: \.isToday)?.day, 30)
    }

    func testLargeModelIncludesMonthDays() {
        let model = JustDoWidgetDisplayModelFactory.make(
            from: snapshot(),
            size: .large
        )

        XCTAssertEqual(model.monthDays.count, 30)
        XCTAssertEqual(model.monthDays.first?.day, 1)
        XCTAssertEqual(model.monthDays.last?.day, 30)
        XCTAssertEqual(model.monthDays.last?.dotColors.isEmpty, false)
    }

    func testHabitModeShowsOnlyHabitsWithCompletedCount() {
        let model = JustDoWidgetDisplayModelFactory.make(
            from: snapshot(),
            size: .large,
            displayMode: .habit
        )

        XCTAssertEqual(model.displayMode, .habit)
        XCTAssertEqual(model.totalCount, 4)
        XCTAssertEqual(model.completedCount, 2)
        XCTAssertEqual(model.remainingCount, 2)
        XCTAssertEqual(model.items.map(\.title), ["🏃 운동 30분"])
        XCTAssertTrue(model.items.allSatisfy { $0.kind == .habit })
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
                Category(
                    id: uuid("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
                    name: "업무",
                    color: "#D36A3A",
                    isDefault: false,
                    position: 1
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
                    tags: ["취업"]
                ),
                Task(
                    id: uuid("22222222-2222-2222-2222-222222222222"),
                    title: "업체 미팅",
                    categoryID: uuid("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
                    startDate: "2026-04-30",
                    endDate: "2026-04-30",
                    priority: .medium,
                    isCompleted: true,
                    scheduledTime: "14:00",
                    tags: []
                ),
                Task(
                    id: uuid("33333333-3333-3333-3333-333333333333"),
                    title: "팀 보고서 제출",
                    categoryID: uuid("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
                    startDate: "2026-04-30",
                    endDate: "2026-04-30",
                    priority: .low,
                    isCompleted: false,
                    scheduledTime: nil,
                    tags: []
                ),
            ],
            habits: [
                Habit(
                    id: uuid("44444444-4444-4444-4444-444444444444"),
                    title: "운동 30분",
                    emoji: "🏃",
                    startedAt: "2026-04-01",
                    recurType: .daily,
                    recurDays: nil,
                    reminderTime: "08:30",
                    log: ["2026-04-30": 1]
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
