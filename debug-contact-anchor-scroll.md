# Debug Session: contact-anchor-scroll
- **Status**: [OPEN]
- **Issue**: Переход по якорю `/#contact` иногда выглядит как недоскролл до начала секции контактов.
- **Debug Server**: http://127.0.0.1:7777/event
- **Log File**: .dbg/trae-debug-log-contact-anchor-scroll.ndjson

## Reproduction Steps
1. Запустить приложение в dev-режиме.
2. Открыть `http://127.0.0.1:5173/`.
3. Перейти на `http://127.0.0.1:5173/#contact`.
4. Дождаться завершения smooth scroll.
5. Считать логи из `.dbg/trae-debug-log-contact-anchor-scroll.ndjson`.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | Hash-навигация не срабатывает стабильно | Medium | Low | Confirmed trigger at line 2 |
| B | Расчёт смещения для `header` неверный | High | Low | Rejected by lines 3 and 5 |
| C | Скролл обрывается раньше целевой позиции | High | Low | Inconclusive at line 4, rejected by line 5 |
| D | После завершения анимации позиция секции соответствует офсету шапки | High | Low | Confirmed at line 5 |
| E | Видимый недоскролл вызывается не логикой перехода, а визуальным восприятием отступов секции | Medium | Medium | Still possible; needs visual confirmation |

## Log Evidence
- Line 2: hash-навигация в `#contact` была обнаружена.
- Line 3: рассчитана цель `targetTop = 2976.45` при `headerOffset = 96`.
- Line 4: через `450ms` анимация ещё не завершилась (`targetViewportTop = 710.85`).
- Line 5: после стабилизации `targetViewportTop = 95.65`, что практически совпадает с `headerOffset = 96`.

## Verification Conclusion
- Локально проблема в текущем коде **не воспроизводится как фактический недоскролл**.
- Реальный ранний замер был сделан до завершения smooth scroll, поэтому создавал ложное впечатление промаха.
- Текущий расчёт якоря ставит начало секции контактов сразу под фиксированным header.

## Fix Applied
- `id="contact"` перенесён с верхней границы `section` на заголовок `h2`, чтобы якорь приводил пользователя к началу видимого контента, а не к верхнему padding секции.

## Pre-fix vs Post-fix
| Run | Key Evidence | Interpretation |
|-----|--------------|----------------|
| pre-fix | `elementTop = 3072.45`, `targetViewportTop = 95.65` after settle | Под шапкой оказывалась верхняя граница секции, включая пустой `py-32` отступ |
| post-fix | `elementTop = 3200.45`, `targetViewportTop = 95.65` after settle | Под шапкой оказывается уже заголовок контактов; целевая точка сместилась на `128px` вверх по содержимому |

## Current Status
- Ожидается пользовательское подтверждение после post-fix проверки.
