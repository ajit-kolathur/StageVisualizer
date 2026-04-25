import type { PluginConfigBase, ShaderPluginConfig, ButterchurnPluginConfig, SlideshowPluginConfig, VisualizerPlugin } from '../../shared/types.js';
import type { AudioEngine } from '../../shared/audio-engine.js';
import { ShaderRenderer } from './shader-renderer.js';
import { ButterchurnRenderer } from './butterchurn-renderer.js';
import { SlideshowRenderer } from './slideshow-renderer.js';

export function createRenderer(pluginId: string, config: PluginConfigBase, audioEngine?: AudioEngine): VisualizerPlugin | null {
  switch (config.type) {
    case 'shader':
      return new ShaderRenderer(pluginId, config as ShaderPluginConfig);
    case 'butterchurn':
      if (!audioEngine) {
        console.warn('[renderer] Butterchurn requires audioEngine');
        return null;
      }
      return new ButterchurnRenderer(pluginId, config as ButterchurnPluginConfig, audioEngine);
    case 'slideshow':
      return new SlideshowRenderer(pluginId, config as SlideshowPluginConfig);
    default:
      console.warn(`[renderer] Unsupported plugin type: ${config.type}`);
      return null;
  }
}
