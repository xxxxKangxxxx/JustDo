import CoreData
import Foundation

public enum CoreDataMapperError: Error, Equatable {
    case missingEntity(String)
    case invalidEnum(String)
}

public enum CoreDataMappers {
    private static let encoder = JSONEncoder()
    private static let decoder = JSONDecoder()

    public static func insertCategory(
        _ category: Category,
        in context: NSManagedObjectContext
    ) throws -> NSManagedObject {
        let object = try makeObject("CDCategory", in: context)
        object.setValue(category.id, forKey: "id")
        object.setValue(category.name, forKey: "name")
        object.setValue(category.color, forKey: "color")
        object.setValue(category.isDefault, forKey: "isDefault")
        object.setValue(Int64(category.position), forKey: "position")
        return object
    }

    public static func category(from object: NSManagedObject) -> Category {
        Category(
            id: object.value(forKey: "id") as! UUID,
            name: object.value(forKey: "name") as! String,
            color: object.value(forKey: "color") as! String,
            isDefault: object.value(forKey: "isDefault") as! Bool,
            position: Int(object.value(forKey: "position") as! Int64)
        )
    }

    public static func insertTask(
        _ task: Task,
        in context: NSManagedObjectContext
    ) throws -> NSManagedObject {
        let object = try makeObject("CDTask", in: context)
        object.setValue(task.id, forKey: "id")
        object.setValue(task.categoryID, forKey: "categoryID")
        object.setValue(task.title, forKey: "title")
        object.setValue(task.priority?.rawValue, forKey: "priority")
        object.setValue(task.startDate, forKey: "startDate")
        object.setValue(task.endDate, forKey: "endDate")
        object.setValue(task.scheduledTime, forKey: "scheduledTime")
        object.setValue(task.isCompleted, forKey: "isCompleted")
        object.setValue(try encoder.encode(task.tags), forKey: "tagsJSON")
        return object
    }

    public static func task(from object: NSManagedObject) throws -> Task {
        let priorityRaw = object.value(forKey: "priority") as? String
        let priority = try priorityRaw.map { raw -> Priority in
            guard let value = Priority(rawValue: raw) else {
                throw CoreDataMapperError.invalidEnum(raw)
            }
            return value
        }

        return Task(
            id: object.value(forKey: "id") as! UUID,
            title: object.value(forKey: "title") as! String,
            categoryID: object.value(forKey: "categoryID") as? UUID,
            startDate: object.value(forKey: "startDate") as! String,
            endDate: object.value(forKey: "endDate") as! String,
            priority: priority,
            isCompleted: object.value(forKey: "isCompleted") as! Bool,
            scheduledTime: object.value(forKey: "scheduledTime") as? String,
            tags: try decoder.decode([String].self, from: object.value(forKey: "tagsJSON") as! Data)
        )
    }

    public static func insertHabit(
        _ habit: Habit,
        in context: NSManagedObjectContext
    ) throws -> NSManagedObject {
        let object = try makeObject("CDHabit", in: context)
        object.setValue(habit.id, forKey: "id")
        object.setValue(habit.title, forKey: "title")
        object.setValue(habit.emoji, forKey: "emoji")
        object.setValue(habit.startedAt, forKey: "startedAt")
        object.setValue(habit.recurType.rawValue, forKey: "recurType")
        object.setValue(try habit.recurDays.map { try encoder.encode($0) }, forKey: "recurDaysJSON")
        object.setValue(habit.reminderTime, forKey: "reminderTime")
        object.setValue(try encoder.encode(habit.log), forKey: "logJSON")
        return object
    }

    public static func habit(from object: NSManagedObject) throws -> Habit {
        let recurTypeRaw = object.value(forKey: "recurType") as! String
        guard let recurType = HabitRecurType(rawValue: recurTypeRaw) else {
            throw CoreDataMapperError.invalidEnum(recurTypeRaw)
        }

        let recurDaysData = object.value(forKey: "recurDaysJSON") as? Data
        let recurDays = try recurDaysData.map { try decoder.decode([Int].self, from: $0) }

        return Habit(
            id: object.value(forKey: "id") as! UUID,
            title: object.value(forKey: "title") as! String,
            emoji: object.value(forKey: "emoji") as! String,
            startedAt: object.value(forKey: "startedAt") as! String,
            recurType: recurType,
            recurDays: recurDays,
            reminderTime: object.value(forKey: "reminderTime") as? String,
            log: try decoder.decode([String: Int].self, from: object.value(forKey: "logJSON") as! Data)
        )
    }

    public static func insertQueuedMutation(
        _ queued: QueuedMutation,
        in context: NSManagedObjectContext
    ) throws -> NSManagedObject {
        let object = try makeObject("CDQueuedMutation", in: context)
        object.setValue(queued.id, forKey: "id")
        object.setValue(queued.updatedAt, forKey: "updatedAt")
        object.setValue(queued.mutation.typeName, forKey: "type")
        object.setValue(try encoder.encode(queued.mutation), forKey: "payloadJSON")
        return object
    }

    public static func queuedMutation(from object: NSManagedObject) throws -> QueuedMutation {
        QueuedMutation(
            id: object.value(forKey: "id") as! UUID,
            updatedAt: object.value(forKey: "updatedAt") as! String,
            mutation: try decoder.decode(LocalMutation.self, from: object.value(forKey: "payloadJSON") as! Data)
        )
    }

    private static func makeObject(
        _ entityName: String,
        in context: NSManagedObjectContext
    ) throws -> NSManagedObject {
        guard let entity = NSEntityDescription.entity(forEntityName: entityName, in: context) else {
            throw CoreDataMapperError.missingEntity(entityName)
        }
        return NSManagedObject(entity: entity, insertInto: context)
    }
}

private extension LocalMutation {
    var typeName: String {
        switch self {
        case .categoryUpsert:
            "category_upsert"
        case .categoryDelete:
            "category_delete"
        case .preferencesSet:
            "preferences_set"
        case .taskUpsert:
            "task_upsert"
        case .taskDelete:
            "task_delete"
        case .habitUpsert:
            "habit_upsert"
        case .habitDelete:
            "habit_delete"
        case .habitLogSet:
            "habit_log_set"
        }
    }
}
