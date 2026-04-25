import type { AudioData, SlideshowPluginConfig, VisualizerPlugin } from '../../shared/types.js';

export class SlideshowRenderer implements VisualizerPlugin {
  readonly type = 'slideshow' as const;
  private ctx: CanvasRenderingContext2D | null = null;
  private ownCanvas: HTMLCanvasElement | null = null;
  private images: HTMLImageElement[] = [];
  private width = 0;
  private height = 0;
  private currentIndex = 0;
  private nextIndex = -1;
  private transitionStart = -1;
  private timer: ReturnType<typeof setInterval> | null = null;
  private config: SlideshowPluginConfig;
  private pluginId: string;

  constructor(pluginId: string, config: SlideshowPluginConfig) {
    this.pluginId = pluginId;
    this.config = config;
  }

  async init(canvas: HTMLCanvasElement, _audioData: AudioData): Promise<void> {
    this.width = canvas.width;
    this.height = canvas.height;

    // Create a separate canvas to avoid tainting the shared canvas's WebGL context
    const own = document.createElement('canvas');
    own.width = this.width;
    own.height = this.height;
    own.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:1;';
    canvas.parentElement?.appendChild(own);
    this.ownCanvas = own;
    this.ctx = own.getContext('2d');

    this.images = await Promise.all(
      this.config.images.map(src => new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load: ${src}`));
        img.src = `/plugins/${this.pluginId}/${src}`;
      }))
    );

    this.currentIndex = 0;
    this.drawImage(this.images[0]);

    this.timer = setInterval(() => {
      this.nextIndex = (this.currentIndex + 1) % this.images.length;
      if (this.config.transition === 'cut') {
        this.currentIndex = this.nextIndex;
        this.nextIndex = -1;
      } else {
        this.transitionStart = performance.now();
      }
    }, this.config.interval * 1000);
  }

  render(timestamp: number, _audioData: AudioData): void {
    const ctx = this.ctx;
    if (!ctx || this.images.length === 0) return;

    ctx.clearRect(0, 0, this.width, this.height);

    if (this.nextIndex >= 0 && this.transitionStart >= 0) {
      const duration = (this.config.transitionDuration ?? 1) * 1000;
      const progress = Math.min((timestamp - this.transitionStart) / duration, 1);
      this.renderTransition(ctx, progress);
      if (progress >= 1) {
        this.currentIndex = this.nextIndex;
        this.nextIndex = -1;
        this.transitionStart = -1;
      }
    } else {
      this.drawImage(this.images[this.currentIndex]);
    }
  }

  private renderTransition(ctx: CanvasRenderingContext2D, progress: number): void {
    const current = this.images[this.currentIndex];
    const next = this.images[this.nextIndex];

    switch (this.config.transition) {
      case 'fade':
        this.drawImage(current, 1 - progress);
        this.drawImage(next, progress);
        break;
      case 'slide': {
        const offset = progress * this.width;
        this.drawImageAt(current, -offset, 0);
        this.drawImageAt(next, this.width - offset, 0);
        break;
      }
      case 'zoom': {
        const scale = 1 + progress * 0.1;
        ctx.save();
        ctx.setTransform(scale, 0, 0, scale, this.width / 2 * (1 - scale), this.height / 2 * (1 - scale));
        this.drawImage(current, 1 - progress);
        ctx.restore();
        this.drawImage(next, progress);
        break;
      }
      default:
        this.drawImage(next);
    }
  }

  private drawImage(img: HTMLImageElement, alpha = 1): void {
    const ctx = this.ctx!;
    const { sx, sy, sw, sh, dx, dy, dw, dh } = this.computeLayout(img, this.config.sizing ?? 'cover');
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    ctx.restore();
  }

  private drawImageAt(img: HTMLImageElement, x: number, y: number): void {
    const ctx = this.ctx!;
    const { sx, sy, sw, sh, dw, dh } = this.computeLayout(img, this.config.sizing ?? 'cover');
    ctx.drawImage(img, sx, sy, sw, sh, x + (this.width - dw) / 2, y + (this.height - dh) / 2, dw, dh);
  }

  private computeLayout(img: HTMLImageElement, sizing: 'cover' | 'contain') {
    const imgRatio = img.width / img.height;
    const canvasRatio = this.width / this.height;

    if (sizing === 'cover') {
      if (imgRatio > canvasRatio) {
        const sw = img.height * canvasRatio;
        return { sx: (img.width - sw) / 2, sy: 0, sw, sh: img.height, dx: 0, dy: 0, dw: this.width, dh: this.height };
      }
      const sh = img.width / canvasRatio;
      return { sx: 0, sy: (img.height - sh) / 2, sw: img.width, sh, dx: 0, dy: 0, dw: this.width, dh: this.height };
    }
    if (imgRatio > canvasRatio) {
      const dh = this.width / imgRatio;
      return { sx: 0, sy: 0, sw: img.width, sh: img.height, dx: 0, dy: (this.height - dh) / 2, dw: this.width, dh };
    }
    const dw = this.height * imgRatio;
    return { sx: 0, sy: 0, sw: img.width, sh: img.height, dx: (this.width - dw) / 2, dy: 0, dw, dh: this.height };
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    if (this.ownCanvas) {
      this.ownCanvas.width = width;
      this.ownCanvas.height = height;
    }
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.ownCanvas?.remove();
    this.ownCanvas = null;
    this.images = [];
    this.ctx = null;
  }
}
