import Foundation

public enum AppGroupMutationQueueStoreError: Error, Equatable {
    case appGroupContainerUnavailable(String)
}

public final class AppGroupMutationQueueStore {
    public static let queueFileName = "mutation_queue.jsonl"

    private let directoryURL: URL
    private let fileManager: FileManager
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    public convenience init(
        appGroupIdentifier: String = AppGroupWidgetSnapshotStore.defaultAppGroupIdentifier,
        fileManager: FileManager = .default
    ) throws {
        guard let directoryURL = fileManager.containerURL(
            forSecurityApplicationGroupIdentifier: appGroupIdentifier
        ) else {
            throw AppGroupMutationQueueStoreError.appGroupContainerUnavailable(
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

    public var queueURL: URL {
        directoryURL.appendingPathComponent(Self.queueFileName)
    }

    public func append(_ mutation: QueuedMutation) throws {
        try fileManager.createDirectory(
            at: directoryURL,
            withIntermediateDirectories: true
        )
        let line = try encoder.encode(mutation) + Data([0x0A])
        if fileManager.fileExists(atPath: queueURL.path) {
            let handle = try FileHandle(forWritingTo: queueURL)
            defer { try? handle.close() }
            try handle.seekToEnd()
            try handle.write(contentsOf: line)
        } else {
            try line.write(to: queueURL, options: [.atomic])
        }
    }

    public func list() throws -> [QueuedMutation] {
        guard fileManager.fileExists(atPath: queueURL.path) else {
            return []
        }
        let data = try Data(contentsOf: queueURL)
        guard let raw = String(data: data, encoding: .utf8) else {
            return []
        }
        return try raw
            .split(separator: "\n")
            .map { line in
                try decoder.decode(QueuedMutation.self, from: Data(line.utf8))
            }
    }

    public func remove(id: UUID) throws {
        try replaceAll(list().filter { $0.id != id })
    }

    public func clear() throws {
        if fileManager.fileExists(atPath: queueURL.path) {
            try fileManager.removeItem(at: queueURL)
        }
    }

    private func replaceAll(_ mutations: [QueuedMutation]) throws {
        if mutations.isEmpty {
            try clear()
            return
        }
        try fileManager.createDirectory(
            at: directoryURL,
            withIntermediateDirectories: true
        )
        let data = try mutations.reduce(into: Data()) { result, mutation in
            result.append(try encoder.encode(mutation))
            result.append(0x0A)
        }
        try data.write(to: queueURL, options: [.atomic])
    }
}
