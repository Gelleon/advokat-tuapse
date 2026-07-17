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
export const DEFAULT_IMAGE_PROMPT = `TEXTLESS photoreal editorial cover. No letters, words, numbers, captions, watermarks, logos, stamps, UI, Cyrillic or Latin characters anywhere. Papers and screens must be blank or fully blurred.

MANDATORY SCENE (depict exactly this, nothing else):
{sceneBrief}

Context only (do not render as text in the image):
- Practice area: {practiceArea}
- Article gist: {articleExcerpt}

Rules:
- One quiet real-world scene with concrete objects from the mandatory scene
- Square 1:1, soft natural light, muted slate and warm ivory, shallow depth of field
- Calm professional mood for a Russian private law firm blog
- Prefer industry/location props from the scene over abstract “law” symbols
- Forbidden as main subject: law books, library shelves, scales of justice, gavel, courthouse collage, blood, violence, handcuffs, mugshots
- No readable writing of any kind

Again: textless image, blank documents only, follow the mandatory scene.`;

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
