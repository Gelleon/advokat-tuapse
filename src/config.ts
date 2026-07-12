export const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
export const API_URL = BASE_URL ? `${BASE_URL}/api` : '/api';