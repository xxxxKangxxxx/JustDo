/**
 * Pure helpers for the Task tag chip input.
 *
 * The Add/Edit sheet collects tags as a list of unique, trimmed strings.
 * `parseTagInput` accepts a free-form input fragment (commas allowed, optional
 * leading # allowed) and
 * `mergeTags` deduplicates against the current list while preserving
 * order — the tag chip UI relies on insertion order, not alphabetical.
 */

export const parseTagInput = (raw: string): string[] => {
  const fragments = raw
    .split(",")
    .map((tag) => {
      const trimmed = tag.trim();
      return {
        hadHash: trimmed.startsWith("#"),
        value: trimmed.replace(/^#+/, "").trim(),
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
  const merged = [...current];
  for (const candidate of incoming) {
    if (!merged.includes(candidate)) merged.push(candidate);
  }
  return merged;
};
