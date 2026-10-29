const LEADING_AI_LABELS = [
  'итог дела',
  'достигнутый результат',
  'результат дела',
  'суть дела',
  'краткое описание'
].join('|');

const STANDALONE_LABEL_RE = new RegExp(`^(?:${LEADING_AI_LABELS})\\s*[:.-]?\\s*$`, 'i');
const LEADING_LABEL_RE = new RegExp(`^(?:${LEADING_AI_LABELS})\\s*[:.-]?\\s*`, 'i');

export function normalizeAiOptimizedText(text: string): string {
  const normalized = text
    .replace(/\r\n?/g, '\n')
    .replace(/^```[a-zа-я0-9_-]*\s*/gim, '')
    .replace(/```$/gim, '')
    .replace(/[*_`]+/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const contentLines = lines.filter((line) => !STANDALONE_LABEL_RE.test(line));

  if (contentLines.length === 0) {
    return '';
  }

  contentLines[0] = contentLines[0].replace(LEADING_LABEL_RE, '').trim();

  return contentLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
