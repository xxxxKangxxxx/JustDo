import Foundation

public enum AppGroupWidgetDisplayModeStoreError: Error, Equatable {
    case appGroupDefaultsUnavailable(String)
}

public final class AppGroupWidgetDisplayModeStore {
    public static let defaultAppGroupIdentifier = AppGroupWidgetSnapshotStore.defaultAppGroupIdentifier
    public static let displayModeKey = "widget_display_mode"
    public static let taskColorKey = "widget_task_color"
    public static let habitColorKey = "widget_habit_color"
    public static let defaultTaskColor = "#4F6FD8"
    public static let defaultHabitColor = "#2F9B72"

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

    public func readColors() -> WidgetModeColors {
        WidgetModeColors(
            task: normalizedHex(userDefaults.string(forKey: Self.taskColorKey)) ?? Self.defaultTaskColor,
            habit: normalizedHex(userDefaults.string(forKey: Self.habitColorKey)) ?? Self.defaultHabitColor
        )
    }

    public func writeColors(_ colors: WidgetModeColors) {
        userDefaults.set(normalizedHex(colors.task) ?? Self.defaultTaskColor, forKey: Self.taskColorKey)
        userDefaults.set(normalizedHex(colors.habit) ?? Self.defaultHabitColor, forKey: Self.habitColorKey)
    }

    private func normalizedHex(_ value: String?) -> String? {
        guard var value = value?.trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty else {
            return nil
        }
        if value.hasPrefix("#") {
            value.removeFirst()
        }
        guard value.count == 6, Int(value, radix: 16) != nil else {
            return nil
        }
        return "#\(value.uppercased())"
    }
}

public struct WidgetModeColors: Equatable, Sendable {
    public var task: String
    public var habit: String

    public init(task: String, habit: String) {
        self.task = task
        self.habit = habit
    }
}
