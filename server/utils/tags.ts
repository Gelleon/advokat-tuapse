import { PRACTICE_AREAS } from '../data/practiceAreas';

const PRACTICE_BY_LOWER = new Map(
  PRACTICE_AREAS.map((area) => [area.title.toLowerCase(), area.title] as const)
);

export function normalizeTagLabel(tag: string): string {
  const trimmed = String(tag || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  const known = PRACTICE_BY_LOWER.get(trimmed.toLowerCase());
  if (known) return known;
  return trimmed.charAt(0).toLocaleUpperCase('ru-RU') + trimmed.slice(1);
}

/** Убирает pravo:…, пустые и дубли; приводит регистр */
export function sanitizeTags(input: unknown): string[] {
  let list: unknown[] = [];

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      list = Array.isArray(parsed) ? parsed : [trimmed];
    } catch {
      list = trimmed.split(',').map((part) => part.trim());
    }
  } else if (Array.isArray(input)) {
    list = input;
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of list) {
    const raw = String(item || '').trim();
    if (!raw || /^pravo:/i.test(raw)) continue;
    const label = normalizeTagLabel(raw);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(label);
  }

  return result;
}

export function tagsToJson(input: unknown): string {
  return JSON.stringify(sanitizeTags(input));
}
