import XCTest
@testable import JustDoShared

final class GoalReportSelectorsTests: XCTestCase {
    private func goal(_ type: GoalPeriodType, _ periodKey: String) -> Goal {
        Goal(
            id: UUID(),
            periodType: type,
            periodKey: periodKey,
            title: "goal-\(periodKey)",
            note: nil,
            sortOrder: 0,
            locked: false,
            lockedAt: nil
        )
    }

    private func dismissal(_ promptType: GoalPromptType, _ periodKey: String) -> GoalPromptDismissal {
        GoalPromptDismissal(
            id: UUID(),
            promptType: promptType,
            periodKey: periodKey,
            dismissedPermanentlyForPeriod: true,
            dismissedAt: "2026-06-01T00:00:00Z"
        )
    }

    func testMonthlyReportSurfacesPreviousMonth() {
        let reports = GoalReportSelectors.availableReports(
            todayYear: 2026,
            todayMonth: 6,
            goals: [goal(.monthly, "2026-05")]
        )
        XCTAssertEqual(reports, [GoalReportAvailability(periodType: .monthly, periodKey: "2026-05")])
    }

    func testMonthlyReportRollsOverAcrossYearBoundary() {
        // In January the previous month is December of the prior year.
        let reports = GoalReportSelectors.availableReports(
            todayYear: 2026,
            todayMonth: 1,
            goals: [goal(.monthly, "2025-12")]
        )
        XCTAssertTrue(reports.contains(GoalReportAvailability(periodType: .monthly, periodKey: "2025-12")))
    }

    func testNoMonthlyReportWithoutGoalsForThatMonth() {
        let reports = GoalReportSelectors.availableReports(
            todayYear: 2026,
            todayMonth: 6,
            goals: [goal(.monthly, "2026-06")] // current month, not ended yet
        )
        XCTAssertTrue(reports.isEmpty)
    }

    func testYearlyReportOnlySurfacesInJanuary() {
        let june = GoalReportSelectors.availableReports(
            todayYear: 2026,
            todayMonth: 6,
            goals: [goal(.yearly, "2025")]
        )
        XCTAssertFalse(june.contains { $0.periodType == .yearly })

        let january = GoalReportSelectors.availableReports(
            todayYear: 2026,
            todayMonth: 1,
            goals: [goal(.yearly, "2025")]
        )
        XCTAssertTrue(january.contains(GoalReportAvailability(periodType: .yearly, periodKey: "2025")))
    }

    func testYearlyTakesPriorityOverMonthlyInJanuary() {
        let reports = GoalReportSelectors.availableReports(
            todayYear: 2026,
            todayMonth: 1,
            goals: [goal(.monthly, "2025-12"), goal(.yearly, "2025")]
        )
        XCTAssertEqual(reports.first, GoalReportAvailability(periodType: .yearly, periodKey: "2025"))
        XCTAssertEqual(reports.count, 2)
    }

    func testHomeBannerSkipsDismissedReport() {
        let goals = [goal(.monthly, "2025-12"), goal(.yearly, "2025")]
        // Yearly is top priority; dismissing it should fall through to monthly.
        let banner = GoalReportSelectors.homeBannerReport(
            todayYear: 2026,
            todayMonth: 1,
            goals: goals,
            dismissals: [dismissal(.reportYearly, "2025")]
        )
        XCTAssertEqual(banner, GoalReportAvailability(periodType: .monthly, periodKey: "2025-12"))
    }

    func testHomeBannerNilWhenAllDismissed() {
        let banner = GoalReportSelectors.homeBannerReport(
            todayYear: 2026,
            todayMonth: 6,
            goals: [goal(.monthly, "2026-05")],
            dismissals: [dismissal(.reportMonthly, "2026-05")]
        )
        XCTAssertNil(banner)
    }

    func testDismissalMatchingIsPeriodScoped() {
        let report = GoalReportAvailability(periodType: .monthly, periodKey: "2026-05")
        // A dismissal for a different month must not hide this report.
        XCTAssertFalse(GoalReportSelectors.isDismissed(report, dismissals: [dismissal(.reportMonthly, "2026-04")]))
        XCTAssertTrue(GoalReportSelectors.isDismissed(report, dismissals: [dismissal(.reportMonthly, "2026-05")]))
    }
}
