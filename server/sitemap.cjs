'use strict';

const SERVICE_AREA_ROUTES = [
  '/ugolovnye-dela',
  '/semeynye-spory',
  '/zemelnye-spory',
  '/bankrotstvo',
  '/arbitrazhnye-spory',
  '/nasledstvennye-spory',
];

const SERVICE_TOPIC_ROUTES = [
  '/ugolovnye-dela/predvaritelnoe-sledstvie',
  '/ugolovnye-dela/sudebnoe-razbiratelstvo',
  '/ugolovnye-dela/obzhalovanie-deystviy',
  '/ugolovnye-dela/zashchita-poterpevshih',
  '/semeynye-spory/razdel-imushchestva',
  '/semeynye-spory/alimenty',
  '/semeynye-spory/zashchita-supruga-pri-bankrotstve',
  '/semeynye-spory/brachnye-dogovory',
  '/zemelnye-spory/ustanovlenie-granic',
  '/zemelnye-spory/sobstvennost-i-arenda',
  '/zemelnye-spory/kadastrovaya-oshibka',
  '/zemelnye-spory/samovolnye-stroeniya',
  '/bankrotstvo/fizicheskih-lic',
  '/bankrotstvo/yuridicheskih-lic',
  '/bankrotstvo/zashchita-imushchestva',
  '/bankrotstvo/spisanie-dolgov',
  '/arbitrazhnye-spory/ekonomicheskie-spory',
  '/arbitrazhnye-spory/korporativnye-spory',
  '/arbitrazhnye-spory/nalogovye-spory',
  '/arbitrazhnye-spory/ispolnitelnoe-proizvodstvo',
  '/nasledstvennye-spory/vosstanovlenie-sroka',
  '/nasledstvennye-spory/ustanovlenie-rodstva',
  '/nasledstvennye-spory/nasledstvennaya-massa',
  '/nasledstvennye-spory/pravo-sobstvennosti',
];

const STATIC_ROUTES = [
  { url: '/', priority: '1.0', changefreq: 'weekly' },
  { url: '/blog', priority: '0.9', changefreq: 'daily' },
  ...SERVICE_AREA_ROUTES.map((url) => ({ url, priority: '0.8', changefreq: 'monthly' })),
  ...SERVICE_TOPIC_ROUTES.map((url) => ({ url, priority: '0.7', changefreq: 'monthly' })),
  { url: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { url: '/terms', priority: '0.3', changefreq: 'yearly' },
];

async function generateSitemapXml(prisma, baseUrl) {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true, updatedAt: true },
  });

  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  STATIC_ROUTES.forEach((route) => {
    xml += '  <url>\n';
    xml += `    <loc>${normalizedBaseUrl}${route.url}</loc>\n`;
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
    xml += `    <priority>${route.priority}</priority>\n`;
    xml += '  </url>\n';
  });

  posts.forEach((post) => {
    xml += '  <url>\n';
    xml += `    <loc>${normalizedBaseUrl}/blog/${post.slug}</loc>\n`;
    xml += `    <lastmod>${post.updatedAt.toISOString()}</lastmod>\n`;
    xml += `    <changefreq>monthly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += '  </url>\n';
  });

  xml += '</urlset>';
  return xml;
}

module.exports = { generateSitemapXml, STATIC_ROUTES };
