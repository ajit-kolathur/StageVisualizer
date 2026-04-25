import { describe, it, expect } from 'vitest';
import { AppStateManager } from '../state.js';
import type { PluginRegistryEntry } from '../../client/shared/types.js';

const PLUGINS: PluginRegistryEntry[] = [
  { id: 'fractal-pulse', config: { name: 'Fractal Pulse', type: 'shader' } },
  { id: 'kaleidoscope-wave', config: { name: 'Kaleidoscope Wave', type: 'shader' } },
];

describe('AppStateManager', () => {
  it('initializes with plugins, default gain, null activePlugin, and pin', () => {
    const state = new AppStateManager(PLUGINS, '1234');
    expect(state.activePlugin).toBeNull();
    expect(state.gain).toBe(1.0);
    expect(state.plugins).toBe(PLUGINS);
    expect(state.pin).toBe('1234');
  });

  it('setActivePlugin updates state and returns entry', () => {
    const state = new AppStateManager(PLUGINS, '1234');
    const entry = state.setActivePlugin('fractal-pulse');
    expect(entry).toEqual(PLUGINS[0]);
    expect(state.activePlugin).toBe('fractal-pulse');
  });

  it('setActivePlugin returns null for unknown plugin ID', () => {
    const state = new AppStateManager(PLUGINS, '1234');
    const entry = state.setActivePlugin('nonexistent');
    expect(entry).toBeNull();
    expect(state.activePlugin).toBeNull();
  });

  it('setGain clamps to 0-2 range', () => {
    const state = new AppStateManager(PLUGINS, '1234');
    state.setGain(1.5);
    expect(state.gain).toBe(1.5);
    state.setGain(-1);
    expect(state.gain).toBe(0);
    state.setGain(5);
    expect(state.gain).toBe(2);
  });

  it('getSync returns StateSyncPayload', () => {
    const state = new AppStateManager(PLUGINS, '1234');
    state.setActivePlugin('fractal-pulse');
    state.setGain(0.8);
    const sync = state.getSync();
    expect(sync.activePlugin).toBe('fractal-pulse');
    expect(sync.gain).toBe(0.8);
    expect(sync.plugins).toBe(PLUGINS);
    expect(sync.mode).toBe('generic');
    expect(sync.setlists).toEqual([]);
    expect(sync.activeSetlist).toBeNull();
    expect(sync.doneSet).toEqual([]);
  });

  it('setMode switches to gig mode with valid setlist', () => {
    const setlist = { id: 'demo', name: 'Demo', entries: [{ song: 'A', pluginId: 'fractal-pulse' }] };
    const state = new AppStateManager(PLUGINS, '1234');
    state.setSetlists([{ id: 'demo', name: 'Demo' }]);
    state.setSetlistLoader((_id: string) => setlist);
    expect(state.setMode('gig', 'demo')).toBe(true);
    expect(state.mode).toBe('gig');
    expect(state.activeSetlist).toEqual(setlist);
    expect(state.getSync().doneSet).toEqual([]);
  });

  it('setMode returns false for invalid setlist', () => {
    const state = new AppStateManager(PLUGINS, '1234');
    state.setSetlistLoader(() => null);
    expect(state.setMode('gig', 'nonexistent')).toBe(false);
    expect(state.mode).toBe('generic');
  });

  it('setMode switches back to generic', () => {
    const setlist = { id: 'demo', name: 'Demo', entries: [{ song: 'A', pluginId: 'fractal-pulse' }] };
    const state = new AppStateManager(PLUGINS, '1234');
    state.setSetlistLoader(() => setlist);
    state.setSetlists([{ id: 'demo', name: 'Demo' }]);
    state.setMode('gig', 'demo');
    expect(state.setMode('generic')).toBe(true);
    expect(state.mode).toBe('generic');
    expect(state.activeSetlist).toBeNull();
  });

  it('markDone and unmarkDone toggle done state', () => {
    const state = new AppStateManager(PLUGINS, '1234');
    state.markDone(0);
    expect(state.getSync().doneSet).toEqual([0]);
    state.markDone(2);
    expect(state.getSync().doneSet).toEqual([0, 2]);
    state.unmarkDone(0);
    expect(state.getSync().doneSet).toEqual([2]);
  });
});
