export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://advokat-tuapse.ru';
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
export const API_URL = BASE_URL ? `${BASE_URL}/api` : '/api';

export const SITE_NAME = 'Адвокаты Туапсе';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

export const GOOGLE_SITE_VERIFICATION = import.meta.env.VITE_GOOGLE_SITE_VERIFICATION || '';
export const YANDEX_VERIFICATION = import.meta.env.VITE_YANDEX_VERIFICATION || '';

/** Ссылка на профиль MAX */
export const MAX_PROFILE_URL =
  import.meta.env.VITE_MAX_PROFILE_URL ||
  'https://max.ru/u/f9LHodD0cOKD2DUhNjnjbGeZUe97nwtOdSE5RB7jO3bidOC2JW1NOVq3rwY';

export function absoluteUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
