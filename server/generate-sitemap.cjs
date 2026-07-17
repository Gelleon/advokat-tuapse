'use strict';

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { PrismaClient } = require('@prisma/client');
const { generateSitemapXml } = require('./sitemap.cjs');

async function main() {
  const outputPath = path.resolve(process.argv[2] || path.join(__dirname, '../dist/sitemap.xml'));
  const baseUrl = process.env.FRONTEND_URL || 'https://advokat-tuapse.ru';
  const prisma = new PrismaClient();

  try {
    const xml = await generateSitemapXml(prisma, baseUrl);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, xml, 'utf8');
    console.log(`Sitemap written to ${outputPath}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to generate sitemap:', error);
  process.exit(1);
});
