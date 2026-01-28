# TopStatusBar 锚点定位指南

## 概述

TopStatusBar 支持基于锚点的灵活定位系统，可以轻松地将状态栏放置在屏幕的不同位置。

## 锚点类型

```typescript
type AnchorPosition =
  | 'top-left'      // 左上角
  | 'top-center'    // 顶部居中
  | 'top-right';    // 右上角
```

## 配置参数

### TopStatusBarConfig

```typescript
interface TopStatusBarConfig {
  scene: Phaser.Scene;      // 场景引用
  gameState: GameState;     // 游戏状态数据
  safeArea: SafeArea;       // 安全区信息
  anchor?: AnchorPosition;  // 锚点位置（可选，默认 'top-left'）
  offsetX?: number;         // X轴偏移（可选，默认 10）
  offsetY?: number;         // Y轴偏移（可选，默认 10）
}
```

## 使用示例

### 1. 左上角定位（默认）

```typescript
// 方式1：使用默认值
const statusBar = new TopStatusBar({
  scene: this,
  gameState: this.gameState,
  safeArea: safeArea
});

// 方式2：显式指定
const statusBar = new TopStatusBar({
  scene: this,
  gameState: this.gameState,
  safeArea: safeArea,
  anchor: 'top-left',
  offsetX: 10,
  offsetY: 10
});
```

**效果：**
```
┌─────────────────────────────────┐
│ [头像] HP ▓▓▓          💎100    │ ← 左上角 + 偏移(10, 10)
│        MP ▓▓▓                   │
│        QI ▓▓▓                   │
│                                 │
```

### 2. 顶部居中

```typescript
const statusBar = new TopStatusBar({
  scene: this,
  gameState: this.gameState,
  safeArea: safeArea,
  anchor: 'top-center',
  offsetX: 0,     // 居中时X偏移通常为0
  offsetY: 10
});
```

**效果：**
```
┌─────────────────────────────────┐
│      [头像] HP ▓▓▓    💎100     │ ← 顶部居中 + 偏移(0, 10)
│             MP ▓▓▓              │
│             QI ▓▓▓              │
│                                 │
```

### 3. 右上角

```typescript
const statusBar = new TopStatusBar({
  scene: this,
  gameState: this.gameState,
  safeArea: safeArea,
  anchor: 'top-right',
  offsetX: 10,
  offsetY: 10
});
```

**效果：**
```
┌─────────────────────────────────┐
│           💎100  HP ▓▓▓ [头像] │ ← 右上角 + 偏移(-10, 10)
│                  MP ▓▓▓         │
│                  QI ▓▓▓         │
│                                 │
```

## 全局配置

在 `constants.ts` 中配置默认锚点：

```typescript
// phaser-client/src/config/constants.ts
export const TOP_STATUS_BAR = {
  ANCHOR: 'top-left' as const,  // 锚点位置
  OFFSET_X: 10,                 // X轴偏移
  OFFSET_Y: 10                  // Y轴偏移
};
```

在 MainScene 中使用全局配置：

```typescript
this.topStatusBar = new TopStatusBar({
  scene: this,
  gameState: this.gameState,
  safeArea: safeArea,
  anchor: TOP_STATUS_BAR.ANCHOR,
  offsetX: TOP_STATUS_BAR.OFFSET_X,
  offsetY: TOP_STATUS_BAR.OFFSET_Y
});
```

## 偏移说明

### X轴偏移（offsetX）

- **左上角 (top-left)**: 正值向右偏移
  ```
  offsetX: 10  → 距离左边缘 10px
  offsetX: 20  → 距离左边缘 20px
  ```

- **顶部居中 (top-center)**: 正值向右偏移，负值向左偏移
  ```
  offsetX: 0   → 完全居中
  offsetX: 20  → 向右偏移 20px
  offsetX: -20 → 向左偏移 20px
  ```

- **右上角 (top-right)**: 正值向左偏移（远离右边缘）
  ```
  offsetX: 10  → 距离右边缘 10px
  offsetX: 20  → 距离右边缘 20px
  ```

### Y轴偏移（offsetY）

所有锚点：正值向下偏移

```
offsetY: 10  → 距离顶部 10px
offsetY: 20  → 距离顶部 20px
```

## 动态更新位置

当安全区发生变化（如窗口resize）时，可以更新状态栏位置：

```typescript
// 监听窗口大小变化
this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
  const newSafeArea = this.responsiveHelper.getSafeArea();

  // 更新状态栏位置（不需要重建）
  this.topStatusBar?.updatePosition(newSafeArea);
});
```

## 安全区适配

状态栏会自动考虑安全区，确保不会被裁剪：

```typescript
// 安全区配置
export const SAFE_AREA = {
  top: 150,     // 顶部安全边距（状态栏、刘海屏）
  bottom: 150,  // 底部安全边距
  left: 60,     // 左侧安全边距
  right: 60     // 右侧安全边距
};

// 实际位置计算
左上角: (safeArea.left + offsetX, safeArea.top + offsetY)
顶部居中: (safeArea.centerX + offsetX, safeArea.top + offsetY)
右上角: (safeArea.right - offsetX, safeArea.top + offsetY)
```

## 位置计算逻辑

```typescript
private static calculatePosition(
  safeArea: SafeArea,
  anchor: AnchorPosition,
  offsetX: number,
  offsetY: number
): { x: number; y: number } {
  switch (anchor) {
    case 'top-left':
      return {
        x: safeArea.left + offsetX,
        y: safeArea.top + offsetY
      };

    case 'top-center':
      return {
        x: safeArea.centerX + offsetX,
        y: safeArea.top + offsetY
      };

    case 'top-right':
      return {
        x: safeArea.right - offsetX,
        y: safeArea.top + offsetY
      };
  }
}
```

## 最佳实践

### 1. 移动端游戏（推荐）

```typescript
// 使用左上角，留出足够的安全边距
export const TOP_STATUS_BAR = {
  ANCHOR: 'top-left',
  OFFSET_X: 10,
  OFFSET_Y: 10
};
```

### 2. 桌面端游戏

```typescript
// 使用顶部居中，视觉更平衡
export const TOP_STATUS_BAR = {
  ANCHOR: 'top-center',
  OFFSET_X: 0,
  OFFSET_Y: 20
};
```

### 3. 横屏游戏

```typescript
// 根据布局需求选择左上或右上
export const TOP_STATUS_BAR = {
  ANCHOR: 'top-left',    // 或 'top-right'
  OFFSET_X: 20,
  OFFSET_Y: 20
};
```

## 调试技巧

### 1. 开启安全区可视化

```typescript
// constants.ts
export const DEBUG = {
  SHOW_SAFE_AREA: true,
  // ...
};
```

可以看到：
- 🟩 绿色区域 = 安全区
- 🟥 红色区域 = 危险区
- 确保状态栏在绿色区域内

### 2. 控制台日志

```typescript
create() {
  const safeArea = this.responsiveHelper.getSafeArea();
  console.log('Safe area:', safeArea);
  console.log('Status bar position:', {
    anchor: TOP_STATUS_BAR.ANCHOR,
    x: safeArea.left + TOP_STATUS_BAR.OFFSET_X,
    y: safeArea.top + TOP_STATUS_BAR.OFFSET_Y
  });
}
```

## 常见问题

### Q: 如何让状态栏完全居中（水平+垂直）？

A: 目前只支持顶部锚点。如果需要垂直居中，可以自定义偏移：

```typescript
const statusBar = new TopStatusBar({
  scene: this,
  gameState: this.gameState,
  safeArea: safeArea,
  anchor: 'top-center',
  offsetX: 0,
  offsetY: safeArea.height / 2 - 70  // 70是状态栏高度的一半
});
```

### Q: 灵石💎图标的位置可以调整吗？

A: 灵石图标固定在右上角安全区。如果需要调整，可以修改 TopStatusBar 的 createContent 方法：

```typescript
// TopStatusBar.ts
const spiritStoneX = this.safeArea.right - 10;  // 调整这个值
const spiritStoneY = this.safeArea.top + 16;    // 调整这个值
```

### Q: resize时为什么要调用updatePosition？

A: 窗口大小变化时，安全区会重新计算。updatePosition 会根据新的安全区更新状态栏位置，避免重建整个组件，提高性能。

## 总结

锚点定位系统提供了：
- ✅ 灵活的定位选项（左上、居中、右上）
- ✅ 自动安全区适配
- ✅ 响应式布局支持
- ✅ 性能优化的位置更新
- ✅ 易于配置和调试

选择合适的锚点和偏移值，让你的UI在任何设备上都能完美展示！
