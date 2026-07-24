import Foundation
import JustDoShared
import UserNotifications

@MainActor
final class LocalNotificationScheduler {
    nonisolated static let managedIdentifierPrefix = "justdo."
    nonisolated static let targetDateUserInfoKey = "targetDate"
    nonisolated static let kindUserInfoKey = "kind"

    private let center: UNUserNotificationCenter
    private let calendar: Calendar
    private let maximumPendingCount: Int

    init(
        center: UNUserNotificationCenter = .current(),
        calendar: Calendar = .current,
        maximumPendingCount: Int = 60
    ) {
        self.center = center
        self.calendar = calendar
        self.maximumPendingCount = maximumPendingCount
    }

    func reschedule(snapshot: AppSnapshot, now: Date = Date()) async throws {
        let existing = await center.pendingNotificationRequests()
        let managedIDs = existing
            .map(\.identifier)
            .filter { $0.hasPrefix(Self.managedIdentifierPrefix) }
        if !managedIDs.isEmpty {
            center.removePendingNotificationRequests(withIdentifiers: managedIDs)
        }

        let plans = NotificationPlanner.plan(
            snapshot: snapshot,
            now: now,
            horizonDays: 14,
            calendar: calendar
        )
        for plan in plans.prefix(maximumPendingCount) {
            try await center.add(request(for: plan))
        }
    }

    func removeAllManagedNotifications() async {
        let existing = await center.pendingNotificationRequests()
        let managedIDs = existing
            .map(\.identifier)
            .filter { $0.hasPrefix(Self.managedIdentifierPrefix) }
        center.removePendingNotificationRequests(withIdentifiers: managedIDs)
        center.removeDeliveredNotifications(withIdentifiers: managedIDs)
    }

    private func request(for plan: PlannedNotification) -> UNNotificationRequest {
        let content = UNMutableNotificationContent()
        content.title = plan.title
        content.body = plan.body
        content.sound = .default
        content.threadIdentifier = plan.kind == .habit ? "justdo.habit" : "justdo.task"
        content.userInfo = [
            Self.targetDateUserInfoKey: plan.targetDate,
            Self.kindUserInfoKey: plan.kind.rawValue,
        ]

        var components = calendar.dateComponents(
            [.calendar, .timeZone, .year, .month, .day, .hour, .minute],
            from: plan.fireDate
        )
        components.second = 0
        return UNNotificationRequest(
            identifier: plan.id,
            content: content,
            trigger: UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        )
    }
}
