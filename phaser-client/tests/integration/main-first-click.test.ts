import Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { createHeadlessGame, createPointer, waitForGameReady, waitForSceneCreate } from '../helpers/createHeadlessGame';

class TestLoginScene extends Phaser.Scene {
  constructor() {
    super({ key: 'login' });
  }

  create(): void {
    this.input.once('pointerup', () => {
      this.scene.start('main');
    });
  }
}

class TestMainScene extends Phaser.Scene {
  public clickCount = 0;

  constructor() {
    super({ key: 'main' });
  }

  create(): void {
    this.input.on('pointerdown', () => {
      this.clickCount += 1;
    });
  }
}

describe('Main scene first click', () => {
  it('triggers on the first click after scene switch', async () => {
    const game = createHeadlessGame();

    try {
      await waitForGameReady(game);

      const loginScene = new TestLoginScene();
      const mainScene = new TestMainScene();
      game.scene.add('login', loginScene, true);
      game.scene.add('main', mainScene, false);
      await waitForSceneCreate(loginScene);

      const loginPointer = createPointer(loginScene, 10, 10);
      loginScene.input.emit('pointerup', loginPointer, []);

      await waitForSceneCreate(mainScene);

      const mainPointer = createPointer(mainScene, 20, 20);
      mainScene.input.emit('pointerdown', mainPointer, []);

      expect(mainScene.clickCount).toBe(1);
    } finally {
      game.destroy(true);
    }
  });
});
