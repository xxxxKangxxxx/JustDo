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
    @State private var pendingDetailRoute: JustDoDetailRoute?
    @State private var didOpenInitialUITestURL = false
    @AppStorage("justdo.isDarkMode") private var isDarkMode = false
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
        rootScreen
        // Applied at the scene root so full-screen covers / sheets (which do not
        // inherit a child view's preferredColorScheme) follow the dark-mode
        // toggle. Auth/loading surfaces stay light regardless of the toggle.
        .preferredColorScheme(rootColorScheme)
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

    private var rootColorScheme: ColorScheme {
        switch auth.status {
        case .signedIn:
            return isDarkMode ? .dark : .light
        default:
            return .light
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
                pendingDetailRoute: $pendingDetailRoute,
                onSignOut: {
                    auth.signOut()
                    _Concurrency.Task { await onSessionChanged() }
                }
            )
        case .working(let provider):
            AuthLandingView(workingProvider: provider, onSignIn: signIn(with:))
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
        pendingDetailRoute = route
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

    var id: String { rawValue }

    var title: String {
        switch self {
        case .home:
            "홈"
        }
    }

    var systemName: String {
        switch self {
        case .home:
            "calendar"
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
    var tags: [String]
}

private func parseTaskTags(_ text: String) -> [String] {
    var seen = Set<String>()
    var result: [String] = []

    for rawTag in text.split(whereSeparator: { $0 == "," || $0.isWhitespace }) {
        let trimmedTag = rawTag.trimmingCharacters(in: .whitespacesAndNewlines)
        let tag = trimmedTag.hasPrefix("#") ? String(trimmedTag.dropFirst()) : trimmedTag

        if !tag.isEmpty, !seen.contains(tag) {
            seen.insert(tag)
            result.append(tag)
        }
    }

    return result
}

private func sortTasksByDueDate(_ lhs: Task, _ rhs: Task) -> Bool {
    if lhs.endDate != rhs.endDate {
        return lhs.endDate < rhs.endDate
    }
    let lhsTime = lhs.scheduledTime ?? "99:99"
    let rhsTime = rhs.scheduledTime ?? "99:99"
    if lhsTime != rhsTime {
        return lhsTime < rhsTime
    }
    return lhs.title.localizedStandardCompare(rhs.title) == .orderedAscending
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
    @Binding var pendingDetailRoute: JustDoDetailRoute?
    let onSignOut: () -> Void

    @State private var snapshot: AppSnapshot?
    @State private var selectedDate = JDDate.todayISO
    @State private var displayYear = JDDate.todayComponents.year
    @State private var displayMonth = JDDate.todayComponents.month
    @State private var selectedTab: RootTab = .home
    @State private var isShowingAddTask = false
    @State private var isShowingSettings = false
    @State private var addTaskStartDate: String?
    @State private var addTaskEndDate: String?
    @State private var editingTask: Task?
    @State private var editingHabit: Habit?
    @State private var isShowingDayPanel = false
    @AppStorage("justdo.isDarkMode") private var isDarkMode = false
    @State private var exportURL: ExportFile?
    @State private var goalReportPresentation: GoalReportPresentation?
    @State private var goalPromptPresentation: GoalPromptPresentation?
    @State private var suppressedGoalPromptIDs: Set<String> = []
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
        .sheet(isPresented: $isShowingAddTask) {
            AddTaskSheet(
                selectedDate: selectedDate,
                initialStartDate: addTaskStartDate ?? selectedDate,
                initialEndDate: addTaskEndDate ?? selectedDate,
                categories: snapshot?.categories ?? [],
                onSaveTask: addTask(_:),
                onSaveHabit: addHabit(title:emoji:)
            )
            .presentationDetents([.height(500)])
            .presentationDragIndicator(.hidden)
            .presentationCornerRadius(22)
            .presentationBackground(JDTheme.surface)
        }
        .fullScreenCover(isPresented: $isShowingSettings) {
            SettingsRootTabView(
                snapshot: snapshot,
                settings: snapshot?.settings,
                authProfile: authProfile,
                year: displayYear,
                month: displayMonth,
                isDarkMode: $isDarkMode,
                actionMessage: actionMessage,
                syncStatus: syncStatus.status,
                onToggleHabit: toggleHabit(_:on:),
                onSetNotify: setNotify(_:),
                onSetNotifyTime: setNotifyTime(_:),
                onSetWeekStart: setWeekStart(_:),
                onSetJustDoMode: setJustDoModeFromSettings(_:),
                onAddGoal: addGoal(_:),
                onSaveGoal: saveGoal(_:),
                onDeleteGoal: deleteGoal(_:),
                onAddHabit: addHabit(title:emoji:),
                onDeleteHabit: deleteHabit(_:),
                onAddCategory: addCategory(name:color:),
                onDeleteCategory: deleteCategory(_:),
                onExportData: exportData,
                onResetData: resetAllData,
                onRetrySync: retrySync,
                onSignOut: onSignOut,
                onDismiss: { isShowingSettings = false }
            )
        }
        .sheet(item: $editingTask) { task in
            TaskDetailEditor(
                task: task,
                categories: snapshot?.categories ?? [],
                onCancel: { editingTask = nil },
                onSave: saveTask(_:),
                onDelete: deleteTask(_:)
            )
            .padding(.horizontal, 20)
            .padding(.top, 20)
            .padding(.bottom, 30)
            .presentationDetents([.height(560)])
            .presentationDragIndicator(.visible)
            .presentationCornerRadius(22)
            .presentationBackground(JDTheme.surface)
        }
        .sheet(item: $editingHabit) { habit in
            HabitDetailEditor(
                habit: habit,
                onCancel: { editingHabit = nil },
                onSave: saveHabit(_:)
            )
            .padding(.horizontal, 20)
            .padding(.top, 20)
            .padding(.bottom, 30)
            .presentationDetents([.height(500)])
            .presentationDragIndicator(.visible)
            .presentationCornerRadius(22)
            .presentationBackground(JDTheme.surface)
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
                justDoTasks: tasksForJustDoMode,
                habits: snapshot?.habits ?? [],
                categories: snapshot?.categories ?? [],
                canUseJustDoMode: effectiveJustDoMode,
                onToggleTask: toggleTask(_:),
                onToggleHabit: toggleHabit(_:on:),
                onSaveTask: saveTask(_:),
                onDeleteTask: deleteTask(_:),
                onAdd: { useJustDoMode in
                    isShowingDayPanel = false
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.22) {
                        presentAddSheetForSelectedDate(useJustDoMode: useJustDoMode)
                    }
                }
            )
            .presentationDetents([.height(500), .large])
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
            presentPendingDetailRouteIfNeeded()
        }
        .onChange(of: syncStatus.status) { _, status in
            switch status {
            case .synced, .pending:
                loadSnapshot(preserveViewSelection: true)
            case .unknown, .syncing, .failed:
                break
            }
        }
        .onChange(of: pendingDetailRoute) { _, _ in
            presentPendingDetailRouteIfNeeded()
        }
        .fullScreenCover(item: $goalReportPresentation) { presentation in
            GoalReportFullScreen(
                presentation: presentation,
                goals: snapshot?.goals ?? [],
                tasks: snapshot?.tasks ?? [],
                habits: snapshot?.habits ?? [],
                categories: snapshot?.categories ?? [],
                onClose: { goalReportPresentation = nil }
            )
        }
        .fullScreenCover(item: $goalPromptPresentation) { presentation in
            GoalPromptFullScreen(
                presentation: presentation,
                onSave: saveGoalPrompt(_:entries:),
                onDismiss: dismissGoalPrompt(_:dismissedPermanentlyForPeriod:)
            )
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
                if let banner = homeReportBanner {
                    ReportBanner(
                        title: reportBannerTitle(banner),
                        onOpen: { openReport(banner) },
                        onDismiss: { dismissReportBanner(banner) }
                    )
                    .padding(.horizontal, 20)
                    .padding(.top, 14)
                }
                Spacer()
                    .frame(height: 36)
                MonthCalendarView(
                    year: displayYear,
                    month: displayMonth,
                    selectedDate: selectedDate,
                    weekStart: snapshot?.settings.weekStart ?? 0,
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
        }
    }

    private var homeHeader: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .center) {
                JustDoWordmark(size: 24, dotSize: 6)
                    .offset(y: -14)
                Spacer()
                Button {
                    isShowingSettings = true
                } label: {
                    Image(systemName: "gearshape")
                        .font(.system(size: 18, weight: .semibold))
                        .frame(width: 34, height: 34)
                        .foregroundStyle(JDTheme.secondaryText)
                }
                .offset(y: -14)
                .accessibilityLabel("설정")
            }
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
                    presentAddSheet(startDate: selectedDate, endDate: selectedDate)
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

    private var tasksForJustDoMode: [Task] {
        return (snapshot?.tasks ?? [])
            .filter { !$0.isCompleted && $0.endDate <= selectedDate }
            .sorted(by: sortTasksByDueDate)
    }

    private var isProPlan: Bool {
        (snapshot?.settings.plan ?? "free") == "pro"
    }

    private var effectiveJustDoMode: Bool {
        isProPlan && (snapshot?.settings.justDoMode ?? false)
    }

    private var homeReportBanner: GoalReportAvailability? {
        let today = JDDate.todayComponents
        return GoalReportSelectors.homeBannerReport(
            todayYear: today.year,
            todayMonth: today.month,
            goals: snapshot?.goals ?? [],
            dismissals: snapshot?.goalPromptDismissals ?? []
        )
    }

    private func reportBannerTitle(_ report: GoalReportAvailability) -> String {
        if report.periodType == .yearly {
            return "\(report.periodKey)년 리포트가 준비됐어요"
        }
        return "\(GoalSelectors.periodLabel(.monthly, periodKey: report.periodKey)) 리포트가 준비됐어요"
    }

    private func openReport(_ report: GoalReportAvailability) {
        goalReportPresentation = GoalReportPresentation(
            target: GoalReportTarget(periodType: report.periodType, periodKey: report.periodKey),
            isPreview: !isProPlan
        )
    }

    private func dismissReportBanner(_ report: GoalReportAvailability) {
        upsertGoalPromptDismissal(
            promptType: report.dismissalPromptType,
            periodKey: report.periodKey,
            dismissedPermanentlyForPeriod: true
        )
    }

    private func presentAddSheetForSelectedDate(useJustDoMode: Bool? = nil) {
        if useJustDoMode ?? effectiveJustDoMode {
            let startDate = selectedDate < JDDate.todayISO ? selectedDate : JDDate.todayISO
            presentAddSheet(startDate: startDate, endDate: selectedDate)
        } else {
            presentAddSheet(startDate: selectedDate, endDate: selectedDate)
        }
    }

    private func presentAddSheet(startDate: String, endDate: String) {
        addTaskStartDate = startDate
        addTaskEndDate = endDate
        isShowingAddTask = true
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
            presentGoalPromptIfNeeded(from: loaded)
        } catch {
            loadError = "Could not load local mirror."
        }
    }

    private func presentGoalPromptIfNeeded(from loaded: AppSnapshot) {
        guard goalPromptPresentation == nil,
              goalReportPresentation == nil,
              !isShowingSettings,
              !isShowingAddTask,
              !isShowingDayPanel
        else {
            return
        }

        guard let nextPrompt = nextGoalPrompt(from: loaded),
              !suppressedGoalPromptIDs.contains(nextPrompt.id)
        else {
            return
        }

        DispatchQueue.main.async {
            guard goalPromptPresentation == nil else { return }
            goalPromptPresentation = nextPrompt
        }
    }

    private func nextGoalPrompt(from loaded: AppSnapshot) -> GoalPromptPresentation? {
        let today = JDDate.todayComponents
        let todayISO = JDDate.todayISO
        let yearlyKey = GoalSelectors.periodKey(.yearly, iso: todayISO)
        let monthlyKey = GoalSelectors.periodKey(.monthly, iso: todayISO)
        let yearlyGoals = GoalSelectors.goalsForPeriod(loaded.goals, type: .yearly, periodKey: yearlyKey)
        let monthlyGoals = GoalSelectors.goalsForPeriod(loaded.goals, type: .monthly, periodKey: monthlyKey)

        if yearlyGoals.isEmpty,
           monthlyGoals.isEmpty,
           !hasGoalPromptDismissal(loaded, promptType: .onboarding, periodKey: GoalPromptPresentation.onboardingPeriodKey) {
            return GoalPromptPresentation(kind: .onboarding, periodKey: GoalPromptPresentation.onboardingPeriodKey)
        }

        if today.month == 1,
           (1...7).contains(today.day),
           yearlyGoals.isEmpty,
           !hasGoalPromptDismissal(loaded, promptType: .yearly, periodKey: yearlyKey) {
            return GoalPromptPresentation(kind: .yearly, periodKey: yearlyKey)
        }

        if (1...7).contains(today.day),
           monthlyGoals.isEmpty,
           !hasGoalPromptDismissal(loaded, promptType: .monthly, periodKey: monthlyKey) {
            return GoalPromptPresentation(kind: .monthly, periodKey: monthlyKey)
        }

        return nil
    }

    private func hasGoalPromptDismissal(_ snapshot: AppSnapshot, promptType: GoalPromptType, periodKey: String) -> Bool {
        snapshot.goalPromptDismissals.contains {
            $0.promptType == promptType &&
            $0.periodKey == periodKey &&
            $0.dismissedPermanentlyForPeriod
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
            tags: draft.tags
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

    private func presentEditTask(id: UUID) {
        guard let task = snapshot?.tasks.first(where: { $0.id == id }) else {
            actionMessage = "Task를 찾을 수 없습니다."
            return
        }
        editingTask = task
    }

    private func presentPendingDetailRouteIfNeeded() {
        guard let route = pendingDetailRoute else {
            return
        }

        loadSnapshot(preserveViewSelection: true)
        selectedTab = .home
        isShowingDayPanel = false

        switch route {
        case .task(let id):
            presentEditTask(id: id)
        case .habit(let id):
            presentEditHabit(id: id)
        }
        pendingDetailRoute = nil
    }

    private func saveTask(_ task: Task) {
        guard let snapshotStore else {
            actionMessage = "Local mirror is unavailable."
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
            editingTask = nil
            loadSnapshot(preserveViewSelection: true)
            syncStatus.refreshPendingCount(snapshotStore: snapshotStore)
            actionMessage = "Task updated."
        } catch {
            actionMessage = "Could not update task."
        }
    }

    private func deleteTask(_ task: Task) {
        guard let snapshotStore else {
            actionMessage = "Local mirror is unavailable."
            return
        }

        do {
            try snapshotStore.applyAndEnqueue(
                QueuedMutation(
                    id: UUID(),
                    updatedAt: JDDate.nowISODateTime,
                    mutation: .taskDelete(id: task.id)
                )
            )
            editingTask = nil
            loadSnapshot(preserveViewSelection: true)
            syncStatus.refreshPendingCount(snapshotStore: snapshotStore)
            actionMessage = "Task deleted."
        } catch {
            actionMessage = "Could not delete task."
        }
    }

    private func presentEditHabit(id: UUID) {
        guard let habit = snapshot?.habits.first(where: { $0.id == id }) else {
            actionMessage = "Habit을 찾을 수 없습니다."
            return
        }
        editingHabit = habit
    }

    private func saveHabit(_ habit: Habit) {
        guard let snapshotStore else {
            actionMessage = "Local mirror is unavailable."
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
            editingHabit = nil
            loadSnapshot(preserveViewSelection: true)
            syncStatus.refreshPendingCount(snapshotStore: snapshotStore)
            actionMessage = "Habit updated."
        } catch {
            actionMessage = "Could not update habit."
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

    private func setJustDoMode(_ isOn: Bool) {
        setPreference(.justDoMode, value: isOn ? 1 : 0, successMessage: "Just Do Mode updated.")
    }

    private func setJustDoModeFromSettings(_ isOn: Bool) {
        guard isProPlan else {
            actionMessage = "Just Do Mode는 Pro 기능입니다."
            return
        }
        setJustDoMode(isOn)
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

    private func addGoal(_ draft: GoalDraft) {
        guard let snapshotStore else {
            actionMessage = "Local mirror is unavailable."
            return
        }

        let trimmedTitle = draft.title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedTitle.isEmpty else {
            actionMessage = "목표 제목을 입력해주세요."
            return
        }

        let currentGoals = GoalSelectors.goalsForPeriod(
            snapshot?.goals ?? [],
            type: draft.periodType,
            periodKey: draft.periodKey
        )
        guard currentGoals.count < 5 else {
            actionMessage = "목표는 기간별 최대 5개까지 만들 수 있습니다."
            return
        }

        let goal = Goal(
            id: UUID(),
            periodType: draft.periodType,
            periodKey: draft.periodKey,
            title: trimmedTitle,
            note: draft.note.trimmingCharacters(in: .whitespacesAndNewlines).nilIfBlank,
            sortOrder: currentGoals.count,
            locked: draft.locked,
            lockedAt: draft.locked ? JDDate.nowISODateTime : nil,
            target: draft.target
        )

        do {
            try snapshotStore.applyAndEnqueue(
                QueuedMutation(
                    id: UUID(),
                    updatedAt: JDDate.nowISODateTime,
                    mutation: .goalUpsert(goal)
                )
            )
            loadSnapshot(preserveViewSelection: true)
            syncStatus.refreshPendingCount(snapshotStore: snapshotStore)
            actionMessage = "목표가 추가되었습니다."
        } catch {
            actionMessage = "목표를 추가하지 못했습니다."
        }
    }

    private func saveGoal(_ goal: Goal) {
        guard let snapshotStore else {
            actionMessage = "Local mirror is unavailable."
            return
        }

        let trimmedTitle = goal.title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedTitle.isEmpty else {
            actionMessage = "목표 제목을 입력해주세요."
            return
        }

        var updated = goal
        updated.title = trimmedTitle
        updated.note = goal.note?.trimmingCharacters(in: .whitespacesAndNewlines).nilIfBlank
        updated.lockedAt = updated.locked ? (updated.lockedAt ?? JDDate.nowISODateTime) : nil

        do {
            try snapshotStore.applyAndEnqueue(
                QueuedMutation(
                    id: UUID(),
                    updatedAt: JDDate.nowISODateTime,
                    mutation: .goalUpsert(updated)
                )
            )
            loadSnapshot(preserveViewSelection: true)
            syncStatus.refreshPendingCount(snapshotStore: snapshotStore)
            actionMessage = "목표가 수정되었습니다."
        } catch {
            actionMessage = "목표를 수정하지 못했습니다."
        }
    }

    private func deleteGoal(_ goal: Goal) {
        guard let snapshotStore else {
            actionMessage = "Local mirror is unavailable."
            return
        }

        do {
            try snapshotStore.applyAndEnqueue(
                QueuedMutation(
                    id: UUID(),
                    updatedAt: JDDate.nowISODateTime,
                    mutation: .goalDelete(id: goal.id)
                )
            )
            loadSnapshot(preserveViewSelection: true)
            syncStatus.refreshPendingCount(snapshotStore: snapshotStore)
            actionMessage = "목표가 삭제되었습니다."
        } catch {
            actionMessage = "목표를 삭제하지 못했습니다."
        }
    }

    private func saveGoalPrompt(_ presentation: GoalPromptPresentation, entries: [GoalPromptSaveEntry]) {
        guard let snapshotStore else {
            actionMessage = "Local mirror is unavailable."
            return
        }

        let normalizedEntries = entries.map { entry in
            GoalPromptSaveEntry(
                periodType: entry.periodType,
                periodKey: entry.periodKey,
                drafts: Array(
                    entry.drafts
                        .map { draft in
                            GoalPromptDraft(
                                title: draft.title.trimmingCharacters(in: .whitespacesAndNewlines),
                                note: draft.note.trimmingCharacters(in: .whitespacesAndNewlines),
                                locked: draft.locked
                            )
                        }
                        .filter { !$0.title.isEmpty }
                        .prefix(5)
                )
            )
        }
        .filter { !$0.drafts.isEmpty }

        guard !normalizedEntries.isEmpty else {
            actionMessage = "목표 제목을 입력해주세요."
            return
        }

        let updatedAt = JDDate.nowISODateTime
        do {
            for entry in normalizedEntries {
                let existing = GoalSelectors.goalsForPeriod(
                    snapshot?.goals ?? [],
                    type: entry.periodType,
                    periodKey: entry.periodKey
                )
                for (index, draft) in entry.drafts.enumerated() where index + existing.count < 5 {
                    let goal = Goal(
                        id: UUID(),
                        periodType: entry.periodType,
                        periodKey: entry.periodKey,
                        title: draft.title,
                        note: draft.note.nilIfBlank,
                        sortOrder: existing.count + index,
                        locked: draft.locked,
                        lockedAt: draft.locked ? updatedAt : nil
                    )
                    try snapshotStore.applyAndEnqueue(
                        QueuedMutation(
                            id: UUID(),
                            updatedAt: updatedAt,
                            mutation: .goalUpsert(goal)
                        )
                    )
                }
            }

            suppressedGoalPromptIDs.insert(presentation.id)
            goalPromptPresentation = nil
            loadSnapshot(preserveViewSelection: true)
            syncStatus.refreshPendingCount(snapshotStore: snapshotStore)
            actionMessage = "목표가 저장되었습니다."
        } catch {
            actionMessage = "목표를 저장하지 못했습니다."
        }
    }

    private func dismissGoalPrompt(_ presentation: GoalPromptPresentation, dismissedPermanentlyForPeriod: Bool) {
        suppressedGoalPromptIDs.insert(presentation.id)
        goalPromptPresentation = nil

        let shouldPersist =
            presentation.kind == .onboarding ||
            dismissedPermanentlyForPeriod
        guard shouldPersist else {
            return
        }
        upsertGoalPromptDismissal(
            promptType: presentation.kind.promptType,
            periodKey: presentation.periodKey,
            dismissedPermanentlyForPeriod: dismissedPermanentlyForPeriod || presentation.kind == .onboarding
        )
    }

    private func upsertGoalPromptDismissal(
        promptType: GoalPromptType,
        periodKey: String,
        dismissedPermanentlyForPeriod: Bool
    ) {
        guard let snapshotStore else {
            actionMessage = "Local mirror is unavailable."
            return
        }

        let existing = snapshot?.goalPromptDismissals.first {
            $0.promptType == promptType && $0.periodKey == periodKey
        }
        let dismissal = GoalPromptDismissal(
            id: existing?.id ?? UUID(),
            promptType: promptType,
            periodKey: periodKey,
            dismissedPermanentlyForPeriod: dismissedPermanentlyForPeriod,
            dismissedAt: JDDate.nowISODateTime
        )

        do {
            try snapshotStore.applyAndEnqueue(
                QueuedMutation(
                    id: UUID(),
                    updatedAt: JDDate.nowISODateTime,
                    mutation: .goalPromptDismissalUpsert(dismissal)
                )
            )
            loadSnapshot(preserveViewSelection: true)
            syncStatus.refreshPendingCount(snapshotStore: snapshotStore)
        } catch {
            actionMessage = "목표 알림 상태를 저장하지 못했습니다."
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
            snapshot.categories.map { QueuedMutation(id: UUID(), updatedAt: updatedAt, mutation: .categoryDelete(id: $0.id)) } +
            snapshot.goals.map { QueuedMutation(id: UUID(), updatedAt: updatedAt, mutation: .goalDelete(id: $0.id)) }

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
    let weekStart: Int
    let tasks: [Task]
    let categories: [JDCategory]
    let onSelectDate: (String) -> Void

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
        JDDate.monthGrid(year: year, month: month, weekStart: weekStart)
    }

    private var weekdays: [String] {
        JDDate.weekdayLabels(weekStart: weekStart)
    }

    private func weekdayColor(_ index: Int) -> Color {
        let weekday = (weekStart + index) % 7
        if weekday == 0 {
            return JDTheme.external
        }
        if weekday == 6 {
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
        let weekday = JDDate.weekday(day.iso)
        if day.iso == JDDate.todayISO {
            return .white
        }
        if !day.isCurrentMonth {
            return JDTheme.tertiaryText.opacity(0.55)
        }
        if weekday == 0 {
            return JDTheme.external
        }
        if weekday == 6 {
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
    private enum PanelMode {
        case list
        case task(Task)
    }

    let selectedDate: String
    let tasks: [Task]
    let justDoTasks: [Task]
    let habits: [Habit]
    let categories: [JDCategory]
    let canUseJustDoMode: Bool
    let onToggleTask: (Task) -> Void
    let onToggleHabit: (Habit, String) -> Void
    let onSaveTask: (Task) -> Void
    let onDeleteTask: (Task) -> Void
    let onAdd: (Bool) -> Void

    @State private var mode: PanelMode = .list
    @State private var isShowingJustDoMode = false

    var body: some View {
        Group {
            switch mode {
            case .list:
                listView
            case .task(let task):
                editTaskView(task)
            }
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 24)
    }

    private var listView: some View {
        ZStack(alignment: .bottomTrailing) {
            VStack(alignment: .leading, spacing: 0) {
                dragHeader
                modePicker
                    .padding(.bottom, 8)

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 0) {
                        if isShowingJustDoMode {
                            ForEach(justDoTaskSections, id: \.title) { section in
                                JustDoTaskSectionView(
                                    title: section.title,
                                    tasks: section.tasks,
                                    categories: categories,
                                    onToggleTask: onToggleTask,
                                    onOpenTask: { task in mode = .task(task) }
                                )
                            }
                        } else {
                            ForEach(groupedTasks, id: \.category.id) { group in
                                TaskGroupSection(
                                    category: group.category,
                                    tasks: group.tasks,
                                    onToggleTask: onToggleTask,
                                    onOpenTask: { task in mode = .task(task) }
                                )
                            }
                        }

                        if !habits.isEmpty {
                            HabitGroupSection(
                                habits: habits,
                                selectedDate: selectedDate,
                                onToggleHabit: onToggleHabit
                            )
                        }

                        if visibleTasks.isEmpty && habits.isEmpty {
                            Text("이 날엔 할일이 없어요. + 로 추가해보세요.")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(JDTheme.tertiaryText)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 32)
                        }

                        Spacer()
                            .frame(height: 76)
                    }
                }
            }

            Button { onAdd(isShowingJustDoMode) } label: {
                Image(systemName: "plus")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 54, height: 54)
                    .background(JDTheme.accent)
                    .clipShape(Circle())
                    .shadow(color: .black.opacity(0.18), radius: 12, y: 6)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("선택한 날짜에 추가")
            .padding(.trailing, 2)
            .padding(.bottom, 2)
        }
    }

    private func editTaskView(_ task: Task) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            editHeader(title: "Task 편집")
            ScrollView(showsIndicators: false) {
                TaskDetailEditor(
                    task: task,
                    categories: categories,
                    onCancel: { mode = .list },
                    onSave: { updated in
                        onSaveTask(updated)
                        mode = .list
                    },
                    onDelete: { deleted in
                        onDeleteTask(deleted)
                        mode = .list
                    }
                )
                .padding(.top, 12)
            }
        }
    }

    private func editHeader(title: String) -> some View {
        HStack(spacing: 10) {
            Button {
                mode = .list
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 15, weight: .bold))
                    .frame(width: 30, height: 30)
            }
            .buttonStyle(.plain)
            .foregroundStyle(JDTheme.primaryText)

            Text(title)
                .font(.system(size: 18, weight: .bold))
            Spacer()
        }
        .padding(.top, 18)
        .padding(.bottom, 6)
    }

    private var dragHeader: some View {
        HStack(alignment: .firstTextBaseline) {
            Text("\(components.month)월 \(components.day)일")
                .font(.system(size: 18, weight: .bold))
            Text("\(weekdayName)요일\(selectedDate == JDDate.todayISO ? " · 오늘" : "")")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(JDTheme.secondaryText)
            Spacer()
            Text("\(visibleTasks.count + habits.count)개")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(JDTheme.tertiaryText)
        }
        .padding(.top, 18)
        .padding(.bottom, 8)
    }

    private var modePicker: some View {
        HStack(spacing: 0) {
            modeButton(title: "오늘만", isSelected: !isShowingJustDoMode) {
                isShowingJustDoMode = false
            }
            modeButton(title: "이 날까지", isSelected: isShowingJustDoMode) {
                if canUseJustDoMode {
                    isShowingJustDoMode = true
                }
            }
        }
        .padding(3)
        .background(JDTheme.surfaceAlt)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func modeButton(title: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        let isLocked = title == "이 날까지" && !canUseJustDoMode
        return Button(action: action) {
            HStack(spacing: 5) {
                Text(title)
                if isLocked {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 9, weight: .bold))
                }
            }
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(isLocked ? JDTheme.tertiaryText : isSelected ? JDTheme.primaryText : JDTheme.secondaryText)
            .frame(maxWidth: .infinity)
            .frame(height: 30)
            .background(isSelected ? JDTheme.surface : .clear)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
        .disabled(isLocked)
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

    private var visibleTasks: [Task] {
        isShowingJustDoMode ? justDoTasks : tasks
    }

    private var justDoTaskSections: [(title: String, tasks: [Task])] {
        [
            ("지난일", justDoTasks.filter { $0.endDate < JDDate.todayISO }),
            ("오늘", justDoTasks.filter { $0.endDate == JDDate.todayISO }),
            ("해야할일", justDoTasks.filter { $0.endDate > JDDate.todayISO && $0.endDate <= selectedDate }),
        ]
        .filter { !$0.tasks.isEmpty }
    }
}

private struct JustDoTaskSectionView: View {
    let title: String
    let tasks: [Task]
    let categories: [JDCategory]
    let onToggleTask: (Task) -> Void
    let onOpenTask: (Task) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            SectionHeader(title: title, count: tasks.count, color: JDTheme.accent)
            ForEach(Array(tasks.enumerated()), id: \.element.id) { index, task in
                let category = categories.first { $0.id == task.categoryID }
                TaskRow(
                    task: task,
                    color: category?.displayColor ?? JDTheme.me,
                    isLast: index == tasks.count - 1,
                    showsDueDate: true,
                    onToggle: { onToggleTask(task) },
                    onOpen: { onOpenTask(task) }
                )
            }
        }
        .padding(.top, 14)
    }
}

private struct TaskGroupSection: View {
    let category: JDCategory
    let tasks: [Task]
    let onToggleTask: (Task) -> Void
    let onOpenTask: (Task) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            SectionHeader(title: category.name, count: tasks.count, color: category.displayColor)
            ForEach(Array(tasks.enumerated()), id: \.element.id) { index, task in
                TaskRow(
                    task: task,
                    color: category.displayColor,
                    isLast: index == tasks.count - 1,
                    showsDueDate: false,
                    onToggle: { onToggleTask(task) },
                    onOpen: { onOpenTask(task) }
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

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            SectionHeader(title: "Habit", count: habits.count, color: JDTheme.habit)
            ForEach(Array(habits.enumerated()), id: \.element.id) { index, habit in
                HabitRow(
                    habit: habit,
                    selectedDate: selectedDate,
                    isLast: index == habits.count - 1,
                    onToggle: { onToggleHabit(habit, selectedDate) }
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
    let showsDueDate: Bool
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
        if showsDueDate {
            let time = JDDate.formatTime(task.scheduledTime)
            return time.isEmpty ? JDDate.monthDay(task.endDate) : "\(JDDate.monthDay(task.endDate)) \(time)"
        }
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
    let initialStartDate: String
    let initialEndDate: String
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
    @State private var tagsText = ""

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
                AddSheetFieldRow(label: "태그", noBorder: true) {
                    TextField("쉼표 또는 공백으로 구분", text: $tagsText)
                        .font(.system(size: 13, weight: .medium))
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
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
            startDateValue = Self.date(from: initialStartDate)
            endDateValue = Self.date(from: initialEndDate)
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
                    scheduledTime: includesTime ? Self.timeString(from: startDateValue) : nil,
                    tags: parseTaskTags(tagsText)
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
    let onAddHabit: (String, String) -> Void
    let onDeleteHabit: (Habit) -> Void
    let onDismiss: () -> Void

    @State private var isShowingHabitManager = false

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
                HStack(alignment: .center) {
                    Text("습관")
                        .font(.system(size: 28, weight: .bold))
                    Spacer()
                    Button {
                        isShowingHabitManager = true
                    } label: {
                        Label("편집", systemImage: "slider.horizontal.3")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(JDTheme.accent)
                            .padding(.horizontal, 12)
                            .frame(height: 32)
                            .background(JDTheme.accent.opacity(0.12))
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                    Button(action: onDismiss) {
                        Image(systemName: "xmark")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(JDTheme.secondaryText)
                            .frame(width: 34, height: 34)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("닫기")
                }

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
        .fullScreenCover(isPresented: $isShowingHabitManager) {
            HabitManagementSheet(
                habits: habits,
                onAdd: onAddHabit,
                onDelete: onDeleteHabit
            )
        }
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
    let snapshot: AppSnapshot?
    let settings: Settings?
    let authProfile: AuthProfile?
    let year: Int
    let month: Int
    @Binding var isDarkMode: Bool
    let actionMessage: String?
    let syncStatus: AppSyncStatus
    let onToggleHabit: (Habit, String) -> Void
    let onSetNotify: (Bool) -> Void
    let onSetNotifyTime: (String) -> Void
    let onSetWeekStart: (Int) -> Void
    let onSetJustDoMode: (Bool) -> Void
    let onAddGoal: (GoalDraft) -> Void
    let onSaveGoal: (Goal) -> Void
    let onDeleteGoal: (Goal) -> Void
    let onAddHabit: (String, String) -> Void
    let onDeleteHabit: (Habit) -> Void
    let onAddCategory: (String, String) -> Void
    let onDeleteCategory: (JDCategory) -> Void
    let onExportData: () -> Void
    let onResetData: () -> Void
    let onRetrySync: () -> Void
    let onSignOut: () -> Void
    let onDismiss: () -> Void

    @State private var localNotify = true
    @State private var isShowingAccountDetail = false
    @State private var isShowingNotifyTimePicker = false
    @State private var notifyTimeValue = Date()
    @State private var isShowingWeekStartPicker = false
    @State private var weekStartValue = 0
    @State private var accountMessage: String?
    @State private var isShowingResetConfirmation = false
    @State private var isShowingStats = false
    @State private var isShowingGoalManager = false
    @State private var isShowingCategoryManager = false
    @State private var legalDocument: LegalDocument?
    @State private var settingsMessage: String?

    private var resolvedProfile: AuthProfile {
        authProfile ?? AuthProfile(email: nil, displayName: nil, avatarURL: nil, authProvider: nil)
    }

    private var isProPlan: Bool {
        (settings?.plan ?? "free") == "pro"
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .center) {
                    Text("설정")
                        .font(.system(size: 28, weight: .bold))
                    Spacer()
                    Button(action: onDismiss) {
                        Image(systemName: "xmark")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(JDTheme.secondaryText)
                            .frame(width: 34, height: 34)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("닫기")
                }
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
                    SettingsRow(title: "현재 플랜", detail: (settings?.plan ?? "free") == "pro" ? "Pro" : "Free")
                    SettingsRow(
                        title: "Just Do Mode",
                        pro: !isProPlan,
                        isLast: true,
                        right: AnyView(ToggleSwitch(isOn: justDoModeBinding))
                    )
                }
                SettingGroup(label: "데이터") {
                    SyncStatusRow(status: syncStatus, actionMessage: actionMessage, onRetry: onRetrySync)
                    SettingsRow(title: "습관", chevron: true, action: { isShowingStats = true })
                    SettingsRow(title: "목표", chevron: true, action: { isShowingGoalManager = true })
                    SettingsRow(title: "카테고리 관리", chevron: true, action: { isShowingCategoryManager = true })
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
        // Live-update the already-presented Settings cover when the dark-mode
        // toggle flips. The scene-root preferredColorScheme only resolves on
        // presentation, so the open cover needs its own to react immediately.
        .preferredColorScheme(isDarkMode ? .dark : .light)
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
        .fullScreenCover(isPresented: $isShowingStats) {
            StatsRootTabView(
                snapshot: snapshot,
                year: year,
                month: month,
                onToggleHabit: onToggleHabit,
                onAddHabit: onAddHabit,
                onDeleteHabit: onDeleteHabit,
                onDismiss: { isShowingStats = false }
            )
        }
        .fullScreenCover(isPresented: $isShowingGoalManager) {
            GoalManagementSheet(
                goals: snapshot?.goals ?? [],
                tasks: snapshot?.tasks ?? [],
                habits: snapshot?.habits ?? [],
                categories: snapshot?.categories ?? [],
                isProPlan: isProPlan,
                onAddGoal: onAddGoal,
                onSaveGoal: onSaveGoal,
                onDeleteGoal: onDeleteGoal
            )
        }
        .fullScreenCover(isPresented: $isShowingCategoryManager) {
            CategoryManagementSheet(
                categories: snapshot?.categories ?? [],
                onAdd: onAddCategory,
                onDelete: onDeleteCategory
            )
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

    private var justDoModeBinding: Binding<Bool> {
        Binding(
            get: { isProPlan && (settings?.justDoMode ?? false) },
            set: { value in
                if value && !isProPlan {
                    settingsMessage = "Just Do Mode는 Pro 버전에서 사용할 수 있습니다."
                    return
                }
                onSetJustDoMode(value)
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
                AccountInfoRow(title: "로그인 방식", value: profile.loginMethodTitle ?? "-")
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

private func dismissKeyboard() {
    UIApplication.shared.sendAction(
        #selector(UIResponder.resignFirstResponder),
        to: nil,
        from: nil,
        for: nil
    )
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
                ("계정", "Apple 또는 Google 로그인을 통해 서비스를 사용할 수 있으며, 계정 정보는 로그인과 동기화 기능 제공을 위해 사용됩니다."),
                ("데이터", "사용자가 입력한 할 일, 습관, 카테고리, 설정 정보는 서비스 제공과 동기화를 위해 저장될 수 있습니다."),
                ("유료 기능", "Pro 기능과 결제 기능은 추후 별도 결제 정책과 함께 제공될 예정입니다."),
                ("변경", "본 약관은 서비스 개선 또는 정책 변경에 따라 업데이트될 수 있습니다.")
            ]
        case .privacy:
            return [
                ("수집 항목", "서비스는 Apple 또는 Google 로그인으로 제공되는 이메일과 (제공 시) 기본 프로필 정보, 사용자가 입력한 할 일·습관·목표 데이터를 처리할 수 있습니다."),
                ("이용 목적", "수집된 정보는 로그인, 데이터 동기화, 위젯 표시, 사용자 설정 유지 등 서비스 제공 목적으로 사용됩니다."),
                ("보관", "데이터는 사용자가 서비스를 이용하는 동안 보관되며, 계정 삭제 기능 제공 시 삭제 요청에 따라 처리될 예정입니다."),
                ("제3자 제공", "법령에 따른 경우를 제외하고 사용자 정보를 임의로 제3자에게 제공하지 않습니다."),
                ("문의", "개인정보 관련 문의는 앱 내 고객지원 채널 또는 운영자가 제공하는 연락처를 통해 접수할 수 있습니다.")
            ]
        }
    }
}

/// Plain top-right xmark close header used by full-screen management sheets so
/// every close affordance matches the Home/Settings header xmark. Using a custom
/// header avoids the iOS 26 toolbar "Liquid Glass" capsule that wraps
/// ToolbarItem buttons in a circular background.
private struct SheetCloseHeader: View {
    let title: String
    let onClose: () -> Void

    var body: some View {
        HStack(alignment: .center) {
            Text(title)
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(JDTheme.primaryText)
            Spacer()
            Button(action: onClose) {
                Image(systemName: "xmark")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(JDTheme.secondaryText)
                    .frame(width: 34, height: 34)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("닫기")
        }
        .padding(.horizontal, 20)
        .padding(.top, 18)
        .padding(.bottom, 8)
    }
}

private struct LegalDocumentSheet: View {
    let document: LegalDocument
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 0) {
            SheetCloseHeader(title: document.title, onClose: { dismiss() })
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
        }
        .background(JDTheme.background)
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
        VStack(spacing: 0) {
            SheetCloseHeader(title: "습관 관리", onClose: { dismiss() })
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
            .scrollContentBackground(.hidden)
        }
        .background(JDTheme.background)
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
        VStack(spacing: 0) {
            SheetCloseHeader(title: "카테고리 관리", onClose: { dismiss() })
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
            .scrollContentBackground(.hidden)
        }
        .background(JDTheme.background)
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

private enum GoalPromptKind: String, Equatable {
    case onboarding
    case monthly
    case yearly

    var promptType: GoalPromptType {
        switch self {
        case .onboarding:
            .onboarding
        case .monthly:
            .monthly
        case .yearly:
            .yearly
        }
    }
}

private struct GoalPromptPresentation: Identifiable, Equatable {
    static let onboardingPeriodKey = "initial"

    var kind: GoalPromptKind
    var periodKey: String

    var id: String { "\(kind.rawValue)-\(periodKey)" }

    var periodTargets: [(type: GoalPeriodType, key: String)] {
        switch kind {
        case .onboarding:
            let today = JDDate.todayISO
            return [
                (.yearly, GoalSelectors.periodKey(.yearly, iso: today)),
                (.monthly, GoalSelectors.periodKey(.monthly, iso: today))
            ]
        case .monthly:
            return [(.monthly, periodKey)]
        case .yearly:
            return [(.yearly, periodKey)]
        }
    }
}

private struct GoalPromptDraft: Identifiable, Equatable {
    var id = UUID()
    var title: String
    var note: String
    var locked: Bool

    static func emptyRows(_ count: Int) -> [GoalPromptDraft] {
        (0..<count).map { _ in GoalPromptDraft(title: "", note: "", locked: true) }
    }
}

private struct GoalPromptSaveEntry {
    var periodType: GoalPeriodType
    var periodKey: String
    var drafts: [GoalPromptDraft]
}

private struct GoalPromptFullScreen: View {
    let presentation: GoalPromptPresentation
    let onSave: (GoalPromptPresentation, [GoalPromptSaveEntry]) -> Void
    let onDismiss: (GoalPromptPresentation, Bool) -> Void

    var body: some View {
        ZStack {
            JDTheme.background.ignoresSafeArea()
            switch presentation.kind {
            case .onboarding:
                GoalOnboardingPrompt(
                    presentation: presentation,
                    onSave: onSave,
                    onDismiss: onDismiss
                )
            case .monthly:
                GoalPeriodPrompt(
                    presentation: presentation,
                    title: "\(GoalSelectors.periodLabel(.monthly, periodKey: presentation.periodKey))의 작은 약속, 정해볼까요?",
                    eyebrow: "\(GoalSelectors.periodLabel(.monthly, periodKey: presentation.periodKey)) · 새 달",
                    bodyText: "한 달의 흐름을 잡아줄 3-5개의 약속. 마지막 날에 함께 돌아봐요.",
                    tint: JDTheme.habit,
                    sampleDrafts: GoalPromptDraft.emptyRows(1),
                    onSave: onSave,
                    onDismiss: onDismiss
                )
            case .yearly:
                GoalPeriodPrompt(
                    presentation: presentation,
                    title: "새해의 약속을 적어볼까요?",
                    eyebrow: "\(presentation.periodKey)년 · 새해",
                    bodyText: "한 해를 관통할 4-5개의 큰 방향. 12월에 다시 만나서 돌아볼 수 있어요.",
                    tint: JDTheme.me,
                    sampleDrafts: GoalPromptDraft.emptyRows(1),
                    onSave: onSave,
                    onDismiss: onDismiss
                )
            }
        }
    }
}

private struct GoalOnboardingGuide: View {
    let isStarting: Bool
    let onStart: () -> Void
    let onSkip: () -> Void

    @State private var page = 0

    private let pages: [GoalOnboardingGuidePage] = [
        GoalOnboardingGuidePage(
            title: "목표를 한 줄로 남겨요",
            body: "거창한 계획보다 올해와 이번 달에 지켜보고 싶은 방향을 먼저 적습니다.\n나중에 리포트에서 그 흐름을 함께 돌아볼 수 있어요.",
            tint: JDTheme.me,
            preview: .input
        ),
        GoalOnboardingGuidePage(
            title: "고정해도 바꿀 수 있어요",
            body: "자물쇠는 처음 마음을 기억하기 위한 표시예요.\n나중에 확인하고 수정할 수 있습니다.",
            tint: JDTheme.habit,
            preview: .lock
        ),
        GoalOnboardingGuidePage(
            title: "리포트로 돌아봐요",
            body: "완료한 일과 습관 흐름을 목표와 함께 묶어 정리합니다.\n한 달과 한 해가 어떻게 흘렀는지 차분히 볼 수 있어요.",
            tint: JDTheme.external,
            preview: .report
        )
    ]

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 24)

            VStack(spacing: 18) {
                TabView(selection: $page) {
                    ForEach(Array(pages.enumerated()), id: \.offset) { index, item in
                        VStack(spacing: 0) {
                            GoalOnboardingGuidePreview(kind: item.preview, tint: item.tint)
                                .padding(.top, 2)
                            Spacer()
                                .frame(height: 48)
                            VStack(spacing: 8) {
                                Text(item.title)
                                    .font(.system(size: 23, weight: .bold))
                                    .foregroundStyle(JDTheme.primaryText)
                                    .multilineTextAlignment(.center)
                                Text(item.body)
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundStyle(JDTheme.secondaryText)
                                    .lineSpacing(5)
                                    .multilineTextAlignment(.center)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            .padding(.horizontal, 4)
                            Spacer(minLength: 0)
                        }
                        .tag(index)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .always))
                .frame(height: 385)

                HStack(spacing: 6) {
                    ForEach(0..<pages.count, id: \.self) { index in
                        Capsule()
                            .fill(index == page ? JDTheme.accent : JDTheme.dividerStrong)
                            .frame(width: index == page ? 22 : 7, height: 7)
                    }
                }
            }
            .padding(22)
            .background(JDTheme.surface)
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(JDTheme.divider, lineWidth: 0.5))
            .clipShape(RoundedRectangle(cornerRadius: 18))
            .shadow(color: .black.opacity(0.1), radius: 18, y: 8)
            .padding(.horizontal, 22)

            Spacer(minLength: 20)

            HStack {
                Button("나중에 할게요", action: onSkip)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(JDTheme.tertiaryText)

                Spacer()

                Button {
                    guard !isStarting else { return }
                    if page < pages.count - 1 {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            page += 1
                        }
                    } else {
                        onStart()
                    }
                } label: {
                    Color.clear
                        .frame(width: page == pages.count - 1 ? 92 : 32, height: 38)
                }
                .disabled(isStarting)
                .frame(height: 38)
                .background(JDTheme.accent)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay {
                    if isStarting {
                        HStack(spacing: 7) {
                            ProgressView()
                                .controlSize(.small)
                                .tint(.white)
                            Text("준비 중")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(.white)
                        }
                    } else {
                        Text(page == pages.count - 1 ? "목표 설정하기" : "다음")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.white)
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 28)
        }
    }
}

private struct GoalOnboardingGuidePage {
    var title: String
    var body: String
    var tint: Color
    var preview: GoalOnboardingGuidePreview.Kind
}

private struct GoalOnboardingGuidePreview: View {
    enum Kind {
        case input
        case lock
        case report
    }

    let kind: Kind
    let tint: Color

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 18)
                .fill(JDTheme.surfaceAlt)
            RoundedRectangle(cornerRadius: 18)
                .stroke(JDTheme.divider, lineWidth: 0.5)
            VStack(spacing: 0) {
                previewHeader
                Group {
                    switch kind {
                    case .input:
                        inputPreview
                    case .lock:
                        lockPreview
                    case .report:
                        reportPreview
                    }
                }
                .padding(.horizontal, 12)
                .padding(.top, 8)
                .padding(.bottom, 10)
            }
        }
        .frame(height: 198)
    }

    private var previewHeader: some View {
        HStack(spacing: 5) {
            Capsule()
                .fill(tint)
                .frame(width: 18, height: 4)
            Capsule()
                .fill(tint.opacity(0.35))
                .frame(width: 18, height: 4)
            Spacer()
            Text(headerTitle)
                .font(.system(size: 9.5, weight: .bold))
                .foregroundStyle(JDTheme.tertiaryText)
        }
        .padding(.horizontal, 12)
        .padding(.top, 10)
        .padding(.bottom, 3)
    }

    private var inputPreview: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text("2026년 연간 목표")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(JDTheme.primaryText)
            VStack(spacing: 5) {
                guideGoalRow("주 3회 운동 루틴", locked: true)
                guideGoalRow("글 50편 쓰기", locked: true)
                guideGoalRow("영어 회화 꾸준히", locked: false)
            }
            Text("+ 목표 추가")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(JDTheme.tertiaryText)
                .frame(maxWidth: .infinity)
                .frame(height: 25)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(JDTheme.dividerStrong, style: StrokeStyle(lineWidth: 0.8, dash: [5, 4]))
                )
        }
    }

    private func guideGoalRow(_ title: String, locked: Bool) -> some View {
        HStack(spacing: 8) {
            Text(title)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(JDTheme.primaryText)
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)
            Image(systemName: locked ? "lock.fill" : "lock.open")
                .font(.system(size: 12.5, weight: .semibold))
                .foregroundStyle(locked ? JDTheme.primaryText : JDTheme.tertiaryText)
                .frame(width: 26, height: 26)
        }
        .padding(.leading, 11)
        .padding(.trailing, 6)
        .frame(height: 28)
        .background(JDTheme.surface)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var lockPreview: some View {
        VStack(spacing: 10) {
            HStack(spacing: 10) {
                Image(systemName: "lock.fill")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 42, height: 42)
                    .background(tint)
                    .clipShape(Circle())
                VStack(alignment: .leading, spacing: 4) {
                    Text("고정한 목표")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(JDTheme.primaryText)
                    Text("처음 마음을 표시해둬요")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(JDTheme.secondaryText)
                }
                Spacer()
            }
            VStack(spacing: 6) {
                Text("고정한 목표를 수정할까요?")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(JDTheme.primaryText)
                HStack(spacing: 8) {
                    RoundedRectangle(cornerRadius: 7)
                        .fill(JDTheme.surface)
                        .frame(height: 28)
                    RoundedRectangle(cornerRadius: 7)
                        .fill(tint.opacity(0.18))
                        .frame(height: 28)
                }
            }
            .padding(10)
            .background(JDTheme.surface)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    private var reportPreview: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                GoalRing(progress: 0.68, tint: tint, size: 42, lineWidth: 5)
                VStack(alignment: .leading, spacing: 3) {
                    Text("3월 리포트")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(JDTheme.primaryText)
                    Text("목표와 기록을 함께 정리")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(JDTheme.secondaryText)
                }
                Spacer()
            }
            HStack(spacing: 7) {
                ForEach([0.82, 0.45, 0.64], id: \.self) { value in
                    VStack(alignment: .leading, spacing: 5) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(tint.opacity(0.22))
                            .frame(height: 8)
                        GeometryReader { proxy in
                            ZStack(alignment: .leading) {
                                Capsule().fill(JDTheme.divider)
                                Capsule().fill(tint).frame(width: proxy.size.width * value)
                            }
                        }
                        .frame(height: 4)
                    }
                    .padding(8)
                    .background(JDTheme.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 9))
                }
            }
        }
    }

    private var headerTitle: String {
        switch kind {
        case .input:
            "GOAL SETUP"
        case .lock:
            "LOCK"
        case .report:
            "REPORT"
        }
    }
}

private struct GoalOnboardingPrompt: View {
    let presentation: GoalPromptPresentation
    let onSave: (GoalPromptPresentation, [GoalPromptSaveEntry]) -> Void
    let onDismiss: (GoalPromptPresentation, Bool) -> Void

    @State private var isShowingGuide = true
    @State private var isPreparingGoalSetup = false
    @State private var step = 1
    @State private var yearlyDrafts = GoalPromptDraft.emptyRows(1)
    @State private var monthlyDrafts = GoalPromptDraft.emptyRows(1)

    private var isYearStep: Bool { step == 1 }
    private var activeBinding: Binding<[GoalPromptDraft]> {
        Binding(
            get: { isYearStep ? yearlyDrafts : monthlyDrafts },
            set: { value in
                if isYearStep {
                    yearlyDrafts = value
                } else {
                    monthlyDrafts = value
                }
            }
        )
    }

    var body: some View {
        ZStack {
            if isShowingGuide {
                GoalOnboardingGuide(
                    isStarting: isPreparingGoalSetup,
                    onStart: beginGoalSetup,
                    onSkip: { onDismiss(presentation, true) }
                )
                .transition(.asymmetric(
                    insertion: .opacity,
                    removal: .opacity.combined(with: .scale(scale: 0.98))
                ))
            } else {
                inputView
                    .transition(.asymmetric(
                        insertion: .opacity.combined(with: .scale(scale: 1.02)),
                        removal: .opacity
                    ))
            }
        }
        .animation(.easeInOut(duration: 0.28), value: isShowingGuide)
    }

    private var inputView: some View {
        VStack(spacing: 0) {
            HStack {
                Spacer()
                HStack(spacing: 6) {
                    Capsule()
                        .fill(step >= 1 ? JDTheme.accent : JDTheme.dividerStrong)
                        .frame(width: 22, height: 4)
                    Capsule()
                        .fill(step >= 2 ? JDTheme.accent : JDTheme.dividerStrong)
                        .frame(width: 22, height: 4)
                    Text("\(step)/2")
                        .font(.system(size: 11.5, weight: .semibold))
                        .foregroundStyle(JDTheme.tertiaryText)
                        .padding(.leading, 4)
                }
                Spacer()
            }
            .padding(.horizontal, 20)
            .padding(.top, 14)
            .padding(.bottom, 8)

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    Text(isYearStep ? "STEP 1 · 연간 목표" : "STEP 2 · 월간 목표")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(JDTheme.tertiaryText)
                    Text(isYearStep ? "\(String(JDDate.todayComponents.year))년 연간 목표" : "\(String(JDDate.todayComponents.month))월 월간 목표")
                        .font(.system(size: 26, weight: .bold))
                        .foregroundStyle(JDTheme.primaryText)
                        .padding(.top, 4)
                    Text(isYearStep ? "올해 이루고 싶은 목표를 설정하고 함께 지켜보아요." : "이번 달 이루고 싶은 목표를 설정하고 함께 지켜보아요.")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(JDTheme.secondaryText)
                        .lineSpacing(3)
                        .padding(.top, 8)
                    GoalPromptDraftEditor(drafts: activeBinding, tint: isYearStep ? JDTheme.me : JDTheme.habit)
                        .padding(.top, 22)
                }
                .padding(.horizontal, 20)
                .padding(.top, 14)
                .padding(.bottom, 24)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(
                JDTheme.background
                    .contentShape(Rectangle())
                    .onTapGesture { dismissKeyboard() }
            )

            HStack {
                Button("나중에 할게요") {
                    dismissKeyboard()
                    onDismiss(presentation, true)
                }
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(JDTheme.tertiaryText)

                Spacer()

                Button(isYearStep ? "다음" : "시작하기") {
                    dismissKeyboard()
                    if isYearStep {
                        step = 2
                    } else {
                        save()
                    }
                }
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(.white)
                .padding(.horizontal, 18)
                .frame(height: 38)
                .background(JDTheme.accent)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            .padding(.horizontal, 20)
            .padding(.top, 12)
            .padding(.bottom, 28)
            .overlay(alignment: .top) {
                Rectangle()
                    .fill(JDTheme.divider)
                    .frame(height: 0.5)
            }
        }
    }

    private func save() {
        let targets = presentation.periodTargets
        guard targets.count == 2 else { return }
        onSave(
            presentation,
            [
                GoalPromptSaveEntry(periodType: targets[0].type, periodKey: targets[0].key, drafts: yearlyDrafts),
                GoalPromptSaveEntry(periodType: targets[1].type, periodKey: targets[1].key, drafts: monthlyDrafts)
            ]
        )
    }

    private func beginGoalSetup() {
        guard !isPreparingGoalSetup else { return }
        isPreparingGoalSetup = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.55) {
            withAnimation(.easeInOut(duration: 0.28)) {
                isShowingGuide = false
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                isPreparingGoalSetup = false
            }
        }
    }
}

private struct GoalPeriodPrompt: View {
    let presentation: GoalPromptPresentation
    let title: String
    let eyebrow: String
    let bodyText: String
    let tint: Color
    let sampleDrafts: [GoalPromptDraft]
    let onSave: (GoalPromptPresentation, [GoalPromptSaveEntry]) -> Void
    let onDismiss: (GoalPromptPresentation, Bool) -> Void

    @State private var drafts: [GoalPromptDraft]
    @State private var doNotShowAgain = false

    init(
        presentation: GoalPromptPresentation,
        title: String,
        eyebrow: String,
        bodyText: String,
        tint: Color,
        sampleDrafts: [GoalPromptDraft],
        onSave: @escaping (GoalPromptPresentation, [GoalPromptSaveEntry]) -> Void,
        onDismiss: @escaping (GoalPromptPresentation, Bool) -> Void
    ) {
        self.presentation = presentation
        self.title = title
        self.eyebrow = eyebrow
        self.bodyText = bodyText
        self.tint = tint
        self.sampleDrafts = sampleDrafts
        self.onSave = onSave
        self.onDismiss = onDismiss
        _drafts = State(initialValue: sampleDrafts)
    }

    var body: some View {
        ZStack {
            JDTheme.background.ignoresSafeArea()
            Color.black.opacity(0.32)
                .ignoresSafeArea()
                .onTapGesture { dismissKeyboard() }
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Text(eyebrow)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(tint)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(tint.opacity(0.13))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                    Spacer()
                    Button {
                        dismissKeyboard()
                        onDismiss(presentation, doNotShowAgain)
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(JDTheme.tertiaryText)
                            .frame(width: 30, height: 30)
                    }
                    .buttonStyle(.plain)
                }

                VStack(alignment: .leading, spacing: 7) {
                    Text(title)
                        .font(.system(size: 21, weight: .bold))
                        .foregroundStyle(JDTheme.primaryText)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(bodyText)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(JDTheme.secondaryText)
                        .lineSpacing(4)
                }

                GoalPromptDraftEditor(drafts: $drafts, tint: tint)

                Button {
                    doNotShowAgain.toggle()
                    dismissKeyboard()
                } label: {
                    HStack(spacing: 7) {
                        Image(systemName: doNotShowAgain ? "checkmark.square.fill" : "square")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(doNotShowAgain ? tint : JDTheme.dividerStrong)
                        Text(presentation.kind == .yearly ? "올해는 다시 보지 않기" : "\(GoalSelectors.periodLabel(.monthly, periodKey: presentation.periodKey))엔 다시 보지 않기")
                            .font(.system(size: 11.5, weight: .medium))
                            .foregroundStyle(JDTheme.tertiaryText)
                    }
                }
                .buttonStyle(.plain)

                VStack(spacing: 8) {
                    Button {
                        dismissKeyboard()
                        guard let target = presentation.periodTargets.first else { return }
                        onSave(
                            presentation,
                            [GoalPromptSaveEntry(periodType: target.type, periodKey: target.key, drafts: drafts)]
                        )
                    } label: {
                        Text("저장")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 46)
                            .background(JDTheme.accent)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .buttonStyle(.plain)

                    Button("나중에") {
                        dismissKeyboard()
                        onDismiss(presentation, doNotShowAgain)
                    }
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(JDTheme.tertiaryText)
                    .frame(maxWidth: .infinity)
                    .frame(height: 36)
                }
            }
            .padding(22)
            .background(JDTheme.surface)
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(JDTheme.divider, lineWidth: 0.5))
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .black.opacity(0.2), radius: 22, y: 10)
            .padding(.horizontal, 22)
        }
    }
}

private struct GoalPromptDraftEditor: View {
    @Binding var drafts: [GoalPromptDraft]
    let tint: Color
    @FocusState private var focusedID: UUID?

    var body: some View {
        VStack(spacing: 9) {
            ForEach($drafts) { $draft in
                GoalPromptDraftRow(
                    draft: $draft,
                    tint: tint,
                    canDelete: drafts.count > 1,
                    focusedID: $focusedID,
                    onDelete: {
                        focusedID = nil
                        drafts.removeAll { $0.id == draft.id }
                    }
                )
            }

            if drafts.count < 5 {
                Button {
                    focusedID = nil
                    drafts.append(GoalPromptDraft(title: "", note: "", locked: true))
                } label: {
                    Text("+ 목표 추가  (최대 5개)")
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(JDTheme.tertiaryText)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 11)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(JDTheme.dividerStrong, style: StrokeStyle(lineWidth: 0.8, dash: [5, 4]))
                        )
                }
                .buttonStyle(.plain)
            }
        }
    }
}

private struct GoalPromptDraftRow: View {
    @Binding var draft: GoalPromptDraft
    let tint: Color
    let canDelete: Bool
    var focusedID: FocusState<UUID?>.Binding
    let onDelete: () -> Void

    @State private var offsetX: CGFloat = 0

    var body: some View {
        ZStack(alignment: .trailing) {
            if canDelete {
                Button(role: .destructive, action: onDelete) {
                    Image(systemName: "trash.fill")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 58, height: 82)
                        .background(JDTheme.external)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .buttonStyle(.plain)
            }

            VStack(alignment: .leading, spacing: 7) {
                HStack(alignment: .center, spacing: 10) {
                    TextField("목표", text: $draft.title)
                        .font(.system(size: 15, weight: .semibold))
                        .textInputAutocapitalization(.never)
                        .focused(focusedID, equals: draft.id)
                        .frame(height: 28)

                    Button {
                        focusedID.wrappedValue = nil
                        draft.locked.toggle()
                    } label: {
                        Image(systemName: draft.locked ? "lock.fill" : "lock.open")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundStyle(draft.locked ? JDTheme.primaryText : JDTheme.tertiaryText)
                            .frame(width: 36, height: 36)
                    }
                    .buttonStyle(.plain)
                }

                TextField("메모", text: $draft.note)
                    .font(.system(size: 12.5, weight: .medium))
                    .foregroundStyle(JDTheme.secondaryText)
                    .textInputAutocapitalization(.never)
            }
            .padding(.leading, 14)
            .padding(.trailing, 10)
            .frame(height: 82)
            .background(JDTheme.surface)
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(JDTheme.divider, lineWidth: 0.5))
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .offset(x: offsetX)
            .gesture(
                DragGesture(minimumDistance: 18)
                    .onChanged { value in
                        guard canDelete else { return }
                        offsetX = min(0, max(-70, value.translation.width))
                    }
                    .onEnded { value in
                        guard canDelete else { return }
                        withAnimation(.spring(response: 0.24, dampingFraction: 0.86)) {
                            offsetX = value.translation.width < -42 ? -64 : 0
                        }
                    }
            )
        }
    }
}

private struct GoalDraft {
    var periodType: GoalPeriodType
    var periodKey: String
    var title: String = ""
    var note: String = ""
    var locked: Bool = true
    var target: Int? = nil
}

private struct ReportBanner: View {
    let title: String
    let onOpen: () -> Void
    let onDismiss: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "sparkles")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(JDTheme.accent)
            Text(title)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(JDTheme.primaryText)
                .lineLimit(1)
            Spacer(minLength: 8)
            Button(action: onOpen) {
                Text("보기")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .frame(height: 30)
                    .background(JDTheme.accent)
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
            Button(action: onDismiss) {
                Image(systemName: "xmark")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(JDTheme.secondaryText)
                    .frame(width: 26, height: 26)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("리포트 배너 닫기")
        }
        .padding(.leading, 14)
        .padding(.trailing, 8)
        .padding(.vertical, 10)
        .background(JDTheme.accent.opacity(0.10))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(JDTheme.accent.opacity(0.22), lineWidth: 1)
        )
    }
}

private struct ReportSupportingBanner: View {
    let title: String
    let onOpen: () -> Void

    var body: some View {
        Button(action: onOpen) {
            HStack(spacing: 8) {
                Image(systemName: "sparkles")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(JDTheme.accent)
                Text(title)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(JDTheme.primaryText)
                Spacer(minLength: 6)
                Text("보기")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(JDTheme.accent)
                Image(systemName: "chevron.right")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(JDTheme.accent)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 9)
            .background(JDTheme.accent.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
    }
}

private struct GoalReportTarget: Identifiable, Equatable {
    var periodType: GoalPeriodType
    var periodKey: String

    var id: String { "\(periodType.rawValue)-\(periodKey)" }
}

private struct GoalReportPresentation: Identifiable, Equatable {
    var target: GoalReportTarget
    var isPreview: Bool

    var id: String { "\(target.id)-\(isPreview ? "preview" : "report")" }
}

private struct GoalProgress: Identifiable {
    var goal: Goal
    var relatedTasks: [Task]
    var relatedHabits: [Habit]
    var completedTasks: [Task]
    var slipped: [Task]
    var relatedCount: Int
    var completedCount: Int
    var target: Int?
    var progress: Double

    var id: UUID { goal.id }
}

private enum GoalSelectors {
    static func periodKey(_ type: GoalPeriodType, iso: String) -> String {
        let parts = JDDate.parts(iso)
        return type == .yearly ? "\(parts.year)" : String(format: "%04d-%02d", parts.year, parts.month)
    }

    static func periodLabel(_ type: GoalPeriodType, periodKey: String) -> String {
        if type == .yearly {
            return "\(periodKey)년"
        }
        let parts = periodKey.split(separator: "-").compactMap { Int($0) }
        return "\(parts.dropFirst().first ?? JDDate.todayComponents.month)월"
    }

    static func goalsForPeriod(_ goals: [Goal], type: GoalPeriodType, periodKey: String) -> [Goal] {
        goals
            .filter { $0.periodType == type && $0.periodKey == periodKey }
            .sorted {
                if $0.sortOrder == $1.sortOrder {
                    return $0.title.localizedCompare($1.title) == .orderedAscending
                }
                return $0.sortOrder < $1.sortOrder
            }
    }

    static func range(type: GoalPeriodType, periodKey: String) -> (start: String, end: String) {
        if type == .yearly {
            return ("\(periodKey)-01-01", "\(periodKey)-12-31")
        }
        let parts = periodKey.split(separator: "-").compactMap { Int($0) }
        let year = parts.first ?? JDDate.todayComponents.year
        let month = parts.dropFirst().first ?? JDDate.todayComponents.month
        return (
            JDDate.iso(year: year, month: month, day: 1),
            JDDate.iso(year: year, month: month, day: JDDate.days(year: year, month: month))
        )
    }

    static func progress(goals: [Goal], tasks: [Task], habits: [Habit], type: GoalPeriodType, periodKey: String, today: String, matches: [UUID: GoalMatchSet]? = nil) -> [GoalProgress] {
        let range = range(type: type, periodKey: periodKey)
        let periodTasks = tasks.filter { $0.endDate >= range.start && $0.startDate <= range.end }
        return goalsForPeriod(goals, type: type, periodKey: periodKey).map { goal in
            let goalTokens = GoalTextMatcher.goalTokens(title: goal.title, note: goal.note)
            // Relevance source: E3 semantic matches when the goal is embedded
            // (present in `matches`), else the E1 token matcher (offline /
            // signed out / not-yet-embedded). Either way a goal with no matching
            // items shows "관련 항목 없음" — never the global completion rate.
            let semantic = matches?[goal.id]
            let relatedTasks: [Task]
            let relatedHabits: [Habit]
            if let semantic {
                relatedTasks = periodTasks.filter { semantic.taskIds.contains($0.id) }
                relatedHabits = habits.filter { semantic.habitIds.contains($0.id) }
            } else {
                relatedTasks = periodTasks.filter {
                    GoalTextMatcher.overlaps(goalTokens, GoalTextMatcher.tokenize("\($0.title) \($0.tags.joined(separator: " "))"))
                }
                relatedHabits = habits.filter {
                    GoalTextMatcher.overlaps(goalTokens, GoalTextMatcher.tokenize($0.title))
                }
            }
            let completedTasks = relatedTasks.filter(\.isCompleted)
            let slipped = relatedTasks.filter { !$0.isCompleted && $0.endDate < range.end }
            let habitScores = relatedHabits.map { habitPeriodScore($0, start: range.start, end: range.end, today: today) }
            let relatedCount = relatedTasks.count + relatedHabits.count
            // tasks score 0/1; habits score their fractional period ratio.
            let score = Double(completedTasks.count) + habitScores.reduce(0, +)
            let completedCount = completedTasks.count + habitScores.filter { $0 >= 1 }.count
            // An optional target only replaces the denominator (the numerator stays
            // the auto-derived score), so a quantitative goal like 책 3권 reads
            // progress toward its target instead of toward the matched-item count.
            let target = (goal.target ?? 0) > 0 ? goal.target : nil
            let progress: Double
            if let target {
                progress = min(score, Double(target)) / Double(target)
            } else {
                progress = relatedCount == 0 ? 0 : score / Double(relatedCount)
            }
            return GoalProgress(
                goal: goal,
                relatedTasks: relatedTasks,
                relatedHabits: relatedHabits,
                completedTasks: completedTasks,
                slipped: slipped,
                relatedCount: relatedCount,
                completedCount: completedCount,
                target: target,
                progress: progress
            )
        }
    }

    /// A habit's period completion over its elapsed active days (logged active
    /// days / active days up to today). `active` also tells whether a habit
    /// applies to the period at all. Mirrors web `habitPeriodStats`.
    static func habitPeriodStats(_ habit: Habit, start: String, end: String, today: String) -> (active: Int, done: Int, rate: Double) {
        let last = today < end ? today : end
        if last < start { return (0, 0, 0) }
        var active = 0
        var done = 0
        var iso = start
        while iso <= last {
            if habitActiveOn(habit, iso: iso) {
                active += 1
                if habit.log[iso] == 1 { done += 1 }
            }
            iso = JDDate.addDays(iso, 1)
        }
        return (active, done, active == 0 ? 0 : Double(done) / Double(active))
    }

    /// A matched habit contributes its period log-completion ratio, mirroring web.
    private static func habitPeriodScore(_ habit: Habit, start: String, end: String, today: String) -> Double {
        habitPeriodStats(habit, start: start, end: end, today: today).rate
    }

    private static func habitActiveOn(_ habit: Habit, iso: String) -> Bool {
        guard habit.recurType == .weekly else { return true }
        guard let days = habit.recurDays, !days.isEmpty else { return false }
        return days.contains(JDDate.weekday(iso))
    }

    static func heatmap(tasks: [Task], habits: [Habit], type: GoalPeriodType, periodKey: String) -> [Int] {
        if type == .yearly {
            return (1...12).map { month in
                let prefix = "\(periodKey)-\(String(format: "%02d", month))"
                return tasks.filter { $0.isCompleted && $0.endDate.hasPrefix(prefix) }.count
            }
        }
        let range = range(type: type, periodKey: periodKey)
        let start = JDDate.parts(range.start)
        let days = JDDate.days(year: start.year, month: start.month)
        return (0..<days).map { offset in
            let iso = JDDate.addDays(range.start, offset)
            let completedTasks = tasks.filter { $0.isCompleted && $0.endDate == iso }.count
            let completedHabits = habits.filter { $0.log[iso] == 1 }.count
            return completedTasks + completedHabits
        }
    }

    // --- Activity summary rollups (report 활동 page), mirroring web selectors ---

    static func periodTasks(_ tasks: [Task], type: GoalPeriodType, periodKey: String) -> [Task] {
        let range = range(type: type, periodKey: periodKey)
        return tasks.filter { $0.endDate >= range.start && $0.startDate <= range.end }
    }

    /// Task 완료율 over the whole period.
    static func taskCompletion(tasks: [Task], type: GoalPeriodType, periodKey: String) -> (completed: Int, total: Int, rate: Double) {
        let period = periodTasks(tasks, type: type, periodKey: periodKey)
        let completed = period.filter(\.isCompleted).count
        let total = period.count
        return (completed, total, total == 0 ? 0 : Double(completed) / Double(total))
    }

    /// 카테고리별 완료율: period tasks grouped by category, most-active first.
    static func categoryCompletion(tasks: [Task], categories: [JDCategory], type: GoalPeriodType, periodKey: String) -> [CategoryCompletionRow] {
        let period = periodTasks(tasks, type: type, periodKey: periodKey)
        var groups: [String: (completed: Int, total: Int)] = [:]
        for task in period {
            let key = task.categoryID?.uuidString ?? ""
            var group = groups[key] ?? (0, 0)
            group.total += 1
            if task.isCompleted { group.completed += 1 }
            groups[key] = group
        }
        let rows = groups.map { key, group -> CategoryCompletionRow in
            let uuid = UUID(uuidString: key)
            let category = uuid.flatMap { id in categories.first { $0.id == id } }
            return CategoryCompletionRow(
                categoryId: uuid,
                name: category?.name ?? "미분류",
                color: category?.color ?? "#9CA3AF",
                completed: group.completed,
                total: group.total,
                rate: group.total == 0 ? 0 : Double(group.completed) / Double(group.total)
            )
        }
        return rows.sorted {
            $0.total != $1.total ? $0.total > $1.total : $0.name.localizedCompare($1.name) == .orderedAscending
        }
    }

    /// Habit 달성률: per-habit completion over elapsed active days + the average.
    static func habitAchievement(habits: [Habit], type: GoalPeriodType, periodKey: String, today: String) -> (average: Double, items: [HabitAchievementRow]) {
        let range = range(type: type, periodKey: periodKey)
        var items: [HabitAchievementRow] = []
        for habit in habits {
            let stats = habitPeriodStats(habit, start: range.start, end: range.end, today: today)
            if stats.active == 0 { continue }
            items.append(HabitAchievementRow(habitId: habit.id, title: habit.title, emoji: habit.emoji, rate: stats.rate))
        }
        let average = items.isEmpty ? 0 : items.map(\.rate).reduce(0, +) / Double(items.count)
        return (average, items)
    }

    /// 최고 스트릭: habit with the longest current streak as of today.
    static func bestStreak(habits: [Habit], today: String) -> StreakHighlight? {
        var best: StreakHighlight?
        for habit in habits {
            let streak = JDDate.habitStreak(habit, selectedDate: today)
            if streak <= 0 { continue }
            if best == nil || streak > best!.streak {
                best = StreakHighlight(title: habit.title, emoji: habit.emoji, streak: streak)
            }
        }
        return best
    }

    /// 가장 많이 밀린 작업: incomplete period task overdue (endDate < today) the longest.
    static func mostSlipped(tasks: [Task], type: GoalPeriodType, periodKey: String, today: String) -> SlippedHighlight? {
        let period = periodTasks(tasks, type: type, periodKey: periodKey)
        var worst: SlippedHighlight?
        for task in period {
            if task.isCompleted || task.endDate >= today { continue }
            let overdue = daysBetween(task.endDate, today)
            if worst == nil || overdue > worst!.overdueDays {
                worst = SlippedHighlight(title: task.title, overdueDays: overdue)
            }
        }
        return worst
    }

    private static func daysBetween(_ fromISO: String, _ toISO: String) -> Int {
        let f = JDDate.parts(fromISO)
        let t = JDDate.parts(toISO)
        let calendar = Calendar.current
        guard
            let from = calendar.date(from: DateComponents(year: f.year, month: f.month, day: f.day)),
            let to = calendar.date(from: DateComponents(year: t.year, month: t.month, day: t.day))
        else { return 0 }
        return calendar.dateComponents([.day], from: from, to: to).day ?? 0
    }

}

struct CategoryCompletionRow: Identifiable {
    let categoryId: UUID?
    let name: String
    let color: String
    let completed: Int
    let total: Int
    let rate: Double
    var id: String { categoryId?.uuidString ?? "none" }
}

struct HabitAchievementRow: Identifiable {
    let habitId: UUID
    let title: String
    let emoji: String
    let rate: Double
    var id: UUID { habitId }
}

struct StreakHighlight {
    let title: String
    let emoji: String
    let streak: Int
}

struct SlippedHighlight {
    let title: String
    let overdueDays: Int
}

private struct GoalManagementSheet: View {
    let goals: [Goal]
    let tasks: [Task]
    let habits: [Habit]
    let categories: [JDCategory]
    let isProPlan: Bool
    let onAddGoal: (GoalDraft) -> Void
    let onSaveGoal: (Goal) -> Void
    let onDeleteGoal: (Goal) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var editingDraft: GoalEditorDraft?
    @State private var lockedGoal: Goal?
    @State private var reportPresentation: GoalReportPresentation?
    @State private var yearlyMatches: [UUID: GoalMatchSet]?
    @State private var monthlyMatches: [UUID: GoalMatchSet]?

    private var yearlyKey: String { GoalSelectors.periodKey(.yearly, iso: JDDate.todayISO) }
    private var monthlyKey: String { GoalSelectors.periodKey(.monthly, iso: JDDate.todayISO) }

    private var supportingReports: [GoalReportAvailability] {
        let today = JDDate.todayComponents
        return GoalReportSelectors.availableReports(todayYear: today.year, todayMonth: today.month, goals: goals)
    }

    private func supportingBannerTitle(_ report: GoalReportAvailability) -> String {
        if report.periodType == .yearly {
            return "\(report.periodKey)년 리포트 준비 완료"
        }
        return "\(GoalSelectors.periodLabel(.monthly, periodKey: report.periodKey)) 리포트 준비 완료"
    }

    private func openSupportingReport(_ report: GoalReportAvailability) {
        reportPresentation = GoalReportPresentation(
            target: GoalReportTarget(periodType: report.periodType, periodKey: report.periodKey),
            isPreview: !isProPlan
        )
    }

    var body: some View {
        VStack(spacing: 0) {
            SheetCloseHeader(title: "목표", onClose: { dismiss() })
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 16) {
                    if let yearlyReport = supportingReports.first(where: { $0.periodType == .yearly }) {
                        ReportSupportingBanner(
                            title: supportingBannerTitle(yearlyReport),
                            onOpen: { openSupportingReport(yearlyReport) }
                        )
                    }
                    GoalPeriodCards(
                        title: "연간 · \(yearlyKey)",
                        tint: JDTheme.me,
                        progress: GoalSelectors.progress(goals: goals, tasks: tasks, habits: habits, type: .yearly, periodKey: yearlyKey, today: JDDate.todayISO, matches: yearlyMatches),
                        onAdd: { startAdd(.yearly, yearlyKey) },
                        onEdit: startEdit(_:),
                        onToggleLock: toggleGoalLock(_:)
                    )
                    if let monthlyReport = supportingReports.first(where: { $0.periodType == .monthly }) {
                        ReportSupportingBanner(
                            title: supportingBannerTitle(monthlyReport),
                            onOpen: { openSupportingReport(monthlyReport) }
                        )
                    }
                    GoalPeriodCards(
                        title: "월간 · \(GoalSelectors.periodLabel(.monthly, periodKey: monthlyKey))",
                        tint: JDTheme.habit,
                        progress: GoalSelectors.progress(goals: goals, tasks: tasks, habits: habits, type: .monthly, periodKey: monthlyKey, today: JDDate.todayISO, matches: monthlyMatches),
                        onAdd: { startAdd(.monthly, monthlyKey) },
                        onEdit: startEdit(_:),
                        onToggleLock: toggleGoalLock(_:)
                    )
                }
                .padding(.horizontal, 16)
                .padding(.top, 4)
                .padding(.bottom, 28)
            }
        }
        .background(JDTheme.background)
        .overlay { goalEditorOverlay }
            .alert("고정한 목표를 수정할까요?", isPresented: lockedGoalBinding) {
                Button("유지하기", role: .cancel) {
                    lockedGoal = nil
                }
                Button("수정하기") {
                    guard var goal = lockedGoal else { return }
                    goal.locked = false
                    goal.lockedAt = nil
                    onSaveGoal(goal)
                    editingDraft = GoalEditorDraft(goal: goal)
                    lockedGoal = nil
                }
            } message: {
                Text("처음 세운 약속과 달라질 수 있어요.")
            }
            .fullScreenCover(item: $reportPresentation) { presentation in
                GoalReportFullScreen(
                    presentation: presentation,
                    goals: goals,
                    tasks: tasks,
                    habits: habits,
                    categories: categories,
                    onClose: { reportPresentation = nil }
                )
            }
            .task(id: goals.count + tasks.count + habits.count) {
                let provider = GoalMatchProvider()
                yearlyMatches = await provider.fetch(periodType: .yearly, periodKey: yearlyKey)
                monthlyMatches = await provider.fetch(periodType: .monthly, periodKey: monthlyKey)
            }
    }

    @ViewBuilder
    private var goalEditorOverlay: some View {
        if let editingDraft {
            ZStack {
                Color.black.opacity(0.24)
                    .ignoresSafeArea()
                    .onTapGesture { self.editingDraft = nil }

                GoalEditorDialog(
                    draft: editingDraft,
                    onCancel: { self.editingDraft = nil },
                    onSave: saveEditorDraft(_:),
                    onDelete: deleteEditorDraft(_:)
                )
                .padding(.horizontal, 24)
                .transition(.scale(scale: 0.96).combined(with: .opacity))
            }
            .animation(.easeOut(duration: 0.18), value: editingDraft.id)
        }
    }

    private var lockedGoalBinding: Binding<Bool> {
        Binding(
            get: { lockedGoal != nil },
            set: { if !$0 { lockedGoal = nil } }
        )
    }

    private func startAdd(_ type: GoalPeriodType, _ key: String) {
        guard GoalSelectors.goalsForPeriod(goals, type: type, periodKey: key).count < 5 else { return }
        editingDraft = GoalEditorDraft(draft: GoalDraft(periodType: type, periodKey: key))
    }

    private func startEdit(_ goal: Goal) {
        if goal.locked {
            lockedGoal = goal
        } else {
            editingDraft = GoalEditorDraft(goal: goal)
        }
    }

    private func toggleGoalLock(_ goal: Goal) {
        var updated = goal
        updated.locked.toggle()
        updated.lockedAt = updated.locked ? (updated.lockedAt ?? JDDate.nowISODateTime) : nil
        onSaveGoal(updated)
    }

    private func saveEditorDraft(_ draft: GoalEditorDraft) {
        if var goal = draft.goal {
            goal.title = draft.title
            goal.note = draft.note
            goal.locked = draft.locked
            goal.target = draft.parsedTarget
            onSaveGoal(goal)
        } else {
            onAddGoal(
                GoalDraft(
                    periodType: draft.periodType,
                    periodKey: draft.periodKey,
                    title: draft.title,
                    note: draft.note ?? "",
                    locked: draft.locked,
                    target: draft.parsedTarget
                )
            )
        }
        editingDraft = nil
    }

    private func deleteEditorDraft(_ draft: GoalEditorDraft) {
        if let goal = draft.goal {
            onDeleteGoal(goal)
        }
        editingDraft = nil
    }
}

private struct GoalPeriodCards: View {
    let title: String
    let tint: Color
    let progress: [GoalProgress]
    let onAdd: () -> Void
    let onEdit: (Goal) -> Void
    let onToggleLock: (Goal) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Text(title)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(JDTheme.tertiaryText)
                Rectangle()
                    .fill(JDTheme.divider)
                    .frame(height: 0.5)
                Text("\(progress.count)/5")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(JDTheme.tertiaryText)
            }

            if progress.isEmpty {
                Button(action: onAdd) {
                    GoalAddButtonLabel()
                }
                .buttonStyle(.plain)
            } else {
                VStack(spacing: 8) {
                    ForEach(progress) { item in
                        GoalCard(
                            progress: item,
                            tint: tint,
                            onTap: { onEdit(item.goal) },
                            onToggleLock: { onToggleLock(item.goal) }
                        )
                    }
                }

                Button(action: onAdd) {
                    GoalAddButtonLabel()
                }
                .buttonStyle(.plain)
                .disabled(progress.count >= 5)
                .opacity(progress.count >= 5 ? 0.45 : 1)
            }

        }
    }
}

private struct GoalAddButtonLabel: View {
    var body: some View {
        Text("+ 목표 추가  (최대 5개)")
            .font(.system(size: 12.5, weight: .semibold))
            .foregroundStyle(JDTheme.tertiaryText)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 11)
            .background(JDTheme.surface)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(JDTheme.dividerStrong, style: StrokeStyle(lineWidth: 0.8, dash: [5, 4]))
            )
            .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

private struct GoalCard: View {
    let progress: GoalProgress
    let tint: Color
    let onTap: () -> Void
    let onToggleLock: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: 5) {
                    HStack(spacing: 5) {
                        Circle()
                            .fill(tint)
                            .frame(width: 5, height: 5)
                        Text(progress.goal.periodType == .yearly ? "연간" : "월간")
                            .font(.system(size: 10.5, weight: .bold))
                            .foregroundStyle(tint)
                    }
                    Text(progress.goal.title)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(JDTheme.primaryText)
                        .lineLimit(2)
                    if let note = progress.goal.note, !note.isEmpty {
                        Text(note)
                            .font(.system(size: 12.5, weight: .medium))
                            .foregroundStyle(JDTheme.secondaryText)
                            .lineLimit(2)
                    }
                }

                Spacer(minLength: 16)

                if let target = progress.target {
                    HStack(alignment: .firstTextBaseline, spacing: 12) {
                        Text("목표 \(min(progress.completedCount, target))/\(target)")
                            .font(.system(size: 12.5, weight: .medium))
                            .foregroundStyle(JDTheme.tertiaryText)
                            .monospacedDigit()
                        if !progress.relatedHabits.isEmpty {
                            Text("습관 \(progress.relatedHabits.count)")
                                .font(.system(size: 12.5, weight: .medium))
                                .foregroundStyle(JDTheme.tertiaryText)
                                .monospacedDigit()
                        }
                        if !progress.slipped.isEmpty {
                            Text("\(progress.slipped.count)개 밀림")
                                .font(.system(size: 12.5, weight: .medium))
                                .foregroundStyle(JDTheme.external)
                                .monospacedDigit()
                        }
                    }
                } else if progress.relatedCount == 0 {
                    Text("관련 항목 없음")
                        .font(.system(size: 12.5, weight: .medium))
                        .foregroundStyle(JDTheme.tertiaryText)
                } else {
                    HStack(alignment: .firstTextBaseline, spacing: 12) {
                        if !progress.relatedTasks.isEmpty {
                            Text("할 일 \(progress.completedTasks.count)/\(progress.relatedTasks.count)")
                                .font(.system(size: 12.5, weight: .medium))
                                .foregroundStyle(JDTheme.tertiaryText)
                                .monospacedDigit()
                        }
                        if !progress.relatedHabits.isEmpty {
                            Text("습관 \(progress.relatedHabits.count)")
                                .font(.system(size: 12.5, weight: .medium))
                                .foregroundStyle(JDTheme.tertiaryText)
                                .monospacedDigit()
                        }
                        if !progress.slipped.isEmpty {
                            Text("\(progress.slipped.count)개 밀림")
                                .font(.system(size: 12.5, weight: .medium))
                                .foregroundStyle(JDTheme.external)
                                .monospacedDigit()
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(minHeight: 92, alignment: .topLeading)

            VStack(alignment: .trailing, spacing: 0) {
                if progress.relatedCount == 0 && progress.target == nil {
                    Circle()
                        .strokeBorder(JDTheme.divider, lineWidth: 5)
                        .frame(width: 52, height: 52)
                        .overlay(
                            Text("—")
                                .font(.system(size: 15, weight: .bold))
                                .foregroundStyle(JDTheme.tertiaryText)
                        )
                } else {
                    GoalRingWithText(progress: progress.progress, tint: tint, size: 52, lineWidth: 5)
                }

                Spacer(minLength: 22)

                GoalLockBadge(locked: progress.goal.locked, action: onToggleLock)
            }
            .frame(minWidth: 64, maxWidth: 64, minHeight: 92, alignment: .topTrailing)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 14)
        .background(JDTheme.surface)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(JDTheme.divider, lineWidth: 0.5)
        )
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .contentShape(RoundedRectangle(cornerRadius: 16))
        .onTapGesture(perform: onTap)
    }
}

private struct GoalLockBadge: View {
    let locked: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Image(systemName: locked ? "lock.fill" : "lock.open")
                    .font(.system(size: 9.5, weight: .semibold))
                Text(locked ? "고정" : "열림")
                    .font(.system(size: 10.5, weight: .bold))
            }
            .foregroundStyle(locked ? JDTheme.me : JDTheme.tertiaryText)
            .padding(.horizontal, 8)
            .frame(height: 23)
            .background((locked ? JDTheme.me : JDTheme.tertiaryText).opacity(0.16))
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(locked ? "목표 고정 해제" : "목표 고정")
    }
}

private struct GoalRingWithText: View {
    let progress: Double
    let tint: Color
    let size: CGFloat
    let lineWidth: CGFloat

    private var normalizedProgress: Double {
        min(1, max(0, progress))
    }

    private var percentageText: String {
        "\(Int((normalizedProgress * 100).rounded()))%"
    }

    var body: some View {
        ZStack {
            GoalRing(progress: normalizedProgress, tint: tint, size: size, lineWidth: lineWidth)
            Text(percentageText)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(JDTheme.primaryText)
                .monospacedDigit()
        }
        .frame(width: size, height: size)
    }
}

private struct GoalEditorDraft: Identifiable {
    var id = UUID()
    var goal: Goal?
    var periodType: GoalPeriodType
    var periodKey: String
    var title: String
    var note: String?
    var locked: Bool
    var targetText: String

    init(draft: GoalDraft) {
        periodType = draft.periodType
        periodKey = draft.periodKey
        title = draft.title
        note = draft.note
        locked = draft.locked
        targetText = draft.target.map(String.init) ?? ""
    }

    init(goal: Goal) {
        self.goal = goal
        periodType = goal.periodType
        periodKey = goal.periodKey
        title = goal.title
        note = goal.note
        locked = goal.locked
        targetText = goal.target.map(String.init) ?? ""
    }

    /// Parsed positive target, or nil when blank/invalid.
    var parsedTarget: Int? {
        guard let value = Int(targetText.trimmingCharacters(in: .whitespaces)), value > 0 else { return nil }
        return value
    }
}

private struct GoalEditorDialog: View {
    @State var draft: GoalEditorDraft
    @State private var isShowingDeleteConfirmation = false
    let onCancel: () -> Void
    let onSave: (GoalEditorDraft) -> Void
    let onDelete: (GoalEditorDraft) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text(draft.goal == nil ? "목표 추가" : "목표 수정")
                    .font(.system(size: 19, weight: .bold))
                Spacer()
                Button(action: onCancel) {
                    Image(systemName: "xmark")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(JDTheme.secondaryText)
                        .frame(width: 30, height: 30)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("닫기")
            }

            HStack(alignment: .center, spacing: 10) {
                TextField("목표", text: $draft.title)
                    .font(.system(size: 15, weight: .semibold))
                    .textInputAutocapitalization(.never)
                    .frame(height: 28)

                Spacer(minLength: 0)

                Button {
                    draft.locked.toggle()
                } label: {
                    Image(systemName: draft.locked ? "lock.fill" : "lock.open")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(draft.locked ? JDTheme.primaryText : JDTheme.tertiaryText)
                        .frame(width: 36, height: 36)
                }
                .buttonStyle(.plain)
            }
            .padding(.leading, 14)
            .padding(.trailing, 10)
            .frame(height: 54)
            .background(JDTheme.surface)
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(JDTheme.divider, lineWidth: 0.5))
            .clipShape(RoundedRectangle(cornerRadius: 10))

            TextField("메모", text: noteBinding)
                .font(.system(size: 13, weight: .medium))
                .textInputAutocapitalization(.never)
                .padding(.horizontal, 14)
                .frame(height: 48)
                .background(JDTheme.surface)
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(JDTheme.divider, lineWidth: 0.5))
            .clipShape(RoundedRectangle(cornerRadius: 10))

            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("목표 수치 (선택)")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(JDTheme.primaryText)
                    Text(draft.periodType == .yearly ? "올해 몇 개를 목표로 하나요? 예: 책 12권 → 12" : "이번 달 몇 개를 목표로 하나요? 예: 책 3권 → 3")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(JDTheme.tertiaryText)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 8)
                TextField("—", text: targetBinding)
                    .font(.system(size: 14, weight: .semibold))
                    .multilineTextAlignment(.center)
                    .keyboardType(.numberPad)
                    .frame(width: 56, height: 34)
                    .background(JDTheme.surface)
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(JDTheme.divider, lineWidth: 0.5))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            .padding(.horizontal, 14)
            .frame(minHeight: 48)
            .background(JDTheme.surface)
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(JDTheme.divider, lineWidth: 0.5))
            .clipShape(RoundedRectangle(cornerRadius: 10))

            HStack(spacing: 8) {
                Spacer()
                if draft.goal != nil {
                    Button("삭제", role: .destructive) {
                        isShowingDeleteConfirmation = true
                    }
                    .font(.system(size: 14, weight: .semibold))
                    .padding(.horizontal, 12)
                    .frame(height: 38)
                }
                Button("저장") {
                    onSave(draft)
                }
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(.white)
                .padding(.horizontal, 18)
                .frame(height: 38)
                .background(JDTheme.primaryText)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .buttonStyle(.plain)
            }
            .padding(.top, 4)
        }
        .padding(18)
        .frame(maxWidth: 340)
        .background(JDTheme.surface)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(JDTheme.divider, lineWidth: 0.5))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.16), radius: 24, y: 12)
        .alert("목표를 삭제할까요?", isPresented: $isShowingDeleteConfirmation) {
            Button("취소", role: .cancel) {}
            Button("삭제", role: .destructive) {
                onDelete(draft)
            }
        } message: {
            Text("삭제한 목표는 되돌릴 수 없고, 동기화 대기열에 반영됩니다.")
        }
    }

    private var noteBinding: Binding<String> {
        Binding(
            get: { draft.note ?? "" },
            set: { draft.note = $0 }
        )
    }

    private var targetBinding: Binding<String> {
        Binding(
            get: { draft.targetText },
            set: { draft.targetText = $0.filter(\.isNumber) }
        )
    }
}

private struct GoalReportFullScreen: View {
    let presentation: GoalReportPresentation
    let goals: [Goal]
    let tasks: [Task]
    let habits: [Habit]
    let categories: [JDCategory]
    let onClose: () -> Void

    @State private var page = 0
    @State private var matches: [UUID: GoalMatchSet]?

    private var type: GoalPeriodType { presentation.target.periodType }
    private var periodKey: String { presentation.target.periodKey }
    private var taskCompletion: (completed: Int, total: Int, rate: Double) {
        GoalSelectors.taskCompletion(tasks: tasks, type: type, periodKey: periodKey)
    }
    private var categoryRows: [CategoryCompletionRow] {
        GoalSelectors.categoryCompletion(tasks: tasks, categories: categories, type: type, periodKey: periodKey)
    }
    private var habitAchievement: (average: Double, items: [HabitAchievementRow]) {
        GoalSelectors.habitAchievement(habits: habits, type: type, periodKey: periodKey, today: JDDate.todayISO)
    }
    private var bestStreak: StreakHighlight? { GoalSelectors.bestStreak(habits: habits, today: JDDate.todayISO) }
    private var mostSlipped: SlippedHighlight? {
        GoalSelectors.mostSlipped(tasks: tasks, type: type, periodKey: periodKey, today: JDDate.todayISO)
    }

    private var tint: Color { presentation.target.periodType == .yearly ? JDTheme.me : JDTheme.habit }
    private var progress: [GoalProgress] {
        GoalSelectors.progress(
            goals: goals,
            tasks: tasks,
            habits: habits,
            type: presentation.target.periodType,
            periodKey: presentation.target.periodKey,
            today: JDDate.todayISO,
            matches: matches
        )
    }
    private var average: Double {
        guard !progress.isEmpty else { return 0 }
        return progress.map(\.progress).reduce(0, +) / Double(progress.count)
    }

    var body: some View {
        ZStack {
            JDTheme.background.ignoresSafeArea()
            reportFlow
                .blur(radius: presentation.isPreview ? 6 : 0)
                .disabled(presentation.isPreview)
                .accessibilityHidden(presentation.isPreview)
            if presentation.isPreview {
                GoalReportLockedOverlay(onClose: onClose)
            }
        }
        .task {
            matches = await GoalMatchProvider().fetch(
                periodType: presentation.target.periodType,
                periodKey: presentation.target.periodKey
            )
        }
    }

    // Real-data narrative: name the best-progress and most-behind goals. Only
    // goals with related items are ranked.
    private var ranked: [GoalProgress] {
        progress.filter { $0.relatedCount > 0 }.sorted { $0.progress > $1.progress }
    }
    private var bestGoal: GoalProgress? { ranked.first }
    private var behindGoal: GoalProgress? { ranked.count > 1 ? ranked.last : nil }
    private var isYear: Bool { presentation.target.periodType == .yearly }

    private var reportFlow: some View {
        VStack(spacing: 0) {
            HStack {
                Button(action: onClose) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 16, weight: .semibold))
                }
                .foregroundStyle(JDTheme.accent)
                Spacer()
                Text(reportTitle)
                    .font(.system(size: 16, weight: .semibold))
                Spacer()
                Text("\(page + 1)/4")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(JDTheme.tertiaryText)
                    .frame(width: 36, alignment: .trailing)
            }
            .padding(.horizontal, 18)
            .padding(.top, 14)
            .padding(.bottom, 8)

            TabView(selection: $page) {
                GoalReportPage(
                    eyebrow: presentation.target.periodType == .yearly ? "\(presentation.target.periodKey) · 연간 리포트" : "\(GoalSelectors.periodLabel(.monthly, periodKey: presentation.target.periodKey)) · 월간 리포트",
                    title: presentation.target.periodType == .yearly ? "\(presentation.target.periodKey), 어디까지 왔나요" : "\(GoalSelectors.periodLabel(.monthly, periodKey: presentation.target.periodKey)), 어떻게 지나갔나요",
                    tint: tint
                ) {
                    GoalMetricGrid(metrics: [
                        ("목표", "\(progress.count)", ""),
                        ("평균 진행", "\(Int((average * 100).rounded()))", "%"),
                        ("완료 할 일", "\(progress.flatMap(\.completedTasks).count)", ""),
                        ("밀림", "\(progress.flatMap(\.slipped).count)", "")
                    ])
                }
                .tag(0)

                GoalReportPage(eyebrow: "활동 흐름", title: presentation.target.periodType == .yearly ? "월별 흐름" : "활동 히트맵", tint: tint) {
                    GoalHeatmap(values: GoalSelectors.heatmap(tasks: tasks, habits: habits, type: presentation.target.periodType, periodKey: presentation.target.periodKey), tint: tint)
                    GoalActivitySummary(
                        taskCompletion: taskCompletion,
                        categoryRows: categoryRows,
                        habitAchievement: habitAchievement,
                        bestStreak: bestStreak,
                        mostSlipped: mostSlipped,
                        tint: tint
                    )
                }
                .tag(1)

                GoalReportPage(eyebrow: "목표별 진행", title: presentation.target.periodType == .yearly ? "연간 목표" : "목표별", tint: tint) {
                    VStack(spacing: 10) {
                        ForEach(progress) { item in
                            GoalProgressRow(item: item, tint: tint)
                        }
                    }
                }
                .tag(2)

                GoalReportPage(eyebrow: "이야기", title: presentation.target.periodType == .yearly ? "한 해의 이야기" : "한 달의 이야기", tint: tint) {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(narrative)
                            .font(.system(size: 14, weight: .medium))
                            .lineSpacing(8)
                            .foregroundStyle(JDTheme.primaryText)
                            .padding(16)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(JDTheme.surface)
                            .clipShape(RoundedRectangle(cornerRadius: 12))

                        VStack(alignment: .leading, spacing: 4) {
                            Text("회고")
                                .font(.system(size: 10.5, weight: .bold))
                                .foregroundStyle(JDTheme.tertiaryText)
                            Text(isYear ? "내년엔 무엇을 다르게 해볼까요?" : "다음 달엔 무엇을 바꿔볼까요?")
                                .font(.system(size: 13.5, weight: .medium))
                                .foregroundStyle(JDTheme.primaryText)
                        }
                        .padding(14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(JDTheme.surfaceAlt)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
                .tag(3)
            }
            .tabViewStyle(.page(indexDisplayMode: .automatic))
        }
    }

    private var reportTitle: String {
        presentation.target.periodType == .yearly ? "\(presentation.target.periodKey)" : "\(GoalSelectors.periodLabel(.monthly, periodKey: presentation.target.periodKey)) 리포트"
    }

    private var narrative: String {
        let completed = progress.flatMap(\.completedTasks).count
        if progress.isEmpty {
            return "아직 기록된 목표가 없어요. 다음 기간에는 작은 약속 하나부터 쌓아볼 수 있습니다."
        }
        var lines = ["이번 기간에는 \(progress.count)개의 목표를 중심으로 \(completed)개의 항목이 완료됐어요."]
        if let best = bestGoal {
            var line = "가장 멀리 간 목표는 \(best.goal.title)(으)로 \(Int((best.progress * 100).rounded()))%까지 왔어요."
            if let behind = behindGoal {
                line += " 반대로 \(behind.goal.title)은(는) \(Int((behind.progress * 100).rounded()))%에 머물렀습니다."
            }
            lines.append(line)
        } else {
            lines.append("이번 기간에는 목표와 이어진 활동이 아직 많지 않았어요. 목표와 맞닿은 일을 하나씩 적어보면 흐름이 보일 거예요.")
        }
        if let behind = behindGoal {
            lines.append("\(behind.goal.title)처럼 더딘 목표 하나를 먼저 작게 쪼개보세요.")
        }
        return lines.joined(separator: "\n\n")
    }
}

private struct GoalReportPage<Content: View>: View {
    let eyebrow: String
    let title: String
    let tint: Color
    @ViewBuilder let content: Content

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 5) {
                    Text(eyebrow)
                        .font(.system(size: 10.5, weight: .bold))
                        .foregroundStyle(JDTheme.tertiaryText)
                    Text(title)
                        .font(.system(size: 26, weight: .bold))
                        .foregroundStyle(JDTheme.primaryText)
                }
                content
                Spacer(minLength: 40)
            }
            .padding(.horizontal, 18)
            .padding(.top, 12)
        }
    }
}

private struct GoalReportLockedOverlay: View {
    let onClose: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button(action: onClose) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(JDTheme.accent)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                Spacer()
                Text("FREE")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(JDTheme.tertiaryText)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(JDTheme.tertiaryText.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 5))
                    .padding(.trailing, 14)
            }
            .padding(.top, 8)

            Spacer()

            VStack(spacing: 8) {
                Image(systemName: "lock")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(JDTheme.secondaryText)
                Text("전체 리포트는 Pro에서 펼쳐져요")
                    .font(.system(size: 16, weight: .bold))
                    .multilineTextAlignment(.center)
                Text("목표별 진행, 활동 흐름, 이번 기간의 이야기까지\nTrial 또는 Pro에서 볼 수 있어요.")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(JDTheme.secondaryText)
                    .multilineTextAlignment(.center)
                Button("닫기") { onClose() }
                    .buttonStyle(.borderedProminent)
                    .tint(JDTheme.primaryText)
                    .padding(.top, 4)
            }
            .padding(22)
            .frame(maxWidth: 300)
            .background(JDTheme.surface)
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(JDTheme.divider, lineWidth: 0.5))
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .black.opacity(0.16), radius: 22, y: 10)

            Spacer()
        }
    }
}

private struct GoalMetricGrid: View {
    let metrics: [(String, String, String)]

    var body: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 2), spacing: 8) {
            ForEach(Array(metrics.enumerated()), id: \.offset) { _, metric in
                VStack(alignment: .leading, spacing: 3) {
                    Text(metric.0)
                        .font(.system(size: 9.5, weight: .semibold))
                        .foregroundStyle(JDTheme.tertiaryText)
                    HStack(alignment: .firstTextBaseline, spacing: 1) {
                        Text(metric.1)
                            .font(.system(size: 20, weight: .bold))
                            .monospacedDigit()
                        Text(metric.2)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(JDTheme.tertiaryText)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .background(JDTheme.surface)
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(JDTheme.divider, lineWidth: 0.5))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
    }
}

private struct GoalProgressRow: View {
    let item: GoalProgress
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack(alignment: .firstTextBaseline) {
                Text(item.goal.title)
                    .font(.system(size: 12, weight: .semibold))
                    .lineLimit(1)
                Spacer()
                if let target = item.target {
                    Text("\(min(item.completedCount, target))/\(target) · \(Int((item.progress * 100).rounded()))%")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(JDTheme.tertiaryText)
                        .monospacedDigit()
                } else {
                    Text("\(Int((item.progress * 100).rounded()))%")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(JDTheme.tertiaryText)
                }
            }
            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Capsule().fill(JDTheme.surfaceAlt)
                    Capsule().fill(tint).frame(width: proxy.size.width * item.progress)
                }
            }
            .frame(height: 4)
        }
        .padding(12)
        .background(JDTheme.surface)
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(JDTheme.divider, lineWidth: 0.5))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

private struct GoalRollupBar: View {
    let rate: Double
    let color: Color

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Capsule().fill(JDTheme.surfaceAlt)
                Capsule().fill(color).frame(width: proxy.size.width * max(0, min(1, rate)))
            }
        }
        .frame(height: 4)
    }
}

private struct GoalHighlightCard: View {
    let label: String
    let value: String
    let unit: String
    let caption: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 9.5, weight: .bold))
                .foregroundStyle(JDTheme.tertiaryText)
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(value).font(.system(size: 20, weight: .bold)).monospacedDigit()
                Text(unit).font(.system(size: 11, weight: .medium)).foregroundStyle(JDTheme.tertiaryText)
            }
            Text(caption)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(JDTheme.secondaryText)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(JDTheme.surface)
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(JDTheme.divider, lineWidth: 0.5))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

private struct GoalActivitySummary: View {
    let taskCompletion: (completed: Int, total: Int, rate: Double)
    let categoryRows: [CategoryCompletionRow]
    let habitAchievement: (average: Double, items: [HabitAchievementRow])
    let bestStreak: StreakHighlight?
    let mostSlipped: SlippedHighlight?
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("할 일 완료율").font(.system(size: 13, weight: .semibold))
                    Spacer()
                    Text("\(taskCompletion.completed)/\(taskCompletion.total) · \(pct(taskCompletion.rate))%")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(JDTheme.tertiaryText)
                        .monospacedDigit()
                }
                GoalRollupBar(rate: taskCompletion.rate, color: tint)
            }

            if !categoryRows.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Text("카테고리별 완료율").font(.system(size: 13, weight: .semibold))
                    ForEach(categoryRows) { row in
                        VStack(alignment: .leading, spacing: 5) {
                            HStack(spacing: 7) {
                                Circle().fill(Color(hex: row.color) ?? JDTheme.tertiaryText).frame(width: 9, height: 9)
                                Text(row.name).font(.system(size: 12.5, weight: .medium)).lineLimit(1)
                                Spacer()
                                Text("\(row.completed)/\(row.total) · \(pct(row.rate))%")
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundStyle(JDTheme.tertiaryText)
                                    .monospacedDigit()
                            }
                            GoalRollupBar(rate: row.rate, color: Color(hex: row.color) ?? tint)
                        }
                    }
                }
            }

            if !habitAchievement.items.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text("Habit 달성률").font(.system(size: 13, weight: .semibold))
                        Spacer()
                        Text("평균 \(pct(habitAchievement.average))%")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(JDTheme.tertiaryText)
                            .monospacedDigit()
                    }
                    ForEach(habitAchievement.items) { item in
                        VStack(alignment: .leading, spacing: 5) {
                            HStack(spacing: 7) {
                                Text(item.emoji).font(.system(size: 13))
                                Text(item.title).font(.system(size: 12.5, weight: .medium)).lineLimit(1)
                                Spacer()
                                Text("\(pct(item.rate))%")
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundStyle(JDTheme.primaryText)
                                    .monospacedDigit()
                            }
                            GoalRollupBar(rate: item.rate, color: JDTheme.habit)
                        }
                    }
                }
            }

            if bestStreak != nil || mostSlipped != nil {
                HStack(spacing: 10) {
                    if let bestStreak {
                        GoalHighlightCard(label: "최고 스트릭", value: "\(bestStreak.streak)", unit: "일", caption: "\(bestStreak.emoji) \(bestStreak.title)")
                    }
                    if let mostSlipped {
                        GoalHighlightCard(label: "가장 많이 밀린 작업", value: "\(mostSlipped.overdueDays)", unit: "일 지남", caption: mostSlipped.title)
                    }
                }
            }
        }
    }

    private func pct(_ value: Double) -> Int { Int((value * 100).rounded()) }
}

private struct GoalHeatmap: View {
    let values: [Int]
    let tint: Color

    var body: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: values.count > 12 ? 7 : 6), spacing: 4) {
            ForEach(Array(values.enumerated()), id: \.offset) { _, value in
                RoundedRectangle(cornerRadius: 4)
                    .fill(tint.opacity(value == 0 ? 0.12 : min(0.85, 0.25 + Double(value) * 0.12)))
                    .aspectRatio(1, contentMode: .fit)
            }
        }
        .padding(12)
        .background(JDTheme.surface)
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(JDTheme.divider, lineWidth: 0.5))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

private struct GoalRing: View {
    let progress: Double
    let tint: Color
    let size: CGFloat
    let lineWidth: CGFloat

    var body: some View {
        ZStack {
            Circle()
                .stroke(JDTheme.surfaceAlt, lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: min(1, max(0, progress)))
                .stroke(tint, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
        .frame(width: size, height: size)
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

    static func monthGrid(year: Int, month: Int, weekStart: Int = 0) -> [[CalendarDay]] {
        let firstWeekday = weekday(year: year, month: month, day: 1)
        let normalizedWeekStart = weekStart == 1 ? 1 : 0
        let leadingDayCount = (firstWeekday - normalizedWeekStart + 7) % 7
        let daysInMonth = days(year: year, month: month)
        let previous = addMonths(year: year, month: month, delta: -1)
        let previousDays = days(year: previous.year, month: previous.month)
        let next = addMonths(year: year, month: month, delta: 1)
        var cells: [CalendarDay] = []

        if leadingDayCount > 0 {
            for offset in stride(from: leadingDayCount - 1, through: 0, by: -1) {
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
        weekdayLabels()[weekday(iso)]
    }

    static func weekdayLabels(weekStart: Int = 0) -> [String] {
        let names = ["일", "월", "화", "수", "목", "금", "토"]
        let normalizedStart = weekStart == 1 ? 1 : 0
        return (0..<7).map { names[(normalizedStart + $0) % 7] }
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
    let onDelete: ((Task) -> Void)?

    @State private var title: String
    @State private var startDateValue: Date
    @State private var endDateValue: Date
    @State private var includesTime: Bool
    @State private var editingScheduleField: ScheduleField?
    @State private var selectedCategoryID: UUID?
    @State private var selectedPriority: Priority
    @State private var tagsText: String
    @State private var isShowingDeleteConfirmation = false

    private let priorities: [(Priority, String)] = [(.high, "높음"), (.medium, "중간"), (.low, "낮음")]

    init(
        task: Task,
        categories: [JDCategory],
        onCancel: @escaping () -> Void,
        onSave: @escaping (Task) -> Void,
        onDelete: ((Task) -> Void)? = nil
    ) {
        self.task = task
        self.categories = categories
        self.onCancel = onCancel
        self.onSave = onSave
        self.onDelete = onDelete
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
                .accessibilityIdentifier("task-editor-title")
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
                if onDelete != nil {
                    Button(role: .destructive) {
                        isShowingDeleteConfirmation = true
                    } label: {
                        Label("삭제", systemImage: "trash")
                            .labelStyle(.titleAndIcon)
                    }
                    .font(.system(size: 13, weight: .semibold))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 11)
                }
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
        .alert("Task 삭제", isPresented: $isShowingDeleteConfirmation) {
            Button("취소", role: .cancel) {}
            Button("삭제", role: .destructive) {
                onDelete?(task)
            }
        } message: {
            Text("이 Task를 삭제하고 동기화 대기열에 반영합니다.")
        }
    }

    private var canSave: Bool {
        !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private var selectedCategoryColor: Color {
        categories.first { $0.id == selectedCategoryID }?.displayColor ?? JDTheme.me
    }

    private var parsedTags: [String] {
        parseTaskTags(tagsText)
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
                    .accessibilityIdentifier("habit-editor-title")
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

#Preview {
    ContentView(syncStatus: AppSyncStatusStore())
}
