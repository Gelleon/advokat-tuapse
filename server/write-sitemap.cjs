'use strict';

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { generateSitemapXml } = require('./sitemap.cjs');

async function writeSitemapFile() {
  const baseUrl = process.env.FRONTEND_URL || 'https://advokat-tuapse.ru';
  const outputPath = path.resolve(__dirname, '../dist/sitemap.xml');
  const prisma = new PrismaClient();

  try {
    const xml = await generateSitemapXml(prisma, baseUrl);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, xml, 'utf8');
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { writeSitemapFile };
