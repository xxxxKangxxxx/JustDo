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
    @State private var navigationPath = NavigationPath()
    var snapshotStore: CoreDataAppSnapshotStore?
    var onSessionChanged: () async -> Void = {}

    var body: some View {
        NavigationStack(path: $navigationPath) {
            rootScreen
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
                onOpenTask: { navigationPath.append(DetailRoute.task($0)) },
                onOpenHabit: { navigationPath.append(DetailRoute.habit($0)) },
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
    @State private var isDarkMode = false
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
        .task {
            loadSnapshot()
        }
    }

    @ViewBuilder
    private var activeRootTab: some View {
        switch selectedTab {
        case .home:
            ScrollView(showsIndicators: false) {
                VStack(spacing: 14) {
                    homeHeader
                    MonthCalendarView(
                        year: displayYear,
                        month: displayMonth,
                        selectedDate: selectedDate,
                        tasks: snapshot?.tasks ?? [],
                        habits: snapshot?.habits ?? [],
                        categories: snapshot?.categories ?? [],
                        onSelectDate: { selectedDate = $0 }
                    )
                    SelectedDayPanel(
                        selectedDate: selectedDate,
                        tasks: tasksForSelectedDate,
                        habits: snapshot?.habits ?? [],
                        categories: snapshot?.categories ?? [],
                        onOpenTask: onOpenTask,
                        onOpenHabit: onOpenHabit
                    )
                }
                .padding(.bottom, 140)
            }
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
                isDarkMode: $isDarkMode,
                actionMessage: actionMessage,
                onToggleWeekStart: toggleWeekStart,
                onManageHabits: { isShowingHabitManager = true },
                onManageCategories: { isShowingCategoryManager = true },
                onSignOut: onSignOut
            )
                .padding(.bottom, 100)
        }
    }

    private var homeHeader: some View {
        VStack(alignment: .leading, spacing: 12) {
            JustDoWordmark(size: 17, dotSize: 4)
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
        .padding(.top, 10)
    }

    private var tasksForSelectedDate: [Task] {
        (snapshot?.tasks ?? []).filter { $0.startDate <= selectedDate && selectedDate <= $0.endDate }
    }

    private func moveMonth(_ delta: Int) {
        let moved = JDDate.addMonths(year: displayYear, month: displayMonth, delta: delta)
        displayYear = moved.year
        displayMonth = moved.month
    }

    private func loadSnapshot() {
        guard let snapshotStore else {
            loadError = "Local mirror is unavailable."
            return
        }

        do {
            try WidgetSnapshotBootstrap.seedIfNeeded(into: snapshotStore)
            let loaded = try snapshotStore.loadSnapshot()
            snapshot = loaded
            selectedDate = loaded.view.selectedDate
            displayYear = loaded.view.year
            displayMonth = loaded.view.month
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
            loadSnapshot()
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
            loadSnapshot()
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
            loadSnapshot()
            actionMessage = "Habit updated."
        } catch {
            actionMessage = "Could not update habit."
        }
    }

    private func toggleWeekStart() {
        guard let snapshotStore else {
            actionMessage = "Local mirror is unavailable."
            return
        }

        let current = snapshot?.settings.weekStart ?? 0
        do {
            try snapshotStore.applyAndEnqueue(
                QueuedMutation(
                    id: UUID(),
                    updatedAt: JDDate.nowISODateTime,
                    mutation: .preferencesSet(key: .weekStart, value: current == 0 ? 1 : 0)
                )
            )
            loadSnapshot()
            actionMessage = "Settings updated."
        } catch {
            actionMessage = "Could not update settings."
        }
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
            loadSnapshot()
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
            loadSnapshot()
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
            loadSnapshot()
            actionMessage = "Habit deleted."
        } catch {
            actionMessage = "Could not delete habit."
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
    let habits: [Habit]
    let categories: [JDCategory]
    let onSelectDate: (String) -> Void

    private let weekdays = ["일", "월", "화", "수", "목", "금", "토"]

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
                VStack(spacing: 3) {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 0), count: 7), spacing: 0) {
                        ForEach(Array(week.enumerated()), id: \.element.iso) { index, day in
                            CalendarDayCell(
                                day: day,
                                index: index,
                                isSelected: day.iso == selectedDate,
                                hasTask: tasks.contains { $0.startDate <= day.iso && day.iso <= $0.endDate },
                                hasHabit: habits.contains { $0.log[day.iso] == 1 },
                                categoryColor: categoryColor(for: day.iso),
                                onSelect: { onSelectDate(day.iso) }
                            )
                        }
                    }
                    WeekTaskBars(
                        week: week,
                        tasks: tasks.filter { $0.startDate != $0.endDate },
                        categories: categories
                    )
                }
                .padding(.vertical, 4)
                .overlay(alignment: .top) {
                    Rectangle()
                        .fill(JDTheme.divider)
                        .frame(height: 0.5)
                }
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

    private func categoryColor(for iso: String) -> Color {
        let categoryID = tasks.first { $0.startDate <= iso && iso <= $0.endDate }?.categoryID
        return categories.first { $0.id == categoryID }?.displayColor ?? JDTheme.me
    }
}

private struct CalendarDayCell: View {
    let day: CalendarDay
    let index: Int
    let isSelected: Bool
    let hasTask: Bool
    let hasHabit: Bool
    let categoryColor: Color
    let onSelect: () -> Void

    var body: some View {
        Button(action: day.isCurrentMonth ? onSelect : {}) {
            VStack(spacing: 2) {
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
                HStack(spacing: 2) {
                    if hasTask && day.isCurrentMonth {
                        Circle()
                            .fill(categoryColor)
                            .frame(width: 4, height: 4)
                    }
                    if hasHabit && day.isCurrentMonth {
                        Circle()
                            .fill(JDTheme.habit)
                            .frame(width: 4, height: 4)
                    }
                }
                .frame(height: 4)
            }
            .frame(maxWidth: .infinity, minHeight: 32)
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

private struct WeekTaskBars: View {
    let week: [CalendarDay]
    let tasks: [Task]
    let categories: [JDCategory]

    var body: some View {
        VStack(spacing: 2) {
            ForEach(bars.prefix(2), id: \.task.id) { bar in
                HStack(spacing: 0) {
                    ForEach(0..<7, id: \.self) { index in
                        if index >= bar.startIndex && index <= bar.endIndex {
                            Text(index == bar.startIndex ? bar.task.title : "")
                                .font(.system(size: 10, weight: .semibold))
                                .lineLimit(1)
                                .foregroundStyle(bar.color)
                                .frame(maxWidth: .infinity, minHeight: 14, alignment: .leading)
                                .padding(.horizontal, index == bar.startIndex ? 6 : 0)
                                .background(bar.color.opacity(0.14))
                        } else {
                            Color.clear
                                .frame(maxWidth: .infinity, minHeight: 14)
                        }
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: 4))
            }
        }
        .frame(minHeight: 30, alignment: .top)
    }

    private var bars: [WeekTaskBar] {
        tasks.compactMap { task in
            var startIndex: Int?
            var endIndex: Int?
            for index in week.indices where week[index].isCurrentMonth {
                let iso = week[index].iso
                if task.startDate <= iso && iso <= task.endDate {
                    startIndex = startIndex ?? index
                    endIndex = index
                }
            }
            guard let startIndex, let endIndex else {
                return nil
            }
            let color = categories.first { $0.id == task.categoryID }?.displayColor ?? JDTheme.me
            return WeekTaskBar(task: task, startIndex: startIndex, endIndex: endIndex, color: color)
        }
    }
}

private struct WeekTaskBar {
    let task: Task
    let startIndex: Int
    let endIndex: Int
    let color: Color
}

private struct SelectedDayPanel: View {
    let selectedDate: String
    let tasks: [Task]
    let habits: [Habit]
    let categories: [JDCategory]
    let onOpenTask: (UUID) -> Void
    let onOpenHabit: (UUID) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Capsule()
                .fill(JDTheme.dividerStrong)
                .frame(width: 36, height: 4)
                .frame(maxWidth: .infinity)
                .padding(.bottom, 14)
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
            .padding(.bottom, 6)

            ForEach(groupedTasks, id: \.category.id) { group in
                TaskGroupSection(
                    category: group.category,
                    tasks: group.tasks,
                    onOpenTask: onOpenTask
                )
            }

            if !habits.isEmpty {
                HabitGroupSection(
                    habits: habits,
                    selectedDate: selectedDate,
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
        .padding(.horizontal, 16)
        .padding(.top, 14)
        .padding(.bottom, 24)
        .background(JDTheme.surface)
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .padding(.horizontal, 14)
        .padding(.top, 8)
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
    let onOpenTask: (UUID) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            SectionHeader(title: category.name, count: tasks.count, color: category.displayColor)
            ForEach(Array(tasks.enumerated()), id: \.element.id) { index, task in
                TaskRow(task: task, color: category.displayColor, isLast: index == tasks.count - 1) {
                    onOpenTask(task.id)
                }
            }
        }
        .padding(.top, 14)
    }
}

private struct HabitGroupSection: View {
    let habits: [Habit]
    let selectedDate: String
    let onOpenHabit: (UUID) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            SectionHeader(title: "Habit", count: habits.count, color: JDTheme.habit)
            ForEach(Array(habits.enumerated()), id: \.element.id) { index, habit in
                HabitRow(
                    habit: habit,
                    selectedDate: selectedDate,
                    isLast: index == habits.count - 1,
                    onTap: { onOpenHabit(habit.id) }
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
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                CheckCircle(isChecked: task.isCompleted, color: color)
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
                Spacer()
                Text(taskDetailText)
                    .font(.system(size: 12, weight: .regular))
                    .foregroundStyle(JDTheme.secondaryText)
                    .monospacedDigit()
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
        .buttonStyle(.plain)
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
    let onTap: () -> Void

    private var isDone: Bool {
        habit.log[selectedDate] == 1
    }

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                CheckCircle(isChecked: isDone, color: JDTheme.habit)
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
        .buttonStyle(.plain)
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

    let selectedDate: String
    let categories: [JDCategory]
    let onSaveTask: (TaskDraft) -> Void
    let onSaveHabit: (String, String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var mode: Mode = .task
    @State private var title = ""
    @State private var selectedCategoryID: UUID?
    @State private var startDate = ""
    @State private var endDate = ""
    @State private var scheduledTime = ""
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

            TextField(mode == .task ? "무엇을 할까요?" : "어떤 습관을 만들까요?", text: $title)
                .font(.system(size: 22, weight: .bold))
                .textInputAutocapitalization(.never)
                .padding(.bottom, 12)
                .overlay(alignment: .bottom) {
                    Rectangle()
                        .fill(JDTheme.divider)
                        .frame(height: 0.5)
                }

            if mode == .task {
                AddSheetFieldRow(label: "시작") {
                    TextField("YYYY-MM-DD", text: $startDate)
                        .font(.system(size: 13, weight: .medium))
                        .textInputAutocapitalization(.never)
                }
                AddSheetFieldRow(label: "종료") {
                    TextField("YYYY-MM-DD", text: $endDate)
                        .font(.system(size: 13, weight: .medium))
                        .textInputAutocapitalization(.never)
                }
                AddSheetFieldRow(label: "시간") {
                    HStack {
                        TextField("HH:MM", text: $scheduledTime)
                            .font(.system(size: 13, weight: .medium))
                            .textInputAutocapitalization(.never)
                        if !scheduledTime.isEmpty {
                            Button("지우기") {
                                scheduledTime = ""
                            }
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(JDTheme.tertiaryText)
                        }
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
        .background(JDTheme.surface)
        .onAppear {
            selectedCategoryID = selectedCategoryID ?? categories.first?.id
            startDate = startDate.isEmpty ? selectedDate : startDate
            endDate = endDate.isEmpty ? selectedDate : endDate
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
                    startDate: startDate,
                    endDate: endDate,
                    priority: selectedPriority,
                    scheduledTime: scheduledTime
                )
            )
        case .habit:
            onSaveHabit(title, selectedEmoji)
        }
        dismiss()
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
        .padding(.vertical, 11)
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
                    Text("\(year)년 \(month)월")
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
                        Text("\(JDDate.weekdayName(days7.first ?? JDDate.todayISO))~\(JDDate.weekdayName(days7.last ?? JDDate.todayISO))")
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
        let fallback = CategoryProgressStat(id: UUID(), title: "Task", color: JDTheme.me, done: monthTasks.filter(\.isCompleted).count, total: max(monthTasks.count, 1))
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
                total: max(items.count, 1)
            )
        }
    }
}

private struct SettingsRootTabView: View {
    let settings: Settings?
    @Binding var isDarkMode: Bool
    let actionMessage: String?
    let onToggleWeekStart: () -> Void
    let onManageHabits: () -> Void
    let onManageCategories: () -> Void
    let onSignOut: () -> Void

    @State private var localNotify = true

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Text("설정")
                    .font(.system(size: 28, weight: .bold))
                    .padding(.horizontal, 20)
                    .padding(.top, 18)
                    .padding(.bottom, 18)

                SettingGroup(label: "계정") {
                    SettingsRow(title: "지민", detail: "Google 로그인", avatar: true, chevron: true, isLast: true)
                }
                SettingGroup(label: "알림") {
                    SettingsRow(title: "알림", right: AnyView(ToggleSwitch(isOn: $localNotify)))
                    SettingsRow(title: "알림 시간", detail: settings?.notifyTime ?? "09:00", isLast: true)
                }
                SettingGroup(label: "디스플레이") {
                    SettingsRow(title: "다크모드", right: AnyView(ToggleSwitch(isOn: $isDarkMode)))
                    SettingsRow(
                        title: "캘린더 시작 요일",
                        detail: (settings?.weekStart ?? 0) == 0 ? "일요일" : "월요일",
                        chevron: true,
                        isLast: true,
                        action: onToggleWeekStart
                    )
                }
                SettingGroup(label: "구독") {
                    SettingsRow(title: "현재 플랜", detail: (settings?.plan ?? "free") == "pro" ? "Pro" : "Free", chevron: true)
                    SettingsRow(title: "Pro로 업그레이드", pro: true, chevron: true, isLast: true)
                }
                SettingGroup(label: "데이터") {
                    SettingsRow(title: "동기화", detail: actionMessage ?? "Core Data mirror active.")
                    SettingsRow(title: "습관 관리", chevron: true, action: onManageHabits)
                    SettingsRow(title: "카테고리 관리", chevron: true, action: onManageCategories)
                    SettingsRow(title: "데이터 내보내기", chevron: true)
                    SettingsRow(title: "모든 데이터 초기화", danger: true)
                    SettingsRow(title: "로그아웃", danger: true, isLast: true, action: onSignOut)
                }
                SettingGroup(label: "앱 정보") {
                    SettingsRow(title: "버전", detail: "1.0.2")
                    SettingsRow(title: "이용약관", chevron: true)
                    SettingsRow(title: "개인정보처리방침", chevron: true, isLast: true)
                }
            }
            .padding(.bottom, 8)
        }
        .background(JDTheme.background)
        .onAppear {
            localNotify = settings?.notify ?? true
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
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(emojis, id: \.self) { item in
                                Button {
                                    emoji = item
                                } label: {
                                    Text(item)
                                        .font(.system(size: 18))
                                        .frame(width: 34, height: 34)
                                        .background(emoji == item ? JDTheme.habit.opacity(0.18) : .clear)
                                        .clipShape(RoundedRectangle(cornerRadius: 8))
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
                }

                Section("습관 목록") {
                    ForEach(habits) { habit in
                        HStack {
                            Text(habit.emoji)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(habit.title)
                                Text("시작 \(JDDate.displayDate(habit.startedAt)) · \(JDDate.habitStreak(habit, selectedDate: JDDate.todayISO))일째")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Button(role: .destructive) {
                                onDelete(habit)
                            } label: {
                                Image(systemName: "trash")
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .navigationTitle("습관 관리")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("닫기") { dismiss() }
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
                    HStack(spacing: 10) {
                        ForEach(colors, id: \.self) { color in
                            Button {
                                selectedColor = color
                            } label: {
                                Circle()
                                    .fill(Color(hex: color) ?? JDTheme.me)
                                    .frame(width: 28, height: 28)
                                    .overlay {
                                        if selectedColor == color {
                                            Image(systemName: "checkmark")
                                                .font(.system(size: 11, weight: .bold))
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
                }

                Section("카테고리 목록") {
                    ForEach(categories) { category in
                        HStack {
                            Circle()
                                .fill(category.displayColor)
                                .frame(width: 10, height: 10)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(category.name)
                                Text(category.isDefault ? "기본 카테고리" : "사용자 카테고리")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Button(role: .destructive) {
                                onDelete(category)
                            } label: {
                                Image(systemName: "trash")
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .navigationTitle("카테고리 관리")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("닫기") { dismiss() }
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
                        RoundedRectangle(cornerRadius: 4)
                            .fill(habit.log[day] == 1 ? JDTheme.habit : JDTheme.surfaceAlt)
                            .frame(height: 20)
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
    var danger = false
    var pro = false
    var chevron = false
    var isLast = false
    var right: AnyView?
    var action: (() -> Void)?

    var body: some View {
        Button {
            action?()
        } label: {
            HStack(spacing: 12) {
                if avatar {
                    Circle()
                        .fill(LinearGradient(colors: [JDTheme.me, JDTheme.habit], startPoint: .topLeading, endPoint: .bottomTrailing))
                        .frame(width: 28, height: 28)
                        .overlay {
                            Text("지")
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
            .padding(.horizontal, 14)
            .padding(.vertical, 13)
            .frame(minHeight: 44)
            .overlay(alignment: .bottom) {
                if !isLast {
                    Rectangle()
                        .fill(JDTheme.divider)
                        .frame(height: 0.5)
                        .padding(.leading, avatar ? 54 : 14)
                }
            }
        }
        .buttonStyle(.plain)
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
