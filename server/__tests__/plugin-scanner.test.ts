import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scanPlugins } from '../plugin-scanner.js';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('scanPlugins', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'sv-test-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function addPlugin(name: string, config: unknown) {
    const pluginDir = join(dir, name);
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(join(pluginDir, 'config.json'), JSON.stringify(config));
  }

  it('returns empty array for empty directory', () => {
    expect(scanPlugins(dir)).toEqual([]);
  });

  it('returns empty array when directory does not exist', () => {
    expect(scanPlugins(join(dir, 'nonexistent'))).toEqual([]);
  });

  it('parses valid plugin config', () => {
    addPlugin('my-plugin', { name: 'My Plugin', type: 'shader', shader: 'shader.frag' });
    const result = scanPlugins(dir);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'my-plugin',
      config: { name: 'My Plugin', type: 'shader', shader: 'shader.frag' },
    });
  });

  it('scans multiple plugins', () => {
    addPlugin('a', { name: 'A', type: 'shader', shader: 's.frag' });
    addPlugin('b', { name: 'B', type: 'slideshow', images: [], interval: 5, transition: 'fade' });
    expect(scanPlugins(dir)).toHaveLength(2);
  });

  it('skips folders with missing config.json', () => {
    mkdirSync(join(dir, 'no-config'));
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(scanPlugins(dir)).toEqual([]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('skips folders with invalid JSON', () => {
    const pluginDir = join(dir, 'bad-json');
    mkdirSync(pluginDir);
    writeFileSync(join(pluginDir, 'config.json'), '{not valid json');
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(scanPlugins(dir)).toEqual([]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('skips config missing required name field', () => {
    addPlugin('no-name', { type: 'shader' });
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(scanPlugins(dir)).toEqual([]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('skips config with invalid type', () => {
    addPlugin('bad-type', { name: 'X', type: 'invalid' });
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(scanPlugins(dir)).toEqual([]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('skips non-directory entries', () => {
    writeFileSync(join(dir, 'file.txt'), 'not a dir');
    expect(scanPlugins(dir)).toEqual([]);
  });

  it('returns valid plugins and skips invalid ones', () => {
    addPlugin('good', { name: 'Good', type: 'threejs', scene: 'scene.js' });
    addPlugin('bad', { type: 'shader' }); // missing name
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = scanPlugins(dir);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('good');
    spy.mockRestore();
  });
});
