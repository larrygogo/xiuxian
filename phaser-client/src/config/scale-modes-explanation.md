# Phaser 缩放模式说明

## 为什么会出现黑边？

当游戏的宽高比（9:16）与屏幕宽高比不匹配时，使用 `FIT` 模式会保持游戏的原始宽高比，在屏幕上留下黑边以避免变形。

## 当前分辨率

基准分辨率：**1080 x 1920** (9:16 竖屏)

## 可选的缩放模式

### 1. **FIT** - 保持宽高比，有黑边 ❌
```typescript
mode: Phaser.Scale.FIT
```
- ✅ 优点：整个游戏可见，不会裁剪
- ✅ 优点：不会变形
- ❌ 缺点：在不同宽高比的屏幕上会有黑边

**适用场景**: 固定宽高比的桌面游戏

---

### 2. **ENVELOP** - 覆盖整个屏幕，无黑边 ✅（当前使用）
```typescript
mode: Phaser.Scale.ENVELOP
```
- ✅ 优点：填满整个屏幕，无黑边
- ✅ 优点：保持宽高比，不会变形
- ⚠️ 注意：可能会裁剪部分游戏画面（上下或左右）

**适用场景**: 移动端竖屏游戏（推荐）

**注意事项**:
- 确保重要UI元素在屏幕安全区域内
- 避免将关键按钮放在屏幕边缘

---

### 3. **WIDTH_CONTROLS_HEIGHT** - 宽度固定，高度自适应
```typescript
mode: Phaser.Scale.WIDTH_CONTROLS_HEIGHT
```
- ✅ 优点：宽度固定，适合竖屏
- ✅ 优点：无黑边
- ❌ 缺点：不同屏幕高度差异大时，UI布局需要动态调整

**适用场景**: 需要精确控制宽度的竖屏游戏

---

### 4. **HEIGHT_CONTROLS_WIDTH** - 高度固定，宽度自适应
```typescript
mode: Phaser.Scale.HEIGHT_CONTROLS_WIDTH
```
- ✅ 优点：高度固定，适合横屏
- ✅ 优点：无黑边
- ❌ 缺点：不适合竖屏游戏

**适用场景**: 横屏游戏

---

### 5. **RESIZE** - 完全填充，会变形 ❌
```typescript
mode: Phaser.Scale.RESIZE
```
- ✅ 优点：完全填充屏幕
- ❌ 缺点：不保持宽高比，画面会变形

**不推荐使用**

---

## 当前配置

```typescript
scale: {
  mode: Phaser.Scale.ENVELOP,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  width: 1080,
  height: 1920
}
```

### 配置说明

- **mode**: `ENVELOP` - 覆盖整个屏幕，无黑边
- **autoCenter**: 自动居中
- **width/height**: 基准分辨率 1080x1920（9:16，全高清）
- **分辨率策略**：由 `RESOLUTION_POLICY` 决定 SHOW_ALL / NO_BORDER / FIXED_WIDTH / FIXED_HEIGHT

### 为什么选择 ENVELOP？

1. **无黑边**: 在任何宽高比的屏幕上都能填满整个屏幕
2. **保持比例**: 不会变形
3. **移动端友好**: 适合竖屏手机游戏
4. **沉浸感强**: 全屏体验更好

### 分辨率策略与UI布局

缩放模式负责“画布怎么缩放”，分辨率策略负责“可视区域如何确定”。
建议按以下思路使用：

- **窄屏/超长屏**：FIXED_WIDTH，保持宽度统一，垂直方向扩展
- **平板/宽屏**：FIXED_HEIGHT，保持高度一致，水平方向扩展
- **接近设计比**：SHOW_ALL，完整显示设计稿
- **沉浸模式**：NO_BORDER，允许裁剪

### 可能遇到的问题

#### Q: 部分内容被裁剪了怎么办？

A: 确保重要的UI元素在安全区域内。建议：
- 顶部留至少 150px 的安全边距（状态栏、刘海屏）
- 底部留至少 120px 的安全边距（Home indicator、手势区）
- 左右留至少 32px 的安全边距
- 不要将关键按钮放在屏幕最边缘

#### Q: 如果我想要完全不裁剪任何内容？

A: 改回 `FIT` 模式：

```typescript
scale: {
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  width: 720,
  height: 1280
}
```

但这样会有黑边。

#### Q: 如果我想要动态适应不同高度？

A: 使用 `WIDTH_CONTROLS_HEIGHT` 模式，并在场景中动态调整UI布局：

```typescript
scale: {
  mode: Phaser.Scale.WIDTH_CONTROLS_HEIGHT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  width: 1080
}
```

然后在场景中监听 resize 事件：

```typescript
this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
  // 动态调整UI位置
  this.bottomButton.y = gameSize.height - 80;
});
```

---

## 测试不同屏幕

推荐在以下设备尺寸上测试：

| 设备 | 分辨率 | 宽高比 |
|------|--------|--------|
| iPhone SE | 375 x 667 | 9:16 |
| iPhone 12 Pro | 390 x 844 | ~9:19.5 |
| iPhone 14 Pro Max | 430 x 932 | ~9:19.5 |
| Pixel 5 | 393 x 851 | ~9:19.5 |
| iPad Mini | 768 x 1024 | 3:4 |

在Chrome DevTools中按 F12 → 点击设备工具栏图标 → 选择设备进行测试。
