import type { Socket } from 'socket.io-client';
import type { PluginRegistryEntry } from '../shared/types.js';

export interface UIState {
  activePlugin: string | null;
  gain: number;
  plugins: PluginRegistryEntry[];
  errorPluginId?: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  shader: 'shader',
  butterchurn: 'milkdrop',
  slideshow: 'slideshow',
  threejs: '3d',
};

const SECTION_NAMES: Record<string, string> = {
  shader: 'Shaders',
  butterchurn: 'MilkDrop',
  slideshow: 'Slideshows',
  threejs: 'Three.js',
};

function displayName(plugin: PluginRegistryEntry): string {
  if (plugin.id.startsWith('butterchurn:')) return plugin.id.slice('butterchurn:'.length);
  return plugin.config.name;
}

function groupByType(plugins: PluginRegistryEntry[]): Map<string, PluginRegistryEntry[]> {
  const groups = new Map<string, PluginRegistryEntry[]>();
  for (const p of plugins) {
    const type = p.config.type;
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type)!.push(p);
  }
  return groups;
}

export function renderUI(
  container: HTMLElement,
  socket: Socket,
  state: UIState,
): void {
  const errorPlugin = state.errorPluginId
    ? state.plugins.find(p => p.id === state.errorPluginId)
    : null;
  const errorHtml = errorPlugin
    ? `<div class="error-notification">⚠ Error: ${errorPlugin.config.name} crashed</div>`
    : '';

  const groups = groupByType(state.plugins);
  const order = ['shader', 'butterchurn', 'slideshow', 'threejs'];

  let sectionsHtml = '';
  for (const type of order) {
    const plugins = groups.get(type);
    if (!plugins?.length) continue;
    const label = SECTION_NAMES[type] || type;
    const collapsed = type === 'butterchurn' ? ' collapsed' : '';
    const badge = TYPE_LABELS[type] || type;

    const buttons = plugins.map(p => {
      const isActive = p.id === state.activePlugin;
      return `<button class="plugin-btn${isActive ? ' active' : ''}" data-plugin-id="${p.id}">
        <span class="plugin-name">${displayName(p)}</span>
        <span class="plugin-badge">${badge}</span>
      </button>`;
    }).join('');

    sectionsHtml += `<div class="plugin-section" data-type="${type}">
      <div class="section-header">${label} (${plugins.length})</div>
      <div class="section-plugins${collapsed}">${buttons}</div>
    </div>`;
  }

  container.innerHTML = `
    <div class="admin-ui">
      <div class="status connected">Connected</div>
      ${errorHtml}
      <input class="search-input" type="text" placeholder="Search plugins..." />
      ${sectionsHtml}
      <div class="gain-control">
        <label for="gain-slider">Gain: <span class="gain-value">${state.gain}</span></label>
        <input id="gain-slider" type="range" min="0" max="2" step="0.1" value="${state.gain}" />
      </div>
    </div>
  `;

  // Section collapse toggle
  container.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', () => {
      const plugins = header.nextElementSibling as HTMLElement;
      plugins?.classList.toggle('collapsed');
    });
  });

  // Plugin click
  container.querySelectorAll('.plugin-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pluginId = (btn as HTMLElement).dataset.pluginId;
      if (pluginId) socket.emit('switch-plugin', { pluginId });
    });
  });

  // Search
  const searchInput = container.querySelector('.search-input') as HTMLInputElement;
  searchInput?.addEventListener('input', () => {
    const term = searchInput.value.toLowerCase();
    container.querySelectorAll('.plugin-section').forEach(section => {
      let visible = 0;
      section.querySelectorAll('.plugin-btn').forEach(btn => {
        const name = btn.querySelector('.plugin-name')?.textContent?.toLowerCase() || '';
        const show = !term || name.includes(term);
        (btn as HTMLElement).style.display = show ? '' : 'none';
        if (show) visible++;
      });
      (section as HTMLElement).style.display = visible ? '' : 'none';
      // Expand section when searching
      if (term && visible) {
        section.querySelector('.section-plugins')?.classList.remove('collapsed');
      }
    });
  });

  // Gain slider
  const slider = container.querySelector('#gain-slider') as HTMLInputElement;
  const gainValue = container.querySelector('.gain-value')!;
  slider?.addEventListener('input', () => {
    const gain = parseFloat(slider.value);
    gainValue.textContent = String(gain);
    socket.emit('set-gain', { gain });
  });
}
