import CoreData
import XCTest
@testable import JustDoShared

final class CoreDataMapperTests: XCTestCase {
    private var stack: CoreDataStack!
    private var context: NSManagedObjectContext!

    override func setUp() {
        super.setUp()
        stack = CoreDataStack(inMemory: true)
        context = stack.container.viewContext
    }

    override func tearDown() {
        context = nil
        stack = nil
        super.tearDown()
    }

    func testCoreDataModelContainsPlannedEntities() {
        let entities = Set(CoreDataModelFactory.makeModel().entities.compactMap(\.name))

        XCTAssertEqual(
            entities,
            [
                "CDCategory",
                "CDTask",
                "CDHabit",
                "CDGoal",
                "CDGoalPromptDismissal",
                "CDHabitLog",
                "CDQueuedMutation",
                "CDUserPreference",
            ]
        )
    }

    func testCategoryRoundTrip() throws {
        let category = Category(
            id: uuid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            name: "취업",
            color: "#4F6FD8",
            isDefault: true,
            position: 0
        )

        let object = try CoreDataMappers.insertCategory(category, in: context)

        XCTAssertEqual(CoreDataMappers.category(from: object), category)
    }

    func testTaskRoundTrip() throws {
        let task = Task(
            id: uuid("11111111-1111-1111-1111-111111111111"),
            title: "삼성전자 지원",
            categoryID: uuid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            startDate: "2026-04-01",
            endDate: "2026-04-30",
            priority: .high,
            isCompleted: false,
            scheduledTime: nil,
            tags: ["취업", "서류"]
        )

        let object = try CoreDataMappers.insertTask(task, in: context)

        XCTAssertEqual(try CoreDataMappers.task(from: object), task)
    }

    func testHabitRoundTrip() throws {
        let habit = Habit(
            id: uuid("33333333-3333-3333-3333-333333333333"),
            title: "운동 30분",
            emoji: "🏃",
            startedAt: "2026-04-01",
            recurType: .weekly,
            recurDays: [1, 3, 5],
            reminderTime: "08:30",
            log: ["2026-04-29": 1]
        )

        let object = try CoreDataMappers.insertHabit(habit, in: context)

        XCTAssertEqual(try CoreDataMappers.habit(from: object), habit)
    }

    func testGoalRoundTrip() throws {
        let goal = Goal(
            id: uuid("44444444-4444-4444-4444-444444444444"),
            periodType: .monthly,
            periodKey: "2026-04",
            title: "면접 준비",
            note: "자료 정리",
            sortOrder: 1,
            locked: true,
            lockedAt: "2026-04-01T00:00:00Z",
            target: 3
        )

        let object = try CoreDataMappers.insertGoal(goal, in: context)

        XCTAssertEqual(try CoreDataMappers.goal(from: object), goal)
    }

    func testGoalPromptDismissalRoundTrip() throws {
        let dismissal = GoalPromptDismissal(
            id: uuid("55555555-5555-5555-5555-555555555555"),
            promptType: .monthly,
            periodKey: "2026-04",
            dismissedPermanentlyForPeriod: true,
            dismissedAt: "2026-04-02T00:00:00Z"
        )

        let object = try CoreDataMappers.insertGoalPromptDismissal(dismissal, in: context)

        XCTAssertEqual(try CoreDataMappers.goalPromptDismissal(from: object), dismissal)
    }

    func testQueuedMutationRoundTrip() throws {
        let queued = QueuedMutation(
            id: uuid("90000000-0000-0000-0000-000000000001"),
            updatedAt: "2026-04-30T00:00:00Z",
            mutation: .habitLogSet(
                habitID: uuid("33333333-3333-3333-3333-333333333333"),
                iso: "2026-04-30",
                value: 1
            )
        )

        let object = try CoreDataMappers.insertQueuedMutation(queued, in: context)

        XCTAssertEqual(object.value(forKey: "type") as? String, "habit_log_set")
        XCTAssertEqual(try CoreDataMappers.queuedMutation(from: object), queued)
    }

    private func uuid(_ raw: String) -> UUID {
        guard let value = UUID(uuidString: raw) else {
            fatalError("Invalid UUID fixture: \(raw)")
        }
        return value
    }
}
