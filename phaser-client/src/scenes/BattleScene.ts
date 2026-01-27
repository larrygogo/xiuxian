import Phaser from 'phaser';
import { SCENE_KEYS } from '@/config/constants';

/**
 * 战斗场景
 */
export default class BattleScene extends Phaser.Scene {
  private roomId: string = '';

  constructor() {
    super({ key: SCENE_KEYS.BATTLE });
  }

  init(data: { roomId: string }) {
    this.roomId = data.roomId;
  }

  create() {
    console.log('BattleScene: create, roomId:', this.roomId);

    // TODO: 实现战斗UI
  }
}
