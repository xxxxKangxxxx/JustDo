import Combine
import UIKit
import UserNotifications

enum NotificationPermissionState: Equatable {
    case notDetermined
    case allowed
    case denied

    var settingsLabel: String {
        switch self {
        case .notDetermined:
            "권한 필요"
        case .allowed:
            "허용됨"
        case .denied:
            "차단됨"
        }
    }
}

@MainActor
final class NotificationPermissionController: NSObject, ObservableObject, UNUserNotificationCenterDelegate {
    @Published private(set) var state: NotificationPermissionState = .notDetermined
    @Published private(set) var requestedHomeDate: String?

    private let center: UNUserNotificationCenter

    init(center: UNUserNotificationCenter = .current()) {
        self.center = center
        super.init()
        center.delegate = self
    }

    func refresh() async {
        let settings = await center.notificationSettings()
        state = Self.state(for: settings.authorizationStatus)
    }

    @discardableResult
    func requestAuthorization() async -> Bool {
        do {
            let granted = try await center.requestAuthorization(options: [.alert, .badge, .sound])
            await refresh()
            return granted
        } catch {
            await refresh()
            return false
        }
    }

    func openSystemSettings() {
        guard let url = URL(string: UIApplication.openSettingsURLString) else {
            return
        }
        UIApplication.shared.open(url)
    }

    func consumeRequestedHomeDate() {
        requestedHomeDate = nil
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        let message = notification.request.content.body
        await MainActor.run {
            InAppBannerPresenter.shared.show(message)
        }
        return []
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let targetDate = response.notification.request.content.userInfo[
            LocalNotificationScheduler.targetDateUserInfoKey
        ] as? String
        await MainActor.run {
            requestedHomeDate = targetDate
        }
    }

    private static func state(for status: UNAuthorizationStatus) -> NotificationPermissionState {
        switch status {
        case .authorized, .provisional, .ephemeral:
            .allowed
        case .denied:
            .denied
        case .notDetermined:
            .notDetermined
        @unknown default:
            .notDetermined
        }
    }
}
