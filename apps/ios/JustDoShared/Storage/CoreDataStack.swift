import CoreData
import Foundation

public final class CoreDataStack {
    public let container: NSPersistentContainer

    public init(inMemory: Bool = false) {
        container = NSPersistentContainer(
            name: CoreDataModelFactory.modelName,
            managedObjectModel: CoreDataModelFactory.makeModel()
        )

        if inMemory {
            let description = NSPersistentStoreDescription()
            description.type = NSInMemoryStoreType
            container.persistentStoreDescriptions = [description]
        }

        var loadError: Error?
        container.loadPersistentStores { _, error in
            loadError = error
        }
        if let loadError {
            preconditionFailure("Failed to load Core Data stores: \(loadError)")
        }
        container.viewContext.mergePolicy = NSMergePolicy(
            merge: .mergeByPropertyObjectTrumpMergePolicyType
        )
    }
}
