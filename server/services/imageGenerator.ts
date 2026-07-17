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

export async function generateBlogCoverImage(vars: {
  title: string;
  previewText: string;
  practiceArea: string;
  category: string;
}): Promise<string | null> {
  const apiKey = process.env.ROUTERAI_API_KEY;
  if (!apiKey) {
    console.warn('ROUTERAI_API_KEY missing — skip cover image generation');
    return null;
  }

  const template = await getImagePromptTemplate();
  const prompt = renderImagePrompt(template, vars);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  const requestImage = async (size: string) => {
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
        size,
        response_format: 'b64_json'
      }),
      signal: controller.signal
    });
    return response;
  };

  try {
    let response = await requestImage('1536x1024');
    if (!response.ok) {
      const errText = await response.text();
      console.warn('Image size 1536x1024 failed, retry 1024x1024:', errText.slice(0, 300));
      response = await requestImage('1024x1024');
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error('Image generation API error:', response.status, errText.slice(0, 500));
      return null;
    }

    const data = await response.json();
    const item = data?.data?.[0];
    if (!item) {
      console.error('Image generation returned empty data');
      return null;
    }

    ensureUploadDir();
    const filename = `ai-cover-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;
    const filepath = path.join(UPLOAD_DIR, filename);

    if (item.b64_json) {
      fs.writeFileSync(filepath, decodeImagePayload(item.b64_json));
    } else if (item.url) {
      const imageRes = await fetch(item.url);
      if (!imageRes.ok) {
        console.error('Failed to download generated image URL');
        return null;
      }
      const arrayBuffer = await imageRes.arrayBuffer();
      fs.writeFileSync(filepath, Buffer.from(arrayBuffer));
    } else {
      console.error('Image payload has neither b64_json nor url');
      return null;
    }

    return `/uploads/blog/${filename}`;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      console.error('Image generation timeout');
    } else {
      console.error('Image generation failed:', error);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
