import CoreData
import Foundation

public enum CoreDataModelFactory {
    public static let modelName = "JustDo"

    public static func makeModel() -> NSManagedObjectModel {
        let model = NSManagedObjectModel()
        model.entities = [
            categoryEntity(),
            taskEntity(),
            habitEntity(),
            goalEntity(),
            goalPromptDismissalEntity(),
            habitLogEntity(),
            queuedMutationEntity(),
            userPreferenceEntity(),
        ]
        return model
    }

    private static func categoryEntity() -> NSEntityDescription {
        entity(
            name: "CDCategory",
            properties: [
                attribute("id", .UUIDAttributeType, optional: false),
                attribute("name", .stringAttributeType, optional: false),
                attribute("color", .stringAttributeType, optional: false),
                attribute("isDefault", .booleanAttributeType, optional: false),
                attribute("position", .integer64AttributeType, optional: false),
                attribute("createdAt", .dateAttributeType, optional: true),
            ]
        )
    }

    private static func taskEntity() -> NSEntityDescription {
        entity(
            name: "CDTask",
            properties: [
                attribute("id", .UUIDAttributeType, optional: false),
                attribute("categoryID", .UUIDAttributeType, optional: true),
                attribute("title", .stringAttributeType, optional: false),
                attribute("priority", .stringAttributeType, optional: true),
                attribute("startDate", .stringAttributeType, optional: false),
                attribute("endDate", .stringAttributeType, optional: false),
                attribute("scheduledTime", .stringAttributeType, optional: true),
                attribute("isCompleted", .booleanAttributeType, optional: false),
                attribute("tagsJSON", .binaryDataAttributeType, optional: false),
                attribute("updatedAt", .dateAttributeType, optional: true),
                attribute("createdAt", .dateAttributeType, optional: true),
            ]
        )
    }

    private static func habitEntity() -> NSEntityDescription {
        entity(
            name: "CDHabit",
            properties: [
                attribute("id", .UUIDAttributeType, optional: false),
                attribute("title", .stringAttributeType, optional: false),
                attribute("emoji", .stringAttributeType, optional: false),
                attribute("startedAt", .stringAttributeType, optional: false),
                attribute("recurType", .stringAttributeType, optional: false),
                attribute("recurDaysJSON", .binaryDataAttributeType, optional: true),
                attribute("reminderTime", .stringAttributeType, optional: true),
                attribute("logJSON", .binaryDataAttributeType, optional: false),
                attribute("updatedAt", .dateAttributeType, optional: true),
                attribute("createdAt", .dateAttributeType, optional: true),
            ]
        )
    }

    private static func goalEntity() -> NSEntityDescription {
        entity(
            name: "CDGoal",
            properties: [
                attribute("id", .UUIDAttributeType, optional: false),
                attribute("periodType", .stringAttributeType, optional: false),
                attribute("periodKey", .stringAttributeType, optional: false),
                attribute("title", .stringAttributeType, optional: false),
                attribute("note", .stringAttributeType, optional: true),
                attribute("sortOrder", .integer64AttributeType, optional: false),
                attribute("locked", .booleanAttributeType, optional: false),
                attribute("lockedAt", .stringAttributeType, optional: true),
                attribute("updatedAt", .dateAttributeType, optional: true),
                attribute("createdAt", .dateAttributeType, optional: true),
            ]
        )
    }

    private static func goalPromptDismissalEntity() -> NSEntityDescription {
        entity(
            name: "CDGoalPromptDismissal",
            properties: [
                attribute("id", .UUIDAttributeType, optional: false),
                attribute("promptType", .stringAttributeType, optional: false),
                attribute("periodKey", .stringAttributeType, optional: false),
                attribute("dismissedPermanentlyForPeriod", .booleanAttributeType, optional: false),
                attribute("dismissedAt", .stringAttributeType, optional: false),
                attribute("createdAt", .dateAttributeType, optional: true),
            ]
        )
    }

    private static func habitLogEntity() -> NSEntityDescription {
        entity(
            name: "CDHabitLog",
            properties: [
                attribute("id", .UUIDAttributeType, optional: false),
                attribute("habitID", .UUIDAttributeType, optional: false),
                attribute("logDate", .stringAttributeType, optional: false),
                attribute("isCompleted", .booleanAttributeType, optional: false),
                attribute("updatedAt", .dateAttributeType, optional: true),
                attribute("createdAt", .dateAttributeType, optional: true),
            ]
        )
    }

    private static func queuedMutationEntity() -> NSEntityDescription {
        entity(
            name: "CDQueuedMutation",
            properties: [
                attribute("id", .UUIDAttributeType, optional: false),
                attribute("updatedAt", .stringAttributeType, optional: false),
                attribute("type", .stringAttributeType, optional: false),
                attribute("payloadJSON", .binaryDataAttributeType, optional: false),
            ]
        )
    }

    private static func userPreferenceEntity() -> NSEntityDescription {
        entity(
            name: "CDUserPreference",
            properties: [
                attribute("key", .stringAttributeType, optional: false),
                attribute("valueJSON", .binaryDataAttributeType, optional: false),
                attribute("updatedAt", .dateAttributeType, optional: true),
            ]
        )
    }

    private static func entity(
        name: String,
        properties: [NSPropertyDescription]
    ) -> NSEntityDescription {
        let entity = NSEntityDescription()
        entity.name = name
        entity.managedObjectClassName = "NSManagedObject"
        entity.properties = properties
        return entity
    }

    private static func attribute(
        _ name: String,
        _ type: NSAttributeType,
        optional: Bool
    ) -> NSAttributeDescription {
        let attribute = NSAttributeDescription()
        attribute.name = name
        attribute.attributeType = type
        attribute.isOptional = optional
        return attribute
    }
}
