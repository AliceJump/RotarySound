import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeAngularVelocity,
  computeGain,
  computePan,
  normalizeBounds,
  sampleCurve,
} from '../src/engine.js';

test('normalizeBounds swaps when min > max and clamps values', () => {
  assert.deepEqual(normalizeBounds(120, -5), { min: 0, max: 100 });
  assert.deepEqual(normalizeBounds(80, 20), { min: 20, max: 80 });
});

test('computeGain respects min and max percent', () => {
  assert.equal(computeGain({ minPercent: 20, maxPercent: 80, amplitudeSample: 0 }), 0.2);
  assert.equal(computeGain({ minPercent: 20, maxPercent: 80, amplitudeSample: 1 }), 0.8);
});

test('sampleCurve interpolates curve points', () => {
  const points = [0, 1];
  assert.equal(sampleCurve(points, 0), 0);
  assert.equal(sampleCurve(points, 0.5), 0.5);
});

test('rotation helpers keep bounded values', () => {
  assert.ok(computePan(Math.PI / 2, 1) <= 1);
  assert.ok(computePan(-Math.PI / 2, 1) >= -1);
  assert.ok(Math.abs(computeAngularVelocity(3, 0) - 0.6) < 1e-9);
  assert.equal(computeAngularVelocity(3, 1), 6);
});
