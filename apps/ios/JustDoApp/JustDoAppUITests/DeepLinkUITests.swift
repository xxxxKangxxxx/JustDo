import XCTest

final class DeepLinkUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testTaskDeepLinkOpensTaskDetail() throws {
        let app = launchApp(opening: "justdo://task/11111111-1111-1111-1111-111111111111")

        XCTAssertTrue(app.navigationBars["Task Detail"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["UI Test Task"].waitForExistence(timeout: 5))
    }

    func testHabitDeepLinkOpensHabitDetail() throws {
        let app = launchApp(opening: "justdo://habit/22222222-2222-2222-2222-222222222222")

        XCTAssertTrue(app.navigationBars["Habit Detail"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["🌱 UI Test Habit"].waitForExistence(timeout: 5))
    }

    private func launchApp(opening url: String) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = [
            "--justdo-ui-testing",
            "--justdo-ui-testing-open-url",
            url,
        ]
        app.launch()
        return app
    }
}
