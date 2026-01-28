/**
 * 面板管理器
 * 统一管理所有UI面板的创建、显示和隐藏
 */

import Phaser from 'phaser';
import { CharacterPanel } from '@/ui/panels/CharacterPanel';
import { InventoryPanel } from '@/ui/panels/InventoryPanel';
import { EquipmentPanel } from '@/ui/panels/EquipmentPanel';
import { SceneSelectionPanel } from '@/ui/panels/SceneSelectionPanel';
import { EventLogPanel } from '@/ui/panels/EventLogPanel';
import { stateManager } from './StateManager';
import type { GameState } from '@/types/game.types';
import type { SafeAreaManager } from '@/ui/safearea/SafeAreaManager';

export type PanelType = 'character' | 'inventory' | 'equipment' | 'sceneSelection' | 'eventLog';

export class PanelManager extends Phaser.Events.EventEmitter {
  private static instance: PanelManager;
  private scene?: Phaser.Scene;
  private safeAreaManager?: SafeAreaManager;
  private getSafeAreaManagerFn?: () => SafeAreaManager | undefined;

  // 面板实例
  private characterPanel?: CharacterPanel;
  private inventoryPanel?: InventoryPanel;
  private equipmentPanel?: EquipmentPanel;
  private sceneSelectionPanel?: SceneSelectionPanel;
  private eventLogPanel?: EventLogPanel;

  private constructor() {
    super();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): PanelManager {
    if (!PanelManager.instance) {
      PanelManager.instance = new PanelManager();
    }
    return PanelManager.instance;
  }

  /**
   * 初始化面板管理器
   */
  init(scene: Phaser.Scene, getSafeAreaManagerFn?: () => SafeAreaManager | undefined): void {
    this.scene = scene;
    this.getSafeAreaManagerFn = getSafeAreaManagerFn;

    // 如果场景有 getSafeAreaManager 方法，自动使用
    if (!this.getSafeAreaManagerFn && 'getSafeAreaManager' in scene) {
      this.getSafeAreaManagerFn = () => (scene as any).getSafeAreaManager();
    }

    // 监听游戏状态更新，自动更新所有打开的面板
    stateManager.on('gameState:updated', (state: GameState) => {
      this.updateAllPanels(state);
    });
  }

  /**
   * 显示角色面板
   */
  showCharacterPanel(): void {
    if (!this.scene) return;

    if (!this.characterPanel) {
      const safeAreaManager = this.getSafeAreaManagerFn?.();
      this.characterPanel = new CharacterPanel(this.scene, safeAreaManager);
    }
    this.characterPanel.show();
    this.emit('panel:opened', 'character');
  }

  /**
   * 显示背包面板
   */
  showInventoryPanel(): void {
    if (!this.scene) return;

    if (!this.inventoryPanel) {
      const safeAreaManager = this.getSafeAreaManagerFn?.();
      this.inventoryPanel = new InventoryPanel(this.scene, safeAreaManager);
    }
    this.inventoryPanel.show();
    this.emit('panel:opened', 'inventory');
  }

  /**
   * 显示装备面板
   */
  showEquipmentPanel(): void {
    if (!this.scene) return;

    if (!this.equipmentPanel) {
      const safeAreaManager = this.getSafeAreaManagerFn?.();
      this.equipmentPanel = new EquipmentPanel(this.scene, safeAreaManager);
    }
    this.equipmentPanel.show();
    this.emit('panel:opened', 'equipment');
  }

  /**
   * 显示场景选择面板
   */
  showSceneSelectionPanel(onSceneSelected?: (sceneId: string) => void): void {
    if (!this.scene) return;

    if (!this.sceneSelectionPanel) {
      const safeAreaManager = this.getSafeAreaManagerFn?.();
      this.sceneSelectionPanel = new SceneSelectionPanel(this.scene, onSceneSelected, safeAreaManager);
    }
    this.sceneSelectionPanel.show();
    this.emit('panel:opened', 'sceneSelection');
  }

  /**
   * 显示事件日志面板
   */
  showEventLogPanel(): void {
    if (!this.scene) return;

    if (!this.eventLogPanel) {
      this.eventLogPanel = new EventLogPanel({
        scene: this.scene,
        x: this.scene.cameras.main.width / 2,
        y: this.scene.cameras.main.height / 2,
        width: 350,
        height: 300
      });
    }
    this.eventLogPanel.show();
    this.emit('panel:opened', 'eventLog');
  }

  /**
   * 隐藏指定面板
   */
  hidePanel(type: PanelType): void {
    switch (type) {
      case 'character':
        this.characterPanel?.hide();
        break;
      case 'inventory':
        this.inventoryPanel?.hide();
        break;
      case 'equipment':
        this.equipmentPanel?.hide();
        break;
      case 'sceneSelection':
        this.sceneSelectionPanel?.hide();
        break;
      case 'eventLog':
        this.eventLogPanel?.hide();
        break;
    }
    this.emit('panel:closed', type);
  }

  /**
   * 隐藏所有面板
   */
  hideAllPanels(): void {
    this.characterPanel?.hide();
    this.inventoryPanel?.hide();
    this.equipmentPanel?.hide();
    this.sceneSelectionPanel?.hide();
    this.eventLogPanel?.hide();
    this.emit('panels:allClosed');
  }

  /**
   * 切换面板显示/隐藏
   */
  togglePanel(type: PanelType): void {
    const panel = this.getPanel(type);
    if (panel?.visible) {
      this.hidePanel(type);
    } else {
      switch (type) {
        case 'character':
          this.showCharacterPanel();
          break;
        case 'inventory':
          this.showInventoryPanel();
          break;
        case 'equipment':
          this.showEquipmentPanel();
          break;
        case 'sceneSelection':
          this.showSceneSelectionPanel();
          break;
        case 'eventLog':
          this.showEventLogPanel();
          break;
      }
    }
  }

  /**
   * 获取指定面板
   */
  private getPanel(type: PanelType): Phaser.GameObjects.Container | undefined {
    switch (type) {
      case 'character':
        return this.characterPanel;
      case 'inventory':
        return this.inventoryPanel;
      case 'equipment':
        return this.equipmentPanel;
      case 'sceneSelection':
        return this.sceneSelectionPanel;
      case 'eventLog':
        return this.eventLogPanel;
    }
  }

  /**
   * 检查面板是否打开
   */
  isPanelVisible(type: PanelType): boolean {
    const panel = this.getPanel(type);
    return panel?.visible ?? false;
  }

  /**
   * 更新所有打开的面板
   */
  private updateAllPanels(state: GameState): void {
    if (this.characterPanel?.visible) {
      this.characterPanel.update(state);
    }
    if (this.inventoryPanel?.visible) {
      this.inventoryPanel.update(state);
    }
    if (this.equipmentPanel?.visible) {
      this.equipmentPanel.update(state);
    }
  }

  /**
   * 销毁所有面板
   */
  destroyAllPanels(): void {
    this.characterPanel?.destroy();
    this.inventoryPanel?.destroy();
    this.equipmentPanel?.destroy();
    this.sceneSelectionPanel?.destroy();
    this.eventLogPanel?.destroy();

    this.characterPanel = undefined;
    this.inventoryPanel = undefined;
    this.equipmentPanel = undefined;
    this.sceneSelectionPanel = undefined;
    this.eventLogPanel = undefined;

    this.emit('panels:destroyed');
  }

  /**
   * 重置管理器
   */
  reset(): void {
    this.destroyAllPanels();
    this.scene = undefined;
    this.removeAllListeners();
  }
}

// 导出单例实例
export const panelManager = PanelManager.getInstance();
