import Foundation

public enum WidgetMutationControllerError: Error, Equatable {
    case missingWidgetSnapshot
    case taskNotFound(UUID)
    case habitNotFound(UUID)
}

public final class WidgetMutationController {
    private let snapshotStore: AppGroupWidgetSnapshotStore
    private let queueStore: AppGroupMutationQueueStore
    private let now: () -> Date

    public init(
        snapshotStore: AppGroupWidgetSnapshotStore,
        queueStore: AppGroupMutationQueueStore,
        now: @escaping () -> Date = Date.init
    ) {
        self.snapshotStore = snapshotStore
        self.queueStore = queueStore
        self.now = now
    }

    public convenience init() throws {
        try self.init(
            snapshotStore: AppGroupWidgetSnapshotStore(),
            queueStore: AppGroupMutationQueueStore()
        )
    }

    public func setTaskCompletion(taskID: UUID, isCompleted: Bool) throws {
        var snapshot = try loadSnapshot()
        guard let index = snapshot.tasks.firstIndex(where: { $0.id == taskID }) else {
            throw WidgetMutationControllerError.taskNotFound(taskID)
        }

        snapshot.tasks[index].isCompleted = isCompleted
        snapshot.generatedAt = timestamp()
        let completedAt = isCompleted ? snapshot.generatedAt : nil

        try snapshotStore.write(snapshot)
        try queueStore.append(
            QueuedMutation(
                id: UUID(),
                updatedAt: snapshot.generatedAt,
                mutation: .taskCompletionSet(
                    id: taskID,
                    isCompleted: isCompleted,
                    completedAt: completedAt
                )
            )
        )
    }

    public func setHabitLog(habitID: UUID, iso: String, value: Int) throws {
        var snapshot = try loadSnapshot()
        guard let index = snapshot.habits.firstIndex(where: { $0.id == habitID }) else {
            throw WidgetMutationControllerError.habitNotFound(habitID)
        }

        snapshot.habits[index].log[iso] = value
        snapshot.generatedAt = timestamp()

        try snapshotStore.write(snapshot)
        try queueStore.append(
            QueuedMutation(
                id: UUID(),
                updatedAt: snapshot.generatedAt,
                mutation: .habitLogSet(habitID: habitID, iso: iso, value: value)
            )
        )
    }

    private func loadSnapshot() throws -> WidgetSnapshot {
        guard let snapshot = try snapshotStore.read() else {
            throw WidgetMutationControllerError.missingWidgetSnapshot
        }
        return snapshot
    }

    private func timestamp() -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: now())
    }
}
