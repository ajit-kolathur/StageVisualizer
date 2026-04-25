import type { Setlist } from '../shared/types.js';

interface GigViewOptions {
  activePlugin: string | null;
  doneSet: number[];
  validPluginIds: Set<string>;
  onSwitchPlugin: (pluginId: string) => void;
  onMarkDone: (songIndex: number) => void;
}

export function renderGigView(
  container: HTMLElement,
  setlist: Setlist,
  options: GigViewOptions,
): void {
  const rows = setlist.entries.map((entry, i) => {
    const isActive = entry.pluginId === options.activePlugin;
    const isDone = options.doneSet.includes(i);
    const isValid = options.validPluginIds.has(entry.pluginId);
    const classes = ['gig-row', isActive && 'active', isDone && 'done', !isValid && 'warning'].filter(Boolean).join(' ');

    return `<div class="${classes}" data-index="${i}" data-plugin-id="${entry.pluginId}" data-valid="${isValid}">
      <input type="checkbox" class="gig-checkbox" ${isDone ? 'checked' : ''} />
      <span class="gig-song">${entry.song}</span>
      <span class="gig-plugin">${isValid ? '' : '⚠ '}${entry.pluginId.replace(/^butterchurn:/, '')}</span>
    </div>`;
  }).join('');

  container.innerHTML = `<div class="gig-list">${rows}</div>`;

  container.querySelectorAll('.gig-row').forEach(row => {
    const el = row as HTMLElement;
    const idx = parseInt(el.dataset.index!, 10);
    const valid = el.dataset.valid === 'true';

    el.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('gig-checkbox')) return;
      if (valid) options.onSwitchPlugin(el.dataset.pluginId!);
    });

    row.querySelector('.gig-checkbox')?.addEventListener('click', (e) => {
      e.stopPropagation();
      options.onMarkDone(idx);
    });
  });
}
