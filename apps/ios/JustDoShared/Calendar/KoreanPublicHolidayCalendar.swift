import Foundation

public struct KoreanPublicHoliday: Equatable, Sendable {
    public let date: String
    public let name: String
    public let isSubstitute: Bool

    public init(date: String, name: String, isSubstitute: Bool = false) {
        self.date = date
        self.name = name
        self.isSubstitute = isSubstitute
    }
}

/// Offline Korean public-holiday calculations for app and widget calendars.
///
/// Recurring holidays follow the current `관공서의 공휴일에 관한 규정` rules.
/// One-off election and temporary holidays are kept as explicit overrides so
/// newly announced dates can be added without changing the recurring rules.
public enum KoreanPublicHolidayCalendar {
    private enum SubstitutePolicy: Equatable {
        case none
        case saturdayOrSunday
        case sundayOnly
    }

    private struct BaseHoliday {
        let date: Date
        let name: String
        let substitutePolicy: SubstitutePolicy
    }

    private static let seoulTimeZone = TimeZone(identifier: "Asia/Seoul")!

    private static var gregorian: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.locale = Locale(identifier: "ko_KR")
        calendar.timeZone = seoulTimeZone
        return calendar
    }

    private static var lunar: Calendar {
        var calendar = Calendar(identifier: .chinese)
        calendar.locale = Locale(identifier: "ko_KR")
        calendar.timeZone = seoulTimeZone
        return calendar
    }

    private static let oneOffHolidays: [String: String] = [
        "2024-04-10": "제22대 국회의원 선거",
        "2024-10-01": "국군의 날 임시공휴일",
        "2025-01-27": "임시공휴일",
        "2025-06-03": "제21대 대통령 선거",
        "2026-06-03": "제9회 전국동시지방선거",
    ]

    public static func holiday(on iso: String) -> KoreanPublicHoliday? {
        guard let year = Int(iso.prefix(4)) else { return nil }
        return holidays(in: year)[iso]
    }

    public static func holidays(in year: Int) -> [String: KoreanPublicHoliday] {
        let bases = baseHolidays(in: year)
        var namesByDate: [String: [String]] = [:]
        for holiday in bases {
            namesByDate[format(holiday.date), default: []].append(holiday.name)
        }

        var substitutes: [String: String] = [:]
        for holiday in bases.sorted(by: { $0.date < $1.date }) {
            guard holiday.substitutePolicy != .none else { continue }
            let iso = format(holiday.date)
            let weekday = gregorian.component(.weekday, from: holiday.date)
            let overlapsAnotherHoliday = namesByDate[iso, default: []].count > 1
            let needsSubstitute: Bool
            switch holiday.substitutePolicy {
            case .none:
                needsSubstitute = false
            case .saturdayOrSunday:
                needsSubstitute = weekday == 1 || weekday == 7 || overlapsAnotherHoliday
            case .sundayOnly:
                needsSubstitute = weekday == 1 || overlapsAnotherHoliday
            }
            guard needsSubstitute else { continue }

            var candidate = gregorian.date(byAdding: .day, value: 1, to: holiday.date)!
            while true {
                let candidateISO = format(candidate)
                let candidateWeekday = gregorian.component(.weekday, from: candidate)
                let isWeekend = candidateWeekday == 1 || candidateWeekday == 7
                if !isWeekend,
                   namesByDate[candidateISO] == nil,
                   substitutes[candidateISO] == nil {
                    substitutes[candidateISO] = "대체공휴일 (\(holiday.name))"
                    break
                }
                candidate = gregorian.date(byAdding: .day, value: 1, to: candidate)!
            }
        }

        var result: [String: KoreanPublicHoliday] = [:]
        for (date, names) in namesByDate {
            result[date] = KoreanPublicHoliday(date: date, name: names.joined(separator: " · "))
        }
        for (date, name) in substitutes {
            result[date] = KoreanPublicHoliday(date: date, name: name, isSubstitute: true)
        }
        return result
    }

    private static func baseHolidays(in year: Int) -> [BaseHoliday] {
        var holidays: [BaseHoliday] = []

        func add(_ month: Int, _ day: Int, _ name: String, _ policy: SubstitutePolicy = .none) {
            guard let date = gregorian.date(from: DateComponents(year: year, month: month, day: day)) else {
                return
            }
            holidays.append(BaseHoliday(date: date, name: name, substitutePolicy: policy))
        }

        add(1, 1, "신정")
        add(3, 1, "삼일절", .saturdayOrSunday)
        if year >= 2026 {
            add(5, 1, "노동절", .saturdayOrSunday)
        }
        add(5, 5, "어린이날", .saturdayOrSunday)
        add(6, 6, "현충일")
        if year >= 2026 {
            add(7, 17, "제헌절", .saturdayOrSunday)
        }
        add(8, 15, "광복절", .saturdayOrSunday)
        add(10, 3, "개천절", .saturdayOrSunday)
        add(10, 9, "한글날", .saturdayOrSunday)
        add(12, 25, "기독탄신일", .saturdayOrSunday)

        if let lunarNewYear = lunarDate(inGregorianYear: year, month: 1, day: 1) {
            addLunarSequence(
                centeredOn: lunarNewYear,
                names: ["설날 전날", "설날", "설날 다음 날"],
                policy: .sundayOnly,
                to: &holidays
            )
        }
        if let buddhasBirthday = lunarDate(inGregorianYear: year, month: 4, day: 8) {
            holidays.append(
                BaseHoliday(
                    date: buddhasBirthday,
                    name: "부처님오신날",
                    substitutePolicy: .saturdayOrSunday
                )
            )
        }
        if let chuseok = lunarDate(inGregorianYear: year, month: 8, day: 15) {
            addLunarSequence(
                centeredOn: chuseok,
                names: ["추석 전날", "추석", "추석 다음 날"],
                policy: .sundayOnly,
                to: &holidays
            )
        }

        for (iso, name) in oneOffHolidays where iso.hasPrefix("\(year)-") {
            guard let date = parse(iso) else { continue }
            holidays.append(BaseHoliday(date: date, name: name, substitutePolicy: .none))
        }
        return holidays
    }

    private static func addLunarSequence(
        centeredOn date: Date,
        names: [String],
        policy: SubstitutePolicy,
        to holidays: inout [BaseHoliday]
    ) {
        for (offset, name) in zip(-1...1, names) {
            guard let date = gregorian.date(byAdding: .day, value: offset, to: date) else { continue }
            holidays.append(BaseHoliday(date: date, name: name, substitutePolicy: policy))
        }
    }

    private static func lunarDate(inGregorianYear year: Int, month: Int, day: Int) -> Date? {
        guard
            let start = gregorian.date(from: DateComponents(year: year, month: 1, day: 1)),
            let end = gregorian.date(from: DateComponents(year: year + 1, month: 1, day: 1))
        else {
            return nil
        }

        var date = start
        while date < end {
            let components = lunar.dateComponents([.month, .day, .isLeapMonth], from: date)
            if components.month == month,
               components.day == day,
               components.isLeapMonth != true {
                return date
            }
            date = gregorian.date(byAdding: .day, value: 1, to: date)!
        }
        return nil
    }

    private static func parse(_ iso: String) -> Date? {
        let parts = iso.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        return gregorian.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))
    }

    private static func format(_ date: Date) -> String {
        let components = gregorian.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", components.year!, components.month!, components.day!)
    }
}
