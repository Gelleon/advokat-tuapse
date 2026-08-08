import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../public/fonts');

const FONTS = [
  {
    file: 'inter-cyrillic.woff2',
    // Inter latin+cyrillic wght 400-600 variable-ish single files from google fonts API
    // Using static subset URLs from fonts.gstatic for Inter 400/600 and Playfair 400/700
    url: null,
  },
];

// Fetch Google Fonts CSS for Cyrillic subsets and download woff2 files
const cssUrl =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Playfair+Display:wght@400;700&display=swap';

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0', ...headers } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(res.headers.location, headers).then(resolve).catch(reject);
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      })
      .on('error', reject);
  });
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const cssRes = await get(cssUrl, {
  // Request woff2
  Accept: 'text/css,*/*;q=0.1',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
});
const css = cssRes.body.toString('utf8');
fs.writeFileSync(path.join(OUT_DIR, 'fonts.css.source'), css);

const faceRe = /@font-face\s*\{[^}]+\}/g;
const faces = css.match(faceRe) || [];
const localFaces = [];
const seen = new Set();

for (const face of faces) {
  const family = /font-family:\s*'([^']+)'/.exec(face)?.[1];
  const weight = /font-weight:\s*(\d+)/.exec(face)?.[1];
  const style = /font-style:\s*(\w+)/.exec(face)?.[1] || 'normal';
  const unicode = /unicode-range:\s*([^;]+);/.exec(face)?.[1]?.trim();
  const url = /url\(([^)]+)\)/.exec(face)?.[1]?.replace(/['"]/g, '');
  if (!family || !weight || !url) continue;

  // Keep latin + cyrillic only
  const isCyr = unicode?.includes('U+0301') || unicode?.includes('U+0400');
  const isLatin = unicode?.includes('U+0000-00FF') || unicode?.startsWith('U+0000');
  if (!isCyr && !isLatin) continue;

  const slug = `${family.replace(/\s+/g, '').toLowerCase()}-${weight}-${style}-${isCyr ? 'cyrillic' : 'latin'}`;
  if (seen.has(slug)) continue;
  seen.add(slug);

  const file = `${slug}.woff2`;
  const outPath = path.join(OUT_DIR, file);
  if (!fs.existsSync(outPath)) {
    const bin = await get(url);
    fs.writeFileSync(outPath, bin.body);
    console.log('downloaded', file, bin.body.length);
  } else {
    console.log('exists', file);
  }

  localFaces.push(`@font-face {
  font-family: '${family}';
  font-style: ${style};
  font-weight: ${weight};
  font-display: swap;
  src: url('/fonts/${file}') format('woff2');
  unicode-range: ${unicode};
}`);
}

const outCss = localFaces.join('\n\n') + '\n';
fs.writeFileSync(path.join(OUT_DIR, 'fonts.css'), outCss);
console.log('wrote fonts.css with', localFaces.length, 'faces');
