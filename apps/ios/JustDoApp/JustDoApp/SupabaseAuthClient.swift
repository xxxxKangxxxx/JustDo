//
//  SupabaseAuthClient.swift
//  JustDoApp
//
//  Created by Codex on 5/7/26.
//

import AuthenticationServices
import CryptoKit
import Foundation

enum SupabaseAuthProvider: String, CaseIterable, Identifiable {
    case google
    case apple

    var id: String { rawValue }

    var title: String {
        switch self {
        case .google:
            return "Continue with Google"
        case .apple:
            return "Continue with Apple"
        }
    }
}

enum SupabaseAuthError: Error {
    case missingConfiguration
    case missingCallbackCode
    case invalidCallback(String)
    case invalidResponse
    case httpStatus(Int, String)
    case missingUserID
    case missingIdentityToken
    case appleAuthorizationFailed(String)
}

struct SupabaseAuthClient {
    private let session: URLSession
    private let callbackScheme = "justdo"
    private let callbackURL = "justdo://auth-callback"
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init(session: URLSession = .shared) {
        self.session = session
    }

    @MainActor
    func signIn(
        provider: SupabaseAuthProvider,
        configuration: SupabaseAppConfiguration,
        presentationAnchor: ASPresentationAnchor
    ) async throws -> SupabaseStoredSession {
        switch provider {
        case .apple:
            // Apple requires a *native* Sign in with Apple flow (ASAuthorization,
            // not the web OAuth redirect) for App Store compliance and UX. We get
            // an identity token + nonce on-device and exchange it with Supabase.
            return try await signInWithApple(
                configuration: configuration,
                presentationAnchor: presentationAnchor
            )
        case .google:
            return try await signInWithWebOAuth(
                provider: provider,
                configuration: configuration,
                presentationAnchor: presentationAnchor
            )
        }
    }

    @MainActor
    private func signInWithWebOAuth(
        provider: SupabaseAuthProvider,
        configuration: SupabaseAppConfiguration,
        presentationAnchor: ASPresentationAnchor
    ) async throws -> SupabaseStoredSession {
        let verifier = PKCECodeVerifier()
        let authURL = try authorizeURL(
            provider: provider,
            configuration: configuration,
            challenge: verifier.challenge
        )
        let callbackURL = try await WebAuthenticationSessionRunner().start(
            url: authURL,
            callbackScheme: callbackScheme,
            presentationAnchor: presentationAnchor
        )
        let code = try callbackCode(from: callbackURL)
        return try await exchangeCode(
            configuration: configuration,
            code: code,
            verifier: verifier.value
        )
    }

    @MainActor
    private func signInWithApple(
        configuration: SupabaseAppConfiguration,
        presentationAnchor: ASPresentationAnchor
    ) async throws -> SupabaseStoredSession {
        // Apple hashes the nonce in the credential; Supabase verifies the id_token
        // against the *raw* nonce, so we keep both.
        let rawNonce = Self.randomNonceString()
        let credential = try await AppleAuthorizationRunner().start(
            nonceHash: Self.sha256Hex(rawNonce),
            presentationAnchor: presentationAnchor
        )
        guard
            let tokenData = credential.identityToken,
            let identityToken = String(data: tokenData, encoding: .utf8)
        else {
            throw SupabaseAuthError.missingIdentityToken
        }
        return try await exchangeIdToken(
            configuration: configuration,
            idToken: identityToken,
            nonce: rawNonce
        )
    }

    func refreshSession(
        configuration: SupabaseAppConfiguration,
        refreshToken: String
    ) async throws -> SupabaseStoredSession {
        var components = URLComponents(
            url: configuration.projectURL.appendingPathComponent("auth/v1/token"),
            resolvingAgainstBaseURL: false
        )
        components?.queryItems = [URLQueryItem(name: "grant_type", value: "refresh_token")]
        guard let url = components?.url else {
            throw SupabaseAuthError.invalidResponse
        }

        let response: TokenResponse = try await post(
            url: url,
            anonKey: configuration.anonKey,
            body: RefreshTokenRequest(refreshToken: refreshToken)
        )
        return try response.storedSession()
    }

    private func authorizeURL(
        provider: SupabaseAuthProvider,
        configuration: SupabaseAppConfiguration,
        challenge: String
    ) throws -> URL {
        var components = URLComponents(
            url: configuration.projectURL.appendingPathComponent("auth/v1/authorize"),
            resolvingAgainstBaseURL: false
        )
        components?.queryItems = [
            URLQueryItem(name: "provider", value: provider.rawValue),
            URLQueryItem(name: "redirect_to", value: callbackURL),
            URLQueryItem(name: "code_challenge", value: challenge),
            URLQueryItem(name: "code_challenge_method", value: "s256"),
        ]
        guard let url = components?.url else {
            throw SupabaseAuthError.invalidResponse
        }
        return url
    }

    private func callbackCode(from url: URL) throws -> String {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            throw SupabaseAuthError.invalidCallback(url.absoluteString)
        }
        let queryItems = components.queryItems ?? []
        if let error = queryItems.first(where: { $0.name == "error" })?.value {
            throw SupabaseAuthError.invalidCallback(error)
        }
        guard let code = queryItems.first(where: { $0.name == "code" })?.value, !code.isEmpty else {
            throw SupabaseAuthError.missingCallbackCode
        }
        return code
    }

    private func exchangeCode(
        configuration: SupabaseAppConfiguration,
        code: String,
        verifier: String
    ) async throws -> SupabaseStoredSession {
        var components = URLComponents(
            url: configuration.projectURL.appendingPathComponent("auth/v1/token"),
            resolvingAgainstBaseURL: false
        )
        components?.queryItems = [URLQueryItem(name: "grant_type", value: "pkce")]
        guard let url = components?.url else {
            throw SupabaseAuthError.invalidResponse
        }

        let response: TokenResponse = try await post(
            url: url,
            anonKey: configuration.anonKey,
            body: PKCETokenRequest(authCode: code, codeVerifier: verifier)
        )
        return try response.storedSession()
    }

    private func exchangeIdToken(
        configuration: SupabaseAppConfiguration,
        idToken: String,
        nonce: String
    ) async throws -> SupabaseStoredSession {
        var components = URLComponents(
            url: configuration.projectURL.appendingPathComponent("auth/v1/token"),
            resolvingAgainstBaseURL: false
        )
        components?.queryItems = [URLQueryItem(name: "grant_type", value: "id_token")]
        guard let url = components?.url else {
            throw SupabaseAuthError.invalidResponse
        }

        let response: TokenResponse = try await post(
            url: url,
            anonKey: configuration.anonKey,
            body: IdTokenRequest(provider: "apple", idToken: idToken, nonce: nonce)
        )
        return try response.storedSession()
    }

    /// Random nonce for Sign in with Apple. The 64-char set divides 256 evenly so
    /// `% 64` is unbiased.
    private static func randomNonceString(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_")
        return String((0..<length).map { _ in charset[Int(UInt8.random(in: 0...255)) % charset.count] })
    }

    private static func sha256Hex(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
    }

    private func post<RequestBody: Encodable, ResponseBody: Decodable>(
        url: URL,
        anonKey: String,
        body: RequestBody
    ) async throws -> ResponseBody {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(body)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw SupabaseAuthError.invalidResponse
        }
        guard (200..<300).contains(httpResponse.statusCode) else {
            throw SupabaseAuthError.httpStatus(
                httpResponse.statusCode,
                String(data: data, encoding: .utf8) ?? ""
            )
        }
        return try decoder.decode(ResponseBody.self, from: data)
    }
}

private struct PKCECodeVerifier {
    let value: String
    let challenge: String

    init() {
        let bytes = (0..<32).map { _ in UInt8.random(in: 0...255) }
        value = Data(bytes).base64URLEncodedString()
        let digest = SHA256.hash(data: Data(value.utf8))
        challenge = Data(digest).base64URLEncodedString()
    }
}

@MainActor
private final class WebAuthenticationSessionRunner: NSObject, ASWebAuthenticationPresentationContextProviding {
    private var presentationAnchor: ASPresentationAnchor?
    private var activeSession: ASWebAuthenticationSession?

    func start(
        url: URL,
        callbackScheme: String,
        presentationAnchor: ASPresentationAnchor
    ) async throws -> URL {
        self.presentationAnchor = presentationAnchor

        return try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: callbackScheme
            ) { callbackURL, error in
                self.activeSession = nil
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                guard let callbackURL else {
                    continuation.resume(throwing: SupabaseAuthError.invalidResponse)
                    return
                }
                continuation.resume(returning: callbackURL)
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false
            self.activeSession = session
            session.start()
        }
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        presentationAnchor ?? ASPresentationAnchor()
    }
}

/// Drives a native Sign in with Apple request and bridges its delegate callbacks
/// into async/await. Held alive by the awaiting `start(...)` call.
@MainActor
private final class AppleAuthorizationRunner: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    private var presentationAnchor: ASPresentationAnchor?
    private var continuation: CheckedContinuation<ASAuthorizationAppleIDCredential, Error>?
    private var controller: ASAuthorizationController?

    func start(
        nonceHash: String,
        presentationAnchor: ASPresentationAnchor
    ) async throws -> ASAuthorizationAppleIDCredential {
        self.presentationAnchor = presentationAnchor
        return try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName, .email]
            request.nonce = nonceHash
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            self.controller = controller
            controller.performRequests()
        }
    }

    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        defer { continuation = nil; self.controller = nil }
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
            continuation?.resume(throwing: SupabaseAuthError.appleAuthorizationFailed("Unexpected credential type"))
            return
        }
        continuation?.resume(returning: credential)
    }

    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        defer { continuation = nil; self.controller = nil }
        continuation?.resume(throwing: error)
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        presentationAnchor ?? ASPresentationAnchor()
    }
}

private struct IdTokenRequest: Encodable {
    var provider: String
    var idToken: String
    var nonce: String

    private enum CodingKeys: String, CodingKey {
        case provider
        case idToken = "id_token"
        case nonce
    }
}

private struct PKCETokenRequest: Encodable {
    var authCode: String
    var codeVerifier: String

    private enum CodingKeys: String, CodingKey {
        case authCode = "auth_code"
        case codeVerifier = "code_verifier"
    }
}

private struct RefreshTokenRequest: Encodable {
    var refreshToken: String

    private enum CodingKeys: String, CodingKey {
        case refreshToken = "refresh_token"
    }
}

private struct TokenResponse: Decodable {
    var accessToken: String
    var refreshToken: String?
    var expiresIn: TimeInterval?
    var expiresAt: TimeInterval?
    var user: AuthUser?

    func storedSession(now: Date = Date()) throws -> SupabaseStoredSession {
        guard let userID = user?.id else {
            throw SupabaseAuthError.missingUserID
        }
        let resolvedExpiresAt: Date?
        if let expiresAt {
            resolvedExpiresAt = Date(timeIntervalSince1970: expiresAt)
        } else if let expiresIn {
            resolvedExpiresAt = now.addingTimeInterval(expiresIn)
        } else {
            resolvedExpiresAt = nil
        }

        return SupabaseStoredSession(
            accessToken: accessToken,
            refreshToken: refreshToken,
            userID: userID,
            expiresAt: resolvedExpiresAt,
            email: user?.email,
            displayName: user?.metadata.displayName,
            avatarURL: user?.metadata.resolvedAvatarURL
        )
    }

    private enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case expiresIn = "expires_in"
        case expiresAt = "expires_at"
        case user
    }
}

private struct AuthUser: Decodable {
    var id: UUID
    var email: String?
    var metadata: AuthUserMetadata

    private enum CodingKeys: String, CodingKey {
        case id
        case email
        case metadata = "user_metadata"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        email = try container.decodeIfPresent(String.self, forKey: .email)
        metadata = try container.decodeIfPresent(AuthUserMetadata.self, forKey: .metadata) ?? AuthUserMetadata()
    }
}

private struct AuthUserMetadata: Decodable {
    var fullName: String?
    var name: String?
    var preferredUsername: String?
    var userName: String?
    var avatarURL: String?
    var picture: String?

    var displayName: String? {
        fullName ?? name ?? preferredUsername ?? userName
    }

    var resolvedAvatarURL: String? {
        avatarURL ?? picture
    }

    private enum CodingKeys: String, CodingKey {
        case fullName = "full_name"
        case name
        case preferredUsername = "preferred_username"
        case userName = "user_name"
        case avatarURL = "avatar_url"
        case picture
    }
}

private extension Data {
    func base64URLEncodedString() -> String {
        base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
