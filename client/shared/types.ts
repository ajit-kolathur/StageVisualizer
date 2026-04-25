export interface AudioData {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  bass: number;
  mids: number;
  treble: number;
  volume: number;
}
