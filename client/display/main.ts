import { AudioEngine } from '../shared/audio-engine.js';
import { PluginManager } from './plugin-manager.js';

const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
const engine = new AudioEngine();

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Show waiting state until a plugin is loaded via Socket.IO (Step 6)
const ctx = canvas.getContext('2d')!;
ctx.fillStyle = '#888';
ctx.font = '20px monospace';
ctx.textAlign = 'center';
ctx.fillText('Waiting for plugin…', canvas.width / 2, canvas.height / 2);

const manager = new PluginManager(canvas, engine);

async function start() {
  await engine.init();
  // Plugin loading will be triggered by Socket.IO events in Step 6
}

start().catch(console.error);

export { manager, engine };
