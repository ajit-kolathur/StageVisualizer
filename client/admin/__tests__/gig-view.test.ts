// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Setlist } from '../../shared/types.js';

const SETLIST: Setlist = {
  id: 'demo',
  name: 'Demo',
  entries: [
    { song: 'Opening Jam', pluginId: 'fractal-pulse' },
    { song: 'Electric Dreams', pluginId: 'butterchurn:Flexi - mindblob' },
    { song: 'Slow Dance', pluginId: 'missing-plugin' },
  ],
};

const VALID_IDS = new Set(['fractal-pulse', 'butterchurn:Flexi - mindblob']);

describe('renderGigView', () => {
  let container: HTMLDivElement;
  let onSwitch: ReturnType<typeof vi.fn>;
  let onMarkDone: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    onSwitch = vi.fn();
    onMarkDone = vi.fn();
  });

  async function render(activePlugin: string | null = null, doneSet: number[] = []) {
    const { renderGigView } = await import('../gig-view.js');
    renderGigView(container, SETLIST, {
      activePlugin,
      doneSet,
      validPluginIds: VALID_IDS,
      onSwitchPlugin: onSwitch,
      onMarkDone: onMarkDone,
    });
  }

  it('renders all songs with names', async () => {
    await render();
    for (const entry of SETLIST.entries) {
      expect(container.innerHTML).toContain(entry.song);
    }
  });

  it('row tap calls onSwitchPlugin with pluginId', async () => {
    await render();
    const rows = container.querySelectorAll('.gig-row');
    (rows[0] as HTMLElement).click();
    expect(onSwitch).toHaveBeenCalledWith('fractal-pulse');
  });

  it('checkbox tap calls onMarkDone with index', async () => {
    await render();
    const checkboxes = container.querySelectorAll('.gig-checkbox');
    (checkboxes[1] as HTMLElement).click();
    expect(onMarkDone).toHaveBeenCalledWith(1);
  });

  it('done songs have done styling', async () => {
    await render(null, [0]);
    const rows = container.querySelectorAll('.gig-row');
    expect(rows[0].classList.contains('done')).toBe(true);
    expect(rows[1].classList.contains('done')).toBe(false);
  });

  it('active song is highlighted', async () => {
    await render('fractal-pulse');
    const rows = container.querySelectorAll('.gig-row');
    expect(rows[0].classList.contains('active')).toBe(true);
    expect(rows[1].classList.contains('active')).toBe(false);
  });

  it('invalid plugin shows warning and tap does nothing', async () => {
    await render();
    const rows = container.querySelectorAll('.gig-row');
    expect(rows[2].classList.contains('warning')).toBe(true);
    (rows[2] as HTMLElement).click();
    expect(onSwitch).not.toHaveBeenCalled();
  });
});
