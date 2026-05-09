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
            tasks: appSnapshot.tasks.filter { task in
                task.startDate <= selectedDate && selectedDate <= task.endDate
            },
            habits: appSnapshot.habits.filter { habit in
                habitActiveOn(habit, iso: selectedDate)
            }
        )
    }

    private static func habitActiveOn(_ habit: Habit, iso: String) -> Bool {
        switch habit.recurType {
        case .daily:
            return true
        case .weekly:
            guard let weekday = weekdayIndex(for: iso) else {
                return false
            }
            return habit.recurDays?.contains(weekday) ?? false
        }
    }

    private static func weekdayIndex(for iso: String) -> Int? {
        let parts = iso.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else {
            return nil
        }
        var components = DateComponents()
        components.calendar = calendar
        components.timeZone = TimeZone(secondsFromGMT: 0)
        components.year = parts[0]
        components.month = parts[1]
        components.day = parts[2]
        guard let date = calendar.date(from: components) else {
            return nil
        }
        return calendar.component(.weekday, from: date) - 1
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
