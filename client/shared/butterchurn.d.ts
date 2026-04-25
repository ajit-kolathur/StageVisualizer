declare module 'butterchurn' {
  const butterchurn: {
    createVisualizer(
      audioContext: AudioContext,
      canvas: HTMLCanvasElement,
      options: { width: number; height: number },
    ): {
      connectAudio(node: AudioNode): void;
      loadPreset(preset: object, blendTime: number): void;
      setRendererSize(width: number, height: number): void;
      render(): void;
    };
  };
  export default butterchurn;
}
