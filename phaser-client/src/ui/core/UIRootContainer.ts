/**
 * UIRootContainer - 带安全区感知的根容器
 *
 * 特点：
 * 1. 自动监听安全区变化事件
 * 2. 使用锚点系统自动重新定位子元素
 * 3. 避免在窗口变化时重建UI，只更新位置
 */

import Phaser from 'phaser';
import { SafeAreaManager } from '../safearea/SafeAreaManager';
import { Anchor } from '../layout/Anchors';
import { LayoutUtil } from '../layout/LayoutUtil';
import type { Rect } from '../safearea/types';
import { getIntersection } from '../safearea/types';

/**
 * 子元素元数据
 */
interface ChildMetadata {
  element: Phaser.GameObjects.GameObject;
  anchor: Anchor;
  offsetX: number;
  offsetY: number;
}

/**
 * UIRootContainer - 根UI容器
 * 自动响应安全区变化，重新定位子元素
 */
export class UIRootContainer extends Phaser.GameObjects.Container {
  private safeAreaManager: SafeAreaManager;
  private trackedChildren: Map<string, ChildMetadata>;
  private layoutRect?: Rect;

  constructor(scene: Phaser.Scene, safeAreaManager: SafeAreaManager) {
    super(scene, 0, 0);

    this.safeAreaManager = safeAreaManager;
    this.trackedChildren = new Map();

    // 设置深度（UIRoot 在背景之上，面板之下）
    this.setDepth(10);

    // 监听安全区变化事件
    this.safeAreaManager.on('safeAreaChanged', this.updateLayout, this);

    console.log('UIRootContainer: created');
  }

  /**
   * 添加带锚点的子元素
   * 子元素会自动在安全区变化时重新定位
   *
   * @param id - 子元素唯一ID
   * @param element - Phaser GameObject
   * @param anchor - 锚点位置
   * @param offsetX - X偏移（相对于锚点）
   * @param offsetY - Y偏移（相对于锚点）
   */
  addWithAnchor(
    id: string,
    element: Phaser.GameObjects.GameObject,
    anchor: Anchor,
    offsetX: number = 0,
    offsetY: number = 0
  ): void {
    // 存储元数据
    this.trackedChildren.set(id, {
      element,
      anchor,
      offsetX,
      offsetY
    });

    // 添加到容器
    this.add(element);

    // 初始定位
    this.updateChildPosition(id);

    console.log(`UIRootContainer: added child '${id}' with anchor ${anchor}`);
  }

  /**
   * 移除子元素
   *
   * @param id - 子元素ID
   */
  removeChild(id: string): void {
    const metadata = this.trackedChildren.get(id);
    if (metadata) {
      this.remove(metadata.element);
      this.trackedChildren.delete(id);
      console.log(`UIRootContainer: removed child '${id}'`);
    }
  }

  /**
   * 获取子元素
   *
   * @param id - 子元素ID
   */
  getChild(id: string): Phaser.GameObjects.GameObject | undefined {
    return this.trackedChildren.get(id)?.element;
  }

  /**
   * 更新特定子元素的位置
   *
   * @param id - 子元素ID
   */
  updateChildPosition(id: string): void {
    const metadata = this.trackedChildren.get(id);
    if (!metadata) {
      console.warn(`UIRootContainer: child '${id}' not found`);
      return;
    }

    const safeRect = this.safeAreaManager.getFinalSafeRect();
    const viewRect = this.safeAreaManager.getViewRect();
    const layoutRect = getIntersection(safeRect, viewRect) || safeRect;
    this.layoutRect = layoutRect;

    // 使用 LayoutUtil 定位
    LayoutUtil.place(
      metadata.element as any,
      layoutRect,
      metadata.anchor,
      metadata.offsetX,
      metadata.offsetY
    );
  }

  /**
   * 更新所有子元素的位置
   * 在安全区变化时调用
   */
  private updateLayout(): void {
    console.log('UIRootContainer: updating layout for', this.trackedChildren.size, 'children');
    const safeRect = this.safeAreaManager.getFinalSafeRect();
    const viewRect = this.safeAreaManager.getViewRect();
    this.layoutRect = getIntersection(safeRect, viewRect) || safeRect;
    this.trackedChildren.forEach((_, id) => {
      this.updateChildPosition(id);
    });
  }

  /**
   * 获取当前用于布局的矩形（安全区与可视区交集）
   */
  getLayoutRect(): Rect | undefined {
    return this.layoutRect ? { ...this.layoutRect } : undefined;
  }

  /**
   * 销毁容器
   */
  destroy(fromScene?: boolean): void {
    // 停止监听事件
    this.safeAreaManager.off('safeAreaChanged', this.updateLayout, this);

    // 清空追踪列表
    this.trackedChildren.clear();

    // 调用父类销毁
    super.destroy(fromScene);

    console.log('UIRootContainer: destroyed');
  }
}
