import Foundation

/// A period-end report that is currently eligible to be surfaced to the user.
public struct GoalReportAvailability: Equatable, Sendable {
    public let periodType: GoalPeriodType
    public let periodKey: String

    public init(periodType: GoalPeriodType, periodKey: String) {
        self.periodType = periodType
        self.periodKey = periodKey
    }

    /// The prompt type used to persist a dismissal for this report banner.
    public var dismissalPromptType: GoalPromptType {
        periodType == .yearly ? .reportYearly : .reportMonthly
    }
}

/// Pure selectors that decide which period-end goal reports are available.
///
/// Reports are retrospective: a period's report only becomes available once the
/// period has ended.
/// - Monthly reports surface the immediately previous month throughout the
///   current month (e.g. all of June surfaces the May report).
/// - Yearly reports surface the immediately previous year, but only during
///   January, and take priority over the monthly report when both are present.
/// - A report is only included when at least one goal exists for that period,
///   since an empty period has nothing to look back on.
public enum GoalReportSelectors {
    /// Available reports, highest priority first (yearly before monthly).
    public static func availableReports(
        todayYear: Int,
        todayMonth: Int,
        goals: [Goal]
    ) -> [GoalReportAvailability] {
        var result: [GoalReportAvailability] = []

        if todayMonth == 1 {
            let previousYearKey = String(format: "%04d", todayYear - 1)
            if goals.contains(where: { $0.periodType == .yearly && $0.periodKey == previousYearKey }) {
                result.append(GoalReportAvailability(periodType: .yearly, periodKey: previousYearKey))
            }
        }

        let previousMonthYear = todayMonth == 1 ? todayYear - 1 : todayYear
        let previousMonth = todayMonth == 1 ? 12 : todayMonth - 1
        let previousMonthKey = String(format: "%04d-%02d", previousMonthYear, previousMonth)
        if goals.contains(where: { $0.periodType == .monthly && $0.periodKey == previousMonthKey }) {
            result.append(GoalReportAvailability(periodType: .monthly, periodKey: previousMonthKey))
        }

        return result
    }

    /// The highest-priority report to show in the dismissible Home banner, or
    /// `nil` when none is available or all available ones were dismissed.
    public static func homeBannerReport(
        todayYear: Int,
        todayMonth: Int,
        goals: [Goal],
        dismissals: [GoalPromptDismissal]
    ) -> GoalReportAvailability? {
        availableReports(todayYear: todayYear, todayMonth: todayMonth, goals: goals)
            .first { !isDismissed($0, dismissals: dismissals) }
    }

    public static func isDismissed(
        _ report: GoalReportAvailability,
        dismissals: [GoalPromptDismissal]
    ) -> Bool {
        dismissals.contains {
            $0.promptType == report.dismissalPromptType && $0.periodKey == report.periodKey
        }
    }
}
