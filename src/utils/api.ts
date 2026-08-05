export class AuthError extends Error {
  constructor(message = 'Сессия истекла. Войдите снова.') {
    super(message);
    this.name = 'AuthError';
  }
}

/** Fetch с cookies; при 401 перенаправляет на /login */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    credentials: init?.credentials ?? 'include'
  });

  if (response.status === 401) {
    sessionStorage.removeItem('isAdminAuth');
    const body = await response.clone().json().catch(() => ({}));
    const message = typeof body?.message === 'string'
      ? body.message
      : typeof body?.error === 'string'
        ? body.error
        : 'Сессия истекла. Войдите снова.';

    if (window.location.pathname.startsWith('/admin')) {
      window.location.href = '/login?expired=1';
    }

    throw new AuthError(message);
  }

  return response;
}
