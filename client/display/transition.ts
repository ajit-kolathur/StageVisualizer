export class TransitionManager {
  private overlay: HTMLElement;
  private duration: number;

  constructor(duration = 0.5) {
    this.overlay = document.getElementById('transition-overlay')!;
    this.duration = duration;
  }

  fadeOut(): Promise<void> {
    return this.animate(true);
  }

  fadeIn(): Promise<void> {
    return this.animate(false);
  }

  private animate(show: boolean): Promise<void> {
    return new Promise(resolve => {
      const isVisible = this.overlay.classList.contains('visible');
      // If already in target state, resolve immediately
      if (show === isVisible) { resolve(); return; }

      this.overlay.style.transitionDuration = `${this.duration}s`;
      const handler = () => {
        this.overlay.removeEventListener('transitionend', handler);
        resolve();
      };
      this.overlay.addEventListener('transitionend', handler);

      // Fallback timeout in case transitionend doesn't fire
      setTimeout(handler, this.duration * 1000 + 100);

      if (show) {
        this.overlay.classList.add('visible');
      } else {
        this.overlay.classList.remove('visible');
      }
    });
  }
}
