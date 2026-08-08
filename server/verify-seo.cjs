'use strict';

const fs = require('fs');
const path = require('path');
const { extractServicePages, MIN_DESCRIPTION_LENGTH } = require('./seo-utils.cjs');

const SITE_URL = (process.env.FRONTEND_URL || 'https://advokat-tuapse.ru').replace(/\/+$/, '');

const FORBIDDEN_TITLE_SNIPPETS = [
  'Юридические услуги',
  'Профессиональные юридические услуги',
];

const HOMEPAGE_DESCRIPTION_SNIPPET =
  'Арбитражные споры, защита бизнеса, семейное и наследственное право';

const PHONE_SNIPPET = '048-61-12';

const STATIC_SAMPLES = [
  {
    route: '/',
    titleIncludes: 'Адвокаты Туапсе',
    canonical: `${SITE_URL}/`,
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

function verifyServiceRoute(distDir, page) {
  const html = readRouteHtml(distDir, page.route);
  const title = extractTag(html, /<title[^>]*>([^<]+)<\/title>/);
  const description = extractTag(html, /<meta[^>]*name="description"[^>]*content="([^"]+)"/);
  const canonical = extractTag(html, /<link rel="canonical" href="([^"]+)"/);
  const staticText = extractTag(html, /<main id="static-seo">[\s\S]*?<p>([^<]+)<\/p>/);
  const expectedCanonical = page.route === '/'
    ? `${SITE_URL}/`
    : `${SITE_URL}${page.route}`;

  const errors = [];

  if (!title) errors.push('missing <title>');
  if (!description) errors.push('missing meta description');
  if (!canonical) errors.push('missing rel=canonical');
  if (canonical !== expectedCanonical) {
    errors.push(`canonical mismatch: ${canonical} != ${expectedCanonical}`);
  }
  if (description !== page.description) {
    errors.push('meta description differs from service source');
  }
  if (description.length < MIN_DESCRIPTION_LENGTH) {
    errors.push(`description too short (${description.length})`);
  }
  if (staticText !== page.description) {
    errors.push('static-seo paragraph differs from meta description');
  }
  if (description.includes(HOMEPAGE_DESCRIPTION_SNIPPET)) {
    errors.push('homepage description leaked');
  }
  if (description.includes(PHONE_SNIPPET) || staticText.includes(PHONE_SNIPPET)) {
    errors.push('phone number leaked into description/static text');
  }
  for (const snippet of FORBIDDEN_TITLE_SNIPPETS) {
    if (title.includes(snippet)) {
      errors.push(`homepage title leaked: ${title}`);
    }
  }
  if (!html.includes('"@type":"WebPage"')) {
    errors.push('missing WebPage JSON-LD');
  }

  return errors;
}

function verifyStaticRoute(distDir, sample) {
  const html = readRouteHtml(distDir, sample.route);
  const title = extractTag(html, /<title[^>]*>([^<]+)<\/title>/);
  const description = extractTag(html, /<meta[^>]*name="description"[^>]*content="([^"]+)"/);
  const canonical = extractTag(html, /<link rel="canonical" href="([^"]+)"/);
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

  return errors;
}

function main() {
  const distDir = path.resolve(process.argv[2] || path.join(__dirname, '../dist'));
  const servicePages = extractServicePages();
  let failed = false;

  for (const page of servicePages) {
    const errors = verifyServiceRoute(distDir, page);
    if (errors.length) {
      failed = true;
      console.error(`FAIL ${page.route}:`);
      errors.forEach((error) => console.error(`  - ${error}`));
    } else {
      console.log(`OK   ${page.route}`);
    }
  }

  for (const sample of STATIC_SAMPLES) {
    const errors = verifyStaticRoute(distDir, sample);
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

  console.log(`SEO prerender verification passed for ${servicePages.length + STATIC_SAMPLES.length} routes.`);
}

main();
