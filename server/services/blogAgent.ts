import { PrismaClient } from '@prisma/client';
import { PRACTICE_AREAS, PracticeArea, getPracticeArea } from '../data/practiceAreas';
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

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let attempt = 0;

  while (await prisma.post.findUnique({ where: { slug } })) {
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

function buildPrompt(area: PracticeArea, brief: string): string {
  return `Ты — юридический копирайтер адвокатского бюро «Адвокаты Туапсе».
Напиши SEO-статью для блога сайта на основе официально опубликованного правового акта.

Направление практики бюро: ${area.title}
Описание направления: ${area.description}
Типовые услуги: ${area.features.join('; ')}

Данные об официальном документе (источник publication.pravo.gov.ru):
${brief}

Требования к статье:
1. Пиши простым понятным русским языком для человека без юридического образования.
2. Объясни: что изменилось / о чём документ, кому это важно, какие практические выводы, когда стоит обратиться к адвокату.
3. Не выдумывай нормы, даты, номера статей и последствия, которых нет в исходных данных. Если полного текста нет — опирайся только на название и реквизиты, и прямо скажи, что детали нужно смотреть в официальной публикации.
4. Структура HTML: используй <h2>, <p>, <ul><li>. Без <html>, <body>, <h1>.
5. В конце добавь короткий дисклеймер: материал носит информационный характер и не является индивидуальной юридической консультацией.
6. В конце добавь абзац со ссылкой на официальную публикацию (используй точный URL из данных).
7. SEO: естественные ключи по теме «${area.title}», Туапсе/Краснодарский край уместно упомянуть 1 раз, без переспама.

Верни ТОЛЬКО валидный JSON без markdown-обёртки:
{
  "title": "заголовок до 80 символов",
  "slug": "translit-url-slug-latin",
  "previewText": "краткое превью 1-2 предложения",
  "content": "HTML текст статьи",
  "metaTitle": "SEO title до 60 символов",
  "metaDescription": "SEO description до 160 символов",
  "tags": ["тег1", "тег2", "тег3"]
}`;
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
            content: 'Ты помощник для подготовки SEO-статей юридического блога. Отвечай только валидным JSON.'
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
    throw new Error('В ответе ИИ отсутствуют обязательные поля title/content');
  }

  return {
    title: String(parsed.title).trim(),
    slug: slugify(String(parsed.slug || parsed.title)),
    previewText: String(parsed.previewText || '').trim(),
    content: String(parsed.content).trim(),
    metaTitle: String(parsed.metaTitle || parsed.title).trim(),
    metaDescription: String(parsed.metaDescription || parsed.previewText || '').trim(),
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
  const prompt = buildPrompt(selected.area, brief);
  const aiRaw = await callRouterAI(prompt);
  const article = parseArticleJson(aiRaw);

  const sourceUrl = getDocumentPublicUrl(details.eoNumber);
  const tags = Array.from(new Set([
    selected.area.title,
    'Изменения законодательства',
    `pravo:${details.eoNumber}`,
    ...article.tags
  ])).slice(0, 10);

  // Гарантируем наличие ссылки на источник в тексте
  if (!article.content.includes(sourceUrl)) {
    article.content += `<p>Официальная публикация: <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer">${details.complexName?.replace(/<br\s*\/?>/gi, ' ') || sourceUrl}</a></p>`;
  }

  if (!article.content.toLowerCase().includes('информацион')) {
    article.content += '<p><em>Материал носит информационный характер и не является индивидуальной юридической консультацией.</em></p>';
  }

  const slug = await ensureUniqueSlug(article.slug || slugify(article.title));

  const created = await prisma.post.create({
    data: {
      title: article.title,
      slug,
      previewText: article.previewText || article.metaDescription || article.title,
      content: article.content,
      category: 'Отраслевые новости',
      tags: JSON.stringify(tags),
      author,
      status: 'DRAFT',
      publishedAt: null,
      metaTitle: article.metaTitle,
      metaDescription: article.metaDescription
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
    }
  };
}

export function listPracticeAreasForApi() {
  return PRACTICE_AREAS.map(({ id, title, description }) => ({ id, title, description }));
}
