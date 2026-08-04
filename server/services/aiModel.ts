import { PrismaClient } from '@prisma/client';
import {
  AI_CHAT_MODEL_SETTING_KEY,
  AI_IMAGE_MODEL_SETTING_KEY,
  DEFAULT_AI_CHAT_MODEL,
  DEFAULT_AI_IMAGE_MODEL
} from '../data/aiModels';

const prisma = new PrismaClient();

export async function getChatModel(): Promise<string> {
  const setting = await prisma.setting.findUnique({
    where: { key: AI_CHAT_MODEL_SETTING_KEY }
  });
  const value = setting?.value?.trim();
  return value || DEFAULT_AI_CHAT_MODEL;
}

export async function getImageModel(): Promise<string> {
  const setting = await prisma.setting.findUnique({
    where: { key: AI_IMAGE_MODEL_SETTING_KEY }
  });
  const value = setting?.value?.trim();
  return value || DEFAULT_AI_IMAGE_MODEL;
}
