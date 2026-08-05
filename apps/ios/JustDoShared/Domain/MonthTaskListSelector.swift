import Foundation

public struct MonthTaskListSection: Equatable, Sendable {
    public let date: String
    public let tasks: [Task]

    public init(date: String, tasks: [Task]) {
        self.date = date
        self.tasks = tasks
    }
}

public enum MonthTaskListSelector {
    public static func scrollTargetDate(
        sectionDates: [String],
        preferredDate: String
    ) -> String? {
        if sectionDates.contains(preferredDate) {
            return preferredDate
        }
        return sectionDates.first { $0 > preferredDate } ?? sectionDates.last
    }

    public static func sections(
        tasks: [Task],
        year: Int,
        month: Int
    ) -> [MonthTaskListSection] {
        guard (1...12).contains(month) else {
            return []
        }

        let monthStart = String(format: "%04d-%02d-01", year, month)
        let monthEnd = String(
            format: "%04d-%02d-%02d",
            year,
            month,
            daysInMonth(year: year, month: month)
        )
        var tasksByDate: [String: [Task]] = [:]

        for task in tasks where task.endDate >= monthStart && task.startDate <= monthEnd {
            let sectionDate = max(task.startDate, monthStart)
            tasksByDate[sectionDate, default: []].append(task)
        }

        return tasksByDate.keys.sorted().map { date in
            MonthTaskListSection(
                date: date,
                tasks: tasksByDate[date, default: []].sorted(by: taskOrder)
            )
        }
    }

    private static func taskOrder(_ lhs: Task, _ rhs: Task) -> Bool {
        if lhs.isCompleted != rhs.isCompleted {
            return !lhs.isCompleted
        }
        let lhsTime = lhs.scheduledTime ?? "99:99"
        let rhsTime = rhs.scheduledTime ?? "99:99"
        if lhsTime != rhsTime {
            return lhsTime < rhsTime
        }
        if lhs.endDate != rhs.endDate {
            return lhs.endDate < rhs.endDate
        }
        return lhs.title.localizedStandardCompare(rhs.title) == .orderedAscending
    }

    private static func daysInMonth(year: Int, month: Int) -> Int {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Asia/Seoul")!
        guard
            let date = calendar.date(from: DateComponents(year: year, month: month, day: 1)),
            let range = calendar.range(of: .day, in: .month, for: date)
        else {
            return 31
        }
        return range.count
    }
}
