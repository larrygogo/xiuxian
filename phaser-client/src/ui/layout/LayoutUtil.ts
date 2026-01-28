/**
 * Layout utility functions for positioning UI elements within safe areas
 * 在安全区内定位UI元素的布局工具函数
 */

import { Anchor, getAnchorNormalized } from './Anchors';
import type { Rect, Point, Padding, Size } from '../safearea/types';
import { createPadding } from '../safearea/types';

/**
 * Layout utility class with static methods
 * 布局工具类（静态方法）
 */
export class LayoutUtil {
  /**
   * Place an element at an anchor point within a rectangle with optional offset
   * 在矩形内的锚点位置放置元素，支持偏移
   *
   * @param element - Object with x, y properties (e.g., Phaser.GameObjects.GameObject)
   * @param safeRect - The safe area rectangle
   * @param anchor - Anchor position
   * @param offsetX - X offset from anchor point (default: 0)
   * @param offsetY - Y offset from anchor point (default: 0)
   */
  static place(
    element: { x: number; y: number },
    safeRect: Rect,
    anchor: Anchor,
    offsetX: number = 0,
    offsetY: number = 0
  ): void {
    const anchorPoint = this.getAnchorPoint(safeRect, anchor);
    element.x = anchorPoint.x + offsetX;
    element.y = anchorPoint.y + offsetY;
  }

  /**
   * Place an element using normalized coordinates (0-1 range)
   * 使用归一化坐标（0-1范围）放置元素
   *
   * @param element - Object with x, y properties
   * @param safeRect - The safe area rectangle
   * @param normalizedX - X position as 0-1 (0 = left, 1 = right)
   * @param normalizedY - Y position as 0-1 (0 = top, 1 = bottom)
   */
  static placeNormalized(
    element: { x: number; y: number },
    safeRect: Rect,
    normalizedX: number,
    normalizedY: number
  ): void {
    element.x = safeRect.x + safeRect.width * normalizedX;
    element.y = safeRect.y + safeRect.height * normalizedY;
  }

  /**
   * Get the absolute coordinates of an anchor point within a rectangle
   * 获取矩形内锚点的绝对坐标
   *
   * @param rect - The rectangle
   * @param anchor - Anchor position
   * @returns Point with x, y coordinates
   */
  static getAnchorPoint(rect: Rect, anchor: Anchor): Point {
    const normalized = getAnchorNormalized(anchor);

    return {
      x: rect.x + rect.width * normalized.x,
      y: rect.y + rect.height * normalized.y
    };
  }

  /**
   * Apply padding to a rectangle, creating a smaller inset rectangle
   * 对矩形应用内边距，创建一个更小的内嵌矩形
   *
   * @param rect - Original rectangle
   * @param padding - Padding to apply
   * @returns New rectangle with padding applied
   */
  static applyPadding(rect: Rect, padding: Padding | number): Rect {
    const p = typeof padding === 'number' ? createPadding(padding) : padding;

    return {
      x: rect.x + p.left,
      y: rect.y + p.top,
      width: rect.width - p.left - p.right,
      height: rect.height - p.top - p.bottom
    };
  }

  /**
   * Clamp a position to stay within a rectangle
   * 将位置限制在矩形内
   *
   * @param pos - Position to clamp
   * @param rect - Boundary rectangle
   * @param elementSize - Optional size of the element (to keep entire element in bounds)
   * @returns Clamped position
   */
  static clampToRect(pos: Point, rect: Rect, elementSize?: Size): Point {
    const maxX = elementSize ? rect.x + rect.width - elementSize.width : rect.x + rect.width;
    const maxY = elementSize ? rect.y + rect.height - elementSize.height : rect.y + rect.height;

    return {
      x: Math.max(rect.x, Math.min(pos.x, maxX)),
      y: Math.max(rect.y, Math.min(pos.y, maxY))
    };
  }

  /**
   * Calculate the center point of a rectangle
   * 计算矩形的中心点
   */
  static getCenter(rect: Rect): Point {
    return {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2
    };
  }

  /**
   * Calculate bounds of an element (x, y, width, height)
   * 计算元素的边界（x, y, width, height）
   *
   * @param element - Phaser GameObject
   * @returns Rectangle representing the element's bounds
   */
  static getBounds(element: any): Rect {
    // Handle different Phaser object types
    if (element.getBounds) {
      // Container, Sprite, etc.
      const bounds = element.getBounds();
      return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      };
    } else if (element.width !== undefined && element.height !== undefined) {
      // Simple game object with x, y, width, height
      return {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height
      };
    } else {
      // Fallback: treat as a point
      return {
        x: element.x || 0,
        y: element.y || 0,
        width: 0,
        height: 0
      };
    }
  }

  /**
   * Check if an element is fully contained within a rectangle
   * 检查元素是否完全包含在矩形内
   *
   * @param element - Element to check
   * @param rect - Containing rectangle
   * @returns True if element is fully within rect
   */
  static isInRect(element: any, rect: Rect): boolean {
    const bounds = this.getBounds(element);

    return (
      bounds.x >= rect.x &&
      bounds.y >= rect.y &&
      bounds.x + bounds.width <= rect.x + rect.width &&
      bounds.y + bounds.height <= rect.y + rect.height
    );
  }

  /**
   * Calculate overflow (how much an element extends beyond a rectangle)
   * 计算溢出量（元素超出矩形的部分）
   *
   * @param element - Element to check
   * @param rect - Boundary rectangle
   * @returns Overflow on each side (negative = inside, positive = overflow)
   */
  static calculateOverflow(element: any, rect: Rect): Padding {
    const bounds = this.getBounds(element);

    return {
      left: rect.x - bounds.x, // Positive if overflowing left
      top: rect.y - bounds.y, // Positive if overflowing top
      right: bounds.x + bounds.width - (rect.x + rect.width), // Positive if overflowing right
      bottom: bounds.y + bounds.height - (rect.y + rect.height) // Positive if overflowing bottom
    };
  }

  /**
   * Distribute elements evenly along a line (horizontal or vertical)
   * 在一条线上均匀分布元素（水平或垂直）
   *
   * @param elements - Array of elements to distribute
   * @param start - Start position
   * @param end - End position
   * @param horizontal - True for horizontal distribution, false for vertical
   */
  static distribute(
    elements: Array<{ x: number; y: number }>,
    start: number,
    end: number,
    horizontal: boolean = true
  ): void {
    if (elements.length === 0) return;
    if (elements.length === 1) {
      if (horizontal) {
        elements[0].x = (start + end) / 2;
      } else {
        elements[0].y = (start + end) / 2;
      }
      return;
    }

    const spacing = (end - start) / (elements.length - 1);

    elements.forEach((element, index) => {
      const position = start + spacing * index;
      if (horizontal) {
        element.x = position;
      } else {
        element.y = position;
      }
    });
  }

  /**
   * Align elements in a row or column with spacing
   * 将元素在一行或一列中对齐，带间距
   *
   * @param elements - Array of elements
   * @param startPos - Starting position (x or y)
   * @param spacing - Space between elements
   * @param horizontal - True for horizontal, false for vertical
   */
  static align(
    elements: Array<{ x: number; y: number }>,
    startPos: number,
    spacing: number,
    horizontal: boolean = true
  ): void {
    let currentPos = startPos;

    elements.forEach((element) => {
      if (horizontal) {
        element.x = currentPos;
        currentPos += spacing;
      } else {
        element.y = currentPos;
        currentPos += spacing;
      }
    });
  }
}
