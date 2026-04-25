// --- Audio ---

export interface AudioData {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  bass: number;
  mids: number;
  treble: number;
  volume: number;
}

// --- Plugin Configs ---

export interface PluginConfigBase {
  name: string;
  type: 'shader' | 'threejs' | 'butterchurn' | 'slideshow';
  description?: string;
  author?: string;
  tags?: string[];
}

export interface ShaderPluginConfig extends PluginConfigBase {
  type: 'shader';
  shader: string;
  uniforms?: Record<string, number>;
}

export interface ThreeJSPluginConfig extends PluginConfigBase {
  type: 'threejs';
  scene: string;
}

export interface ButterchurnPluginConfig extends PluginConfigBase {
  type: 'butterchurn';
  preset: string;
  blendTime?: number;
}

export interface SlideshowPluginConfig extends PluginConfigBase {
  type: 'slideshow';
  images: string[];
  interval: number;
  transition: 'fade' | 'slide' | 'zoom' | 'cut';
  transitionDuration?: number;
  sizing?: 'cover' | 'contain';
}

export type PluginConfig =
  | ShaderPluginConfig
  | ThreeJSPluginConfig
  | ButterchurnPluginConfig
  | SlideshowPluginConfig;

// --- Plugin Registry ---

export interface PluginRegistryEntry {
  id: string;
  config: PluginConfig | PluginConfigBase;
}

// --- App State ---

export interface AppState {
  activePlugin: string | null;
  gain: number;
  plugins: PluginRegistryEntry[];
  pin: string;
}

// --- Socket.IO Event Payloads ---

export interface AuthPayload { pin: string; }
export interface SwitchPluginPayload { pluginId: string; }
export interface SetGainPayload { gain: number; }

export interface StateSyncPayload {
  activePlugin: string | null;
  gain: number;
  plugins: PluginRegistryEntry[];
  mode: 'generic' | 'gig';
  setlists: SetlistSummary[];
  activeSetlist: Setlist | null;
  doneSet: number[];
}

export interface PluginChangedPayload { pluginId: string; config: PluginConfigBase; }
export interface GainChangedPayload { gain: number; }

// --- Setlist ---

export interface SetlistEntry {
  song: string;
  pluginId: string;
}

export interface Setlist {
  id: string;
  name: string;
  entries: SetlistEntry[];
}

export interface SetlistSummary {
  id: string;
  name: string;
}

// --- Gig Mode Payloads ---

export interface SetModePayload {
  mode: 'generic' | 'gig';
  setlistId?: string;
}

export interface MarkDonePayload {
  songIndex: number;
}

// --- Visualizer Plugin Interface ---

export interface VisualizerPlugin {
  type: PluginConfigBase['type'];
  init(canvas: HTMLCanvasElement, audioData: AudioData): Promise<void>;
  render(timestamp: number, audioData: AudioData): void;
  resize(width: number, height: number): void;
  destroy(): void;
}
