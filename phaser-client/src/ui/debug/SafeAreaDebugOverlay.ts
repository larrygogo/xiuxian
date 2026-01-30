/**
 * SafeAreaDebugOverlay - 安全区调试可视化覆盖层
 *
 * 功能：
 * 1. 可视化4个矩形：designRect, designSafeRect, deviceSafeRect, finalSafeRect
 * 2. 使用不同的线条样式区分（虚线/实线/粗细）
 * 3. 显示文本标签和尺寸信息
 * 4. 显示危险区域（finalSafeRect外的区域）
 * 5. 支持多种开关方式：URL参数、localStorage、DEBUG常量
 */

import Phaser from 'phaser';
import { SafeAreaManager } from '../safearea/SafeAreaManager';
import type { Rect } from '../safearea/types';
import { DEBUG } from '@/config/constants';

/**
 * SafeAreaDebugOverlay 类
 * 可视化安全区边界的调试工具
 */
export class SafeAreaDebugOverlay extends Phaser.GameObjects.Container {
  private safeAreaManager: SafeAreaManager;
  private graphics: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[];

  constructor(scene: Phaser.Scene, safeAreaManager: SafeAreaManager) {
    super(scene, 0, 0);

    this.safeAreaManager = safeAreaManager;
    this.labels = [];

    // 设置非常高的深度，确保在所有UI之上
    this.setDepth(9999);

    // 创建 Graphics 对象用于绘制
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(9999);

    // 监听安全区变化事件
    this.safeAreaManager.on('safeAreaChanged', this.redraw, this);

    // 初始绘制
    this.draw();

    console.log('SafeAreaDebugOverlay: created');
  }

  /**
   * 检查调试覆盖层是否启用
   * 优先级：URL参数 > localStorage > DEBUG常量
   */
  static isEnabled(): boolean {
    // 优先级1：URL参数 ?debug=safearea
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('debug') === 'safearea') {
        return true;
      }
    }

    // 优先级2：localStorage
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('debug.safearea');
      if (stored === 'true') {
        return true;
      }
    }

    // 优先级3：DEBUG常量
    return DEBUG.SHOW_SAFE_AREA;
  }

  /**
   * 重新绘制（在安全区变化时调用）
   */
  private redraw(): void {
    this.clear();
    this.draw();
  }

  /**
   * 绘制所有矩形和标签
   */
  private draw(): void {
    const designRect = this.safeAreaManager.getDesignRect();
    const designSafeRect = this.safeAreaManager.getDesignSafeRect();
    const deviceSafeRect = this.safeAreaManager.getDeviceSafeRect();
    const finalSafeRect = this.safeAreaManager.getFinalSafeRect();

    // 绘制危险区域（finalSafeRect外的区域，红色半透明）
    this.drawDangerZones(finalSafeRect);

    // 层级1：Design Rect（蓝色虚线，粗）
    this.drawDashedRect(designRect, 0x0000ff, 3, [10, 5]);
    this.addLabel('Design Rect', designRect, 0x0000ff, 'top-left');

    // 层级2：Design Safe Rect（绿色点线，细）
    this.drawDashedRect(designSafeRect, 0x00ff00, 2, [2, 2]);
    this.addLabel('Design Safe', designSafeRect, 0x00ff00, 'top-right');

    // 层级3：Device Safe Rect（黄色虚线，中等）
    this.drawDashedRect(deviceSafeRect, 0xffff00, 2, [5, 3]);
    this.addLabel('Device Safe', deviceSafeRect, 0xffff00, 'bottom-left');

    // 层级4：Final Safe Rect（绿色实线 + 填充）
    this.drawSolidRect(finalSafeRect, 0x00ff00, 3);
    this.graphics.fillStyle(0x00ff00, 0.1);
    this.graphics.fillRect(
      finalSafeRect.x,
      finalSafeRect.y,
      finalSafeRect.width,
      finalSafeRect.height
    );
    this.addLabel('Final Safe Area', finalSafeRect, 0x00ff00, 'bottom-right');

    // 绘制中心十字线
    this.drawCrosshair(finalSafeRect);
  }

  /**
   * 绘制虚线矩形
   */
  private drawDashedRect(rect: Rect, color: number, lineWidth: number, dash: number[]): void {
    const [dashLength, gapLength] = dash;

    this.graphics.lineStyle(lineWidth, color, 1);

    // 顶边
    this.drawDashedLine(rect.x, rect.y, rect.x + rect.width, rect.y, dashLength, gapLength);

    // 右边
    this.drawDashedLine(
      rect.x + rect.width,
      rect.y,
      rect.x + rect.width,
      rect.y + rect.height,
      dashLength,
      gapLength
    );

    // 底边
    this.drawDashedLine(
      rect.x + rect.width,
      rect.y + rect.height,
      rect.x,
      rect.y + rect.height,
      dashLength,
      gapLength
    );

    // 左边
    this.drawDashedLine(rect.x, rect.y + rect.height, rect.x, rect.y, dashLength, gapLength);
  }

  /**
   * 绘制虚线
   */
  private drawDashedLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    dashLength: number,
    gapLength: number
  ): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    let currentLength = 0;
    let isDash = true;

    while (currentLength < length) {
      const segmentLength = isDash ? dashLength : gapLength;
      const endLength = Math.min(currentLength + segmentLength, length);

      if (isDash) {
        const startX = x1 + currentLength * cos;
        const startY = y1 + currentLength * sin;
        const endX = x1 + endLength * cos;
        const endY = y1 + endLength * sin;

        this.graphics.beginPath();
        this.graphics.moveTo(startX, startY);
        this.graphics.lineTo(endX, endY);
        this.graphics.strokePath();
      }

      currentLength = endLength;
      isDash = !isDash;
    }
  }

  /**
   * 绘制实线矩形
   */
  private drawSolidRect(rect: Rect, color: number, lineWidth: number): void {
    this.graphics.lineStyle(lineWidth, color, 1);
    this.graphics.strokeRect(rect.x, rect.y, rect.width, rect.height);
  }

  /**
   * 绘制危险区域（finalSafeRect 外的区域）
   */
  private drawDangerZones(finalRect: Rect): void {
    const viewRect = this.safeAreaManager.getViewRect();
    const viewLeft = viewRect.x;
    const viewTop = viewRect.y;
    const viewRight = viewRect.x + viewRect.width;
    const viewBottom = viewRect.y + viewRect.height;

    this.graphics.fillStyle(0xff0000, 0.15); // 红色半透明

    // 顶部危险区
    if (finalRect.y > viewTop) {
      this.graphics.fillRect(viewLeft, viewTop, viewRect.width, finalRect.y - viewTop);
    }

    // 底部危险区
    const bottomY = finalRect.y + finalRect.height;
    if (bottomY < viewBottom) {
      this.graphics.fillRect(viewLeft, bottomY, viewRect.width, viewBottom - bottomY);
    }

    // 左侧危险区
    if (finalRect.x > viewLeft) {
      this.graphics.fillRect(viewLeft, finalRect.y, finalRect.x - viewLeft, finalRect.height);
    }

    // 右侧危险区
    const rightX = finalRect.x + finalRect.width;
    if (rightX < viewRight) {
      this.graphics.fillRect(rightX, finalRect.y, viewRight - rightX, finalRect.height);
    }
  }

  /**
   * 绘制中心十字线
   */
  private drawCrosshair(rect: Rect): void {
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    const size = 20;

    this.graphics.lineStyle(2, 0x00ff00, 1);

    // 水平线
    this.graphics.beginPath();
    this.graphics.moveTo(centerX - size, centerY);
    this.graphics.lineTo(centerX + size, centerY);
    this.graphics.strokePath();

    // 垂直线
    this.graphics.beginPath();
    this.graphics.moveTo(centerX, centerY - size);
    this.graphics.lineTo(centerX, centerY + size);
    this.graphics.strokePath();
  }

  /**
   * 添加文本标签
   */
  private addLabel(
    text: string,
    rect: Rect,
    color: number,
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  ): void {
    const label = this.scene.add.text(0, 0, '', {
      fontSize: '20px',
      color: `#${color.toString(16).padStart(6, '0')}`,
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 }
    });

    label.setDepth(10000);
    label.setText(`${text}\n${Math.round(rect.width)}x${Math.round(rect.height)}`);

    // 根据位置调整坐标
    switch (position) {
      case 'top-left':
        label.setPosition(rect.x + 5, rect.y + 5);
        break;
      case 'top-right':
        label.setPosition(rect.x + rect.width - label.width - 5, rect.y + 5);
        break;
      case 'bottom-left':
        label.setPosition(rect.x + 5, rect.y + rect.height - label.height - 5);
        break;
      case 'bottom-right':
        label.setPosition(
          rect.x + rect.width - label.width - 5,
          rect.y + rect.height - label.height - 5
        );
        break;
    }

    this.labels.push(label);
  }

  /**
   * 清空绘制
   */
  private clear(): void {
    this.graphics.clear();

    // 销毁所有标签
    this.labels.forEach((label) => label.destroy());
    this.labels = [];
  }

  /**
   * 销毁覆盖层
   */
  destroy(fromScene?: boolean): void {
    // 停止监听事件
    this.safeAreaManager.off('safeAreaChanged', this.redraw, this);

    // 清空绘制
    this.clear();

    // 销毁 Graphics
    this.graphics.destroy();

    // 调用父类销毁
    super.destroy(fromScene);

    console.log('SafeAreaDebugOverlay: destroyed');
  }
}
