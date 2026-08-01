'use strict';

const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../src/data/services');
const files = ['criminal', 'family', 'land', 'bankruptcy', 'arbitration', 'inheritance'];

const areaByFile = {
  criminal: 'ugolovnye-dela',
  family: 'semeynye-spory',
  land: 'zemelnye-spory',
  bankruptcy: 'bankrotstvo',
  arbitration: 'arbitrazhnye-spory',
  inheritance: 'nasledstvennye-spory',
};

const items = [];

for (const file of files) {
  const area = areaByFile[file];
  const text = fs.readFileSync(path.join(dir, `${file}.ts`), 'utf8');
  const chunks = text.split(/\n  \},\n  \{/);

  for (const chunk of chunks) {
    const pathMatch = chunk.match(/path:\s*(?:`\$\{AREA\}\/([^`]+)`|`\$\{AREA\}`|AREA)/);
    if (!pathMatch) continue;

    let routePath;
    if (chunk.includes('path: AREA,')) {
      routePath = area;
    } else {
      routePath = `${area}/${pathMatch[1]}`;
    }

    const shortTitle = chunk.match(/shortTitle:\s*'([^']+)'/);
    const metaDescription = chunk.match(/metaDescription:\s*\n\s*'([^']+)'/);

    if (!shortTitle) continue;

    items.push({
      path: routePath,
      title: shortTitle[1],
      description: metaDescription ? metaDescription[1] : shortTitle[1],
    });
  }
}

const outPath = path.join(__dirname, '../server/feeds/serviceFeedData.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
console.log(`Wrote ${items.length} items to ${outPath}`);
