import XCTest
@testable import JustDoShared

final class AppGroupWidgetDisplayModeStoreTests: XCTestCase {
    private var suiteName: String!
    private var userDefaults: UserDefaults!
    private var store: AppGroupWidgetDisplayModeStore!

    override func setUp() {
        super.setUp()
        suiteName = "AppGroupWidgetDisplayModeStoreTests.\(UUID().uuidString)"
        userDefaults = UserDefaults(suiteName: suiteName)
        userDefaults.removePersistentDomain(forName: suiteName)
        store = AppGroupWidgetDisplayModeStore(userDefaults: userDefaults)
    }

    override func tearDown() {
        userDefaults.removePersistentDomain(forName: suiteName)
        store = nil
        userDefaults = nil
        suiteName = nil
        super.tearDown()
    }

    func testReadDefaultsToTask() {
        XCTAssertEqual(store.read(), .task)
    }

    func testWriteAndReadDisplayMode() {
        store.write(.habit)

        XCTAssertEqual(store.read(), .habit)
    }

    func testReadColorsDefaultsToModeColors() {
        XCTAssertEqual(
            store.readColors(),
            WidgetModeColors(
                task: AppGroupWidgetDisplayModeStore.defaultTaskColor,
                habit: AppGroupWidgetDisplayModeStore.defaultHabitColor
            )
        )
    }

    func testWriteAndReadColorsNormalizesHex() {
        store.writeColors(WidgetModeColors(task: "4f6fd8", habit: "#69a17d"))

        XCTAssertEqual(store.readColors(), WidgetModeColors(task: "#4F6FD8", habit: "#69A17D"))
    }
}
