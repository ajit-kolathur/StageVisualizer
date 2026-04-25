import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { Setlist } from '../client/shared/types.js';

export function loadSetlists(dir: string): Setlist[] {
  if (!existsSync(dir)) return [];
  const results: Setlist[] = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    try {
      const raw = JSON.parse(readFileSync(join(dir, file), 'utf-8'));
      if (!raw.name || !Array.isArray(raw.entries) || !raw.entries.every((e: any) => e.song && e.pluginId)) {
        console.warn(`[setlist] Skipping invalid setlist: ${file}`);
        continue;
      }
      results.push({ id: file.replace(/\.json$/, ''), name: raw.name, entries: raw.entries });
    } catch {
      console.warn(`[setlist] Skipping unreadable file: ${file}`);
    }
  }
  return results;
}

export function loadSetlist(dir: string, id: string): Setlist | null {
  const file = join(dir, `${id}.json`);
  if (!existsSync(file)) return null;
  try {
    const raw = JSON.parse(readFileSync(file, 'utf-8'));
    if (!raw.name || !Array.isArray(raw.entries)) return null;
    return { id, name: raw.name, entries: raw.entries };
  } catch {
    return null;
  }
}
