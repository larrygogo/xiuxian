# 分辨率更新说明

## 更新内容

游戏基准分辨率已从 **720 x 1280** 更新为 **1080 x 1920**。

### 修改的文件

#### 1. [constants.ts](src/config/constants.ts)

```typescript
// 游戏尺寸（竖屏模式 9:16）
export const GAME_WIDTH = 1080;   // 从 720 更新
export const GAME_HEIGHT = 1920;  // 从 1280 更新

// 安全区配置
export const SAFE_AREA = {
  top: 150,     // 从 60 更新（用户已调整）
  bottom: 120,
  left: 32,
  right: 32
};
```

#### 2. [game.config.ts](src/config/game.config.ts)

```typescript
scale: {
  mode: Phaser.Scale.ENVELOP,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  width: 1080,   // 从 720 更新
  height: 1920,  // 从 1280 更新
  min: {
    width: 540,   // 从 360 更新
    height: 960   // 从 640 更新
  },
  max: {
    width: 1620,  // 从 1080 更新
    height: 2880  // 从 1920 更新
  }
}
```

#### 3. [ResponsiveHelper.ts](src/utils/ResponsiveHelper.ts)

```typescript
// 默认配置
this.config = {
  designWidth: 1080,   // 从 720 更新
  designHeight: 1920,  // 从 1280 更新
  safeMargin: {
    top: 150,     // 从 60 更新
    bottom: 120,
    left: 32,
    right: 32
  },
  ...config
};
```

#### 4. [MainScene.ts](src/scenes/MainScene.ts)

```typescript
// 初始化自适应辅助工具
this.responsiveHelper = new ResponsiveHelper(this, {
  designWidth: 1080,   // 从 720 更新
  designHeight: 1920,  // 从 1280 更新
  safeMargin: SAFE_AREA
});
```

## 影响和优势

### 1. **更高的分辨率**

- **原始**: 720 x 1280 (0.92M 像素)
- **新的**: 1080 x 1920 (2.07M 像素)
- **提升**: 像素数量增加 125%

### 2. **更清晰的画面**

- 1080x1920 是现代手机的标准全高清分辨率
- UI元素、文字、图片都会更加清晰
- 更好的视觉体验

### 3. **设备适配**

适配更多现代设备：

| 设备 | 分辨率 | 宽高比 | 适配效果 |
|------|--------|--------|----------|
| **iPhone 12 Pro** | 390 x 844 | ~9:19.5 | ✅ 完美适配 |
| **iPhone 14 Pro Max** | 430 x 932 | ~9:19.5 | ✅ 完美适配 |
| **Pixel 5** | 393 x 851 | ~9:19.5 | ✅ 完美适配 |
| **小米、华为旗舰** | 1080 x 2400 | 9:20 | ✅ 完美适配 |

### 4. **保持宽高比**

- 原始: 720:1280 = 9:16
- 新的: 1080:1920 = 9:16
- **宽高比不变**，所有布局保持一致

## 需要注意的调整

### 1. **图片资源**

如果你有固定尺寸的图片资源，建议：

- **UI元素**: 使用 1.5 倍的尺寸（如果之前是 720 设计稿）
- **背景图**: 建议至少 1080 x 1920 或更大
- **图标按钮**: 建议使用矢量图或高分辨率资源

### 2. **字体大小**

字体大小会自动根据缩放比例调整，但如果有固定像素值的文字：

```typescript
// 之前在 720 设计稿上
fontSize: '18px'  // 在 1080 上看起来会偏小

// 建议使用响应式尺寸
const scale = this.responsiveHelper.getScale();
const fontSize = Math.round(18 * scale.min);
```

### 3. **间距和尺寸**

建议使用 ResponsiveHelper 转换尺寸：

```typescript
// 设计稿上的尺寸（基于 1080 x 1920）
const buttonSize = 100;
const spacing = 20;

// 转换为实际屏幕尺寸
const actualButtonSize = this.responsiveHelper.toScreenSize(buttonSize);
const actualSpacing = this.responsiveHelper.toScreenSize(spacing);
```

### 4. **安全区调整**

顶部安全区已从 60px 增加到 150px，以适配：
- 更大的状态栏显示区域
- 刘海屏/水滴屏/挖孔屏
- 更多的状态信息展示空间

## 测试建议

### 1. **在不同设备上测试**

使用 Chrome DevTools 测试以下分辨率：

```
1. iPhone SE (375 x 667) - 小屏测试
2. iPhone 14 Pro (393 x 852) - 标准屏
3. Pixel 5 (393 x 851) - Android 标准
4. 自定义 (1080 x 1920) - 全高清
```

### 2. **检查安全区可视化**

确保 `DEBUG.SHOW_SAFE_AREA = true`，检查：
- ✅ 所有UI元素在绿色安全区内
- ✅ 顶部状态栏不被遮挡
- ✅ 底部按钮可见且可点击
- ✅ 文字清晰易读

### 3. **性能测试**

更高分辨率可能影响性能：
- 监控 FPS
- 检查内存使用
- 测试低端设备

## 回滚方法

如果需要回滚到 720 x 1280：

```typescript
// constants.ts
export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;
export const SAFE_AREA = {
  top: 60,
  bottom: 120,
  left: 32,
  right: 32
};

// MainScene.ts 和 ResponsiveHelper.ts
designWidth: 720,
designHeight: 1280
```

## 总结

✅ **已完成**：
- 更新所有配置文件中的分辨率
- 更新 ResponsiveHelper 默认值
- 更新 MainScene 初始化参数
- 更新最小/最大尺寸限制

🎯 **建议**：
- 更新或准备 1080 x 1920 的图片资源
- 在多设备上测试
- 检查性能表现

📝 **优势**：
- 更清晰的画面质量
- 更好的现代设备适配
- 保持相同的宽高比和布局
