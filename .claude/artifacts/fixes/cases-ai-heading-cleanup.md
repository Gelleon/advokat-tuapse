# Bug: AI headings leak into case text

> Status: FIXED
> Mode: (default)
> Severity: functional
> Author: codex
> Last updated: 2026-10-29

## Symptom
После оптимизации текста в админке раздела "Наши дела" и сохранения на публичной странице в поле результата отображается служебный заголовок вроде `**Итог дела**`.

## Expected
После AI-оптимизации и сохранения на сайте должен отображаться обычный чистый текст без markdown и без служебных заголовков.

## Reproduction
- Команда / шаги: запустить `npm test` в `server/` с регрессионным тестом на `normalizeAiOptimizedText`, затем временно вернуть санитайзер к `text.trim()`.
- Тест位置: `server/utils/normalizeAiOptimizedText.test.ts:5`
- Стабильность воспроизведения: 3/3 reliably fails при возврате проблемного поведения.

## Hypotheses & diagnosis
| # | Hypothesis | Verdict | Evidence |
|---|---|---|---|
| H1 | `/ai/optimize` сохраняет ответ RouterAI без постобработки, и markdown-заголовок уходит в БД как обычный текст | confirmed (root cause) | `server/routes/ai.ts` до фикса возвращал `optimizedText` как есть; регрессионный тест падал на `**Итог дела**` и `### Достигнутый результат` |
| H2 | Публичная страница сама добавляет текст `Итог дела` при рендере | eliminated | `src/components/Portfolio.tsx` выводит только `selectedCase.outcome`, а собственный UI-заголовок там другой: `Достигнутый результат` |

## Root cause
Endpoint `/ai/optimize` принимал ответ модели как готовый контент и не удалял markdown-обвязку и типовые AI-заголовки. Из-за этого текст вроде `**Итог дела**` попадал в поле `outcome`, а публичная страница честно показывала его как обычную строку.

## Fix
- Изменён файл: `server/routes/ai.ts`
- Изменён файл: `server/utils/normalizeAiOptimizedText.ts`
- Изменён файл: `server/utils/normalizeAiOptimizedText.test.ts`
- Изменён файл: `server/package.json`
- Что сделано:
  - добавлена нормализация AI-ответа перед возвратом из `/ai/optimize`;
  - удаляются markdown-маркеры, heading-синтаксис и типовые префиксы вроде `Итог дела` / `Достигнутый результат`;
  - в prompt добавлено явное требование вернуть только чистый текст;
  - добавлены регрессионные тесты на реальные проблемные варианты ответа.

## Verification
- V-1: `npm test` в `server/` -> GREEN
- V-2: временный возврат `normalizeAiOptimizedText` к `text.trim()` -> RED
- V-3: восстановление фикса и повторный `npm test` -> GREEN
- V-4: пакетный тестовый набор `server` сейчас состоит из `utils/**/*.test.ts`, он полностью GREEN

## Regression test
- Путь: `server/utils/normalizeAiOptimizedText.test.ts:5`
- Название: `removes AI heading markers from optimized case outcome`

## Pattern analysis
Форма проблемы: AI-ответ сохраняется без нормализации в пользовательское текстовое поле.

| Search | Hits | Same-class risk |
|---|---|---|
| `rg -n "optimizeText\\(|/ai/optimize|optimizedText|normalizeAiOptimizedText|Итог дела|Достигнутый результат" .` | 17 | Да, основной риск был только в цепочке `CasesAdmin -> /ai/optimize`; других потребителей `/ai/optimize` не найдено |

## Open questions / Follow-ups
- Если в базе уже есть старые дела с сохранённым `**Итог дела**`, их нужно один раз переоптимизировать или отредактировать в админке: фикс очищает новые ответы API, но не переписывает существующие записи автоматически.
