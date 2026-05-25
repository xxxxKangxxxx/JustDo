//
//  ContentView.swift
//  JustDoApp
//
//  Created by 강영모 on 4/30/26.
//

import Foundation
import SwiftUI
import JustDoShared

private typealias JDCategory = JustDoShared.Category

struct ContentView: View {
    @StateObject private var auth = AuthViewModel()
    @ObservedObject private var syncStatus: AppSyncStatusStore
    @State private var navigationPath = NavigationPath()
    @State private var didOpenInitialUITestURL = false
    @Environment(\.scenePhase) private var scenePhase
    var snapshotStore: CoreDataAppSnapshotStore?
    var onSessionChanged: () async -> Void = {}

    @MainActor
    init(
        snapshotStore: CoreDataAppSnapshotStore? = nil,
        syncStatus: AppSyncStatusStore,
        onSessionChanged: @escaping () async -> Void = {}
    ) {
        self.snapshotStore = snapshotStore
        self.onSessionChanged = onSessionChanged
        _syncStatus = ObservedObject(wrappedValue: syncStatus)
    }

    var body: some View {
        NavigationStack(path: $navigationPath) {
            rootScreen
            .navigationDestination(for: JustDoDetailRoute.self) { route in
                switch route {
                case .task(let id):
                    TaskDetailScreen(id: id, snapshotStore: snapshotStore, syncStatus: syncStatus)
                case .habit(let id):
                    HabitDetailScreen(id: id, snapshotStore: snapshotStore, syncStatus: syncStatus)
                }
            }
        }
        .task {
            await auth.reload()
            openInitialUITestURLIfNeeded()
        }
        .onChange(of: scenePhase) { _, newPhase in
            guard newPhase == .active else { return }
            _Concurrency.Task { await auth.reload() }
        }
        .onOpenURL { url in
            open(url)
        }
    }

    @ViewBuilder
    private var rootScreen: some View {
        switch auth.status {
        case .loading:
            LoadingRootView()
        case .missingConfiguration:
            AuthLandingView(
                message: "Supabase URL and anon key are not configured.",
                workingProvider: nil,
                onSignIn: signIn(with:)
            )
        case .signedOut:
            AuthLandingView(workingProvider: nil, onSignIn: signIn(with:))
        case .signedIn:
            HomeRootView(
                snapshotStore: snapshotStore,
                syncStatus: syncStatus,
                authProfile: auth.profile,
                onOpenTask: { navigationPath.append(JustDoDetailRoute.task($0)) },
                onOpenHabit: { navigationPath.append(JustDoDetailRoute.habit($0)) },
                onSignOut: {
                    auth.signOut()
                    _Concurrency.Task { await onSessionChanged() }
                }
            )
        case .working:
            AuthLandingView(workingProvider: .google, onSignIn: signIn(with:))
        case .failed(let message):
            AuthLandingView(
                message: message,
                workingProvider: nil,
                onSignIn: signIn(with:)
            )
        }
    }

    private func signIn(with provider: SupabaseAuthProvider) {
        _Concurrency.Task {
            await auth.signIn(with: provider)
            await onSessionChanged()
        }
    }

    private func open(_ url: URL) {
        guard let route = JustDoDetailRoute(url: url) else {
            return
        }
        navigationPath.append(route)
    }

    private func openInitialUITestURLIfNeeded() {
        #if DEBUG
        guard !didOpenInitialUITestURL, let url = JustDoUITestSupport.initialURL else {
            return
        }
        didOpenInitialUITestURL = true
        open(url)
        #endif
    }
}

private enum RootTab: String, CaseIterable, Identifiable {
    case home
    case stats
    case settings

    var id: String { rawValue }

    var title: String {
        switch self {
        case .home:
            "홈"
        case .stats:
            "통계"
        case .settings:
            "설정"
        }
    }

    var systemName: String {
        switch self {
        case .home:
            "calendar"
        case .stats:
            "chart.bar"
        case .settings:
            "gearshape"
        }
    }
}

private struct TaskDraft {
    var title: String
    var categoryID: UUID?
    var startDate: String
    var endDate: String
    var priority: Priority
    var scheduledTime: String?
}

private struct LoadingRootView: View {
    var body: some View {
        ZStack {
            JDTheme.background.ignoresSafeArea()
            ProgressView()
        }
        .navigationBarHidden(true)
    }
}

private struct AuthLandingView: View {
    var message: String?
    var workingProvider: SupabaseAuthProvider?
    var onSignIn: (SupabaseAuthProvider) -> Void

    var body: some View {
        ZStack {
            JDTheme.background.ignoresSafeArea()
            RadialGradient(
                colors: [
                    Color(hex: "#FBE9D2")!,
                    Color(hex: "#F4ECDD")!,
                    JDTheme.background,
                ],
                center: .top,
                startRadius: 0,
                endRadius: 520
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()
                VStack(spacing: 16) {
                    JustDoWordmark(size: 56, dotSize: 11)
                    Text("오늘, 지금 해야 할 일.")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(JDTheme.secondaryText)
                }
                Spacer()
                VStack(spacing: 8) {
                    AuthProviderButton(
                        title: "Apple로 계속하기",
                        provider: .apple,
                        workingProvider: workingProvider,
                        style: .dark,
                        onSignIn: onSignIn
                    )
                    AuthProviderButton(
                        title: "Google로 계속하기",
                        provider: .google,
                        workingProvider: workingProvider,
                        style: .light,
                        onSignIn: onSignIn
                    )
                    AuthGhostButton(
                        icon: .kakao,
                        title: "Kakao로 계속하기",
                        color: Color(hex: "#FEE500")!,
                        foregroundColor: Color(hex: "#191600")!,
                        isBordered: false
                    )
                    AuthGhostButton(
                        icon: .email,
                        title: "이메일로 계속하기",
                        color: .clear,
                        foregroundColor: JDTheme.primaryText,
                        isBordered: true
                    )
                    if let message {
                        Text(message)
                            .font(.footnote)
                            .foregroundStyle(.red)
                            .multilineTextAlignment(.center)
                            .padding(.top, 8)
                    }
                    HStack(spacing: 12) {
                        Text("이용약관")
                        Rectangle()
                            .fill(JDTheme.dividerStrong)
                            .frame(width: 1, height: 10)
                        Text("개인정보처리방침")
                    }
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(JDTheme.tertiaryText)
                    .padding(.top, 8)
                }
            }
            .padding(.horizontal, 44)
            .padding(.bottom, 34)
        }
        .navigationBarHidden(true)
        .preferredColorScheme(.light)
    }
}

private struct AuthProviderButton: View {
    enum Style {
        case dark
        case light
    }

    let title: String
    let provider: SupabaseAuthProvider
    let workingProvider: SupabaseAuthProvider?
    let style: Style
    let onSignIn: (SupabaseAuthProvider) -> Void

    private var isWorking: Bool {
        workingProvider == provider
    }

    var body: some View {
        Button {
            onSignIn(provider)
        } label: {
            HStack(spacing: 10) {
                if isWorking {
                    ProgressView()
                        .tint(style == .dark ? .white : JDTheme.primaryText)
                } else {
                    AuthIcon(provider == .apple ? .apple : .google, foregroundColor: style == .dark ? .white : JDTheme.primaryText)
                    Text(title)
                }
            }
            .font(.system(size: 13.5, weight: .semibold))
            .frame(maxWidth: .infinity, minHeight: 44)
            .foregroundStyle(style == .dark ? .white : JDTheme.primaryText)
            .background(style == .dark ? JDTheme.primaryText : .white)
            .overlay(
                RoundedRectangle(cornerRadius: 11)
                    .stroke(style == .dark ? .clear : JDTheme.divider, lineWidth: 0.5)
            )
            .clipShape(RoundedRectangle(cornerRadius: 11))
        }
        .disabled(workingProvider != nil)
    }
}

private struct AuthGhostButton: View {
    let icon: AuthIcon.Kind
    let title: String
    let color: Color
    let foregroundColor: Color
    let isBordered: Bool

    var body: some View {
        HStack(spacing: 10) {
            AuthIcon(icon, foregroundColor: foregroundColor)
            Text(title)
        }
        .font(.system(size: 13.5, weight: .semibold))
        .frame(maxWidth: .infinity, minHeight: 44)
        .foregroundStyle(foregroundColor)
        .background(color)
        .overlay(
            RoundedRectangle(cornerRadius: 11)
                .stroke(isBordered ? JDTheme.dividerStrong : .clear, lineWidth: 0.5)
        )
        .clipShape(RoundedRectangle(cornerRadius: 11))
    }
}

private struct AuthIcon: View {
    enum Kind {
        case apple
        case google
        case kakao
        case email
    }

    let kind: Kind
    let foregroundColor: Color

    init(_ kind: Kind, foregroundColor: Color) {
        self.kind = kind
        self.foregroundColor = foregroundColor
    }

    var body: some View {
        switch kind {
        case .apple:
            Image(systemName: "apple.logo")
                .font(.system(size: 17, weight: .semibold))
                .frame(width: 18, height: 18)
        case .google:
            GoogleIcon()
                .frame(width: 18, height: 18)
        case .kakao:
            KakaoIcon()
                .frame(width: 18, height: 18)
        case .email:
            EmailIcon(color: foregroundColor)
                .frame(width: 18, height: 18)
        }
    }
}

private struct GoogleIcon: View {
    var body: some View {
        ZStack {
            Circle()
                .trim(from: 0.02, to: 0.23)
                .stroke(Color(hex: "#4285F4")!, style: StrokeStyle(lineWidth: 3.2, lineCap: .butt))
                .rotationEffect(.degrees(-18))
            Circle()
                .trim(from: 0.24, to: 0.45)
                .stroke(Color(hex: "#34A853")!, style: StrokeStyle(lineWidth: 3.2, lineCap: .butt))
                .rotationEffect(.degrees(-18))
            Circle()
                .trim(from: 0.46, to: 0.67)
                .stroke(Color(hex: "#FBBC05")!, style: StrokeStyle(lineWidth: 3.2, lineCap: .butt))
                .rotationEffect(.degrees(-18))
            Circle()
                .trim(from: 0.68, to: 0.94)
                .stroke(Color(hex: "#EA4335")!, style: StrokeStyle(lineWidth: 3.2, lineCap: .butt))
                .rotationEffect(.degrees(-18))
            Path { path in
                path.move(to: CGPoint(x: 9, y: 9))
                path.addLine(to: CGPoint(x: 17, y: 9))
            }
            .stroke(Color(hex: "#4285F4")!, style: StrokeStyle(lineWidth: 3.2, lineCap: .butt))
        }
        .padding(1.5)
    }
}

private struct KakaoIcon: View {
    var body: some View {
        Path { path in
            path.addRoundedRect(
                in: CGRect(x: 1, y: 2, width: 16, height: 11.5),
                cornerSize: CGSize(width: 6.5, height: 6.5)
            )
            path.move(to: CGPoint(x: 6.4, y: 12.3))
            path.addLine(to: CGPoint(x: 4.8, y: 16))
            path.addLine(to: CGPoint(x: 8.8, y: 13.2))
        }
        .fill(Color(hex: "#191600")!)
    }
}

private struct EmailIcon: View {
    let color: Color

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 2)
                .stroke(color, lineWidth: 1.5)
                .frame(width: 18, height: 14)
            Path { path in
                path.move(to: CGPoint(x: 1, y: 3))
                path.addLine(to: CGPoint(x: 9, y: 9))
                path.addLine(to: CGPoint(x: 17, y: 3))
            }
            .stroke(color, style: StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .round))
        }
        .frame(width: 18, height: 18)
    }
}

private struct HomeRootView: View {
    let snapshotStore: CoreDataAppSnapshotStore?
    @ObservedObject var syncStatus: AppSyncStatusStore
    let authProfile: AuthProfile?
    let onOpenTask: (UUID) -> Void
    let onOpenHabit: (UUID) -> Void
    let onSignOut: () -> Void

    @State private var snapshot: AppSnapshot?
    @State private var selectedDate = JDDate.todayISO
    @State private var displayYear = JDDate.todayComponents.year
    @State private var displayMonth = JDDate.todayComponents.month
    @State private var selectedTab: RootTab = .home
    @State private var isShowingAddTask = false
    @State private var isShowingHabitManager = false
    @State private var isShowingCategoryManager = false
    @State private var isShowingDayPanel = false
    @AppStorage("justdo.isDarkMode") private var isDarkMode = false
    @State private var exportURL: ExportFile?
    @State private var loadError: String?
    @State private var actionMessage: String?
    private let weekdays = ["일", "월", "화", "수", "목", "금", "토"]

    var body: some View {
        ZStack(alignment: .bottom) {
            JDTheme.background.ignoresSafeArea()
            activeRootTab
            BottomTabBar(selectedTab: selectedTab) { selectedTab = $0 }
        }
        .navigationBarHidden(true)
        .preferredColorScheme(isDarkMode ? .dark : .light)
        .sheet(isPresented: $isShowingAddTask) {
            AddTaskSheet(
                selectedDate: selectedDate,
                categories: snapshot?.categories ?? [],
                onSaveTask: addTask(_:),
                onSaveHabit: addHabit(title:emoji:)
            )
            .presentationDetents([.height(500)])
            .presentationDragIndicator(.hidden)
            .presentationCornerRadius(22)
            .presentationBackground(JDTheme.surface)
        }
        .sheet(isPresented: $isShowingHabitManager) {
            HabitManagementSheet(
                habits: snapshot?.habits ?? [],
                onAdd: addHabit(title:emoji:),
                onDelete: deleteHabit(_:)
            )
            .presentationDetents([.large])
        }
        .sheet(isPresented: $isShowingCategoryManager) {
            CategoryManagementSheet(
                categories: snapshot?.categories ?? [],
                onAdd: addCategory(name:color:),
                onDelete: deleteCategory(_:)
            )
            .presentationDetents([.large])
        }
        .sheet(item: $exportURL) { file in
            DataExportSheet(url: file.url)
                .presentationDetents([.height(220)])
                .presentationDragIndicator(.visible)
                .presentationCornerRadius(22)
                .presentationBackground(JDTheme.surface)
        }
        .sheet(isPresented: $isShowingDayPanel) {
            SelectedDayPanel(
                selectedDate: selectedDate,
                tasks: tasksForSelectedDate,
                habits: snapshot?.habits ?? [],
                categories: snapshot?.categories ?? [],
                onToggleTask: toggleTask(_:),
                onToggleHabit: toggleHabit(_:on:),
                onOpenTask: { id in
                    isShowingDayPanel = false
                    onOpenTask(id)
                },
                onOpenHabit: { id in
                    isShowingDayPanel = false
                    onOpenHabit(id)
                }
            )
            .presentationDetents([.height(420)])
            .presentationDragIndicator(.visible)
            .presentationCornerRadius(22)
            .presentationBackground(JDTheme.surface)
            .simultaneousGesture(
                DragGesture(minimumDistance: 30)
                    .onEnded { value in
                        let dx = value.translation.width
                        let dy = value.translation.height
                        guard abs(dx) > abs(dy), abs(dx) > 50 else { return }
                        withAnimation(.easeInOut(duration: 0.2)) {
                            selectedDate = JDDate.addDays(selectedDate, dx > 0 ? -1 : 1)
                        }
                    }
            )
        }
        .task {
            loadSnapshot()
        }
    }

    @ViewBuilder
    private var activeRootTab: some View {
        switch selectedTab {
        case .home:
            VStack(spacing: 0) {
                Spacer()
                    .frame(height: 36)
                homeHeader
                Spacer()
                    .frame(height: 36)
                MonthCalendarView(
                    year: displayYear,
                    month: displayMonth,
                    selectedDate: selectedDate,
                    tasks: snapshot?.tasks ?? [],
                    categories: snapshot?.categories ?? [],
                    onSelectDate: { date in
                        selectedDate = date
                        isShowingDayPanel = true
                    }
                )
                .simultaneousGesture(
                    DragGesture(minimumDistance: 30)
                        .onEnded { value in
                            let dx = value.translation.width
                            let dy = value.translation.height
                            guard abs(dx) > abs(dy), abs(dx) > 50 else { return }
                            withAnimation(.easeInOut(duration: 0.2)) {
                                moveMonth(dx > 0 ? -1 : 1)
                            }
                        }
                )
                Spacer(minLength: 0)
            }
            .padding(.bottom, 100)
            .frame(maxHeight: .infinity, alignment: .top)
        case .stats:
            StatsRootTabView(
                snapshot: snapshot,
                year: displayYear,
                month: displayMonth,
                onToggleHabit: toggleHabit(_:on:)
            )
                .padding(.bottom, 100)
        case .settings:
            SettingsRootTabView(
                settings: snapshot?.settings,
                authProfile: authProfile,
                isDarkMode: $isDarkMode,
                actionMessage: actionMessage,
                syncStatus: syncStatus.status,
                onSetNotify: setNotify(_:),
                onSetNotifyTime: setNotifyTime(_:),
                onSetWeekStart: setWeekStart(_:),
                onManageHabits: { isShowingHabitManager = true },
                onManageCategories: { isShowingCategoryManager = true },
                onExportData: exportData,
                onResetData: resetAllData,
                onRetrySync: retrySync,
                onSignOut: onSignOut
            )
                .padding(.bottom, 100)
        }
    }

    private var homeHeader: some View {
        VStack(alignment: .leading, spacing: 16) {
            JustDoWordmark(size: 24, dotSize: 6)
                .offset(y: -14)
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(String(displayYear))
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(JDTheme.secondaryText)
                    HStack(alignment: .firstTextBaseline, spacing: 2) {
                        Text(String(displayMonth))
                            .font(.system(size: 26, weight: .bold))
                        Text("월")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundStyle(JDTheme.secondaryText)
                    }
                }
                MonthArrow(systemName: "chevron.left") {
                    moveMonth(-1)
                }
                MonthArrow(systemName: "chevron.right") {
                    moveMonth(1)
                }
                Spacer()
                Button {
                    moveToToday()
                } label: {
                    Text("오늘")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(JDTheme.accent)
                        .padding(.horizontal, 12)
                        .frame(height: 32)
                        .background(JDTheme.accent.opacity(0.12))
                        .clipShape(Capsule())
                }
                Button {
                    isShowingAddTask = true
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 18, weight: .semibold))
                        .frame(width: 32, height: 32)
                        .foregroundStyle(.white)
                        .background(JDTheme.accent)
                        .clipShape(Circle())
                }
            }
            if let loadError {
                Text(loadError)
                    .font(.footnote)
                    .foregroundStyle(.red)
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 16)
    }

    private var tasksForSelectedDate: [Task] {
        (snapshot?.tasks ?? []).filter { $0.startDate <= selectedDate && selectedDate <= $0.endDate }
    }

    private func moveMonth(_ delta: Int) {
        let moved = JDDate.addMonths(year: displayYear, month: displayMonth, delta: delta)
        displayYear = moved.year
        displayMonth = moved.month
    }

    private func moveToToday() {
        let today = JDDate.todayComponents
        selectedDate = JDDate.todayISO
        displayYear = today.year
        displayMonth = today.month
    }

    private func loadSnapshot(preserveViewSelection: Bool = false) {
        guard let snapshotStore else {
            loadError = "Local mirror is unavailable."
            return
        }

        do {
            let currentSelectedDate = selectedDate
            let currentDisplayYear = displayYear
            let currentDisplayMonth = displayMonth
            try WidgetSnapshotBootstrap.seedIfNeeded(into: snapshotStore)
            let loaded = try snapshotStore.loadSnapshot()
            snapshot = loaded
            if preserveViewSelection {
                selectedDate = currentSelectedDate
                displayYear = currentDisplayYear
                displayMonth = currentDisplayMonth
            } else {
                selectedDate = loaded.view.selectedDate
                displayYear = loaded.view.year
                displayMonth = loaded.view.month
            }
            syncStatus.refreshPendingCount(snapshotStore: snapshotStore)
            loadError = nil
        } catch {
            loadError = "Could not load local mirror."
        }
    }

    private func addTask(_ draft: TaskDraft) {
        guard let snapshotStore else {
            actionMessage = "Local mirror is unavailable."
            return
        }

        let trimmedTitle = draft.title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedTitle.isEmpty else {
            actionMessage = "Task title is required."
            return
        }
        let startDate = JDDate.normalizedISODate(draft.startDate, fallback: selectedDate)
        let endDate = JDDate.normalizedISODate(draft.endDate, fallback: startDate)

        let task = Task(
            id: UUID(),
            title: trimmedTitle,
            categoryID: draft.categoryID ?? snapshot?.categories.first?.id,
            startDate: startDate,
            endDate: max(startDate, endDate),
            priority: draft.priority,
            isCompleted: false,
            scheduledTime: draft.scheduledTime?.nilIfBlank,
            tags: []
        )

        do {
            try snapshotStore.applyAndEnqueue(
                QueuedMutation(
                    id: UUID(),
                    updatedAt: JDDate.nowISODateTime,
                    mutation: .taskUpsert(task)
                )
            )
            loadSnapshot(preserveViewSelection: true)
            syncStatus.refreshPendingCount(snapshotStore: snapshotStore)
            actionMessage = "Task added."
        } catch {
            actionMessage = "Could not add task."
        }
    }

    private func addHabit(title: String, emoji: String) {
        guard let snapshotStore else {
            actionMessage = "Local mirror is unavailable."
            return
        }

        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedTitle.isEmpty else {
            actionMessage = "Habit title is required."
            return
        }

        let habit = Habit(
            id: UUID(),
            title: trimmedTitle,
            emoji: emoji,
            startedAt: selectedDate,
            recurType: .daily,
            recurDays: nil,
            reminderTime: nil,
            log: [:]
        )

        do {
            try snapshotStore.applyAndEnqueue(
                QueuedMutation(
                    id: UUID(),
                    updatedAt: JDDate.nowISODateTime,
                    mutation: .habitUpsert(habit)
                )
            )
            loadSnapshot(preserveViewSelection: true)
            syncStatus.refreshPendingCount(snapshotStore: snapshotStore)
            actionMessage = "Habit added."
        } catch {
            actionMessage = "Could not add habit."
        }
    }

    private func toggleHabit(_ habit: Habit, on iso: String) {
        guard let snapshotStore else {
            actionMessage = "Local mirror is unavailable."
            return
        }

        let nextValue = habit.log[iso] == 1 ? 0 : 1
        do {
            try snapshotStore.applyAndEnqueue(
                QueuedMutation(
                    id: UUID(),
                    updatedAt: JDDate.nowISODateTime,
                    mutation: .habitLogSet(habitID: habit.id, iso: iso, value: nextValue)
                )
            )
            loadSnapshot(preserveViewSelection: true)
            syncStatus.refreshPendingCount(snapshotStore: snapshotStore)
            actionMessage = "Habit updated."
        } catch {
            actionMessage = "Could not update habit."
        }
    }

    private func toggleTask(_ task: Task) {
        guard let snapshotStore else {
            actionMessage = "Local mirror is unavailable."
            return
        }

        var updated = task
        updated.isCompleted.toggle()
        let updatedAt = JDDate.nowISODateTime

        do {
            try snapshotStore.applyAndEnqueue(
                QueuedMutation(
                    id: UUID(),
                    updatedAt: updatedAt,
                    mutation: .taskCompletionSet(
                        id: updated.id,
                        isCompleted: updated.isCompleted,
                        completedAt: updated.isCompleted ? updatedAt : nil
                    )
                )
            )
            loadSnapshot(preserveViewSelection: true)
            syncStatus.refreshPendingCount(snapshotStore: snapshotStore)
            actionMessage = "Task updated."
        } catch {
            actionMessage = "Could not update task."
        }
    }

    private func toggleWeekStart() {
        let current = snapshot?.settings.weekStart ?? 0
        setWeekStart(current == 0 ? 1 : 0)
    }

    private func setNotify(_ isOn: Bool) {
        setPreference(.notify, value: isOn ? 1 : 0, successMessage: "Notification settings updated.")
    }

    private func setNotifyTime(_ time: String) {
        setPreference(.notifyTime, value: Self.minutes(fromTime: time), successMessage: "Notification time updated.")
    }

    private func setWeekStart(_ weekStart: Int) {
        setPreference(.weekStart, value: weekStart == 1 ? 1 : 0, successMessage: "Calendar settings updated.")
    }

    private func setPreference(_ key: JustDoShared.PreferenceKey, value: Int, successMessage: String) {
        guard let snapshotStore else {
            actionMessage = "Local mirror is unavailable."
            return
        }

        do {
            try snapshotStore.applyAndEnqueue(
                QueuedMutation(
                    id: UUID(),
                    updatedAt: JDDate.nowISODateTime,
                    mutation: .preferencesSet(key: key, value: value)
                )
            )
            loadSnapshot(preserveViewSelection: true)
            syncStatus.refreshPendingCount(snapshotStore: snapshotStore)
            actionMessage = successMessage
        } catch {
            actionMessage = "Could not update settings."
        }
    }

    private static func minutes(fromTime time: String) -> Int {
        let parts = time.split(separator: ":").compactMap { Int($0) }
        let hour = min(max(parts.first ?? 9, 0), 23)
        let minute = min(max(parts.dropFirst().first ?? 0, 0), 59)
        return hour * 60 + minute
    }

    private func addCategory(name: String, color: String) {
        guard let snapshotStore else {
            actionMessage = "Local mirror is unavailable."
            return
        }

        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else {
            actionMessage = "Category name is required."
            return
        }

        let category = JDCategory(
            id: UUID(),
            name: trimmedName,
            color: color,
            isDefault: false,
            position: (snapshot?.categories.count ?? 0)
        )

        do {
            try snapshotStore.applyAndEnqueue(
                QueuedMutation(
                    id: UUID(),
                    updatedAt: JDDate.nowISODateTime,
                    mutation: .categoryUpsert(category)
                )
            )
            loadSnapshot(preserveViewSelection: true)
            syncStatus.refreshPendingCount(snapshotStore: snapshotStore)
            actionMessage = "Category added."
        } catch {
            actionMessage = "Could not add category."
        }
    }

    private func deleteCategory(_ category: JDCategory) {
        guard let snapshotStore else {
            actionMessage = "Local mirror is unavailable."
            return
        }

        do {
            try snapshotStore.applyAndEnqueue(
                QueuedMutation(
                    id: UUID(),
                    updatedAt: JDDate.nowISODateTime,
                    mutation: .categoryDelete(id: category.id)
                )
            )
            loadSnapshot(preserveViewSelection: true)
            syncStatus.refreshPendingCount(snapshotStore: snapshotStore)
            actionMessage = "Category deleted."
        } catch {
            actionMessage = "Could not delete category."
        }
    }

    private func deleteHabit(_ habit: Habit) {
        guard let snapshotStore else {
            actionMessage = "Local mirror is unavailable."
            return
        }

        do {
            try snapshotStore.applyAndEnqueue(
                QueuedMutation(
                    id: UUID(),
                    updatedAt: JDDate.nowISODateTime,
                    mutation: .habitDelete(id: habit.id)
                )
            )
            loadSnapshot(preserveViewSelection: true)
            syncStatus.refreshPendingCount(snapshotStore: snapshotStore)
            actionMessage = "Habit deleted."
        } catch {
            actionMessage = "Could not delete habit."
        }
    }

    private func exportData() {
        guard let snapshot else {
            actionMessage = "Export data is unavailable."
            return
        }

        do {
            let csv = CSVExporter.makeCSV(snapshot: snapshot)
            let url = FileManager.default.temporaryDirectory
                .appendingPathComponent("justdo-export-\(JDDate.todayISO).csv")
            try csv.write(to: url, atomically: true, encoding: .utf8)
            exportURL = ExportFile(url: url)
            actionMessage = "Export file is ready."
        } catch {
            actionMessage = "Could not export data."
        }
    }

    private func resetAllData() {
        guard let snapshotStore else {
            actionMessage = "Local mirror is unavailable."
            return
        }
        guard let snapshot else {
            actionMessage = "No data to reset."
            return
        }

        let updatedAt = JDDate.nowISODateTime
        let mutations =
            snapshot.tasks.map { QueuedMutation(id: UUID(), updatedAt: updatedAt, mutation: .taskDelete(id: $0.id)) } +
            snapshot.habits.map { QueuedMutation(id: UUID(), updatedAt: updatedAt, mutation: .habitDelete(id: $0.id)) } +
            snapshot.categories.map { QueuedMutation(id: UUID(), updatedAt: updatedAt, mutation: .categoryDelete(id: $0.id)) }

        guard !mutations.isEmpty else {
            actionMessage = "No data to reset."
            return
        }

        do {
            for mutation in mutations {
                try snapshotStore.applyAndEnqueue(mutation)
            }
            loadSnapshot(preserveViewSelection: true)
            syncStatus.refreshPendingCount(snapshotStore: snapshotStore)
            actionMessage = "All data reset."
        } catch {
            actionMessage = "Could not reset data."
        }
    }

    private func retrySync() {
        guard let snapshotStore else {
            actionMessage = "Local mirror is unavailable."
            return
        }
        syncStatus.markSyncing()
        _Concurrency.Task {
            do {
                try await AppSyncCoordinator(
                    snapshotStore: snapshotStore,
                    widgetWriter: try WidgetSnapshotWriter()
                ).refreshWidgetSnapshot(selectedDate: selectedDate)
                loadSnapshot(preserveViewSelection: true)
                syncStatus.refreshPendingCount(snapshotStore: snapshotStore)
            } catch {
                syncStatus.markFailed(error, snapshotStore: snapshotStore)
            }
        }
    }
}

private struct MonthArrow: View {
    let systemName: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 13, weight: .semibold))
                .frame(width: 30, height: 30)
                .foregroundStyle(JDTheme.primaryText.opacity(0.7))
        }
        .buttonStyle(.plain)
    }
}

private struct MonthCalendarView: View {
    let year: Int
    let month: Int
    let selectedDate: String
    let tasks: [Task]
    let categories: [JDCategory]
    let onSelectDate: (String) -> Void

    private let weekdays = ["일", "월", "화", "수", "목", "금", "토"]
    private let barLaneHeight: CGFloat = 14
    private let barLaneSpacing: CGFloat = 2

    var body: some View {
        VStack(spacing: 0) {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 0), count: 7), spacing: 0) {
                ForEach(Array(weekdays.enumerated()), id: \.offset) { index, weekday in
                    Text(weekday)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(weekdayColor(index))
                        .frame(maxWidth: .infinity)
                        .padding(.bottom, 6)
                }
            }

            ForEach(weeks, id: \.self) { week in
                CalendarWeekRow(
                    week: week,
                    selectedDate: selectedDate,
                    bars: weekBars(for: week),
                    onSelectDate: onSelectDate
                )
            }
        }
        .padding(.horizontal, 14)
    }

    private var weeks: [[CalendarDay]] {
        JDDate.monthGrid(year: year, month: month)
    }

    private func weekdayColor(_ index: Int) -> Color {
        if index == 0 {
            return JDTheme.external
        }
        if index == 6 {
            return JDTheme.me
        }
        return JDTheme.tertiaryText
    }

    private var monthStart: String {
        JDDate.iso(year: year, month: month, day: 1)
    }

    private var monthEnd: String {
        JDDate.iso(year: year, month: month, day: JDDate.days(year: year, month: month))
    }

    private var monthTaskBars: [MonthTaskBar] {
        let overlapping = tasks
            .filter { $0.endDate >= monthStart && $0.startDate <= monthEnd }
            .sorted {
                if $0.startDate == $1.startDate {
                    return $0.endDate > $1.endDate
                }
                return $0.startDate < $1.startDate
            }

        var laneEndDates: [String] = []
        return overlapping.map { task in
            let lane: Int
            if let openLane = laneEndDates.firstIndex(where: { $0 < task.startDate }) {
                lane = openLane
                laneEndDates[openLane] = task.endDate
            } else {
                lane = laneEndDates.count
                laneEndDates.append(task.endDate)
            }

            return MonthTaskBar(
                task: task,
                lane: lane,
                color: categories.first { $0.id == task.categoryID }?.displayColor ?? JDTheme.me
            )
        }
    }

    private func weekBars(for week: [CalendarDay]) -> [WeekTaskBar] {
        monthTaskBars.compactMap { bar in
            var startIndex: Int?
            var endIndex: Int?
            for index in week.indices where week[index].isCurrentMonth {
                let iso = week[index].iso
                if bar.task.startDate <= iso && iso <= bar.task.endDate {
                    startIndex = startIndex ?? index
                    endIndex = index
                }
            }
            guard let startIndex, let endIndex else {
                return nil
            }

            return WeekTaskBar(
                task: bar.task,
                startIndex: startIndex,
                endIndex: endIndex,
                lane: bar.lane,
                color: bar.color,
                continuesLeft: bar.task.startDate < week[startIndex].iso,
                continuesRight: bar.task.endDate > week[endIndex].iso
            )
        }
    }

}

private struct CalendarWeekRow: View {
    let week: [CalendarDay]
    let selectedDate: String
    let bars: [WeekTaskBar]
    let onSelectDate: (String) -> Void

    private let barLaneHeight: CGFloat = 14
    private let barLaneSpacing: CGFloat = 2

    var body: some View {
        GeometryReader { proxy in
            let cellWidth = proxy.size.width / 7
            ZStack(alignment: .topLeading) {
                HStack(spacing: 0) {
                    ForEach(Array(week.enumerated()), id: \.element.iso) { index, day in
                        CalendarDayCell(
                            day: day,
                            index: index,
                            isSelected: day.iso == selectedDate,
                            onSelect: { onSelectDate(day.iso) }
                        )
                        .frame(width: cellWidth, height: rowHeight, alignment: .top)
                    }
                }

                ForEach(bars, id: \.task.id) { bar in
                    CalendarTaskBar(bar: bar)
                        .frame(
                            width: cellWidth * CGFloat(bar.endIndex - bar.startIndex + 1) - 4,
                            height: barLaneHeight
                        )
                        .offset(
                            x: cellWidth * CGFloat(bar.startIndex) + 2,
                            y: 32 + CGFloat(bar.lane) * (barLaneHeight + barLaneSpacing)
                        )
                        .allowsHitTesting(false)
                }
            }
            .overlay(alignment: .top) {
                Rectangle()
                    .fill(JDTheme.divider)
                    .frame(height: 0.5)
            }
        }
        .frame(height: rowHeight)
    }

    private var rowHeight: CGFloat {
        32 + CGFloat(max(2, laneCount)) * (barLaneHeight + barLaneSpacing) + 4
    }

    private var laneCount: Int {
        (bars.map(\.lane).max() ?? -1) + 1
    }
}

private struct CalendarTaskBar: View {
    let bar: WeekTaskBar

    var body: some View {
        Text(title)
            .font(.system(size: 10, weight: .semibold))
            .lineLimit(1)
            .foregroundStyle(bar.color)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .padding(.horizontal, 6)
            .background(bar.color.opacity(0.14))
            .clipShape(
                UnevenRoundedRectangle(
                    topLeadingRadius: bar.continuesLeft ? 0 : 4,
                    bottomLeadingRadius: bar.continuesLeft ? 0 : 4,
                    bottomTrailingRadius: bar.continuesRight ? 0 : 4,
                    topTrailingRadius: bar.continuesRight ? 0 : 4
                )
            )
            .opacity(bar.task.isCompleted ? 0.5 : 1)
            .strikethrough(bar.task.isCompleted)
    }

    private var title: String {
        if bar.continuesLeft {
            return "← \(bar.task.title)"
        }
        return bar.task.title
    }
}

private struct CalendarDayCell: View {
    let day: CalendarDay
    let index: Int
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: day.isCurrentMonth ? onSelect : {}) {
            VStack(spacing: 0) {
                Text(String(day.day))
                    .font(.system(size: 14, weight: isSelected || day.iso == JDDate.todayISO ? .semibold : .medium))
                    .monospacedDigit()
                    .frame(width: 24, height: 24)
                    .foregroundStyle(textColor)
                    .background(day.iso == JDDate.todayISO ? JDTheme.accent : isSelected ? Color.black.opacity(0.06) : .clear)
                    .clipShape(Circle())
                    .overlay(
                        Circle()
                            .stroke(isSelected && day.iso != JDDate.todayISO ? JDTheme.accent : .clear, lineWidth: 1.5)
                    )
                    .padding(.top, 6)
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(!day.isCurrentMonth)
    }

    private var textColor: Color {
        if day.iso == JDDate.todayISO {
            return .white
        }
        if !day.isCurrentMonth {
            return JDTheme.tertiaryText.opacity(0.55)
        }
        if index == 0 {
            return JDTheme.external
        }
        if index == 6 {
            return JDTheme.me
        }
        return JDTheme.primaryText
    }
}

private struct MonthTaskBar {
    let task: Task
    let lane: Int
    let color: Color
}

private struct WeekTaskBar {
    let task: Task
    let startIndex: Int
    let endIndex: Int
    let lane: Int
    let color: Color
    let continuesLeft: Bool
    let continuesRight: Bool
}

private struct SelectedDayPanel: View {
    let selectedDate: String
    let tasks: [Task]
    let habits: [Habit]
    let categories: [JDCategory]
    let onToggleTask: (Task) -> Void
    let onToggleHabit: (Habit, String) -> Void
    let onOpenTask: (UUID) -> Void
    let onOpenHabit: (UUID) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            dragHeader

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(groupedTasks, id: \.category.id) { group in
                        TaskGroupSection(
                            category: group.category,
                            tasks: group.tasks,
                            onToggleTask: onToggleTask,
                            onOpenTask: onOpenTask
                        )
                    }

                    if !habits.isEmpty {
                        HabitGroupSection(
                            habits: habits,
                            selectedDate: selectedDate,
                            onToggleHabit: onToggleHabit,
                            onOpenHabit: onOpenHabit
                        )
                    }

                    if tasks.isEmpty && habits.isEmpty {
                        Text("이 날엔 할일이 없어요. + 로 추가해보세요.")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(JDTheme.tertiaryText)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 32)
                    }
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 24)
    }

    private var dragHeader: some View {
        HStack(alignment: .firstTextBaseline) {
            Text("\(components.month)월 \(components.day)일")
                .font(.system(size: 18, weight: .bold))
            Text("\(weekdayName)요일\(selectedDate == JDDate.todayISO ? " · 오늘" : "")")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(JDTheme.secondaryText)
            Spacer()
            Text("\(tasks.count + habits.count)개")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(JDTheme.tertiaryText)
        }
        .padding(.top, 18)
        .padding(.bottom, 8)
    }

    private var components: (month: Int, day: Int) {
        let parts = JDDate.parts(selectedDate)
        return (parts.month, parts.day)
    }

    private var weekdayName: String {
        ["일", "월", "화", "수", "목", "금", "토"][JDDate.weekday(selectedDate)]
    }

    private var groupedTasks: [(category: JDCategory, tasks: [Task])] {
        categories.compactMap { category in
            let items = tasks.filter { $0.categoryID == category.id }
            return items.isEmpty ? nil : (category, items)
        }
    }
}

private struct TaskGroupSection: View {
    let category: JDCategory
    let tasks: [Task]
    let onToggleTask: (Task) -> Void
    let onOpenTask: (UUID) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            SectionHeader(title: category.name, count: tasks.count, color: category.displayColor)
            ForEach(Array(tasks.enumerated()), id: \.element.id) { index, task in
                TaskRow(
                    task: task,
                    color: category.displayColor,
                    isLast: index == tasks.count - 1,
                    onToggle: { onToggleTask(task) },
                    onOpen: { onOpenTask(task.id) }
                )
            }
        }
        .padding(.top, 14)
    }
}

private struct HabitGroupSection: View {
    let habits: [Habit]
    let selectedDate: String
    let onToggleHabit: (Habit, String) -> Void
    let onOpenHabit: (UUID) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            SectionHeader(title: "Habit", count: habits.count, color: JDTheme.habit)
            ForEach(Array(habits.enumerated()), id: \.element.id) { index, habit in
                HabitRow(
                    habit: habit,
                    selectedDate: selectedDate,
                    isLast: index == habits.count - 1,
                    onToggle: { onToggleHabit(habit, selectedDate) },
                    onOpen: { onOpenHabit(habit.id) }
                )
            }
        }
        .padding(.top, 14)
    }
}

private struct SectionHeader: View {
    let title: String
    let count: Int
    let color: Color

    var body: some View {
        HStack(spacing: 6) {
            RoundedRectangle(cornerRadius: 2)
                .fill(color)
                .frame(width: 3, height: 12)
            Text("[\(title)]")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(color)
            Text(String(count))
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(JDTheme.tertiaryText)
        }
        .padding(.bottom, 4)
    }
}

private struct TaskRow: View {
    let task: Task
    let color: Color
    let isLast: Bool
    let onToggle: () -> Void
    let onOpen: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Button(action: onToggle) {
                CheckCircle(isChecked: task.isCompleted, color: color)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(task.isCompleted ? "Task 완료 취소" : "Task 완료")

            Button(action: onOpen) {
                HStack(spacing: 12) {
                    taskContent
                    Spacer()
                    Text(taskDetailText)
                        .font(.system(size: 12, weight: .regular))
                        .foregroundStyle(JDTheme.secondaryText)
                        .monospacedDigit()
                }
            }
            .buttonStyle(.plain)
        }
        .padding(.vertical, 11)
        .overlay(alignment: .bottom) {
            if !isLast {
                Rectangle()
                    .fill(JDTheme.divider)
                    .frame(height: 0.5)
                    .padding(.leading, 32)
            }
        }
    }

    private var taskContent: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 6) {
                Text(task.title)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(task.isCompleted ? JDTheme.tertiaryText : JDTheme.primaryText)
                    .strikethrough(task.isCompleted)
                    .lineLimit(1)
                if task.priority == .high {
                    Text("!")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(JDTheme.external)
                        .padding(.horizontal, 4)
                        .padding(.vertical, 1)
                        .background(JDTheme.external.opacity(0.14))
                        .clipShape(RoundedRectangle(cornerRadius: 3))
                }
            }
            if !task.tags.isEmpty {
                Text(task.tags.joined(separator: " "))
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(JDTheme.tertiaryText)
            }
        }
    }

    private var taskDetailText: String {
        if task.startDate != task.endDate {
            return "\(JDDate.monthDay(task.startDate)) - \(JDDate.monthDay(task.endDate))"
        }
        return JDDate.formatTime(task.scheduledTime)
    }
}

private struct HabitRow: View {
    let habit: Habit
    let selectedDate: String
    let isLast: Bool
    let onToggle: () -> Void
    let onOpen: () -> Void

    private var isDone: Bool {
        habit.log[selectedDate] == 1
    }

    var body: some View {
        HStack(spacing: 12) {
            Button(action: onToggle) {
                CheckCircle(isChecked: isDone, color: JDTheme.habit)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(isDone ? "Habit 완료 취소" : "Habit 완료")

            Button(action: onOpen) {
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(habit.emoji) \(habit.title)")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(isDone ? JDTheme.tertiaryText : JDTheme.primaryText)
                            .strikethrough(isDone)
                        Text("🔥 \(JDDate.habitStreak(habit, selectedDate: selectedDate))일째")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(JDTheme.habit)
                    }
                    Spacer()
                }
            }
            .buttonStyle(.plain)
        }
        .padding(.vertical, 11)
        .overlay(alignment: .bottom) {
            if !isLast {
                Rectangle()
                    .fill(JDTheme.divider)
                    .frame(height: 0.5)
                    .padding(.leading, 32)
            }
        }
    }
}

private struct CheckCircle: View {
    let isChecked: Bool
    let color: Color

    var body: some View {
        Image(systemName: isChecked ? "checkmark.circle.fill" : "circle")
            .font(.system(size: 21, weight: .medium))
            .foregroundStyle(isChecked ? color : JDTheme.dividerStrong)
    }
}

private struct AddTaskSheet: View {
    private enum Mode: String, CaseIterable, Identifiable {
        case task = "Task"
        case habit = "Habit"

        var id: String { rawValue }
    }

    private enum ScheduleField: Identifiable {
        case start
        case end

        var id: String {
            switch self {
            case .start: "start"
            case .end: "end"
            }
        }

        var title: String {
            switch self {
            case .start: "시작"
            case .end: "종료"
            }
        }
    }

    let selectedDate: String
    let categories: [JDCategory]
    let onSaveTask: (TaskDraft) -> Void
    let onSaveHabit: (String, String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var mode: Mode = .task
    @State private var title = ""
    @State private var selectedCategoryID: UUID?
    @State private var startDateValue = Date()
    @State private var endDateValue = Date()
    @State private var includesTime = false
    @State private var editingScheduleField: ScheduleField?
    @State private var selectedPriority: Priority = .medium
    @State private var selectedEmoji = "🌱"

    private let emojis = ["🌱", "💧", "🏃", "📖", "🧘", "✏️"]
    private let priorities: [(Priority, String)] = [(.high, "높음"), (.medium, "중간"), (.low, "낮음")]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Capsule()
                .fill(JDTheme.dividerStrong)
                .frame(width: 36, height: 4)
                .frame(maxWidth: .infinity)
                .padding(.bottom, 16)
            Picker("Type", selection: $mode) {
                ForEach(Mode.allCases) { mode in
                    Text(mode.rawValue).tag(mode)
                }
            }
            .pickerStyle(.segmented)
            .padding(3)
            .background(JDTheme.surfaceAlt)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .padding(.bottom, 18)

            TextField(mode == .task ? "무엇을 할까요?" : "어떤 습관을?", text: $title)
                .font(.system(size: 20, weight: .bold))
                .textInputAutocapitalization(.never)
                .padding(.bottom, 12)
                .overlay(alignment: .bottom) {
                    Rectangle()
                        .fill(JDTheme.divider)
                        .frame(height: 0.5)
                }

            if mode == .task {
                AddSheetFieldRow(label: "시작") {
                    ScheduleValueButton(date: startDateValue, includesTime: includesTime) {
                        editingScheduleField = .start
                    }
                }
                AddSheetFieldRow(label: "종료") {
                    ScheduleValueButton(date: endDateValue, includesTime: includesTime) {
                        editingScheduleField = .end
                    }
                }
                if !categories.isEmpty {
                    AddSheetFieldRow(label: "카테고리") {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 6) {
                                ForEach(categories) { category in
                                    Button {
                                        selectedCategoryID = category.id
                                    } label: {
                                        Text(category.name)
                                            .font(.system(size: 11, weight: .semibold))
                                            .foregroundStyle(selectedCategoryID == category.id ? category.displayColor : JDTheme.secondaryText)
                                            .padding(.horizontal, 10)
                                            .padding(.vertical, 5)
                                            .background(selectedCategoryID == category.id ? category.displayColor.opacity(0.14) : .clear)
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 6)
                                                    .stroke(selectedCategoryID == category.id ? .clear : JDTheme.divider, lineWidth: 0.5)
                                            )
                                            .clipShape(RoundedRectangle(cornerRadius: 6))
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }
                }
                AddSheetFieldRow(label: "우선순위", noBorder: true) {
                    HStack(spacing: 6) {
                        ForEach(priorities, id: \.0.rawValue) { priority, label in
                            Button {
                                selectedPriority = priority
                            } label: {
                                Text(label)
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundStyle(selectedPriority == priority ? selectedCategoryColor : JDTheme.secondaryText)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(selectedPriority == priority ? selectedCategoryColor.opacity(0.14) : .clear)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 7)
                                            .stroke(selectedPriority == priority ? .clear : JDTheme.divider, lineWidth: 0.5)
                                    )
                                    .clipShape(RoundedRectangle(cornerRadius: 7))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            if mode == .habit {
                AddSheetFieldRow(label: "이모지", noBorder: true) {
                    HStack(spacing: 6) {
                        ForEach(emojis, id: \.self) { emoji in
                            Button {
                                selectedEmoji = emoji
                            } label: {
                                Text(emoji)
                                    .font(.system(size: 18))
                                    .frame(width: 34, height: 34)
                                    .background(selectedEmoji == emoji ? JDTheme.habit.opacity(0.18) : .clear)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 8)
                                            .stroke(selectedEmoji == emoji ? .clear : JDTheme.divider, lineWidth: 0.5)
                                    )
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            HStack(spacing: 10) {
                Spacer()
                Button("취소") {
                    dismiss()
                }
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(JDTheme.secondaryText)
                .padding(.horizontal, 14)
                .padding(.vertical, 11)

                Button {
                    submit()
                } label: {
                    Text("추가")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 22)
                        .padding(.vertical, 11)
                        .background(canSubmit ? JDTheme.accent : JDTheme.dividerStrong)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .buttonStyle(.plain)
                .disabled(!canSubmit)
            }
            .padding(.top, 18)
        }
        .padding(.horizontal, 20)
        .padding(.top, 10)
        .padding(.bottom, 30)
        .frame(maxHeight: .infinity, alignment: .top)
        .background(JDTheme.surface)
        .onAppear {
            selectedCategoryID = selectedCategoryID ?? categories.first?.id
            let initialDate = Self.date(from: selectedDate)
            startDateValue = initialDate
            endDateValue = initialDate
        }
        .sheet(item: $editingScheduleField) { field in
            DateTimeWheelSheet(
                title: field.title,
                date: field == .start ? $startDateValue : $endDateValue,
                includesTime: $includesTime,
                minimumDate: field == .end ? startDateValue : nil,
                onDone: {
                    if startDateValue > endDateValue {
                        endDateValue = startDateValue
                    }
                    editingScheduleField = nil
                }
            )
            .presentationDetents([.height(330)])
            .presentationDragIndicator(.visible)
            .presentationCornerRadius(22)
            .presentationBackground(JDTheme.surface)
        }
    }

    private var canSubmit: Bool {
        !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private var selectedCategoryColor: Color {
        categories.first { $0.id == selectedCategoryID }?.displayColor ?? JDTheme.me
    }

    private func submit() {
        guard canSubmit else {
            return
        }
        switch mode {
        case .task:
            onSaveTask(
                TaskDraft(
                    title: title,
                    categoryID: selectedCategoryID ?? categories.first?.id,
                    startDate: Self.isoDate(from: startDateValue),
                    endDate: Self.isoDate(from: endDateValue),
                    priority: selectedPriority,
                    scheduledTime: includesTime ? Self.timeString(from: startDateValue) : nil
                )
            )
        case .habit:
            onSaveHabit(title, selectedEmoji)
        }
        dismiss()
    }

    private static func date(from iso: String) -> Date {
        let parts = JDDate.parts(iso)
        let now = Calendar.current.dateComponents([.hour, .minute], from: Date())
        var components = DateComponents()
        components.year = parts.year
        components.month = parts.month
        components.day = parts.day
        components.hour = now.hour
        components.minute = now.minute
        return Calendar.current.date(from: components) ?? Date()
    }

    private static func isoDate(from date: Date) -> String {
        let parts = Calendar.current.dateComponents([.year, .month, .day], from: date)
        return String(
            format: "%04d-%02d-%02d",
            parts.year ?? 2026,
            parts.month ?? 1,
            parts.day ?? 1
        )
    }

    private static func timeString(from date: Date) -> String {
        let parts = Calendar.current.dateComponents([.hour, .minute], from: date)
        return String(format: "%02d:%02d", parts.hour ?? 0, parts.minute ?? 0)
    }
}

private struct ScheduleValueButton: View {
    let date: Date
    let includesTime: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Text(Self.dateFormatter.string(from: date))
                if includesTime {
                    Text(Self.timeFormatter.string(from: date))
                        .foregroundStyle(JDTheme.accent)
                }
            }
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(JDTheme.primaryText)
            .lineLimit(1)
            .minimumScaleFactor(0.85)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(JDTheme.surfaceAlt)
            .clipShape(RoundedRectangle(cornerRadius: 7))
        }
        .buttonStyle(.plain)
    }

    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ko_KR")
        formatter.dateFormat = "yyyy. M. d."
        return formatter
    }()

    private static let timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ko_KR")
        formatter.dateFormat = "HH:mm"
        return formatter
    }()
}

private struct DateTimeWheelSheet: View {
    let title: String
    @Binding var date: Date
    @Binding var includesTime: Bool
    var minimumDate: Date?
    let onDone: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                Text(title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(JDTheme.primaryText)
                Spacer()
                SmallTimeToggle(isOn: $includesTime)
                Button("완료", action: onDone)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(JDTheme.accent)
            }
            .padding(.horizontal, 20)
            .padding(.top, 12)

            Divider()

            DatePicker(
                "",
                selection: $date,
                in: (minimumDate ?? Date.distantPast)...,
                displayedComponents: includesTime ? [.date, .hourAndMinute] : [.date]
            )
            .datePickerStyle(.wheel)
            .labelsHidden()
            .tint(JDTheme.accent)
            .scaleEffect(0.9)
            .frame(maxWidth: .infinity)
            .frame(height: 220)
            .clipped()
        }
        .background(JDTheme.surface)
    }
}

private struct SmallTimeToggle: View {
    @Binding var isOn: Bool

    var body: some View {
        Button {
            isOn.toggle()
        } label: {
            HStack(spacing: 6) {
                Text("시간 포함")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(isOn ? JDTheme.primaryText : JDTheme.secondaryText)
                ZStack(alignment: isOn ? .trailing : .leading) {
                    Capsule()
                        .fill(isOn ? JDTheme.accent : JDTheme.dividerStrong)
                        .frame(width: 30, height: 18)
                    Circle()
                        .fill(JDTheme.surface)
                        .frame(width: 14, height: 14)
                        .padding(.horizontal, 2)
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(JDTheme.surfaceAlt)
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("시간 포함")
        .accessibilityValue(isOn ? "켬" : "끔")
    }
}

private struct AddSheetFieldRow<Content: View>: View {
    let label: String
    var noBorder = false
    @ViewBuilder let content: Content

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            Text(label)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(JDTheme.tertiaryText)
                .frame(width: 72, alignment: .leading)
            content
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.vertical, 13)
        .overlay(alignment: .bottom) {
            if !noBorder {
                Rectangle()
                    .fill(JDTheme.divider)
                    .frame(height: 0.5)
            }
        }
    }
}

private struct StatsRootTabView: View {
    let snapshot: AppSnapshot?
    let year: Int
    let month: Int
    let onToggleHabit: (Habit, String) -> Void

    private var tasks: [Task] { snapshot?.tasks ?? [] }
    private var habits: [Habit] { snapshot?.habits ?? [] }
    private var categories: [JDCategory] { snapshot?.categories ?? [] }

    private var monthTasks: [Task] {
        let start = JDDate.iso(year: year, month: month, day: 1)
        let end = JDDate.iso(year: year, month: month, day: JDDate.days(year: year, month: month))
        return tasks.filter { !($0.endDate < start || $0.startDate > end) }
    }

    private var days7: [String] {
        (0..<7).map { JDDate.addDays(JDDate.todayISO, $0 - 6) }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("통계")
                    .font(.system(size: 28, weight: .bold))

                VStack(alignment: .leading, spacing: 3) {
                    Text(verbatim: "\(year)년 \(month)월")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(JDTheme.me)
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text(String(monthTasks.filter(\.isCompleted).count))
                            .font(.system(size: 36, weight: .bold))
                            .monospacedDigit()
                        Text("/ \(monthTasks.count)개 완료")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(JDTheme.secondaryText)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(16)
                .background(
                    LinearGradient(
                        colors: [JDTheme.me.opacity(0.18), JDTheme.habit.opacity(0.18)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .clipShape(RoundedRectangle(cornerRadius: 14))

                StatsSectionLabel("TASK")
                VStack(spacing: 12) {
                    ForEach(categoryStats, id: \.id) { stat in
                        CategoryProgressRow(stat: stat)
                    }
                }
                .padding(16)
                .background(JDTheme.surface)
                .clipShape(RoundedRectangle(cornerRadius: 16))

                StatsSectionLabel("HABIT")
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: min(max(habits.count, 1), 3)), spacing: 8) {
                    ForEach(habits.prefix(3)) { habit in
                        HabitStatCard(habit: habit)
                    }
                }

                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("최근 7일 습관")
                            .font(.system(size: 13, weight: .semibold))
                        Spacer()
                        Text("최근 7일")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(JDTheme.tertiaryText)
                    }
                    ForEach(habits) { habit in
                        HabitSevenDayRow(habit: habit, days: days7, onToggle: onToggleHabit)
                    }
                }
                .padding(16)
                .background(JDTheme.surface)
                .clipShape(RoundedRectangle(cornerRadius: 16))
            }
            .padding(.horizontal, 20)
            .padding(.top, 18)
        }
        .background(JDTheme.background)
    }

    private var categoryStats: [CategoryProgressStat] {
        let fallback = CategoryProgressStat(id: UUID(), title: "Task", color: JDTheme.me, done: monthTasks.filter(\.isCompleted).count, total: monthTasks.count)
        guard !categories.isEmpty else {
            return [fallback]
        }
        return categories.map { category in
            let items = monthTasks.filter { $0.categoryID == category.id }
            return CategoryProgressStat(
                id: category.id,
                title: category.name,
                color: category.displayColor,
                done: items.filter(\.isCompleted).count,
                total: items.count
            )
        }
    }
}

private struct SettingsRootTabView: View {
    let settings: Settings?
    let authProfile: AuthProfile?
    @Binding var isDarkMode: Bool
    let actionMessage: String?
    let syncStatus: AppSyncStatus
    let onSetNotify: (Bool) -> Void
    let onSetNotifyTime: (String) -> Void
    let onSetWeekStart: (Int) -> Void
    let onManageHabits: () -> Void
    let onManageCategories: () -> Void
    let onExportData: () -> Void
    let onResetData: () -> Void
    let onRetrySync: () -> Void
    let onSignOut: () -> Void

    @State private var localNotify = true
    @State private var isShowingAccountDetail = false
    @State private var isShowingNotifyTimePicker = false
    @State private var notifyTimeValue = Date()
    @State private var isShowingWeekStartPicker = false
    @State private var weekStartValue = 0
    @State private var accountMessage: String?
    @State private var isShowingResetConfirmation = false
    @State private var legalDocument: LegalDocument?
    @State private var settingsMessage: String?

    private var resolvedProfile: AuthProfile {
        authProfile ?? AuthProfile(email: nil, displayName: nil, avatarURL: nil)
    }

    private var isProPlan: Bool {
        (settings?.plan ?? "free") == "pro"
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Text("설정")
                    .font(.system(size: 28, weight: .bold))
                    .padding(.horizontal, 20)
                    .padding(.top, 18)
                    .padding(.bottom, 18)

                SettingGroup(label: "계정") {
                    SettingsRow(
                        title: resolvedProfile.title,
                        detail: resolvedProfile.detail,
                        avatar: true,
                        avatarText: resolvedProfile.initials,
                        chevron: true,
                        isLast: true
                    ) {
                        isShowingAccountDetail = true
                    }
                }
                if let accountMessage {
                    Text(accountMessage)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(JDTheme.secondaryText)
                        .padding(.horizontal, 34)
                        .padding(.top, -12)
                        .padding(.bottom, 12)
                        .transition(.opacity)
                }
                SettingGroup(label: "알림") {
                    SettingsRow(
                        title: "알림",
                        right: AnyView(ToggleSwitch(isOn: notifyBinding))
                    )
                    SettingsRow(
                        title: "알림 시간",
                        detail: settings?.notifyTime ?? "09:00",
                        chevron: true,
                        isLast: true,
                        action: {
                            notifyTimeValue = Self.date(fromTime: settings?.notifyTime ?? "09:00")
                            isShowingNotifyTimePicker = true
                        }
                    )
                }
                SettingGroup(label: "디스플레이") {
                    SettingsRow(title: "다크모드", right: AnyView(ToggleSwitch(isOn: $isDarkMode)))
                    SettingsRow(
                        title: "캘린더 시작 요일",
                        detail: (settings?.weekStart ?? 0) == 0 ? "일요일" : "월요일",
                        chevron: true,
                        isLast: true,
                        action: {
                            weekStartValue = settings?.weekStart ?? 0
                            isShowingWeekStartPicker = true
                        }
                    )
                }
                SettingGroup(label: "구독") {
                    SettingsRow(title: "현재 플랜", detail: (settings?.plan ?? "free") == "pro" ? "Pro" : "Free", chevron: true)
                    SettingsRow(title: "Pro로 업그레이드", pro: true, chevron: true, isLast: true)
                }
                SettingGroup(label: "데이터") {
                    SyncStatusRow(status: syncStatus, actionMessage: actionMessage, onRetry: onRetrySync)
                    SettingsRow(title: "습관 관리", chevron: true, action: onManageHabits)
                    SettingsRow(title: "카테고리 관리", chevron: true, action: onManageCategories)
                    SettingsRow(
                        title: "데이터 내보내기",
                        pro: true,
                        chevron: true,
                        action: {
                            guard isProPlan else {
                                settingsMessage = "데이터 내보내기는 Pro 버전에서 사용할 수 있습니다."
                                return
                            }
                            onExportData()
                        }
                    )
                    SettingsRow(
                        title: "모든 데이터 초기화",
                        danger: true,
                        isLast: true,
                        action: { isShowingResetConfirmation = true }
                    )
                }
                SettingGroup(label: "앱 정보") {
                    SettingsRow(title: "버전", detail: "1.0.2")
                    SettingsRow(title: "이용약관", chevron: true, action: { legalDocument = .terms })
                    SettingsRow(title: "개인정보처리방침", chevron: true, isLast: true, action: { legalDocument = .privacy })
                }
                if let settingsMessage {
                    Text(settingsMessage)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(JDTheme.secondaryText)
                        .padding(.horizontal, 20)
                        .padding(.top, -8)
                        .padding(.bottom, 18)
                }
            }
            .padding(.bottom, 8)
        }
        .background(JDTheme.background)
        .onAppear {
            localNotify = settings?.notify ?? true
            notifyTimeValue = Self.date(fromTime: settings?.notifyTime ?? "09:00")
            weekStartValue = settings?.weekStart ?? 0
        }
        .onChange(of: settings?.notify ?? true) { _, value in
            localNotify = value
        }
        .sheet(isPresented: $isShowingAccountDetail) {
            AccountDetailSheet(
                profile: resolvedProfile,
                plan: (settings?.plan ?? "free") == "pro" ? "Pro" : "Free",
                message: accountMessage,
                onChangeAccount: {
                    isShowingAccountDetail = false
                    onSignOut()
                },
                onSignOut: {
                    isShowingAccountDetail = false
                    onSignOut()
                },
                onDeleteAccount: {
                    accountMessage = "회원 탈퇴는 서버 API 연결 후 활성화됩니다."
                }
            )
            .presentationDetents([.medium])
            .presentationDragIndicator(.visible)
            .presentationCornerRadius(22)
            .presentationBackground(JDTheme.surface)
        }
        .sheet(isPresented: $isShowingNotifyTimePicker) {
            TimePickerSheet(
                title: "알림 시간",
                date: $notifyTimeValue,
                onDone: {
                    onSetNotifyTime(Self.timeString(from: notifyTimeValue))
                    isShowingNotifyTimePicker = false
                }
            )
            .presentationDetents([.height(280)])
            .presentationDragIndicator(.visible)
            .presentationCornerRadius(22)
            .presentationBackground(JDTheme.surface)
        }
        .sheet(isPresented: $isShowingWeekStartPicker) {
            WeekStartPickerSheet(
                selection: $weekStartValue,
                onDone: {
                    onSetWeekStart(weekStartValue)
                    isShowingWeekStartPicker = false
                }
            )
            .presentationDetents([.height(280)])
            .presentationDragIndicator(.visible)
            .presentationCornerRadius(22)
            .presentationBackground(JDTheme.surface)
        }
        .sheet(item: $legalDocument) { document in
            LegalDocumentSheet(document: document)
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
                .presentationCornerRadius(22)
                .presentationBackground(JDTheme.surface)
        }
        .confirmationDialog(
            "모든 데이터를 초기화할까요?",
            isPresented: $isShowingResetConfirmation,
            titleVisibility: .visible
        ) {
            Button("초기화", role: .destructive) {
                onResetData()
            }
            Button("취소", role: .cancel) {}
        } message: {
            Text("할 일, 습관, 카테고리 데이터가 삭제됩니다. 동기화 대기열에 삭제 작업이 추가됩니다.")
        }
    }

    private var notifyBinding: Binding<Bool> {
        Binding(
            get: { localNotify },
            set: { value in
                localNotify = value
                onSetNotify(value)
            }
        )
    }

    private static func date(fromTime time: String) -> Date {
        let parts = time.split(separator: ":").compactMap { Int($0) }
        var components = DateComponents()
        components.hour = min(max(parts.first ?? 9, 0), 23)
        components.minute = min(max(parts.dropFirst().first ?? 0, 0), 59)
        return Calendar.current.date(from: components) ?? Date()
    }

    private static func timeString(from date: Date) -> String {
        let parts = Calendar.current.dateComponents([.hour, .minute], from: date)
        return String(format: "%02d:%02d", parts.hour ?? 9, parts.minute ?? 0)
    }
}

private struct TimePickerSheet: View {
    let title: String
    @Binding var date: Date
    let onDone: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Text(title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(JDTheme.primaryText)
                Spacer()
                Button("완료", action: onDone)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(JDTheme.accent)
            }
            .padding(.horizontal, 20)
            .padding(.top, 12)

            Divider()

            DatePicker("", selection: $date, displayedComponents: .hourAndMinute)
                .datePickerStyle(.wheel)
                .labelsHidden()
                .tint(JDTheme.accent)
                .scaleEffect(0.9)
                .frame(maxWidth: .infinity)
                .frame(height: 170)
                .clipped()
        }
        .background(JDTheme.surface)
    }
}

private struct WeekStartPickerSheet: View {
    @Binding var selection: Int
    let onDone: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Text("캘린더 시작 요일")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(JDTheme.primaryText)
                Spacer()
                Button("완료", action: onDone)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(JDTheme.accent)
            }
            .padding(.horizontal, 20)
            .padding(.top, 12)

            Divider()

            Picker("캘린더 시작 요일", selection: $selection) {
                Text("일요일").tag(0)
                Text("월요일").tag(1)
            }
            .pickerStyle(.wheel)
            .labelsHidden()
            .frame(maxWidth: .infinity)
            .frame(height: 170)
            .clipped()
        }
        .background(JDTheme.surface)
    }
}

private struct AccountDetailSheet: View {
    let profile: AuthProfile
    let plan: String
    let message: String?
    let onChangeAccount: () -> Void
    let onSignOut: () -> Void
    let onDeleteAccount: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(spacing: 14) {
                Circle()
                    .fill(LinearGradient(colors: [JDTheme.me, JDTheme.habit], startPoint: .topLeading, endPoint: .bottomTrailing))
                    .frame(width: 48, height: 48)
                    .overlay {
                        Text(profile.initials)
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(.white)
                    }

                VStack(alignment: .leading, spacing: 4) {
                    Text(profile.title)
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(JDTheme.primaryText)
                    Text(profile.detail)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(JDTheme.secondaryText)
                }
                Spacer()
            }
            .padding(.top, 10)

            VStack(spacing: 0) {
                AccountInfoRow(title: "이름", value: profile.title)
                AccountInfoRow(title: "이메일", value: profile.email ?? "-")
                AccountInfoRow(title: "로그인 방식", value: "Google")
                AccountInfoRow(title: "현재 플랜", value: plan, isLast: true)
            }
            .background(JDTheme.surfaceAlt)
            .clipShape(RoundedRectangle(cornerRadius: 12))

            VStack(spacing: 0) {
                SettingsRow(title: "계정 변경", chevron: true, action: onChangeAccount)
                SettingsRow(title: "로그아웃", danger: true, action: onSignOut)
                SettingsRow(title: "회원 탈퇴", danger: true, isLast: true, action: onDeleteAccount)
            }
            .background(JDTheme.surfaceAlt)
            .clipShape(RoundedRectangle(cornerRadius: 12))

            if let message {
                Text(message)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(JDTheme.secondaryText)
                    .padding(.horizontal, 2)
            }

            Spacer(minLength: 0)
        }
        .padding(.horizontal, 20)
        .padding(.top, 18)
        .background(JDTheme.surface)
    }
}

private struct AccountInfoRow: View {
    let title: String
    let value: String
    var isLast = false

    var body: some View {
        HStack(spacing: 12) {
            Text(title)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(JDTheme.secondaryText)
            Spacer()
            Text(value)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(JDTheme.primaryText)
                .lineLimit(1)
                .truncationMode(.middle)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 13)
        .overlay(alignment: .bottom) {
            if !isLast {
                Rectangle()
                    .fill(JDTheme.divider)
                    .frame(height: 0.5)
                    .padding(.leading, 14)
            }
        }
    }
}

private struct ExportFile: Identifiable {
    let url: URL

    var id: String {
        url.absoluteString
    }
}

private struct DataExportSheet: View {
    let url: URL

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("데이터 내보내기")
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(JDTheme.primaryText)
            Text("CSV 파일이 준비되었습니다. Excel 또는 Numbers에서 열 수 있습니다.")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(JDTheme.secondaryText)
                .fixedSize(horizontal: false, vertical: true)
            ShareLink(item: url) {
                HStack(spacing: 8) {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 14, weight: .semibold))
                    Text("CSV 파일 공유")
                        .font(.system(size: 14, weight: .semibold))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(JDTheme.accent)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            Spacer(minLength: 0)
        }
        .padding(20)
        .background(JDTheme.surface)
    }
}

private enum CSVExporter {
    nonisolated static func makeCSV(snapshot: AppSnapshot) -> String {
        var rows: [[String]] = [
            ["type", "id", "title", "category", "date", "time", "status", "priority", "tags", "extra"]
        ]
        let categoriesByID = Dictionary(uniqueKeysWithValues: snapshot.categories.map { ($0.id, $0.name) })

        rows += snapshot.tasks.map { task in
            [
                "task",
                task.id.uuidString,
                task.title,
                task.categoryID.flatMap { categoriesByID[$0] } ?? "",
                task.startDate == task.endDate ? task.startDate : "\(task.startDate)~\(task.endDate)",
                task.scheduledTime ?? "",
                task.isCompleted ? "completed" : "open",
                task.priority?.rawValue ?? "",
                task.tags.joined(separator: "|"),
                ""
            ]
        }

        rows += snapshot.habits.map { habit in
            let completed = habit.log.filter { $0.value == 1 }.map(\.key).sorted().joined(separator: "|")
            return [
                "habit",
                habit.id.uuidString,
                habit.title,
                "",
                habit.startedAt,
                habit.reminderTime ?? "",
                "active",
                "",
                "",
                "emoji=\(habit.emoji);completed=\(completed)"
            ]
        }

        rows += snapshot.categories.map { category in
            [
                "category",
                category.id.uuidString,
                category.name,
                "",
                "",
                "",
                category.isDefault ? "default" : "custom",
                "",
                "",
                "color=\(category.color);position=\(category.position)"
            ]
        }

        return rows.map { row in
            row.map(escape).joined(separator: ",")
        }
        .joined(separator: "\n")
    }

    nonisolated private static func escape(_ value: String) -> String {
        let escaped = value.replacingOccurrences(of: "\"", with: "\"\"")
        if escaped.contains(",") || escaped.contains("\"") || escaped.contains("\n") {
            return "\"\(escaped)\""
        }
        return escaped
    }
}

private enum LegalDocument: String, Identifiable {
    case terms
    case privacy

    var id: String { rawValue }

    var title: String {
        switch self {
        case .terms:
            return "이용약관"
        case .privacy:
            return "개인정보처리방침"
        }
    }

    var sections: [(String, String)] {
        switch self {
        case .terms:
            return [
                ("서비스 이용", "Just Do는 할 일과 습관을 기록하고 관리하기 위한 개인 생산성 서비스입니다. 사용자는 본인의 계정과 데이터 사용에 대한 책임을 가집니다."),
                ("계정", "Google 로그인을 통해 서비스를 사용할 수 있으며, 계정 정보는 로그인과 동기화 기능 제공을 위해 사용됩니다."),
                ("데이터", "사용자가 입력한 할 일, 습관, 카테고리, 설정 정보는 서비스 제공과 동기화를 위해 저장될 수 있습니다."),
                ("유료 기능", "Pro 기능과 결제 기능은 추후 별도 결제 정책과 함께 제공될 예정입니다."),
                ("변경", "본 약관은 서비스 개선 또는 정책 변경에 따라 업데이트될 수 있습니다.")
            ]
        case .privacy:
            return [
                ("수집 항목", "서비스는 Google 계정의 기본 프로필 정보, 이메일, 사용자가 입력한 할 일과 습관 데이터를 처리할 수 있습니다."),
                ("이용 목적", "수집된 정보는 로그인, 데이터 동기화, 위젯 표시, 사용자 설정 유지 등 서비스 제공 목적으로 사용됩니다."),
                ("보관", "데이터는 사용자가 서비스를 이용하는 동안 보관되며, 계정 삭제 기능 제공 시 삭제 요청에 따라 처리될 예정입니다."),
                ("제3자 제공", "법령에 따른 경우를 제외하고 사용자 정보를 임의로 제3자에게 제공하지 않습니다."),
                ("문의", "개인정보 관련 문의는 앱 내 고객지원 채널 또는 운영자가 제공하는 연락처를 통해 접수할 수 있습니다.")
            ]
        }
    }
}

private struct LegalDocumentSheet: View {
    let document: LegalDocument
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    ForEach(Array(document.sections.enumerated()), id: \.offset) { _, section in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(section.0)
                                .font(.system(size: 15, weight: .bold))
                                .foregroundStyle(JDTheme.primaryText)
                            Text(section.1)
                                .font(.system(size: 13, weight: .medium))
                                .lineSpacing(3)
                                .foregroundStyle(JDTheme.secondaryText)
                        }
                    }
                }
                .padding(20)
            }
            .background(JDTheme.background)
            .navigationTitle(document.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("닫기") { dismiss() }
                        .font(.system(size: 14, weight: .semibold))
                }
            }
        }
    }
}

private struct HabitManagementSheet: View {
    let habits: [Habit]
    let onAdd: (String, String) -> Void
    let onDelete: (Habit) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var emoji = "🌱"
    private let emojis = ["🌱", "💧", "🏃", "📖", "🧘", "✏️"]

    var body: some View {
        NavigationStack {
            List {
                Section("새 습관") {
                    TextField("습관 이름", text: $title)
                        .font(.system(size: 14, weight: .medium))
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(emojis, id: \.self) { item in
                                Button {
                                    emoji = item
                                } label: {
                                    Text(item)
                                        .font(.system(size: 15))
                                        .frame(width: 30, height: 30)
                                        .background(emoji == item ? JDTheme.habit.opacity(0.18) : .clear)
                                        .clipShape(RoundedRectangle(cornerRadius: 7))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                    Button("습관 추가") {
                        onAdd(title, emoji)
                        title = ""
                        emoji = "🌱"
                    }
                    .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    .font(.system(size: 14, weight: .semibold))
                }

                Section("습관 목록") {
                    ForEach(habits) { habit in
                        HStack(spacing: 10) {
                            Text(habit.emoji)
                                .font(.system(size: 16))
                            VStack(alignment: .leading, spacing: 2) {
                                Text(habit.title)
                                    .font(.system(size: 14, weight: .semibold))
                                Text("시작 \(JDDate.displayDate(habit.startedAt)) · \(JDDate.habitStreak(habit, selectedDate: JDDate.todayISO))일째")
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Button(role: .destructive) {
                                onDelete(habit)
                            } label: {
                                Image(systemName: "trash")
                                    .font(.system(size: 13, weight: .semibold))
                            }
                            .buttonStyle(.plain)
                        }
                        .padding(.vertical, 2)
                    }
                }
            }
            .font(.system(size: 13, weight: .medium))
            .listSectionSpacing(.compact)
            .navigationTitle("습관 관리")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("닫기") { dismiss() }
                        .font(.system(size: 14, weight: .semibold))
                }
            }
        }
    }
}

private struct CategoryManagementSheet: View {
    let categories: [JDCategory]
    let onAdd: (String, String) -> Void
    let onDelete: (JDCategory) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var selectedColor = "#558CB9"
    private let colors = ["#558CB9", "#C87A6D", "#69A17D", "#4F6FD8", "#D36A3A"]

    var body: some View {
        NavigationStack {
            List {
                Section("새 카테고리") {
                    TextField("카테고리 이름", text: $name)
                        .font(.system(size: 14, weight: .medium))
                    HStack(spacing: 10) {
                        ForEach(colors, id: \.self) { color in
                            Button {
                                selectedColor = color
                            } label: {
                                Circle()
                                    .fill(Color(hex: color) ?? JDTheme.me)
                                    .frame(width: 24, height: 24)
                                    .overlay {
                                        if selectedColor == color {
                                            Image(systemName: "checkmark")
                                                .font(.system(size: 9, weight: .bold))
                                                .foregroundStyle(.white)
                                        }
                                    }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    Button("카테고리 추가") {
                        onAdd(name, selectedColor)
                        name = ""
                        selectedColor = "#558CB9"
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    .font(.system(size: 14, weight: .semibold))
                }

                Section("카테고리 목록") {
                    ForEach(categories) { category in
                        HStack(spacing: 10) {
                            Circle()
                                .fill(category.displayColor)
                                .frame(width: 10, height: 10)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(category.name)
                                    .font(.system(size: 14, weight: .semibold))
                                Text(category.isDefault ? "기본 카테고리" : "사용자 카테고리")
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Button(role: .destructive) {
                                onDelete(category)
                            } label: {
                                Image(systemName: "trash")
                                    .font(.system(size: 13, weight: .semibold))
                            }
                            .buttonStyle(.plain)
                        }
                        .padding(.vertical, 2)
                    }
                }
            }
            .font(.system(size: 13, weight: .medium))
            .listSectionSpacing(.compact)
            .navigationTitle("카테고리 관리")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("닫기") { dismiss() }
                        .font(.system(size: 14, weight: .semibold))
                }
            }
        }
    }
}

private struct CategoryProgressStat {
    let id: UUID
    let title: String
    let color: Color
    let done: Int
    let total: Int

    var rate: Double {
        total == 0 ? 0 : Double(done) / Double(total)
    }
}

private struct StatsSectionLabel: View {
    let title: String

    init(_ title: String) {
        self.title = title
    }

    var body: some View {
        Text(title)
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(JDTheme.tertiaryText)
            .padding(.top, 4)
    }
}

private struct CategoryProgressRow: View {
    let stat: CategoryProgressStat

    var body: some View {
        VStack(spacing: 6) {
            HStack(spacing: 6) {
                Circle()
                    .fill(stat.color)
                    .frame(width: 7, height: 7)
                Text("[\(stat.title)]")
                    .font(.system(size: 12, weight: .semibold))
                Spacer()
                Text("\(stat.done) / \(stat.total)")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(JDTheme.secondaryText)
                Text("\(Int((stat.rate * 100).rounded()))%")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(stat.color)
                    .frame(width: 34, alignment: .trailing)
            }
            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Capsule().fill(JDTheme.surfaceAlt)
                    Capsule().fill(stat.color).frame(width: proxy.size.width * stat.rate)
                }
            }
            .frame(height: 6)
        }
    }
}

private struct HabitStatCard: View {
    let habit: Habit

    var body: some View {
        VStack(spacing: 4) {
            Text(habit.emoji)
                .font(.system(size: 22))
            Text(habit.title)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(JDTheme.secondaryText)
                .lineLimit(1)
            HStack(alignment: .firstTextBaseline, spacing: 1) {
                Text(String(JDDate.habitStreak(habit, selectedDate: JDDate.todayISO)))
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(JDTheme.habit)
                    .monospacedDigit()
                Text("일")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(JDTheme.tertiaryText)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .padding(.horizontal, 10)
        .background(JDTheme.surface)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

private struct HabitSevenDayRow: View {
    let habit: Habit
    let days: [String]
    let onToggle: (Habit, String) -> Void

    private var rate: Int {
        guard !days.isEmpty else { return 0 }
        let done = days.filter { habit.log[$0] == 1 }.count
        return Int((Double(done) / Double(days.count) * 100).rounded())
    }

    var body: some View {
        HStack(spacing: 10) {
            Text("\(habit.emoji) \(habit.title)")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(JDTheme.secondaryText)
                .lineLimit(1)
                .frame(width: 88, alignment: .leading)
            HStack(spacing: 4) {
                ForEach(days, id: \.self) { day in
                    Button {
                        onToggle(habit, day)
                    } label: {
                        Text(JDDate.weekdayName(day))
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundStyle(habit.log[day] == 1 ? .white : JDTheme.tertiaryText)
                            .frame(maxWidth: .infinity)
                            .frame(height: 26)
                        .frame(maxWidth: .infinity)
                        .background(habit.log[day] == 1 ? JDTheme.habit : JDTheme.surfaceAlt)
                        .clipShape(RoundedRectangle(cornerRadius: 5))
                    }
                    .buttonStyle(.plain)
                }
            }
            Text("\(rate)%")
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(JDTheme.habit)
                .frame(width: 30, alignment: .trailing)
        }
    }
}

private struct SettingGroup<Content: View>: View {
    let label: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(JDTheme.tertiaryText)
                .padding(.horizontal, 20)
            VStack(spacing: 0) {
                content
            }
            .background(JDTheme.surface)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .padding(.horizontal, 14)
        }
        .padding(.bottom, 22)
    }
}

private struct SettingsRow: View {
    let title: String
    var detail: String?
    var avatar = false
    var avatarText = "?"
    var danger = false
    var pro = false
    var chevron = false
    var isLast = false
    var right: AnyView?
    var action: (() -> Void)?

    var body: some View {
        Group {
            if let action {
                Button(action: action) {
                    rowContent
                }
                .buttonStyle(.plain)
            } else {
                rowContent
            }
        }
    }

    private var rowContent: some View {
        HStack(spacing: 12) {
            if avatar {
                Circle()
                    .fill(LinearGradient(colors: [JDTheme.me, JDTheme.habit], startPoint: .topLeading, endPoint: .bottomTrailing))
                    .frame(width: 28, height: 28)
                    .overlay {
                        Text(avatarText)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(.white)
                    }
            }
            HStack(spacing: 8) {
                Text(title)
                    .font(.system(size: 15, weight: .medium))
                if pro {
                    Text("PRO")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(JDTheme.me)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(JDTheme.me.opacity(0.12))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                }
            }
            .foregroundStyle(danger ? JDTheme.external : (pro ? JDTheme.me : JDTheme.primaryText))
            Spacer()
            if let detail {
                Text(detail)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(JDTheme.secondaryText)
            }
            if let right {
                right
            }
            if chevron {
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(JDTheme.tertiaryText)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 14)
        .padding(.vertical, 13)
        .frame(minHeight: 44)
        .contentShape(Rectangle())
        .overlay(alignment: .bottom) {
            if !isLast {
                Rectangle()
                    .fill(JDTheme.divider)
                    .frame(height: 0.5)
                    .padding(.leading, avatar ? 54 : 14)
            }
        }
    }
}

private struct SyncStatusRow: View {
    let status: AppSyncStatus
    let actionMessage: String?
    let onRetry: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 12) {
                Image(systemName: iconName)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(statusColor)
                    .frame(width: 24, height: 24)
                    .background(statusColor.opacity(0.12))
                    .clipShape(Circle())
                VStack(alignment: .leading, spacing: 3) {
                    Text("동기화")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(JDTheme.primaryText)
                    Text(status.title)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(statusColor)
                }
                Spacer()
                if case .syncing = status {
                    ProgressView()
                        .controlSize(.small)
                }
            }
            Text(actionMessage ?? status.message)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(JDTheme.secondaryText)
                .fixedSize(horizontal: false, vertical: true)
            if status.isFailed {
                Button("다시 시도", action: onRetry)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 7)
                    .background(JDTheme.primaryText)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 13)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(JDTheme.divider)
                .frame(height: 0.5)
                .padding(.leading, 14)
        }
    }

    private var iconName: String {
        switch status {
        case .unknown:
            return "questionmark.circle.fill"
        case .syncing:
            return "arrow.triangle.2.circlepath"
        case .synced:
            return "checkmark.circle.fill"
        case .pending:
            return "clock.fill"
        case .failed:
            return "exclamationmark.triangle.fill"
        }
    }

    private var statusColor: Color {
        switch status {
        case .unknown:
            return JDTheme.tertiaryText
        case .syncing:
            return JDTheme.me
        case .synced:
            return JDTheme.habit
        case .pending:
            return JDTheme.accent
        case .failed:
            return JDTheme.external
        }
    }
}

private struct ToggleSwitch: View {
    @Binding var isOn: Bool

    var body: some View {
        Button {
            isOn.toggle()
        } label: {
            Capsule()
                .fill(isOn ? JDTheme.me : JDTheme.dividerStrong)
                .frame(width: 42, height: 26)
                .overlay(alignment: isOn ? .trailing : .leading) {
                    Circle()
                        .fill(.white)
                        .frame(width: 22, height: 22)
                        .padding(2)
                        .shadow(color: .black.opacity(0.14), radius: 2, y: 1)
                }
        }
        .buttonStyle(.plain)
    }
}

private struct BottomTabBar: View {
    let selectedTab: RootTab
    let onSelect: (RootTab) -> Void

    var body: some View {
        HStack(spacing: 0) {
            ForEach(RootTab.allCases) { tab in
                Button {
                    onSelect(tab)
                } label: {
                    TabBarItem(
                        title: tab.title,
                        systemName: tab.systemName,
                        isSelected: selectedTab == tab
                    )
                }
                .frame(maxWidth: .infinity)
                .contentShape(Rectangle())
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 18)
        .padding(.top, 10)
        .padding(.bottom, 18)
        .background(.ultraThinMaterial)
    }
}

private struct TabBarItem: View {
    let title: String
    let systemName: String
    let isSelected: Bool

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: systemName)
                .font(.system(size: 18, weight: .semibold))
            Text(title)
                .font(.system(size: 11, weight: .semibold))
        }
        .foregroundStyle(isSelected ? JDTheme.accent : JDTheme.tertiaryText)
        .frame(maxWidth: .infinity)
    }
}

private struct JustDoWordmark: View {
    let size: CGFloat
    let dotSize: CGFloat

    var body: some View {
        HStack(alignment: .center, spacing: 4) {
            Text("Just Do")
                .font(.system(size: size, weight: .heavy))
                .tracking(size > 30 ? -2.4 : -0.6)
            Circle()
                .fill(JDTheme.accent)
                .frame(width: dotSize, height: dotSize)
        }
        .foregroundStyle(JDTheme.primaryText)
    }
}

private struct CalendarDay: Hashable {
    let iso: String
    let day: Int
    let isCurrentMonth: Bool
}

private enum JDTheme {
    static let background = adaptive(light: "#F6F4EF", dark: "#131210")
    static let surface = adaptive(light: "#FFFFFF", dark: "#1C1B18")
    static let surfaceAlt = adaptive(light: "#FBF9F4", dark: "#26241F")
    static let primaryText = adaptive(light: "#1C1A17", dark: "#F3F0EA")
    static let secondaryText = adaptive(light: "#908B82", dark: "#AAA49A")
    static let tertiaryText = adaptive(light: "#B7B1A7", dark: "#777168")
    static let divider = adaptive(light: "#E8E3DA", dark: "#34312B")
    static let dividerStrong = adaptive(light: "#D8D1C5", dark: "#4A463E")
    static let accent = Color(hex: "#558CB9")!
    static let me = Color(hex: "#558CB9")!
    static let external = Color(hex: "#C87A6D")!
    static let habit = Color(hex: "#69A17D")!

    private static func adaptive(light: String, dark: String) -> Color {
        Color(UIColor { traits in
            UIColor(hex: traits.userInterfaceStyle == .dark ? dark : light) ?? .clear
        })
    }
}

private enum JDDate {
    static var todayISO: String {
        let components = Calendar.current.dateComponents([.year, .month, .day], from: Date())
        return String(
            format: "%04d-%02d-%02d",
            components.year ?? 2026,
            components.month ?? 1,
            components.day ?? 1
        )
    }

    static var nowISODateTime: String {
        ISO8601DateFormatter().string(from: Date())
    }

    static var todayComponents: (year: Int, month: Int, day: Int) {
        parts(todayISO)
    }

    static func parts(_ iso: String) -> (year: Int, month: Int, day: Int) {
        let values = iso.split(separator: "-").compactMap { Int($0) }
        return (
            values.count > 0 ? values[0] : 2026,
            values.count > 1 ? values[1] : 1,
            values.count > 2 ? values[2] : 1
        )
    }

    static func monthGrid(year: Int, month: Int) -> [[CalendarDay]] {
        let firstWeekday = weekday(year: year, month: month, day: 1)
        let daysInMonth = days(year: year, month: month)
        let previous = addMonths(year: year, month: month, delta: -1)
        let previousDays = days(year: previous.year, month: previous.month)
        let next = addMonths(year: year, month: month, delta: 1)
        var cells: [CalendarDay] = []

        if firstWeekday > 0 {
            for offset in stride(from: firstWeekday - 1, through: 0, by: -1) {
                let day = previousDays - offset
                cells.append(CalendarDay(iso: iso(year: previous.year, month: previous.month, day: day), day: day, isCurrentMonth: false))
            }
        }

        for day in 1...daysInMonth {
            cells.append(CalendarDay(iso: iso(year: year, month: month, day: day), day: day, isCurrentMonth: true))
        }

        var day = 1
        while cells.count % 7 != 0 {
            cells.append(CalendarDay(iso: iso(year: next.year, month: next.month, day: day), day: day, isCurrentMonth: false))
            day += 1
        }

        return stride(from: 0, to: cells.count, by: 7).map {
            Array(cells[$0..<min($0 + 7, cells.count)])
        }
    }

    static func addMonths(year: Int, month: Int, delta: Int) -> (year: Int, month: Int) {
        var components = DateComponents()
        components.year = year
        components.month = month + delta
        components.day = 1
        let date = Calendar.current.date(from: components) ?? Date()
        let result = Calendar.current.dateComponents([.year, .month], from: date)
        return (result.year ?? year, result.month ?? month)
    }

    static func weekday(_ iso: String) -> Int {
        let p = parts(iso)
        return weekday(year: p.year, month: p.month, day: p.day)
    }

    static func weekdayName(_ iso: String) -> String {
        let names = ["일", "월", "화", "수", "목", "금", "토"]
        return names[weekday(iso)]
    }

    static func weekday(year: Int, month: Int, day: Int) -> Int {
        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = day
        let date = Calendar.current.date(from: components) ?? Date()
        return Calendar.current.component(.weekday, from: date) - 1
    }

    static func days(year: Int, month: Int) -> Int {
        var components = DateComponents()
        components.year = year
        components.month = month
        let date = Calendar.current.date(from: components) ?? Date()
        return Calendar.current.range(of: .day, in: .month, for: date)?.count ?? 30
    }

    static func iso(year: Int, month: Int, day: Int) -> String {
        String(format: "%04d-%02d-%02d", year, month, day)
    }

    static func normalizedISODate(_ value: String, fallback: String) -> String {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        let parts = trimmed.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3, (1...12).contains(parts[1]), (1...31).contains(parts[2]) else {
            return fallback
        }
        return iso(year: parts[0], month: parts[1], day: parts[2])
    }

    static func monthDay(_ iso: String) -> String {
        let p = parts(iso)
        return "\(p.month)/\(p.day)"
    }

    static func displayDate(_ iso: String) -> String {
        let p = parts(iso)
        return "\(p.month)월 \(p.day)일"
    }

    static func formatTime(_ time: String?) -> String {
        guard let time, !time.isEmpty else {
            return ""
        }
        let parts = time.split(separator: ":").compactMap { Int($0) }
        guard let hour = parts.first else {
            return time
        }
        let minute = parts.count > 1 ? parts[1] : 0
        let marker = hour >= 12 ? "오후" : "오전"
        let twelveHour = hour % 12 == 0 ? 12 : hour % 12
        return minute == 0 ? "\(marker) \(twelveHour)시" : String(format: "%@ %d:%02d", marker, twelveHour, minute)
    }

    static func habitStreak(_ habit: Habit, selectedDate: String) -> Int {
        var count = 0
        var current = selectedDate
        while habit.log[current] == 1 {
            count += 1
            current = addDays(current, -1)
        }
        return count
    }

    static func addDays(_ iso: String, _ delta: Int) -> String {
        let p = parts(iso)
        var components = DateComponents()
        components.year = p.year
        components.month = p.month
        components.day = p.day + delta
        let date = Calendar.current.date(from: components) ?? Date()
        let result = Calendar.current.dateComponents([.year, .month, .day], from: date)
        return self.iso(year: result.year ?? p.year, month: result.month ?? p.month, day: result.day ?? p.day)
    }
}

private extension JDCategory {
    var displayColor: Color {
        Color(hex: color) ?? JDTheme.me
    }
}

private extension Color {
    init?(hex: String) {
        var value = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if value.hasPrefix("#") {
            value.removeFirst()
        }
        guard value.count == 6, let intValue = Int(value, radix: 16) else {
            return nil
        }
        let red = Double((intValue >> 16) & 0xff) / 255
        let green = Double((intValue >> 8) & 0xff) / 255
        let blue = Double(intValue & 0xff) / 255
        self.init(red: red, green: green, blue: blue)
    }
}

private extension UIColor {
    convenience init?(hex: String) {
        var value = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if value.hasPrefix("#") {
            value.removeFirst()
        }
        guard value.count == 6, let intValue = Int(value, radix: 16) else {
            return nil
        }
        let red = CGFloat((intValue >> 16) & 0xff) / 255
        let green = CGFloat((intValue >> 8) & 0xff) / 255
        let blue = CGFloat(intValue & 0xff) / 255
        self.init(red: red, green: green, blue: blue, alpha: 1)
    }
}

private extension String {
    var nilIfBlank: String? {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
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
    let syncStatus: AppSyncStatusStore

    @Environment(\.dismiss) private var dismiss
    @State private var detail: DeepLinkDetail?
    @State private var categories: [JDCategory] = []
    @State private var isEditing = false
    @State private var message: DetailActionMessage?
    @State private var showingDeleteConfirmation = false

    var body: some View {
        DetailScreenScaffold(title: "Task Detail") {
            switch detail ?? loadDetail() {
            case .task(let task):
                if isEditing {
                    TaskDetailEditor(
                        task: task,
                        categories: categories,
                        onCancel: { isEditing = false },
                        onSave: saveTask
                    )
                } else {
                    TaskDetailContent(task: task)
                    DetailActionBar(
                        onEdit: { isEditing = true },
                        onDelete: { showingDeleteConfirmation = true }
                    )
                }
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
            if let message {
                DetailMessageView(message: message)
            }
        }
        .onAppear(perform: refresh)
        .alert("Task 삭제", isPresented: $showingDeleteConfirmation) {
            Button("취소", role: .cancel) {}
            Button("삭제", role: .destructive, action: deleteTask)
        } message: {
            Text("이 Task를 삭제하고 동기화 대기열에 반영합니다.")
        }
    }

    private func loadDetail() -> DeepLinkDetail {
        DeepLinkDetail(link: .task(id), snapshotStore: snapshotStore)
    }

    private func refresh() {
        detail = loadDetail()
        categories = (try? snapshotStore?.loadSnapshot().categories) ?? []
    }

    private func saveTask(_ task: Task) {
        guard let snapshotStore else {
            message = .error("로컬 저장소에 접근할 수 없습니다.")
            return
        }
        do {
            try snapshotStore.applyAndEnqueue(
                QueuedMutation(
                    id: UUID(),
                    updatedAt: JDDate.nowISODateTime,
                    mutation: .taskUpsert(task)
                )
            )
            isEditing = false
            message = .success("변경 사항을 저장했고 동기화 대기열에 추가했습니다.")
            refresh()
            syncStatus.refreshPendingCount(snapshotStore: snapshotStore)
        } catch {
            message = .error("Task 저장에 실패했습니다.")
        }
    }

    private func deleteTask() {
        guard let snapshotStore else {
            message = .error("로컬 저장소에 접근할 수 없습니다.")
            return
        }
        do {
            try snapshotStore.applyAndEnqueue(
                QueuedMutation(
                    id: UUID(),
                    updatedAt: JDDate.nowISODateTime,
                    mutation: .taskDelete(id: id)
                )
            )
            syncStatus.refreshPendingCount(snapshotStore: snapshotStore)
            dismiss()
        } catch {
            message = .error("Task 삭제에 실패했습니다.")
        }
    }
}

private struct HabitDetailScreen: View {
    let id: UUID
    let snapshotStore: CoreDataAppSnapshotStore?
    let syncStatus: AppSyncStatusStore

    @Environment(\.dismiss) private var dismiss
    @State private var detail: DeepLinkDetail?
    @State private var isEditing = false
    @State private var message: DetailActionMessage?
    @State private var showingDeleteConfirmation = false

    var body: some View {
        DetailScreenScaffold(title: "Habit Detail") {
            switch detail ?? loadDetail() {
            case .habit(let habit):
                if isEditing {
                    HabitDetailEditor(
                        habit: habit,
                        onCancel: { isEditing = false },
                        onSave: saveHabit
                    )
                } else {
                    HabitDetailContent(habit: habit)
                    DetailActionBar(
                        onEdit: { isEditing = true },
                        onDelete: { showingDeleteConfirmation = true }
                    )
                }
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
            if let message {
                DetailMessageView(message: message)
            }
        }
        .onAppear(perform: refresh)
        .alert("Habit 삭제", isPresented: $showingDeleteConfirmation) {
            Button("취소", role: .cancel) {}
            Button("삭제", role: .destructive, action: deleteHabit)
        } message: {
            Text("이 Habit을 삭제하고 동기화 대기열에 반영합니다.")
        }
    }

    private func loadDetail() -> DeepLinkDetail {
        DeepLinkDetail(link: .habit(id), snapshotStore: snapshotStore)
    }

    private func refresh() {
        detail = loadDetail()
    }

    private func saveHabit(_ habit: Habit) {
        guard let snapshotStore else {
            message = .error("로컬 저장소에 접근할 수 없습니다.")
            return
        }
        do {
            try snapshotStore.applyAndEnqueue(
                QueuedMutation(
                    id: UUID(),
                    updatedAt: JDDate.nowISODateTime,
                    mutation: .habitUpsert(habit)
                )
            )
            isEditing = false
            message = .success("변경 사항을 저장했고 동기화 대기열에 추가했습니다.")
            refresh()
            syncStatus.refreshPendingCount(snapshotStore: snapshotStore)
        } catch {
            message = .error("Habit 저장에 실패했습니다.")
        }
    }

    private func deleteHabit() {
        guard let snapshotStore else {
            message = .error("로컬 저장소에 접근할 수 없습니다.")
            return
        }
        do {
            try snapshotStore.applyAndEnqueue(
                QueuedMutation(
                    id: UUID(),
                    updatedAt: JDDate.nowISODateTime,
                    mutation: .habitDelete(id: id)
                )
            )
            syncStatus.refreshPendingCount(snapshotStore: snapshotStore)
            dismiss()
        } catch {
            message = .error("Habit 삭제에 실패했습니다.")
        }
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
                .accessibilityIdentifier("task-detail-title")
            DetailGrid(rows: [
                ("Status", task.isCompleted ? "Completed" : "Open"),
                ("Date", dateRange),
                ("Time", task.scheduledTime ?? "-"),
                ("Priority", task.priority?.rawValue.capitalized ?? "-"),
                ("Tags", task.tags.isEmpty ? "-" : task.tags.joined(separator: ", ")),
            ])
        }
        .accessibilityIdentifier("task-detail-content")
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
                .accessibilityIdentifier("habit-detail-title")
            DetailGrid(rows: [
                ("Started", habit.startedAt),
                ("Repeat", repeatDescription),
                ("Reminder", habit.reminderTime ?? "-"),
                ("Logged days", "\(habit.log.filter { $0.value == 1 }.count)"),
            ])
        }
        .accessibilityIdentifier("habit-detail-content")
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

private struct TaskDetailEditor: View {
    private enum ScheduleField: Identifiable {
        case start
        case end

        var id: String {
            switch self {
            case .start: "start"
            case .end: "end"
            }
        }

        var title: String {
            switch self {
            case .start: "시작"
            case .end: "종료"
            }
        }
    }

    let task: Task
    let categories: [JDCategory]
    let onCancel: () -> Void
    let onSave: (Task) -> Void

    @State private var title: String
    @State private var startDateValue: Date
    @State private var endDateValue: Date
    @State private var includesTime: Bool
    @State private var editingScheduleField: ScheduleField?
    @State private var selectedCategoryID: UUID?
    @State private var selectedPriority: Priority
    @State private var tagsText: String

    private let priorities: [(Priority, String)] = [(.high, "높음"), (.medium, "중간"), (.low, "낮음")]

    init(task: Task, categories: [JDCategory], onCancel: @escaping () -> Void, onSave: @escaping (Task) -> Void) {
        self.task = task
        self.categories = categories
        self.onCancel = onCancel
        self.onSave = onSave
        _title = State(initialValue: task.title)
        _startDateValue = State(initialValue: Self.date(from: task.startDate, time: task.scheduledTime))
        _endDateValue = State(initialValue: Self.date(from: task.endDate, time: task.scheduledTime))
        _includesTime = State(initialValue: task.scheduledTime != nil)
        _selectedCategoryID = State(initialValue: task.categoryID)
        _selectedPriority = State(initialValue: task.priority ?? .medium)
        _tagsText = State(initialValue: task.tags.joined(separator: ", "))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            TextField("무엇을 할까요?", text: $title)
                .font(.system(size: 20, weight: .bold))
                .textInputAutocapitalization(.never)
                .padding(.bottom, 12)
                .overlay(alignment: .bottom) {
                    Rectangle()
                        .fill(JDTheme.divider)
                        .frame(height: 0.5)
                }

            AddSheetFieldRow(label: "시작") {
                ScheduleValueButton(date: startDateValue, includesTime: includesTime) {
                    editingScheduleField = .start
                }
            }
            AddSheetFieldRow(label: "종료") {
                ScheduleValueButton(date: endDateValue, includesTime: includesTime) {
                    editingScheduleField = .end
                }
            }
            if !categories.isEmpty {
                AddSheetFieldRow(label: "카테고리") {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(categories) { category in
                                Button {
                                    selectedCategoryID = category.id
                                } label: {
                                    Text(category.name)
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundStyle(selectedCategoryID == category.id ? category.displayColor : JDTheme.secondaryText)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 5)
                                        .background(selectedCategoryID == category.id ? category.displayColor.opacity(0.14) : .clear)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 6)
                                                .stroke(selectedCategoryID == category.id ? .clear : JDTheme.divider, lineWidth: 0.5)
                                        )
                                        .clipShape(RoundedRectangle(cornerRadius: 6))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
            }
            AddSheetFieldRow(label: "우선순위") {
                HStack(spacing: 6) {
                    ForEach(priorities, id: \.0) { priority, label in
                        Button {
                            selectedPriority = priority
                        } label: {
                            Text(label)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(selectedPriority == priority ? selectedCategoryColor : JDTheme.secondaryText)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(selectedPriority == priority ? selectedCategoryColor.opacity(0.14) : .clear)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 7)
                                        .stroke(selectedPriority == priority ? .clear : JDTheme.divider, lineWidth: 0.5)
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 7))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            AddSheetFieldRow(label: "태그") {
                TextField("쉼표로 구분", text: $tagsText)
                    .font(.system(size: 13, weight: .medium))
                    .textInputAutocapitalization(.never)
            }

            HStack(spacing: 10) {
                Spacer()
                Button("취소", action: onCancel)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(JDTheme.secondaryText)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 11)

                Button(action: save) {
                    Text("저장")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 22)
                        .padding(.vertical, 11)
                        .background(canSave ? JDTheme.accent : JDTheme.dividerStrong)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .buttonStyle(.plain)
                .disabled(!canSave)
            }
            .padding(.top, 18)
        }
        .sheet(item: $editingScheduleField) { field in
            DateTimeWheelSheet(
                title: field.title,
                date: field == .start ? $startDateValue : $endDateValue,
                includesTime: $includesTime,
                minimumDate: field == .end ? startDateValue : nil,
                onDone: {
                    if startDateValue > endDateValue {
                        endDateValue = startDateValue
                    }
                    editingScheduleField = nil
                }
            )
            .presentationDetents([.height(330)])
            .presentationDragIndicator(.visible)
            .presentationCornerRadius(22)
            .presentationBackground(JDTheme.surface)
        }
    }

    private var canSave: Bool {
        !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private var selectedCategoryColor: Color {
        categories.first { $0.id == selectedCategoryID }?.displayColor ?? JDTheme.me
    }

    private var parsedTags: [String] {
        tagsText
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    }

    private func save() {
        guard canSave else {
            return
        }
        onSave(
            Task(
                id: task.id,
                title: title.trimmingCharacters(in: .whitespacesAndNewlines),
                categoryID: selectedCategoryID,
                startDate: Self.isoDate(from: startDateValue),
                endDate: Self.isoDate(from: endDateValue),
                priority: selectedPriority,
                isCompleted: task.isCompleted,
                scheduledTime: includesTime ? Self.timeString(from: startDateValue) : nil,
                tags: parsedTags
            )
        )
    }

    private static func date(from iso: String, time: String?) -> Date {
        let parts = JDDate.parts(iso)
        let timeParts = time?.split(separator: ":").compactMap { Int($0) } ?? []
        let now = Calendar.current.dateComponents([.hour, .minute], from: Date())
        var components = DateComponents()
        components.year = parts.year
        components.month = parts.month
        components.day = parts.day
        components.hour = timeParts.first ?? now.hour
        components.minute = timeParts.dropFirst().first ?? now.minute
        return Calendar.current.date(from: components) ?? Date()
    }

    private static func isoDate(from date: Date) -> String {
        let parts = Calendar.current.dateComponents([.year, .month, .day], from: date)
        return String(
            format: "%04d-%02d-%02d",
            parts.year ?? 2026,
            parts.month ?? 1,
            parts.day ?? 1
        )
    }

    private static func timeString(from date: Date) -> String {
        let parts = Calendar.current.dateComponents([.hour, .minute], from: date)
        return String(format: "%02d:%02d", parts.hour ?? 0, parts.minute ?? 0)
    }
}

private struct HabitDetailEditor: View {
    let habit: Habit
    let onCancel: () -> Void
    let onSave: (Habit) -> Void

    @State private var title: String
    @State private var emoji: String
    @State private var startedAt: String
    @State private var recurType: HabitRecurType
    @State private var selectedDays: Set<Int>
    @State private var reminderTime: String

    private let weekdays: [(Int, String)] = [
        (0, "일"), (1, "월"), (2, "화"), (3, "수"), (4, "목"), (5, "금"), (6, "토")
    ]

    init(habit: Habit, onCancel: @escaping () -> Void, onSave: @escaping (Habit) -> Void) {
        self.habit = habit
        self.onCancel = onCancel
        self.onSave = onSave
        _title = State(initialValue: habit.title)
        _emoji = State(initialValue: habit.emoji)
        _startedAt = State(initialValue: habit.startedAt)
        _recurType = State(initialValue: habit.recurType)
        _selectedDays = State(initialValue: Set(habit.recurDays ?? []))
        _reminderTime = State(initialValue: habit.reminderTime ?? "")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 10) {
                TextField("🌱", text: $emoji)
                    .font(.title3.weight(.semibold))
                    .frame(width: 44)
                    .multilineTextAlignment(.center)
                TextField("어떤 습관인가요?", text: $title)
                    .font(.title3.weight(.semibold))
                    .textInputAutocapitalization(.never)
            }
            .padding(.bottom, 12)
            .overlay(alignment: .bottom) {
                Rectangle()
                    .fill(JDTheme.divider)
                    .frame(height: 0.5)
            }

            AddSheetFieldRow(label: "시작") {
                TextField("YYYY-MM-DD", text: $startedAt)
                    .font(.system(size: 13, weight: .medium))
                    .textInputAutocapitalization(.never)
            }
            AddSheetFieldRow(label: "반복") {
                Picker("반복", selection: $recurType) {
                    Text("매일").tag(HabitRecurType.daily)
                    Text("매주").tag(HabitRecurType.weekly)
                }
                .pickerStyle(.segmented)
            }
            if recurType == .weekly {
                AddSheetFieldRow(label: "요일") {
                    HStack(spacing: 6) {
                        ForEach(weekdays, id: \.0) { day, label in
                            Button {
                                toggleDay(day)
                            } label: {
                                Text(label)
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundStyle(selectedDays.contains(day) ? .white : JDTheme.secondaryText)
                                    .frame(width: 28, height: 28)
                                    .background(selectedDays.contains(day) ? JDTheme.habit : JDTheme.surfaceAlt)
                                    .clipShape(Circle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            AddSheetFieldRow(label: "알림") {
                HStack {
                    TextField("HH:MM", text: $reminderTime)
                        .font(.system(size: 13, weight: .medium))
                        .textInputAutocapitalization(.never)
                    if !reminderTime.isEmpty {
                        Button("지우기") {
                            reminderTime = ""
                        }
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(JDTheme.tertiaryText)
                    }
                }
            }

            DetailEditorActions(onCancel: onCancel) {
                let normalizedStartedAt = JDDate.normalizedISODate(startedAt, fallback: habit.startedAt)
                let days = selectedDays.sorted()
                onSave(
                    Habit(
                        id: habit.id,
                        title: title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? habit.title : title,
                        emoji: emoji.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? habit.emoji : emoji,
                        startedAt: normalizedStartedAt,
                        recurType: recurType,
                        recurDays: recurType == .weekly ? (days.isEmpty ? habit.recurDays : days) : nil,
                        reminderTime: reminderTime.nilIfBlank,
                        log: habit.log
                    )
                )
            }
        }
    }

    private func toggleDay(_ day: Int) {
        if selectedDays.contains(day) {
            selectedDays.remove(day)
        } else {
            selectedDays.insert(day)
        }
    }
}

private struct DetailActionBar: View {
    let onEdit: () -> Void
    let onDelete: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            Button(action: onEdit) {
                Label("편집", systemImage: "pencil")
            }
            .buttonStyle(.borderedProminent)
            Button(role: .destructive, action: onDelete) {
                Label("삭제", systemImage: "trash")
            }
            .buttonStyle(.bordered)
        }
        .font(.system(size: 13, weight: .semibold))
        .padding(.top, 4)
    }
}

private struct DetailEditorActions: View {
    let onCancel: () -> Void
    let onSave: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            Button("취소", action: onCancel)
                .buttonStyle(.bordered)
            Button("저장", action: onSave)
                .buttonStyle(.borderedProminent)
        }
        .font(.system(size: 13, weight: .semibold))
        .padding(.top, 16)
    }
}

private enum DetailActionMessage: Equatable {
    case success(String)
    case error(String)

    var text: String {
        switch self {
        case .success(let text), .error(let text):
            return text
        }
    }

    var color: Color {
        switch self {
        case .success:
            return .green
        case .error:
            return .red
        }
    }
}

private struct DetailMessageView: View {
    let message: DetailActionMessage

    var body: some View {
        Text(message.text)
            .font(.footnote.weight(.medium))
            .foregroundStyle(message.color)
            .padding(.top, 2)
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
    ContentView(syncStatus: AppSyncStatusStore())
}
