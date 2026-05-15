import {
  computeAngularVelocity,
  computeGain,
  sampleCurve,
} from './engine.js';

export function createDefaultCurve(size, fn) {
  return new Array(size).fill(0).map((_, index) => fn(index, size));
}

export const DEFAULT_SPEED_POINTS = createDefaultCurve(
  16,
  (index, size) => 0.3 + 0.4 * Math.sin((index / (size - 1)) * Math.PI),
);

export const DEFAULT_AMPLITUDE_POINTS = createDefaultCurve(
  16,
  (index, size) => 0.5 + 0.4 * Math.sin((index / (size - 1)) * Math.PI * 2),
);

export function createWindowsRotaryState({
  minPercent = 20,
  maxPercent = 90,
  speedPoints = DEFAULT_SPEED_POINTS,
  amplitudePoints = DEFAULT_AMPLITUDE_POINTS,
  baseVelocity = Math.PI * 1.5,
  phaseAdvance = 0.15,
} = {}) {
  return {
    minPercent,
    maxPercent,
    speedPoints,
    amplitudePoints,
    baseVelocity,
    phaseAdvance,
    phase: 0,
    angle: 0,
  };
}

export function stepWindowsRotaryState(state, dtSeconds) {
  const speedSample = sampleCurve(state.speedPoints, state.phase);
  const amplitudeSample = sampleCurve(state.amplitudePoints, state.phase);
  const omega = computeAngularVelocity(state.baseVelocity, speedSample);

  state.phase = (state.phase + dtSeconds * state.phaseAdvance) % 1;
  state.angle += omega * dtSeconds;

  const swing = (Math.sin(state.angle) + 1) / 2;
  const amplitudeDrivenSample = swing * amplitudeSample;

  const gain = computeGain({
    minPercent: state.minPercent,
    maxPercent: state.maxPercent,
    amplitudeSample: amplitudeDrivenSample,
    baseVolume: 1,
  });

  return {
    gain,
    volumePercent: gain * 100,
    speedSample,
    amplitudeSample,
  };
}
