import XCTest
@testable import JustDoShared

final class MonthTaskListSelectorTests: XCTestCase {
    func testGroupsMonthTasksByStartDateAndIncludesCarryOverOnce() {
        let carryOver = task(id: 1, title: "장기 프로젝트", startDate: "2026-07-29", endDate: "2026-08-03")
        let singleDay = task(id: 2, title: "월간 회의", startDate: "2026-08-05", endDate: "2026-08-05")
        let multiDay = task(id: 3, title: "출장", startDate: "2026-08-20", endDate: "2026-08-22")
        let outside = task(id: 4, title: "다음 달", startDate: "2026-09-01", endDate: "2026-09-01")

        let sections = MonthTaskListSelector.sections(
            tasks: [outside, multiDay, singleDay, carryOver],
            year: 2026,
            month: 8
        )

        XCTAssertEqual(sections.map(\.date), ["2026-08-01", "2026-08-05", "2026-08-20"])
        XCTAssertEqual(sections.flatMap(\.tasks).map(\.id), [carryOver.id, singleDay.id, multiDay.id])
    }

    func testSortsIncompleteTimedTasksBeforeUntimedAndCompletedTasks() {
        let completed = task(id: 1, title: "완료", completed: true, time: "08:00")
        let untimed = task(id: 2, title: "시간 없음")
        let afternoon = task(id: 3, title: "오후", time: "15:00")
        let morning = task(id: 4, title: "오전", time: "09:00")

        let sections = MonthTaskListSelector.sections(
            tasks: [completed, untimed, afternoon, morning],
            year: 2026,
            month: 8
        )

        XCTAssertEqual(sections.count, 1)
        XCTAssertEqual(sections[0].tasks.map(\.id), [morning.id, afternoon.id, untimed.id, completed.id])
    }

    func testRejectsInvalidMonth() {
        XCTAssertTrue(MonthTaskListSelector.sections(tasks: [], year: 2026, month: 13).isEmpty)
    }

    func testScrollTargetPrefersExactDateThenNearestUpcomingDate() {
        let dates = ["2026-08-02", "2026-08-05", "2026-08-09"]

        XCTAssertEqual(
            MonthTaskListSelector.scrollTargetDate(sectionDates: dates, preferredDate: "2026-08-05"),
            "2026-08-05"
        )
        XCTAssertEqual(
            MonthTaskListSelector.scrollTargetDate(sectionDates: dates, preferredDate: "2026-08-04"),
            "2026-08-05"
        )
    }

    func testScrollTargetFallsBackToLastSectionOrNil() {
        XCTAssertEqual(
            MonthTaskListSelector.scrollTargetDate(
                sectionDates: ["2026-08-02", "2026-08-05"],
                preferredDate: "2026-08-10"
            ),
            "2026-08-05"
        )
        XCTAssertNil(MonthTaskListSelector.scrollTargetDate(sectionDates: [], preferredDate: "2026-08-05"))
    }

    private func task(
        id: Int,
        title: String,
        startDate: String = "2026-08-05",
        endDate: String = "2026-08-05",
        completed: Bool = false,
        time: String? = nil
    ) -> Task {
        Task(
            id: UUID(uuidString: String(format: "00000000-0000-0000-0000-%012d", id))!,
            title: title,
            categoryID: nil,
            startDate: startDate,
            endDate: endDate,
            priority: nil,
            isCompleted: completed,
            scheduledTime: time,
            tags: []
        )
    }
}
