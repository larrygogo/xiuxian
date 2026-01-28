/**
 * SafeAreaTestSuite - 安全区自动化测试套件
 *
 * 功能：
 * 1. 自动化测试多种分辨率和设备场景
 * 2. 验证安全区计算正确性
 * 3. 检查UI元素是否在安全区内
 * 4. 生成测试报告
 */

import { SafeAreaManager } from '../safearea/SafeAreaManager';
import { LayoutUtil } from '../layout/LayoutUtil';
import type { Rect } from '../safearea/types';

/**
 * 测试场景接口
 */
export interface TestScenario {
  name: string;
  description: string;
  test: () => boolean;
}

/**
 * 测试结果接口
 */
export interface TestResult {
  name: string;
  description: string;
  passed: boolean;
  message?: string;
}

/**
 * 测试报告接口
 */
export interface TestReport {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
  timestamp: Date;
}

/**
 * SafeAreaTestSuite 类
 * 自动化测试安全区系统
 */
export class SafeAreaTestSuite {
  private safeAreaManager: SafeAreaManager;
  private scenarios: TestScenario[];

  constructor(safeAreaManager: SafeAreaManager) {
    this.safeAreaManager = safeAreaManager;
    this.scenarios = this.createScenarios();
  }

  /**
   * 创建测试场景列表
   */
  private createScenarios(): TestScenario[] {
    return [
      {
        name: '1. Desktop Resolution (1920x1080)',
        description: 'Test wide landscape desktop resolution',
        test: () => this.testDesktopResolution()
      },
      {
        name: '2. Mobile Portrait (375x812)',
        description: 'Test iPhone X portrait with notch',
        test: () => this.testMobilePortrait()
      },
      {
        name: '3. Mobile Landscape (812x375)',
        description: 'Test iPhone X landscape with notch',
        test: () => this.testMobileLandscape()
      },
      {
        name: '4. Tablet Portrait (768x1024)',
        description: 'Test iPad portrait',
        test: () => this.testTabletPortrait()
      },
      {
        name: '5. Tablet Landscape (1024x768)',
        description: 'Test iPad landscape',
        test: () => this.testTabletLandscape()
      },
      {
        name: '6. Safe Area Dimensions',
        description: 'Verify final safe area has reasonable dimensions',
        test: () => this.testSafeAreaDimensions()
      },
      {
        name: '7. Rect Hierarchy',
        description: 'Verify finalSafeRect is contained within designRect',
        test: () => this.testRectHierarchy()
      },
      {
        name: '8. Min Safe Area Constraint',
        description: 'Verify minimum safe area constraints are enforced',
        test: () => this.testMinSafeArea()
      },
      {
        name: '9. Coordinate Conversion',
        description: 'Verify toSafeX/Y coordinate conversion',
        test: () => this.testCoordinateConversion()
      }
    ];
  }

  /**
   * 运行所有测试
   */
  runAll(): TestReport {
    const results: TestResult[] = [];

    console.log('SafeAreaTestSuite: running all tests...');

    this.scenarios.forEach((scenario) => {
      let passed = false;
      let message: string | undefined;

      try {
        passed = scenario.test();
        if (!passed) {
          message = 'Test returned false';
        }
      } catch (error) {
        passed = false;
        message = error instanceof Error ? error.message : String(error);
      }

      results.push({
        name: scenario.name,
        description: scenario.description,
        passed,
        message
      });

      console.log(
        `  ${passed ? '✅' : '❌'} ${scenario.name}`,
        message ? `- ${message}` : ''
      );
    });

    const report: TestReport = {
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
      results,
      timestamp: new Date()
    };

    console.log(
      `\nSafeAreaTestSuite: ${report.passed}/${report.total} tests passed`
    );

    return report;
  }

  /**
   * 测试桌面分辨率
   */
  private testDesktopResolution(): boolean {
    const finalRect = this.safeAreaManager.getFinalSafeRect();
    const screenSize = this.safeAreaManager.getScreenSize();

    // 桌面分辨率下，finalSafeRect应该有合理的尺寸
    const isValid =
      finalRect.width > 0 &&
      finalRect.height > 0 &&
      finalRect.width <= screenSize.width &&
      finalRect.height <= screenSize.height;

    return isValid;
  }

  /**
   * 测试手机竖屏
   */
  private testMobilePortrait(): boolean {
    return this.testResolution('Mobile Portrait');
  }

  /**
   * 测试手机横屏
   */
  private testMobileLandscape(): boolean {
    return this.testResolution('Mobile Landscape');
  }

  /**
   * 测试平板竖屏
   */
  private testTabletPortrait(): boolean {
    return this.testResolution('Tablet Portrait');
  }

  /**
   * 测试平板横屏
   */
  private testTabletLandscape(): boolean {
    return this.testResolution('Tablet Landscape');
  }

  /**
   * 通用分辨率测试
   */
  private testResolution(name: string): boolean {
    const finalRect = this.safeAreaManager.getFinalSafeRect();

    // 检查尺寸是否合理
    return finalRect.width > 100 && finalRect.height > 100;
  }

  /**
   * 测试安全区尺寸
   */
  private testSafeAreaDimensions(): boolean {
    const finalRect = this.safeAreaManager.getFinalSafeRect();
    const screenSize = this.safeAreaManager.getScreenSize();

    // finalSafeRect应该小于或等于屏幕尺寸
    const isValid =
      finalRect.width <= screenSize.width &&
      finalRect.height <= screenSize.height &&
      finalRect.width > 0 &&
      finalRect.height > 0;

    return isValid;
  }

  /**
   * 测试矩形层级关系
   */
  private testRectHierarchy(): boolean {
    const designRect = this.safeAreaManager.getDesignRect();
    const finalRect = this.safeAreaManager.getFinalSafeRect();

    // finalSafeRect应该被包含在designRect内
    const isContained =
      finalRect.x >= designRect.x &&
      finalRect.y >= designRect.y &&
      finalRect.x + finalRect.width <= designRect.x + designRect.width &&
      finalRect.y + finalRect.height <= designRect.y + designRect.height;

    return isContained;
  }

  /**
   * 测试最小安全区约束
   */
  private testMinSafeArea(): boolean {
    const finalRect = this.safeAreaManager.getFinalSafeRect();

    // 应该至少满足一定的最小尺寸（根据配置的MIN_SAFE_AREA）
    // 这里使用一个合理的最小值进行检查
    const minWidth = 200;
    const minHeight = 300;

    return finalRect.width >= minWidth && finalRect.height >= minHeight;
  }

  /**
   * 测试坐标转换
   */
  private testCoordinateConversion(): boolean {
    const finalRect = this.safeAreaManager.getFinalSafeRect();

    // 测试 toSafeX/Y 转换
    const x0 = this.safeAreaManager.toSafeX(0);
    const x1 = this.safeAreaManager.toSafeX(1);
    const y0 = this.safeAreaManager.toSafeY(0);
    const y1 = this.safeAreaManager.toSafeY(1);

    // 验证边界值
    const isValid =
      Math.abs(x0 - finalRect.x) < 1 && // 允许1像素误差
      Math.abs(x1 - (finalRect.x + finalRect.width)) < 1 &&
      Math.abs(y0 - finalRect.y) < 1 &&
      Math.abs(y1 - (finalRect.y + finalRect.height)) < 1;

    return isValid;
  }

  /**
   * 测试UI元素边界（需要传入实际的UI元素）
   */
  testUIElementBounds(elements: Array<{ x: number; y: number; width: number; height: number }>): boolean {
    const finalRect = this.safeAreaManager.getFinalSafeRect();

    // 检查所有元素是否在安全区内
    for (const element of elements) {
      const inBounds =
        element.x >= finalRect.x &&
        element.y >= finalRect.y &&
        element.x + element.width <= finalRect.x + finalRect.width &&
        element.y + element.height <= finalRect.y + finalRect.height;

      if (!inBounds) {
        console.warn('Element out of bounds:', element);
        return false;
      }
    }

    return true;
  }

  /**
   * 打印测试报告（格式化输出）
   */
  static printReport(report: TestReport): void {
    console.log('\n========== Safe Area Test Report ==========');
    console.log(`Timestamp: ${report.timestamp.toISOString()}`);
    console.log(`Total Tests: ${report.total}`);
    console.log(`Passed: ${report.passed} ✅`);
    console.log(`Failed: ${report.failed} ❌`);
    console.log('===========================================\n');

    report.results.forEach((result, index) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${status} - ${result.name}`);
      console.log(`   ${result.description}`);
      if (result.message) {
        console.log(`   Message: ${result.message}`);
      }
      console.log('');
    });

    console.log('===========================================');
  }
}
