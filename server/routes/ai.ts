import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { generateBlogDraft, listPracticeAreasForApi, regeneratePostCover, rewriteBlogDraft } from '../services/blogAgent';

const router = express.Router();
const prisma = new PrismaClient();

const DEFAULT_PROMPT = "Оптимизируй следующий текст для юридического портфолио, сделай его профессиональным, лаконичным и грамотным:\n\n{text}";

router.post('/optimize', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Текст не предоставлен' });
    }

    // Get prompt template
    const setting = await prisma.setting.findUnique({
      where: { key: 'ai_prompt_template' }
    });
    
    const template = setting?.value || DEFAULT_PROMPT;
    const prompt = template.replace('{text}', text);

    const apiKey = process.env.ROUTERAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'ROUTERAI_API_KEY не настроен на сервере' });
    }

    console.log('Sending request to RouterAI...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch('https://routerai.ru/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini', // Default fast model
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('AI API Error:', errorData);
      return res.status(response.status).json({ error: 'Ошибка при запросе к ИИ сервису', details: errorData });
    }

    const data = await response.json();
    const optimizedText = data.choices?.[0]?.message?.content;

    if (!optimizedText) {
      return res.status(500).json({ error: 'Пустой ответ от ИИ' });
    }

    res.json({ optimizedText });
  } catch (error: any) {
    console.error('AI Optimization Error:', error);
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Превышено время ожидания ответа от ИИ' });
    }
    res.status(500).json({ error: 'Внутренняя ошибка при работе с ИИ' });
  }
});

router.get('/blog/practice-areas', authenticateToken, (_req, res) => {
  res.json({ areas: listPracticeAreasForApi() });
});

router.post('/blog/generate', authenticateToken, async (req, res) => {
  try {
    const { practiceAreaId, periodType, author } = req.body || {};

    if (periodType && !['daily', 'weekly', 'monthly', 'quarterly'].includes(periodType)) {
      return res.status(400).json({ error: 'periodType должен быть daily, weekly, monthly или quarterly' });
    }

    const result = await generateBlogDraft({
      practiceAreaId: practiceAreaId || 'auto',
      periodType,
      author
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Blog agent error:', error);
    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'Превышено время ожидания ответа от ИИ' });
    }
    res.status(500).json({ error: error?.message || 'Ошибка генерации статьи' });
  }
});

router.post('/blog/regenerate-image', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.body || {};
    if (!postId) {
      return res.status(400).json({ error: 'Не указан postId' });
    }

    const post = await regeneratePostCover(String(postId));
    res.json({ post });
  } catch (error: any) {
    console.error('Cover regenerate error:', error);
    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'Превышено время ожидания генерации изображения' });
    }
    res.status(500).json({ error: error?.message || 'Ошибка генерации обложки' });
  }
});

export default router;
