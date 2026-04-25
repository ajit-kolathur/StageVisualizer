import { io } from 'socket.io-client';
import { showAuth } from './auth.js';
import { renderUI } from './ui.js';
import { renderGigView } from './gig-view.js';
import type { StateSyncPayload } from '../shared/types.js';

const app = document.getElementById('app')!;
const socket = io();

let authenticated = false;
let lastState: StateSyncPayload | null = null;
let errorPluginId: string | null = null;

function refresh() {
  if (!authenticated || !lastState) return;

  const state = lastState;
  const modeOptions = [
    '<option value="generic">Generic Mode</option>',
    ...state.setlists.map(s =>
      `<option value="${s.id}"${state.mode === 'gig' && state.activeSetlist?.id === s.id ? ' selected' : ''}>${s.name}</option>`
    ),
  ].join('');

  const modeHtml = state.setlists.length
    ? `<div class="mode-toggle"><select class="mode-select">${modeOptions}</select></div>`
    : '';

  // Render status + mode toggle as header
  const header = document.createElement('div');
  header.innerHTML = modeHtml;

  if (state.mode === 'gig' && state.activeSetlist) {
    // Gig mode
    const validIds = new Set(state.plugins.map(p => p.id));
    const gigContainer = document.createElement('div');

    app.innerHTML = '';
    app.innerHTML = `<div class="admin-ui">
      <div class="status connected">Connected</div>
      ${modeHtml}
      <div id="gig-content"></div>
      <div class="gain-control">
        <label for="gain-slider">Gain: <span class="gain-value">${state.gain}</span></label>
        <input id="gain-slider" type="range" min="0" max="2" step="0.1" value="${state.gain}" />
      </div>
    </div>`;

    const gigContent = app.querySelector('#gig-content')!;
    renderGigView(gigContent as HTMLElement, state.activeSetlist, {
      activePlugin: state.activePlugin,
      doneSet: state.doneSet,
      validPluginIds: validIds,
      onSwitchPlugin: (pluginId) => socket.emit('switch-plugin', { pluginId }),
      onMarkDone: (songIndex) => socket.emit('mark-done', { songIndex }),
    });

    // Gain slider
    const slider = app.querySelector('#gain-slider') as HTMLInputElement;
    const gainValue = app.querySelector('.gain-value')!;
    slider?.addEventListener('input', () => {
      const gain = parseFloat(slider.value);
      gainValue.textContent = String(gain);
      socket.emit('set-gain', { gain });
    });
  } else {
    // Generic mode
    renderUI(app, socket as any, { ...state, errorPluginId });
    // Prepend mode toggle after status
    const status = app.querySelector('.status');
    if (status && modeHtml) {
      status.insertAdjacentHTML('afterend', modeHtml);
    }
  }

  // Mode toggle handler
  app.querySelector('.mode-select')?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    if (val === 'generic') {
      socket.emit('set-mode', { mode: 'generic' });
    } else {
      socket.emit('set-mode', { mode: 'gig', setlistId: val });
    }
  });
}

socket.on('state-sync', (data: StateSyncPayload) => {
  lastState = data;
  refresh();
});

socket.on('plugin-changed', (data: { pluginId: string }) => {
  if (lastState) {
    lastState.activePlugin = data.pluginId;
    refresh();
  }
});

socket.on('gain-changed', (data: { gain: number }) => {
  if (lastState) {
    lastState.gain = data.gain;
    refresh();
  }
});

socket.on('plugin-error', (data: { pluginId: string }) => {
  errorPluginId = data.pluginId;
  refresh();
});

showAuth(app, socket as any, () => {
  authenticated = true;
  refresh();
});

socket.on('disconnect', () => {
  const status = app.querySelector('.status');
  if (status) {
    status.className = 'status disconnected';
    status.textContent = 'Disconnected';
  }
});

socket.on('connect', () => {
  const status = app.querySelector('.status');
  if (status) {
    status.className = 'status connected';
    status.textContent = 'Connected';
  }
});
