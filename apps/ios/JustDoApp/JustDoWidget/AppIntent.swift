//
//  AppIntent.swift
//  JustDoWidget
//
//  Created by 강영모 on 4/30/26.
//

import WidgetKit
import AppIntents
import Foundation
import JustDoShared

struct ToggleTaskCompletionIntent: AppIntent {
    static var title: LocalizedStringResource = "Toggle Task Completion"

    @Parameter(title: "Task ID")
    var taskID: String

    @Parameter(title: "Completed")
    var isCompleted: Bool

    init() {}

    init(taskID: String, isCompleted: Bool) {
        self.taskID = taskID
        self.isCompleted = isCompleted
    }

    func perform() async throws -> some IntentResult {
        guard let id = UUID(uuidString: taskID) else {
            return .result()
        }
        try WidgetMutationController().setTaskCompletion(
            taskID: id,
            isCompleted: isCompleted
        )
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

struct SetHabitLogIntent: AppIntent {
    static var title: LocalizedStringResource = "Set Habit Log"

    @Parameter(title: "Habit ID")
    var habitID: String

    @Parameter(title: "Date")
    var iso: String

    @Parameter(title: "Value")
    var value: Int

    init() {}

    init(habitID: String, iso: String, value: Int) {
        self.habitID = habitID
        self.iso = iso
        self.value = value
    }

    func perform() async throws -> some IntentResult {
        guard let id = UUID(uuidString: habitID) else {
            return .result()
        }
        try WidgetMutationController().setHabitLog(
            habitID: id,
            iso: iso,
            value: value
        )
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

struct SetWidgetDisplayModeIntent: AppIntent {
    static var title: LocalizedStringResource = "Set Widget Display Mode"

    @Parameter(title: "Mode")
    var mode: String

    init() {}

    init(mode: WidgetDisplayMode) {
        self.mode = mode.rawValue
    }

    func perform() async throws -> some IntentResult {
        let displayMode = WidgetDisplayMode(rawValue: mode) ?? .task
        try AppGroupWidgetDisplayModeStore().write(displayMode)
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}
