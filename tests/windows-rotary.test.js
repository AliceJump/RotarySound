import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createWindowsRotaryState,
  stepWindowsRotaryState,
} from '../src/windows-rotary.js';

test('windows rotary state produces bounded volume percentage', () => {
  const state = createWindowsRotaryState({ minPercent: 10, maxPercent: 80 });

  for (let i = 0; i < 100; i += 1) {
    const snapshot = stepWindowsRotaryState(state, 0.1);
    assert.ok(snapshot.volumePercent >= 10);
    assert.ok(snapshot.volumePercent <= 80);
    assert.ok(snapshot.pan >= -1);
    assert.ok(snapshot.pan <= 1);
  }
});
