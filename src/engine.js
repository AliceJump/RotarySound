export function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function normalizeBounds(minPercent, maxPercent) {
  const safeMin = Math.max(0, Math.min(100, Number(minPercent) || 0));
  const safeMax = Math.max(0, Math.min(100, Number(maxPercent) || 0));
  return safeMin <= safeMax ? { min: safeMin, max: safeMax } : { min: safeMax, max: safeMin };
}

export function sampleCurve(points, phase) {
  if (!Array.isArray(points) || points.length === 0) {
    return 0.5;
  }

  const wrapped = ((phase % 1) + 1) % 1;
  const scaled = wrapped * (points.length - 1);
  const idx = Math.floor(scaled);
  const next = Math.min(points.length - 1, idx + 1);
  const t = scaled - idx;
  return clamp01(points[idx] + (points[next] - points[idx]) * t);
}

export function computeGain({ minPercent, maxPercent, amplitudeSample, baseVolume = 1 }) {
  const { min, max } = normalizeBounds(minPercent, maxPercent);
  const amp = clamp01(amplitudeSample);
  const minGain = min / 100;
  const maxGain = max / 100;
  const gain = minGain + (maxGain - minGain) * amp;
  return clamp01(gain * clamp01(baseVolume));
}

export function computePan(rotationAngle, amplitudeSample) {
  const amp = clamp01(amplitudeSample);
  return Math.max(-1, Math.min(1, Math.sin(rotationAngle) * amp));
}

export function computeAngularVelocity(baseVelocity, speedSample) {
  const speed = clamp01(speedSample);
  return Math.max(0, baseVelocity * (0.2 + speed * 1.8));
}
