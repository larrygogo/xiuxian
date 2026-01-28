/**
 * Safe Area type definitions
 */

/**
 * Rectangle definition
 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 2D Point
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Size definition
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * Padding definition (四个方向的内边距)
 */
export interface Padding {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Helper to create a Rect from x, y, width, height
 */
export function createRect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}

/**
 * Helper to create a Point
 */
export function createPoint(x: number, y: number): Point {
  return { x, y };
}

/**
 * Helper to create Padding (可以传入单个值或四个值)
 */
export function createPadding(
  topOrAll: number,
  right?: number,
  bottom?: number,
  left?: number
): Padding {
  if (right === undefined) {
    // Single value - all sides equal
    return { top: topOrAll, bottom: topOrAll, left: topOrAll, right: topOrAll };
  } else if (bottom === undefined) {
    // Two values - vertical, horizontal
    return { top: topOrAll, bottom: topOrAll, left: right, right: right };
  } else if (left === undefined) {
    // Three values - top, horizontal, bottom
    return { top: topOrAll, bottom: bottom, left: right, right: right };
  } else {
    // Four values - top, right, bottom, left
    return { top: topOrAll, right: right, bottom: bottom, left: left };
  }
}

/**
 * Check if a point is inside a rectangle
 */
export function isPointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/**
 * Check if two rectangles intersect
 */
export function rectsIntersect(rect1: Rect, rect2: Rect): boolean {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y
  );
}

/**
 * Get the intersection of two rectangles
 * Returns null if they don't intersect
 */
export function getIntersection(rect1: Rect, rect2: Rect): Rect | null {
  if (!rectsIntersect(rect1, rect2)) {
    return null;
  }

  const x = Math.max(rect1.x, rect2.x);
  const y = Math.max(rect1.y, rect2.y);
  const right = Math.min(rect1.x + rect1.width, rect2.x + rect2.width);
  const bottom = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);

  return {
    x,
    y,
    width: right - x,
    height: bottom - y
  };
}
