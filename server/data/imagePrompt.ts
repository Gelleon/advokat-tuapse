export const IMAGE_PROMPT_SETTING_KEY = 'ai_blog_image_prompt_template';

/**
 * Плейсхолдеры:
 * {sceneBrief} — англ. описание сцены по смыслу статьи (главное)
 * {title} — заголовок
 * {previewText} — превью
 * {articleExcerpt} — выдержка из текста статьи
 * {practiceArea} — направление практики
 * {category} — категория
 */
export const DEFAULT_IMAGE_PROMPT = `Create a vc.ru-style HORIZONTAL article cover (landscape 16:9).

COMPOSITION (mandatory):
- Landscape canvas 16:9 — wide rectangle, NOT square
- The photoreal scene FILLS the entire frame edge-to-edge
- No side bars, no pillarboxing, no letterboxing, no empty vertical strips left/right
- No floating small square card in the middle
- Optional subtle vignette only — never solid empty side panels
- Clean editorial cover like vc.ru news images

SCENE (fill the full frame):
{sceneBrief}

Context only — DO NOT render as text in the image:
- Practice: {practiceArea}
- Gist: {articleExcerpt}

STYLE:
- Soft natural light, muted professional tones
- Calm, trustworthy mood for a Russian private law firm blog
- High-end photoreal / editorial illustration
- Prefer industry props from the scene over abstract law symbols

HARD NEGATIVES:
- No letters, words, numbers, captions, watermarks, logos, URLs, UI labels, Cyrillic or Latin characters
- No browser chrome, no fake website screenshots with readable UI
- Papers/plans/screens must be blank or fully blurred
- Forbidden as main subject: law books, library shelves, scales of justice, gavel
- No blood, violence, handcuffs, mugshots
- No black/gray empty side margins; no centered square inset; image must be a full-bleed horizontal rectangle

Again: full-bleed landscape 16:9 cover, textless, scene fills the whole image.`;

export function renderImagePrompt(
  template: string,
  vars: {
    title: string;
    previewText: string;
    practiceArea: string;
    category: string;
    sceneBrief: string;
    articleExcerpt: string;
  }
): string {
  return template
    .split('{sceneBrief}').join(vars.sceneBrief || 'Professional legal consulting desk with blank folders')
    .split('{articleExcerpt}').join((vars.articleExcerpt || vars.previewText || '').slice(0, 500))
    .split('{title}').join(vars.title || 'Legal news')
    .split('{previewText}').join((vars.previewText || '').slice(0, 400))
    .split('{practiceArea}').join(vars.practiceArea || 'Law')
    .split('{category}').join(vars.category || 'Legal news');
}

export function htmlToPlainText(html: string): string {
  return (html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildArticleExcerpt(input: {
  title?: string;
  previewText?: string;
  content?: string;
  maxLen?: number;
}): string {
  const maxLen = input.maxLen ?? 700;
  const fromBody = htmlToPlainText(input.content || '');
  const parts = [
    (input.title || '').trim(),
    (input.previewText || '').trim(),
    fromBody
  ].filter(Boolean);

  const joined = parts.join('. ').replace(/\s+/g, ' ').trim();
  return joined.slice(0, maxLen);
}
