export const CONSULTANT_HOTDOCS_RSS = 'https://www.consultant.ru/rss/hotdocs.xml';

export interface ConsultantHotDoc {
  id: string;
  title: string;
  description: string;
  url: string;
  pubDate: string;
  pubDateMs: number;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = block.match(re);
  return match ? decodeXmlEntities(match[1]) : '';
}

function extractHotDocId(link: string): string | null {
  const match = link.match(/\/law\/hotdocs\/(\d+)\.html/i);
  return match?.[1] || null;
}

function cleanConsultantUrl(link: string): string {
  try {
    const url = new URL(link);
    url.hash = '';
    url.search = '';
    return url.toString();
  } catch {
    return link.split('#')[0].split('?')[0];
  }
}

export function getConsultantPublicUrl(id: string): string {
  return `https://www.consultant.ru/law/hotdocs/${id}.html`;
}

export async function fetchConsultantHotDocs(): Promise<ConsultantHotDoc[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(CONSULTANT_HOTDOCS_RSS, {
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
        'User-Agent': 'AdvokatTuapseBlogAgent/1.0'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`consultant.ru RSS ${response.status}: ${body.slice(0, 200)}`);
    }

    const xml = await response.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    const docs: ConsultantHotDoc[] = [];

    for (const block of items) {
      const title = extractTag(block, 'title');
      const description = extractTag(block, 'description');
      const link = extractTag(block, 'link') || extractTag(block, 'guid');
      const pubDate = extractTag(block, 'pubDate');
      const id = extractHotDocId(link);
      if (!id || !title) continue;

      const pubDateMs = Date.parse(pubDate) || 0;
      docs.push({
        id,
        title,
        description,
        url: cleanConsultantUrl(link) || getConsultantPublicUrl(id),
        pubDate,
        pubDateMs
      });
    }

    docs.sort((a, b) => b.pubDateMs - a.pubDateMs);
    return docs;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function filterConsultantByPeriod(
  docs: ConsultantHotDoc[],
  periodType?: 'daily' | 'weekly' | 'monthly' | 'quarterly'
): ConsultantHotDoc[] {
  if (!periodType) return docs;

  const now = Date.now();
  const days =
    periodType === 'daily' ? 1
      : periodType === 'weekly' ? 7
        : periodType === 'monthly' ? 31
          : 92;

  const minMs = now - days * 24 * 60 * 60 * 1000;
  const filtered = docs.filter((doc) => !doc.pubDateMs || doc.pubDateMs >= minMs);
  return filtered.length > 0 ? filtered : docs;
}

export function consultantSearchText(doc: ConsultantHotDoc): string {
  return `${doc.title} ${doc.description}`.toLowerCase();
}
