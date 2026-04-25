import type { AudioData } from './types.js';

const FFT_SIZE = 2048;

export class AudioEngine {
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private freqBuffer: Uint8Array<ArrayBuffer> | null = null;
  private timeBuffer: Uint8Array<ArrayBuffer> | null = null;
  private _denied = false;
  get micDenied() { return this._denied; }

  async init(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);

      this.gainNode = ctx.createGain();
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = FFT_SIZE;
      this.analyser.smoothingTimeConstant = 0.8;

      source.connect(this.gainNode);
      this.gainNode.connect(this.analyser);

      const bins = this.analyser.frequencyBinCount;
      this.freqBuffer = new Uint8Array(bins);
      this.timeBuffer = new Uint8Array(bins);
    } catch {
      this._denied = true;
    }
  }

  getData(): AudioData {
    if (this._denied || !this.analyser || !this.freqBuffer || !this.timeBuffer) {
      const empty = new Uint8Array(FFT_SIZE / 2);
      return { frequencyData: empty, timeDomainData: empty, bass: 0, mids: 0, treble: 0, volume: 0 };
    }

    this.analyser.getByteFrequencyData(this.freqBuffer);
    this.analyser.getByteTimeDomainData(this.timeBuffer);

    const bins = this.analyser.frequencyBinCount;
    const bassEnd = Math.floor(bins * 0.1);
    const midEnd = Math.floor(bins * 0.5);

    return {
      frequencyData: this.freqBuffer,
      timeDomainData: this.timeBuffer,
      bass: bandEnergy(this.freqBuffer, 0, bassEnd),
      mids: bandEnergy(this.freqBuffer, bassEnd, midEnd),
      treble: bandEnergy(this.freqBuffer, midEnd, bins),
      volume: bandEnergy(this.freqBuffer, 0, bins),
    };
  }

  setGain(value: number): void {
    if (!this.gainNode) return;
    this.gainNode.gain.value = Math.max(0, Math.min(2, value));
  }
}

function bandEnergy(data: Uint8Array, start: number, end: number): number {
  if (end <= start) return 0;
  let sum = 0;
  for (let i = start; i < end; i++) sum += data[i];
  return sum / ((end - start) * 255);
}
