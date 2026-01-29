import Phaser from 'phaser';
import { gameConfig } from '@/config/game.config';

/**
 * 游戏入口文件
 */

const loadGameFonts = async (): Promise<void> => {
  if (!document?.fonts) return;
  try {
    await document.fonts.load('16px "GameSerif"');
    await document.fonts.ready;
  } catch (error) {
    console.warn('GameSerif 字体加载失败，继续使用系统 serif。', error);
  }
};

let game: Phaser.Game;

const startGame = async (): Promise<void> => {
  await loadGameFonts();

  // 创建游戏实例
  game = new Phaser.Game(gameConfig);

  // 开发环境下的调试信息
  if (import.meta.env.DEV) {
    console.log('🎮 Phaser游戏已启动');
    console.log('📦 Phaser版本:', Phaser.VERSION);
    console.log('🌐 API地址:', import.meta.env.VITE_API_URL || 'http://localhost:3000');
    console.log('🔌 WebSocket地址:', import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000');
  }
};

void startGame();

// 导出游戏实例，供其他模块使用（如需要）
export default game;
