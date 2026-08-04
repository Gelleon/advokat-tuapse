export const AI_CHAT_MODEL_SETTING_KEY = 'ai_chat_model';
export const AI_IMAGE_MODEL_SETTING_KEY = 'ai_image_model';

export const DEFAULT_AI_CHAT_MODEL = 'openai/gpt-4o-mini';
/** Модель Recraft через RouterAI для обложек блога */
export const DEFAULT_AI_IMAGE_MODEL = 'recraft/recraft-v4.1-utility';

/** Популярные текстовые модели RouterAI */
export const AI_CHAT_MODEL_OPTIONS = [
  { id: 'openai/gpt-4o-mini', label: 'OpenAI GPT-4o Mini' },
  { id: 'openai/gpt-4o', label: 'OpenAI GPT-4o' },
  { id: 'openai/gpt-4.1-mini', label: 'OpenAI GPT-4.1 Mini' },
  { id: 'openai/gpt-4.1', label: 'OpenAI GPT-4.1' },
  { id: 'openai/o4-mini', label: 'OpenAI o4 Mini' },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
  { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
  { id: 'google/gemini-2.5-pro-preview', label: 'Gemini 2.5 Pro' },
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek Chat' },
  { id: 'deepseek/deepseek-r1', label: 'DeepSeek R1' },
  { id: 'qwen/qwen-2.5-72b-instruct', label: 'Qwen 2.5 72B' }
] as const;

/** Модели генерации изображений через RouterAI (Recraft) */
export const AI_IMAGE_MODEL_OPTIONS = [
  { id: 'recraft/recraft-v4.1-utility', label: 'Recraft V4.1 Utility (рекомендуется)' },
  { id: 'recraft/recraft-v4.1', label: 'Recraft V4.1' },
  { id: 'recraft/recraft-v4', label: 'Recraft V4' },
  { id: 'recraft/recraft-v3', label: 'Recraft V3' },
  { id: 'recraft/recraft-v2', label: 'Recraft V2' }
] as const;

/** Размеры кадра под модель (Recraft V4.x поддерживает 1344x768 для 16:9) */
export function getImageSizesForModel(model: string): { primary: string; fallback: string } {
  const id = model.toLowerCase();
  if (id.includes('recraft-v4') || id.includes('recraft-v4.1')) {
    return { primary: '1344x768', fallback: '1024x1024' };
  }
  if (id.includes('recraft-v3') || id.includes('recraft-v2')) {
    return { primary: '1536x1024', fallback: '1024x1024' };
  }
  return { primary: '1024x1024', fallback: '1024x1024' };
}
