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
        let displayMode: WidgetDisplayMode = family.isLockScreenAccessory ? .task : ((try? AppGroupWidgetDisplayModeStore().read()) ?? .task)
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

struct JustDoLockScreenWidgetEntryView: View {
    let entry: Provider.Entry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        LockScreenJustDoWidgetView(model: entry.model, family: family)
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

struct JustDoLockScreenWidget: Widget {
    let kind: String = "JustDoLockScreenWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            JustDoLockScreenWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Just Do")
        .description("잠금 화면에서 오늘의 할 일과 습관을 확인합니다.")
        .supportedFamilies([.accessoryInline, .accessoryCircular, .accessoryRectangular])
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

private extension WidgetFamily {
    var isLockScreenAccessory: Bool {
        switch self {
        case .accessoryInline, .accessoryCircular, .accessoryRectangular:
            return true
        default:
            return false
        }
    }
}

private struct InteractiveJustDoWidgetView: View {
    let model: JustDoWidgetDisplayModel
    let size: JustDoWidgetSize

    var body: some View {
        VStack(alignment: .leading, spacing: contentSpacing) {
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
        .padding(containerPadding)
        .containerBackground(.fill.tertiary, for: .widget)
    }

    private var containerPadding: CGFloat {
        switch size {
        case .small:
            return 5
        case .medium:
            return 6
        case .large:
            return 6
        }
    }

    private var contentSpacing: CGFloat {
        switch size {
        case .small:
            return 5
        case .medium:
            return 6
        case .large:
            return 7
        }
    }
}

private struct LockScreenJustDoWidgetView: View {
    let model: JustDoWidgetDisplayModel
    let family: WidgetFamily

    var body: some View {
        switch family {
        case .accessoryInline:
            Label(inlineText, systemImage: "checkmark.circle")
                .widgetAccentable()
                .containerBackground(.clear, for: .widget)
        case .accessoryCircular:
            Gauge(value: gaugeValue) {
                Image(systemName: "checkmark.circle")
            } currentValueLabel: {
                Text("\(model.remainingCount)")
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .monospacedDigit()
            }
            .gaugeStyle(.accessoryCircularCapacity)
            .widgetAccentable()
            .containerBackground(.clear, for: .widget)
        case .accessoryRectangular:
            LockScreenRectangularBody(model: model, rectangularText: rectangularText)
                .containerBackground(.clear, for: .widget)
        default:
            EmptyView()
        }
    }

    private var inlineText: String {
        "\(model.remainingCount)개 남음"
    }

    private var rectangularText: String {
        "\(model.completedCount)/\(model.totalCount)"
    }

    private var gaugeValue: Double {
        guard model.totalCount > 0 else {
            return 0
        }
        return Double(model.completedCount) / Double(model.totalCount)
    }
}

private struct LockScreenRectangularBody: View {
    let model: JustDoWidgetDisplayModel
    let rectangularText: String

    private var taskItems: [JustDoWidgetItem] {
        model.items.filter { $0.kind == .task }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline, spacing: 5) {
                Text("Task")
                    .font(.system(size: 11, weight: .bold))
                Text(rectangularText)
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                Spacer(minLength: 0)
            }

            if taskItems.isEmpty {
                Text("오늘 할 일 없음")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.secondary)
            } else {
                VStack(alignment: .leading, spacing: 3) {
                    ForEach(Array(taskItems.prefix(2))) { item in
                        HStack(spacing: 6) {
                            itemButton(item)
                            Text(item.title)
                                .font(.system(size: 11.5, weight: .semibold))
                                .lineLimit(1)
                                .strikethrough(item.isDone)
                                .foregroundStyle(item.isDone ? .secondary : .primary)
                        }
                    }
                }
            }
        }
        .frame(maxHeight: .infinity, alignment: .top)
        .widgetAccentable()
    }

    @ViewBuilder
    private func itemButton(_ item: JustDoWidgetItem) -> some View {
        Button(
            intent: ToggleTaskCompletionIntent(
                taskID: item.id.uuidString,
                isCompleted: !item.isDone
            )
        ) {
            LockScreenCheckDot(item: item)
        }
        .buttonStyle(.plain)
    }
}

private struct LockScreenCheckDot: View {
    let item: JustDoWidgetItem

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color(hex: item.colorHex), lineWidth: 1.6)
                .background(Circle().fill(item.isDone ? Color(hex: item.colorHex) : .clear))
            if item.isDone {
                Image(systemName: "checkmark")
                    .font(.system(size: 8, weight: .bold))
                    .foregroundStyle(.white)
            }
        }
        .frame(width: 14, height: 14)
    }
}

private struct WidgetHeader: View {
    let model: JustDoWidgetDisplayModel

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text("JUST DO")
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(.secondary)
            Spacer()
            Text(shortDate(model.selectedDate))
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.secondary)
        }
    }
}

private struct SmallInteractiveWidgetBody: View {
    let model: JustDoWidgetDisplayModel

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            WidgetModeControl(model: model, style: .compact)
            Divider()
            InteractiveWidgetItemList(model: model, size: .small)
            Spacer(minLength: 0)
        }
        .frame(maxHeight: .infinity, alignment: .top)
    }
}

private struct MediumInteractiveWidgetBody: View {
    let model: JustDoWidgetDisplayModel

    var body: some View {
        HStack(alignment: .top, spacing: 7) {
            WeekStrip(days: model.weekDays)
                .frame(width: 116)
            Divider()
            VStack(alignment: .leading, spacing: 4) {
                WidgetModeControl(model: model)
                InteractiveWidgetItemList(model: model, size: .medium)
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
        VStack(alignment: .leading, spacing: 6) {
            MonthGrid(days: model.monthDays)
            Divider()
            WidgetModeControl(model: model)
            InteractiveWidgetItemList(model: model, size: .large)
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
        HStack(spacing: style == .compact ? 5 : 6) {
            modeButton(.task, title: "Task", color: .accentColor)
            modeButton(.habit, title: "Habit", color: Color(hex: JustDoWidgetDisplayModelFactory.habitColor))
            Spacer(minLength: 4)
            Text("\(model.completedCount)/\(model.totalCount)")
                .font(.system(size: 12, weight: .bold, design: .rounded))
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
                    .padding(2)
                    .contentShape(Circle())
            } else {
                Text(title)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(model.displayMode == mode ? .white : .secondary)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
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
    let size: JustDoWidgetSize

    var body: some View {
        VStack(alignment: .leading, spacing: rowSpacing) {
            ForEach(model.items) { item in
                itemButton(item)
            }
        }
        .padding(.top, topPadding)
        .frame(maxHeight: .infinity, alignment: .top)
    }

    private var topPadding: CGFloat {
        switch size {
        case .small:
            return 2
        case .medium:
            return 5
        case .large:
            return 6
        }
    }

    private var rowSpacing: CGFloat {
        switch size {
        case .small:
            return 6
        case .medium:
            return 7
        case .large:
            return 8
        }
    }

    private var titleFontSize: CGFloat {
        size == .small ? 11.5 : 12
    }

    private var showsSubtitle: Bool {
        size != .small
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
                itemRow(item)
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
                itemRow(item)
            }
            .buttonStyle(.plain)
        }
    }

    private func itemRow(_ item: JustDoWidgetItem) -> some View {
        HStack(spacing: 6) {
            CheckDot(item: item)
            VStack(alignment: .leading, spacing: 1) {
                Text(item.title)
                    .font(.system(size: titleFontSize, weight: .medium))
                    .lineLimit(1)
                    .strikethrough(item.isDone)
                    .foregroundStyle(item.isDone ? .secondary : .primary)
                if showsSubtitle, let subtitle = item.subtitle {
                    Text(subtitle)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(Rectangle())
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
                    .font(.system(size: 8, weight: .bold))
                    .foregroundStyle(.white)
            }
        }
        .frame(width: 14, height: 14)
    }
}

private struct WeekStrip: View {
    let days: [JustDoWidgetDay]

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 0) {
                ForEach(days) { day in
                    VStack(spacing: 2) {
                        Text(weekdayLabel(day.weekday))
                            .font(.system(size: 8, weight: .semibold))
                            .foregroundStyle(.secondary)
                        Text("\(day.day)")
                            .font(.system(size: 11, weight: day.isToday ? .bold : .medium))
                            .frame(width: 19, height: 19)
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
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 0), count: 7)

    var body: some View {
        LazyVGrid(columns: columns, spacing: 1) {
            ForEach(days) { day in
                VStack(spacing: 2) {
                    Text("\(day.day)")
                        .font(.system(size: 10, weight: day.isToday ? .bold : .medium))
                        .frame(width: 17, height: 17)
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
