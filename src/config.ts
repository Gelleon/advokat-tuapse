export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://advokat-tuapse.ru';
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
export const API_URL = BASE_URL ? `${BASE_URL}/api` : '/api';

export const SITE_NAME = 'Адвокаты Туапсе';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

export const GOOGLE_SITE_VERIFICATION = import.meta.env.VITE_GOOGLE_SITE_VERIFICATION || '';
export const YANDEX_VERIFICATION = import.meta.env.VITE_YANDEX_VERIFICATION || '';

export function absoluteUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
