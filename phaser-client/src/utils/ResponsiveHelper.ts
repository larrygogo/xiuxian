/**
 * 自适应布局辅助工具
 * 负责处理不同屏幕尺寸下的安全区计算和布局适配
 */

import Phaser from 'phaser';
import { ResolutionPolicy, resolveResolution, type ResolutionInfo, type ResolutionPolicyOptions } from './ResolutionPolicy';

export interface SafeArea {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;   // 可用宽度
  height: number;  // 可用高度
  centerX: number; // 安全区中心X
  centerY: number; // 安全区中心Y
}

export interface DeviceSafeInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface ResponsiveConfig {
  designWidth: number;   // 设计稿基准宽度
  designHeight: number;  // 设计稿基准高度
  resolutionPolicy?: ResolutionPolicyOptions; // 分辨率策略
  safeMargin?: {         // 安全边距（已废弃，向后兼容）
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  safeMarginPercent?: {  // 安全边距（百分比形式，推荐）
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  minSafeArea?: {        // 最小安全区尺寸
    width: number;
    height: number;
  };
  externalPadding?: {    // 外部边距配置
    enabled: boolean;
    minDisplayWidth: number;
    minDisplayHeight: number;
    backgroundColor: string;
  };
}

/**
 * 自适应布局辅助类
 */
export class ResponsiveHelper {
  private scene: Phaser.Scene;
  private config: ResponsiveConfig;
  private safeArea: SafeArea;
  private deviceInsets: DeviceSafeInsets;
  private resolutionInfo!: ResolutionInfo;

  constructor(scene: Phaser.Scene, config?: Partial<ResponsiveConfig>) {
    this.scene = scene;

    // 默认配置
    this.config = {
      designWidth: 1080,
      designHeight: 1920,
      safeMarginPercent: config?.safeMarginPercent || {
        top: 150 / 1920,     // 7.8% 顶部安全边距（状态栏、刘海屏等）
        bottom: 150 / 1920,  // 7.8% 底部安全边距（底部操作栏）
        left: 60 / 1080,     // 5.6% 左侧安全边距
        right: 60 / 1080     // 5.6% 右侧安全边距
      },
      minSafeArea: config?.minSafeArea || {
        width: 300,
        height: 500
      },
      externalPadding: config?.externalPadding || {
        enabled: true,
        minDisplayWidth: 540,
        minDisplayHeight: 960,
        backgroundColor: '#000000'
      },
      ...config
    };

    // 检测设备安全区插入值
    this.deviceInsets = this.detectDeviceSafeInsets();

    // 应用外部边距（如果需要）
    this.updateExternalPadding();

    // 计算分辨率策略
    this.resolutionInfo = this.calculateResolutionInfo();

    // 计算安全区
    this.safeArea = this.calculateSafeArea();

    // 监听窗口大小变化
    this.scene.scale.on('resize', this.onResize, this);

    // 监听方向变化（移动设备）
    if (typeof window !== 'undefined') {
      window.addEventListener('orientationchange', () => {
        this.deviceInsets = this.detectDeviceSafeInsets();
        this.onResize();
      });
    }
  }

  /**
   * 检测设备特定的安全区插入值（移动设备的刘海屏、Home indicator等）
   * 公开此方法以便SafeAreaManager使用
   */
  public detectDeviceSafeInsets(): DeviceSafeInsets {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return { top: 0, bottom: 0, left: 0, right: 0 };
    }

    // 尝试读取CSS环境变量（iOS/Android安全区）
    const getEnvValue = (name: string): number => {
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue(`env(${name})`);
      return parseInt(value) || 0;
    };

    const top = getEnvValue('safe-area-inset-top');
    const bottom = getEnvValue('safe-area-inset-bottom');
    const left = getEnvValue('safe-area-inset-left');
    const right = getEnvValue('safe-area-inset-right');

    console.log('Device safe insets detected:', { top, bottom, left, right });

    return { top, bottom, left, right };
  }

  /**
   * 计算安全区域（动态计算）
   */
  private calculateSafeArea(): SafeArea {
    const viewRect = this.resolutionInfo.viewRect;

    // 1. 计算基于百分比的参考边距
    const percentMargins = this.config.safeMarginPercent || {
      top: 150 / 1920,
      bottom: 150 / 1920,
      left: 60 / 1080,
      right: 60 / 1080
    };

    const referenceMargins = {
      top: viewRect.height * percentMargins.top,
      bottom: viewRect.height * percentMargins.bottom,
      left: viewRect.width * percentMargins.left,
      right: viewRect.width * percentMargins.right
    };

    // 2. 与设备特定插入值合并（取最大值）
    const deviceInsets = this.getDeviceInsetsInDesign();
    let margins = {
      top: Math.max(deviceInsets.top, referenceMargins.top),
      bottom: Math.max(deviceInsets.bottom, referenceMargins.bottom),
      left: Math.max(deviceInsets.left, referenceMargins.left),
      right: Math.max(deviceInsets.right, referenceMargins.right)
    };

    // 3. 计算安全区尺寸
    let safeWidth = viewRect.width - margins.left - margins.right;
    let safeHeight = viewRect.height - margins.top - margins.bottom;

    // 4. 确保满足最小安全区尺寸
    const minWidth = this.config.minSafeArea?.width || 300;
    const minHeight = this.config.minSafeArea?.height || 500;

    // 5. 如果安全区太小，按比例缩小边距
    if (safeWidth < minWidth) {
      const totalHMargin = margins.left + margins.right;
      const availableMargin = viewRect.width - minWidth;
      if (totalHMargin > 0 && availableMargin > 0) {
        const reductionFactor = availableMargin / totalHMargin;
        margins.left *= reductionFactor;
        margins.right *= reductionFactor;
        safeWidth = viewRect.width - margins.left - margins.right;
      } else {
        // 极端情况：设置边距为0
        margins.left = 0;
        margins.right = 0;
        safeWidth = viewRect.width;
      }
    }

    if (safeHeight < minHeight) {
      const totalVMargin = margins.top + margins.bottom;
      const availableMargin = viewRect.height - minHeight;
      if (totalVMargin > 0 && availableMargin > 0) {
        const reductionFactor = availableMargin / totalVMargin;
        margins.top *= reductionFactor;
        margins.bottom *= reductionFactor;
        safeHeight = viewRect.height - margins.top - margins.bottom;
      } else {
        // 极端情况：设置边距为0
        margins.top = 0;
        margins.bottom = 0;
        safeHeight = viewRect.height;
      }
    }

    // 6. 构建SafeArea对象
    const safeArea: SafeArea = {
      top: viewRect.y + margins.top,
      bottom: viewRect.y + viewRect.height - margins.bottom,
      left: viewRect.x + margins.left,
      right: viewRect.x + viewRect.width - margins.right,
      width: safeWidth,
      height: safeHeight,
      centerX: viewRect.x + margins.left + safeWidth / 2,
      centerY: viewRect.y + margins.top + safeHeight / 2
    };

    console.log('Dynamic safe area calculated:', {
      viewRect,
      deviceInsets: deviceInsets,
      referenceMargins,
      finalMargins: margins,
      safeArea,
      resolution: this.resolutionInfo
    });

    return safeArea;
  }

  /**
   * 更新外部边距（在游戏容器上）
   */
  private updateExternalPadding(): void {
    if (typeof window === 'undefined') return;
    if (!this.config.externalPadding?.enabled) return;

    const gameCanvas = this.scene.game.canvas as HTMLCanvasElement;
    const container = gameCanvas.parentElement;
    if (!container) return;

    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;
    const minWidth = this.config.externalPadding.minDisplayWidth;
    const minHeight = this.config.externalPadding.minDisplayHeight;

    const needsPadding = displayWidth < minWidth || displayHeight < minHeight;

    if (needsPadding) {
      container.style.padding = '20px';
      container.style.backgroundColor = this.config.externalPadding.backgroundColor;
      container.style.display = 'flex';
      container.style.justifyContent = 'center';
      container.style.alignItems = 'center';
      container.style.boxSizing = 'border-box';
      console.log('External padding applied - display too small:', { displayWidth, displayHeight });
    } else {
      container.style.padding = '0';
      container.style.backgroundColor = '';
      container.style.display = '';
      container.style.justifyContent = '';
      container.style.alignItems = '';
    }
  }

  /**
   * 窗口大小变化回调
   */
  private onResize(): void {
    this.updateExternalPadding();
    this.resolutionInfo = this.calculateResolutionInfo();
    this.safeArea = this.calculateSafeArea();
    console.log('Safe area updated on resize:', this.safeArea);
  }

  /**
   * 获取安全区域
   */
  getSafeArea(): SafeArea {
    return { ...this.safeArea };
  }

  /**
   * 获取设备安全插入值（供SafeAreaManager使用）
   */
  getDeviceInsets(): DeviceSafeInsets {
    return { ...this.deviceInsets };
  }

  /**
   * 获取设备安全插入值（转换到设计坐标）
   */
  getDeviceInsetsInDesign(): DeviceSafeInsets {
    const scale = this.resolutionInfo.scale || 1;
    return {
      top: this.deviceInsets.top / scale,
      bottom: this.deviceInsets.bottom / scale,
      left: this.deviceInsets.left / scale,
      right: this.deviceInsets.right / scale
    };
  }

  /**
   * 获取分辨率策略信息
   */
  getResolutionInfo() {
    return { ...this.resolutionInfo, viewRect: { ...this.resolutionInfo.viewRect } };
  }

  /**
   * 获取可视区域（设计坐标）
   */
  getViewRect() {
    return { ...this.resolutionInfo.viewRect };
  }

  /**
   * 获取屏幕尺寸
   */
  getScreenSize(): { width: number; height: number } {
    return {
      width: this.resolutionInfo.viewRect.width,
      height: this.resolutionInfo.viewRect.height
    };
  }

  /**
   * 获取缩放比例（相对于设计稿）
   */
  getScale(): { x: number; y: number; min: number; max: number } {
    const width = this.resolutionInfo.displaySize.width;
    const height = this.resolutionInfo.displaySize.height;
    const scaleX = width / this.config.designWidth;
    const scaleY = height / this.config.designHeight;

    return {
      x: scaleX,
      y: scaleY,
      min: Math.min(scaleX, scaleY),
      max: Math.max(scaleX, scaleY)
    };
  }

  /**
   * 将设计稿坐标转换为实际屏幕坐标（X轴）
   */
  toScreenX(designX: number): number {
    const scale = this.getScale();
    return designX * scale.x;
  }

  /**
   * 将设计稿坐标转换为实际屏幕坐标（Y轴）
   */
  toScreenY(designY: number): number {
    const scale = this.getScale();
    return designY * scale.y;
  }

  /**
   * 将设计稿尺寸转换为实际屏幕尺寸（保持宽高比）
   */
  toScreenSize(designSize: number): number {
    const scale = this.getScale();
    return designSize * scale.min;
  }

  /**
   * 判断是否为窄屏（宽高比小于设计稿）
   */
  isNarrowScreen(): boolean {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    const currentRatio = width / height;
    const designRatio = this.config.designWidth / this.config.designHeight;

    return currentRatio < designRatio;
  }

  /**
   * 判断是否为宽屏（宽高比大于设计稿）
   */
  isWideScreen(): boolean {
    return !this.isNarrowScreen();
  }

  /**
   * 获取底部安全区域（用于底部操作栏）
   */
  getBottomSafeY(): number {
    return this.safeArea.bottom;
  }

  /**
   * 获取顶部安全区域（用于顶部状态栏）
   */
  getTopSafeY(): number {
    return this.safeArea.top;
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.scene.scale.off('resize', this.onResize, this);
  }

  private calculateResolutionInfo() {
    const displaySize = this.getDisplaySize();
    const overridePolicy = this.getPolicyOverrideFromScaleMode();
    return resolveResolution(
      { width: this.config.designWidth, height: this.config.designHeight },
      displaySize,
      {
        ...this.config.resolutionPolicy,
        mode: overridePolicy || this.config.resolutionPolicy?.mode
      }
    );
  }

  private getDisplaySize(): { width: number; height: number } {
    const scaleManager = this.scene.scale as Phaser.Scale.ScaleManager;
    const canvas = this.scene.game.canvas as HTMLCanvasElement | undefined;
    const parent = canvas?.parentElement;
    if (parent) {
      const rect = parent.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return { width: rect.width, height: rect.height };
      }
    }
    if (typeof window !== 'undefined') {
      return { width: window.innerWidth, height: window.innerHeight };
    }
    if (scaleManager?.parentSize) {
      return {
        width: scaleManager.parentSize.width,
        height: scaleManager.parentSize.height
      };
    }
    if (scaleManager?.displaySize) {
      return {
        width: scaleManager.displaySize.width,
        height: scaleManager.displaySize.height
      };
    }
    return {
      width: this.scene.cameras.main.width,
      height: this.scene.cameras.main.height
    };
  }

  private getPolicyOverrideFromScaleMode(): ResolutionPolicy | null {
    const scaleManager = this.scene.scale as Phaser.Scale.ScaleManager;
    switch (scaleManager.scaleMode) {
      case Phaser.Scale.ENVELOP:
        return ResolutionPolicy.NO_BORDER;
      case Phaser.Scale.FIT:
        return ResolutionPolicy.SHOW_ALL;
      case Phaser.Scale.WIDTH_CONTROLS_HEIGHT:
        return ResolutionPolicy.FIXED_WIDTH;
      case Phaser.Scale.HEIGHT_CONTROLS_WIDTH:
        return ResolutionPolicy.FIXED_HEIGHT;
      default:
        return null;
    }
  }
}

/**
 * 缩放模式说明
 */
export enum ScaleMode {
  /**
   * FIT - 保持宽高比，有黑边
   * 优点：整个游戏可见，不会裁剪
   * 缺点：在不同宽高比的屏幕上会有黑边
   * 适用：桌面端游戏
   */
  FIT = 'FIT',

  /**
   * ENVELOP - 覆盖整个屏幕，无黑边（推荐移动端）
   * 优点：填满整个屏幕，无黑边，保持宽高比
   * 缺点：可能会裁剪部分游戏画面
   * 适用：移动端竖屏游戏（需要配合安全区使用）
   */
  ENVELOP = 'ENVELOP',

  /**
   * WIDTH_CONTROLS_HEIGHT - 宽度固定，高度自适应
   * 优点：宽度固定，适合竖屏，无黑边
   * 缺点：不同屏幕高度差异大时，UI布局需要动态调整
   * 适用：需要精确控制宽度的竖屏游戏
   */
  WIDTH_CONTROLS_HEIGHT = 'WIDTH_CONTROLS_HEIGHT',

  /**
   * HEIGHT_CONTROLS_WIDTH - 高度固定，宽度自适应
   * 优点：高度固定，适合横屏
   * 缺点：不适合竖屏游戏
   * 适用：横屏游戏
   */
  HEIGHT_CONTROLS_WIDTH = 'HEIGHT_CONTROLS_WIDTH',

  /**
   * RESIZE - 完全填充，会变形（不推荐）
   * 优点：完全填充屏幕
   * 缺点：不保持宽高比，画面会变形
   */
  RESIZE = 'RESIZE'
}

/**
 * 推荐的自适应方案
 */
export const RESPONSIVE_RECOMMENDATIONS = {
  // 方案A：ENVELOP - 全屏无黑边（推荐移动端）
  mobile: {
    mode: ScaleMode.ENVELOP,
    description: '全屏无黑边，最佳移动端体验，需要合理设置安全区',
    pros: ['无黑边', '沉浸感强', '保持比例'],
    cons: ['可能裁剪内容', '需要安全区设计'],
    safeMargin: {
      top: 150,
      bottom: 120,
      left: 32,
      right: 32
    }
  },

  // 方案B：WIDTH_CONTROLS_HEIGHT - 宽度固定
  widthFixed: {
    mode: ScaleMode.WIDTH_CONTROLS_HEIGHT,
    description: '宽度固定，高度自适应，适合不同高度设备',
    pros: ['宽度统一', '无黑边', '易于设计'],
    cons: ['需要动态布局', '高度不可预测'],
    safeMargin: {
      top: 150,
      bottom: 120,
      left: 32,
      right: 32
    }
  },

  // 方案C：FIT - 保持比例有黑边
  desktop: {
    mode: ScaleMode.FIT,
    description: '保持比例，有黑边，适合桌面端',
    pros: ['不裁剪', '比例固定', '易于设计'],
    cons: ['有黑边', '屏幕利用率低'],
    safeMargin: {
      top: 100,
      bottom: 80,
      left: 32,
      right: 32
    }
  }
};
