import Foundation

public enum JustDoDetailRoute: Hashable, Sendable {
    case task(UUID)
    case habit(UUID)

    public init(link: JustDoDeepLink) {
        switch link {
        case .task(let id):
            self = .task(id)
        case .habit(let id):
            self = .habit(id)
        }
    }

    public init?(url: URL) {
        guard let link = JustDoDeepLink(url: url) else {
            return nil
        }
        self.init(link: link)
    }
}
