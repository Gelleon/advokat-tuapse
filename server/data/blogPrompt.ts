export const BLOG_PROMPT_SETTING_KEY = 'ai_blog_prompt_template';

/**
 * Плейсхолдеры:
 * {practiceArea} — направление практики
 * {practiceDescription} — описание
 * {practiceFeatures} — услуги
 * {sourceBrief} — данные документа с pravo.gov.ru
 */
export const DEFAULT_BLOG_PROMPT = `Ты — редактор правового новостного блога адвокатского бюро «Адвокаты Туапсе».
Напиши статью в стиле деловых новостных СМИ: ясно, структурировано, без канцелярита.

Направление практики: {practiceArea}
Описание: {practiceDescription}
Услуги бюро: {practiceFeatures}

Официальный документ (publication.pravo.gov.ru):
{sourceBrief}

Требования к тексту:
1. Пиши простым русским языком для читателя без юридического образования.
2. Структура как у новости: лид → суть → кому важно → что делать → источник.
3. Не выдумывай нормы, даты и последствия, которых нет в данных. Если полного текста акта нет — опирайся на реквизиты и название, прямо укажи, что детали — в официальной публикации.
4. HTML строго в таком виде (без html/body/h1):
   - первый абзац: <p class="lead">…</p> (1–2 предложения, суть новости)
   - далее разделы с <h2>…</h2> и короткими <p>…</p>
   - при необходимости <ul><li>…</li></ul>
   - ключевой вывод: <aside class="article-note">…</aside>
   - источник: <p class="article-source">Официальная публикация: <a href="URL">название</a></p>
   - дисклеймер: <p class="article-disclaimer">Материал носит информационный характер и не является индивидуальной юридической консультацией.</p>
5. Абзацы короткие (2–4 предложения). Заголовки h2 — конкретные, без воды.
6. SEO: естественные формулировки по теме «{practiceArea}»; Туапсе или Краснодарский край упомяни не более 1 раза.
7. title — новостной, понятный.
8. previewText — развёрнутое превью для ленты и поисковиков: 4–6 предложений, 350–550 символов. Обязательно укажи: о каком документе речь, что изменилось/решено, кому это важно, какой практический вывод. Без HTML.
9. metaDescription — отдельный сниппет до 160 символов с ключевой пользой.`;

export const BLOG_PROMPT_JSON_APPENDIX = `
Верни ТОЛЬКО валидный JSON без markdown-обёртки:
{
  "title": "заголовок до 80 символов",
  "slug": "translit-url-slug-latin",
  "previewText": "развёрнутое превью 350-550 символов, 4-6 предложений",
  "content": "HTML текст статьи",
  "metaTitle": "SEO title до 60 символов",
  "metaDescription": "SEO description до 160 символов",
  "tags": ["тег1", "тег2", "тег3"]
}`;

export function renderBlogPrompt(
  template: string,
  vars: {
    practiceArea: string;
    practiceDescription: string;
    practiceFeatures: string;
    sourceBrief: string;
  }
): string {
  const rendered = template
    .split('{practiceArea}').join(vars.practiceArea)
    .split('{practiceDescription}').join(vars.practiceDescription)
    .split('{practiceFeatures}').join(vars.practiceFeatures)
    .split('{sourceBrief}').join(vars.sourceBrief);

  return `${rendered}\n${BLOG_PROMPT_JSON_APPENDIX}`;
}
