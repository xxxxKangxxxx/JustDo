import SwiftUI
import JustDoShared

struct TaskReminderEditor: View {
    @Binding var mode: TaskReminderMode
    @Binding var offsets: [Int]
    let includesTime: Bool

    private let timedOptions = [0, 5, 10, 15, 30, 60, 1_440, 2_880, 10_080]
    private let untimedOptions = [0, 1_440, 2_880, 10_080]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Picker("Task 알림", selection: $mode) {
                Text("기본값").tag(TaskReminderMode.defaultValue)
                Text("직접 설정").tag(TaskReminderMode.custom)
                Text("없음").tag(TaskReminderMode.none)
            }
            .pickerStyle(.segmented)

            if mode == .custom {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(options, id: \.self) { minutes in
                            Button {
                                toggle(minutes)
                            } label: {
                                Text(Self.label(minutes, includesTime: includesTime))
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundStyle(offsets.contains(minutes) ? .white : JDTheme.secondaryText)
                                    .padding(.horizontal, 10)
                                    .frame(height: 28)
                                    .background(offsets.contains(minutes) ? JDTheme.accent : JDTheme.surfaceAlt)
                                    .clipShape(Capsule())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                Text("최대 3개까지 선택할 수 있습니다.")
                    .font(.system(size: 10.5, weight: .medium))
                    .foregroundStyle(JDTheme.tertiaryText)
            }

            if !includesTime {
                Text("시간을 설정하지 않으면 아침 브리핑에는 포함되지만 다음 일정 안내에는 표시되지 않습니다.")
                    .font(.system(size: 10.5, weight: .medium))
                    .foregroundStyle(JDTheme.tertiaryText)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .onChange(of: mode) { _, newMode in
            if newMode == .custom && offsets.isEmpty {
                offsets = [includesTime ? 10 : 0]
            } else if newMode != .custom {
                offsets = []
            }
        }
        .onChange(of: includesTime) { _, hasTime in
            guard mode == .custom else {
                return
            }
            if hasTime {
                if offsets.isEmpty {
                    offsets = [10]
                }
            } else {
                offsets = offsets.filter { $0 == 0 || $0 % 1_440 == 0 }
                if offsets.isEmpty {
                    offsets = [0]
                }
            }
        }
    }

    private var options: [Int] {
        includesTime ? timedOptions : untimedOptions
    }

    private func toggle(_ minutes: Int) {
        if let index = offsets.firstIndex(of: minutes) {
            offsets.remove(at: index)
            return
        }
        guard offsets.count < 3 else {
            return
        }
        offsets = Task.normalizedReminderOffsets(offsets + [minutes])
    }

    private static func label(_ minutes: Int, includesTime: Bool) -> String {
        switch minutes {
        case 0:
            includesTime ? "정시" : "당일"
        case 60:
            "1시간 전"
        case 1_440:
            "1일 전"
        case 2_880:
            "2일 전"
        case 10_080:
            "1주일 전"
        default:
            "\(minutes)분 전"
        }
    }
}
