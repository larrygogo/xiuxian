/**
 * RippleManager - 点击涟漪效果管理器
 * 点击任意位置时显示扩散的圆形波纹动画
 * 使用双层描边确保在任何背景色下都清晰可见
 */

import Phaser from 'phaser';
import { RIPPLE_CONFIG } from '@/config/constants';

export interface RippleOptions {
  color?: number;
  shadowColor?: number;
  maxRadius?: number;
  duration?: number;
  initialAlpha?: number;
  strokeWidth?: number;
}

/**
 * RippleManager 单例类
 */
class RippleManagerClass {
  private scene: Phaser.Scene | null = null;
  private ripplePool: Phaser.GameObjects.Graphics[] = [];
  private container: Phaser.GameObjects.Container | null = null;
  private activeTweens: Set<Phaser.Tweens.Tween> = new Set();

  /**
   * 初始化涟漪管理器
   * @param scene - Phaser 场景
   */
  init(scene: Phaser.Scene): void {
    this.scene = scene;

    // 创建容器用于管理所有涟漪效果
    this.container = scene.add.container(0, 0);
    this.container.setDepth(9999); // 高层级但低于 toast
  }

  /**
   * 从对象池获取 Graphics 对象
   */
  private getFromPool(): Phaser.GameObjects.Graphics {
    const ripple = this.ripplePool.pop();
    if (ripple) {
      ripple.setVisible(true);
      return ripple;
    }
    return this.scene!.add.graphics();
  }

  /**
   * 将 Graphics 对象归还到对象池
   */
  private returnToPool(ripple: Phaser.GameObjects.Graphics): void {
    ripple.clear();
    ripple.setVisible(false);
    this.ripplePool.push(ripple);
  }

  /**
   * 创建涟漪效果
   * @param x - 点击的 X 坐标
   * @param y - 点击的 Y 坐标
   * @param options - 可选的涟漪配置
   */
  createRipple(x: number, y: number, options?: RippleOptions): void {
    if (!this.scene || !this.container) return;

    const color = options?.color ?? RIPPLE_CONFIG.COLOR;
    const shadowColor = options?.shadowColor ?? RIPPLE_CONFIG.SHADOW_COLOR;
    const maxRadius = options?.maxRadius ?? RIPPLE_CONFIG.MAX_RADIUS;
    const duration = options?.duration ?? RIPPLE_CONFIG.DURATION;
    const initialAlpha = options?.initialAlpha ?? RIPPLE_CONFIG.INITIAL_ALPHA;
    const strokeWidth = options?.strokeWidth ?? RIPPLE_CONFIG.STROKE_WIDTH;
    const shadowWidth = RIPPLE_CONFIG.SHADOW_WIDTH;

    const ripple = this.getFromPool();
    ripple.setPosition(x, y);
    this.container.add(ripple);

    // 使用 tween 控制动画
    const tween = this.scene.tweens.add({
      targets: { radius: RIPPLE_CONFIG.INITIAL_RADIUS, alpha: initialAlpha },
      radius: maxRadius,
      alpha: 0,
      duration: duration,
      ease: 'Cubic.easeOut',
      onUpdate: (_tween, target) => {
        ripple.clear();

        // 绘制外层阴影（深色描边，提供对比度）
        ripple.lineStyle(strokeWidth + shadowWidth * 2, shadowColor, target.alpha * 0.6);
        ripple.strokeCircle(0, 0, target.radius);

        // 绘制主体圆环（浅色描边）
        ripple.lineStyle(strokeWidth, color, target.alpha);
        ripple.strokeCircle(0, 0, target.radius);

        // 绘制中心点（增强点击反馈感）
        if (target.radius < maxRadius * 0.5) {
          const centerAlpha = target.alpha * (1 - target.radius / (maxRadius * 0.5));
          ripple.fillStyle(color, centerAlpha * 0.4);
          ripple.fillCircle(0, 0, Math.max(2, RIPPLE_CONFIG.INITIAL_RADIUS - target.radius * 0.1));
        }
      },
      onComplete: () => {
        this.activeTweens.delete(tween);
        this.container?.remove(ripple, false);
        this.returnToPool(ripple);
      }
    });

    this.activeTweens.add(tween);
  }

  /**
   * 销毁涟漪管理器
   */
  destroy(): void {
    // 停止所有活动的 tween
    this.activeTweens.forEach(tween => {
      tween.stop();
    });
    this.activeTweens.clear();

    // 清理对象池中的所有 Graphics
    this.ripplePool.forEach(ripple => {
      ripple.destroy();
    });
    this.ripplePool = [];

    // 销毁容器
    if (this.container) {
      this.container.destroy(true);
      this.container = null;
    }

    this.scene = null;
  }
}

// 导出单例
export const rippleManager = new RippleManagerClass();
