import type { PluginConfigBase, ShaderPluginConfig, VisualizerPlugin } from '../../shared/types.js';
import { ShaderRenderer } from './shader-renderer.js';

export function createRenderer(pluginId: string, config: PluginConfigBase): VisualizerPlugin | null {
  switch (config.type) {
    case 'shader':
      return new ShaderRenderer(pluginId, config as ShaderPluginConfig);
    default:
      console.warn(`[renderer] Unsupported plugin type: ${config.type}`);
      return null;
  }
}
