'use strict';

/**
 * Получает OAuth-токен Яндекс.Вебмастер через device flow.
 * Usage: node server/scripts/yandex-oauth-setup.cjs [client_id] [client_secret]
 * Env: YANDEX_OAUTH_CLIENT_ID, YANDEX_OAUTH_CLIENT_SECRET
 */

const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CLIENT_ID = process.argv[2] || process.env.YANDEX_OAUTH_CLIENT_ID || '';
const CLIENT_SECRET = process.argv[3] || process.env.YANDEX_OAUTH_CLIENT_SECRET || '';
const ENV_PATH = path.join(__dirname, '../.env');
const OAUTH_HOST = 'oauth.yandex.ru';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Usage: node yandex-oauth-setup.cjs <client_id> <client_secret>');
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postForm(urlPath, body) {
  const response = await fetch(`https://${OAUTH_HOST}${urlPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { ok: response.ok, status: response.status, data };
}

function openBrowser(url) {
  try {
    if (process.platform === 'win32') {
      execSync(`start "" "${url}"`, { stdio: 'ignore', shell: true });
    } else if (process.platform === 'darwin') {
      execSync(`open "${url}"`, { stdio: 'ignore' });
    } else {
      execSync(`xdg-open "${url}"`, { stdio: 'ignore' });
    }
  } catch {
    console.log(`Откройте в браузере: ${url}`);
  }
}

function upsertEnvToken(token) {
  let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
  const line = `YANDEX_WEBMASTER_OAUTH_TOKEN=${token}`;
  if (/^YANDEX_WEBMASTER_OAUTH_TOKEN=/m.test(content)) {
    content = content.replace(/^YANDEX_WEBMASTER_OAUTH_TOKEN=.*$/m, line);
  } else {
    content = `${content.replace(/\s*$/, '')}\n${line}\n`;
  }
  fs.writeFileSync(ENV_PATH, content, 'utf8');
}

async function tryLocalhostFlow() {
  const redirectUri = 'http://127.0.0.1:8765/callback';
  const authUrl = `https://${OAUTH_HOST}/authorize?response_type=code&client_id=${encodeURIComponent(CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return new Promise((resolve) => {
    let settled = false;
    const server = http.createServer(async (req, res) => {
      if (!req.url?.startsWith('/callback')) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const url = new URL(req.url, redirectUri);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>Ошибка: ${error}</h1>`);
        if (!settled) {
          settled = true;
          server.close();
          resolve({ ok: false, reason: error });
        }
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>Код не получен</h1>');
        return;
      }

      const tokenRes = await postForm('/token', {
        grant_type: 'authorization_code',
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      });

      if (!tokenRes.ok || !tokenRes.data.access_token) {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>Не удалось получить токен</h1><pre>${JSON.stringify(tokenRes.data, null, 2)}</pre>`);
        if (!settled) {
          settled = true;
          server.close();
          resolve({ ok: false, reason: tokenRes.data });
        }
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>Готово!</h1><p>Можно закрыть вкладку.</p>');
      if (!settled) {
        settled = true;
        server.close();
        resolve({ ok: true, token: tokenRes.data.access_token });
      }
    });

    server.listen(8765, '127.0.0.1', () => {
      console.log('Открываю страницу авторизации Яндекса...');
      console.log(`Если браузер не открылся: ${authUrl}`);
      openBrowser(authUrl);
    });

    setTimeout(() => {
      if (!settled) {
        settled = true;
        server.close();
        resolve({ ok: false, reason: 'timeout' });
      }
    }, 5 * 60 * 1000);
  });
}

async function deviceFlow() {
  const deviceRes = await postForm('/device/code', { client_id: CLIENT_ID });
  if (!deviceRes.ok) {
    throw new Error(`device/code: ${JSON.stringify(deviceRes.data)}`);
  }

  const { device_code, user_code, verification_url, interval = 5, expires_in = 300 } = deviceRes.data;
  const pageUrl = verification_url || `https://${OAUTH_HOST}/device`;

  console.log('');
  console.log('=== Яндекс OAuth (device) ===');
  console.log(`1. Откройте: ${pageUrl}`);
  console.log(`2. Введите код: ${user_code}`);
  console.log(`3. Нажмите «Разрешить» (аккаунт с сайтом в Вебмастере)`);
  console.log('');
  openBrowser(pageUrl);

  const deadline = Date.now() + expires_in * 1000;
  while (Date.now() < deadline) {
    await sleep(interval * 1000);
    const tokenRes = await postForm('/token', {
      grant_type: 'device_code',
      code: device_code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    });

    if (tokenRes.ok && tokenRes.data.access_token) {
      return tokenRes.data.access_token;
    }

    const err = tokenRes.data?.error;
    if (err && err !== 'authorization_pending') {
      throw new Error(`token: ${JSON.stringify(tokenRes.data)}`);
    }
  }

  throw new Error('Время ожидания истекло. Запустите скрипт снова.');
}

async function main() {
  console.log('Пробую автоматический redirect flow (localhost)...');
  const local = await tryLocalhostFlow();
  let token = local.ok ? local.token : null;

  if (!token) {
    if (local.reason !== 'timeout' && local.reason !== 'access_denied') {
      console.log(`Redirect flow недоступен (${typeof local.reason === 'string' ? local.reason : 'redirect_uri не настроен'}).`);
    } else {
      console.log('Redirect flow: ожидание истекло или отменено.');
    }
    console.log('Переключаюсь на device flow...');
    token = await deviceFlow();
  }

  upsertEnvToken(token);
  console.log('');
  console.log(`Токен записан в ${ENV_PATH}`);
  console.log('Проверка: node server/scripts/yandex-webmaster-info.cjs');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
