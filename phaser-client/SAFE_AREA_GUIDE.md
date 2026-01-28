# 安全区使用指南 - 确保UI不被裁剪

## 🎯 核心原则

**所有重要的UI元素必须放在安全区内，否则可能被裁剪或遮挡。**

## 📐 安全区定义

安全区是屏幕上确保UI不会被裁剪或遮挡的区域。

```typescript
// phaser-client/src/config/constants.ts
export const SAFE_AREA = {
  top: 150,     // 顶部安全边距（状态栏、刘海屏、水滴屏）
  bottom: 150,  // 底部安全边距（Home indicator、手势区）
  left: 60,     // 左侧安全边距（防止横向裁剪）
  right: 60     // 右侧安全边距（防止横向裁剪）
};
```

### 可视化示意

```
┌─────────────────────────────────┐
│ 🟥 危险区 (top: 150px)          │ ← 状态栏、刘海屏区域
├─────────────────────────────────┤
│🟥│🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩│🟥│
│危│                           │危│
│险│   ✅ 安全区               │险│ ← 所有UI必须在这里
│区│   960 x 1620              │区│
│ │   [头像] [状态栏]   💎100 │ │
│ │                           │ │
│ │     主游戏内容              │ │
│ │                           │ │
│ │   [修仙日志]               │ │
│ │   [底部操作栏]             │ │
│🟥│🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩│🟥│
├─────────────────────────────────┤
│ 🟥 危险区 (bottom: 150px)       │ ← Home indicator、手势区
└─────────────────────────────────┘
```

## ✅ 正确做法

### 1. 使用 ResponsiveHelper 获取安全区

```typescript
import { ResponsiveHelper } from '@/utils/ResponsiveHelper';
import { SAFE_AREA } from '@/config/constants';

// 初始化
this.responsiveHelper = new ResponsiveHelper(this, {
  designWidth: 1080,
  designHeight: 1920,
  safeMargin: SAFE_AREA
});

// 获取安全区
const safeArea = this.responsiveHelper.getSafeArea();
```

### 2. 在安全区内定位UI元素

#### 顶部元素

```typescript
// ✅ 正确：使用安全区顶部
const topBar = this.add.container(
  safeArea.left + 10,
  safeArea.top + 10
);

// ❌ 错误：直接使用屏幕顶部
const topBar = this.add.container(10, 10); // 可能被刘海遮挡
```

#### 底部元素

```typescript
// ✅ 正确：使用安全区底部
const bottomBar = this.add.container(
  safeArea.centerX,
  safeArea.bottom - 60
);

// ❌ 错误：直接使用屏幕底部
const bottomBar = this.add.container(
  width / 2,
  height - 60
); // 可能被Home indicator遮挡
```

#### 左右元素

```typescript
// ✅ 正确：使用安全区左右边界
const leftPanel = this.add.container(safeArea.left + 20, safeArea.centerY);
const rightPanel = this.add.container(safeArea.right - 20, safeArea.centerY);

// ❌ 错误：直接使用屏幕边缘
const leftPanel = this.add.container(20, height / 2); // 可能被裁剪
```

### 3. 使用锚点定位（推荐）

TopStatusBar 支持基于锚点的定位，自动处理安全区：

```typescript
import { TopStatusBar } from '@/ui/widgets/TopStatusBar';
import { TOP_STATUS_BAR } from '@/config/constants';

this.topStatusBar = new TopStatusBar({
  scene: this,
  gameState: this.gameState,
  safeArea: safeArea,
  anchor: TOP_STATUS_BAR.ANCHOR,      // 'top-left' | 'top-center' | 'top-right'
  offsetX: TOP_STATUS_BAR.OFFSET_X,   // 相对锚点的偏移
  offsetY: TOP_STATUS_BAR.OFFSET_Y
});
```

## 🔍 验证UI是否在安全区内

### 方法1：开启调试可视化（推荐）

```typescript
// phaser-client/src/config/constants.ts
export const DEBUG = {
  SHOW_SAFE_AREA: true,  // 开启安全区可视化
  // ...
};
```

运行游戏后会显示：
- 🟩 **绿色半透明区域** = 安全区（UI应该在这里）
- 🟥 **红色半透明区域** = 危险区（UI不能放这里）
- **文本标签** = 显示各区域的边距值

### 方法2：使用 SafeAreaValidator（代码验证）

```typescript
import { SafeAreaValidator } from '@/utils/SafeAreaValidator';

// 创建验证器
const validator = new SafeAreaValidator(safeArea);

// 验证单个元素
const result = validator.validate('底部按钮', {
  x: button.x - button.width / 2,
  y: button.y - button.height / 2,
  width: button.width,
  height: button.height
});

if (!result.isValid) {
  console.error('按钮超出安全区！', result.overflow);
}

// 验证多个元素
const { allValid, results } = validator.validateMultiple([
  { name: '头像', bounds: avatarBounds },
  { name: '状态栏', bounds: statusBarBounds },
  { name: '灵石', bounds: spiritStoneBounds }
]);
```

### 方法3：查看控制台日志

TopStatusBar 会自动验证并输出警告：

```
✅ TopStatusBar created at (70, 160)
   contentSize: {width: 320, height: 140}

⚠️ "灵石文本" 超出安全区！right: 15px
   建议：增加右侧偏移或减小字体大小
```

## 📋 常见UI元素的安全区布局

### 1. 顶部状态栏

```typescript
// 配置文件
export const TOP_STATUS_BAR = {
  ANCHOR: 'top-left',
  OFFSET_X: 10,
  OFFSET_Y: 10  // 距离安全区顶部10px
};

// 创建时自动处理安全区
const statusBar = new TopStatusBar({
  scene: this,
  gameState: this.gameState,
  safeArea: safeArea,
  anchor: TOP_STATUS_BAR.ANCHOR,
  offsetX: TOP_STATUS_BAR.OFFSET_X,
  offsetY: TOP_STATUS_BAR.OFFSET_Y
});
```

### 2. 底部操作栏

```typescript
// 计算底部位置（在安全区内）
const bottomY = safeArea.bottom - BOTTOM_BAR.PADDING_BOTTOM;

// 创建按钮（居中对齐）
const buttons = [];
const buttonSpacing = 120;
const startX = safeArea.centerX - buttonSpacing * 1.5;

for (let i = 0; i < 4; i++) {
  const button = this.add.image(
    startX + buttonSpacing * i,
    bottomY,
    'button'
  );
  buttons.push(button);
}
```

### 3. 事件日志

```typescript
// 位置：在底部操作栏上方
const logHeight = 140;
const logY = safeArea.bottom - BOTTOM_BAR.HEIGHT - logHeight - 20;
const logWidth = safeArea.width;

// 创建日志背景（在安全区内）
const logBg = this.add.graphics();
logBg.fillRoundedRect(
  safeArea.left,  // 使用安全区左边界
  logY,
  logWidth,
  logHeight,
  16
);
```

### 4. 全屏面板（需要留出安全边距）

```typescript
// 创建全屏面板，但内容在安全区内
const panel = this.add.container(0, 0);

// 背景可以铺满屏幕
const background = this.add.rectangle(0, 0, width, height, 0x000000, 0.8);
background.setOrigin(0);

// 内容容器在安全区内
const content = this.add.container(
  safeArea.left + 20,
  safeArea.top + 20
);
content.setSize(
  safeArea.width - 40,
  safeArea.height - 40
);
```

## 🛠️ 窗口Resize时的处理

当窗口大小变化时，安全区会重新计算，需要更新UI位置：

```typescript
// 监听resize事件
this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
  // 重新计算安全区
  const newSafeArea = this.responsiveHelper.getSafeArea();

  // 更新UI位置（推荐：只更新位置，不重建）
  this.topStatusBar?.updatePosition(newSafeArea);

  // 或者重建UI（不推荐，性能较差）
  this.recreateUI(gameSize.width, gameSize.height);
});
```

## 📱 不同设备的安全区

### iPhone 14 Pro Max（刘海屏）

```
顶部安全区: 150px（包含刘海）
底部安全区: 150px（包含Home indicator）
```

### iPhone SE（无刘海）

```
顶部安全区: 150px（包含状态栏）
底部安全区: 150px（预留手势区）
```

### Android 旗舰（水滴屏/挖孔屏）

```
顶部安全区: 150px（包含状态栏和摄像头）
底部安全区: 150px（包含手势导航栏）
```

### iPad（平板）

```
顶部安全区: 150px
底部安全区: 150px
左右安全区: 60px（横屏时更重要）
```

## ⚙️ 调整安全边距

如果发现UI仍然被裁剪，可以增大安全边距：

```typescript
// phaser-client/src/config/constants.ts
export const SAFE_AREA = {
  top: 180,     // 增大顶部边距
  bottom: 180,  // 增大底部边距
  left: 80,     // 增大左侧边距
  right: 80     // 增大右侧边距
};
```

## 🎨 最佳实践

### 1. 使用常量管理边距

```typescript
// 统一的安全边距常量
const SAFE_PADDING = 10;

// 所有元素使用相同的边距
const element1 = { x: safeArea.left + SAFE_PADDING, ... };
const element2 = { x: safeArea.right - SAFE_PADDING, ... };
```

### 2. 优先使用组件封装

使用已经处理好安全区的组件（如TopStatusBar），而不是手动计算位置。

### 3. 设计时考虑安全区

在设计UI布局时，预留足够的安全边距，不要将重要内容放在边缘。

### 4. 测试多种设备

在不同屏幕尺寸和宽高比的设备上测试，确保UI在所有情况下都不被裁剪。

## 📊 检查清单

在发布前，确保：

- [ ] 开启 `DEBUG.SHOW_SAFE_AREA = true` 进行可视化检查
- [ ] 所有重要UI元素在绿色安全区内
- [ ] 控制台没有安全区警告
- [ ] 在多种设备上测试（iPhone SE, iPhone 14, iPad等）
- [ ] 测试窗口resize时UI不会错位或被裁剪
- [ ] 横屏和竖屏（如果支持）都正常显示

## 🔧 调试技巧

### 查看安全区信息

```typescript
create() {
  const safeArea = this.responsiveHelper.getSafeArea();
  console.log('安全区信息:', {
    position: { top: safeArea.top, bottom: safeArea.bottom, left: safeArea.left, right: safeArea.right },
    size: { width: safeArea.width, height: safeArea.height },
    center: { x: safeArea.centerX, y: safeArea.centerY }
  });
}
```

### 临时禁用安全区（仅用于测试）

```typescript
// 临时设置为0，查看没有安全区时的效果
const TEST_SAFE_AREA = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0
};
```

## 🚨 常见错误

### ❌ 错误1：直接使用屏幕尺寸

```typescript
// ❌ 错误
const button = this.add.image(width / 2, height - 60, 'button');
```

```typescript
// ✅ 正确
const button = this.add.image(safeArea.centerX, safeArea.bottom - 60, 'button');
```

### ❌ 错误2：忘记更新resize后的位置

```typescript
// ❌ 错误：创建后不再更新
create() {
  this.button = this.add.image(safeArea.centerX, safeArea.bottom - 60, 'button');
}
```

```typescript
// ✅ 正确：resize时更新位置
create() {
  this.button = this.add.image(safeArea.centerX, safeArea.bottom - 60, 'button');
  this.scale.on('resize', () => {
    const newSafeArea = this.responsiveHelper.getSafeArea();
    this.button.setPosition(newSafeArea.centerX, newSafeArea.bottom - 60);
  });
}
```

### ❌ 错误3：元素尺寸超出安全区

```typescript
// ❌ 错误：宽度超出安全区
const panel = this.add.rectangle(
  safeArea.left,
  safeArea.top,
  safeArea.width + 100,  // 比安全区宽
  200,
  0xffffff
);
```

```typescript
// ✅ 正确：尺寸在安全区内
const panel = this.add.rectangle(
  safeArea.left,
  safeArea.top,
  safeArea.width - 20,   // 留出边距
  200,
  0xffffff
);
```

## 📚 相关文档

- [响应式设计指南](RESPONSIVE_DESIGN.md)
- [TopStatusBar锚点定位指南](src/ui/widgets/TopStatusBar_ANCHOR_GUIDE.md)
- [分辨率更新说明](RESOLUTION_UPDATE.md)

## 🎯 总结

**核心要点：**
1. **所有重要UI必须在安全区内**
2. **使用 ResponsiveHelper 获取安全区**
3. **开启调试可视化进行验证**
4. **监听resize事件更新位置**
5. **在多设备上测试**

遵循这些原则，你的UI在任何设备上都不会被裁剪！
