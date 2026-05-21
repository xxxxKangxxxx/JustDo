import Foundation
import JustDoShared

enum JustDoUITestSupport {
    static let taskID = UUID(uuidString: "11111111-1111-1111-1111-111111111111")!
    static let habitID = UUID(uuidString: "22222222-2222-2222-2222-222222222222")!

    static var isEnabled: Bool {
        #if DEBUG
        ProcessInfo.processInfo.arguments.contains("--justdo-ui-testing")
        #else
        false
        #endif
    }

    static var initialURL: URL? {
        #if DEBUG
        let arguments = ProcessInfo.processInfo.arguments
        guard
            let markerIndex = arguments.firstIndex(of: "--justdo-ui-testing-open-url"),
            arguments.indices.contains(markerIndex + 1)
        else {
            return nil
        }
        return URL(string: arguments[markerIndex + 1])
        #else
        nil
        #endif
    }

    @MainActor
    static func prepare(snapshotStore: CoreDataAppSnapshotStore) -> CoreDataAppSnapshotStore {
        #if DEBUG
        guard isEnabled else {
            return snapshotStore
        }
        do {
            try snapshotStore.replaceSnapshot(Self.snapshot())
        } catch {
            print("Failed to seed UI test snapshot: \(error)")
        }
        #endif
        return snapshotStore
    }

    private static func snapshot() -> AppSnapshot {
        let categoryID = UUID(uuidString: "33333333-3333-3333-3333-333333333333")!
        let selectedDate = "2026-05-21"
        return AppSnapshot(
            view: AppSnapshotDefaults.viewState(selectedDate: selectedDate),
            categories: [
                Category(
                    id: categoryID,
                    name: "UI Test",
                    color: "#5B8DEF",
                    isDefault: true,
                    position: 0
                ),
            ],
            tasks: [
                Task(
                    id: taskID,
                    title: "UI Test Task",
                    categoryID: categoryID,
                    startDate: selectedDate,
                    endDate: selectedDate,
                    priority: .medium,
                    isCompleted: false,
                    scheduledTime: "09:00",
                    tags: ["#ui"]
                ),
            ],
            habits: [
                Habit(
                    id: habitID,
                    title: "UI Test Habit",
                    emoji: "🌱",
                    startedAt: selectedDate,
                    recurType: .daily,
                    recurDays: nil,
                    reminderTime: "08:00",
                    log: [:]
                ),
            ],
            settings: AppSnapshotDefaults.settings()
        )
    }
}
