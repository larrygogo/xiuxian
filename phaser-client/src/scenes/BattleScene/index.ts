/**
 * BattleScene - 战斗场景
 * 处理战斗UI和WebSocket事件
 */

import { SCENE_KEYS, COLORS } from '@/config/constants';
import { BaseScene } from '@/scenes/BaseScene';
import { battleSocket } from '@/services/websocket/BattleSocket';
import { battleAPI } from '@/services/api/BattleAPI';
import { stateManager } from '@/services/managers/StateManager';
import { storage } from '@/utils/storage';
import { BattlefieldGrid, CountdownBar, CommandPanel, BattleLogPanel } from './components';
import type { BattleUICommandType, TargetScope } from './components';
import type {
  BattleSnapshotDTO,
  BattleEventDTO,
  BattleStartPayload,
  TurnBeginPayload,
  TurnAutoFillPayload,
  TurnResolvePayload,
  BattleEndPayload
} from '@/types/battle.types';
import type { Item, Consumable } from '@/types/item.types';
import { isConsumable } from '@/types/item.types';

/**
 * 战斗场景
 */
export default class BattleScene extends BaseScene {
  private roomId: string = '';

  // UI 组件
  private battlefieldGrid!: BattlefieldGrid;
  private countdownBar!: CountdownBar;
  private commandPanel!: CommandPanel;
  private battleLogPanel!: BattleLogPanel;
  private headerContainer!: Phaser.GameObjects.Container;
  private connectionStatus!: Phaser.GameObjects.Text;

  // 状态
  private snapshot: BattleSnapshotDTO | null = null;
  private battleLogs: string[] = [];
  private connected: boolean = false;
  private commandSubmitted: boolean = false;
  private selectedCommand: BattleUICommandType | null = null;
  private selectedTarget: string | null = null;
  private selectedItemId: string | null = null;
  private submittedPlayerIds: string[] = [];
  private countdown: number | null = null;
  private countdownTimer?: Phaser.Time.TimerEvent;

  // 回调
  private onBattleEnd?: () => void;
  private onRoomMissing?: () => void;

  constructor() {
    super({ key: SCENE_KEYS.BATTLE });
  }

  init(data: { roomId: string; onBattleEnd?: () => void; onRoomMissing?: () => void }) {
    this.roomId = data.roomId;
    this.onBattleEnd = data.onBattleEnd;
    this.onRoomMissing = data.onRoomMissing;

    // 重置状态
    this.snapshot = null;
    this.battleLogs = [];
    this.connected = false;
    this.commandSubmitted = false;
    this.selectedCommand = null;
    this.selectedTarget = null;
    this.selectedItemId = null;
    this.submittedPlayerIds = [];
    this.countdown = null;
  }

  create() {
    console.log('BattleScene: create, roomId:', this.roomId);
    this.initSafeAreaSystem();
    this.createUI();

    // 加载战斗状态并连接 WebSocket
    this.initBattle();
  }

  protected createUI(): void {
    const safeRect = this.getSafeRect();

    // 创建头部
    this.createHeader(safeRect);

    // 创建战场网格
    this.createBattlefieldGrid(safeRect);

    // 创建倒计时条
    this.createCountdownBar(safeRect);

    // 创建指令面板
    this.createCommandPanel(safeRect);

    // 创建日志面板
    this.createBattleLogPanel(safeRect);
  }

  /**
   * 创建头部
   */
  private createHeader(safeRect: { x: number; y: number; width: number; height: number }): void {
    this.headerContainer = this.add.container(safeRect.x + safeRect.width / 2, safeRect.y + 25);

    // 标题
    const titleText = this.add.text(
      -safeRect.width / 2 + 10,
      0,
      '战斗界面',
      {
        fontSize: '26px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold'
      }
    );
    titleText.setOrigin(0, 0.5);
    this.headerContainer.add(titleText);

    // 连接状态
    this.connectionStatus = this.add.text(
      safeRect.width / 2 - 10,
      0,
      '连接中...',
      {
        fontSize: '22px',
        color: '#f39c12',
        fontFamily: 'Arial, sans-serif'
      }
    );
    this.connectionStatus.setOrigin(1, 0.5);
    this.headerContainer.add(this.connectionStatus);

    this.uiRoot.add(this.headerContainer);
  }

  /**
   * 创建战场网格
   */
  private createBattlefieldGrid(safeRect: { x: number; y: number; width: number; height: number }): void {
    const gridHeight = safeRect.height * 0.45;

    this.battlefieldGrid = new BattlefieldGrid({
      scene: this,
      x: safeRect.x + safeRect.width / 2,
      y: safeRect.y + 60 + gridHeight / 2,
      width: safeRect.width - 20,
      height: gridHeight
    });

    this.battlefieldGrid.setOnTargetClick((targetId, isPlayer) => {
      if (!this.commandSubmitted) {
        this.selectedTarget = targetId;
        this.updateUI();
      }
    });

    this.uiRoot.add(this.battlefieldGrid);
  }

  /**
   * 创建倒计时条
   */
  private createCountdownBar(safeRect: { x: number; y: number; width: number; height: number }): void {
    const gridHeight = safeRect.height * 0.45;

    this.countdownBar = new CountdownBar({
      scene: this,
      x: safeRect.x + safeRect.width / 2,
      y: safeRect.y + 60 + gridHeight + 30,
      width: safeRect.width - 20,
      height: 50
    });

    // 设置到战场网格的中间内容
    // this.battlefieldGrid.setMiddleContent(this.countdownBar);
    this.uiRoot.add(this.countdownBar);
  }

  /**
   * 创建指令面板
   */
  private createCommandPanel(safeRect: { x: number; y: number; width: number; height: number }): void {
    const panelWidth = Math.min(safeRect.width - 20, 320);
    const panelHeight = 350;

    this.commandPanel = new CommandPanel({
      scene: this,
      x: safeRect.x + safeRect.width / 2,
      y: safeRect.y + safeRect.height - panelHeight / 2 - 180,
      width: panelWidth,
      height: panelHeight
    });

    this.commandPanel.setOnCommandSelect((command) => {
      this.selectedCommand = command;
      // 切换指令时清除选择
      if (command !== 'item') {
        this.selectedItemId = null;
      }
      if (command !== 'attack' && command !== 'item') {
        this.selectedTarget = null;
      }
      this.updateUI();
    });

    this.commandPanel.setOnItemSelect((itemId) => {
      this.selectedItemId = itemId;
      // 如果是 self 目标范围的物品，自动选择自己
      if (itemId) {
        const item = this.getConsumables().find(c => c.id === itemId);
        if (item && this.getItemTargetScope(item) === 'self') {
          this.selectedTarget = this.getSelfCombatantId();
        } else {
          this.selectedTarget = null;
        }
      } else {
        this.selectedTarget = null;
      }
      this.updateUI();
    });

    this.commandPanel.setOnSubmit(() => {
      this.submitCommand();
    });

    this.commandPanel.setOnExitBattle(() => {
      this.exitBattle();
    });

    this.uiRoot.add(this.commandPanel);
  }

  /**
   * 创建日志面板
   */
  private createBattleLogPanel(safeRect: { x: number; y: number; width: number; height: number }): void {
    const panelHeight = 150;

    this.battleLogPanel = new BattleLogPanel({
      scene: this,
      x: safeRect.x + safeRect.width / 2,
      y: safeRect.y + safeRect.height - panelHeight / 2 - 10,
      width: safeRect.width - 20,
      height: panelHeight
    });

    this.uiRoot.add(this.battleLogPanel);
  }

  /**
   * 初始化战斗
   */
  private async initBattle(): Promise<void> {
    // 加载战斗状态
    await this.loadBattleState();

    // 连接 WebSocket
    this.connectWebSocket();
  }

  /**
   * 加载战斗状态
   */
  private async loadBattleState(): Promise<void> {
    try {
      const response = await battleAPI.getRoomState(this.roomId);
      this.snapshot = response.snapshot;

      // 计算倒计时
      if (this.snapshot.deadlineAt) {
        const remaining = Math.max(0, Math.floor((this.snapshot.deadlineAt - Date.now()) / 1000));
        this.countdown = remaining;
        this.startCountdownTimer();
      }

      // 计算已提交指令
      this.submittedPlayerIds = this.snapshot.commands.map(cmd => cmd.playerId);

      // 检查当前用户是否已提交
      const userId = stateManager.getUser()?.id;
      if (userId) {
        const playerId = `player_${userId}`;
        this.commandSubmitted = this.snapshot.commands.some(cmd => cmd.playerId === playerId);
      }

      this.updateUI();
    } catch (error: any) {
      console.error('加载战斗状态失败:', error);
      this.addLog('加载战斗状态失败');

      const status = error?.response?.status;
      const errorMessage = error?.response?.data?.error as string | undefined;
      if (status === 404 || errorMessage === '战斗房间不存在') {
        this.onRoomMissing?.();
      }
    }
  }

  /**
   * 连接 WebSocket
   */
  private connectWebSocket(): void {
    const token = storage.get<string>('token');
    if (!token) {
      console.error('未找到认证令牌');
      return;
    }

    // 连接战斗 Socket
    battleSocket.connect(token);

    // 监听战斗事件
    battleSocket.onBattleEvent(this.handleBattleEvent.bind(this));

    // 加入房间
    battleSocket.joinRoom(this.roomId);

    // 更新连接状态
    this.connected = true;
    this.connectionStatus.setText('已连接');
    this.connectionStatus.setColor('#2ecc71');
    this.addLog('已连接到战斗服务器');
    this.addLog(`已加入战斗房间 ${this.roomId}`);
  }

  /**
   * 处理战斗事件
   */
  private handleBattleEvent(event: BattleEventDTO): void {
    console.log('收到战斗事件:', event.type);

    switch (event.type) {
      case 'BATTLE_START':
        this.handleBattleStart(event.payload as BattleStartPayload);
        break;
      case 'TURN_BEGIN':
        this.handleTurnBegin(event.payload as TurnBeginPayload);
        break;
      case 'TURN_AUTO_FILL':
        this.handleTurnAutoFill(event.payload as TurnAutoFillPayload);
        break;
      case 'TURN_RESOLVE':
        this.handleTurnResolve(event.payload as TurnResolvePayload);
        break;
      case 'BATTLE_END':
        this.handleBattleEnd(event.payload as BattleEndPayload);
        break;
    }
  }

  /**
   * 处理战斗开始事件
   */
  private handleBattleStart(payload: BattleStartPayload): void {
    this.snapshot = payload.snapshot;
    this.addLog('战斗开始！');
    this.updateUI();
  }

  /**
   * 处理回合开始事件
   */
  private handleTurnBegin(payload: TurnBeginPayload): void {
    this.submittedPlayerIds = payload.submittedCommands;

    // 检查当前用户是否已提交
    const userId = stateManager.getUser()?.id;
    if (userId) {
      const playerId = `player_${userId}`;
      this.commandSubmitted = payload.submittedCommands.includes(playerId);
    } else {
      this.commandSubmitted = false;
    }

    // 重置选择
    if (!this.commandSubmitted) {
      this.selectedCommand = 'attack'; // 默认选中攻击
      this.selectedTarget = null;
      this.selectedItemId = null;
    }

    // 计算倒计时
    const remaining = Math.max(0, Math.floor((payload.deadlineAt - Date.now()) / 1000));
    this.countdown = remaining;
    this.startCountdownTimer();

    this.addLog(`第 ${payload.turnNumber} 回合开始`);
    this.updateUI();
  }

  /**
   * 处理自动补齐事件
   */
  private handleTurnAutoFill(payload: TurnAutoFillPayload): void {
    this.addLog(`自动补齐 ${payload.autoFilledPlayers.length} 名玩家的指令`);
  }

  /**
   * 处理回合结算事件
   */
  private handleTurnResolve(payload: TurnResolvePayload): void {
    this.snapshot = payload.snapshot;
    this.submittedPlayerIds = payload.snapshot.commands.map(cmd => cmd.playerId);

    // 添加战斗日志
    payload.logs.forEach(log => this.addLog(log));

    this.updateUI();
  }

  /**
   * 处理战斗结束事件
   */
  private handleBattleEnd(payload: BattleEndPayload): void {
    // 添加结算日志
    payload.logs.forEach(log => this.addLog(log));

    const winnerText = payload.winner === 'players' ? '玩家' : payload.winner === 'monsters' ? '怪物' : '平局';
    this.addLog(`战斗结束！获胜方：${winnerText}`);

    // 更新快照
    if (payload.snapshot) {
      this.snapshot = payload.snapshot;
    }

    // 显示奖励
    const userId = stateManager.getUser()?.id;
    if (payload.rewards && userId) {
      const playerReward = payload.rewards.find(r => String(r.userId) === userId);
      if (playerReward && playerReward.success) {
        const rewardMessages: string[] = [];
        if (playerReward.qi > 0) {
          rewardMessages.push(`灵气 +${playerReward.qi}`);
        }
        if (playerReward.lingshi > 0) {
          rewardMessages.push(`灵石 +${playerReward.lingshi}`);
        }
        if (playerReward.items.length > 0) {
          const itemTexts = playerReward.items.map(i => {
            if (i.count && i.count > 1) {
              return `${i.name} x${i.count}`;
            }
            return i.name;
          });
          rewardMessages.push(`获得物品：${itemTexts.join('、')}`);
        }
        if (rewardMessages.length > 0) {
          this.addLog(`战斗奖励：${rewardMessages.join('，')}`);
        }
      } else if (playerReward && !playerReward.success) {
        this.addLog('由于死亡或逃跑，未获得战斗奖励');
      }
    }

    // 停止倒计时
    this.stopCountdownTimer();
    this.countdown = 0;

    // 更新阶段
    if (this.snapshot) {
      this.snapshot = { ...this.snapshot, phase: 'ENDED' };
    }

    // 断开连接
    this.connected = false;
    this.connectionStatus.setText('已断开');
    this.connectionStatus.setColor('#e74c3c');
    battleSocket.disconnect();

    this.updateUI();
  }

  /**
   * 提交指令
   */
  private async submitCommand(): Promise<void> {
    if (this.commandSubmitted || !this.snapshot || this.snapshot.phase !== 'TURN_INPUT') {
      return;
    }

    if (!this.selectedCommand) {
      this.addLog('请先选择操作');
      return;
    }

    if (this.selectedCommand === 'attack' && !this.selectedTarget) {
      this.addLog('请先选择攻击目标');
      return;
    }

    if (this.selectedCommand === 'item') {
      if (!this.selectedItemId) {
        this.addLog('请先选择消耗品');
        return;
      }
      if (!this.selectedTarget) {
        this.addLog('请先选择目标');
        return;
      }
    }

    // 更新提交状态
    this.commandPanel.updateState({ submitting: true });

    try {
      const response = await battleAPI.submitCommand(
        this.roomId,
        this.snapshot.turnNumber,
        this.selectedCommand,
        this.selectedTarget || undefined,
        this.selectedCommand === 'item' ? this.selectedItemId || undefined : undefined
      );

      this.commandSubmitted = true;
      this.addLog('指令已提交');

      if (response.allSubmitted) {
        this.addLog('所有玩家已提交，立即结算');
        this.countdown = 0;
        this.stopCountdownTimer();
      }

      // 清除选择
      this.selectedCommand = null;
      this.selectedTarget = null;
      this.selectedItemId = null;

      this.updateUI();
    } catch (error: any) {
      console.error('提交指令失败:', error);
      const errorMessage = error.response?.data?.error || '提交指令失败';
      this.addLog(errorMessage);

      if (errorMessage.includes('已提交')) {
        this.commandSubmitted = true;
        this.updateUI();
      }
    } finally {
      this.commandPanel.updateState({ submitting: false });
    }
  }

  /**
   * 退出战斗
   */
  private exitBattle(): void {
    // 断开 WebSocket
    battleSocket.disconnect();

    // 通知回调
    this.onBattleEnd?.();

    // 返回主场景
    this.scene.start(SCENE_KEYS.MAIN);
  }

  /**
   * 开始倒计时
   */
  private startCountdownTimer(): void {
    this.stopCountdownTimer();

    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (this.countdown !== null && this.countdown > 0) {
          this.countdown--;
          this.updateCountdown();
        }
      },
      loop: true
    });
  }

  /**
   * 停止倒计时
   */
  private stopCountdownTimer(): void {
    if (this.countdownTimer) {
      this.countdownTimer.destroy();
      this.countdownTimer = undefined;
    }
  }

  /**
   * 更新倒计时显示
   */
  private updateCountdown(): void {
    if (!this.snapshot) return;

    this.countdownBar.updateState({
      countdown: this.countdown,
      turnNumber: this.snapshot.turnNumber,
      submittedCount: this.submittedPlayerIds.length,
      totalPlayers: this.snapshot.players.length
    });
  }

  /**
   * 添加日志
   */
  private addLog(message: string): void {
    this.battleLogs.push(message);
    this.battleLogPanel.addLog(message);
  }

  /**
   * 获取消耗品列表
   */
  private getConsumables(): Consumable[] {
    const gameState = stateManager.getGameState();
    if (!gameState?.inventory) return [];

    return gameState.inventory
      .filter((item): item is Item => item !== null)
      .filter(isConsumable);
  }

  /**
   * 获取物品目标范围
   */
  private getItemTargetScope(item: Consumable): TargetScope {
    return item.battleTarget ?? (item.effect.type === 'buff' ? 'self' : 'ally');
  }

  /**
   * 获取当前玩家的战斗单位ID
   */
  private getSelfCombatantId(): string | null {
    const userId = stateManager.getUser()?.id;
    if (!userId || !this.snapshot) return null;

    const player = this.snapshot.players.find(p => String(p.userId) === userId);
    return player?.id ?? null;
  }

  /**
   * 获取已提交的战斗单位ID
   */
  private getSubmittedCombatantIds(): string[] {
    if (!this.snapshot) return [];

    return this.snapshot.players
      .filter(player => {
        const playerId = typeof player.userId === 'number' ? `player_${player.userId}` : null;
        return playerId && this.submittedPlayerIds.includes(playerId);
      })
      .map(player => player.id);
  }

  /**
   * 更新UI
   */
  private updateUI(): void {
    if (!this.snapshot) return;

    const consumables = this.getConsumables();
    const selectedItem = consumables.find(c => c.id === this.selectedItemId);
    const itemTargetScope = selectedItem ? this.getItemTargetScope(selectedItem) : null;
    const selfId = this.getSelfCombatantId();
    const submittedCombatantIds = this.getSubmittedCombatantIds();

    // 更新战场网格
    this.battlefieldGrid.updateState({
      players: this.snapshot.players,
      monsters: this.snapshot.monsters,
      selectedCommand: this.selectedCommand,
      selectedTarget: this.selectedTarget,
      targetingEnabled: !this.commandSubmitted,
      targetScope: this.selectedCommand === 'item' ? itemTargetScope : this.selectedCommand === 'attack' ? 'enemy' : null,
      selfId,
      submittedPlayerIds: submittedCombatantIds
    });

    // 更新倒计时
    this.countdownBar.updateState({
      turnNumber: this.snapshot.turnNumber,
      countdown: this.countdown,
      submittedCount: this.submittedPlayerIds.length,
      totalPlayers: this.snapshot.players.length
    });

    // 更新指令面板
    const selectedTargetName = this.selectedTarget
      ? this.battlefieldGrid.getCombatantName(this.selectedTarget)
      : null;

    this.commandPanel.updateState({
      phase: this.snapshot.phase,
      commandSubmitted: this.commandSubmitted,
      selectedCommand: this.selectedCommand,
      selectedTarget: this.selectedTarget,
      selectedTargetName,
      consumables,
      selectedItemId: this.selectedItemId,
      itemTargetScope
    });
  }

  /**
   * 场景关闭
   */
  shutdown(): void {
    this.stopCountdownTimer();
    battleSocket.disconnect();
    super.shutdown();
  }
}
