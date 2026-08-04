import XCTest
@testable import JustDoShared

final class NotificationPlannerTests: XCTestCase {
    private var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Asia/Seoul")!
        return calendar
    }

    func testMorningBriefingIncludesTimedAndUntimedIncompleteTasks() {
        let snapshot = makeSnapshot(
            tasks: [
                task(title: "팀 회의", time: "14:00"),
                task(id: 2, title: "보고서 제출", time: nil),
                task(id: 3, title: "완료한 일", completed: true, time: nil),
            ]
        )

        let plans = plan(snapshot, now: "2026-07-24 08:00")

        let briefing = plans.first { $0.kind == .taskBriefing }
        XCTAssertEqual(briefing?.title, "일정 브리핑")
        XCTAssertEqual(briefing?.body, "오늘 할 일 2개 · ‘팀 회의’ 외 1개")
    }

    func testBriefingAndTaskReminderAtSameMinuteAreMerged() {
        var snapshot = makeSnapshot(
            tasks: [
                task(title: "팀 회의", time: "09:10"),
            ]
        )
        snapshot.settings.defaultTaskReminderMinutes = 10

        let plans = plan(snapshot, now: "2026-07-24 08:00")

        XCTAssertEqual(plans.count, 1)
        XCTAssertEqual(plans[0].kind, .taskBriefing)
        XCTAssertEqual(plans[0].title, "일정 브리핑")
        XCTAssertEqual(plans[0].body, "오늘 할 일 1개 · 다음 일정 09:10 ‘팀 회의’")
    }

    func testMergedBriefingSummarizesOnlyTasksWithoutSameMinuteScheduleReminder() {
        var snapshot = makeSnapshot(
            tasks: [
                task(title: "팀 회의", time: "09:10"),
                task(id: 2, title: "보고서 제출", time: nil),
            ]
        )
        snapshot.settings.defaultTaskReminderMinutes = 10

        let plans = plan(snapshot, now: "2026-07-24 08:00")

        XCTAssertEqual(plans.count, 1)
        XCTAssertEqual(plans[0].body, "오늘 할 일 2개 · ‘보고서 제출’ · 다음 일정 09:10 ‘팀 회의’")
    }

    func testPassedLeadTimeFallsBackToExactTaskTime() {
        let snapshot = makeSnapshot(
            tasks: [
                task(title: "업체 미팅", time: "09:05"),
            ],
            briefing: false
        )

        let plans = plan(snapshot, now: "2026-07-24 09:00")

        XCTAssertEqual(plans.count, 1)
        XCTAssertEqual(plans[0].kind, .taskSchedule)
        XCTAssertEqual(plans[0].title, "09:05")
        XCTAssertEqual(plans[0].body, "‘업체 미팅’ 일정이 있어요.")
        XCTAssertEqual(plans[0].fireDate, date("2026-07-24 09:05"))
    }

    func testUntimedDefaultTaskDoesNotCreateScheduleReminder() {
        let snapshot = makeSnapshot(
            tasks: [
                task(title: "보고서 제출", time: nil),
            ],
            briefing: false
        )

        XCTAssertTrue(plan(snapshot, now: "2026-07-24 08:00").isEmpty)
    }

    func testUntimedCustomDayReminderUsesBriefingTime() {
        let snapshot = makeSnapshot(
            tasks: [
                task(
                    title: "보고서 제출",
                    startDate: "2026-07-26",
                    time: nil,
                    mode: .custom,
                    offsets: [2_880]
                ),
            ],
            briefing: false
        )

        let plans = plan(snapshot, now: "2026-07-24 08:00")

        XCTAssertEqual(plans.count, 1)
        XCTAssertEqual(plans[0].fireDate, date("2026-07-24 09:00"))
    }

    func testHabitsAtSameMinuteAreMergedAndCompletedHabitIsExcluded() {
        let snapshot = makeSnapshot(
            habits: [
                habit(title: "운동 30분", days: [5]),
                habit(id: 2, title: "물 마시기", days: [5]),
                habit(id: 3, title: "독서", days: [5], completed: true),
                habit(id: 4, title: "토요일 습관", days: [6]),
            ]
        )

        let plans = plan(snapshot, now: "2026-07-24 08:00")

        XCTAssertEqual(plans.count, 1)
        XCTAssertEqual(plans[0].kind, .habit)
        XCTAssertEqual(plans[0].body, "‘물 마시기’, ‘운동 30분’을 할 시간입니다.")
        XCTAssertEqual(plans[0].habitIDs.count, 2)
    }

    func testIndependentTogglesOnlyReturnEnabledNotificationKinds() {
        var snapshot = makeSnapshot(
            tasks: [task(title: "팀 회의", time: "10:00")],
            habits: [habit(title: "운동", days: [5])]
        )
        snapshot.settings.taskBriefingNotify = false
        snapshot.settings.taskScheduleNotify = false

        let plans = plan(snapshot, now: "2026-07-24 08:00")

        XCTAssertEqual(plans.map(\.kind), [.habit])
    }

    func testLegacySettingsDecodeUsesMasterToggleForIndependentToggles() throws {
        let data = Data(
            """
            {
              "notify": false,
              "notifyTime": "08:30",
              "weekStart": 1,
              "plan": "free"
            }
            """.utf8
        )

        let settings = try JSONDecoder().decode(Settings.self, from: data)

        XCTAssertFalse(settings.taskBriefingNotify)
        XCTAssertFalse(settings.taskScheduleNotify)
        XCTAssertFalse(settings.habitNotify)
        XCTAssertEqual(settings.defaultTaskReminderMinutes, 10)
    }

    private func plan(_ snapshot: AppSnapshot, now: String) -> [PlannedNotification] {
        NotificationPlanner.plan(
            snapshot: snapshot,
            now: date(now),
            horizonDays: 1,
            calendar: calendar
        )
    }

    private func makeSnapshot(
        tasks: [Task] = [],
        habits: [Habit] = [],
        briefing: Bool = true
    ) -> AppSnapshot {
        var settings = AppSnapshotDefaults.settings()
        settings.taskBriefingNotify = briefing
        return AppSnapshot(
            view: AppSnapshotDefaults.viewState(selectedDate: "2026-07-24"),
            categories: [],
            tasks: tasks,
            habits: habits,
            settings: settings
        )
    }

    private func task(
        id: Int = 1,
        title: String,
        startDate: String = "2026-07-24",
        completed: Bool = false,
        time: String?,
        mode: TaskReminderMode = .defaultValue,
        offsets: [Int] = []
    ) -> Task {
        Task(
            id: uuid(id),
            title: title,
            categoryID: nil,
            startDate: startDate,
            endDate: startDate,
            priority: nil,
            isCompleted: completed,
            scheduledTime: time,
            tags: [],
            reminderMode: mode,
            reminderOffsetsMinutes: offsets
        )
    }

    private func habit(
        id: Int = 1,
        title: String,
        days: [Int],
        completed: Bool = false
    ) -> Habit {
        Habit(
            id: uuid(id + 100),
            title: title,
            emoji: "ignored",
            startedAt: "2026-07-01",
            recurType: .weekly,
            recurDays: days,
            reminderTime: "09:00",
            log: completed ? ["2026-07-24": 1] : [:]
        )
    }

    private func date(_ value: String) -> Date {
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.timeZone = calendar.timeZone
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        return formatter.date(from: value)!
    }

    private func uuid(_ value: Int) -> UUID {
        UUID(uuidString: String(format: "00000000-0000-0000-0000-%012d", value))!
    }
}
