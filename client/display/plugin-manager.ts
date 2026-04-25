import type { AudioData, PluginRegistryEntry, VisualizerPlugin } from '../shared/types.js';
import type { AudioEngine } from '../shared/audio-engine.js';

export class PluginManager {
  private canvas: HTMLCanvasElement;
  private audioEngine: AudioEngine;
  private plugin: VisualizerPlugin | null = null;
  private animId = 0;
  private currentEntry: PluginRegistryEntry | null = null;

  constructor(canvas: HTMLCanvasElement, audioEngine: AudioEngine) {
    this.canvas = canvas;
    this.audioEngine = audioEngine;
    window.addEventListener('resize', this.onResize);
  }

  async loadPlugin(pluginId: string): Promise<void> {
    this.destroyPlugin();

    const res = await fetch('/api/plugins');
    const plugins: PluginRegistryEntry[] = await res.json();
    const entry = plugins.find(p => p.id === pluginId);
    if (!entry) throw new Error(`Plugin not found: ${pluginId}`);

    this.currentEntry = entry;

    // Renderer creation deferred to Step 5 — store config only for now
    // When renderers exist: this.plugin = createRenderer(entry.config);
    // await this.plugin.init(this.canvas, this.audioEngine.getData());

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
      this.plugin?.render(timestamp, this.audioEngine.getData());
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
