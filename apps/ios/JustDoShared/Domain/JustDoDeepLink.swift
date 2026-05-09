import Foundation

public enum JustDoDeepLink: Equatable, Sendable {
    case task(UUID)
    case habit(UUID)

    public var url: URL {
        switch self {
        case .task(let id):
            URL(string: "justdo://task/\(id.uuidString.lowercased())")!
        case .habit(let id):
            URL(string: "justdo://habit/\(id.uuidString.lowercased())")!
        }
    }

    public init?(url: URL) {
        guard url.scheme == "justdo" else {
            return nil
        }

        let idPath = url.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard let id = UUID(uuidString: idPath) else {
            return nil
        }

        switch url.host {
        case "task":
            self = .task(id)
        case "habit":
            self = .habit(id)
        default:
            return nil
        }
    }
}
