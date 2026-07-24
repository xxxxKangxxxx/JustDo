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

    func testNotificationSettingsExposeIndependentControlsAndWarning() throws {
        let app = launchApp()

        app.buttons["설정"].tap()
        let notificationSettings = app.staticTexts["알림 설정"]
        XCTAssertTrue(notificationSettings.waitForExistence(timeout: 5))
        notificationSettings.tap()

        XCTAssertTrue(app.staticTexts["아침 브리핑"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.staticTexts["브리핑 시간"].exists)
        XCTAssertTrue(app.staticTexts["일정 알림"].exists)
        XCTAssertTrue(app.staticTexts["기본 알림"].exists)
        XCTAssertTrue(app.staticTexts["습관 알림"].exists)
        XCTAssertTrue(
            app.staticTexts[
                "시간을 설정하지 않으면 아침 브리핑에는 포함되지만 다음 일정 안내에는 표시되지 않습니다."
            ].exists
        )
    }

    func testTaskEditorExposesReminderModes() throws {
        let app = launchApp(opening: "justdo://task/11111111-1111-1111-1111-111111111111")

        XCTAssertTrue(app.buttons["기본값"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["직접 설정"].exists)
        XCTAssertTrue(app.buttons["없음"].exists)
    }

    private func launchApp(opening url: String? = nil) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--justdo-ui-testing"]
        if let url {
            app.launchArguments += ["--justdo-ui-testing-open-url", url]
        }
        app.launch()
        return app
    }
}
