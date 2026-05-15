import {
  computeAngularVelocity,
  computeGain,
  computePan,
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

export function createWindowsRandomState({
  minPercent = 20,
  maxPercent = 90,
  speedPoints = DEFAULT_SPEED_POINTS,
  amplitudePoints = DEFAULT_AMPLITUDE_POINTS,
  baseVelocity = Math.PI * 1.5,
  phaseAdvance = 0.15,
  minTransitionSeconds = 0.8,
  maxTransitionSeconds = 2.4,
  randomFn = Math.random,
} = {}) {
  const safeMinTransition = Number.isFinite(minTransitionSeconds) && minTransitionSeconds > 0
    ? minTransitionSeconds
    : 0.8;
  const safeMaxTransitionRaw = Number.isFinite(maxTransitionSeconds) && maxTransitionSeconds > 0
    ? maxTransitionSeconds
    : 2.4;
  const safeMaxTransition = Math.max(safeMinTransition, safeMaxTransitionRaw);
  return {
    minPercent,
    maxPercent,
    speedPoints,
    amplitudePoints,
    baseVelocity,
    phaseAdvance,
    phase: 0,
    angle: 0,
    pan: 0,
    panStart: 0,
    panTarget: 0,
    panProgress: 1,
    transitionSeconds: safeMinTransition,
    minTransitionSeconds: safeMinTransition,
    maxTransitionSeconds: safeMaxTransition,
    randomFn,
  };
}

function pickRandomPanTarget(state) {
  const randomValue = Number(state.randomFn());
  const normalized = Number.isFinite(randomValue) ? randomValue : 0.5;
  return Math.max(-1, Math.min(1, normalized * 2 - 1));
}

function pickRandomTransitionSeconds(state) {
  const span = state.maxTransitionSeconds - state.minTransitionSeconds;
  if (span <= 0) {
    return state.minTransitionSeconds;
  }
  const randomValue = Number(state.randomFn());
  const normalized = Number.isFinite(randomValue) ? Math.max(0, Math.min(1, randomValue)) : 0.5;
  return state.minTransitionSeconds + span * normalized;
}

function easeInOutSine(value) {
  const t = Math.max(0, Math.min(1, value));
  return 0.5 - 0.5 * Math.cos(Math.PI * t);
}

function stepVolumeSnapshot(state, dtSeconds) {
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

export function stepWindowsRotaryState(state, dtSeconds) {
  const snapshot = stepVolumeSnapshot(state, dtSeconds);
  const pan = computePan(state.angle, snapshot.amplitudeSample);

  return {
    ...snapshot,
    pan,
  };
}

export function stepWindowsRandomState(state, dtSeconds) {
  const snapshot = stepVolumeSnapshot(state, dtSeconds);
  const safeDt = Number.isFinite(dtSeconds) ? Math.max(0, dtSeconds) : 0;

  if (state.panProgress >= 1) {
    state.panStart = state.pan;
    state.panTarget = pickRandomPanTarget(state);
    state.transitionSeconds = pickRandomTransitionSeconds(state);
    state.panProgress = 0;
  }

  const progressDelta = state.transitionSeconds > 0
    ? safeDt / state.transitionSeconds
    : 1;
  state.panProgress = Math.min(1, state.panProgress + progressDelta);
  const eased = easeInOutSine(state.panProgress);
  state.pan = state.panStart + (state.panTarget - state.panStart) * eased;

  return {
    ...snapshot,
    pan: state.pan,
  };
}
