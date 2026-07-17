import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import casesRoutes from './routes/cases';
import postsRoutes from './routes/posts';
import settingsRoutes from './routes/settings';
import aiRoutes from './routes/ai';
import path from 'path';
import { createRequire } from 'module';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const require = createRequire(__filename);
const { generateSitemapXml } = require('./sitemap.cjs');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://advokat-tuapse.ru',
  'https://advokat-tuapse.ru',
  'http://www.advokat-tuapse.ru',
  'https://www.advokat-tuapse.ru',
  'http://localhost:5174',
  'http://localhost:5173',
  'http://localhost:3000'
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies
}));
app.use(express.json({ limit: '25mb' }));
app.use(cookieParser());

// Serve uploaded PDFs statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/health', async (_req, res) => {
  try {
    const casesCount = await prisma.case.count();
    res.json({ ok: true, cases: casesCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false });
  }
});

// Dynamic Sitemap
const handleSitemap = async (_req: express.Request, res: express.Response) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'https://advokat-tuapse.ru';
    const xml = await generateSitemapXml(prisma, baseUrl);
    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
  } catch (error) {
    console.error(error);
    res.status(500).end();
  }
};

app.get('/sitemap.xml', handleSitemap);
app.get('/api/sitemap.xml', handleSitemap);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});