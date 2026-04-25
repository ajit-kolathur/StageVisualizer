import { AudioEngine } from '../shared/audio-engine.js';

const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const engine = new AudioEngine();

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function render() {
  requestAnimationFrame(render);
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  if (engine.micDenied) {
    ctx.fillStyle = '#fff';
    ctx.font = '24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Microphone access denied', width / 2, height / 2);
    ctx.font = '16px monospace';
    ctx.fillText('Grant mic permission and reload', width / 2, height / 2 + 32);
    ctx.textAlign = 'start';
    return;
  }

  const data = engine.getData();
  const bars = data.frequencyData;
  const barW = width / bars.length;

  for (let i = 0; i < bars.length; i++) {
    const h = (bars[i] / 255) * height;
    ctx.fillStyle = `hsl(${(i / bars.length) * 360}, 80%, 55%)`;
    ctx.fillRect(i * barW, height - h, barW, h);
  }

  ctx.fillStyle = '#fff';
  ctx.font = '16px monospace';
  ctx.textBaseline = 'top';
  const labels = [
    `bass: ${data.bass.toFixed(2)}`,
    `mids: ${data.mids.toFixed(2)}`,
    `treble: ${data.treble.toFixed(2)}`,
    `volume: ${data.volume.toFixed(2)}`,
  ];
  labels.forEach((text, i) => ctx.fillText(text, 12, 12 + i * 22));
}

async function start() {
  resize();
  window.addEventListener('resize', resize);
  await engine.init();
  render();
}

start().catch(console.error);
