import Phaser from 'phaser';
import BootScene from '@/scenes/BootScene';
import PreloadScene from '@/scenes/PreloadScene';
import LoginScene from '@/scenes/LoginScene';
import CharacterCreateScene from '@/scenes/CharacterCreateScene';
import MainScene from '@/scenes/MainScene';
import BattleScene from '@/scenes/BattleScene';
import UIScene from '@/scenes/UIScene';
import { GAME_WIDTH, GAME_HEIGHT } from './constants';

/**
 * Phaser游戏核心配置
 */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1a1a1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT
  },
  scene: [
    BootScene,
    PreloadScene,
    LoginScene,
    CharacterCreateScene,
    MainScene,
    BattleScene,
    UIScene
  ],
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { x: 0, y: 0 }
    }
  },
  render: {
    pixelArt: false,
    antialias: true
  },
  // TODO: 集成rexUI插件
  // plugins: {
  //   scene: [
  //     {
  //       key: 'rexUI',
  //       plugin: require('phaser3-rex-plugins').UIPlugin,
  //       mapping: 'rexUI'
  //     }
  //   ]
  // }
};
