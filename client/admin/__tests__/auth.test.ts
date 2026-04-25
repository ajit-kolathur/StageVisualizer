import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PluginRegistryEntry, StateSyncPayload } from '../../shared/types.js';

const PLUGINS: PluginRegistryEntry[] = [
  { id: 'fractal-pulse', config: { name: 'Fractal Pulse', type: 'shader' } },
  { id: 'kaleidoscope-wave', config: { name: 'Kaleidoscope Wave', type: 'shader' } },
  { id: 'milkdrop-cosmic', config: { name: 'MilkDrop Cosmic', type: 'butterchurn' } },
];

let container: { innerHTML: string; querySelector: ReturnType<typeof vi.fn> };
let mockSocket: { emit: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn> };

beforeEach(() => {
  container = {
    innerHTML: '',
    querySelector: vi.fn((sel: string) => {
      // Parse the innerHTML to find elements
      if (sel === '.pin-input') return { value: '1234', focus: vi.fn() };
      if (sel === '.pin-error') return { textContent: '', style: { display: '' } };
      if (sel === '.pin-form') return { addEventListener: vi.fn() };
      return null;
    }),
  };
  mockSocket = {
    emit: vi.fn(),
    on: vi.fn(),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('showAuth', () => {
  async function loadAuth() {
    const { showAuth } = await import('../auth.js');
    return showAuth;
  }

  it('renders PIN form into container', async () => {
    const showAuth = await loadAuth();
    showAuth(container as any, mockSocket as any, vi.fn());
    expect(container.innerHTML).toContain('pin');
  });

  it('sends auth event with PIN on submit', async () => {
    const showAuth = await loadAuth();
    const onSuccess = vi.fn();
    showAuth(container as any, mockSocket as any, onSuccess);

    // The auth module should register a callback-based auth or listen for auth-result
    // Find the submit handler and trigger it
    const formEl = {
      addEventListener: vi.fn(),
    };
    const inputEl = { value: '5678', focus: vi.fn() };
    const errorEl = { textContent: '', style: { display: '' } };

    container.querySelector = vi.fn((sel: string) => {
      if (sel === '.pin-form') return formEl;
      if (sel === '.pin-input') return inputEl;
      if (sel === '.pin-error') return errorEl;
      return null;
    });

    showAuth(container as any, mockSocket as any, onSuccess);

    // Get the submit handler
    const submitCall = formEl.addEventListener.mock.calls.find(
      (c: any[]) => c[0] === 'submit'
    );
    expect(submitCall).toBeTruthy();

    // Simulate submit
    submitCall![1]({ preventDefault: vi.fn() });
    expect(mockSocket.emit).toHaveBeenCalledWith('auth', { pin: '5678' });
  });

  it('calls onSuccess when auth succeeds', async () => {
    const showAuth = await loadAuth();
    const onSuccess = vi.fn();
    showAuth(container as any, mockSocket as any, onSuccess);

    // Find the auth-result listener
    const authResultCall = mockSocket.on.mock.calls.find(
      (c: any[]) => c[0] === 'auth-result'
    );
    expect(authResultCall).toBeTruthy();

    // Simulate success
    authResultCall![1]({ success: true });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('shows error on auth failure', async () => {
    const showAuth = await loadAuth();
    const onSuccess = vi.fn();

    const errorEl = { textContent: '', style: { display: '' } };
    container.querySelector = vi.fn((sel: string) => {
      if (sel === '.pin-error') return errorEl;
      if (sel === '.pin-form') return { addEventListener: vi.fn() };
      if (sel === '.pin-input') return { value: '', focus: vi.fn() };
      return null;
    });

    showAuth(container as any, mockSocket as any, onSuccess);

    const authResultCall = mockSocket.on.mock.calls.find(
      (c: any[]) => c[0] === 'auth-result'
    );
    authResultCall![1]({ success: false });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(errorEl.textContent).toBeTruthy();
  });
});
