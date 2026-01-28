/**
 * 安全区验证工具
 * 用于验证UI元素是否完全在安全区内，防止被裁剪
 */

import type { SafeArea } from './ResponsiveHelper';

export interface ElementBounds {
  x: number;      // 元素左上角X坐标
  y: number;      // 元素左上角Y坐标
  width: number;  // 元素宽度
  height: number; // 元素高度
}

export interface ValidationResult {
  isValid: boolean;           // 是否完全在安全区内
  overflow: {                 // 超出安全区的像素数
    left: number;             // 左侧超出
    top: number;              // 顶部超出
    right: number;            // 右侧超出
    bottom: number;           // 底部超出
  };
  message?: string;           // 警告消息
}

/**
 * 安全区验证器类
 */
export class SafeAreaValidator {
  private safeArea: SafeArea;
  private enableWarnings: boolean;

  constructor(safeArea: SafeArea, enableWarnings = true) {
    this.safeArea = safeArea;
    this.enableWarnings = enableWarnings;
  }

  /**
   * 更新安全区
   */
  updateSafeArea(safeArea: SafeArea): void {
    this.safeArea = safeArea;
  }

  /**
   * 验证元素是否在安全区内
   */
  validate(elementName: string, bounds: ElementBounds): ValidationResult {
    const { x, y, width, height } = bounds;
    const right = x + width;
    const bottom = y + height;

    const overflow = {
      left: Math.max(0, this.safeArea.left - x),
      top: Math.max(0, this.safeArea.top - y),
      right: Math.max(0, right - this.safeArea.right),
      bottom: Math.max(0, bottom - this.safeArea.bottom)
    };

    const isValid =
      x >= this.safeArea.left &&
      y >= this.safeArea.top &&
      right <= this.safeArea.right &&
      bottom <= this.safeArea.bottom;

    const result: ValidationResult = {
      isValid,
      overflow
    };

    if (!isValid && this.enableWarnings) {
      const overflowDetails = Object.entries(overflow)
        .filter(([_, value]) => value > 0)
        .map(([side, pixels]) => `${side}: ${pixels}px`)
        .join(', ');

      result.message = `⚠️ "${elementName}" 超出安全区！${overflowDetails}`;

      console.warn(result.message, {
        element: {
          position: { x, y },
          size: { width, height },
          bounds: { left: x, top: y, right, bottom }
        },
        safeArea: {
          left: this.safeArea.left,
          top: this.safeArea.top,
          right: this.safeArea.right,
          bottom: this.safeArea.bottom,
          size: {
            width: this.safeArea.width,
            height: this.safeArea.height
          }
        },
        overflow
      });
    }

    return result;
  }

  /**
   * 验证多个元素
   */
  validateMultiple(elements: Array<{ name: string; bounds: ElementBounds }>): {
    allValid: boolean;
    results: Array<{ name: string; result: ValidationResult }>;
  } {
    const results = elements.map(({ name, bounds }) => ({
      name,
      result: this.validate(name, bounds)
    }));

    const allValid = results.every(({ result }) => result.isValid);

    if (!allValid && this.enableWarnings) {
      const invalidCount = results.filter(({ result }) => !result.isValid).length;
      console.warn(`⚠️ ${invalidCount}/${results.length} 个元素超出安全区！`);
    }

    return { allValid, results };
  }

  /**
   * 获取安全区边界
   */
  getSafeAreaBounds(): ElementBounds {
    return {
      x: this.safeArea.left,
      y: this.safeArea.top,
      width: this.safeArea.width,
      height: this.safeArea.height
    };
  }

  /**
   * 将元素位置调整到安全区内
   */
  adjustToSafeArea(bounds: ElementBounds, padding = 0): ElementBounds {
    let { x, y, width, height } = bounds;

    // 调整X坐标
    if (x < this.safeArea.left + padding) {
      x = this.safeArea.left + padding;
    } else if (x + width > this.safeArea.right - padding) {
      x = this.safeArea.right - padding - width;
    }

    // 调整Y坐标
    if (y < this.safeArea.top + padding) {
      y = this.safeArea.top + padding;
    } else if (y + height > this.safeArea.bottom - padding) {
      y = this.safeArea.bottom - padding - height;
    }

    return { x, y, width, height };
  }

  /**
   * 启用/禁用警告
   */
  setWarnings(enabled: boolean): void {
    this.enableWarnings = enabled;
  }
}

/**
 * 创建全局验证器实例
 */
let globalValidator: SafeAreaValidator | null = null;

export function createGlobalValidator(safeArea: SafeArea): SafeAreaValidator {
  globalValidator = new SafeAreaValidator(safeArea);
  return globalValidator;
}

export function getGlobalValidator(): SafeAreaValidator | null {
  return globalValidator;
}

export function destroyGlobalValidator(): void {
  globalValidator = null;
}
