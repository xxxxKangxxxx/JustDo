//
//  AuthViewModel.swift
//  JustDoApp
//
//  Created by Codex on 5/7/26.
//

import AuthenticationServices
import Combine
import Foundation
import UIKit

@MainActor
final class AuthViewModel: ObservableObject {
    enum Status: Equatable {
        case loading
        case missingConfiguration
        case signedOut
        case signedIn
        case working
        case failed(String)
    }

    @Published private(set) var status: Status = .loading
    @Published private(set) var profile: AuthProfile?

    private let configurationLoader: SupabaseAppConfigurationLoader
    private let sessionStore: SupabaseSessionStoring
    private let authClient: SupabaseAuthClient

    init(
        configurationLoader: SupabaseAppConfigurationLoader,
        sessionStore: SupabaseSessionStoring,
        authClient: SupabaseAuthClient
    ) {
        self.configurationLoader = configurationLoader
        self.sessionStore = sessionStore
        self.authClient = authClient
    }

    convenience init() {
        self.init(
            configurationLoader: SupabaseAppConfigurationLoader(),
            sessionStore: KeychainSupabaseSessionStore(),
            authClient: SupabaseAuthClient()
        )
    }

    func reload() async {
        #if DEBUG
        if JustDoUITestSupport.isEnabled {
            profile = AuthProfile(email: "uitest@justdo.local", displayName: "UI Test", avatarURL: nil)
            status = .signedIn
            return
        }
        #endif

        if case .working = status {
            return
        }

        guard let configuration = configurationLoader.load() else {
            profile = nil
            status = .missingConfiguration
            return
        }

        let storedSession: SupabaseStoredSession?
        do {
            storedSession = try sessionStore.load()
        } catch {
            profile = nil
            status = .failed(error.localizedDescription)
            return
        }

        guard let session = storedSession else {
            profile = nil
            status = .signedOut
            return
        }

        if !session.isExpired() {
            profile = session.profile
            status = .signedIn
            return
        }

        guard let refreshToken = session.refreshToken else {
            try? sessionStore.clear()
            profile = nil
            status = .signedOut
            return
        }

        do {
            let refreshed = try await authClient.refreshSession(
                configuration: configuration,
                refreshToken: refreshToken
            )
            try sessionStore.save(refreshed)
            profile = refreshed.profile
            status = .signedIn
        } catch {
            if Self.isRefreshTokenInvalid(error) {
                try? sessionStore.clear()
                profile = nil
                status = .signedOut
            } else {
                profile = session.profile
                status = .signedIn
            }
        }
    }

    private static func isRefreshTokenInvalid(_ error: Error) -> Bool {
        guard let authError = error as? SupabaseAuthError else {
            return false
        }
        if case .httpStatus(let code, _) = authError {
            return code == 400 || code == 401
        }
        return false
    }

    func signIn(with provider: SupabaseAuthProvider) async {
        do {
            guard let configuration = configurationLoader.load() else {
                status = .missingConfiguration
                return
            }
            guard let anchor = Self.presentationAnchor() else {
                status = .failed("No active window for authentication.")
                return
            }

            status = .working
            let session = try await authClient.signIn(
                provider: provider,
                configuration: configuration,
                presentationAnchor: anchor
            )
            try sessionStore.save(session)
            profile = session.profile
            status = .signedIn
        } catch {
            status = .failed(error.localizedDescription)
        }
    }

    func signOut() {
        do {
            try sessionStore.clear()
            profile = nil
            status = configurationLoader.load() == nil ? .missingConfiguration : .signedOut
        } catch {
            status = .failed(error.localizedDescription)
        }
    }

    private static func presentationAnchor() -> ASPresentationAnchor? {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first { $0.isKeyWindow }
    }
}
