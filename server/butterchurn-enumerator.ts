import { createRequire } from 'module';
import type { PluginRegistryEntry } from '../client/shared/types.js';

const require = createRequire(import.meta.url);

export function enumerateButterchurnPresets(): PluginRegistryEntry[] {
  const presetMap = new Map<string, true>();
  const entries: PluginRegistryEntry[] = [];

  const bundles = [
    { path: 'butterchurn-presets', label: 'base' },
    { path: 'butterchurn-presets/lib/butterchurnPresetsExtra.min', label: 'extra' },
    { path: 'butterchurn-presets/lib/butterchurnPresetsExtra2.min', label: 'extra2' },
  ];

  for (const bundle of bundles) {
    try {
      const mod = require(bundle.path);
      const presets = mod.getPresets ? mod.getPresets() : mod.default?.getPresets?.();
      if (!presets) {
        console.warn(`[butterchurn-enumerator] No getPresets() in ${bundle.label} bundle — skipping`);
        continue;
      }
      for (const name of Object.keys(presets)) {
        if (presetMap.has(name)) continue;
        presetMap.set(name, true);
        entries.push({
          id: `butterchurn:${name}`,
          config: { name, type: 'butterchurn', preset: name },
        });
      }
    } catch (e) {
      console.warn(`[butterchurn-enumerator] Failed to load ${bundle.label} bundle:`, (e as Error).message);
    }
  }

  return entries;
}
