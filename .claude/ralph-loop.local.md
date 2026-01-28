---
active: true
iteration: 1
max_iterations: 0
completion_promise: null
started_at: "2026-01-28T17:17:01Z"
---

战斗场景选择的卡片中心区域确实一直在安全区内，但是其两端随着屏幕变小之后会超出安全区 --max-interations 20

## Latest Fix - 遮罩半透明 & 按钮点击无效

### 问题
1. 遮罩图形（scrollMask）是可见的半透明
2. 卡片"进入"按钮点击无效（scrollHitArea 拦截了点击事件）

### 修复

1. **隐藏遮罩图形**
   ```typescript
   this.scrollMask.setVisible(false);
   ```
   GeometryMask 不需要源图形可见也能工作

2. **改用场景全局输入监听**
   - 移除 scrollHitArea（它会拦截按钮点击）
   - 使用 `this.scene.input.on('wheel', ...)` 监听滚轮
   - 使用 `this.scene.input.on('pointerdown/pointermove', ...)` 监听触摸滚动
   - 在处理函数中检查坐标是否在滚动区域内
   - 这样卡片按钮可以正常接收点击事件

3. **新增滚动处理方法**
   - `handleWheel` - 处理滚轮事件
   - `handlePointerDown` - 处理触摸开始
   - `handlePointerMove` - 处理触摸移动

4. **在 destroy 中移除监听**
   ```typescript
   this.scene.input.off('wheel', this.handleWheel, this);
   this.scene.input.off('pointerdown', this.handlePointerDown, this);
   this.scene.input.off('pointermove', this.handlePointerMove, this);
   ```
