//
//  ContentView.swift
//  JustDoApp
//
//  Created by 강영모 on 4/30/26.
//

import SwiftUI
import JustDoShared

struct ContentView: View {
    @StateObject private var auth = AuthViewModel()
    @State private var navigationPath = NavigationPath()
    var snapshotStore: CoreDataAppSnapshotStore?
    var onSessionChanged: () async -> Void = {}

    var body: some View {
        NavigationStack(path: $navigationPath) {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Just Do")
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                    Text("Widget snapshot writer is active.")
                        .font(.headline)
                    Text("The app syncs the native Core Data mirror when a valid Keychain session is available, then writes the App Group widget snapshot on launch and foreground.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    authSection
                }
                .frame(maxWidth: .infinity, alignment: .topLeading)
                .padding(24)
            }
            .navigationTitle("Just Do")
            .navigationBarTitleDisplayMode(.inline)
            .navigationDestination(for: DetailRoute.self) { route in
                switch route {
                case .task(let id):
                    TaskDetailScreen(id: id, snapshotStore: snapshotStore)
                case .habit(let id):
                    HabitDetailScreen(id: id, snapshotStore: snapshotStore)
                }
            }
        }
        .task {
            auth.reload()
        }
        .onOpenURL { url in
            open(url)
        }
    }

    @ViewBuilder
    private var authSection: some View {
        switch auth.status {
        case .loading:
            ProgressView()
        case .missingConfiguration:
            Text("Supabase URL and anon key are not configured.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        case .signedOut:
            VStack(alignment: .leading, spacing: 10) {
                ForEach(SupabaseAuthProvider.allCases) { provider in
                    Button(provider.title) {
                        signIn(with: provider)
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
        case .signedIn:
            VStack(alignment: .leading, spacing: 10) {
                Text("Signed in. Core Data sync is enabled.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                Button("Sign out") {
                    auth.signOut()
                    _Concurrency.Task {
                        await onSessionChanged()
                    }
                }
                .buttonStyle(.bordered)
            }
        case .working:
            ProgressView()
        case .failed(let message):
            VStack(alignment: .leading, spacing: 10) {
                Text(message)
                    .font(.footnote)
                    .foregroundStyle(.red)
                Button("Try Google again") {
                    signIn(with: .google)
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }

    private func signIn(with provider: SupabaseAuthProvider) {
        _Concurrency.Task {
            await auth.signIn(with: provider)
            await onSessionChanged()
        }
    }

    private func open(_ url: URL) {
        guard let link = JustDoDeepLink(url: url) else {
            return
        }
        switch link {
        case .task(let id):
            navigationPath.append(DetailRoute.task(id))
        case .habit(let id):
            navigationPath.append(DetailRoute.habit(id))
        }
    }
}

private enum DetailRoute: Hashable {
    case task(UUID)
    case habit(UUID)
}

private enum DeepLinkDetail: Equatable {
    case task(Task)
    case habit(Habit)
    case missing(JustDoDeepLink)
    case unavailable(JustDoDeepLink)

    init(link: JustDoDeepLink, snapshotStore: CoreDataAppSnapshotStore?) {
        guard let snapshotStore else {
            self = .unavailable(link)
            return
        }

        do {
            switch link {
            case .task(let id):
                if let task = try snapshotStore.task(id: id) {
                    self = .task(task)
                } else {
                    self = .missing(link)
                }
            case .habit(let id):
                if let habit = try snapshotStore.habit(id: id) {
                    self = .habit(habit)
                } else {
                    self = .missing(link)
                }
            }
        } catch {
            self = .missing(link)
        }
    }
}

private struct TaskDetailScreen: View {
    let id: UUID
    let snapshotStore: CoreDataAppSnapshotStore?

    var body: some View {
        DetailScreenScaffold(title: "Task Detail") {
            switch detail {
            case .task(let task):
                TaskDetailContent(task: task)
            case .missing(let link):
                FallbackDetailContent(
                    title: "Detail not found",
                    message: "No local mirror row exists for \(link.description). Sync may need to refresh first."
                )
            case .unavailable(let link):
                FallbackDetailContent(
                    title: "Detail unavailable",
                    message: "The app could not access the local mirror for \(link.description)."
                )
            case .habit:
                EmptyView()
            }
        }
    }

    private var detail: DeepLinkDetail {
        DeepLinkDetail(link: .task(id), snapshotStore: snapshotStore)
    }
}

private struct HabitDetailScreen: View {
    let id: UUID
    let snapshotStore: CoreDataAppSnapshotStore?

    var body: some View {
        DetailScreenScaffold(title: "Habit Detail") {
            switch detail {
            case .habit(let habit):
                HabitDetailContent(habit: habit)
            case .missing(let link):
                FallbackDetailContent(
                    title: "Detail not found",
                    message: "No local mirror row exists for \(link.description). Sync may need to refresh first."
                )
            case .unavailable(let link):
                FallbackDetailContent(
                    title: "Detail unavailable",
                    message: "The app could not access the local mirror for \(link.description)."
                )
            case .task:
                EmptyView()
            }
        }
    }

    private var detail: DeepLinkDetail {
        DeepLinkDetail(link: .habit(id), snapshotStore: snapshotStore)
    }
}

private struct DetailScreenScaffold<Content: View>: View {
    let title: String
    @ViewBuilder var content: Content

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                content
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(24)
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct TaskDetailContent: View {
    let task: Task

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Task", systemImage: task.isCompleted ? "checkmark.circle.fill" : "circle")
                .font(.caption.weight(.bold))
                .foregroundStyle(task.isCompleted ? .green : .secondary)
            Text(task.title)
                .font(.title3.weight(.semibold))
            DetailGrid(rows: [
                ("Status", task.isCompleted ? "Completed" : "Open"),
                ("Date", dateRange),
                ("Time", task.scheduledTime ?? "-"),
                ("Priority", task.priority?.rawValue.capitalized ?? "-"),
                ("Tags", task.tags.isEmpty ? "-" : task.tags.joined(separator: ", ")),
            ])
        }
    }

    private var dateRange: String {
        task.startDate == task.endDate ? task.startDate : "\(task.startDate) - \(task.endDate)"
    }
}

private struct HabitDetailContent: View {
    let habit: Habit

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Habit", systemImage: "repeat.circle.fill")
                .font(.caption.weight(.bold))
                .foregroundStyle(.green)
            Text("\(habit.emoji) \(habit.title)")
                .font(.title3.weight(.semibold))
            DetailGrid(rows: [
                ("Started", habit.startedAt),
                ("Repeat", repeatDescription),
                ("Reminder", habit.reminderTime ?? "-"),
                ("Logged days", "\(habit.log.filter { $0.value == 1 }.count)"),
            ])
        }
    }

    private var repeatDescription: String {
        switch habit.recurType {
        case .daily:
            return "Daily"
        case .weekly:
            if let recurDays = habit.recurDays, !recurDays.isEmpty {
                return "Weekly: \(recurDays.map(String.init).joined(separator: ", "))"
            }
            return "Weekly"
        }
    }
}

private struct DetailGrid: View {
    let rows: [(String, String)]

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(rows, id: \.0) { label, value in
                HStack(alignment: .firstTextBaseline) {
                    Text(label)
                        .font(.footnote.weight(.medium))
                        .foregroundStyle(.secondary)
                        .frame(width: 82, alignment: .leading)
                    Text(value)
                        .font(.footnote)
                        .textSelection(.enabled)
                }
            }
        }
    }
}

private struct FallbackDetailContent: View {
    let title: String
    let message: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.headline)
            Text(message)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .textSelection(.enabled)
        }
    }
}

private extension JustDoDeepLink {
    var description: String {
        switch self {
        case .task(let id):
            "task \(id.uuidString.lowercased())"
        case .habit(let id):
            "habit \(id.uuidString.lowercased())"
        }
    }
}

#Preview {
    ContentView()
}
