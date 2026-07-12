import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const prisma = new PrismaClient();

// Настройка хранилища для загрузки PDF файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Только PDF файлы разрешены'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

// Получить все дела (Публичный доступ)
router.get('/', async (req, res) => {
  try {
    const cases = await prisma.case.findMany({
      orderBy: { createdAt: 'desc' }
    });
    // Парсим JSON строку обратно в массив для фронтенда
    const formattedCases = cases.map(c => ({
      ...c,
      challenges: JSON.parse(c.challenges)
    }));
    res.json(formattedCases);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении дел' });
  }
});

// Добавить новое дело (Только для авторизованных)
router.post('/', authenticateToken, upload.single('pdf'), async (req, res) => {
  try {
    const { title, description, category, challenges, outcome, color } = req.body;
    
    const newCase = await prisma.case.create({
      data: {
        title,
        description,
        category,
        challenges: typeof challenges === 'string' ? challenges : JSON.stringify(challenges || []),
        outcome,
        color,
        pdfUrl: req.file ? `/uploads/${req.file.filename}` : null
      }
    });

    res.status(201).json({
      ...newCase,
      challenges: JSON.parse(newCase.challenges)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при создании дела' });
  }
});

// Обновить дело (Только для авторизованных)
router.put('/:id', authenticateToken, upload.single('pdf'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, challenges, outcome, color } = req.body;

    const dataToUpdate: any = {
      title,
      description,
      category,
      challenges: typeof challenges === 'string' ? challenges : JSON.stringify(challenges || []),
      outcome,
      color,
    };

    if (req.file) {
      dataToUpdate.pdfUrl = `/uploads/${req.file.filename}`;
    }

    const updatedCase = await prisma.case.update({
      where: { id },
      data: dataToUpdate
    });

    res.json({
      ...updatedCase,
      challenges: JSON.parse(updatedCase.challenges)
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при обновлении дела' });
  }
});

// Удалить дело (Только для авторизованных)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.case.delete({
      where: { id }
    });
    res.json({ message: 'Дело успешно удалено' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при удалении дела' });
  }
});

export default router;