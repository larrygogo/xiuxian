# 管理器说明

## StateManager - 状态管理器

全局状态管理，管理用户Token、用户信息和游戏状态。

### 使用方法

```typescript
import { stateManager } from '@/services/managers/StateManager';

// 设置Token
stateManager.setToken('your-token');

// 获取Token
const token = stateManager.getToken();

// 设置游戏状态
stateManager.setGameState(gameState);

// 获取游戏状态
const state = stateManager.getGameState();

// 监听状态更新
stateManager.on('gameState:updated', (state) => {
  console.log('游戏状态更新:', state);
});
```

## PanelManager - 面板管理器

统一管理所有UI面板的创建、显示和隐藏。

### 特性

- **单例模式**: 全局唯一实例
- **自动更新**: 监听游戏状态更新，自动刷新所有打开的面板
- **统一管理**: 集中管理所有面板的生命周期
- **事件系统**: 支持监听面板打开/关闭事件

### 使用方法

```typescript
import { panelManager } from '@/services/managers/PanelManager';

// 在场景的create方法中初始化
panelManager.init(this);

// 显示面板
panelManager.showCharacterPanel();
panelManager.showInventoryPanel();
panelManager.showEquipmentPanel();
panelManager.showSceneSelectionPanel((sceneId) => {
  console.log('选择了场景:', sceneId);
});

// 隐藏面板
panelManager.hidePanel('character');
panelManager.hideAllPanels();

// 切换面板
panelManager.togglePanel('inventory');

// 检查面板是否打开
if (panelManager.isPanelVisible('equipment')) {
  console.log('装备面板已打开');
}

// 监听面板事件
panelManager.on('panel:opened', (type) => {
  console.log('打开了面板:', type);
});

panelManager.on('panel:closed', (type) => {
  console.log('关闭了面板:', type);
});

// 在场景销毁时清理
panelManager.destroyAllPanels();
```

### 支持的面板类型

- `'character'` - 角色面板
- `'inventory'` - 背包面板
- `'equipment'` - 装备面板
- `'sceneSelection'` - 场景选择面板

### 自动更新机制

PanelManager监听了`StateManager`的`gameState:updated`事件，当游戏状态更新时：

1. 自动检查所有打开的面板
2. 调用每个打开面板的`update(state)`方法
3. 无需在场景中手动更新面板

这意味着你只需要：

```typescript
// 1. 在场景初始化时
panelManager.init(this);

// 2. 打开面板
panelManager.showInventoryPanel();

// 3. 当状态更新时（通过WebSocket或API），面板会自动刷新
// 无需手动调用 inventoryPanel.update(state)
```
