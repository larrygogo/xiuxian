/**
 * 游戏常量定义
 */

import { Anchor } from '@/ui/layout/Anchors';

// 游戏尺寸（竖屏模式 9:16）
export const GAME_WIDTH = 1080;
export const GAME_HEIGHT = 1920;

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


// 设计稿参考安全区（百分比形式，用于动态计算）
export const SAFE_AREA_DESIGN = {
  top: 80 / 1920,      // 7.8% of design height
  bottom: 150 / 1920,   // 7.8% of design height
  left: 32 / 1080,      // 5.6% of design width
  right: 32 / 1080      // 5.6% of design width
};

// 最小安全区尺寸（像素）
export const MIN_SAFE_AREA = {
  width: 300,   // 最小可用宽度
  height: 500   // 最小可用高度
};

// 外部边距配置
export const EXTERNAL_PADDING = {
  enabled: false,
  minDisplayWidth: 540,   // 低于此宽度时添加外部边距
  minDisplayHeight: 960,  // 低于此高度时添加外部边距
  backgroundColor: '#000000'
};

// 分辨率策略配置（Cocos 设计分辨率 + 策略）
export const RESOLUTION_POLICY = {
  mode: 'AUTO' as const, // AUTO | SHOW_ALL | NO_BORDER | FIXED_WIDTH | FIXED_HEIGHT
  epsilon: 0.05          // 宽高比接近设计比时的容差
};

// 调试配置
export const DEBUG = {
  SHOW_SAFE_AREA: false,  // 是否显示安全区边界（开发时使用）
  SAFE_AREA_COLOR: 0x00ff00,  // 安全区边界颜色（绿色）
  SAFE_AREA_ALPHA: 0.3   // 安全区边界透明度
};

// 顶部状态栏配置
export const TOP_STATUS_BAR = {
  ANCHOR: Anchor.TOP_LEFT,  // 锚点位置
  OFFSET_X: 0,             // X轴偏移
  OFFSET_Y: 0              // Y轴偏移
};

// 底部操作栏配置
export const BOTTOM_BAR = {
  WIDTH: 1380,           // 底部操作栏宽度
  HEIGHT: 160,           // 底部操作栏高度
  BUTTON_SIZE: 150,      // 按钮尺寸
  BUTTON_SPACING: 200,   // 按钮间距
  PADDING_BOTTOM: -20     // 距离屏幕底部的内边距
};

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

// 弹窗配置
export const MODAL_CONFIG = {
  DEFAULT_WIDTH: 400,
  DEFAULT_HEIGHT: 300,
  MASK_COLOR: 0x000000,
  MASK_ALPHA: 0.7,
  CLOSE_ON_MASK_CLICK: true,
  SHOW_ANIMATION: true,
  DEPTH: 1000,
  ANIMATION_SHOW_DURATION: 300,
  ANIMATION_HIDE_DURATION: 200
};

// 点击涟漪效果配置
export const RIPPLE_CONFIG = {
  INITIAL_RADIUS: 8,
  MAX_RADIUS: 50,
  DURATION: 400,
  INITIAL_ALPHA: 0.8,
  COLOR: 0xffffff,        // 主体颜色（白色）
  SHADOW_COLOR: 0x000000, // 阴影颜色（黑色），确保在浅色背景下可见
  STROKE_WIDTH: 3,
  SHADOW_WIDTH: 2         // 阴影额外宽度
};
