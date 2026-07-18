import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_IMAGE_PROMPT,
  IMAGE_PROMPT_SETTING_KEY,
  buildArticleExcerpt,
  renderImagePrompt
} from '../data/imagePrompt';

const prisma = new PrismaClient();

const IMAGE_MODEL = 'recraft/recraft-v4.1-utility';
const CHAT_MODEL = 'openai/gpt-4o-mini';
/** Landscape 16:9 — supported by Recraft V4.1 Utility */
const IMAGE_SIZE = '1344x768';
const UPLOAD_DIR = path.join(__dirname, '../../uploads/blog');

function getApiKey(): string {
  return (process.env.ROUTERAI_API_KEY || '').trim().replace(/^['"]|['"]$/g, '');
}

async function getImagePromptTemplate(): Promise<string> {
  const setting = await prisma.setting.findUnique({
    where: { key: IMAGE_PROMPT_SETTING_KEY }
  });
  return setting?.value?.trim() || DEFAULT_IMAGE_PROMPT;
}

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function decodeImagePayload(payload: string): Buffer {
  const cleaned = payload.includes('base64,')
    ? payload.split('base64,')[1] || ''
    : payload;
  return Buffer.from(cleaned, 'base64');
}

function extensionFromMediaType(mediaType?: string): string {
  const type = (mediaType || '').toLowerCase();
  if (type.includes('webp')) return 'webp';
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg';
  if (type.includes('png')) return 'png';
  return 'png';
}

function fallbackSceneBrief(excerpt: string, practiceArea: string): string {
  const lower = `${excerpt} ${practiceArea}`.toLowerCase();
  if (/дорог|асфальт|трасс|шоссе|дорожн/.test(lower)) {
    return 'Wide landscape road construction at dusk: asphalt, orange cones, road roller soft-focus, blank rolled plans — full-bleed, no side bars, no text.';
  }
  if (/земельн|кадастр|участк|межев/.test(lower)) {
    return 'Wide landscape land survey: stakes on a green plot, blank cadastral sheet on wood table — full-bleed, no side bars, no text.';
  }
  if (/наслед|завещан/.test(lower)) {
    return 'Wide landscape quiet study: house keys and sealed blank envelope on wooden desk — full-bleed, no book library hero, no text.';
  }
  if (/алимент|развод|брак|семей/.test(lower)) {
    return 'Wide landscape calm apartment table with two coffee cups and blank folders — full-bleed, no text.';
  }
  if (/банкрот|долг|несостоятель/.test(lower)) {
    return 'Wide landscape modest table with blank bills, keys and calculator — full-bleed, no books, no text.';
  }
  if (/уголов|следств|обвинен/.test(lower)) {
    return 'Wide landscape defense consultation desk with blank case folder at dusk — full-bleed, no handcuffs, no text.';
  }
  if (/контракт|договор|подряд|строитель|госзакуп|арбитраж/.test(lower)) {
    return 'Wide landscape construction-contract still life: hard hat, blank folder, rolled blank drawings — full-bleed, no law library.';
  }
  return 'Wide landscape professional consulting desk with blank folders and industry props — full-bleed, no law books, no side bars, no text.';
}

async function buildSceneBrief(input: {
  apiKey: string;
  title: string;
  previewText: string;
  practiceArea: string;
  articleExcerpt: string;
}): Promise<string> {
  const excerpt = input.articleExcerpt || input.previewText || input.title;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch('https://routerai.ru/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${input.apiKey}`
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content:
              'You write short English visual briefs for landscape 16:9 article covers. Output 1-2 sentences only. No quotes, no markdown, no title text.'
          },
          {
            role: 'user',
            content: `Describe a photoreal FULL-BLEED landscape scene for a horizontal 16:9 cover (like vc.ru). The scene must fill the entire frame — no side bars, no floating card.

Article title: ${input.title}
Practice area: ${input.practiceArea}
Article text gist: ${excerpt}

Requirements:
- Match the real article subject with industry props (e.g. road construction contracts → asphalt roadworks, cones, road roller, blank site plans — NOT a law book)
- Start with "Wide landscape"
- Objects/environments only; no people faces
- Documents/plans blank or unreadable
- Never use law books, library shelves, scales of justice, or gavel as the main subject
- Do not request browser chrome, URLs, side margins, or any readable UI text`
          }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      console.error('Scene brief API error:', response.status, (await response.text()).slice(0, 300));
      return fallbackSceneBrief(excerpt, input.practiceArea);
    }

    const data = await response.json();
    const brief = String(data.choices?.[0]?.message?.content || '')
      .replace(/^["'\s]+|["'\s]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (brief.length < 20) {
      return fallbackSceneBrief(excerpt, input.practiceArea);
    }
    return brief.slice(0, 500);
  } catch (error) {
    console.error('Scene brief failed:', error);
    return fallbackSceneBrief(excerpt, input.practiceArea);
  } finally {
    clearTimeout(timeoutId);
  }
}

export type CoverImageResult = {
  url: string | null;
  error?: string;
};

export async function generateBlogCoverImage(vars: {
  title: string;
  previewText: string;
  practiceArea: string;
  category: string;
  content?: string;
}): Promise<CoverImageResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { url: null, error: 'ROUTERAI_API_KEY не настроен на сервере' };
  }

  const articleExcerpt = buildArticleExcerpt({
    title: vars.title,
    previewText: vars.previewText,
    ...(vars.content ? { content: vars.content } : {})
  });

  const sceneBrief = await buildSceneBrief({
    apiKey,
    title: vars.title,
    previewText: vars.previewText,
    practiceArea: vars.practiceArea,
    articleExcerpt
  });

  console.log('Cover scene brief:', sceneBrief);

  const template = await getImagePromptTemplate();
  let prompt = renderImagePrompt(template, {
    title: vars.title,
    previewText: vars.previewText,
    practiceArea: vars.practiceArea,
    category: vars.category,
    sceneBrief,
    articleExcerpt
  });

  // Старые шаблоны без {sceneBrief} всё равно получают landscape + сцену
  if (!template.includes('{sceneBrief}')) {
    prompt = [
      'Full-bleed landscape 16:9 cover like vc.ru. No side bars, no centered square inset.',
      `SCENE: ${sceneBrief}`,
      'TEXTLESS image — no letters, numbers, URLs, or UI labels.',
      prompt
    ].join('\n\n');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch('https://routerai.ru/api/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt,
        n: 1,
        size: IMAGE_SIZE,
        response_format: 'b64_json'
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Image generation API error:', response.status, errText.slice(0, 500));
      return {
        url: null,
        error: `Ошибка API изображений (${response.status}): ${errText.slice(0, 180)}`
      };
    }

    const data = await response.json();
    const item = data?.data?.[0];
    if (!item) {
      return { url: null, error: 'API изображений вернул пустой ответ' };
    }

    ensureUploadDir();
    const ext = extensionFromMediaType(item.media_type);
    const filename = `ai-cover-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    if (item.b64_json) {
      fs.writeFileSync(filepath, decodeImagePayload(item.b64_json));
    } else if (item.url) {
      const imageRes = await fetch(item.url);
      if (!imageRes.ok) {
        return { url: null, error: 'Не удалось скачать сгенерированное изображение' };
      }
      const arrayBuffer = await imageRes.arrayBuffer();
      fs.writeFileSync(filepath, Buffer.from(arrayBuffer));
    } else {
      return { url: null, error: 'В ответе API нет b64_json и url' };
    }

    const stat = fs.statSync(filepath);
    if (!stat.size) {
      return { url: null, error: 'Файл обложки сохранился пустым' };
    }

    console.log('Cover image saved:', filepath, 'bytes', stat.size);
    return { url: `/uploads/blog/${filename}` };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      return { url: null, error: 'Превышено время ожидания генерации изображения' };
    }
    console.error('Image generation failed:', error);
    return { url: null, error: error?.message || 'Ошибка генерации изображения' };
  } finally {
    clearTimeout(timeoutId);
  }
}
