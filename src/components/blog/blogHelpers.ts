import { Post } from '../../store/usePosts';
import { PRACTICE_AREA_OPTIONS } from '../../data/practiceAreas';

/** Канонические темы для фильтра и карточек (без «Авто») */
export const CANONICAL_TOPICS = PRACTICE_AREA_OPTIONS
  .filter((item) => item.id !== 'auto')
  .map((item) => item.title);

const CANONICAL_BY_LOWER = new Map(
  CANONICAL_TOPICS.map((title) => [title.toLowerCase(), title] as const)
);

const HIDDEN_TAG_PREFIXES = ['pravo:'];
const HIDDEN_TAG_EXACT = new Set(['изменения законодательства']);

export const formatBlogDate = (value?: string) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/** Приводит известную тему к каноническому написанию; иначе — с заглавной буквы */
export function normalizeTagLabel(tag: string): string {
  const trimmed = tag.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  const canonical = CANONICAL_BY_LOWER.get(trimmed.toLowerCase());
  if (canonical) return canonical;
  return trimmed.charAt(0).toLocaleUpperCase('ru-RU') + trimmed.slice(1);
}

export function isHiddenTag(tag: string): boolean {
  const trimmed = tag.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  if (HIDDEN_TAG_PREFIXES.some((prefix) => lower.startsWith(prefix))) return true;
  if (HIDDEN_TAG_EXACT.has(lower)) return true;
  return false;
}

/** Теги для отображения: без pravo:, без служебных, без дублей, с нормальным регистром */
export const getVisibleTags = (tags: string[] = []) => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of tags) {
    if (isHiddenTag(raw)) continue;
    const label = normalizeTagLabel(raw);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(label);
  }

  return result;
};

export const getTopicLabel = (post: Post) => {
  for (const tag of post.tags || []) {
    const canonical = CANONICAL_BY_LOWER.get(tag.trim().toLowerCase());
    if (canonical) return canonical;
  }
  const visible = getVisibleTags(post.tags);
  return visible[0] || post.category || 'Право';
};

/** Опции фильтра «Все темы»: только канонические направления, без дублей */
export function getTopicFilterOptions(posts: Post[]): string[] {
  const present = new Set<string>();

  for (const post of posts) {
    for (const tag of post.tags || []) {
      const canonical = CANONICAL_BY_LOWER.get(String(tag).trim().toLowerCase());
      if (canonical) present.add(canonical);
    }
  }

  const ordered = CANONICAL_TOPICS.filter((topic) => present.has(topic));
  return ['Все', ...ordered];
}

export function postMatchesTopic(post: Post, selectedTopic: string): boolean {
  if (!selectedTopic || selectedTopic === 'Все') return true;
  const target = selectedTopic.trim().toLowerCase();
  return (post.tags || []).some((tag) => String(tag).trim().toLowerCase() === target);
}

export const getAuthorInitials = (author?: string) => {
  if (!author?.trim()) return 'АТ';
  const parts = author.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};
