import type { PluginRegistryEntry, StateSyncPayload, Setlist, SetlistSummary } from '../client/shared/types.js';

export class AppStateManager {
  activePlugin: string | null = null;
  gain = 1.0;
  plugins: PluginRegistryEntry[];
  pin: string;
  mode: 'generic' | 'gig' = 'generic';
  activeSetlist: Setlist | null = null;
  private _setlists: SetlistSummary[] = [];
  private _doneSet = new Set<number>();
  private _setlistLoader: ((id: string) => Setlist | null) | null = null;

  constructor(plugins: PluginRegistryEntry[], pin: string) {
    this.plugins = plugins;
    this.pin = pin;
  }

  setSetlists(summaries: SetlistSummary[]): void {
    this._setlists = summaries;
  }

  setSetlistLoader(loader: (id: string) => Setlist | null): void {
    this._setlistLoader = loader;
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

  setMode(mode: 'generic' | 'gig', setlistId?: string): boolean {
    if (mode === 'generic') {
      this.mode = 'generic';
      this.activeSetlist = null;
      this._doneSet.clear();
      return true;
    }
    if (!setlistId || !this._setlistLoader) return false;
    const setlist = this._setlistLoader(setlistId);
    if (!setlist) return false;
    this.mode = 'gig';
    this.activeSetlist = setlist;
    this._doneSet.clear();
    return true;
  }

  markDone(index: number): void {
    this._doneSet.add(index);
  }

  unmarkDone(index: number): void {
    this._doneSet.delete(index);
  }

  getSync(): StateSyncPayload {
    return {
      activePlugin: this.activePlugin,
      gain: this.gain,
      plugins: this.plugins,
      mode: this.mode,
      setlists: this._setlists,
      activeSetlist: this.activeSetlist,
      doneSet: [...this._doneSet],
    };
  }
}
