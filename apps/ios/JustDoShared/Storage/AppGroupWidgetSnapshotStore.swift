import Foundation

public enum AppGroupWidgetSnapshotStoreError: Error, Equatable {
    case appGroupContainerUnavailable(String)
}

public final class AppGroupWidgetSnapshotStore {
    public static let defaultAppGroupIdentifier = "group.com.justdo.app"
    public static let snapshotFileName = "widget_snapshot.json"

    private let directoryURL: URL
    private let fileManager: FileManager
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    public convenience init(
        appGroupIdentifier: String = defaultAppGroupIdentifier,
        fileManager: FileManager = .default
    ) throws {
        guard let directoryURL = fileManager.containerURL(
            forSecurityApplicationGroupIdentifier: appGroupIdentifier
        ) else {
            throw AppGroupWidgetSnapshotStoreError.appGroupContainerUnavailable(
                appGroupIdentifier
            )
        }
        self.init(directoryURL: directoryURL, fileManager: fileManager)
    }

    public init(directoryURL: URL, fileManager: FileManager = .default) {
        self.directoryURL = directoryURL
        self.fileManager = fileManager

        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        self.encoder = encoder
        self.decoder = JSONDecoder()
    }

    public var snapshotURL: URL {
        directoryURL.appendingPathComponent(Self.snapshotFileName)
    }

    public func read() throws -> WidgetSnapshot? {
        let url = snapshotURL
        guard fileManager.fileExists(atPath: url.path) else {
            return nil
        }
        let data = try Data(contentsOf: url)
        return try decoder.decode(WidgetSnapshot.self, from: data)
    }

    public func write(_ snapshot: WidgetSnapshot) throws {
        try fileManager.createDirectory(
            at: directoryURL,
            withIntermediateDirectories: true
        )
        let data = try encoder.encode(snapshot)
        try data.write(to: snapshotURL, options: [.atomic])
    }

    public func remove() throws {
        let url = snapshotURL
        if fileManager.fileExists(atPath: url.path) {
            try fileManager.removeItem(at: url)
        }
    }
}
