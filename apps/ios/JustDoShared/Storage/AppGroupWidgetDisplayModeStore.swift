import Foundation

public enum AppGroupWidgetDisplayModeStoreError: Error, Equatable {
    case appGroupDefaultsUnavailable(String)
}

public final class AppGroupWidgetDisplayModeStore {
    public static let defaultAppGroupIdentifier = AppGroupWidgetSnapshotStore.defaultAppGroupIdentifier
    public static let displayModeKey = "widget_display_mode"

    private let userDefaults: UserDefaults

    public convenience init(appGroupIdentifier: String = defaultAppGroupIdentifier) throws {
        guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
            throw AppGroupWidgetDisplayModeStoreError.appGroupDefaultsUnavailable(
                appGroupIdentifier
            )
        }
        self.init(userDefaults: userDefaults)
    }

    public init(userDefaults: UserDefaults) {
        self.userDefaults = userDefaults
    }

    public func read() -> WidgetDisplayMode {
        guard
            let rawValue = userDefaults.string(forKey: Self.displayModeKey),
            let mode = WidgetDisplayMode(rawValue: rawValue)
        else {
            return .task
        }
        return mode
    }

    public func write(_ mode: WidgetDisplayMode) {
        userDefaults.set(mode.rawValue, forKey: Self.displayModeKey)
    }
}
