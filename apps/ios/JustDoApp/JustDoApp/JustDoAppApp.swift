//
//  JustDoAppApp.swift
//  JustDoApp
//
//  Created by 강영모 on 4/30/26.
//

import CoreData
import SwiftUI
import JustDoShared

@main
struct JustDoAppApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var syncStatus = AppSyncStatusStore()
    private let coreDataStack = CoreDataStack(inMemory: JustDoUITestSupport.isEnabled)

    var body: some Scene {
        WindowGroup {
            let snapshotStore = JustDoUITestSupport.prepare(
                snapshotStore: CoreDataAppSnapshotStore(
                    context: coreDataStack.container.viewContext
                )
            )
            ContentView(
                snapshotStore: snapshotStore,
                syncStatus: syncStatus
            ) {
                await refreshWidgetSnapshot()
            }
                .task {
                    if !JustDoUITestSupport.isEnabled {
                        await refreshWidgetSnapshot()
                    }
                }
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active && !JustDoUITestSupport.isEnabled {
                        refreshWidgetSnapshotFromSceneChange()
                    }
                }
        }
    }

    private func refreshWidgetSnapshotFromSceneChange() {
        _Concurrency.Task {
            await refreshWidgetSnapshot()
        }
    }

    @MainActor
    private func refreshWidgetSnapshot() async {
        do {
            let snapshotStore = CoreDataAppSnapshotStore(
                context: coreDataStack.container.viewContext
            )
            syncStatus.markSyncing()
            try await AppSyncCoordinator(
                snapshotStore: snapshotStore,
                widgetWriter: try WidgetSnapshotWriter()
            ).refreshWidgetSnapshot()
            syncStatus.refreshPendingCount(snapshotStore: snapshotStore)
        } catch {
            let snapshotStore = CoreDataAppSnapshotStore(
                context: coreDataStack.container.viewContext
            )
            syncStatus.markFailed(error, snapshotStore: snapshotStore)
            #if DEBUG
            print("Failed to refresh widget snapshot: \(error)")
            #endif
        }
    }
}
