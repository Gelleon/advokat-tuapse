import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_IMAGE_PROMPT,
  IMAGE_PROMPT_SETTING_KEY,
  renderImagePrompt
} from '../data/imagePrompt';

const prisma = new PrismaClient();

const IMAGE_MODEL = 'recraft/recraft-v4.1-utility';
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
    ? payload.split('base64,')[1]
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

export type CoverImageResult = {
  url: string | null;
  error?: string;
};

export async function generateBlogCoverImage(vars: {
  title: string;
  previewText: string;
  practiceArea: string;
  category: string;
}): Promise<CoverImageResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { url: null, error: 'ROUTERAI_API_KEY не настроен на сервере' };
  }

  const template = await getImagePromptTemplate();
  const prompt = renderImagePrompt(template, vars);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    // 1024x1024 — стабильный размер для Recraft через RouterAI
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
        size: '1024x1024',
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
