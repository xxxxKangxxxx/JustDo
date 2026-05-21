//
//  JustDoWidget.swift
//  JustDoWidget
//
//  Created by 강영모 on 4/30/26.
//

import AppIntents
import WidgetKit
import SwiftUI
import JustDoShared

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> JustDoEntry {
        JustDoEntry.placeholder(for: context.family)
    }

    func getSnapshot(in context: Context, completion: @escaping (JustDoEntry) -> Void) {
        completion(loadEntry(for: context.family))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<JustDoEntry>) -> Void) {
        let entry = loadEntry(for: context.family)
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }

    private func loadEntry(for family: WidgetFamily) -> JustDoEntry {
        let size = JustDoWidgetSize(family: family)
        let snapshot = (try? AppGroupWidgetSnapshotStore().read()) ?? WidgetSnapshot.placeholder()
        let displayMode = (try? AppGroupWidgetDisplayModeStore().read()) ?? .task
        let model = JustDoWidgetDisplayModelFactory.make(
            from: snapshot,
            size: size,
            displayMode: displayMode
        )
        return JustDoEntry(date: Date(), model: model, size: size)
    }
}

struct JustDoEntry: TimelineEntry {
    let date: Date
    let model: JustDoWidgetDisplayModel
    let size: JustDoWidgetSize

    static func placeholder(for family: WidgetFamily) -> JustDoEntry {
        let size = JustDoWidgetSize(family: family)
        let model = JustDoWidgetDisplayModelFactory.make(
            from: WidgetSnapshot.placeholder(),
            size: size,
            displayMode: .task
        )
        return JustDoEntry(date: Date(), model: model, size: size)
    }
}

struct JustDoWidgetEntryView: View {
    let entry: Provider.Entry

    var body: some View {
        InteractiveJustDoWidgetView(model: entry.model, size: entry.size)
    }
}

struct JustDoWidget: Widget {
    let kind: String = "JustDoWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            JustDoWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Just Do")
        .description("오늘의 할 일과 습관을 빠르게 확인합니다.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

private extension JustDoWidgetSize {
    init(family: WidgetFamily) {
        switch family {
        case .systemMedium:
            self = .medium
        case .systemLarge:
            self = .large
        default:
            self = .small
        }
    }
}

private struct InteractiveJustDoWidgetView: View {
    let model: JustDoWidgetDisplayModel
    let size: JustDoWidgetSize

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            WidgetHeader(model: model)

            switch size {
            case .small:
                SmallInteractiveWidgetBody(model: model)
            case .medium:
                MediumInteractiveWidgetBody(model: model)
            case .large:
                LargeInteractiveWidgetBody(model: model)
            }
        }
        .padding(14)
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

private struct WidgetHeader: View {
    let model: JustDoWidgetDisplayModel

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text("JUST DO")
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(.secondary)
            Spacer()
            Text(shortDate(model.selectedDate))
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.secondary)
        }
    }
}

private struct SmallInteractiveWidgetBody: View {
    let model: JustDoWidgetDisplayModel

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            WidgetModeControl(model: model, style: .compact)
            Divider()
            InteractiveWidgetItemList(model: model)
            Spacer(minLength: 0)
        }
        .frame(maxHeight: .infinity, alignment: .top)
    }
}

private struct MediumInteractiveWidgetBody: View {
    let model: JustDoWidgetDisplayModel

    var body: some View {
        HStack(spacing: 14) {
            WeekStrip(days: model.weekDays)
                .frame(width: 122)
            Divider()
            VStack(alignment: .leading, spacing: 6) {
                WidgetModeControl(model: model)
                InteractiveWidgetItemList(model: model)
                Spacer(minLength: 0)
            }
            .frame(maxHeight: .infinity, alignment: .top)
        }
        .frame(maxHeight: .infinity, alignment: .top)
    }
}

private struct LargeInteractiveWidgetBody: View {
    let model: JustDoWidgetDisplayModel

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            MonthGrid(days: model.monthDays)
            Divider()
            WidgetModeControl(model: model)
            InteractiveWidgetItemList(model: model)
            Spacer(minLength: 0)
        }
        .frame(maxHeight: .infinity, alignment: .top)
    }
}

private struct WidgetModeControl: View {
    enum Style {
        case labeled
        case compact
    }

    let model: JustDoWidgetDisplayModel
    var style: Style = .labeled

    var body: some View {
        HStack(spacing: 6) {
            modeButton(.task, title: "Task", color: .accentColor)
            modeButton(.habit, title: "Habit", color: Color(hex: JustDoWidgetDisplayModelFactory.habitColor))
            Spacer(minLength: 4)
            Text("\(model.completedCount)/\(model.totalCount)")
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(.secondary)
        }
    }

    private func modeButton(_ mode: WidgetDisplayMode, title: String, color: Color) -> some View {
        Button(intent: SetWidgetDisplayModeIntent(mode: mode)) {
            if style == .compact {
                Circle()
                    .fill(model.displayMode == mode ? color : color.opacity(0.22))
                    .overlay(
                        Circle()
                            .stroke(color, lineWidth: model.displayMode == mode ? 0 : 1)
                    )
                    .frame(width: 14, height: 14)
                    .padding(4)
                    .contentShape(Circle())
            } else {
                Text(title)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(model.displayMode == mode ? .white : .secondary)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 4)
                    .background(model.displayMode == mode ? color : Color.primary.opacity(0.08))
                    .clipShape(Capsule())
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(title)
    }
}

private struct InteractiveWidgetItemList: View {
    let model: JustDoWidgetDisplayModel

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            ForEach(model.items) { item in
                HStack(spacing: 7) {
                    itemButton(item)
                    Link(destination: deepLink(for: item).url) {
                        VStack(alignment: .leading, spacing: 1) {
                            Text(item.title)
                                .font(.system(size: 11, weight: .medium))
                                .lineLimit(1)
                                .strikethrough(item.isDone)
                                .foregroundStyle(item.isDone ? .secondary : .primary)
                            if let subtitle = item.subtitle {
                                Text(subtitle)
                                    .font(.system(size: 9, weight: .medium))
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func deepLink(for item: JustDoWidgetItem) -> JustDoDeepLink {
        switch item.kind {
        case .task:
            .task(item.id)
        case .habit:
            .habit(item.id)
        }
    }

    @ViewBuilder
    private func itemButton(_ item: JustDoWidgetItem) -> some View {
        switch item.kind {
        case .task:
            Button(
                intent: ToggleTaskCompletionIntent(
                    taskID: item.id.uuidString,
                    isCompleted: !item.isDone
                )
            ) {
                CheckDot(item: item)
            }
            .buttonStyle(.plain)
        case .habit:
            Button(
                intent: SetHabitLogIntent(
                    habitID: item.id.uuidString,
                    iso: model.selectedDate,
                    value: item.isDone ? 0 : 1
                )
            ) {
                CheckDot(item: item)
            }
            .buttonStyle(.plain)
        }
    }
}

private struct CheckDot: View {
    let item: JustDoWidgetItem

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color(hex: item.colorHex), lineWidth: 1.4)
                .background(Circle().fill(item.isDone ? Color(hex: item.colorHex) : .clear))
            if item.isDone {
                Image(systemName: "checkmark")
                    .font(.system(size: 7, weight: .bold))
                    .foregroundStyle(.white)
            }
        }
        .frame(width: 12, height: 12)
    }
}

private struct WeekStrip: View {
    let days: [JustDoWidgetDay]

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 0) {
                ForEach(days) { day in
                    VStack(spacing: 3) {
                        Text(weekdayLabel(day.weekday))
                            .font(.system(size: 8, weight: .semibold))
                            .foregroundStyle(.secondary)
                        Text("\(day.day)")
                            .font(.system(size: 11, weight: day.isToday ? .bold : .medium))
                            .frame(width: 20, height: 20)
                            .foregroundStyle(day.isToday ? .white : .primary)
                            .background(day.isToday ? Color.accentColor : .clear)
                            .clipShape(Circle())
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            DotBars(days: days)
        }
    }
}

private struct MonthGrid: View {
    let days: [JustDoWidgetDay]
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 1), count: 7)

    var body: some View {
        LazyVGrid(columns: columns, spacing: 2) {
            ForEach(days) { day in
                VStack(spacing: 2) {
                    Text("\(day.day)")
                        .font(.system(size: 10, weight: day.isToday ? .bold : .medium))
                        .frame(width: 18, height: 18)
                        .foregroundStyle(day.isToday ? .white : .primary)
                        .background(day.isToday ? Color.accentColor : .clear)
                        .clipShape(Circle())
                    HStack(spacing: 1) {
                        ForEach(Array(day.dotColors.prefix(3).enumerated()), id: \.offset) { _, color in
                            Circle()
                                .fill(Color(hex: color))
                                .frame(width: 2, height: 2)
                        }
                    }
                    .frame(height: 2)
                }
            }
        }
    }
}

private struct DotBars: View {
    let days: [JustDoWidgetDay]

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            ForEach(days.filter { !$0.dotColors.isEmpty }) { day in
                HStack(spacing: 2) {
                    ForEach(Array(day.dotColors.enumerated()), id: \.offset) { _, color in
                        Capsule()
                            .fill(Color(hex: color))
                            .frame(width: 18, height: 4)
                    }
                }
            }
        }
    }
}

private func shortDate(_ iso: String) -> String {
    let parts = iso.split(separator: "-")
    guard parts.count == 3,
          let month = Int(parts[1]),
          let day = Int(parts[2])
    else {
        return "오늘"
    }
    return "\(month)월 \(day)일"
}

private func weekdayLabel(_ weekday: Int) -> String {
    ["일", "월", "화", "수", "목", "금", "토"][max(0, min(6, weekday))]
}

private extension Color {
    init(hex: String) {
        let trimmed = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var value: UInt64 = 0
        Scanner(string: trimmed).scanHexInt64(&value)
        let red = Double((value >> 16) & 0xFF) / 255
        let green = Double((value >> 8) & 0xFF) / 255
        let blue = Double(value & 0xFF) / 255
        self.init(red: red, green: green, blue: blue)
    }
}

private extension WidgetSnapshot {
    static func placeholder() -> WidgetSnapshot {
        let categoryID = UUID(uuidString: "AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA")!
        return WidgetSnapshot(
            generatedAt: "2026-04-30T00:00:00Z",
            selectedDate: "2026-04-30",
            categories: [
                Category(
                    id: categoryID,
                    name: "Work",
                    color: "#4F6FD8",
                    isDefault: true,
                    position: 0
                )
            ],
            tasks: [
                Task(
                    id: UUID(uuidString: "11111111-1111-1111-1111-111111111111")!,
                    title: "Proposal draft",
                    categoryID: categoryID,
                    startDate: "2026-04-30",
                    endDate: "2026-04-30",
                    priority: .high,
                    isCompleted: false,
                    scheduledTime: "09:30",
                    tags: ["focus"]
                ),
                Task(
                    id: UUID(uuidString: "22222222-2222-2222-2222-222222222222")!,
                    title: "Review calendar",
                    categoryID: nil,
                    startDate: "2026-04-30",
                    endDate: "2026-04-30",
                    priority: .medium,
                    isCompleted: true,
                    scheduledTime: nil,
                    tags: []
                )
            ],
            habits: [
                Habit(
                    id: UUID(uuidString: "33333333-3333-3333-3333-333333333333")!,
                    title: "Walk",
                    emoji: "•",
                    startedAt: "2026-04-01",
                    recurType: .daily,
                    recurDays: nil,
                    reminderTime: "08:30",
                    log: [:]
                )
            ]
        )
    }
}

#Preview(as: .systemSmall) {
    JustDoWidget()
} timeline: {
    JustDoEntry.placeholder(for: .systemSmall)
}

#Preview(as: .systemMedium) {
    JustDoWidget()
} timeline: {
    JustDoEntry.placeholder(for: .systemMedium)
}

#Preview(as: .systemLarge) {
    JustDoWidget()
} timeline: {
    JustDoEntry.placeholder(for: .systemLarge)
}
