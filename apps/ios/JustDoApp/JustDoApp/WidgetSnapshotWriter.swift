//
//  WidgetSnapshotWriter.swift
//  JustDoApp
//
//  Created by Codex on 5/7/26.
//

import Foundation
import JustDoShared
import WidgetKit

struct WidgetSnapshotWriter {
    private let store: AppGroupWidgetSnapshotStore
    private let reloadTimelines: () -> Void

    init(
        store: AppGroupWidgetSnapshotStore,
        reloadTimelines: @escaping () -> Void = { WidgetCenter.shared.reloadAllTimelines() }
    ) {
        self.store = store
        self.reloadTimelines = reloadTimelines
    }

    init() throws {
        self.init(store: try AppGroupWidgetSnapshotStore())
    }

    func write(appSnapshot: AppSnapshot) throws {
        let snapshot = WidgetSnapshotFactory.make(from: appSnapshot)
        try store.write(snapshot)
        reloadTimelines()
    }
}

enum WidgetSnapshotBootstrap {
    static func seedIfNeeded(into store: CoreDataAppSnapshotStore) throws {
        if try !store.hasMirrorData() {
            try store.replaceSnapshot(makeAppSnapshot())
        }
    }

    private static func makeAppSnapshot(selectedDate: String = "2026-04-30") -> AppSnapshot {
        let focusCategoryID = UUID(uuidString: "AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA")!
        let adminCategoryID = UUID(uuidString: "BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB")!

        return AppSnapshot(
            view: ViewState(
                tab: .home,
                year: 2026,
                month: 4,
                selectedDate: selectedDate,
                dark: false
            ),
            categories: [
                Category(
                    id: focusCategoryID,
                    name: "Focus",
                    color: "#4F6FD8",
                    isDefault: true,
                    position: 0
                ),
                Category(
                    id: adminCategoryID,
                    name: "Admin",
                    color: "#D36A3A",
                    isDefault: true,
                    position: 1
                ),
            ],
            tasks: [
                Task(
                    id: UUID(uuidString: "11111111-1111-1111-1111-111111111111")!,
                    title: "Proposal draft",
                    categoryID: focusCategoryID,
                    startDate: selectedDate,
                    endDate: selectedDate,
                    priority: .high,
                    isCompleted: false,
                    scheduledTime: "09:30",
                    tags: ["focus"]
                ),
                Task(
                    id: UUID(uuidString: "22222222-2222-2222-2222-222222222222")!,
                    title: "Inbox cleanup",
                    categoryID: adminCategoryID,
                    startDate: selectedDate,
                    endDate: selectedDate,
                    priority: .medium,
                    isCompleted: true,
                    scheduledTime: nil,
                    tags: []
                ),
            ],
            habits: [
                Habit(
                    id: UUID(uuidString: "33333333-3333-3333-3333-333333333333")!,
                    title: "Walk",
                    emoji: "*",
                    startedAt: "2026-04-01",
                    recurType: .daily,
                    recurDays: nil,
                    reminderTime: "08:30",
                    log: [:]
                ),
            ],
            settings: AppSnapshotDefaults.settings()
        )
    }
}
