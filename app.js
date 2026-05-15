import {
  clamp01,
  computeAngularVelocity,
  computeGain,
  computePan,
  normalizeBounds,
  sampleCurve,
} from './src/engine.js';

const minVolumeInput = document.getElementById('minVolume');
const maxVolumeInput = document.getElementById('maxVolume');
const minVolumeValue = document.getElementById('minVolumeValue');
const maxVolumeValue = document.getElementById('maxVolumeValue');
const speedCanvas = document.getElementById('speedCurve');
const amplitudeCanvas = document.getElementById('amplitudeCurve');
const audioFileInput = document.getElementById('audioFile');
const player = document.getElementById('player');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusText = document.getElementById('status');

const speedPoints = new Array(16).fill(0).map((_, i) => 0.3 + 0.4 * Math.sin((i / 15) * Math.PI));
const amplitudePoints = new Array(16).fill(0).map((_, i) => 0.5 + 0.4 * Math.sin((i / 15) * Math.PI * 2));

let animationFrame = 0;
let audioCtx;
let sourceNode;
let gainNode;
let pannerNode;
let rotationAngle = 0;
let phase = 0;
let lastTime = 0;

function setStatus(text) {
  statusText.textContent = `状态：${text}`;
}

function updateVolumeLabels() {
  const bounds = normalizeBounds(minVolumeInput.value, maxVolumeInput.value);
  minVolumeInput.value = String(bounds.min);
  maxVolumeInput.value = String(bounds.max);
  minVolumeValue.textContent = `${bounds.min}%`;
  maxVolumeValue.textContent = `${bounds.max}%`;
}

function drawCurve(canvas, points, color) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = '#d7deea';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i += 1) {
    const y = (height / 4) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((point, idx) => {
    const x = (idx / (points.length - 1)) * width;
    const y = (1 - point) * height;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = color;
  points.forEach((point, idx) => {
    const x = (idx / (points.length - 1)) * width;
    const y = (1 - point) * height;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function installCurveEditor(canvas, points, color) {
  let activeIndex = -1;

  const updatePoint = (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const index = Math.round((x / rect.width) * (points.length - 1));
    const clampedIndex = Math.max(0, Math.min(points.length - 1, index));
    points[clampedIndex] = clamp01(1 - y / rect.height);
    drawCurve(canvas, points, color);
    activeIndex = clampedIndex;
  };

  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture(event.pointerId);
    updatePoint(event);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (event.buttons !== 1 && activeIndex < 0) return;
    updatePoint(event);
  });

  canvas.addEventListener('pointerup', () => {
    activeIndex = -1;
  });

  drawCurve(canvas, points, color);
}

function disconnectNodes() {
  if (sourceNode) sourceNode.disconnect();
  if (gainNode) gainNode.disconnect();
  if (pannerNode) pannerNode.disconnect();
  sourceNode = undefined;
  gainNode = undefined;
  pannerNode = undefined;
}

async function startProcessing() {
  if (!player.src) {
    setStatus('请先选择一个音频文件');
    return;
  }

  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  disconnectNodes();
  sourceNode = audioCtx.createMediaElementSource(player);
  gainNode = audioCtx.createGain();
  pannerNode = audioCtx.createStereoPanner();

  sourceNode.connect(gainNode);
  gainNode.connect(pannerNode);
  pannerNode.connect(audioCtx.destination);

  rotationAngle = 0;
  phase = 0;
  lastTime = performance.now();

  const animate = (now) => {
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    const speedSample = sampleCurve(speedPoints, phase);
    const ampSample = sampleCurve(amplitudePoints, phase);
    const omega = computeAngularVelocity(Math.PI * 1.5, speedSample);

    phase = (phase + dt * 0.15) % 1;
    rotationAngle += omega * dt;

    pannerNode.pan.value = computePan(rotationAngle, ampSample);
    gainNode.gain.value = computeGain({
      minPercent: minVolumeInput.value,
      maxPercent: maxVolumeInput.value,
      amplitudeSample: ampSample,
      baseVolume: player.volume,
    });

    animationFrame = requestAnimationFrame(animate);
  };

  animationFrame = requestAnimationFrame(animate);
  setStatus('旋转处理中');
  startBtn.disabled = true;
  stopBtn.disabled = false;
}

function stopProcessing() {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }
  disconnectNodes();
  setStatus('已停止');
  startBtn.disabled = false;
  stopBtn.disabled = true;
}

minVolumeInput.addEventListener('input', updateVolumeLabels);
maxVolumeInput.addEventListener('input', updateVolumeLabels);
updateVolumeLabels();

installCurveEditor(speedCanvas, speedPoints, '#2b6de5');
installCurveEditor(amplitudeCanvas, amplitudePoints, '#e5632b');

audioFileInput.addEventListener('change', () => {
  const file = audioFileInput.files?.[0];
  if (!file) return;

  if (player.dataset.objectUrl) {
    URL.revokeObjectURL(player.dataset.objectUrl);
  }

  const objectUrl = URL.createObjectURL(file);
  const parsedObjectUrl = new URL(objectUrl);
  if (parsedObjectUrl.protocol !== 'blob:') {
    URL.revokeObjectURL(objectUrl);
    setStatus('加载失败：仅允许本地 blob 音频源');
    return;
  }

  player.src = parsedObjectUrl.href;
  player.dataset.objectUrl = parsedObjectUrl.href;
  setStatus(`已加载：${file.name}`);
});

startBtn.addEventListener('click', () => {
  startProcessing().catch((error) => {
    console.error(error);
    setStatus('启动失败，请检查浏览器音频权限');
  });
});

stopBtn.addEventListener('click', stopProcessing);
