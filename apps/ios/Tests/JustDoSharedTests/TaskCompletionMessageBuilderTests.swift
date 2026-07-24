import XCTest
@testable import JustDoShared

final class TaskCompletionMessageBuilderTests: XCTestCase {
    private var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Asia/Seoul")!
        return calendar
    }

    func testShowsNextTimedTask() {
        let message = TaskCompletionMessageBuilder.message(
            tasks: [
                task(id: 1, title: "완료", date: "2026-07-24", completed: true),
                task(id: 2, title: "업체 미팅", date: "2026-07-24", time: "14:00"),
                task(id: 3, title: "시간 없는 일", date: "2026-07-24"),
            ],
            now: date("2026-07-24 13:00"),
            calendar: calendar
        )

        XCTAssertEqual(message, "다음 일정은 오후 2시 ‘업체 미팅’입니다.")
    }

    func testShowsRemainingCountWithoutUpcomingTimedTask() {
        let message = TaskCompletionMessageBuilder.message(
            tasks: [
                task(id: 1, title: "완료", date: "2026-07-24", completed: true),
                task(id: 2, title: "시간 없는 일", date: "2026-07-24"),
                task(id: 3, title: "지난 일정", date: "2026-07-24", time: "10:00"),
            ],
            now: date("2026-07-24 13:00"),
            calendar: calendar
        )

        XCTAssertEqual(message, "오늘 남은 할 일은 2개입니다.")
    }

    func testAllDoneIncludesTomorrowFirstScheduleAndCount() {
        let message = TaskCompletionMessageBuilder.message(
            tasks: [
                task(id: 1, title: "완료", date: "2026-07-24", completed: true),
                task(id: 2, title: "팀 회의", date: "2026-07-25", time: "10:00"),
                task(id: 3, title: "보고서", date: "2026-07-25"),
                task(id: 4, title: "점심", date: "2026-07-25", time: "12:00"),
            ],
            now: date("2026-07-24 13:00"),
            calendar: calendar
        )

        XCTAssertEqual(
            message,
            "오늘 예정된 할 일을 모두 완료했습니다. 내일 첫 일정은 오전 10시 ‘팀 회의’이며, 할 일은 총 3개입니다."
        )
    }

    func testAllDoneHandlesTomorrowWithoutTasks() {
        let message = TaskCompletionMessageBuilder.message(
            tasks: [
                task(id: 1, title: "완료", date: "2026-07-24", completed: true),
            ],
            now: date("2026-07-24 13:00"),
            calendar: calendar
        )

        XCTAssertEqual(message, "오늘 예정된 할 일을 모두 완료했습니다. 내일 예정된 할 일은 없습니다.")
    }

    private func task(
        id: Int,
        title: String,
        date: String,
        completed: Bool = false,
        time: String? = nil
    ) -> Task {
        Task(
            id: UUID(uuidString: String(format: "00000000-0000-0000-0000-%012d", id))!,
            title: title,
            categoryID: nil,
            startDate: date,
            endDate: date,
            priority: nil,
            isCompleted: completed,
            scheduledTime: time,
            tags: []
        )
    }

    private func date(_ value: String) -> Date {
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.timeZone = calendar.timeZone
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        return formatter.date(from: value)!
    }
}
