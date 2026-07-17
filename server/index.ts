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
import { PrismaClient } from '@prisma/client';

dotenv.config();

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

// Dynamic Sitemap
async function generateSitemapXml(baseUrl: string): Promise<string> {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true, updatedAt: true },
  });

  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  const staticRoutes = [
    { url: '/', priority: '1.0', changefreq: 'weekly' },
    { url: '/blog', priority: '0.9', changefreq: 'daily' },
    { url: '/privacy', priority: '0.3', changefreq: 'yearly' },
    { url: '/terms', priority: '0.3', changefreq: 'yearly' },
  ];

  staticRoutes.forEach((route) => {
    xml += `  <url>\n`;
    xml += `    <loc>${normalizedBaseUrl}${route.url}</loc>\n`;
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
    xml += `    <priority>${route.priority}</priority>\n`;
    xml += `  </url>\n`;
  });

  posts.forEach((post) => {
    xml += `  <url>\n`;
    xml += `    <loc>${normalizedBaseUrl}/blog/${post.slug}</loc>\n`;
    xml += `    <lastmod>${post.updatedAt.toISOString()}</lastmod>\n`;
    xml += `    <changefreq>monthly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  });

  xml += `</urlset>`;
  return xml;
}

const handleSitemap = async (_req: express.Request, res: express.Response) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'https://advokat-tuapse.ru';
    const xml = await generateSitemapXml(baseUrl);
    res.header('Content-Type', 'application/xml');
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