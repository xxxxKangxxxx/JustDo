import XCTest
@testable import JustDoShared

final class WidgetDisplayModelTests: XCTestCase {
    func testSmallModelShowsTaskCounts() {
        let model = JustDoWidgetDisplayModelFactory.make(
            from: snapshot(),
            size: .small
        )

        XCTAssertEqual(model.items.count, 3)
        XCTAssertEqual(model.displayMode, .task)
        XCTAssertEqual(model.totalCount, 3)
        XCTAssertEqual(model.completedCount, 1)
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

    func testMediumModelLimitsItemsToFourAndKeepsTotalCount() {
        let model = JustDoWidgetDisplayModelFactory.make(
            from: busySnapshot(selectedDate: "2026-08-10"),
            size: .medium
        )

        XCTAssertEqual(model.items.count, 4)
        XCTAssertEqual(model.totalCount, 10)
    }

    func testLargeModelIncludesMonthDays() {
        let model = JustDoWidgetDisplayModelFactory.make(
            from: snapshot(),
            size: .large
        )

        XCTAssertEqual(model.monthDays.count, 35)
        XCTAssertEqual(model.monthDays.first?.iso, "2026-03-29")
        XCTAssertEqual(model.monthDays.first?.isCurrentMonth, false)
        XCTAssertEqual(model.monthDays.last?.iso, "2026-05-02")
        XCTAssertEqual(model.monthDays.last?.isCurrentMonth, false)
        XCTAssertTrue(model.monthDays.first?.dotColors.isEmpty == true)
        XCTAssertEqual(model.monthDays.first(where: { $0.iso == "2026-04-30" })?.dotColors.count, 1)
    }

    func testLargeMonthGridRespectsMondayWeekStart() {
        var fixture = snapshot()
        fixture.weekStart = 1

        let model = JustDoWidgetDisplayModelFactory.make(from: fixture, size: .large)

        XCTAssertEqual(model.monthDays.first?.iso, "2026-03-30")
        XCTAssertEqual(model.monthDays.last?.iso, "2026-05-03")
        XCTAssertEqual(model.monthDays.first?.weekday, 1)
    }

    func testLargeListLimitChangesWithMonthRowCount() {
        let fourRows = JustDoWidgetDisplayModelFactory.make(
            from: busySnapshot(selectedDate: "2026-02-10"),
            size: .large
        )
        let fiveRows = JustDoWidgetDisplayModelFactory.make(
            from: busySnapshot(selectedDate: "2026-04-10"),
            size: .large
        )
        let sixRows = JustDoWidgetDisplayModelFactory.make(
            from: busySnapshot(selectedDate: "2026-08-10"),
            size: .large
        )

        XCTAssertEqual(fourRows.monthDays.count / 7, 4)
        XCTAssertEqual(fourRows.items.count, 7)
        XCTAssertEqual(fiveRows.monthDays.count / 7, 5)
        XCTAssertEqual(fiveRows.items.count, 6)
        XCTAssertEqual(sixRows.monthDays.count / 7, 6)
        XCTAssertEqual(sixRows.items.count, 5)
        XCTAssertEqual(sixRows.totalCount, 10)
    }

    func testWidgetCalendarMarksCurrentMonthPublicHolidays() {
        let model = JustDoWidgetDisplayModelFactory.make(
            from: busySnapshot(selectedDate: "2026-08-10"),
            size: .large
        )

        XCTAssertEqual(
            model.monthDays.first(where: { $0.iso == "2026-08-15" })?.holidayName,
            "광복절"
        )
        XCTAssertEqual(
            model.monthDays.first(where: { $0.iso == "2026-08-17" })?.holidayName,
            "대체공휴일 (광복절)"
        )
        XCTAssertNil(model.monthDays.first(where: { $0.iso == "2026-09-01" })?.holidayName)
    }

    func testCompletedOnlyDateStillHasOneUnifiedDot() {
        var fixture = snapshot()
        fixture.tasks = [
            Task(
                id: uuid("99999999-9999-9999-9999-999999999999"),
                title: "완료된 일정",
                categoryID: nil,
                startDate: "2026-04-15",
                endDate: "2026-04-15",
                priority: nil,
                isCompleted: true,
                scheduledTime: nil,
                tags: []
            ),
        ]
        fixture.habits = []

        let model = JustDoWidgetDisplayModelFactory.make(from: fixture, size: .large)

        XCTAssertEqual(
            model.monthDays.first(where: { $0.iso == "2026-04-15" })?.dotColors,
            [model.taskModeColorHex]
        )
    }

    func testHabitModeShowsOnlyHabitsWithCompletedCount() {
        let model = JustDoWidgetDisplayModelFactory.make(
            from: snapshot(),
            size: .large,
            displayMode: .habit
        )

        XCTAssertEqual(model.displayMode, .habit)
        XCTAssertEqual(model.totalCount, 1)
        XCTAssertEqual(model.completedCount, 1)
        XCTAssertEqual(model.remainingCount, 0)
        XCTAssertEqual(model.items.map(\.title), ["🏃 운동 30분"])
        XCTAssertTrue(model.items.allSatisfy { $0.kind == .habit })
    }

    func testModelFiltersBySelectedDateAndNormalizesTaskTime() {
        var fixture = snapshot()
        fixture.selectedDate = "2026-05-01"
        fixture.tasks.append(
            Task(
                id: uuid("55555555-5555-5555-5555-555555555555"),
                title: "다음 날 작업",
                categoryID: uuid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                startDate: "2026-05-01",
                endDate: "2026-05-01",
                priority: .medium,
                isCompleted: false,
                scheduledTime: "09:15:30",
                tags: []
            )
        )

        let model = JustDoWidgetDisplayModelFactory.make(from: fixture, size: .small)

        XCTAssertEqual(model.items.map(\.title), ["다음 날 작업"])
        XCTAssertEqual(model.items.first?.subtitle, "09:15")
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

    private func busySnapshot(selectedDate: String) -> WidgetSnapshot {
        WidgetSnapshot(
            generatedAt: "2026-01-01T00:00:00Z",
            selectedDate: selectedDate,
            categories: [],
            tasks: (1...10).map { index in
                Task(
                    id: UUID(uuidString: String(format: "00000000-0000-0000-0000-%012d", index))!,
                    title: "할 일 \(index)",
                    categoryID: nil,
                    startDate: selectedDate,
                    endDate: selectedDate,
                    priority: nil,
                    isCompleted: index > 7,
                    scheduledTime: index <= 5 ? String(format: "%02d:00", 8 + index) : nil,
                    tags: []
                )
            },
            habits: []
        )
    }

    private func uuid(_ raw: String) -> UUID {
        guard let value = UUID(uuidString: raw) else {
            fatalError("Invalid UUID fixture: \(raw)")
        }
        return value
    }
}
