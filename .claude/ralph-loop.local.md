---
active: true
iteration: 1
max_iterations: 50
completion_promise: null
started_at: "2026-01-28T16:22:08Z"
---

战斗场景选择页面的表单是一个scroll-area，需要始终保持在安全区内

## Iteration 1 - Implementation Complete

### Changes Made

1. **SceneSelectionPanel.ts** - Updated to use SafeAreaManager:
   - Added `SafeAreaManager` import and property
   - Constructor now accepts optional `safeAreaManager` parameter (3rd argument)
   - Panel position calculated from safe area center (not camera center)
   - Panel size dynamically calculated based on safe area (90% width max 500px, 80% height max 700px)
   - `createContent()` uses `getContentBounds()` for relative positioning
   - `createSceneList()` uses dynamic card width (95% of content width)
   - `showConfirmDialog()` positions dialog in safe area center

2. **PanelManager.ts** - Updated to pass SafeAreaManager:
   - `showSceneSelectionPanel()` now retrieves safeAreaManager via `getSafeAreaManagerFn()`
   - Passes safeAreaManager to SceneSelectionPanel constructor

### Technical Details

- Panel is now centered within the safe area, not the camera/screen
- Content layout uses relative positioning based on `getContentBounds()`
- Card widths adapt to available content width
- Confirmation dialog also respects safe area boundaries
- Fallback to camera dimensions if SafeAreaManager is not available

### Verification

- TypeScript compilation passes for modified files (no new errors)
- Pattern matches existing safe-area-aware panels (CharacterPanel, InventoryPanel, EquipmentPanel)
