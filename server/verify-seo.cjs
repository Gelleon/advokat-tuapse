'use strict';

const fs = require('fs');
const path = require('path');

const SITE_URL = (process.env.FRONTEND_URL || 'https://advokat-tuapse.ru').replace(/\/+$/, '');

const FORBIDDEN_TITLE_SNIPPETS = [
  'Юридические услуги',
  'Профессиональные юридические услуги',
];

const HOMEPAGE_DESCRIPTION_SNIPPET =
  'Арбитражные споры, защита бизнеса, семейное и наследственное право';

const SAMPLE_ROUTES = [
  {
    route: '/',
    titleIncludes: 'Адвокаты Туапсе',
    canonical: `${SITE_URL}/`,
  },
  {
    route: '/zemelnye-spory/sobstvennost-i-arenda',
    titleIncludes: 'собственности и аренде',
    descriptionIncludes: 'аренды на землю',
    canonical: `${SITE_URL}/zemelnye-spory/sobstvennost-i-arenda`,
  },
  {
    route: '/semeynye-spory/alimenty',
    titleIncludes: 'Алименты',
    canonical: `${SITE_URL}/semeynye-spory/alimenty`,
  },
  {
    route: '/nasledstvennye-spory/ustanovlenie-rodstva',
    titleIncludes: 'родства',
    canonical: `${SITE_URL}/nasledstvennye-spory/ustanovlenie-rodstva`,
  },
  {
    route: '/blog',
    titleIncludes: 'Блог',
    canonical: `${SITE_URL}/blog`,
  },
];

function readRouteHtml(distDir, route) {
  if (route === '/') {
    return fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
  }
  const filePath = path.join(distDir, route.replace(/^\//, ''), 'index.html');
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing prerender file: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function extractTag(html, pattern) {
  const match = html.match(pattern);
  return match ? match[1] : '';
}

function verifyRoute(distDir, sample) {
  const html = readRouteHtml(distDir, sample.route);
  const title = extractTag(html, /<title[^>]*>([^<]+)<\/title>/);
  const description = extractTag(html, /<meta[^>]*name="description"[^>]*content="([^"]+)"/);
  const canonical = extractTag(html, /<link rel="canonical" href="([^"]+)"/);
  const h1 = extractTag(html, /<main id="static-seo">\s*<h1>([^<]+)<\/h1>/);

  const errors = [];

  if (!title) errors.push('missing <title>');
  if (!description) errors.push('missing meta description');
  if (!canonical) errors.push('missing rel=canonical');
  if (canonical !== sample.canonical) {
    errors.push(`canonical mismatch: ${canonical} != ${sample.canonical}`);
  }
  if (!title.includes(sample.titleIncludes)) {
    errors.push(`title "${title}" does not include "${sample.titleIncludes}"`);
  }
  if (sample.descriptionIncludes && !description.includes(sample.descriptionIncludes)) {
    errors.push(`description does not include "${sample.descriptionIncludes}"`);
  }
  if (!h1) errors.push('missing static <h1> for crawlers');

  if (sample.route !== '/') {
    for (const snippet of FORBIDDEN_TITLE_SNIPPETS) {
      if (title.includes(snippet)) {
        errors.push(`homepage title leaked: ${title}`);
      }
    }
    if (description.includes(HOMEPAGE_DESCRIPTION_SNIPPET)) {
      errors.push(`homepage description leaked: ${description.slice(0, 80)}...`);
    }
    if (canonical === `${SITE_URL}/` || canonical === SITE_URL) {
      errors.push(`homepage canonical leaked on ${sample.route}`);
    }
  }

  const canonicalCount = (html.match(/rel="canonical"/g) || []).length;
  if (canonicalCount !== 1) {
    errors.push(`expected 1 canonical tag, found ${canonicalCount}`);
  }

  return errors;
}

function main() {
  const distDir = path.resolve(process.argv[2] || path.join(__dirname, '../dist'));
  let failed = false;

  for (const sample of SAMPLE_ROUTES) {
    const errors = verifyRoute(distDir, sample);
    if (errors.length) {
      failed = true;
      console.error(`FAIL ${sample.route}:`);
      errors.forEach((error) => console.error(`  - ${error}`));
    } else {
      console.log(`OK   ${sample.route}`);
    }
  }

  if (failed) {
    process.exit(1);
  }

  console.log('SEO prerender verification passed.');
}

main();
