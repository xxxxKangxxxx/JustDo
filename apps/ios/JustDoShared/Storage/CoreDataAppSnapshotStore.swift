import CoreData
import Foundation

public final class CoreDataAppSnapshotStore: @unchecked Sendable {
    private let context: NSManagedObjectContext

    public init(context: NSManagedObjectContext) {
        self.context = context
    }

    public func loadSnapshot(
        view: ViewState = AppSnapshotDefaults.viewState(),
        settings: Settings = AppSnapshotDefaults.settings()
    ) throws -> AppSnapshot {
        try performSynchronously {
            AppSnapshot(
                view: view,
                categories: try fetchCategories(),
                tasks: try fetchTasks(),
                habits: try fetchHabits(),
                settings: settings
            )
        }
    }

    public func replaceSnapshot(_ snapshot: AppSnapshot) throws {
        try performSynchronously {
            try replaceCategories(snapshot.categories)
            try replaceTasks(snapshot.tasks)
            try replaceHabits(snapshot.habits)
            if context.hasChanges {
                try context.save()
            }
        }
    }

    public func hasMirrorData() throws -> Bool {
        try performSynchronously {
            try count("CDCategory") + count("CDTask") + count("CDHabit") > 0
        }
    }

    public func applyAndEnqueue(_ queued: QueuedMutation) throws {
        try performSynchronously {
            try apply(queued.mutation)
            try upsertQueuedMutation(queued)
            if context.hasChanges {
                try context.save()
            }
        }
    }

    public func queuedMutations() throws -> [QueuedMutation] {
        try performSynchronously {
            try fetchObjects("CDQueuedMutation")
                .map(CoreDataMappers.queuedMutation(from:))
                .sorted { $0.updatedAt < $1.updatedAt }
        }
    }

    public func removeQueuedMutation(id: UUID) throws {
        try performSynchronously {
            try deleteObject("CDQueuedMutation", id: id)
            if context.hasChanges {
                try context.save()
            }
        }
    }

    public func task(id: UUID) throws -> Task? {
        try performSynchronously {
            guard let object = try fetchObject("CDTask", id: id) else {
                return nil
            }
            return try CoreDataMappers.task(from: object)
        }
    }

    public func habit(id: UUID) throws -> Habit? {
        try performSynchronously {
            guard let object = try fetchObject("CDHabit", id: id) else {
                return nil
            }
            return try CoreDataMappers.habit(from: object)
        }
    }

    private func performSynchronously<T>(_ work: @Sendable () throws -> T) throws -> T {
        try context.performAndWait(work)
    }

    private func fetchCategories() throws -> [Category] {
        try fetchObjects("CDCategory")
            .map(CoreDataMappers.category(from:))
            .sorted { left, right in
                if left.position == right.position {
                    return left.name < right.name
                }
                return left.position < right.position
            }
    }

    private func fetchTasks() throws -> [Task] {
        try fetchObjects("CDTask")
            .map(CoreDataMappers.task(from:))
            .sorted { left, right in
                if left.startDate == right.startDate {
                    return left.title < right.title
                }
                return left.startDate < right.startDate
            }
    }

    private func fetchHabits() throws -> [Habit] {
        try fetchObjects("CDHabit")
            .map(CoreDataMappers.habit(from:))
            .sorted { $0.title < $1.title }
    }

    private func fetchObjects(_ entityName: String) throws -> [NSManagedObject] {
        let request = NSFetchRequest<NSManagedObject>(entityName: entityName)
        return try context.fetch(request)
    }

    private func count(_ entityName: String) throws -> Int {
        let request = NSFetchRequest<NSFetchRequestResult>(entityName: entityName)
        return try context.count(for: request)
    }

    private func deleteAll(entityNames: [String]) throws {
        for entityName in entityNames {
            for object in try fetchObjects(entityName) {
                context.delete(object)
            }
        }
    }

    private func replaceCategories(_ categories: [Category]) throws {
        let incomingIDs = Set(categories.map(\.id))
        for object in try fetchObjects("CDCategory") {
            guard let id = object.value(forKey: "id") as? UUID, incomingIDs.contains(id) else {
                context.delete(object)
                continue
            }
        }
        for category in categories {
            try upsertCategory(category)
        }
    }

    private func replaceTasks(_ tasks: [Task]) throws {
        let incomingIDs = Set(tasks.map(\.id))
        for object in try fetchObjects("CDTask") {
            guard let id = object.value(forKey: "id") as? UUID, incomingIDs.contains(id) else {
                context.delete(object)
                continue
            }
        }
        for task in tasks {
            try upsertTask(task)
        }
    }

    private func replaceHabits(_ habits: [Habit]) throws {
        let incomingIDs = Set(habits.map(\.id))
        for object in try fetchObjects("CDHabit") {
            guard let id = object.value(forKey: "id") as? UUID, incomingIDs.contains(id) else {
                context.delete(object)
                continue
            }
        }
        for habit in habits {
            try upsertHabit(habit)
        }
    }

    private func apply(_ mutation: LocalMutation) throws {
        switch mutation {
        case .categoryUpsert(let category):
            try upsertCategory(category)
        case .categoryDelete(let id):
            try deleteObject("CDCategory", id: id)
        case .preferencesSet(let key, let value):
            try upsertPreference(key: key, value: value)
        case .taskUpsert(let task):
            try upsertTask(task)
        case .taskDelete(let id):
            try deleteObject("CDTask", id: id)
        case .habitUpsert(let habit):
            try upsertHabit(habit)
        case .habitDelete(let id):
            try deleteObject("CDHabit", id: id)
        case .habitLogSet(let habitID, let iso, let value):
            try setHabitLog(habitID: habitID, iso: iso, value: value)
        }
    }

    private func upsertCategory(_ category: Category) throws {
        if let object = try fetchObject("CDCategory", id: category.id) {
            CoreDataMappers.updateCategory(category, object: object)
        } else {
            _ = try CoreDataMappers.insertCategory(category, in: context)
        }
    }

    private func upsertTask(_ task: Task) throws {
        if let object = try fetchObject("CDTask", id: task.id) {
            try CoreDataMappers.updateTask(task, object: object)
        } else {
            _ = try CoreDataMappers.insertTask(task, in: context)
        }
    }

    private func upsertHabit(_ habit: Habit) throws {
        if let object = try fetchObject("CDHabit", id: habit.id) {
            try CoreDataMappers.updateHabit(habit, object: object)
        } else {
            _ = try CoreDataMappers.insertHabit(habit, in: context)
        }
    }

    private func setHabitLog(habitID: UUID, iso: String, value: Int) throws {
        guard let object = try fetchObject("CDHabit", id: habitID) else {
            return
        }
        var habit = try CoreDataMappers.habit(from: object)
        habit.log[iso] = value
        try CoreDataMappers.updateHabit(habit, object: object)
    }

    private func upsertQueuedMutation(_ queued: QueuedMutation) throws {
        if let object = try fetchObject("CDQueuedMutation", id: queued.id) {
            try CoreDataMappers.updateQueuedMutation(queued, object: object)
        } else {
            _ = try CoreDataMappers.insertQueuedMutation(queued, in: context)
        }
    }

    private func upsertPreference(key: PreferenceKey, value: Int) throws {
        let request = NSFetchRequest<NSManagedObject>(entityName: "CDUserPreference")
        request.predicate = NSPredicate(format: "key == %@", key.rawValue)
        for object in try context.fetch(request) {
            context.delete(object)
        }

        let object = try makeObject("CDUserPreference")
        object.setValue(key.rawValue, forKey: "key")
        object.setValue(try JSONEncoder().encode(value), forKey: "valueJSON")
        object.setValue(Date(), forKey: "updatedAt")
    }

    private func fetchObject(_ entityName: String, id: UUID) throws -> NSManagedObject? {
        let request = NSFetchRequest<NSManagedObject>(entityName: entityName)
        request.predicate = NSPredicate(format: "id == %@", id as CVarArg)
        request.fetchLimit = 1
        return try context.fetch(request).first
    }

    private func deleteObject(_ entityName: String, id: UUID) throws {
        if let object = try fetchObject(entityName, id: id) {
            context.delete(object)
        }
    }

    private func makeObject(_ entityName: String) throws -> NSManagedObject {
        guard let entity = NSEntityDescription.entity(forEntityName: entityName, in: context) else {
            throw CoreDataMapperError.missingEntity(entityName)
        }
        return NSManagedObject(entity: entity, insertInto: context)
    }
}

public enum AppSnapshotDefaults {
    public static func viewState(selectedDate: String? = nil) -> ViewState {
        let resolvedDate = selectedDate ?? todayISODate()
        let parts = resolvedDate.split(separator: "-").compactMap { Int($0) }
        return ViewState(
            tab: .home,
            year: parts.first ?? 2026,
            month: parts.dropFirst().first ?? 1,
            selectedDate: resolvedDate,
            dark: false
        )
    }

    public static func settings() -> Settings {
        Settings(
            notify: true,
            notifyTime: "09:00",
            weekStart: 1,
            plan: "free"
        )
    }

    private static func todayISODate() -> String {
        let now = Date()
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = .current
        let components = calendar.dateComponents([.year, .month, .day], from: now)
        return String(
            format: "%04d-%02d-%02d",
            components.year ?? 2026,
            components.month ?? 1,
            components.day ?? 1
        )
    }
}
