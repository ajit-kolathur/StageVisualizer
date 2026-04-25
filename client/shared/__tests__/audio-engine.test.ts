import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioEngine } from '../audio-engine.js';
import type { AudioData } from '../types.js';

// --- Web Audio API mocks ---

function createMockAnalyser() {
  return {
    fftSize: 0,
    frequencyBinCount: 1024,
    smoothingTimeConstant: 0,
    getByteFrequencyData: vi.fn((arr: Uint8Array) => arr.fill(0)),
    getByteTimeDomainData: vi.fn((arr: Uint8Array) => arr.fill(128)),
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

function createMockGain() {
  return {
    gain: { value: 1 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

function createMockSource() {
  return { connect: vi.fn(), disconnect: vi.fn() };
}

function setupWebAudioMocks(analyser = createMockAnalyser(), gain = createMockGain()) {
  const source = createMockSource();
  const mockContext = {
    createAnalyser: vi.fn(() => analyser),
    createGain: vi.fn(() => gain),
    createMediaStreamSource: vi.fn(() => source),
  };

  vi.stubGlobal('AudioContext', vi.fn(() => mockContext));
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: vi.fn().mockResolvedValue({ id: 'mock-stream' }),
    },
  });

  return { mockContext, analyser, gain, source };
}

// --- Tests ---

describe('AudioEngine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('init()', () => {
    it('requests mic permission and builds audio graph', async () => {
      const { mockContext } = setupWebAudioMocks();
      const engine = new AudioEngine();
      await engine.init();

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
      expect(mockContext.createMediaStreamSource).toHaveBeenCalled();
      expect(mockContext.createGain).toHaveBeenCalled();
      expect(mockContext.createAnalyser).toHaveBeenCalled();
    });

    it('configures analyser with fftSize 2048', async () => {
      const analyser = createMockAnalyser();
      setupWebAudioMocks(analyser);
      const engine = new AudioEngine();
      await engine.init();

      expect(analyser.fftSize).toBe(2048);
    });

    it('connects source → gain → analyser', async () => {
      const analyser = createMockAnalyser();
      const gain = createMockGain();
      const { source } = setupWebAudioMocks(analyser, gain);
      const engine = new AudioEngine();
      await engine.init();

      expect(source.connect).toHaveBeenCalledWith(gain);
      expect(gain.connect).toHaveBeenCalledWith(analyser);
    });

    it('handles mic permission denied gracefully', async () => {
      setupWebAudioMocks();
      vi.stubGlobal('navigator', {
        mediaDevices: {
          getUserMedia: vi.fn().mockRejectedValue(new DOMException('Not allowed', 'NotAllowedError')),
        },
      });

      const engine = new AudioEngine();
      await expect(engine.init()).resolves.toBeUndefined();
      expect(engine.micDenied).toBe(true);
    });

    it('sets micDenied to false when permission is granted', async () => {
      setupWebAudioMocks();
      const engine = new AudioEngine();
      await engine.init();
      expect(engine.micDenied).toBe(false);
    });
  });

  describe('getData()', () => {
    it('returns AudioData with correct structure', async () => {
      setupWebAudioMocks();
      const engine = new AudioEngine();
      await engine.init();
      const data = engine.getData();

      expect(data).toHaveProperty('frequencyData');
      expect(data).toHaveProperty('timeDomainData');
      expect(data).toHaveProperty('bass');
      expect(data).toHaveProperty('mids');
      expect(data).toHaveProperty('treble');
      expect(data).toHaveProperty('volume');
      expect(data.frequencyData).toBeInstanceOf(Uint8Array);
      expect(data.timeDomainData).toBeInstanceOf(Uint8Array);
    });

    it('returns values between 0 and 1 for derived fields', async () => {
      const analyser = createMockAnalyser();
      analyser.getByteFrequencyData = vi.fn((arr: Uint8Array) => arr.fill(200));
      setupWebAudioMocks(analyser);

      const engine = new AudioEngine();
      await engine.init();
      const data = engine.getData();

      for (const key of ['bass', 'mids', 'treble', 'volume'] as const) {
        expect(data[key]).toBeGreaterThanOrEqual(0);
        expect(data[key]).toBeLessThanOrEqual(1);
      }
    });

    it('returns zeroed data when mic permission was denied', async () => {
      setupWebAudioMocks();
      vi.stubGlobal('navigator', {
        mediaDevices: {
          getUserMedia: vi.fn().mockRejectedValue(new DOMException('Not allowed', 'NotAllowedError')),
        },
      });

      const engine = new AudioEngine();
      await engine.init();
      const data = engine.getData();

      expect(data.bass).toBe(0);
      expect(data.mids).toBe(0);
      expect(data.treble).toBe(0);
      expect(data.volume).toBe(0);
      expect(data.frequencyData.every((v) => v === 0)).toBe(true);
    });

    it('computes band energies from correct frequency bin ranges', async () => {
      const analyser = createMockAnalyser();
      analyser.frequencyBinCount = 100;
      analyser.getByteFrequencyData = vi.fn((arr: Uint8Array) => {
        // bass bins (0-10): fill with 255
        // mid bins (10-50): fill with 0
        // treble bins (50-100): fill with 0
        arr.fill(0);
        for (let i = 0; i < 10; i++) arr[i] = 255;
      });
      setupWebAudioMocks(analyser);

      const engine = new AudioEngine();
      await engine.init();
      const data = engine.getData();

      expect(data.bass).toBeGreaterThan(0);
      expect(data.mids).toBe(0);
      expect(data.treble).toBe(0);
    });
  });

  describe('setGain()', () => {
    it('updates gain node value', async () => {
      const gain = createMockGain();
      setupWebAudioMocks(createMockAnalyser(), gain);

      const engine = new AudioEngine();
      await engine.init();
      engine.setGain(1.5);

      expect(gain.gain.value).toBe(1.5);
    });

    it('clamps gain to 0-2 range', async () => {
      const gain = createMockGain();
      setupWebAudioMocks(createMockAnalyser(), gain);

      const engine = new AudioEngine();
      await engine.init();

      engine.setGain(-1);
      expect(gain.gain.value).toBe(0);

      engine.setGain(5);
      expect(gain.gain.value).toBe(2);
    });

    it('is a no-op when mic permission was denied', async () => {
      setupWebAudioMocks();
      vi.stubGlobal('navigator', {
        mediaDevices: {
          getUserMedia: vi.fn().mockRejectedValue(new DOMException('Not allowed', 'NotAllowedError')),
        },
      });

      const engine = new AudioEngine();
      await engine.init();
      expect(() => engine.setGain(1.5)).not.toThrow();
    });
  });
});
