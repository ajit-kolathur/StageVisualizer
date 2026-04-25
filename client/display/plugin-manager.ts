import { AudioEngine } from '../shared/audio-engine.js';
import { TransitionManager } from './transition.js';
import { createRenderer } from './renderers/factory.js';
import type { PluginRegistryEntry, VisualizerPlugin } from '../shared/types.js';

const FALLBACK_ID = '_fallback';
const MAX_ERRORS = 3;

export class PluginManager {
  private canvas: HTMLCanvasElement;
  private audioEngine: AudioEngine;
  private plugin: VisualizerPlugin | null = null;
  private animId = 0;
  private currentEntry: PluginRegistryEntry | null = null;
  private transition: TransitionManager;
  private switching = false;
  private errorCount = 0;
  onError: ((pluginId: string) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, audioEngine: AudioEngine) {
    this.canvas = canvas;
    this.audioEngine = audioEngine;
    this.transition = new TransitionManager();
    window.addEventListener('resize', this.onResize);
  }

  async switchPlugin(pluginId: string): Promise<void> {
    if (this.switching) return;
    this.switching = true;
    try {
      if (this.plugin) await this.transition.fadeOut();
      this.destroyPlugin();
      await this.loadPlugin(pluginId);
      await this.transition.fadeIn();
    } finally {
      this.switching = false;
    }
  }

  async loadPlugin(pluginId: string): Promise<void> {
    this.destroyPlugin();

    const res = await fetch('/api/plugins');
    const plugins: PluginRegistryEntry[] = await res.json();
    const entry = plugins.find(p => p.id === pluginId);
    if (!entry) throw new Error(`Plugin not found: ${pluginId}`);

    this.currentEntry = entry;

    this.plugin = createRenderer(entry.id, entry.config, this.audioEngine);
    if (this.plugin) {
      try {
        await this.plugin.init(this.canvas, this.audioEngine.getData());
      } catch {
        this.plugin = null;
        this.currentEntry = null;
        this.onError?.(pluginId);
        if (pluginId !== FALLBACK_ID) {
          await this.loadPlugin(FALLBACK_ID).catch(() => {});
        }
        return;
      }
    }

    this.errorCount = 0;
    this.startLoop();
  }

  destroyPlugin(): void {
    this.stopLoop();
    this.plugin?.destroy();
    this.plugin = null;
    this.currentEntry = null;
  }

  private startLoop(): void {
    const loop = (timestamp: number) => {
      this.animId = requestAnimationFrame(loop);
      try {
        this.plugin?.render(timestamp, this.audioEngine.getData());
        this.errorCount = 0;
      } catch {
        this.errorCount++;
        if (this.errorCount >= MAX_ERRORS) {
          const failedId = this.currentEntry?.id || 'unknown';
          this.destroyPlugin();
          this.onError?.(failedId);
          this.loadPlugin(FALLBACK_ID).catch(() => {});
        }
      }
    };
    this.animId = requestAnimationFrame(loop);
  }

  private stopLoop(): void {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = 0;
    }
  }

  private onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w;
    this.canvas.height = h;
    this.plugin?.resize(w, h);
  };

  dispose(): void {
    this.destroyPlugin();
    window.removeEventListener('resize', this.onResize);
  }

  get activePlugin(): PluginRegistryEntry | null {
    return this.currentEntry;
  }
}
