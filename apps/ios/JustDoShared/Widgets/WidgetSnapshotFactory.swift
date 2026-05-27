import Foundation

public enum WidgetSnapshotFactory {
    public static func make(
        from appSnapshot: AppSnapshot,
        generatedAt: String? = nil
    ) -> WidgetSnapshot {
        let selectedDate = appSnapshot.view.selectedDate
        return WidgetSnapshot(
            generatedAt: generatedAt ?? currentTimestamp(),
            selectedDate: selectedDate,
            categories: appSnapshot.categories.sorted { left, right in
                if left.position == right.position {
                    return left.name < right.name
                }
                return left.position < right.position
            },
            tasks: appSnapshot.tasks,
            habits: appSnapshot.habits
        )
    }

    private static func currentTimestamp() -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        return formatter.string(from: Date())
    }

    private static let calendar: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        return calendar
    }()

}
