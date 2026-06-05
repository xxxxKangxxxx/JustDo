import XCTest
@testable import JustDoShared

final class GoalTextMatcherTests: XCTestCase {
    private func matches(_ goalTitle: String, _ text: String) -> Bool {
        GoalTextMatcher.overlaps(
            GoalTextMatcher.tokenize(goalTitle),
            GoalTextMatcher.tokenize(text)
        )
    }

    func testMatchesExactToken() {
        XCTAssertTrue(matches("운동", "아침 운동"))
        XCTAssertTrue(matches("운동", "저녁 운동"))
    }

    func testMatchesInflectedTokenAfterParticleStrip() {
        XCTAssertTrue(matches("운동", "운동을 했다"))
        XCTAssertTrue(matches("운동", "운동하기"))
    }

    func testMatchesSynonym() {
        XCTAssertTrue(matches("운동", "헬스 가기"))
        XCTAssertTrue(matches("책", "독서 30분"))
    }

    func testRejectsSubstringFalsePositive() {
        // The old raw-substring matcher scored these as a match.
        XCTAssertFalse(matches("운동", "부동산 계약"))
        XCTAssertFalse(matches("운동", "활동 보고서"))
    }

    func testDropsStopwords() {
        // "매일" is filler; "명상" carries the meaning.
        XCTAssertTrue(matches("매일 명상", "명상 10분"))
        XCTAssertFalse(matches("매일 운동", "매일 청소"))
    }

    func testKeepsMeaningfulSingleCharNoun() {
        XCTAssertTrue(matches("책", "책 읽기"))
    }

    func testParticleStripKeepsShortNounIntact() {
        // 추가 ends with the particle 가 but must not be reduced to 추.
        XCTAssertEqual(GoalTextMatcher.tokenize("추가"), ["추가"])
        // 운동을 -> 운동.
        XCTAssertEqual(GoalTextMatcher.tokenize("운동을"), ["운동"])
    }
}
