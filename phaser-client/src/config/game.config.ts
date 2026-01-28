import Phaser from 'phaser';
import BootScene from '@/scenes/BootScene';
import PreloadScene from '@/scenes/PreloadScene';
import LoginScene from '@/scenes/LoginScene';
import CharacterCreateScene from '@/scenes/CharacterCreateScene';
import MainScene from '@/scenes/MainScene';
import BattleScene from '@/scenes/BattleScene';
import UIScene from '@/scenes/UIScene';
import TestScene from '@/scenes/TestScene';
import { GAME_WIDTH, GAME_HEIGHT } from './constants';

/**
 * 缩放模式选择
 *
 * 可选方案：
 * 1. RESIZE - 动态调整游戏尺寸匹配容器（无letterboxing）
 * 2. ENVELOP - 保持宽高比填充（有letterboxing）
 * 3. WIDTH_CONTROLS_HEIGHT - 宽度固定，高度自适应
 * 4. FIT - 保持比例，有黑边（适合桌面端）
 *
 * 当前使用：ENVELOP（保持比例覆盖屏幕，配合策略与安全区）
 */
const SCALE_MODE = Phaser.Scale.ENVELOP;

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
    mode: SCALE_MODE,
    parent: 'game-container',
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // ENVELOP模式：保持比例覆盖屏幕（可能裁剪）
    // UI布局使用安全区与分辨率策略（见SafeAreaManager/ResponsiveHelper）
  },
  scene: [
    BootScene,
    PreloadScene,
    LoginScene,
    MainScene,
    CharacterCreateScene,
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
