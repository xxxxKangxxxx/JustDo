import XCTest
@testable import JustDoShared

final class KoreanPublicHolidayCalendarTests: XCTestCase {
    func test2026RecurringAndLunarHolidays() {
        XCTAssertEqual(KoreanPublicHolidayCalendar.holiday(on: "2026-01-01")?.name, "신정")
        XCTAssertEqual(KoreanPublicHolidayCalendar.holiday(on: "2026-02-17")?.name, "설날")
        XCTAssertEqual(KoreanPublicHolidayCalendar.holiday(on: "2026-05-24")?.name, "부처님오신날")
        XCTAssertEqual(KoreanPublicHolidayCalendar.holiday(on: "2026-09-25")?.name, "추석")
    }

    func test2026SubstituteHolidays() {
        XCTAssertEqual(
            KoreanPublicHolidayCalendar.holiday(on: "2026-03-02"),
            KoreanPublicHoliday(date: "2026-03-02", name: "대체공휴일 (삼일절)", isSubstitute: true)
        )
        XCTAssertEqual(
            KoreanPublicHolidayCalendar.holiday(on: "2026-05-25"),
            KoreanPublicHoliday(date: "2026-05-25", name: "대체공휴일 (부처님오신날)", isSubstitute: true)
        )
        XCTAssertEqual(
            KoreanPublicHolidayCalendar.holiday(on: "2026-08-17"),
            KoreanPublicHoliday(date: "2026-08-17", name: "대체공휴일 (광복절)", isSubstitute: true)
        )
        XCTAssertEqual(
            KoreanPublicHolidayCalendar.holiday(on: "2026-10-05"),
            KoreanPublicHoliday(date: "2026-10-05", name: "대체공휴일 (개천절)", isSubstitute: true)
        )
    }

    func testCurrentLawAndElectionOverrides() {
        XCTAssertEqual(KoreanPublicHolidayCalendar.holiday(on: "2026-05-01")?.name, "노동절")
        XCTAssertEqual(KoreanPublicHolidayCalendar.holiday(on: "2026-06-03")?.name, "제9회 전국동시지방선거")
        XCTAssertEqual(KoreanPublicHolidayCalendar.holiday(on: "2026-07-17")?.name, "제헌절")
        XCTAssertNil(KoreanPublicHolidayCalendar.holiday(on: "2026-08-04"))
    }
}
