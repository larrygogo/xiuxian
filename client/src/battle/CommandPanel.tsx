import { useState, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { battleAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import type { BattleCommandType, Combatant, BattlePhase } from '../types/battle';
import type { Consumable } from '../types/item';
import styles from './CommandPanel.module.css';

type BattleUICommandType = Extract<BattleCommandType, 'attack' | 'defend' | 'escape' | 'item'>;

interface CommandPanelProps {
  socket: Socket | null;
  roomId: string;
  turnNumber: number;
  phase: BattlePhase;
  players: Combatant[];
  monsters: Combatant[];
  commandSubmitted: boolean;
  selectedCommand?: 'attack' | 'defend' | 'escape' | 'item' | null;
  selectedTarget?: string | null;
  consumables?: Consumable[];
  selectedItemId?: string | null;
  itemTargetScope?: 'self' | 'ally' | 'enemy' | 'any' | null;
  onCommandSelect?: (command: BattleUICommandType) => void;
  onItemSelect?: (itemId: string | null) => void;
  onCommandSubmitted?: (allSubmitted?: boolean) => void;
}

export function CommandPanel({
  socket,
  roomId,
  turnNumber,
  phase,
  players,
  monsters,
  commandSubmitted,
  selectedCommand: propSelectedCommand,
  selectedTarget: propSelectedTarget,
  consumables = [],
  selectedItemId = null,
  itemTargetScope = null,
  onCommandSelect,
  onItemSelect,
  onCommandSubmitted
}: CommandPanelProps) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  // 使用外部传入的选择状态，如果没有则使用内部状态
  const selectedCommand = propSelectedCommand ?? null;
  const selectedTarget = propSelectedTarget ?? null;

  // 每回合默认选中“攻击”，减少一次点击
  useEffect(() => {
    if (phase !== 'TURN_INPUT' || commandSubmitted) return;
    if (!propSelectedCommand) {
      onCommandSelect?.('attack');
    }
  }, [commandSubmitted, phase, turnNumber, propSelectedCommand, onCommandSelect]);

  const selectedTargetName = selectedTarget
    ? players.find(p => p.id === selectedTarget)?.name || monsters.find(m => m.id === selectedTarget)?.name
    : null;

  const selectedItem = consumables.find((item) => item.id === selectedItemId) || null;
  const itemTargetLabel = itemTargetScope === 'self'
    ? '仅自己'
    : itemTargetScope === 'ally'
      ? '我方任一目标'
      : itemTargetScope === 'enemy'
        ? '敌方任一目标'
        : itemTargetScope === 'any'
          ? '任意目标'
          : '未指定';

  const handleCommandClick = (commandType: BattleUICommandType) => {
    // 如果已提交，不允许修改
    if (commandSubmitted || phase !== 'TURN_INPUT') return;
    onCommandSelect?.(commandType);
  };

  const handleSubmit = async () => {
    if (commandSubmitted || phase !== 'TURN_INPUT' || submitting) return;

    // 如果没有选择指令，提示用户
    if (!selectedCommand) {
      alert('请先选择操作');
      return;
    }

    // 验证攻击指令必须有目标
    if (selectedCommand === 'attack' && !selectedTarget) {
      alert('请先选择操作，然后点击界面上的目标');
      return;
    }

    if (selectedCommand === 'item') {
      if (!selectedItemId) {
        alert('请先选择消耗品');
        return;
      }
      if (!selectedTarget) {
        alert('请先选择目标');
        return;
      }
    }

    setSubmitting(true);

    try {
      const response = await battleAPI.submitCommand(roomId, {
        turn: turnNumber,
        type: selectedCommand,
        targetId: selectedTarget || undefined,
        itemId: selectedCommand === 'item' ? selectedItemId || undefined : undefined
      });

      const { allSubmitted } = response.data as { allSubmitted?: boolean };
      onCommandSubmitted?.(allSubmitted);
    } catch (error: any) {
      console.error('提交指令失败:', error);
      const errorMessage = error.response?.data?.error || '提交指令失败';
      alert(errorMessage);
      
      // 如果是"已提交"错误，更新状态
      if (errorMessage.includes('已提交')) {
        onCommandSubmitted?.(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = phase === 'TURN_INPUT' && !commandSubmitted && selectedCommand &&
    (selectedCommand !== 'attack' || selectedTarget !== null) &&
    (selectedCommand !== 'item' || (selectedItemId !== null && selectedTarget !== null));

  const commands: Array<{ id: BattleUICommandType; label: string }> = [
    { id: 'attack', label: '普通攻击' },
    { id: 'defend', label: '防御' },
    { id: 'escape', label: '逃跑' },
    { id: 'item', label: '物品' }
  ];

  return (
    <div className={styles.commandPanel}>
      <div className={styles.title}>战斗指令</div>

      {commandSubmitted ? (
        <div className={styles.submittedStatus}>
          <div className={styles.submittedIcon}>✓</div>
          <div className={styles.submittedText}>指令已确认</div>
        </div>
      ) : (
        <>
          <div className={styles.commandList}>
            {commands.map((cmd) => (
              <button
                key={cmd.id}
                className={`${styles.commandButton} ${selectedCommand === cmd.id ? styles.active : ''}`}
                onClick={() => handleCommandClick(cmd.id)}
                disabled={phase !== 'TURN_INPUT' || commandSubmitted}
              >
                {cmd.label}
              </button>
            ))}
          </div>

          {selectedCommand === 'attack' && (
            <div className={styles.targetHint}>
              <div className={styles.hintText}>
                已选择"普通攻击"，请在界面上点击敌方目标
              </div>
              {selectedTarget && (
                <div className={styles.selectedTargetInfo}>
                  已选择目标：{selectedTargetName ?? selectedTarget}
                </div>
              )}
            </div>
          )}

          {selectedCommand === 'item' && (
            <div className={styles.targetHint}>
              <div className={styles.hintText}>
                请选择消耗品并在界面上点击目标（{itemTargetLabel}）
              </div>
              <select
                className={styles.itemSelect}
                value={selectedItemId ?? ''}
                onChange={(event) => onItemSelect?.(event.target.value || null)}
                disabled={consumables.length === 0}
              >
                <option value="">选择消耗品</option>
                {consumables.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} x{item.stackSize}
                  </option>
                ))}
              </select>
              {selectedItem && (
                <div className={styles.selectedTargetInfo}>
                  已选择物品：{selectedItem.name}
                </div>
              )}
              {selectedTarget && (
                <div className={styles.selectedTargetInfo}>
                  已选择目标：{selectedTargetName ?? selectedTarget}
                </div>
              )}
            </div>
          )}

          <button
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? '提交中...' : '确认'}
          </button>
        </>
      )}

      {phase !== 'TURN_INPUT' && (
        <div className={styles.phaseInfo}>
          {phase === 'TURN_RESOLVE' && '回合结算中...'}
          {phase === 'ENDED' && '战斗已结束'}
          {phase === 'PREPARE' && '准备中...'}
        </div>
      )}
    </div>
  );
}
