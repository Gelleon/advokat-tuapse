'use strict';

const fs = require('fs');
const path = require('path');
const { generateServicesYml } = require('./feeds/servicesYml.cjs');

const outPath = process.argv[2] || path.join(__dirname, '../dist/feed.yml');
const baseUrl = process.env.FRONTEND_URL || process.env.VITE_SITE_URL || 'https://advokat-tuapse.ru';

const xml = generateServicesYml(baseUrl);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, xml, 'utf8');
console.log(`Feed written to ${outPath} (${xml.length} bytes)`);
