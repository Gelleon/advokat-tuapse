'use strict';

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { getUserId, getHostId, getRecrawlQuota, queueRecrawl } = require('../yandexWebmaster.cjs');
const { generateSitemapXml } = require('../sitemap.cjs');
const { PrismaClient } = require('@prisma/client');

const BASE_URL = (process.env.FRONTEND_URL || 'https://advokat-tuapse.ru').replace(/\/+$/, '');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePublicUrl(input) {
  if (!input) return `${BASE_URL}/`;
  if (input.startsWith('http://') || input.startsWith('https://')) {
    const trimmed = input.replace(/\/+$/, '');
    return trimmed === BASE_URL ? `${BASE_URL}/` : trimmed;
  }
  const route = input.startsWith('/') ? input : `/${input}`;
  if (route === '/') return `${BASE_URL}/`;
  return `${BASE_URL}${route.replace(/\/+$/, '')}`;
}

function urlsFromSitemapXml(xml) {
  const matches = xml.matchAll(/<loc>([^<]+)<\/loc>/g);
  return Array.from(matches, (m) => normalizePublicUrl(m[1]));
}

async function collectUrls() {
  const sitemapPath = path.resolve(process.argv[2] || path.join(__dirname, '../../dist/sitemap.xml'));
  if (fs.existsSync(sitemapPath)) {
    return urlsFromSitemapXml(fs.readFileSync(sitemapPath, 'utf8'));
  }

  const prisma = new PrismaClient();
  try {
    const xml = await generateSitemapXml(prisma, BASE_URL);
    return urlsFromSitemapXml(xml);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const onlyPathArg = process.argv.find((arg) => arg.startsWith('--path='));
  const dryRun = process.argv.includes('--dry-run');

  const userId = await getUserId();
  const hostId = await getHostId(userId);
  const quota = await getRecrawlQuota(userId, hostId);

  let urls = onlyPathArg
    ? [normalizePublicUrl(decodeURIComponent(onlyPathArg.slice(7)))]
    : await collectUrls();

  urls = Array.from(new Set(urls));

  console.log(`User ID: ${userId}`);
  console.log(`Host ID: ${hostId}`);
  console.log(`Quota: ${quota.quota_remainder}/${quota.daily_quota}`);
  console.log(`URLs to recrawl: ${urls.length}`);

  if (dryRun) {
    urls.forEach((url) => console.log(`  ${url}`));
    return;
  }

  if (quota.quota_remainder <= 0) {
    throw new Error('Дневная квота переобхода исчерпана');
  }

  const limit = Math.min(urls.length, quota.quota_remainder);
  let ok = 0;
  let failed = 0;

  for (let i = 0; i < limit; i += 1) {
    const url = urls[i];
    try {
      const result = await queueRecrawl(userId, hostId, url);
      ok += 1;
      console.log(`OK  ${url} → task ${result.task_id || result.id || 'queued'}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${url}: ${error.message}`);
    }
    await sleep(350);
  }

  if (urls.length > limit) {
    console.warn(`Пропущено ${urls.length - limit} URL — не хватает квоты на сегодня`);
  }

  console.log(`Done: ${ok} queued, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
