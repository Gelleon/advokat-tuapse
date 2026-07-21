import { PrismaClient } from '@prisma/client';
import { PRACTICE_AREAS, PracticeArea, getPracticeArea } from '../data/practiceAreas';
import {
  BLOG_PROMPT_SETTING_KEY,
  DEFAULT_BLOG_PROMPT,
  renderBlogPrompt
} from '../data/blogPrompt';
import {
  PravoDocument,
  PravoDocumentDetails,
  PravoPeriodType,
  documentSearchText,
  fetchRecentDocuments,
  getDocumentDetails,
  getDocumentPublicUrl
} from './pravoApi';
import { slugify } from '../utils/slugify';
import { sanitizeTags } from '../utils/tags';
import { generateBlogCoverImage } from './imageGenerator';

const prisma = new PrismaClient();

export interface BlogAgentInput {
  practiceAreaId?: string; // конкретное направление или auto
  periodType?: PravoPeriodType;
  author?: string;
}

export interface GeneratedArticle {
  title: string;
  slug: string;
  previewText: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  tags: string[];
}

export interface BlogAgentResult {
  post: {
    id: string;
    title: string;
    slug: string;
    previewText: string;
    content: string;
    category: string;
    tags: string[];
    author: string;
    thumbnailUrl?: string | null;
    status: string;
    publishedAt: string | null;
    metaTitle: string | null;
    metaDescription: string | null;
    createdAt: string;
    updatedAt: string;
  };
  source: {
    eoNumber: string;
    complexName: string;
    url: string;
    practiceArea: string;
  };
  imageError?: string;
}

interface RankedDocument {
  doc: PravoDocument;
  area: PracticeArea;
  score: number;
}

function matchesKeyword(text: string, keyword: string): boolean {
  const kw = keyword.toLowerCase();
  if (kw.includes(' ')) return text.includes(kw);
  if (kw.length <= 5) {
    // Короткие корни — только как отдельное слово/начало слова
    const re = new RegExp(`(?:^|[^a-zа-яё])${kw}`, 'i');
    return re.test(text);
  }
  return text.includes(kw);
}

function scoreDocument(doc: PravoDocument, area: PracticeArea): number {
  const text = documentSearchText(doc);
  let score = 0;

  for (const keyword of area.keywords) {
    if (matchesKeyword(text, keyword)) {
      score += keyword.length > 6 ? 3 : 2;
    }
  }

  // Бонусы только если документ уже релевантен направлению
  if (score === 0) return 0;

  if (text.includes('конституционн')) score += 4;
  if (text.includes('федеральн') && text.includes('закон')) score += 3;
  if (text.includes('по делу о проверке')) score += 2;

  return score;
}

function rankDocuments(
  documents: PravoDocument[],
  practiceAreaId?: string
): RankedDocument[] {
  const areas = practiceAreaId && practiceAreaId !== 'auto'
    ? [getPracticeArea(practiceAreaId)].filter(Boolean) as PracticeArea[]
    : PRACTICE_AREAS;

  if (areas.length === 0) {
    throw new Error('Неизвестное направление практики');
  }

  const ranked: RankedDocument[] = [];

  for (const doc of documents) {
    let best: RankedDocument | null = null;

    for (const area of areas) {
      const score = scoreDocument(doc, area);
      if (score <= 0) continue;
      if (!best || score > best.score) {
        best = { doc, area, score };
      }
    }

    if (best) ranked.push(best);
  }

  ranked.sort((a, b) => b.score - a.score || b.doc.viewDate.localeCompare(a.doc.viewDate));
  return ranked;
}

async function getUsedEoNumbers(): Promise<Set<string>> {
  const posts = await prisma.post.findMany({ select: { tags: true, content: true, slug: true } });
  const used = new Set<string>();

  for (const post of posts) {
    try {
      const tags: string[] = JSON.parse(post.tags || '[]');
      for (const tag of tags) {
        const match = String(tag).match(/^pravo:([0-9a-z]+)$/i);
        if (match) used.add(match[1]);
      }
    } catch {
      // ignore malformed tags
    }

    const contentMatch = post.content?.match(/pravo\.gov\.ru\/document\/([0-9a-z]+)/i);
    if (contentMatch) used.add(contentMatch[1]);
  }

  return used;
}

async function ensureUniqueSlug(baseSlug: string, ignorePostId?: string): Promise<string> {
  let slug = baseSlug;
  let attempt = 0;

  while (true) {
    const existing = await prisma.post.findUnique({ where: { slug } });
    if (!existing || existing.id === ignorePostId) break;
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  return slug;
}

function buildSourceBrief(details: PravoDocumentDetails): string {
  const authority = details.signatoryAuthorities?.find((a) => a.isMain)?.name
    || details.signatoryAuthorities?.[0]?.name
    || 'орган государственной власти';

  return [
    `Вид документа: ${details.documentType?.name || 'не указан'}`,
    `Принявший орган: ${authority}`,
    `Название: ${details.name}`,
    `Полное обозначение: ${details.complexName?.replace(/<br\s*\/?>/gi, ' ')}`,
    `Номер: ${details.number || 'не указан'}`,
    `Дата подписания: ${details.documentDate || 'не указана'}`,
    `Дата официального опубликования: ${details.viewDate || details.publishDateShort || 'не указана'}`,
    `Номер электронного опубликования (eoNumber): ${details.eoNumber}`,
    `Ссылка на официальную публикацию: ${getDocumentPublicUrl(details.eoNumber)}`
  ].join('\n');
}

async function getBlogPromptTemplate(): Promise<string> {
  const setting = await prisma.setting.findUnique({
    where: { key: BLOG_PROMPT_SETTING_KEY }
  });
  return setting?.value?.trim() || DEFAULT_BLOG_PROMPT;
}

async function buildPrompt(area: PracticeArea, brief: string): Promise<string> {
  const template = await getBlogPromptTemplate();
  return renderBlogPrompt(template, {
    practiceArea: area.title,
    practiceDescription: area.description,
    practiceFeatures: area.features.join('; '),
    sourceBrief: brief
  });
}

async function callRouterAI(prompt: string): Promise<string> {
  const apiKey = process.env.ROUTERAI_API_KEY;
  if (!apiKey) {
    throw new Error('ROUTERAI_API_KEY не настроен на сервере');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  try {
    const response = await fetch('https://routerai.ru/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        temperature: 0.5,
        messages: [
          {
            role: 'system',
            content: 'Ты редактор правового новостного блога. Пиши ясно, по делу, в стиле деловых СМИ. Всегда отвечай только валидным JSON-объектом без markdown-обёртки, комментариев и любого текста вне JSON. Никогда не оставляй поля title и content пустыми или null — если по документу невозможно написать полноценную статью, всё равно сгенерируй осмысленный title и развёрнутый content хотя бы из реквизитов документа и общей практики направления.'
          },
          { role: 'user', content: prompt }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Ошибка ИИ-сервиса: ${response.status} ${errorData.slice(0, 300)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Пустой ответ от ИИ');
    return content as string;
  } finally {
    clearTimeout(timeoutId);
  }
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Гарантирует развёрнутое превью для ленты и индексации. */
function ensureExpandedPreview(previewText: string, content: string, title: string): string {
  const preview = previewText.trim();
  if (preview.length >= 320) {
    return preview.length > 650 ? `${preview.slice(0, 647).replace(/\s+\S*$/, '')}…` : preview;
  }

  const body = stripHtmlToText(content);
  const combined = [preview, body].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  const source = combined || title;
  if (source.length <= 650) return source;
  return `${source.slice(0, 647).replace(/\s+\S*$/, '')}…`;
}

function ensureMetaDescription(metaDescription: string, previewText: string, title: string): string {
  const meta = metaDescription.trim();
  if (meta.length >= 110 && meta.length <= 170) return meta;
  const base = (meta || previewText || title).replace(/\s+/g, ' ').trim();
  if (base.length <= 160) return base;
  return `${base.slice(0, 157).replace(/\s+\S*$/, '')}…`;
}

/** Теги публикации: без pravo:, с каноническим направлением, без дублей */
function buildPostTags(practiceAreaTitle: string, aiTags: string[] = []): string[] {
  return sanitizeTags([
    practiceAreaTitle,
    'Изменения законодательства',
    ...aiTags
  ]).slice(0, 8);
}

function parseArticleJson(raw: string): GeneratedArticle {
  const cleaned = raw.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '');

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('ИИ вернул ответ не в формате JSON');
    parsed = JSON.parse(match[0]);
  }

  if (!parsed.title || !parsed.content) {
    console.error('AI JSON parsed but missing required fields. Keys:', parsed && typeof parsed === 'object' ? Object.keys(parsed) : '(not an object)');
    console.error('AI JSON snippet:', JSON.stringify(parsed).slice(0, 1000));
    throw new Error('В ответе ИИ отсутствуют обязательные поля title/content');
  }

  const title = String(parsed.title).trim();
  const content = String(parsed.content).trim();
  if (!title || !content) {
    console.error('AI title/content are empty after trim. Raw title:', JSON.stringify(parsed.title), 'content length:', content.length);
    throw new Error('В ответе ИИ отсутствуют обязательные поля title/content');
  }
  const previewText = ensureExpandedPreview(String(parsed.previewText || ''), content, title);
  const metaDescription = ensureMetaDescription(
    String(parsed.metaDescription || ''),
    previewText,
    title
  );

  return {
    title,
    slug: slugify(String(parsed.slug || title)),
    previewText,
    content,
    metaTitle: String(parsed.metaTitle || title).trim(),
    metaDescription,
    tags: Array.isArray(parsed.tags) ? parsed.tags.map((t: unknown) => String(t).trim()).filter(Boolean) : []
  };
}

export async function generateBlogDraft(input: BlogAgentInput = {}): Promise<BlogAgentResult> {
  const periodType: PravoPeriodType = input.periodType || 'weekly';
  const author = input.author?.trim() || 'Адвокаты Туапсе';

  const documents = await fetchRecentDocuments(periodType, 2);
  if (documents.length === 0) {
    throw new Error('Не удалось получить документы с publication.pravo.gov.ru');
  }

  const usedEo = await getUsedEoNumbers();
  const ranked = rankDocuments(documents, input.practiceAreaId)
    .filter((item) => !usedEo.has(item.doc.eoNumber));

  if (ranked.length === 0) {
    throw new Error(
      'Не найдено новых релевантных документов за выбранный период. Попробуйте другой период или направление.'
    );
  }

  const selected = ranked[0];
  const details = await getDocumentDetails(selected.doc.eoNumber);
  const brief = buildSourceBrief(details);
  const prompt = await buildPrompt(selected.area, brief);
  const aiRaw = await callRouterAI(prompt);
  let article: GeneratedArticle;
  try {
    article = parseArticleJson(aiRaw);
  } catch (parseErr: any) {
    console.error('AI raw response (failed to parse):', aiRaw?.slice(0, 2000));
    throw new Error(`ИИ вернул неожиданный формат: ${parseErr?.message || 'parse error'}`);
  }

  const sourceUrl = getDocumentPublicUrl(details.eoNumber);
  const sourceTitle = details.complexName?.replace(/<br\s*\/?>/gi, ' ') || details.name || sourceUrl;
  const tags = buildPostTags(selected.area.title, article.tags);

  if (!article.content.includes(sourceUrl)) {
    article.content += `<p class="article-source">Официальная публикация: <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer">${sourceTitle}</a></p>`;
  }

  if (!article.content.toLowerCase().includes('информацион')) {
    article.content += '<p class="article-disclaimer">Материал носит информационный характер и не является индивидуальной юридической консультацией.</p>';
  }

  // Если модель не поставила lead — обернём первый абзац
  if (!article.content.includes('class="lead"')) {
    article.content = article.content.replace(
      /<p(\s[^>]*)?>/,
      '<p class="lead"$1>'
    );
  }

  const slug = await ensureUniqueSlug(article.slug || slugify(article.title));
  const category = 'Отраслевые новости';

  const cover = await generateBlogCoverImage({
    title: article.title,
    previewText: article.previewText || article.metaDescription || '',
    practiceArea: selected.area.title,
    category,
    content: article.content
  });

  if (cover.error) {
    console.error('Cover image generation issue:', cover.error);
  }

  const created = await prisma.post.create({
    data: {
      title: article.title,
      slug,
      previewText: article.previewText || article.metaDescription || article.title,
      content: article.content,
      category,
      tags: JSON.stringify(tags),
      author,
      status: 'DRAFT',
      publishedAt: null,
      metaTitle: article.metaTitle,
      metaDescription: article.metaDescription,
      thumbnailUrl: cover.url
    }
  });

  return {
    post: {
      ...created,
      tags,
      publishedAt: created.publishedAt ? created.publishedAt.toISOString() : null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString()
    },
    source: {
      eoNumber: details.eoNumber,
      complexName: details.complexName?.replace(/<br\s*\/?>/gi, ' ') || details.name,
      url: sourceUrl,
      practiceArea: selected.area.title
    },
    imageError: cover.error
  };
}

export async function regeneratePostCover(postId: string) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    throw new Error('Публикация не найдена');
  }

  let practiceArea = 'Право';
  try {
    const tags = sanitizeTags(post.tags || '[]');
    const known = PRACTICE_AREAS.find((area) =>
      tags.some((tag) => tag.toLowerCase() === area.title.toLowerCase())
    );
    if (known) practiceArea = known.title;
  } catch {
    // ignore
  }

  const cover = await generateBlogCoverImage({
    title: post.title,
    previewText: post.previewText || post.metaDescription || '',
    practiceArea,
    category: post.category,
    content: post.content
  });

  if (!cover.url) {
    throw new Error(cover.error || 'Не удалось сгенерировать обложку');
  }

  const updated = await prisma.post.update({
    where: { id: postId },
    data: { thumbnailUrl: cover.url }
  });

  return {
    ...updated,
    tags: sanitizeTags(updated.tags || '[]'),
    publishedAt: updated.publishedAt ? updated.publishedAt.toISOString() : null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString()
  };
}

export async function rewriteBlogDraft(postId: string): Promise<BlogAgentResult> {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    throw new Error('Публикация не найдена');
  }

  // Определяем направление практики по тегам (первый тег, совпавший с PRACTICE_AREAS)
  let area: PracticeArea | null = null;
  try {
    const tags = sanitizeTags(post.tags || '[]');
    area = PRACTICE_AREAS.find((a) => tags.some((t) => t.toLowerCase() === a.title.toLowerCase())) || null;
  } catch {
    // ignore
  }
  if (!area) {
    // fallback: «Право» — нейтральное направление
    area = {
      id: 'general',
      title: 'Право',
      description: 'Юридическая практика адвокатского бюро',
      keywords: [],
      features: [
        'Консультации по правовым вопросам',
        'Представительство в суде',
        'Подготовка правовых документов'
      ]
    };
  }

  const brief = buildRewriteBrief(post);
  const prompt = await buildPrompt(area, brief);
  const aiRaw = await callRouterAI(prompt);
  let article: GeneratedArticle;
  try {
    article = parseArticleJson(aiRaw);
  } catch (parseErr: any) {
    console.error('AI raw response (rewrite failed to parse):', aiRaw?.slice(0, 2000));
    throw new Error(`ИИ вернул неожиданный формат: ${parseErr?.message || 'parse error'}`);
  }

  // Сохраняем теги и автора — это метаданные, а не часть текста
  const tags = buildPostTags(area.title, article.tags);

  const updated = await prisma.post.update({
    where: { id: postId },
    data: {
      title: article.title,
      slug: await ensureUniqueSlug(article.slug || slugify(article.title), postId),
      previewText: article.previewText || article.metaDescription || article.title,
      content: article.content,
      tags: JSON.stringify(tags),
      metaTitle: article.metaTitle,
      metaDescription: article.metaDescription
    }
  });

  return {
    post: {
      ...updated,
      tags,
      publishedAt: updated.publishedAt ? updated.publishedAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString()
    },
    source: {
      eoNumber: post.id,
      complexName: post.title,
      url: '',
      practiceArea: area.title
    }
  };
}

function buildRewriteBrief(post: {
  title: string;
  previewText: string;
  content: string;
  metaDescription: string | null;
  publishedAt: Date | null;
}): string {
  const text = stripHtmlToText(post.content || '').slice(0, 4000);
  return [
    'Задача: РЕРАЙТ уже опубликованной статьи блога по текущему шаблону.',
    'Не ищи новый документ — перепиши существующий текст заново по тем же правилам (лид → суть → кому важно → что делать → источник).',
    'Сохрани смысл, факты, ссылки и цифры. Измени структуру, формулировки и подачу.',
    '',
    `Текущий заголовок: ${post.title}`,
    `Текущее превью: ${post.previewText || ''}`,
    `Текущее meta description: ${post.metaDescription || ''}`,
    `Дата оригинала: ${post.publishedAt ? post.publishedAt.toISOString().slice(0, 10) : 'не указана'}`,
    '',
    'Текст оригинальной статьи (для справки):',
    text || '(пусто)'
  ].join('\n');
}

export function listPracticeAreasForApi() {
  return PRACTICE_AREAS.map(({ id, title, description }) => ({ id, title, description }));
}

export { DEFAULT_BLOG_PROMPT, BLOG_PROMPT_SETTING_KEY };
