/**
 * Anchor position enum for UI layout
 * 定义UI元素在安全区中的锚点位置
 */

export enum Anchor {
  /**
   * Top-left corner
   * 左上角锚点
   */
  TOP_LEFT = 'TOP_LEFT',

  /**
   * Top-center
   * 顶部居中锚点
   */
  TOP_CENTER = 'TOP_CENTER',

  /**
   * Top-right corner
   * 右上角锚点
   */
  TOP_RIGHT = 'TOP_RIGHT',

  /**
   * Center-left (middle of left edge)
   * 左侧居中锚点
   */
  CENTER_LEFT = 'CENTER_LEFT',

  /**
   * Center (middle of the area)
   * 中心锚点
   */
  CENTER = 'CENTER',

  /**
   * Center-right (middle of right edge)
   * 右侧居中锚点
   */
  CENTER_RIGHT = 'CENTER_RIGHT',

  /**
   * Bottom-left corner
   * 左下角锚点
   */
  BOTTOM_LEFT = 'BOTTOM_LEFT',

  /**
   * Bottom-center
   * 底部居中锚点
   */
  BOTTOM_CENTER = 'BOTTOM_CENTER',

  /**
   * Bottom-right corner
   * 右下角锚点
   */
  BOTTOM_RIGHT = 'BOTTOM_RIGHT'
}

/**
 * Legacy string-based anchor types for backward compatibility
 * 向后兼容的字符串锚点类型
 */
export type LegacyAnchorString = 'top-left' | 'top-center' | 'top-right';

/**
 * Convert legacy string anchor to Anchor enum
 * 将旧的字符串锚点转换为Anchor枚举
 */
export function legacyAnchorToEnum(anchor: LegacyAnchorString): Anchor {
  switch (anchor) {
    case 'top-left':
      return Anchor.TOP_LEFT;
    case 'top-center':
      return Anchor.TOP_CENTER;
    case 'top-right':
      return Anchor.TOP_RIGHT;
    default:
      return Anchor.TOP_LEFT;
  }
}

/**
 * Normalized anchor position (0-1 range)
 * 归一化的锚点位置（0-1范围）
 */
export interface NormalizedAnchor {
  x: number; // 0-1 range, 0 = left, 1 = right
  y: number; // 0-1 range, 0 = top, 1 = bottom
}

/**
 * Get normalized position (0-1) for an anchor
 * 获取锚点的归一化位置
 */
export function getAnchorNormalized(anchor: Anchor): NormalizedAnchor {
  switch (anchor) {
    case Anchor.TOP_LEFT:
      return { x: 0, y: 0 };
    case Anchor.TOP_CENTER:
      return { x: 0.5, y: 0 };
    case Anchor.TOP_RIGHT:
      return { x: 1, y: 0 };
    case Anchor.CENTER_LEFT:
      return { x: 0, y: 0.5 };
    case Anchor.CENTER:
      return { x: 0.5, y: 0.5 };
    case Anchor.CENTER_RIGHT:
      return { x: 1, y: 0.5 };
    case Anchor.BOTTOM_LEFT:
      return { x: 0, y: 1 };
    case Anchor.BOTTOM_CENTER:
      return { x: 0.5, y: 1 };
    case Anchor.BOTTOM_RIGHT:
      return { x: 1, y: 1 };
    default:
      return { x: 0, y: 0 };
  }
}
