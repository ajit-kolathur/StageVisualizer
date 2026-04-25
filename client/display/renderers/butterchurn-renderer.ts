import type { AudioData, ButterchurnPluginConfig, VisualizerPlugin } from '../../shared/types.js';
import type { AudioEngine } from '../../shared/audio-engine.js';

let cachedPresets: Record<string, any> | null = null;

async function loadPresetByName(name: string): Promise<any> {
  if (!cachedPresets) {
    const [base, extra, extra2] = await Promise.all([
      import('butterchurn-presets'),
      import('butterchurn-presets/lib/butterchurnPresetsExtra.min'),
      import('butterchurn-presets/lib/butterchurnPresetsExtra2.min'),
    ]);
    const get = (m: any) => (m.default?.getPresets ?? m.getPresets)();
    cachedPresets = { ...get(base), ...get(extra), ...get(extra2) };
  }
  const preset = cachedPresets![name];
  if (!preset) throw new Error(`Preset not found: ${name}`);
  return preset;
}

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

    const mod = await import('butterchurn');
    const bc = mod.default?.default ?? mod.default ?? mod;
    this.visualizer = bc.createVisualizer(ctx, canvas, {
      width: canvas.width,
      height: canvas.height,
    });

    const source = this.audioEngine.sourceNode;
    if (source) this.visualizer.connectAudio(source);

    let preset: any;
    if (this.pluginId.startsWith('butterchurn:')) {
      const presetName = this.pluginId.slice('butterchurn:'.length);
      preset = await loadPresetByName(presetName);
    } else {
      const res = await fetch(`/plugins/${this.pluginId}/preset.json`);
      preset = res.ok ? await res.json() : null;
    }

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
