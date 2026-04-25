import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import type { PluginRegistryEntry, PluginConfigBase } from '../client/shared/types.js';

const VALID_TYPES = new Set(['shader', 'threejs', 'butterchurn', 'slideshow']);

function isValidConfig(data: unknown): data is PluginConfigBase {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return typeof obj.name === 'string' && typeof obj.type === 'string' && VALID_TYPES.has(obj.type);
}

export function scanPlugins(pluginsDir: string): PluginRegistryEntry[] {
  let entries: string[];
  try {
    entries = readdirSync(pluginsDir);
  } catch {
    console.warn(`[plugin-scanner] Cannot read plugins directory: ${pluginsDir}`);
    return [];
  }

  const plugins: PluginRegistryEntry[] = [];

  for (const name of entries) {
    const dir = join(pluginsDir, name);
    try {
      if (!statSync(dir).isDirectory()) continue;
    } catch { continue; }

    const configPath = join(dir, 'config.json');
    try {
      const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
      if (!isValidConfig(raw)) {
        console.warn(`[plugin-scanner] Invalid config in ${name}/config.json — skipping`);
        continue;
      }
      plugins.push({ id: name, config: raw });
    } catch {
      console.warn(`[plugin-scanner] Failed to read ${name}/config.json — skipping`);
    }
  }

  return plugins;
}
