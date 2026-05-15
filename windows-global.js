#!/usr/bin/env node

import {
  createWindowsRotaryState,
  stepWindowsRotaryState,
} from './src/windows-rotary.js';
import { setEndpointState } from './src/windows-audio.js';

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

  console.log('RotarySound Windows global volume+pan controller started. Press Ctrl+C to stop.');

  let stopped = false;
  let lastVolumePercent = options.max;
  let inFlight = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    setEndpointState({ volumePercent: lastVolumePercent, pan: 0 })
      .catch(() => {})
      .finally(() => {
        console.log('\nStopped.');
        process.exit(0);
      });
  };

  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  const timer = setInterval(() => {
    if (inFlight) return;
    inFlight = true;
    const snapshot = stepWindowsRotaryState(state, intervalMs / 1000);
    lastVolumePercent = snapshot.volumePercent;
    setEndpointState({ volumePercent: snapshot.volumePercent, pan: snapshot.pan })
      .catch((error) => {
        console.error('Failed to set global endpoint state:', error.message);
        stop();
      })
      .finally(() => {
        inFlight = false;
      });
  }, intervalMs);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
