'use strict';

const fs = require('fs');
const path = require('path');
const { generateServicesYml } = require('./feeds/servicesYml.cjs');

const servicePages = require('./feeds/serviceFeedData.json');

const outPath = process.argv[2] || path.join(__dirname, '../dist/feed.yml');
const baseUrl = process.env.FRONTEND_URL || process.env.VITE_SITE_URL || 'https://advokat-tuapse.ru';
const sourceImage = path.join(__dirname, '../public/og-image.jpg');
const distRoot = path.dirname(outPath);
const feedImagesDir = path.join(distRoot, 'feed-images');

if (!fs.existsSync(sourceImage)) {
  console.error(`Missing source image: ${sourceImage}`);
  process.exit(1);
}

const xml = generateServicesYml(baseUrl);
fs.mkdirSync(distRoot, { recursive: true });
fs.writeFileSync(outPath, xml, 'utf8');

fs.mkdirSync(feedImagesDir, { recursive: true });
servicePages.forEach((_page, index) => {
  const offerId = `offer-${index + 1}`;
  fs.copyFileSync(sourceImage, path.join(feedImagesDir, `${offerId}.jpg`));
});

console.log(`Feed written to ${outPath} (${xml.length} bytes)`);
console.log(`Feed images: ${servicePages.length} files in ${feedImagesDir}`);
