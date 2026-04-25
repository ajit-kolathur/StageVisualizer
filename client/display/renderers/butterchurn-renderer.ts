import type { AudioData, ButterchurnPluginConfig, VisualizerPlugin } from '../../shared/types.js';
import type { AudioEngine } from '../../shared/audio-engine.js';

export class ButterchurnRenderer implements VisualizerPlugin {
  readonly type = 'butterchurn' as const;
  private visualizer: any = null;
  private pluginId: string;
  private config: ButterchurnPluginConfig;
  private audioEngine: AudioEngine;

  constructor(pluginId: string, config: ButterchurnPluginConfig, audioEngine: AudioEngine) {
    this.pluginId = pluginId;
    this.config = config;
    this.audioEngine = audioEngine;
  }

  async init(canvas: HTMLCanvasElement, _audioData: AudioData): Promise<void> {
    const ctx = this.audioEngine.audioContext;
    if (!ctx) return;

    const butterchurn = (await import('butterchurn')).default;
    this.visualizer = butterchurn.createVisualizer(ctx, canvas, {
      width: canvas.width,
      height: canvas.height,
    });

    const source = this.audioEngine.sourceNode;
    if (source) this.visualizer.connectAudio(source);

    const res = await fetch(`/plugins/${this.pluginId}/preset.json`);
    const preset = res.ok ? await res.json() : null;
    if (preset) {
      this.visualizer.loadPreset(preset, this.config.blendTime ?? 2);
    }
  }

  render(_timestamp: number, _audioData: AudioData): void {
    this.visualizer?.render();
  }

  resize(width: number, height: number): void {
    this.visualizer?.setRendererSize(width, height);
  }

  destroy(): void {
    this.visualizer = null;
  }
}
