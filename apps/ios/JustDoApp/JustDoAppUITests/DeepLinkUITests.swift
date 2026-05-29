import XCTest

final class DeepLinkUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testTaskDeepLinkOpensTaskEditorSheet() throws {
        let app = launchApp(opening: "justdo://task/11111111-1111-1111-1111-111111111111")

        let titleField = app.textFields["task-editor-title"]
        XCTAssertTrue(titleField.waitForExistence(timeout: 5))
        XCTAssertEqual(titleField.value as? String, "UI Test Task")
    }

    func testHabitDeepLinkOpensHabitEditorSheet() throws {
        let app = launchApp(opening: "justdo://habit/22222222-2222-2222-2222-222222222222")

        let titleField = app.textFields["habit-editor-title"]
        XCTAssertTrue(titleField.waitForExistence(timeout: 5))
        XCTAssertEqual(titleField.value as? String, "UI Test Habit")
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
