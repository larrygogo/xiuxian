import Phaser from 'phaser';
import { gameConfig } from '@/config/game.config';

/**
 * 游戏入口文件
 */

// 创建游戏实例
const game = new Phaser.Game(gameConfig);

// 导出游戏实例，供其他模块使用（如需要）
export default game;

// 开发环境下的调试信息
if (import.meta.env.DEV) {
  console.log('🎮 Phaser游戏已启动');
  console.log('📦 Phaser版本:', Phaser.VERSION);
  console.log('🌐 API地址:', import.meta.env.VITE_API_URL || 'http://localhost:3000');
  console.log('🔌 WebSocket地址:', import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000');
}
