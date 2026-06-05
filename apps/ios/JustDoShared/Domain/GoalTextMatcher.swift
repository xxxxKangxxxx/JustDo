import Foundation

/// Deterministic text relevance between a goal and a task/habit, computed from
/// text only. This is the E1 matcher; it is ported byte-for-byte from the web
/// `selectors.ts` tokenizer so goal progress is identical across devices.
///
/// It replaces the old raw-substring matcher (which scored false positives like
/// 운동 ↔ 부동산) with normalized token overlap: lowercase, strip a small set of
/// trailing Korean particles, collapse a tiny synonym seed, drop filler
/// stopwords, then test for any shared token.
public enum GoalTextMatcher {
    /// Variant tokens collapsed to one canonical token. Keep this seed minimal.
    static let synonyms: [String: String] = [
        "헬스": "운동",
        "운동하기": "운동",
        "독서": "책",
        "책읽기": "책",
        "러닝": "달리기",
        "공부하기": "공부",
    ]

    /// Trailing Korean particles, longest first. Stripped once per token, and
    /// only when the remaining stem is still >= 2 chars so short nouns are never
    /// mangled (e.g. 추가 keeps its 가; 운동을 -> 운동).
    static let particles = [
        "으로", "에서", "에게", "하기", "하고", "해서",
        "을", "를", "은", "는", "이", "가", "에", "의", "로", "도", "만", "과", "와",
    ]

    /// Common filler tokens dropped entirely.
    static let stopwords: Set<String> = [
        "매일", "매주", "주말", "꾸준히", "열심히", "그리고", "하루", "오늘", "및",
    ]

    static func normalizeToken(_ raw: String) -> String? {
        let lowered = raw.lowercased()
        var token: String
        if let synonym = synonyms[lowered] {
            token = synonym
        } else {
            token = lowered
            for particle in particles where token.count - particle.count >= 2 && token.hasSuffix(particle) {
                token = String(token.dropLast(particle.count))
                break
            }
        }
        if token.isEmpty || stopwords.contains(token) { return nil }
        return token
    }

    private static func isAllowed(_ character: Character) -> Bool {
        for scalar in character.unicodeScalars {
            let value = scalar.value
            let ascii = (value >= 48 && value <= 57) // 0-9
                || (value >= 65 && value <= 90) // A-Z
                || (value >= 97 && value <= 122) // a-z
            let hangul = value >= 0xAC00 && value <= 0xD7A3 // 가-힣
            if !(ascii || hangul) { return false }
        }
        return true
    }

    /// Normalized token set for arbitrary text (mirrors web `tokenize`).
    public static func tokenize(_ text: String) -> Set<String> {
        var cleaned = ""
        for character in text {
            cleaned.append(isAllowed(character) ? character : " ")
        }
        var tokens = Set<String>()
        for raw in cleaned.split(separator: " ") {
            if let token = normalizeToken(String(raw)) {
                tokens.insert(token)
            }
        }
        return tokens
    }

    /// True when the two token sets share at least one token.
    public static func overlaps(_ lhs: Set<String>, _ rhs: Set<String>) -> Bool {
        !lhs.isDisjoint(with: rhs)
    }
}
