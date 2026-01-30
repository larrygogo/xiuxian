// 测试环境初始化：为 Phaser 提供必要的浏览器 API
if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    return setTimeout(() => callback(performance.now()), 0) as unknown as number;
  };
}

if (!globalThis.cancelAnimationFrame) {
  globalThis.cancelAnimationFrame = (handle: number): void => {
    clearTimeout(handle);
  };
}

// 确保 Phaser Boot 不被 DOMContentLoaded 阻塞
if (typeof document !== 'undefined' && document.readyState === 'loading') {
  document.dispatchEvent(new Event('DOMContentLoaded'));
  window.dispatchEvent(new Event('load'));
}

// happy-dom 的 Canvas 功能有限，提供最小 2D 上下文避免 Phaser 崩溃
if (typeof HTMLCanvasElement !== 'undefined') {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function getContext(
    this: HTMLCanvasElement,
    _contextId: string
  ) {
    return {
      canvas: this,
      fillStyle: '#000000',
      strokeStyle: '#000000',
      globalAlpha: 1,
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      rect: () => {},
      fillRect: () => {},
      clearRect: () => {},
      strokeRect: () => {},
      fill: () => {},
      stroke: () => {},
      closePath: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      drawImage: () => {},
      setTransform: () => {},
      resetTransform: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      putImageData: () => {}
    };
  };
}

