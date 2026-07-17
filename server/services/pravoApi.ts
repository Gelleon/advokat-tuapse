const PRAVO_API_BASE = 'http://publication.pravo.gov.ru';

export type PravoPeriodType = 'daily' | 'weekly' | 'monthly';

export interface PravoDocument {
  id: string;
  eoNumber: string;
  name: string;
  title: string;
  complexName: string;
  number: string;
  documentDate: string;
  publishDateShort: string;
  viewDate: string;
  pagesCount: number;
  pdfFileLength: number | null;
  jdRegNumber: string | null;
  documentTypeId: string;
  signatoryAuthorityId: string;
  hasSvg: boolean;
}

export interface PravoDocumentDetails extends PravoDocument {
  documentType?: { id: string; name: string; weight: number };
  signatoryAuthorities?: Array<{ id: string; name: string; isMain: boolean; weight: number }>;
}

interface DocumentsResponse {
  items: PravoDocument[];
  itemsTotalCount: number;
  itemsPerPage: number;
  currentPage: number;
  pagesTotalCount: number;
}

const SEARCH_BLOCKS = ['president', 'government', 'court', 'federal_authorities'] as const;

async function fetchJson<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${PRAVO_API_BASE}${path}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AdvokatTuapseBlogAgent/1.0'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`pravo.gov.ru ${response.status}: ${body.slice(0, 200)}`);
    }

    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getDocumentPublicUrl(eoNumber: string): string {
  return `${PRAVO_API_BASE}/document/${eoNumber}`;
}

export function getDocumentPdfUrl(eoNumber: string): string {
  return `${PRAVO_API_BASE}/file/pdf?eoNumber=${eoNumber}`;
}

export async function searchDocuments(params: {
  periodType?: PravoPeriodType;
  block?: string;
  name?: string;
  pageSize?: 10 | 30 | 100 | 200;
  index?: number;
}): Promise<DocumentsResponse> {
  const query = new URLSearchParams();
  query.set('PageSize', String(params.pageSize || 100));
  query.set('Index', String(params.index || 1));
  query.set('SortedBy', '4'); // дата опубликования
  query.set('SortDestination', '1');

  if (params.periodType) query.set('PeriodType', params.periodType);
  if (params.block) query.set('Block', params.block);
  if (params.name) query.set('Name', params.name);

  return fetchJson<DocumentsResponse>(`/api/Documents?${query.toString()}`);
}

export async function getDocumentDetails(eoNumber: string): Promise<PravoDocumentDetails> {
  return fetchJson<PravoDocumentDetails>(`/api/Document?eoNumber=${encodeURIComponent(eoNumber)}`);
}

/** Собирает свежие документы по ключевым блокам публикации. */
export async function fetchRecentDocuments(
  periodType: PravoPeriodType = 'weekly',
  maxPagesPerBlock = 2
): Promise<PravoDocument[]> {
  const byEo = new Map<string, PravoDocument>();

  for (const block of SEARCH_BLOCKS) {
    for (let page = 1; page <= maxPagesPerBlock; page++) {
      try {
        const result = await searchDocuments({
          periodType,
          block,
          pageSize: 100,
          index: page
        });

        for (const item of result.items || []) {
          if (item?.eoNumber) byEo.set(item.eoNumber, item);
        }

        if (!result.pagesTotalCount || page >= result.pagesTotalCount) break;
      } catch (error) {
        console.error(`pravo search failed for block=${block} page=${page}:`, error);
      }
    }
  }

  return Array.from(byEo.values());
}

export function documentSearchText(doc: Pick<PravoDocument, 'name' | 'title' | 'complexName'>): string {
  return [doc.name, doc.title, doc.complexName]
    .filter(Boolean)
    .join(' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .toLowerCase();
}
