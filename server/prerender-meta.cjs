'use strict';

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { PrismaClient } = require('@prisma/client');

const SITE_URL = (process.env.FRONTEND_URL || 'https://advokat-tuapse.ru').replace(/\/+$/, '');

const SERVICE_FILES = [
  { file: 'criminal', area: 'ugolovnye-dela' },
  { file: 'family', area: 'semeynye-spory' },
  { file: 'land', area: 'zemelnye-spory' },
  { file: 'bankruptcy', area: 'bankrotstvo' },
  { file: 'arbitration', area: 'arbitrazhnye-spory' },
  { file: 'inheritance', area: 'nasledstvennye-spory' },
];

const STATIC_PAGES = [
  {
    route: '/',
    title: 'Адвокаты Туапсе | Профессиональные юридические услуги',
    description:
      'Квалифицированная юридическая помощь в Туапсе. Арбитражные споры, защита бизнеса, семейное и наследственное право. Более 15 лет успешной практики.',
    root: true,
  },
  {
    route: '/blog',
    title: 'Блог адвокатов | Экспертные статьи и новости юриспруденции',
    description:
      'Читайте полезные статьи, обзоры судебной практики и юридические советы от ведущих адвокатов Туапсе.',
  },
  {
    route: '/privacy',
    title: 'Политика конфиденциальности | Адвокаты Туапсе',
    description: 'Политика конфиденциальности и обработки персональных данных на сайте advokat-tuapse.ru',
  },
  {
    route: '/terms',
    title: 'Условия использования | Адвокаты Туапсе',
    description: 'Пользовательское соглашение и условия использования сайта advokat-tuapse.ru',
  },
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function absoluteUrl(route) {
  const normalized = !route || route === '/' ? '/' : `/${route.replace(/^\/+|\/+$/g, '')}`;
  if (normalized === '/') return `${SITE_URL}/`;
  return `${SITE_URL}${normalized}`;
}

function extractServicePages() {
  const servicesDir = path.join(__dirname, '../src/data/services');
  const pages = [];

  for (const { file, area } of SERVICE_FILES) {
    const text = fs.readFileSync(path.join(servicesDir, `${file}.ts`), 'utf8');
    const chunks = text.split(/\n  \},\n  \{/);

    for (const chunk of chunks) {
      let routePath;
      if (/path:\s*AREA,/.test(chunk)) {
        routePath = `/${area}`;
      } else {
        const topicMatch = chunk.match(/path:\s*`\$\{AREA\}\/([^`]+)`/);
        if (!topicMatch) continue;
        routePath = `/${area}/${topicMatch[1]}`;
      }

      const metaTitle = chunk.match(/metaTitle:\s*'([^']+)'/);
      const metaDescription = chunk.match(/metaDescription:\s*\n?\s*'([^']+)'/);
      if (!metaTitle) continue;

      pages.push({
        route: routePath,
        title: metaTitle[1],
        description: metaDescription ? metaDescription[1] : metaTitle[1],
      });
    }
  }

  return pages;
}

function injectPageMeta(html, page) {
  const canonical = absoluteUrl(page.route);
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const robots = page.noindex
    ? 'noindex, nofollow'
    : 'index, follow, max-snippet:-1, max-image-preview:large';

  let result = html;

  result = result.replace(/<title[^>]*>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  result = result.replace(
    /<meta[^>]*name="description"[^>]*>/,
    `<meta name="description" content="${description}" />`
  );
  result = result.replace(
    /<meta[^>]*name="robots"[^>]*>/,
    `<meta name="robots" content="${robots}" />`
  );

  result = result.replace(/\s*<link rel="canonical"[^>]*>/g, '');
  result = result.replace(/\s*<meta property="og:title"[^>]*>/g, '');
  result = result.replace(/\s*<meta property="og:description"[^>]*>/g, '');
  result = result.replace(/\s*<meta property="og:url"[^>]*>/g, '');
  result = result.replace(/\s*<meta property="og:type"[^>]*>/g, '');

  const seoBlock = [
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:type" content="${page.type || 'website'}" />`,
  ].join('\n    ');

  result = result.replace(
    /<meta name="robots" content="[^"]*" \/>/,
    `$&\n    ${seoBlock}`
  );

  return result;
}

function writeRouteHtml(distDir, templateHtml, page) {
  const html = injectPageMeta(templateHtml, page);
  if (page.root) {
    fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf8');
    return;
  }

  const segments = page.route.replace(/^\/+|\/+$/g, '');
  const outDir = path.join(distDir, segments);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
}

async function main() {
  const distDir = path.resolve(process.argv[2] || path.join(__dirname, '../dist'));
  const templatePath = path.join(distDir, 'index.html');

  if (!fs.existsSync(templatePath)) {
    console.error('dist/index.html not found. Run vite build first.');
    process.exit(1);
  }

  const templateHtml = fs.readFileSync(templatePath, 'utf8');
  const servicePages = extractServicePages();
  const pages = [...STATIC_PAGES, ...servicePages];

  const prisma = new PrismaClient();
  try {
    const posts = await prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        slug: true,
        title: true,
        previewText: true,
        metaTitle: true,
        metaDescription: true,
      },
    });

    for (const post of posts) {
      pages.push({
        route: `/blog/${post.slug}`,
        title: post.metaTitle || `${post.title} | Адвокаты Туапсе`,
        description: post.metaDescription || post.previewText,
        type: 'article',
      });
    }
  } finally {
    await prisma.$disconnect();
  }

  for (const page of pages) {
    writeRouteHtml(distDir, templateHtml, page);
  }

  console.log(`Prerendered SEO meta for ${pages.length} routes in ${distDir}`);
}

main().catch((error) => {
  console.error('Failed to prerender SEO meta:', error);
  process.exit(1);
});
