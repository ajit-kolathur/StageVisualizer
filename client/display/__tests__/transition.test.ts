import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let overlayStyle: Record<string, string>;
let overlayClassList: Set<string>;
let transitionEndHandler: (() => void) | null;

function mockOverlay() {
  overlayStyle = { transitionDuration: '' };
  overlayClassList = new Set();
  transitionEndHandler = null;
  return {
    style: overlayStyle,
    classList: {
      add: (cls: string) => overlayClassList.add(cls),
      remove: (cls: string) => overlayClassList.delete(cls),
      contains: (cls: string) => overlayClassList.has(cls),
    },
    addEventListener: (_event: string, handler: () => void) => {
      transitionEndHandler = handler;
    },
    removeEventListener: vi.fn(),
  };
}

beforeEach(() => {
  const overlay = mockOverlay();
  vi.stubGlobal('document', {
    getElementById: (id: string) => id === 'transition-overlay' ? overlay : null,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function fireTransitionEnd() {
  transitionEndHandler?.();
  transitionEndHandler = null;
}

describe('TransitionManager', () => {
  async function createTransition(duration?: number) {
    const { TransitionManager } = await import('../transition.js');
    return new TransitionManager(duration);
  }

  it('fadeOut adds visible class to overlay', async () => {
    const tm = await createTransition();
    const p = tm.fadeOut();
    expect(overlayClassList.has('visible')).toBe(true);
    fireTransitionEnd();
    await p;
  });

  it('fadeIn removes visible class from overlay', async () => {
    const tm = await createTransition();
    // Fade out first
    const p1 = tm.fadeOut();
    fireTransitionEnd();
    await p1;

    // Fade in
    const p2 = tm.fadeIn();
    expect(overlayClassList.has('visible')).toBe(false);
    fireTransitionEnd();
    await p2;
  });

  it('uses custom duration', async () => {
    const tm = await createTransition(0.3);
    const p = tm.fadeOut();
    expect(overlayStyle.transitionDuration).toBe('0.3s');
    fireTransitionEnd();
    await p;
  });

  it('uses default 0.5s duration', async () => {
    const tm = await createTransition();
    const p = tm.fadeOut();
    expect(overlayStyle.transitionDuration).toBe('0.5s');
    fireTransitionEnd();
    await p;
  });
});
