#!/usr/bin/env node

import {
  createWindowsRotaryState,
  stepWindowsRotaryState,
} from './src/windows-rotary.js';
import { setMasterVolumePercent } from './src/windows-audio.js';

function parseArgs(argv) {
  const options = {
    min: 20,
    max: 90,
    intervalMs: 120,
    phaseAdvance: 0.15,
    baseVelocity: Math.PI * 1.5,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];

    if (token === '--min' && next !== undefined) {
      options.min = Number(next);
      i += 1;
    } else if (token === '--max' && next !== undefined) {
      options.max = Number(next);
      i += 1;
    } else if (token === '--interval' && next !== undefined) {
      options.intervalMs = Number(next);
      i += 1;
    } else if (token === '--phase-advance' && next !== undefined) {
      options.phaseAdvance = Number(next);
      i += 1;
    } else if (token === '--base-velocity' && next !== undefined) {
      options.baseVelocity = Number(next);
      i += 1;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const state = createWindowsRotaryState({
    minPercent: options.min,
    maxPercent: options.max,
    baseVelocity: Number.isFinite(options.baseVelocity) ? options.baseVelocity : Math.PI * 1.5,
    phaseAdvance: Number.isFinite(options.phaseAdvance) ? options.phaseAdvance : 0.15,
  });

  const intervalMs = Number.isFinite(options.intervalMs) && options.intervalMs >= 16
    ? options.intervalMs
    : 120;

  console.log('RotarySound Windows global volume controller started. Press Ctrl+C to stop.');

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    console.log('\nStopped.');
    process.exit(0);
  };

  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  const timer = setInterval(() => {
    const snapshot = stepWindowsRotaryState(state, intervalMs / 1000);
    setMasterVolumePercent(snapshot.volumePercent).catch((error) => {
      console.error('Failed to set global master volume:', error.message);
      stop();
    });
  }, intervalMs);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
