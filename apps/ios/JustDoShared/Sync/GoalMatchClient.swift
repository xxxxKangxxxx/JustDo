import Foundation

/// One row of the `goal_semantic_matches` RPC (E3). `itemId`/`itemType` are nil
/// for an embedded goal that matched nothing.
struct GoalSemanticMatchRow: Decodable {
    let goalId: UUID
    let itemType: String?
    let itemId: UUID?

    enum CodingKeys: String, CodingKey {
        case goalId = "goal_id"
        case itemType = "item_type"
        case itemId = "item_id"
    }
}

/// Matched task/habit ids for a single goal.
public struct GoalMatchSet: Equatable {
    public var taskIds: Set<UUID>
    public var habitIds: Set<UUID>

    public init(taskIds: Set<UUID> = [], habitIds: Set<UUID> = []) {
        self.taskIds = taskIds
        self.habitIds = habitIds
    }
}

/// Calls the `goal_semantic_matches` RPC and groups the rows by goal id. A goal
/// is present in the result only when it has an embedding, so the caller can tell
/// "matched nothing semantically" (present, empty) from "not embedded yet"
/// (absent → fall back to the E1 token matcher).
public struct GoalMatchClient {
    private let credentials: SupabaseCredentials
    private let session: URLSession

    public init(credentials: SupabaseCredentials, session: URLSession = .shared) {
        self.credentials = credentials
        self.session = session
    }

    public func fetchMatches(
        periodType: GoalPeriodType,
        periodKey: String
    ) async throws -> [UUID: GoalMatchSet] {
        let url = credentials.projectURL.appendingPathComponent("rest/v1/rpc/goal_semantic_matches")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(credentials.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(credentials.accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "p_period_type": periodType.rawValue,
            "p_period_key": periodKey,
        ])

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw SupabaseSyncError.invalidResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            throw SupabaseSyncError.httpStatus(http.statusCode, String(data: data, encoding: .utf8) ?? "")
        }

        return Self.group(rows: try JSONDecoder().decode([GoalSemanticMatchRow].self, from: data))
    }

    static func group(rows: [GoalSemanticMatchRow]) -> [UUID: GoalMatchSet] {
        var map: [UUID: GoalMatchSet] = [:]
        for row in rows {
            var set = map[row.goalId] ?? GoalMatchSet()
            if let itemId = row.itemId {
                if row.itemType == "task" {
                    set.taskIds.insert(itemId)
                } else if row.itemType == "habit" {
                    set.habitIds.insert(itemId)
                }
            }
            map[row.goalId] = set
        }
        return map
    }
}
