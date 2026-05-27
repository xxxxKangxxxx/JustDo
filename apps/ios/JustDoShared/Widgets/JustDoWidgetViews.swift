import SwiftUI
#if canImport(WidgetKit)
import WidgetKit
#endif

public struct JustDoWidgetView: View {
    private let model: JustDoWidgetDisplayModel
    private let size: JustDoWidgetSize

    public init(model: JustDoWidgetDisplayModel, size: JustDoWidgetSize) {
        self.model = model
        self.size = size
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            WidgetHeader(model: model)

            switch size {
            case .small:
                SmallWidgetBody(model: model)
            case .medium:
                MediumWidgetBody(model: model)
            case .large:
                LargeWidgetBody(model: model)
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

private struct SmallWidgetBody: View {
    let model: JustDoWidgetDisplayModel

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text("\(model.remainingCount)")
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                Text("/ \(model.totalCount) 남음")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.secondary)
            }
            Divider()
            WidgetItemList(items: model.items)
        }
    }
}

private struct MediumWidgetBody: View {
    let model: JustDoWidgetDisplayModel

    var body: some View {
        HStack(spacing: 14) {
            WeekStrip(days: model.weekDays)
                .frame(width: 122)
            Divider()
            WidgetItemList(items: model.items)
        }
    }
}

private struct LargeWidgetBody: View {
    let model: JustDoWidgetDisplayModel

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            MonthGrid(days: model.monthDays)
            Divider()
            Text("오늘 · \(model.items.count)개")
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(.secondary)
            WidgetItemList(items: model.items)
        }
    }
}

private struct WidgetItemList: View {
    let items: [JustDoWidgetItem]

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            ForEach(items) { item in
                HStack(spacing: 7) {
                    CheckDot(item: item)
                    Text(item.title)
                        .font(.system(size: 11, weight: .medium))
                        .lineLimit(1)
                        .strikethrough(item.isDone)
                        .foregroundStyle(item.isDone ? .secondary : .primary)
                    Spacer(minLength: 4)
                    if item.kind == .task, let subtitle = item.subtitle {
                        Text(subtitle)
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundStyle(.secondary)
                            .monospacedDigit()
                            .lineLimit(1)
                    }
                }
            }
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
