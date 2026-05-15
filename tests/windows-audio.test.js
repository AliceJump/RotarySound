import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSetMasterVolumeScript,
  clampPercent,
  isWindowsPlatform,
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

test('buildSetMasterVolumeScript injects scalar value', () => {
  const script = buildSetMasterVolumeScript(25);
  assert.match(script, /SetMasterVolumeScalar\(0\.2500\)/);
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
  assert.match(calls[0].args[calls[0].args.length - 1], /SetMasterVolumeScalar\(0\.4000\)/);
});
