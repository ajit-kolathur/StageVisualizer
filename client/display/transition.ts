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
      this.overlay.style.transitionDuration = `${this.duration}s`;
      const handler = () => {
        this.overlay.removeEventListener('transitionend', handler);
        resolve();
      };
      this.overlay.addEventListener('transitionend', handler);
      if (show) {
        this.overlay.classList.add('visible');
      } else {
        this.overlay.classList.remove('visible');
      }
    });
  }
}
