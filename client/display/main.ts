import { AudioEngine } from '../shared/audio-engine.js';
import { PluginManager } from './plugin-manager.js';
import type { PluginRegistryEntry } from '../shared/types.js';

const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
const engine = new AudioEngine();

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const manager = new PluginManager(canvas, engine);

let pluginList: PluginRegistryEntry[] = [];

async function start() {
  await engine.init();
  try {
    const res = await fetch('/api/plugins');
    pluginList = await res.json();
    if (pluginList.length > 0) {
      await manager.switchPlugin(pluginList[0].id);
    }
  } catch (e) {
    console.warn('No plugins available:', e);
  }
}

// Keyboard shortcuts: 1-9 to switch plugins by index
document.addEventListener('keydown', (e) => {
  const idx = parseInt(e.key, 10) - 1;
  if (idx >= 0 && idx < pluginList.length) {
    manager.switchPlugin(pluginList[idx].id);
  }
});

start().catch(console.error);

export { manager, engine };
