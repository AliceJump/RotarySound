import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSetEndpointStateScript,
  buildSetMasterVolumeScript,
  clampPan,
  clampPercent,
  computeStereoChannelScalars,
  isWindowsPlatform,
  setEndpointState,
  setMasterVolumePercent,
} from '../src/windows-audio.js';

test('clampPercent clamps invalid values', () => {
  assert.equal(clampPercent(-10), 0);
  assert.equal(clampPercent(30.5), 30.5);
  assert.equal(clampPercent(200), 100);
  assert.equal(clampPercent('x'), 0);
});

test('isWindowsPlatform only accepts win32', () => {
  assert.equal(isWindowsPlatform('win32'), true);
  assert.equal(isWindowsPlatform('linux'), false);
});

test('clampPan clamps invalid pan values', () => {
  assert.equal(clampPan(-2), -1);
  assert.equal(clampPan(0.25), 0.25);
  assert.equal(clampPan(2), 1);
  assert.equal(clampPan('x'), 0);
});

test('computeStereoChannelScalars maps pan to left/right scalars', () => {
  assert.deepEqual(computeStereoChannelScalars(-1), { left: 1, right: 0 });
  assert.deepEqual(computeStereoChannelScalars(1), { left: 0, right: 1 });
  assert.deepEqual(computeStereoChannelScalars(0), { left: 0.7071, right: 0.7071 });
});

test('buildSetMasterVolumeScript injects scalar value', () => {
  const script = buildSetMasterVolumeScript(25);
  assert.match(script, /SetEndpointState\(0\.2500,\s0\.7071,\s0\.7071\)/);
});

test('buildSetEndpointStateScript injects volume and pan scalars', () => {
  const script = buildSetEndpointStateScript({ volumePercent: 80, pan: -1 });
  assert.match(script, /SetEndpointState\(0\.8000,\s1\.0000,\s0\.0000\)/);
  assert.match(script, /SetChannelVolumeLevelScalar/);
});

test('setMasterVolumePercent fails on non-windows platforms', async () => {
  await assert.rejects(
    () => setMasterVolumePercent(40, { platform: 'linux' }),
    /only supported on Windows/i,
  );
});

test('setMasterVolumePercent invokes powershell command on windows', async () => {
  const calls = [];
  const execFileFn = (command, args, callback) => {
    calls.push({ command, args });
    callback(null);
  };

  await setMasterVolumePercent(40, { platform: 'win32', execFileFn });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, 'powershell.exe');
  assert.ok(calls[0].args.includes('-Command'));
  assert.match(calls[0].args[calls[0].args.length - 1], /SetEndpointState\(0\.4000,\s0\.7071,\s0\.7071\)/);
});

test('setEndpointState invokes powershell with pan and volume', async () => {
  const calls = [];
  const execFileFn = (command, args, callback) => {
    calls.push({ command, args });
    callback(null);
  };

  await setEndpointState({ volumePercent: 60, pan: 1 }, { platform: 'win32', execFileFn });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, 'powershell.exe');
  assert.match(calls[0].args[calls[0].args.length - 1], /SetEndpointState\(0\.6000,\s0\.0000,\s1\.0000\)/);
});
