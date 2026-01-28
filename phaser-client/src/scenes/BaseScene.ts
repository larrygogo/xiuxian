/**
 * BaseScene - 带安全区支持的基础场景类（可选）
 *
 * 特点：
 * 1. 自动初始化SafeAreaManager
 * 2. 自动创建UIRoot容器
 * 3. 自动创建调试覆盖层（如果启用）
 * 4. 提供createUI()抽象方法供子类实现
 * 5. 自动处理resize和cleanup
 *
 * 使用方式：
 * - 场景可以选择extend BaseScene（便利）
 * - 或者直接extend Phaser.Scene并手动使用SafeAreaManager（灵活）
 */

import Phaser from 'phaser';
import { SafeAreaManager } from '@/ui/safearea/SafeAreaManager';
import { UIRootContainer } from '@/ui/core/UIRootContainer';
import { SafeAreaDebugOverlay } from '@/ui/debug/SafeAreaDebugOverlay';
import type { ResponsiveConfig } from '@/utils/ResponsiveHelper';
import { SAFE_AREA_DESIGN, MIN_SAFE_AREA, EXTERNAL_PADDING, RESOLUTION_POLICY } from '@/config/constants';

/**
 * BaseScene 抽象类
 * 提供安全区管理的基础设施
 */
export abstract class BaseScene extends Phaser.Scene {
  // 安全区管理器
  protected safeAreaManager!: SafeAreaManager;

  // UI根容器
  protected uiRoot!: UIRootContainer;

  // 调试覆盖层（可选）
  protected debugOverlay?: SafeAreaDebugOverlay;

  /**
   * 初始化安全区系统
   * 应该在子类的 create() 方法中调用
   *
   * @param config - 可选的ResponsiveConfig配置
   */
  protected initSafeAreaSystem(config?: Partial<ResponsiveConfig>): void {
    // 创建 SafeAreaManager
    this.safeAreaManager = new SafeAreaManager(this, {
      designWidth: 1080,
      designHeight: 1920,
      resolutionPolicy: RESOLUTION_POLICY,
      safeMarginPercent: SAFE_AREA_DESIGN,
      minSafeArea: MIN_SAFE_AREA,
      externalPadding: EXTERNAL_PADDING,
      ...config
    });

    // 创建 UIRoot 容器
    this.uiRoot = new UIRootContainer(this, this.safeAreaManager);
    this.add.existing(this.uiRoot);

    // 创建调试覆盖层（如果启用）
    if (SafeAreaDebugOverlay.isEnabled()) {
      this.debugOverlay = new SafeAreaDebugOverlay(this, this.safeAreaManager);
      this.add.existing(this.debugOverlay);
      console.log('BaseScene: debug overlay enabled');
    }

    // 监听窗口大小变化
    this.scale.on('resize', this.onResize, this);

    console.log('BaseScene: safe area system initialized');
  }

  /**
   * 创建UI - 由子类实现
   * 子类应该使用 this.uiRoot 来添加UI元素
   */
  protected abstract createUI(): void;

  /**
   * 窗口大小变化回调
   * SafeAreaManager 会自动重算，UIRoot 会自动更新子元素
   * 子类可以重写此方法添加额外的resize逻辑
   */
  protected onResize(gameSize?: Phaser.Structs.Size): void {
    console.log('BaseScene: resize', gameSize);
    // SafeAreaManager已经监听scale.resize事件，会自动compute
    // UIRoot已经监听safeAreaChanged事件，会自动updateLayout
    // 子类如果需要额外的resize逻辑，可以重写此方法
  }

  /**
   * 场景关闭时的清理
   * 子类应该调用 super.shutdown()
   */
  shutdown(): void {
    console.log('BaseScene: shutdown');

    // 停止监听resize事件
    this.scale.off('resize', this.onResize, this);

    // 销毁调试覆盖层
    if (this.debugOverlay) {
      this.debugOverlay.destroy();
      this.debugOverlay = undefined;
    }

    // 销毁UIRoot（会自动清理子元素）
    if (this.uiRoot) {
      this.uiRoot.destroy();
    }

    // 销毁SafeAreaManager
    if (this.safeAreaManager) {
      this.safeAreaManager.destroy();
    }
  }

  /**
   * 快捷方法：获取最终安全区
   */
  protected getSafeRect() {
    return this.safeAreaManager.getFinalSafeRect();
  }

  /**
   * 快捷方法：获取屏幕尺寸
   */
  protected getScreenSize() {
    return this.safeAreaManager.getScreenSize();
  }
}
