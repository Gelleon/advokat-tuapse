'use strict';

const { extractServicePages, MIN_DESCRIPTION_LENGTH } = require('../seo-utils.cjs');

const pages = extractServicePages();
const issues = [];

for (const page of pages) {
  if (page.description.length < MIN_DESCRIPTION_LENGTH) {
    issues.push(`${page.route}: meta too short (${page.description.length})`);
  }
  if (!/Туапсе|Краснодар/.test(page.description)) {
    issues.push(`${page.route}: meta missing geo`);
  }
  if (/048-61-12|\+7/.test(page.description)) {
    issues.push(`${page.route}: phone in meta description`);
  }
}

console.log(`Checked ${pages.length} service pages`);
if (issues.length) {
  issues.forEach((issue) => console.log('ISSUE', issue));
  process.exit(1);
}
console.log('All service SEO fields OK');
