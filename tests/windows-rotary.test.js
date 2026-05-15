import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createWindowsRandomState,
  createWindowsRotaryState,
  stepWindowsRandomState,
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

test('windows random state keeps pan bounded and transitions smoothly', () => {
  const randomValues = [1, 0, 0.25, 0.75, 0.5, 0.5];
  let index = 0;
  const randomFn = () => {
    const value = randomValues[index % randomValues.length];
    index += 1;
    return value;
  };
  const state = createWindowsRandomState({
    minPercent: 20,
    maxPercent: 60,
    minTransitionSeconds: 1,
    maxTransitionSeconds: 1,
    randomFn,
  });

  const first = stepWindowsRandomState(state, 0.25);
  const second = stepWindowsRandomState(state, 0.25);
  const third = stepWindowsRandomState(state, 0.25);
  const fourth = stepWindowsRandomState(state, 0.25);

  assert.ok(first.pan > 0 && first.pan < 1);
  assert.ok(second.pan > first.pan);
  assert.ok(third.pan > second.pan);
  assert.ok(Math.abs(fourth.pan - 1) < 1e-9);

  const fifth = stepWindowsRandomState(state, 0.5);
  const sixth = stepWindowsRandomState(state, 0.5);

  assert.ok(fifth.pan < fourth.pan);
  assert.ok(Math.abs(sixth.pan - (-1)) < 1e-9);
  assert.ok(sixth.pan >= -1 && sixth.pan <= 1);
  assert.ok(sixth.volumePercent >= 20 && sixth.volumePercent <= 60);
});
