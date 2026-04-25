import type { Socket } from 'socket.io-client';
import type { PluginRegistryEntry } from '../shared/types.js';

interface UIState {
  activePlugin: string | null;
  gain: number;
  plugins: PluginRegistryEntry[];
}

const TYPE_LABELS: Record<string, string> = {
  shader: 'shader',
  butterchurn: 'milkdrop',
  slideshow: 'slideshow',
  threejs: '3d',
};

export function renderUI(
  container: HTMLElement,
  socket: Socket,
  state: UIState,
): void {
  const pluginButtons = state.plugins
    .map((p) => {
      const isActive = p.id === state.activePlugin;
      const badge = TYPE_LABELS[p.config.type] || p.config.type;
      return `<button class="plugin-btn${isActive ? ' active' : ''}" data-plugin-id="${p.id}">
        <span class="plugin-name">${p.config.name}</span>
        <span class="plugin-badge">${badge}</span>
      </button>`;
    })
    .join('');

  container.innerHTML = `
    <div class="admin-ui">
      <div class="status connected">Connected</div>
      <h2>Plugins</h2>
      <div class="plugin-list">${pluginButtons}</div>
      <div class="gain-control">
        <label for="gain-slider">Gain: <span class="gain-value">${state.gain}</span></label>
        <input id="gain-slider" type="range" min="0" max="2" step="0.1" value="${state.gain}" />
      </div>
    </div>
  `;

  container.querySelectorAll('.plugin-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pluginId = (btn as HTMLElement).dataset.pluginId;
      if (pluginId) socket.emit('switch-plugin', { pluginId });
    });
  });

  const slider = container.querySelector('#gain-slider') as HTMLInputElement;
  const gainValue = container.querySelector('.gain-value')!;
  slider?.addEventListener('input', () => {
    const gain = parseFloat(slider.value);
    gainValue.textContent = String(gain);
    socket.emit('set-gain', { gain });
  });
}
