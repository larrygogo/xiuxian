/**
 * 游戏常量定义
 */

// 游戏尺寸（竖屏模式 9:16）
export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;

// 背包配置
export const INVENTORY_SIZE = 20;
export const INVENTORY_COLS = 5;
export const INVENTORY_ROWS = 4;

// 战斗配置
export const BATTLE_GRID_COLS = 5;
export const BATTLE_GRID_ROWS = 2;
export const BATTLE_TURN_TIME = 30; // 秒

// UI配置
export const MIN_TOUCH_SIZE = 44; // 最小触摸区域（像素）
export const DRAG_THRESHOLD = 10; // 拖拽阈值（像素）
export const LONG_PRESS_TIME = 500; // 长按时间（毫秒）
export const DOUBLE_TAP_TIME = 300; // 双击时间（毫秒）

// 颜色常量
export const COLORS = {
  primary: 0x3498db,
  success: 0x2ecc71,
  warning: 0xf39c12,
  danger: 0xe74c3c,
  dark: 0x2c3e50,
  light: 0xecf0f1,
  white: 0xffffff,
  black: 0x000000,
  hp: {
    high: 0x2ecc71,  // >50%
    medium: 0xf39c12, // 25-50%
    low: 0xe74c3c     // <25%
  }
};

// 场景Key
export const SCENE_KEYS = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  LOGIN: 'LoginScene',
  CHARACTER_CREATE: 'CharacterCreateScene',
  MAIN: 'MainScene',
  BATTLE: 'BattleScene',
  UI: 'UIScene'
};

// 资源Key
export const TEXTURE_KEYS = {
  // UI
  PANEL_BG: 'panel-bg',
  BUTTON_BG: 'button-bg',
  INPUT_BG: 'input-bg',
  SLOT_BG: 'slot-bg',

  // 图标
  ICON_BAG: 'icon-bag',
  ICON_CHARACTER: 'icon-character',
  ICON_SETTINGS: 'icon-settings',
  ICON_ADMIN: 'icon-admin',

  // 占位符
  PLACEHOLDER: 'placeholder'
};

// 音效Key
export const AUDIO_KEYS = {
  BGM_MAIN: 'bgm-main',
  BGM_BATTLE: 'bgm-battle',
  SFX_CLICK: 'sfx-click',
  SFX_ATTACK: 'sfx-attack',
  SFX_HIT: 'sfx-hit',
  SFX_HEAL: 'sfx-heal',
  SFX_LEVELUP: 'sfx-levelup'
};

// LocalStorage Key
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  SETTINGS: 'settings',
  PANEL_POSITIONS: 'panel-positions'
};
