import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadSetlists, loadSetlist } from '../setlist-loader.js';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('setlist-loader', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'sv-setlist-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function addSetlist(filename: string, content: unknown) {
    writeFileSync(join(dir, filename), JSON.stringify(content));
  }

  it('loads valid setlist files', () => {
    addSetlist('friday.json', {
      name: 'Friday Gig',
      entries: [{ song: 'Opener', pluginId: 'fractal-pulse' }],
    });
    const result = loadSetlists(dir);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'friday',
      name: 'Friday Gig',
      entries: [{ song: 'Opener', pluginId: 'fractal-pulse' }],
    });
  });

  it('skips invalid files without crashing', () => {
    addSetlist('bad.json', { name: 'No entries' });
    addSetlist('good.json', {
      name: 'Good',
      entries: [{ song: 'A', pluginId: 'x' }],
    });
    const result = loadSetlists(dir);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('good');
  });

  it('returns empty array for missing directory', () => {
    expect(loadSetlists(join(dir, 'nonexistent'))).toEqual([]);
  });

  it('loads single setlist by ID', () => {
    addSetlist('demo.json', {
      name: 'Demo',
      entries: [{ song: 'Song1', pluginId: 'p1' }],
    });
    const result = loadSetlist(dir, 'demo');
    expect(result).toEqual({
      id: 'demo',
      name: 'Demo',
      entries: [{ song: 'Song1', pluginId: 'p1' }],
    });
  });

  it('returns null for nonexistent setlist ID', () => {
    expect(loadSetlist(dir, 'nope')).toBeNull();
  });
});
