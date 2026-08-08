'use strict';

const fs = require('fs');
const path = require('path');

const SERVICE_FILES = [
  { file: 'criminal', area: 'ugolovnye-dela' },
  { file: 'family', area: 'semeynye-spory' },
  { file: 'land', area: 'zemelnye-spory' },
  { file: 'bankruptcy', area: 'bankrotstvo' },
  { file: 'arbitration', area: 'arbitrazhnye-spory' },
  { file: 'inheritance', area: 'nasledstvennye-spory' },
];

const MIN_DESCRIPTION_LENGTH = 80;

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

      const metaDescription = chunk.match(/metaDescription:\s*\n?\s*'([^']+)'/);
      if (!metaDescription) continue;

      pages.push({
        route: routePath,
        description: metaDescription[1],
      });
    }
  }

  return pages;
}

module.exports = {
  extractServicePages,
  MIN_DESCRIPTION_LENGTH,
};
