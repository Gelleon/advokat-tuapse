export function normalizeRouterAiApiKey(raw: string | undefined | null): string {
  if (!raw) return '';

  let key = String(raw).trim();
  if (
    (key.startsWith('"') && key.endsWith('"'))
    || (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  return key.replace(/^Bearer\s+/i, '').trim();
}

export function getRouterAiApiKey(): string {
  return normalizeRouterAiApiKey(process.env.ROUTERAI_API_KEY);
}

export function requireRouterAiApiKey(): string {
  const apiKey = getRouterAiApiKey();
  if (!apiKey) {
    throw new Error(
      'ROUTERAI_API_KEY не настроен. Укажите ключ в server/.env на сервере.'
    );
  }
  return apiKey;
}

export function buildRouterAiHttpError(status: number, body: string): string {
  const snippet = body.slice(0, 300);

  if (status === 401) {
    return (
      'Неверный или отозванный API-ключ RouterAI (401). '
      + 'Создайте новый ключ на routerai.ru → Настройки → API-ключи '
      + 'и укажите его в server/.env (ROUTERAI_API_KEY), затем перезапустите сервер.'
    );
  }

  if (status === 402) {
    return 'Недостаточно средств на балансе RouterAI (402). Пополните счёт в личном кабинете RouterAI.';
  }

  return `Ошибка ИИ-сервиса: ${status} ${snippet}`;
}
