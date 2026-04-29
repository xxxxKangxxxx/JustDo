/**
 * Pure helpers for the Task tag chip input.
 *
 * The Add/Edit sheet collects tags as a list of unique, trimmed strings.
 * `parseTagInput` accepts a free-form input fragment (commas allowed) and
 * `mergeTags` deduplicates against the current list while preserving
 * order — the tag chip UI relies on insertion order, not alphabetical.
 */

export const parseTagInput = (raw: string): string[] =>
  raw
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

export const mergeTags = (current: string[], incoming: string[]): string[] => {
  const merged = [...current];
  for (const candidate of incoming) {
    if (!merged.includes(candidate)) merged.push(candidate);
  }
  return merged;
};
