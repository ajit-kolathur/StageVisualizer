import { io } from 'socket.io-client';
import { AudioEngine } from '../shared/audio-engine.js';
import { PluginManager } from './plugin-manager.js';
import type { PluginRegistryEntry, StateSyncPayload, PluginChangedPayload, GainChangedPayload } from '../shared/types.js';

const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
const engine = new AudioEngine();

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const manager = new PluginManager(canvas, engine);

let pluginList: PluginRegistryEntry[] = [];
let initialized = false;

const socket = io();

socket.on('connect', () => {
  if (!initialized) {
    engine.init().then(() => { initialized = true; }).catch(console.error);
  }
});

socket.on('state-sync', async (data: StateSyncPayload) => {
  pluginList = data.plugins;
  engine.setGain(data.gain);
  if (!initialized && data.activePlugin) {
    initialized = true;
    await engine.init();
    manager.switchPlugin(data.activePlugin);
  }
});

socket.on('plugin-changed', (data: PluginChangedPayload) => {
  manager.switchPlugin(data.pluginId);
});

socket.on('gain-changed', (data: GainChangedPayload) => {
  engine.setGain(data.gain);
});

document.addEventListener('keydown', (e) => {
  const idx = parseInt(e.key, 10) - 1;
  if (idx >= 0 && idx < pluginList.length) {
    manager.switchPlugin(pluginList[idx].id);
  }
});

export { manager, engine };
