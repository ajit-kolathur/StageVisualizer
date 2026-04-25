import type { AudioData, ThreeJSPluginConfig, VisualizerPlugin } from '../../shared/types.js';

interface SceneModule {
  setup(THREE: any, scene: any, camera: any): any;
  update(state: any, audioData: AudioData, time: number): void;
}

export class ThreejsRenderer implements VisualizerPlugin {
  readonly type = 'threejs' as const;
  private renderer: any = null;
  private scene: any = null;
  private camera: any = null;
  private sceneModule: SceneModule | null = null;
  private sceneState: any = null;

  constructor(private pluginId: string, private config: ThreeJSPluginConfig) {}

  async _loadSceneModule(): Promise<SceneModule> {
    const res = await fetch(`/plugins/${this.pluginId}/${this.config.scene}`);
    const code = await res.text();
    const blob = new Blob([code], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    try {
      return await import(/* @vite-ignore */ url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async init(canvas: HTMLCanvasElement, _audioData: AudioData): Promise<void> {
    const THREE = await import('three');

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.width, canvas.height, false);

    this.sceneModule = await this._loadSceneModule();
    this.sceneState = this.sceneModule.setup(THREE, this.scene, this.camera);
  }

  render(timestamp: number, audioData: AudioData): void {
    if (!this.renderer || !this.sceneModule) return;
    this.sceneModule.update(this.sceneState, audioData, timestamp);
    this.renderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number): void {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  destroy(): void {
    this.renderer?.dispose();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.sceneModule = null;
    this.sceneState = null;
  }
}
