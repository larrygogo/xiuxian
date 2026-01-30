import Phaser from 'phaser';

export const waitForGameReady = (game: Phaser.Game): Promise<Phaser.Game> => {
  return new Promise((resolve) => {
    if (game.isBooted) {
      resolve(game);
      return;
    }
    game.events.once(Phaser.Core.Events.READY, () => resolve(game));
  });
};

export const waitForSceneCreate = (scene: Phaser.Scene | null, timeoutMs = 2000): Promise<Phaser.Scene> => {
  return new Promise((resolve, reject) => {
    if (!scene) {
      reject(new Error('Scene not found'));
      return;
    }
    const start = Date.now();
    const poll = () => {
      if (scene.sys && scene.events) {
        if (scene.sys.isActive()) {
          resolve(scene);
          return;
        }
        scene.events.once(Phaser.Scenes.Events.CREATE, () => resolve(scene));
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error('Scene not initialized'));
        return;
      }
      setTimeout(poll, 10);
    };
    poll();
  });
};

export const waitForSceneByKey = (game: Phaser.Game, key: string, timeoutMs = 2000): Promise<Phaser.Scene> => {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = () => {
      const scene = game.scene.getScene(key) as Phaser.Scene | null;
      if (scene) {
        resolve(scene);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Scene not found: ${key}`));
        return;
      }
      setTimeout(poll, 10);
    };
    poll();
  });
};

export const createHeadlessGame = (scenes: Phaser.Types.Scenes.SceneType[] = []): Phaser.Game => {
  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    width: 800,
    height: 600,
    renderType: Phaser.CANVAS,
    customEnvironment: true,
    canvas: typeof document !== 'undefined' ? document.createElement('canvas') : undefined,
    scene: scenes.length ? scenes : undefined,
    audio: { noAudio: true },
    fps: { forceSetTimeOut: true },
    input: { activePointers: 1 },
    render: { antialias: false },
    banner: false
  });
  // 手动触发纹理 READY，避免测试环境阻塞启动
  setTimeout(() => {
    game.textures.emit(Phaser.Textures.Events.READY);
  }, 0);
  return game;
};

export const createPointer = (scene: Phaser.Scene, x: number, y: number): Phaser.Input.Pointer => {
  const pointer = new Phaser.Input.Pointer(scene.input.manager, 0);
  pointer.x = x;
  pointer.y = y;
  return pointer;
};
