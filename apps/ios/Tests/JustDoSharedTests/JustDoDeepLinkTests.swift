import XCTest
@testable import JustDoShared

final class JustDoDeepLinkTests: XCTestCase {
    func testTaskDeepLinkRoundTrip() throws {
        let id = uuid("11111111-1111-1111-1111-111111111111")
        let link = JustDoDeepLink.task(id)

        XCTAssertEqual(link.url.absoluteString, "justdo://task/11111111-1111-1111-1111-111111111111")
        XCTAssertEqual(JustDoDeepLink(url: link.url), link)
    }

    func testHabitDeepLinkRoundTrip() throws {
        let id = uuid("33333333-3333-3333-3333-333333333333")
        let link = JustDoDeepLink.habit(id)

        XCTAssertEqual(link.url.absoluteString, "justdo://habit/33333333-3333-3333-3333-333333333333")
        XCTAssertEqual(JustDoDeepLink(url: link.url), link)
    }

    func testIgnoresUnsupportedURL() {
        XCTAssertNil(JustDoDeepLink(url: URL(string: "justdo://auth-callback?code=abc")!))
        XCTAssertNil(JustDoDeepLink(url: URL(string: "https://example.com/task/11111111-1111-1111-1111-111111111111")!))
    }

    private func uuid(_ raw: String) -> UUID {
        guard let value = UUID(uuidString: raw) else {
            fatalError("Invalid UUID fixture: \(raw)")
        }
        return value
    }
}
