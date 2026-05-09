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
    private let coreDataStack = CoreDataStack()

    var body: some Scene {
        WindowGroup {
            ContentView(
                snapshotStore: CoreDataAppSnapshotStore(
                    context: coreDataStack.container.viewContext
                )
            ) {
                await refreshWidgetSnapshot()
            }
                .task {
                    await refreshWidgetSnapshot()
                }
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active {
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

    private func refreshWidgetSnapshot() async {
        do {
            let snapshotStore = CoreDataAppSnapshotStore(
                context: coreDataStack.container.viewContext
            )
            try await AppSyncCoordinator(
                snapshotStore: snapshotStore,
                widgetWriter: try WidgetSnapshotWriter()
            ).refreshWidgetSnapshot(selectedDate: "2026-04-30")
        } catch {
            #if DEBUG
            print("Failed to refresh widget snapshot: \(error)")
            #endif
        }
    }
}
