# Яндекс.Вебмастер — переобход после деплоя

## 1. Получить OAuth-токен

1. Зарегистируйте приложение: [oauth.yandex.ru](https://oauth.yandex.ru/)
2. Права: **Яндекс.Вебмастер** (`webmaster:verify` или полный доступ к API Вебмастера)
3. Получите токен по ссылке (подставьте `CLIENT_ID`):

```
https://oauth.yandex.ru/authorize?response_type=token&client_id=CLIENT_ID
```

4. Добавьте в `server/.env` на сервере:

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
