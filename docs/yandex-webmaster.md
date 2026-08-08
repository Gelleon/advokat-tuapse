# Яндекс.Вебмастер — переобход после деплоя

## 1. Получить OAuth-токен

### Права приложения (oauth.yandex.ru)

У **Яндекс.Вебmaster** всего **два** scope — включите оба (больше для API нет):

| Scope | Зачем |
|-------|--------|
| `webmaster:hostinfo` | Список сайтов, статистика, SQI, диагностика, поисковые запросы, **переобход URL** |
| `webmaster:verify` | Добавление сайтов, статус верификации и индексации |

`direct:api` (Яндекс.Директ) для нашего проекта **не нужен** — можно снять галочку.

После любого изменения прав нужно **заново получить токен** (старый не подхватит новые scope).

### Авторизация

1. Приложение: [oauth.yandex.ru](https://oauth.yandex.ru/) → **Веб-сервисы**, Redirect URI: `https://oauth.yandex.ru/verification_code`
2. Client ID / Secret — в `deploy.env`
3. Получить токен:

```powershell
.\scripts\yandex-auth.ps1
# Яндекс покажет 7-значный код на странице →
.\scripts\yandex-auth.ps1 -AuthCode 1234567
```

4. Токен в `server/.env` на сервере:

```env
YANDEX_WEBMASTER_OAUTH_TOKEN=your_oauth_token
```

`USER_ID` и `HOST_ID` скрипт определит сам, но можно задать вручную:

```env
YANDEX_WEBMASTER_USER_ID=
YANDEX_WEBMASTER_HOST_ID=
```

## 2. Проверка подключения

```bash
cd server
node scripts/yandex-webmaster-info.cjs
```

## 3. Переобход страниц

Все URL из sitemap:

```bash
npm run yandex:recrawl
```

Одна страница:

```bash
node server/scripts/yandex-recrawl.cjs --path=/blog
```

Пробный запуск без отправки:

```bash
node server/scripts/yandex-recrawl.cjs --dry-run
```

## 4. Nginx (обязательно после обновления)

На сервере обновите конфиг из `nginx.example.conf` — важно убрать 301 на trailing slash:

```nginx
rewrite ^(.+)/$ $1 last;
try_files $uri $uri/index.html /index.html;
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Без этого Яндекс видит редирект `/blog` → `/blog/`, а canonical без слэша — страницы помечаются как «дубли» главной.
