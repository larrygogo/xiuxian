/**
 * UI组件相关类型定义
 */

import type Phaser from 'phaser';

// UI面板配置
export interface UIPanelConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  draggable?: boolean;
  closable?: boolean;
  storageKey?: string; // localStorage中保存位置的key
}

// UI按钮背景图配置
export interface UIButtonBackgroundImageConfig {
  key: string;              // 图片资源key
  width?: number;           // 显示宽度（可选，不设置则使用原始尺寸）
  height?: number;          // 显示高度（可选，不设置则使用原始尺寸）
  offsetX?: number;         // X偏移量，默认0
  offsetY?: number;         // Y偏移量，默认0
}

// UI按钮配置
export interface UIButtonConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  icon?: string;
  textStyle?: Phaser.Types.GameObjects.Text.TextStyle;
  backgroundImage?: UIButtonBackgroundImageConfig;  // 背景图配置
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

// UI输入框配置
export interface UIInputConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
  placeholder?: string;
  type?: 'text' | 'password' | 'number';
  maxLength?: number;
  textStyle?: Phaser.Types.GameObjects.Text.TextStyle;
  backgroundColor?: number;
  borderColor?: number;
  textColor?: string;
  placeholderColor?: string;
}

// UI进度条配置
export interface UIProgressBarConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
  barColor?: number;
  backgroundColor?: number;
  value?: number; // 0-1
  borderColor?: number; // 描边颜色
  borderWidth?: number; // 描边宽度
  borderRadius?: number; // 圆角半径
}

// UI提示框配置
export interface UITooltipConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  text: string;
  width?: number;
  textStyle?: Phaser.Types.GameObjects.Text.TextStyle;
}

// Toast通知配置
export interface ToastConfig {
  message: string;
  duration?: number; // 毫秒，默认3000
  type?: 'info' | 'success' | 'warning' | 'error';
}

// Confirm对话框配置
export interface ConfirmConfig {
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

// 物品槽位配置
export interface ItemSlotConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  size?: number;
  index?: number;
}
