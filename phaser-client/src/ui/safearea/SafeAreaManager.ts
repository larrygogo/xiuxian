/**
 * SafeAreaManager - 安全区管理器
 *
 * 职责：
 * 1. 管理四个矩形：designRect, designSafeRect, deviceSafeRect, finalSafeRect
 * 2. 监听 scale.on('resize') 事件，窗口变化时触发重算
 * 3. 提供事件：'safeAreaChanged' 用于通知 UI 组件更新
 * 4. 包装 ResponsiveHelper，提供增强功能
 */

import Phaser from 'phaser';
import { ResponsiveHelper, type ResponsiveConfig } from '@/utils/ResponsiveHelper';
import type { ResolutionInfo } from '@/utils/ResolutionPolicy';
import type { Rect } from './types';

/**
 * 安全区变化事件数据
 */
export interface SafeAreaChangedEvent {
  designRect: Rect;
  viewRect: Rect;
  designSafeRect: Rect;
  deviceSafeRect: Rect;
  finalSafeRect: Rect;
  resolution: ResolutionInfo;
}

/**
 * SafeAreaManager 类
 * 包装 ResponsiveHelper 并提供 4-rectangle 模型
 */
export class SafeAreaManager extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private config: ResponsiveConfig;
  private responsiveHelper: ResponsiveHelper;

  // 四个矩形
  private designRect!: Rect;
  private viewRect!: Rect;
  private designSafeRect!: Rect;
  private deviceSafeRect!: Rect;
  private finalSafeRect!: Rect;
  private resolutionInfo!: ResolutionInfo;

  constructor(scene: Phaser.Scene, config?: Partial<ResponsiveConfig>) {
    super();

    this.scene = scene;

    // 默认配置（与 ResponsiveHelper 一致）
    this.config = {
      designWidth: 1080,
      designHeight: 1920,
      resolutionPolicy: {
        mode: 'AUTO',
        epsilon: 0.01
      },
      safeMarginPercent: {
        top: 150 / 1920, // 7.8%
        bottom: 150 / 1920, // 7.8%
        left: 16 / 1080, // 5.6%
        right: 16 / 1080 // 5.6%
      },
      minSafeArea: {
        width: 300,
        height: 500
      },
      externalPadding: {
        enabled: true,
        minDisplayWidth: 540,
        minDisplayHeight: 960,
        backgroundColor: '#000000'
      },
      ...config
    };

    // 创建 ResponsiveHelper（内部使用）
    this.responsiveHelper = new ResponsiveHelper(this.scene, this.config);

    // 初始计算
    this.compute();

    // 监听窗口大小变化
    this.scene.scale.on('resize', this.onResize, this);
  }

  /**
   * 计算所有矩形并触发事件
   */
  compute(): void {
    const resolutionInfo = this.responsiveHelper.getResolutionInfo();
    const designRect = resolutionInfo.designRect;
    const viewRect = resolutionInfo.viewRect;

    // 1. Design Rect - 完整画布（游戏坐标）
    this.designRect = { ...designRect };
    this.viewRect = { ...viewRect };
    this.resolutionInfo = resolutionInfo;

    // 2. Design Safe Rect - 应用百分比边距
    const designMargins = {
      top: designRect.height * (this.config.safeMarginPercent?.top || 0),
      bottom: designRect.height * (this.config.safeMarginPercent?.bottom || 0),
      left: designRect.width * (this.config.safeMarginPercent?.left || 0),
      right: designRect.width * (this.config.safeMarginPercent?.right || 0)
    };

    this.designSafeRect = {
      x: designRect.x + designMargins.left,
      y: designRect.y + designMargins.top,
      width: designRect.width - designMargins.left - designMargins.right,
      height: designRect.height - designMargins.top - designMargins.bottom
    };

    // 3. Device Safe Rect - 设备特定的安全区（CSS env 变量）
    const deviceInsets = this.responsiveHelper.getDeviceInsetsInDesign();

    this.deviceSafeRect = {
      x: viewRect.x + deviceInsets.left,
      y: viewRect.y + deviceInsets.top,
      width: viewRect.width - deviceInsets.left - deviceInsets.right,
      height: viewRect.height - deviceInsets.top - deviceInsets.bottom
    };

    // 4. Final Safe Rect - ResponsiveHelper 计算的最终安全区
    //    （设计边距 + 设备插入值的合并，带最小约束）
    const safeArea = this.responsiveHelper.getSafeArea();

    this.finalSafeRect = {
      x: safeArea.left,
      y: safeArea.top,
      width: safeArea.width,
      height: safeArea.height
    };

    // 触发事件
    this.emit('safeAreaChanged', {
      designRect: { ...this.designRect },
      viewRect: { ...this.viewRect },
      designSafeRect: { ...this.designSafeRect },
      deviceSafeRect: { ...this.deviceSafeRect },
      finalSafeRect: { ...this.finalSafeRect },
      resolution: { ...this.resolutionInfo, viewRect: { ...this.resolutionInfo.viewRect } }
    } as SafeAreaChangedEvent);

    console.log('SafeAreaManager: computed', {
      designRect: this.designRect,
      viewRect: this.viewRect,
      designSafeRect: this.designSafeRect,
      deviceSafeRect: this.deviceSafeRect,
      finalSafeRect: this.finalSafeRect,
      resolution: this.resolutionInfo
    });
  }

  /**
   * 窗口大小变化回调
   */
  private onResize(): void {
    console.log('SafeAreaManager: resize detected');
    this.compute();
  }

  /**
   * 获取设计矩形（完整画布）
   */
  getDesignRect(): Rect {
    return { ...this.designRect };
  }

  /**
   * 获取设计安全矩形（应用百分比边距）
   */
  getDesignSafeRect(): Rect {
    return { ...this.designSafeRect };
  }

  /**
   * 获取可视矩形（策略计算后的可视区域）
   */
  getViewRect(): Rect {
    return { ...this.viewRect };
  }

  /**
   * 获取设备安全矩形（CSS env 变量）
   */
  getDeviceSafeRect(): Rect {
    return { ...this.deviceSafeRect };
  }

  /**
   * 获取最终安全矩形（合并结果 + 最小约束）
   */
  getFinalSafeRect(): Rect {
    return { ...this.finalSafeRect };
  }

  /**
   * 获取分辨率策略信息
   */
  getResolutionInfo(): ResolutionInfo {
    return { ...this.resolutionInfo, viewRect: { ...this.resolutionInfo.viewRect } };
  }

  /**
   * 将归一化坐标（0-1）转换为最终安全区内的实际X坐标
   *
   * @param normalized - 归一化X坐标（0 = 左边界，1 = 右边界）
   * @returns 实际X坐标
   */
  toSafeX(normalized: number): number {
    return this.finalSafeRect.x + this.finalSafeRect.width * normalized;
  }

  /**
   * 将归一化坐标（0-1）转换为最终安全区内的实际Y坐标
   *
   * @param normalized - 归一化Y坐标（0 = 上边界，1 = 下边界）
   * @returns 实际Y坐标
   */
  toSafeY(normalized: number): number {
    return this.finalSafeRect.y + this.finalSafeRect.height * normalized;
  }

  /**
   * 创建 UIRoot 容器
   * UIRoot 会自动响应安全区变化
   */
  createUIRoot(): Phaser.GameObjects.Container {
    // Import UIRootContainer dynamically to avoid circular dependency
    // For now, return a basic Container. UIRootContainer will enhance this.
    const container = this.scene.add.container(0, 0);
    container.setDepth(10); // UIRoot at depth 10

    // Listen to safe area changes and update container position
    this.on('safeAreaChanged', () => {
      // UIRoot stays at (0, 0) since children position themselves
      // relative to the safe area
    });

    return container;
  }

  /**
   * 获取底层 ResponsiveHelper 实例（向后兼容）
   */
  getResponsiveHelper(): ResponsiveHelper {
    return this.responsiveHelper;
  }

  /**
   * 获取屏幕尺寸（委托给 ResponsiveHelper）
   */
  getScreenSize(): { width: number; height: number } {
    return this.responsiveHelper.getScreenSize();
  }

  /**
   * 获取缩放比例（委托给 ResponsiveHelper）
   */
  getScale(): { x: number; y: number; min: number; max: number } {
    return this.responsiveHelper.getScale();
  }

  /**
   * 获取UI缩放因子（用于RESIZE模式下还原UI尺寸）
   *
   * 在RESIZE模式下，相机尺寸变为实际设备尺寸（如390×844），
   * UI的硬编码像素值（如120px）是按1080×1920设计的，
   * 需要缩小到实际设备尺寸：120px * (390/1080) = 43px
   *
   * @returns UI缩放因子（相机尺寸/设计尺寸）
   */
  getUIScale(): number {
    const scaleMode = this.scene.scale.scaleMode;
    if (scaleMode === Phaser.Scale.RESIZE) {
      const scale = this.getScale();
      return scale.min;
    }
    return 1;
  }

  /**
   * 判断是否为窄屏（委托给 ResponsiveHelper）
   */
  isNarrowScreen(): boolean {
    return this.responsiveHelper.isNarrowScreen();
  }

  /**
   * 判断是否为宽屏（委托给 ResponsiveHelper）
   */
  isWideScreen(): boolean {
    return this.responsiveHelper.isWideScreen();
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.scene.scale.off('resize', this.onResize, this);
    this.responsiveHelper.destroy();
    this.removeAllListeners();
  }
}
