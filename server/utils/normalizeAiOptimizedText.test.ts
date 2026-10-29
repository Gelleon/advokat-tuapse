import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAiOptimizedText } from './normalizeAiOptimizedText';

test('removes AI heading markers from optimized case outcome', () => {
  const rawText = '**Итог дела**\n\nСуд отказал в удовлетворении иска, сохранив право собственности доверителя.';

  assert.equal(
    normalizeAiOptimizedText(rawText),
    'Суд отказал в удовлетворении иска, сохранив право собственности доверителя.'
  );
});

test('removes inline heading prefix from optimized case outcome', () => {
  const rawText = '**Итог дела:** Суд отказал в удовлетворении иска, сохранив право собственности доверителя.';

  assert.equal(
    normalizeAiOptimizedText(rawText),
    'Суд отказал в удовлетворении иска, сохранив право собственности доверителя.'
  );
});

test('removes another common heading variant from optimized case text', () => {
  const rawText = '### Достигнутый результат\n\nСуд отказал в удовлетворении иска, сохранив право собственности доверителя.';

  assert.equal(
    normalizeAiOptimizedText(rawText),
    'Суд отказал в удовлетворении иска, сохранив право собственности доверителя.'
  );
});
