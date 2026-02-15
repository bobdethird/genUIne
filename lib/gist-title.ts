/**
 * Client-side gist title generation for prompt summaries.
 *
 * Rules:
 * - 5–8 words, verb + object, specific
 * - No punctuation/quotes/markdown
 * - Title Case, ≤ 60 chars
 * - If prompt < 10 words, use trimmed prompt
 * - No ellipses; truncate at word boundary when over limit
 */
const MAX_CHARS = 60;
const MIN_WORDS_FOR_TRIM = 10;
const TARGET_WORDS = { min: 5, max: 8 };

function toTitleCase(s: string): string {
  return s.replace(
    /\b\w+/g,
    (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  );
}

function cleanPrompt(raw: string): string {
  return raw
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/[#*_`\[\](){}]/g, "")
    .replace(/\.+$/, "")
    .replace(/\s+/g, " ");
}

function trimToMaxChars(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
}

export function generateGistTitle(rawPrompt: string): string {
  if (!rawPrompt || !rawPrompt.trim()) return "New Prompt";

  const cleaned = cleanPrompt(rawPrompt);
  const words = cleaned.split(/\s+/).filter(Boolean);

  // If prompt < 10 words, use trimmed prompt
  if (words.length < MIN_WORDS_FOR_TRIM) {
    return trimToMaxChars(toTitleCase(cleaned), MAX_CHARS);
  }

  // Take 5–8 words (prioritize start for verb + object)
  const take = Math.min(TARGET_WORDS.max, Math.max(TARGET_WORDS.min, Math.ceil(words.length / 2)));
  const slice = words.slice(0, take).join(" ");
  const result = toTitleCase(slice);

  return trimToMaxChars(result, MAX_CHARS);
}
