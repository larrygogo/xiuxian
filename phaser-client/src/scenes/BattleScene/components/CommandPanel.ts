/**
 * 战斗指令面板组件
 * 选择和提交战斗指令
 */

import Phaser from 'phaser';
import { UIContainer } from '@/ui/core/UIContainer';
import { UIButton } from '@/ui/core/UIButton';
import { COLORS } from '@/config/constants';
import type { BattlePhase, Combatant, BattleCommandType } from '@/types/battle.types';
import type { Consumable } from '@/types/item.types';

export type BattleUICommandType = 'attack' | 'defend' | 'escape' | 'item';

export interface CommandPanelConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CommandPanelState {
  phase: BattlePhase;
  commandSubmitted: boolean;
  selectedCommand: BattleUICommandType | null;
  selectedTarget: string | null;
  selectedTargetName: string | null;
  consumables: Consumable[];
  selectedItemId: string | null;
  itemTargetScope: 'self' | 'ally' | 'enemy' | 'any' | null;
  submitting: boolean;
}

export class CommandPanel extends UIContainer {
  private config: CommandPanelConfig;

  // UI 元素
  private background!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private commandButtons: Map<BattleUICommandType, UIButton> = new Map();
  private hintContainer!: Phaser.GameObjects.Container;
  private hintText!: Phaser.GameObjects.Text;
  private targetInfoText!: Phaser.GameObjects.Text;
  private itemSelectContainer!: Phaser.GameObjects.Container;
  private itemButtons: UIButton[] = [];
  private submitButton!: UIButton;
  private submittedContainer!: Phaser.GameObjects.Container;
  private phaseInfoText!: Phaser.GameObjects.Text;
  private exitButton!: UIButton;

  // 状态
  private _state: CommandPanelState = {
    phase: 'PREPARE',
    commandSubmitted: false,
    selectedCommand: null,
    selectedTarget: null,
    selectedTargetName: null,
    consumables: [],
    selectedItemId: null,
    itemTargetScope: null,
    submitting: false
  };

  // 回调
  private onCommandSelect?: (command: BattleUICommandType) => void;
  private onItemSelect?: (itemId: string | null) => void;
  private onSubmit?: () => void;
  private onExitBattle?: () => void;

  constructor(config: CommandPanelConfig) {
    super(config.scene, config.x, config.y);
    this.config = config;

    this.createUI();
    this.updateDisplay();
  }

  /**
   * 创建UI
   */
  private createUI(): void {
    const { width, height } = this.config;

    // 背景
    this.background = this.scene.add.rectangle(
      0, 0,
      width,
      height,
      COLORS.dark,
      0.9
    );
    this.background.setStrokeStyle(2, COLORS.light, 0.3);
    this.add(this.background);

    // 标题
    this.titleText = this.scene.add.text(
      0,
      -height / 2 + 25,
      '战斗指令',
      {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold'
      }
    );
    this.titleText.setOrigin(0.5);
    this.add(this.titleText);

    // 创建指令按钮
    this.createCommandButtons();

    // 创建提示区域
    this.createHintArea();

    // 创建物品选择区域
    this.createItemSelectArea();

    // 创建提交按钮
    this.createSubmitButton();

    // 创建已提交状态显示
    this.createSubmittedDisplay();

    // 创建阶段信息
    this.createPhaseInfo();

    // 创建退出按钮
    this.createExitButton();
  }

  /**
   * 创建指令按钮
   */
  private createCommandButtons(): void {
    const { width, height } = this.config;

    const commands: Array<{ id: BattleUICommandType; label: string }> = [
      { id: 'attack', label: '普通攻击' },
      { id: 'defend', label: '防御' },
      { id: 'escape', label: '逃跑' },
      { id: 'item', label: '物品' }
    ];

    const buttonWidth = (width - 40) / 2 - 5;
    const buttonHeight = 40;
    const startY = -height / 2 + 65;

    commands.forEach((cmd, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;

      const x = -width / 2 + 20 + col * (buttonWidth + 10) + buttonWidth / 2;
      const y = startY + row * (buttonHeight + 10);

      const button = new UIButton({
        scene: this.scene,
        x,
        y,
        width: buttonWidth,
        height: buttonHeight,
        text: cmd.label,
        onClick: () => this.handleCommandClick(cmd.id)
      });

      this.commandButtons.set(cmd.id, button);
      this.add(button);
    });
  }

  /**
   * 创建提示区域
   */
  private createHintArea(): void {
    const { width, height } = this.config;

    this.hintContainer = this.scene.add.container(0, -height / 2 + 175);
    this.add(this.hintContainer);

    this.hintText = this.scene.add.text(
      0, 0,
      '',
      {
        fontSize: '12px',
        color: '#aaaaaa',
        fontFamily: 'Arial, sans-serif',
        wordWrap: { width: width - 40 },
        align: 'center'
      }
    );
    this.hintText.setOrigin(0.5, 0);
    this.hintContainer.add(this.hintText);

    this.targetInfoText = this.scene.add.text(
      0, 25,
      '',
      {
        fontSize: '13px',
        color: '#2ecc71',
        fontFamily: 'Arial, sans-serif'
      }
    );
    this.targetInfoText.setOrigin(0.5, 0);
    this.hintContainer.add(this.targetInfoText);
  }

  /**
   * 创建物品选择区域
   */
  private createItemSelectArea(): void {
    const { width, height } = this.config;

    this.itemSelectContainer = this.scene.add.container(0, -height / 2 + 230);
    this.itemSelectContainer.setVisible(false);
    this.add(this.itemSelectContainer);
  }

  /**
   * 创建提交按钮
   */
  private createSubmitButton(): void {
    const { width, height } = this.config;

    this.submitButton = new UIButton({
      scene: this.scene,
      x: 0,
      y: height / 2 - 80,
      width: width - 40,
      height: 50,
      text: '确认',
      onClick: () => this.handleSubmit()
    });
    this.submitButton.setColor(COLORS.success);
    this.add(this.submitButton);
  }

  /**
   * 创建已提交状态显示
   */
  private createSubmittedDisplay(): void {
    const { width, height } = this.config;

    this.submittedContainer = this.scene.add.container(0, 0);
    this.submittedContainer.setVisible(false);
    this.add(this.submittedContainer);

    // 图标
    const icon = this.scene.add.text(
      0, -20,
      '✓',
      {
        fontSize: '48px',
        color: '#2ecc71',
        fontFamily: 'Arial, sans-serif'
      }
    );
    icon.setOrigin(0.5);
    this.submittedContainer.add(icon);

    // 文字
    const text = this.scene.add.text(
      0, 30,
      '指令已确认',
      {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif'
      }
    );
    text.setOrigin(0.5);
    this.submittedContainer.add(text);
  }

  /**
   * 创建阶段信息
   */
  private createPhaseInfo(): void {
    const { height } = this.config;

    this.phaseInfoText = this.scene.add.text(
      0,
      height / 2 - 25,
      '',
      {
        fontSize: '14px',
        color: '#f39c12',
        fontFamily: 'Arial, sans-serif'
      }
    );
    this.phaseInfoText.setOrigin(0.5);
    this.add(this.phaseInfoText);
  }

  /**
   * 创建退出按钮
   */
  private createExitButton(): void {
    const { width, height } = this.config;

    this.exitButton = new UIButton({
      scene: this.scene,
      x: 0,
      y: height / 2 - 80,
      width: width - 40,
      height: 50,
      text: '退出战斗',
      onClick: () => this.onExitBattle?.()
    });
    this.exitButton.setColor(COLORS.danger);
    this.exitButton.setVisible(false);
    this.add(this.exitButton);
  }

  /**
   * 处理指令点击
   */
  private handleCommandClick(command: BattleUICommandType): void {
    if (this._state.commandSubmitted || this._state.phase !== 'TURN_INPUT') return;
    this.onCommandSelect?.(command);
  }

  /**
   * 处理提交
   */
  private handleSubmit(): void {
    if (this._state.commandSubmitted || this._state.phase !== 'TURN_INPUT' || this._state.submitting) return;
    this.onSubmit?.();
  }

  /**
   * 更新状态
   */
  updateState(state: Partial<CommandPanelState>): this {
    this._state = { ...this._state, ...state };
    this.updateDisplay();
    return this;
  }

  /**
   * 更新显示
   */
  private updateDisplay(): void {
    const {
      phase,
      commandSubmitted,
      selectedCommand,
      selectedTarget,
      selectedTargetName,
      consumables,
      selectedItemId,
      itemTargetScope,
      submitting
    } = this._state;

    // 显示/隐藏已提交状态
    this.submittedContainer.setVisible(commandSubmitted);

    // 隐藏/显示指令按钮
    this.commandButtons.forEach((button, cmd) => {
      button.setVisible(!commandSubmitted);
      button.setEnabled(phase === 'TURN_INPUT' && !commandSubmitted);

      // 高亮选中的指令
      if (cmd === selectedCommand) {
        button.setColor(COLORS.warning);
      } else {
        button.setColor(COLORS.primary);
      }
    });

    // 更新提示
    this.updateHint();

    // 更新物品选择
    this.updateItemSelect();

    // 更新提交按钮
    const canSubmit = this.canSubmit();
    this.submitButton.setVisible(!commandSubmitted && phase === 'TURN_INPUT');
    this.submitButton.setEnabled(canSubmit && !submitting);
    this.submitButton.setText(submitting ? '提交中...' : '确认');

    // 更新阶段信息
    this.updatePhaseInfo();

    // 更新退出按钮
    this.exitButton.setVisible(phase === 'ENDED');
  }

  /**
   * 更新提示
   */
  private updateHint(): void {
    const { selectedCommand, selectedTarget, selectedTargetName, itemTargetScope, selectedItemId } = this._state;

    this.hintContainer.setVisible(!this._state.commandSubmitted && this._state.phase === 'TURN_INPUT');

    if (!selectedCommand) {
      this.hintText.setText('请选择操作');
      this.targetInfoText.setText('');
      return;
    }

    switch (selectedCommand) {
      case 'attack':
        this.hintText.setText('已选择"普通攻击"，请在界面上点击敌方目标');
        break;
      case 'defend':
        this.hintText.setText('已选择"防御"，本回合防御力提升');
        break;
      case 'escape':
        this.hintText.setText('已选择"逃跑"，尝试逃离战斗');
        break;
      case 'item':
        const scopeLabel = this.getTargetScopeLabel(itemTargetScope);
        this.hintText.setText(`请选择消耗品并在界面上点击目标（${scopeLabel}）`);
        break;
    }

    // 更新目标信息
    if (selectedTarget && selectedTargetName) {
      this.targetInfoText.setText(`已选择目标：${selectedTargetName}`);
    } else if (selectedCommand === 'item' && selectedItemId) {
      const item = this._state.consumables.find(c => c.id === selectedItemId);
      if (item) {
        this.targetInfoText.setText(`已选择物品：${item.name}`);
      } else {
        this.targetInfoText.setText('');
      }
    } else {
      this.targetInfoText.setText('');
    }
  }

  /**
   * 获取目标范围标签
   */
  private getTargetScopeLabel(scope: string | null): string {
    switch (scope) {
      case 'self':
        return '仅自己';
      case 'ally':
        return '我方任一目标';
      case 'enemy':
        return '敌方任一目标';
      case 'any':
        return '任意目标';
      default:
        return '未指定';
    }
  }

  /**
   * 更新物品选择
   */
  private updateItemSelect(): void {
    const { selectedCommand, consumables, selectedItemId } = this._state;

    // 清除旧按钮
    this.itemButtons.forEach(btn => btn.destroy());
    this.itemButtons = [];

    // 只在选择物品指令时显示
    this.itemSelectContainer.setVisible(selectedCommand === 'item' && !this._state.commandSubmitted);

    if (selectedCommand !== 'item') return;

    const buttonWidth = 120;
    const buttonHeight = 30;
    const maxVisible = 4;

    const items = consumables.slice(0, maxVisible);
    const startY = 0;

    items.forEach((item, index) => {
      const y = startY + index * (buttonHeight + 5);

      const button = new UIButton({
        scene: this.scene,
        x: 0,
        y,
        width: buttonWidth,
        height: buttonHeight,
        text: `${item.name} x${item.stackSize}`,
        textStyle: { fontSize: '11px' },
        onClick: () => this.onItemSelect?.(item.id)
      });

      if (item.id === selectedItemId) {
        button.setColor(COLORS.warning);
      }

      this.itemButtons.push(button);
      this.itemSelectContainer.add(button);
    });

    if (consumables.length === 0) {
      const emptyText = this.scene.add.text(
        0, 0,
        '没有可用的消耗品',
        {
          fontSize: '12px',
          color: '#888888',
          fontFamily: 'Arial, sans-serif'
        }
      );
      emptyText.setOrigin(0.5);
      this.itemSelectContainer.add(emptyText);
    }
  }

  /**
   * 更新阶段信息
   */
  private updatePhaseInfo(): void {
    const { phase, commandSubmitted } = this._state;

    if (phase === 'TURN_INPUT' || phase === 'ENDED' || commandSubmitted) {
      this.phaseInfoText.setText('');
      return;
    }

    switch (phase) {
      case 'TURN_RESOLVE':
        this.phaseInfoText.setText('回合结算中...');
        break;
      case 'PREPARE':
        this.phaseInfoText.setText('准备中...');
        break;
      default:
        this.phaseInfoText.setText('');
    }
  }

  /**
   * 判断是否可以提交
   */
  private canSubmit(): boolean {
    const { phase, commandSubmitted, selectedCommand, selectedTarget, selectedItemId } = this._state;

    if (phase !== 'TURN_INPUT') return false;
    if (commandSubmitted) return false;
    if (!selectedCommand) return false;

    // 攻击需要目标
    if (selectedCommand === 'attack' && !selectedTarget) return false;

    // 使用物品需要物品ID和目标
    if (selectedCommand === 'item' && (!selectedItemId || !selectedTarget)) return false;

    return true;
  }

  /**
   * 设置指令选择回调
   */
  setOnCommandSelect(callback: (command: BattleUICommandType) => void): this {
    this.onCommandSelect = callback;
    return this;
  }

  /**
   * 设置物品选择回调
   */
  setOnItemSelect(callback: (itemId: string | null) => void): this {
    this.onItemSelect = callback;
    return this;
  }

  /**
   * 设置提交回调
   */
  setOnSubmit(callback: () => void): this {
    this.onSubmit = callback;
    return this;
  }

  /**
   * 设置退出战斗回调
   */
  setOnExitBattle(callback: () => void): this {
    this.onExitBattle = callback;
    return this;
  }

  /**
   * 获取当前选中的指令
   */
  getSelectedCommand(): BattleUICommandType | null {
    return this._state.selectedCommand;
  }

  /**
   * 获取当前选中的物品ID
   */
  getSelectedItemId(): string | null {
    return this._state.selectedItemId;
  }
}
