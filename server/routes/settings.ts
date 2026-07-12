import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get setting by key
router.get('/:key', authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await prisma.setting.findUnique({
      where: { key }
    });
    
    if (!setting) {
      return res.json({ value: null });
    }
    
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении настройки' });
  }
});

// Update or create setting
router.put('/:key', authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    if (!value && value !== '') {
      return res.status(400).json({ error: 'Значение не предоставлено' });
    }
    
    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
    
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при сохранении настройки' });
  }
});

export default router;
