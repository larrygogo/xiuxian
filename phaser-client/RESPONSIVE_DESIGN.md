# 自适应布局设计方案

## 概述

本游戏采用**设计分辨率 + 分辨率策略（Cocos风格）+ 安全区布局**的自适应方案，确保在不同屏幕尺寸和比例的设备上都能提供良好的用户体验。

## 核心概念

### 1. 设计分辨率与分辨率策略

核心思路：以设计分辨率（1080x1920）为基准，按屏幕宽高比选择策略（SHOW_ALL / NO_BORDER / FIXED_WIDTH / FIXED_HEIGHT），并将策略结果用于安全区与布局计算。

```typescript
// phaser-client/src/config/constants.ts
export const RESOLUTION_POLICY = {
  mode: 'AUTO', // AUTO | SHOW_ALL | NO_BORDER | FIXED_WIDTH | FIXED_HEIGHT
  epsilon: 0.01
};
```

**策略说明：**
- **SHOW_ALL**：完整显示设计分辨率，可能出现黑边
- **NO_BORDER**：填满屏幕，可能裁剪内容
- **FIXED_WIDTH**：宽度固定，高度扩展（更适合窄屏/超长屏）
- **FIXED_HEIGHT**：高度固定，宽度扩展（更适合平板/宽屏）

### 2. 安全区（Safe Area）

安全区是屏幕上确保UI元素不会被裁剪或遮挡的区域，计算时会结合**设备安全插入值**与**分辨率策略的可视区域**。

```typescript
// phaser-client/src/config/constants.ts
export const SAFE_AREA_DESIGN = {
  top: 150 / 1920,
  bottom: 150 / 1920,
  left: 60 / 1080,
  right: 60 / 1080
};
```

**安全区计算：**

```
可用宽度 = 屏幕宽度 - left - right
可用高度 = 屏幕高度 - top - bottom
安全区中心X = left + 可用宽度 / 2
安全区中心Y = top + 可用高度 / 2
```

### 3. ResponsiveHelper 工具类

`ResponsiveHelper` 是自适应布局的核心工具，提供：

- 安全区计算
- 屏幕尺寸获取
- 缩放比例计算
- 坐标转换
- 窗口大小变化监听

> 推荐通过 `SafeAreaManager.getResponsiveHelper()` 获取实例，避免重复初始化。

## 使用指南

### 在场景中使用

```typescript
import { ResponsiveHelper } from '@/utils/ResponsiveHelper';
import { SAFE_AREA } from '@/config/constants';

export default class MainScene extends Phaser.Scene {
  private responsiveHelper!: ResponsiveHelper;

  create() {
    // 1. 初始化SafeAreaManager（内部包含分辨率策略与安全区计算）
    this.safeAreaManager = new SafeAreaManager(this, {
      designWidth: 1080,
      designHeight: 1920,
      resolutionPolicy: RESOLUTION_POLICY,
      safeMarginPercent: SAFE_AREA_DESIGN
    });

    // 2. 获取安全区
    const safeRect = this.safeAreaManager.getFinalSafeRect();

    // 3. 使用安全区布局UI
    this.createTopBar(safeRect.y);
    this.createBottomBar(safeRect.y + safeRect.height);
    this.createContent(safeRect.x + safeRect.width / 2, safeRect.y + safeRect.height / 2);

    // 4. 监听窗口大小变化
    this.scale.on('resize', this.onResize, this);
  }

  private onResize(gameSize: Phaser.Structs.Size) {
    const safeRect = this.safeAreaManager.getFinalSafeRect();
    // 更新UI位置
  }

  shutdown() {
    // 清理监听器
    this.scale.off('resize', this.onResize, this);
    this.safeAreaManager?.destroy();
  }
}
```

### API 参考

#### getSafeArea()

获取安全区域信息：

```typescript
const safeRect = this.safeAreaManager.getFinalSafeRect();
// {
//   x: number,     // 安全区左上角X
//   y: number,     // 安全区左上角Y
//   width: number, // 安全区可用宽度
//   height: number // 安全区可用高度
// }
```

#### getScale()

获取相对于设计稿的缩放比例：

```typescript
const scale = this.safeAreaManager.getScale();
// {
//   x: number,    // X轴缩放比例
//   y: number,    // Y轴缩放比例
//   min: number,  // 最小缩放比例（保持宽高比）
//   max: number   // 最大缩放比例
// }

// 说明：该缩放值用于设计坐标与显示坐标的换算
// UI尺寸建议保持设计尺寸，由安全区与策略决定位置
```

#### toScreenX / toScreenY / toScreenSize

将设计稿坐标/尺寸转换为实际屏幕坐标/尺寸：

```typescript
// 设计稿上的坐标 (1080x1920)
const designX = 540;  // 设计稿中心
const designY = 960;

// 转换为实际屏幕坐标
const screenX = this.responsiveHelper.toScreenX(designX);
const screenY = this.responsiveHelper.toScreenY(designY);

// 转换尺寸（保持宽高比）
const buttonSize = this.responsiveHelper.toScreenSize(100);
```

## 布局示例

### 顶部状态栏

```typescript
private createTopBar() {
  const safeArea = this.responsiveHelper.getSafeArea();

  // 状态栏放在安全区顶部
  const statusBar = this.add.container(0, safeArea.top);

  // 内容宽度使用安全区宽度
  const width = safeArea.width;
  // ...
}
```

### 底部操作栏

```typescript
private createBottomBar() {
  const safeArea = this.responsiveHelper.getSafeArea();
  const scale = this.responsiveHelper.getScale();

  // 底部操作栏位置
  const bottomY = safeArea.bottom - BOTTOM_BAR.PADDING_BOTTOM;

  // 按钮大小根据缩放调整
  const buttonSize = BOTTOM_BAR.BUTTON_SIZE * scale.min;
  const buttonSpacing = BOTTOM_BAR.BUTTON_SPACING * scale.min;

  // 居中布局
  const centerX = this.cameras.main.width / 2;
  const firstButtonX = centerX - buttonSpacing * 1.5;

  // 创建4个按钮
  for (let i = 0; i < 4; i++) {
    const button = this.add.image(
      firstButtonX + buttonSpacing * i,
      bottomY,
      'button'
    );
    button.setDisplaySize(buttonSize, buttonSize);
  }
}
```

### 居中内容

```typescript
private createCenterContent() {
  const safeArea = this.responsiveHelper.getSafeArea();

  // 使用安全区中心点
  const content = this.add.container(safeArea.centerX, safeArea.centerY);
  // ...
}
```

## 设计原则

### 1. 重要UI必须在安全区内

所有重要的UI元素（按钮、文本、信息等）必须放在安全区内，确保不会被裁剪：

```typescript
// ✅ 正确：使用安全区
const button = this.add.image(safeArea.centerX, safeArea.bottom - 60, 'button');

// ❌ 错误：直接使用屏幕边缘
const button = this.add.image(width / 2, height - 20, 'button');
```

### 2. 装饰性元素可以超出安全区

背景、装饰图案等非关键元素可以铺满整个屏幕：

```typescript
// 背景铺满整个屏幕
const bg = this.add.image(width / 2, height / 2, 'background');
bg.setDisplaySize(width, height);

// 但UI元素在安全区内
const panel = this.add.container(safeArea.centerX, safeArea.centerY);
```

### 3. 响应式尺寸

使用缩放比例调整UI元素大小，确保在不同设备上大小合适：

```typescript
const scale = this.responsiveHelper.getScale();

// 小屏幕上缩小，大屏幕上放大
const buttonSize = 100 * scale.min;
const fontSize = Math.round(18 * scale.min);
```

### 4. 监听窗口变化

在支持旋转的设备或可调整大小的窗口中，监听resize事件：

```typescript
this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
  // 重新计算布局
  this.updateLayout();
});
```

## 测试设备

推荐在以下设备尺寸上测试：

| 设备 | 分辨率 | 宽高比 | 说明 |
|------|--------|--------|------|
| **iPhone SE** | 375 x 667 | 9:16 | 最小尺寸 |
| **iPhone 12 Pro** | 390 x 844 | ~9:19.5 | 标准现代手机 |
| **iPhone 14 Pro Max** | 430 x 932 | ~9:19.5 | 大屏手机 |
| **Pixel 5** | 393 x 851 | ~9:19.5 | Android标准 |
| **iPad Mini** | 768 x 1024 | 3:4 | 平板（宽屏） |

### 使用Chrome DevTools测试

1. 打开Chrome DevTools (F12)
2. 点击设备工具栏图标（Toggle device toolbar）
3. 选择设备或自定义尺寸
4. 测试竖屏和横屏

## 配置调整

### 切换到其他缩放模式

如果需要切换缩放模式，修改 `game.config.ts`：

```typescript
// 方案A: FIT - 保持比例有黑边（适合桌面）
const SCALE_MODE = Phaser.Scale.FIT;

// 方案B: WIDTH_CONTROLS_HEIGHT - 宽度固定
const SCALE_MODE = Phaser.Scale.WIDTH_CONTROLS_HEIGHT;

// 方案C: ENVELOP - 全屏无黑边（当前使用）
const SCALE_MODE = Phaser.Scale.ENVELOP;
```

### 调整安全边距

根据实际需求调整 `constants.ts` 中的安全边距：

```typescript
export const SAFE_AREA = {
  top: 60,      // 增大：给顶部留更多空间
  bottom: 120,  // 增大：给底部留更多空间
  left: 32,     // 增大：防止左侧内容被裁剪
  right: 32     // 增大：防止右侧内容被裁剪
};
```

## 常见问题

### Q: 为什么选择ENVELOP而不是FIT？

A: ENVELOP能提供无黑边的全屏体验，更适合移动端游戏。配合安全区使用可以确保重要内容不被裁剪。

### Q: 内容被裁剪了怎么办？

A:
1. 检查UI元素是否使用了安全区布局
2. 增大 `SAFE_AREA` 的边距值
3. 使用 `ResponsiveHelper` 的 API 进行布局

### Q: 不同设备上UI大小不一致？

A: 使用 `getScale()` 获取缩放比例，根据比例调整UI元素大小：

```typescript
const scale = this.responsiveHelper.getScale();
const size = DESIGN_SIZE * scale.min;
```

### Q: 如何支持横屏？

A: 当前设计主要针对竖屏（9:16）。如需支持横屏：

1. 检测屏幕方向：
```typescript
if (this.responsiveHelper.isWideScreen()) {
  // 横屏布局
} else {
  // 竖屏布局
}
```

2. 考虑使用 `HEIGHT_CONTROLS_WIDTH` 模式

### Q: 窗口大小变化时UI错乱？

A: 确保监听了resize事件并更新UI：

```typescript
create() {
  this.scale.on('resize', this.onResize, this);
}

private onResize(gameSize: Phaser.Structs.Size) {
  // 重新计算安全区
  const safeArea = this.responsiveHelper.getSafeArea();
  // 更新UI位置
  this.updateUIPositions(safeArea);
}

shutdown() {
  this.scale.off('resize', this.onResize, this);
}
```

## 总结

本自适应方案的核心是：

1. **ENVELOP缩放模式** - 提供无黑边的全屏体验
2. **安全区布局** - 确保重要UI不被裁剪
3. **ResponsiveHelper工具** - 简化适配开发
4. **响应式尺寸** - 根据屏幕大小调整UI

遵循这些原则，可以确保游戏在各种设备上都有良好的显示效果。
