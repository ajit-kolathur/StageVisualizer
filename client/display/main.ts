import { AudioEngine } from '../shared/audio-engine.js';
import { PluginManager } from './plugin-manager.js';

const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
const engine = new AudioEngine();

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const manager = new PluginManager(canvas, engine);

async function start() {
  await engine.init();
  // Auto-load first available plugin for demo (will be Socket.IO-driven in Step 7)
  try {
    const res = await fetch('/api/plugins');
    const plugins = await res.json();
    if (plugins.length > 0) {
      await manager.loadPlugin(plugins[0].id);
    }
  } catch (e) {
    console.warn('No plugins available:', e);
  }
}

start().catch(console.error);

export { manager, engine };
