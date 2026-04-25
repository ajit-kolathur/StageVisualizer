declare module 'butterchurn' {
  interface ButterchurnVisualizer {
    connectAudio(node: AudioNode): void;
    loadPreset(preset: object, blendTime: number): void;
    setRendererSize(width: number, height: number): void;
    render(): void;
  }
  interface Butterchurn {
    createVisualizer(
      audioContext: AudioContext,
      canvas: HTMLCanvasElement,
      options: { width: number; height: number },
    ): ButterchurnVisualizer;
  }
  const butterchurn: { default: Butterchurn };
  export default butterchurn;
}
