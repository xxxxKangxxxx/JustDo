/**
 * Pure helpers for the Task tag chip input.
 *
 * The Add/Edit sheet collects tags as a list of unique, normalized strings.
 * `parseTagInput` accepts a free-form input fragment (commas/spaces allowed,
 * optional leading # allowed) and `mergeTags` deduplicates against the current
 * list while preserving
 * order — the tag chip UI relies on insertion order, not alphabetical.
 */

export const normalizeTagInput = (raw: string): string =>
  raw.trim().replace(/^#+/, "").trim();

export const parseTagInput = (raw: string): string[] => {
  const fragments = raw
    .split(/[,\s]+/)
    .map((tag) => {
      const trimmed = tag.trim();
      return {
        hadHash: trimmed.startsWith("#"),
        value: normalizeTagInput(trimmed),
      };
    })
    .filter((tag) => tag.value.length > 0);

  return fragments
    .filter(
      (tag, index) =>
        !fragments.some(
          (other, otherIndex) =>
            otherIndex !== index &&
            !tag.hadHash &&
            other.value.length > tag.value.length &&
            other.value.endsWith(tag.value),
        ),
    )
    .map((tag) => tag.value);
};

export const mergeTags = (current: string[], incoming: string[]): string[] => {
  const merged = parseTagInput(current.join(","));
  const keys = new Set(merged.map((tag) => tag.toLowerCase()));
  for (const candidate of incoming) {
    const normalized = normalizeTagInput(candidate);
    const key = normalized.toLowerCase();
    if (normalized && !keys.has(key)) {
      merged.push(normalized);
      keys.add(key);
    }
  }
  return merged;
};

export const isTagCommitKey = (key: string): boolean =>
  key === "Enter" || key === "," || key === " " || key === "Spacebar";
