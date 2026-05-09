import Foundation

public final class AppGroupMutationQueueDrainer {
    private let appGroupQueueStore: AppGroupMutationQueueStore
    private let snapshotStore: CoreDataAppSnapshotStore

    public init(
        appGroupQueueStore: AppGroupMutationQueueStore,
        snapshotStore: CoreDataAppSnapshotStore
    ) {
        self.appGroupQueueStore = appGroupQueueStore
        self.snapshotStore = snapshotStore
    }

    @discardableResult
    public func drain() throws -> [QueuedMutation] {
        let queuedMutations = try appGroupQueueStore.list()
        var drained: [QueuedMutation] = []

        for queued in queuedMutations {
            try snapshotStore.applyAndEnqueue(queued)
            try appGroupQueueStore.remove(id: queued.id)
            drained.append(queued)
        }

        return drained
    }
}
