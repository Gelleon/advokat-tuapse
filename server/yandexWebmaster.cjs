'use strict';

const API_BASE = 'https://api.webmaster.yandex.net/v4';

function getToken() {
  const token = (process.env.YANDEX_WEBMASTER_OAUTH_TOKEN || '').trim();
  if (!token) {
    throw new Error('YANDEX_WEBMASTER_OAUTH_TOKEN не задан в server/.env');
  }
  return token;
}

function getConfiguredUserId() {
  const raw = (process.env.YANDEX_WEBMASTER_USER_ID || '').trim();
  return raw ? Number(raw) : null;
}

function getConfiguredHostId() {
  return (process.env.YANDEX_WEBMASTER_HOST_ID || '').trim() || null;
}

async function apiRequest(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `OAuth ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const message = data?.error_message || data?.message || text || response.statusText;
    throw new Error(`Yandex Webmaster API ${response.status}: ${message}`);
  }

  return data;
}

async function getUserId() {
  const configured = getConfiguredUserId();
  if (configured) return configured;

  const data = await apiRequest('/user');
  const userId = data?.user_id;
  if (!userId) {
    throw new Error('Не удалось получить user_id из GET /v4/user');
  }
  return userId;
}

async function getHostId(userId) {
  const configured = getConfiguredHostId();
  if (configured) return configured;

  const siteUrl = (process.env.FRONTEND_URL || 'https://advokat-tuapse.ru').replace(/\/+$/, '');
  const data = await apiRequest(`/user/${userId}/hosts`);
  const hosts = data?.hosts || [];

  const match = hosts.find((host) => {
    const ascii = String(host.ascii_host_url || '').replace(/\/+$/, '');
    const unicode = String(host.unicode_host_url || '').replace(/\/+$/, '');
    return ascii === siteUrl || unicode === siteUrl || ascii === `${siteUrl}/` || unicode === `${siteUrl}/`;
  });

  if (!match?.host_id) {
    const available = hosts.map((h) => h.ascii_host_url || h.unicode_host_url).join(', ');
    throw new Error(`Сайт ${siteUrl} не найден в Вебмастере. Доступные: ${available || 'нет'}`);
  }

  return match.host_id;
}

async function getRecrawlQuota(userId, hostId) {
  return apiRequest(`/user/${userId}/hosts/${hostId}/recrawl/quota`);
}

async function queueRecrawl(userId, hostId, url) {
  return apiRequest(`/user/${userId}/hosts/${hostId}/recrawl/queue/`, {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

module.exports = {
  getUserId,
  getHostId,
  getRecrawlQuota,
  queueRecrawl,
};
