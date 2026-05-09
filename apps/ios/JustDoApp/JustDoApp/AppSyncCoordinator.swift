//
//  AppSyncCoordinator.swift
//  JustDoApp
//
//  Created by Codex on 5/7/26.
//

import Foundation
import JustDoShared
import Security

struct SupabaseAppSession {
    var projectURL: URL
    var anonKey: String
    var accessToken: String
    var userID: UUID

    var credentials: SupabaseCredentials {
        SupabaseCredentials(
            projectURL: projectURL,
            anonKey: anonKey,
            accessToken: accessToken,
            userID: userID
        )
    }
}

struct SupabaseAppConfiguration {
    var projectURL: URL
    var anonKey: String
}

struct SupabaseAppConfigurationLoader {
    enum Key {
        static let projectURL = "JUSTDO_SUPABASE_URL"
        static let anonKey = "JUSTDO_SUPABASE_ANON_KEY"
    }

    var bundle: Bundle = .main
    var environment: [String: String] = ProcessInfo.processInfo.environment

    func load() -> SupabaseAppConfiguration? {
        guard
            let projectURLValue = value(for: Key.projectURL),
            let projectURL = URL(string: projectURLValue),
            let anonKey = value(for: Key.anonKey)
        else {
            return nil
        }

        return SupabaseAppConfiguration(
            projectURL: projectURL,
            anonKey: anonKey
        )
    }

    private func value(for key: String) -> String? {
        if let value = environment[key], !value.isEmpty {
            return value
        }
        if let value = bundle.object(forInfoDictionaryKey: key) as? String, !value.isEmpty {
            return value
        }
        return nil
    }
}

struct SupabaseStoredSession: Codable, Equatable {
    var accessToken: String
    var refreshToken: String?
    var userID: UUID
    var expiresAt: Date?

    func isExpired(referenceDate: Date = Date()) -> Bool {
        guard let expiresAt else {
            return false
        }
        return expiresAt <= referenceDate
    }

    func appSession(configuration: SupabaseAppConfiguration) -> SupabaseAppSession? {
        if isExpired() {
            return nil
        }
        return SupabaseAppSession(
            projectURL: configuration.projectURL,
            anonKey: configuration.anonKey,
            accessToken: accessToken,
            userID: userID
        )
    }
}

protocol SupabaseSessionStoring {
    func load() throws -> SupabaseStoredSession?
    func save(_ session: SupabaseStoredSession) throws
    func clear() throws
}

enum KeychainSessionStoreError: Error {
    case encodeFailed
    case decodeFailed
    case unexpectedStatus(OSStatus)
}

struct KeychainSupabaseSessionStore: SupabaseSessionStoring {
    private let service = "com.justdo.app.supabase-session"
    private let account = "default"
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    func load() throws -> SupabaseStoredSession? {
        var query = baseQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound {
            return nil
        }
        guard status == errSecSuccess else {
            throw KeychainSessionStoreError.unexpectedStatus(status)
        }
        guard let data = result as? Data else {
            throw KeychainSessionStoreError.decodeFailed
        }
        do {
            return try decoder.decode(SupabaseStoredSession.self, from: data)
        } catch {
            throw KeychainSessionStoreError.decodeFailed
        }
    }

    func save(_ session: SupabaseStoredSession) throws {
        let data: Data
        do {
            data = try encoder.encode(session)
        } catch {
            throw KeychainSessionStoreError.encodeFailed
        }

        var attributes = baseQuery
        attributes[kSecValueData as String] = data
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly

        let status = SecItemAdd(attributes as CFDictionary, nil)
        if status == errSecDuplicateItem {
            var update = [String: Any]()
            update[kSecValueData as String] = data
            update[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            let updateStatus = SecItemUpdate(baseQuery as CFDictionary, update as CFDictionary)
            guard updateStatus == errSecSuccess else {
                throw KeychainSessionStoreError.unexpectedStatus(updateStatus)
            }
            return
        }
        guard status == errSecSuccess else {
            throw KeychainSessionStoreError.unexpectedStatus(status)
        }
    }

    func clear() throws {
        let status = SecItemDelete(baseQuery as CFDictionary)
        if status == errSecItemNotFound {
            return
        }
        guard status == errSecSuccess else {
            throw KeychainSessionStoreError.unexpectedStatus(status)
        }
    }

    private var baseQuery: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
    }
}

@MainActor
struct AppSyncCoordinator {
    private let snapshotStore: CoreDataAppSnapshotStore
    private let widgetWriter: WidgetSnapshotWriter
    private let configurationLoader: SupabaseAppConfigurationLoader
    private let sessionStore: SupabaseSessionStoring
    private let authClient: SupabaseAuthClient

    init(
        snapshotStore: CoreDataAppSnapshotStore,
        widgetWriter: WidgetSnapshotWriter,
        configurationLoader: SupabaseAppConfigurationLoader,
        sessionStore: SupabaseSessionStoring,
        authClient: SupabaseAuthClient
    ) {
        self.snapshotStore = snapshotStore
        self.widgetWriter = widgetWriter
        self.configurationLoader = configurationLoader
        self.sessionStore = sessionStore
        self.authClient = authClient
    }

    init(
        snapshotStore: CoreDataAppSnapshotStore,
        widgetWriter: WidgetSnapshotWriter
    ) {
        self.init(
            snapshotStore: snapshotStore,
            widgetWriter: widgetWriter,
            configurationLoader: SupabaseAppConfigurationLoader(),
            sessionStore: KeychainSupabaseSessionStore(),
            authClient: SupabaseAuthClient()
        )
    }

    func refreshWidgetSnapshot(selectedDate: String) async throws {
        try WidgetSnapshotBootstrap.seedIfNeeded(into: snapshotStore)

        let view = AppSnapshotDefaults.viewState(selectedDate: selectedDate)
        let settings = AppSnapshotDefaults.settings()

        try AppGroupMutationQueueDrainer(
            appGroupQueueStore: AppGroupMutationQueueStore(),
            snapshotStore: snapshotStore
        ).drain()

        if let session = try await validAppSession() {
            try await SupabaseQueuedMutationFlusher(
                mutationClient: SupabaseMutationClient(credentials: session.credentials),
                snapshotStore: snapshotStore
            ).flush()

            _ = try await SupabaseCoreDataSync(
                snapshotClient: SupabaseSnapshotClient(credentials: session.credentials),
                snapshotStore: snapshotStore
            ).sync(view: view, settings: settings)
        }

        let snapshot = try snapshotStore.loadSnapshot(view: view, settings: settings)
        try widgetWriter.write(appSnapshot: snapshot)
    }

    private func validAppSession() async throws -> SupabaseAppSession? {
        guard
            let configuration = configurationLoader.load(),
            var storedSession = try sessionStore.load()
        else {
            return nil
        }

        if storedSession.isExpired(), let refreshToken = storedSession.refreshToken {
            storedSession = try await authClient.refreshSession(
                configuration: configuration,
                refreshToken: refreshToken
            )
            try sessionStore.save(storedSession)
        }

        return storedSession.appSession(configuration: configuration)
    }
}
