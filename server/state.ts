import type { PluginRegistryEntry, StateSyncPayload } from '../client/shared/types.js';

export class AppStateManager {
  activePlugin: string | null = null;
  gain = 1.0;
  plugins: PluginRegistryEntry[];
  pin: string;

  constructor(plugins: PluginRegistryEntry[], pin: string) {
    this.plugins = plugins;
    this.pin = pin;
  }

  setActivePlugin(pluginId: string): PluginRegistryEntry | null {
    const entry = this.plugins.find(p => p.id === pluginId);
    if (!entry) return null;
    this.activePlugin = pluginId;
    return entry;
  }

  setGain(value: number): void {
    this.gain = Math.max(0, Math.min(2, value));
  }

  getSync(): StateSyncPayload {
    return {
      activePlugin: this.activePlugin,
      gain: this.gain,
      plugins: this.plugins,
    };
  }
}
