import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_IMAGE_PROMPT,
  IMAGE_PROMPT_SETTING_KEY,
  buildArticleExcerpt,
  renderImagePrompt
} from '../data/imagePrompt';
import { getChatModel, getImageModel } from './aiModel';
import { getImageSizesForModel } from '../data/aiModels';

const prisma = new PrismaClient();

const SCENE_BRIEF_TIMEOUT_MS = 20_000;
const IMAGE_TIMEOUT_MS = 180_000;
const UPLOAD_DIR = path.join(__dirname, '../../uploads/blog');

function isFetchAborted(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { name?: string; message?: string; code?: string };
  return (
    e.name === 'AbortError'
    || e.code === 'ABORT_ERR'
    || /abort|terminated|timeout/i.test(String(e.message || ''))
  );
}

function formatImageError(error: unknown): string {
  if (isFetchAborted(error)) {
    return 'Превышено время ожидания генерации обложки (RouterAI). Нажмите «Сгенерировать обложку» ещё раз.';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Ошибка генерации изображения';
}

function truncatePrompt(prompt: string, maxLen = 6000): string {
  const trimmed = prompt.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

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
  const model = await getChatModel();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SCENE_BRIEF_TIMEOUT_MS);

  try {
    const response = await fetch('https://routerai.ru/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${input.apiKey}`
      },
      body: JSON.stringify({
        model,
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

async function requestCoverImage(
  apiKey: string,
  prompt: string,
  model: string,
  size: string,
  timeoutMs: number
): Promise<{ item?: { b64_json?: string; url?: string; media_type?: string }; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://routerai.ru/api/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        prompt: truncatePrompt(prompt),
        n: 1,
        size,
        response_format: 'b64_json'
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Image generation API error:', response.status, size, errText.slice(0, 500));
      return {
        error: `Ошибка API изображений (${response.status}): ${errText.slice(0, 180)}`
      };
    }

    const data = await response.json();
    const item = data?.data?.[0];
    if (!item) {
      return { error: 'API изображений вернул пустой ответ' };
    }
    return { item };
  } catch (error) {
    if (isFetchAborted(error)) {
      return { error: formatImageError(error) };
    }
    console.error('Image generation request failed:', error);
    return { error: formatImageError(error) };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function saveCoverItem(item: { b64_json?: string; url?: string; media_type?: string }): Promise<CoverImageResult> {
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
}

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

  const attempts: Array<{ size: string; timeoutMs: number }> = [];
  const imageModel = await getImageModel();
  const sizes = getImageSizesForModel(imageModel);
  attempts.push({ size: sizes.primary, timeoutMs: IMAGE_TIMEOUT_MS });
  if (sizes.fallback !== sizes.primary) {
    attempts.push({ size: sizes.fallback, timeoutMs: IMAGE_TIMEOUT_MS });
  }

  let lastError = 'Ошибка генерации изображения';

  console.log('Cover image model:', imageModel);

  for (let i = 0; i < attempts.length; i += 1) {
    const attempt = attempts[i];
    console.log(`Cover image attempt ${i + 1}/${attempts.length}, model=${imageModel}, size=${attempt.size}`);

    const result = await requestCoverImage(apiKey, prompt, imageModel, attempt.size, attempt.timeoutMs);
    if (result.item) {
      return saveCoverItem(result.item);
    }

    lastError = result.error || lastError;
    const retriable = /ожидан|terminated|abort|timeout|502|503|504|429/i.test(lastError);
    if (!retriable || i === attempts.length - 1) {
      break;
    }
    console.warn('Cover image retry after error:', lastError);
  }

  return { url: null, error: lastError };
}
