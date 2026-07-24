import Foundation

public enum TaskCompletionMessageBuilder {
    public static func message(
        tasks: [Task],
        now: Date = Date(),
        calendar sourceCalendar: Calendar = .current
    ) -> String {
        let calendar = sourceCalendar
        let today = isoDate(now, calendar: calendar)
        let tomorrowDate = calendar.date(byAdding: .day, value: 1, to: now) ?? now
        let tomorrow = isoDate(tomorrowDate, calendar: calendar)
        let currentMinutes = calendar.component(.hour, from: now) * 60
            + calendar.component(.minute, from: now)

        let remainingToday = tasks.filter {
            !$0.isCompleted && $0.startDate <= today && today <= $0.endDate
        }
        let nextTimedTask = remainingToday
            .compactMap { task -> (Task, Int)? in
                guard let minutes = timeMinutes(task.scheduledTime), minutes > currentMinutes else {
                    return nil
                }
                return (task, minutes)
            }
            .sorted {
                if $0.1 != $1.1 {
                    return $0.1 < $1.1
                }
                return $0.0.title.localizedStandardCompare($1.0.title) == .orderedAscending
            }
            .first

        if let (task, minutes) = nextTimedTask {
            return "다음 일정은 \(koreanTime(minutes)) ‘\(task.title)’입니다."
        }
        if !remainingToday.isEmpty {
            return "오늘 남은 할 일은 \(remainingToday.count)개입니다."
        }

        let tomorrowTasks = tasks.filter {
            !$0.isCompleted && $0.startDate <= tomorrow && tomorrow <= $0.endDate
        }
        guard !tomorrowTasks.isEmpty else {
            return "오늘 예정된 할 일을 모두 완료했습니다. 내일 예정된 할 일은 없습니다."
        }

        let firstTimedTomorrow = tomorrowTasks
            .compactMap { task -> (Task, Int)? in
                guard let minutes = timeMinutes(task.scheduledTime) else {
                    return nil
                }
                return (task, minutes)
            }
            .sorted {
                if $0.1 != $1.1 {
                    return $0.1 < $1.1
                }
                return $0.0.title.localizedStandardCompare($1.0.title) == .orderedAscending
            }
            .first

        if let (task, minutes) = firstTimedTomorrow {
            return "오늘 예정된 할 일을 모두 완료했습니다. 내일 첫 일정은 \(koreanTime(minutes)) ‘\(task.title)’이며, 할 일은 총 \(tomorrowTasks.count)개입니다."
        }
        return "오늘 예정된 할 일을 모두 완료했습니다. 내일 할 일은 총 \(tomorrowTasks.count)개입니다."
    }

    private static func timeMinutes(_ value: String?) -> Int? {
        guard let value else {
            return nil
        }
        let parts = value.split(separator: ":").compactMap { Int($0) }
        guard parts.count >= 2 else {
            return nil
        }
        return min(max(parts[0], 0), 23) * 60 + min(max(parts[1], 0), 59)
    }

    private static func koreanTime(_ minutes: Int) -> String {
        let hour = minutes / 60
        let minute = minutes % 60
        let period = hour < 12 ? "오전" : "오후"
        let displayHour = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour)
        return minute == 0
            ? "\(period) \(displayHour)시"
            : String(format: "%@ %d시 %02d분", period, displayHour, minute)
    }

    private static func isoDate(_ date: Date, calendar: Calendar) -> String {
        let components = calendar.dateComponents([.year, .month, .day], from: date)
        return String(
            format: "%04d-%02d-%02d",
            components.year ?? 0,
            components.month ?? 0,
            components.day ?? 0
        )
    }
}
