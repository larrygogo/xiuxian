/**
 * 面板管理器
 * 统一管理所有UI面板的创建、显示和隐藏
 */

import Phaser from 'phaser';
import { CharacterPanel } from '@/ui/panels/CharacterPanel';
import { InventoryPanel } from '@/ui/panels/InventoryPanel';
import { EquipmentPanel } from '@/ui/panels/EquipmentPanel';
import { SceneSelectionPanel } from '@/ui/panels/SceneSelectionPanel';
import { stateManager } from './StateManager';
import type { GameState } from '@/types/game.types';

export type PanelType = 'character' | 'inventory' | 'equipment' | 'sceneSelection';

export class PanelManager extends Phaser.Events.EventEmitter {
  private static instance: PanelManager;
  private scene?: Phaser.Scene;

  // 面板实例
  private characterPanel?: CharacterPanel;
  private inventoryPanel?: InventoryPanel;
  private equipmentPanel?: EquipmentPanel;
  private sceneSelectionPanel?: SceneSelectionPanel;

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
  init(scene: Phaser.Scene): void {
    this.scene = scene;

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
      this.characterPanel = new CharacterPanel(this.scene);
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
      this.inventoryPanel = new InventoryPanel(this.scene);
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
      this.equipmentPanel = new EquipmentPanel(this.scene);
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
      this.sceneSelectionPanel = new SceneSelectionPanel(this.scene, onSceneSelected);
    }
    this.sceneSelectionPanel.show();
    this.emit('panel:opened', 'sceneSelection');
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
      }
    }
  }

  /**
   * 获取指定面板
   */
  private getPanel(type: PanelType): Phaser.GameObjects.GameObject | undefined {
    switch (type) {
      case 'character':
        return this.characterPanel;
      case 'inventory':
        return this.inventoryPanel;
      case 'equipment':
        return this.equipmentPanel;
      case 'sceneSelection':
        return this.sceneSelectionPanel;
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

    this.characterPanel = undefined;
    this.inventoryPanel = undefined;
    this.equipmentPanel = undefined;
    this.sceneSelectionPanel = undefined;

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
