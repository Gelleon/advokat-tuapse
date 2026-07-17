import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(__filename);
const { writeSitemapFile } = require('../write-sitemap.cjs');

const refreshSitemap = () => {
  writeSitemapFile().catch((error: Error) => {
    console.error('Sitemap refresh failed:', error);
  });
};

const router = express.Router();
const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/blog');
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
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Только изображения разрешены'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// Получить все посты (для фронта: только опубликованные, если не админ)
router.get('/', async (req, res) => {
  try {
    const { isAdmin } = req.query; // query param for admin panel
    
    let whereClause = {};
    if (isAdmin !== 'true') {
      whereClause = {
        status: 'PUBLISHED',
        publishedAt: {
          lte: new Date()
        }
      };
    }

    const posts = await prisma.post.findMany({
      where: whereClause,
      orderBy: { publishedAt: 'desc' }
    });

    const formattedPosts = posts.map(p => ({
      ...p,
      tags: JSON.parse(p.tags)
    }));

    res.json(formattedPosts);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении публикаций' });
  }
});

// Получить пост по slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const post = await prisma.post.findUnique({
      where: { slug }
    });

    if (!post) {
      return res.status(404).json({ error: 'Пост не найден' });
    }

    res.json({
      ...post,
      tags: JSON.parse(post.tags)
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении публикации' });
  }
});

// Добавить пост
router.post('/', authenticateToken, upload.single('thumbnail'), async (req, res) => {
  try {
    const { title, slug, previewText, content, category, tags, author, status, publishedAt, metaTitle, metaDescription } = req.body;
    
    // Check if slug is unique
    const existing = await prisma.post.findUnique({ where: { slug } });
    if (existing) {
      return res.status(400).json({ error: 'Slug должен быть уникальным' });
    }

    const resolvedStatus = status || 'DRAFT';
    const resolvedPublishedAt = publishedAt
      ? new Date(publishedAt)
      : (resolvedStatus === 'PUBLISHED' ? new Date() : null);

    const newPost = await prisma.post.create({
      data: {
        title,
        slug,
        previewText,
        content,
        category,
        tags: typeof tags === 'string' ? tags : JSON.stringify(tags || []),
        author,
        status: resolvedStatus,
        publishedAt: resolvedPublishedAt,
        metaTitle,
        metaDescription,
        thumbnailUrl: req.file ? `/uploads/blog/${req.file.filename}` : null
      }
    });

    res.status(201).json({
      ...newPost,
      tags: JSON.parse(newPost.tags)
    });
    if (newPost.status === 'PUBLISHED') {
      refreshSitemap();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при создании публикации' });
  }
});

// Обновить пост
router.put('/:id', authenticateToken, upload.single('thumbnail'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, slug, previewText, content, category, tags, author, status, publishedAt, metaTitle, metaDescription } = req.body;

    const resolvedStatus = status || 'DRAFT';
    const resolvedPublishedAt = publishedAt
      ? new Date(publishedAt)
      : (resolvedStatus === 'PUBLISHED' ? new Date() : null);

    const dataToUpdate: any = {
      title,
      slug,
      previewText,
      content,
      category,
      tags: typeof tags === 'string' ? tags : JSON.stringify(tags || []),
      author,
      status: resolvedStatus,
      publishedAt: resolvedPublishedAt,
      metaTitle,
      metaDescription,
    };

    if (req.file) {
      dataToUpdate.thumbnailUrl = `/uploads/blog/${req.file.filename}`;
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: dataToUpdate
    });

    res.json({
      ...updatedPost,
      tags: JSON.parse(updatedPost.tags)
    });
    refreshSitemap();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при обновлении публикации' });
  }
});

// Удалить пост
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.post.delete({
      where: { id }
    });
    refreshSitemap();
    res.json({ message: 'Пост успешно удален' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при удалении публикации' });
  }
});

export default router;