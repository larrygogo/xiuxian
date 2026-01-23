import type { ReactNode } from 'react';
import type { Combatant } from '../types/battle';
import styles from './BattlefieldGrid.module.css';

interface BattlefieldGridProps {
  players: Combatant[];
  monsters: Combatant[];
  selectedCommand?: 'attack' | 'defend' | 'escape' | 'item' | null;
  selectedTarget?: string | null;
  targetingEnabled?: boolean;
  targetScope?: 'self' | 'ally' | 'enemy' | 'any' | null;
  selfId?: string | null;
  submittedPlayerIds?: string[];
  middleContent?: ReactNode;
  onTargetClick?: (targetId: string, isPlayer: boolean) => void;
}

export function BattlefieldGrid({ 
  players, 
  monsters, 
  selectedCommand,
  selectedTarget,
  targetingEnabled = true,
  targetScope = null,
  selfId = null,
  submittedPlayerIds = [],
  middleContent,
  onTargetClick 
}: BattlefieldGridProps) {
  // 创建站位网格（上怪物，下玩家），每边最多10个（5列x2行）
  const maxSlots = 10;
  const rows = 2;
  const cols = 5;

  // 将怪物放在上方（最多10个，5行x2列）
  const monsterSlots: (Combatant | null)[] = Array(maxSlots).fill(null);
  monsters.slice(0, maxSlots).forEach((monster, index) => {
    monsterSlots[index] = monster;
  });

  // 将玩家放在下方（最多10个，5行x2列）
  const playerSlots: (Combatant | null)[] = Array(maxSlots).fill(null);
  players.slice(0, maxSlots).forEach((player, index) => {
    playerSlots[index] = player;
  });

  const renderCombatant = (combatant: Combatant | null, isPlayer: boolean) => {
    if (!combatant) {
      return <div className={styles.emptySlot} />;
    }

    const hpPercent = Math.max(0, Math.min(100, (combatant.hp / combatant.maxHp) * 100));
    const isAlive = combatant.status === 'alive' || combatant.status === 'defending';
    const isDead = combatant.status === 'dead';
    const isEscaped = combatant.status === 'escaped';
    
    const canClick = (() => {
      if (!targetingEnabled || !selectedCommand || !isAlive) {
        return false;
      }
      if (selectedCommand === 'attack') {
        return !isPlayer;
      }
      if (selectedCommand === 'item') {
        if (!targetScope) {
          return false;
        }
        if (targetScope === 'any') {
          return true;
        }
        if (targetScope === 'self') {
          return isPlayer && selfId !== null && combatant.id === selfId;
        }
        if (targetScope === 'ally') {
          return isPlayer;
        }
        if (targetScope === 'enemy') {
          return !isPlayer;
        }
      }
      return false;
    })();
    const isSelected = selectedTarget === combatant.id;
    const isSubmitted = isPlayer && submittedPlayerIds.includes(combatant.id);

    return (
      <div
        className={`${styles.combatantCard} ${isPlayer ? styles.player : styles.monster} ${!isAlive ? styles.inactive : ''} ${isSelected ? styles.selected : ''} ${canClick ? styles.clickable : ''}`}
        onClick={() => {
          if (canClick && onTargetClick) {
            onTargetClick(combatant.id, isPlayer);
          }
        }}
        style={{ cursor: canClick ? 'pointer' : 'default' }}
      >
        <div className={styles.combatantContent}>
          <div className={styles.combatantHeader}>
            <div className={styles.combatantName}>{combatant.name}</div>
            <div className={styles.combatantLevel}>Lv.{combatant.level}</div>
          </div>
          <div className={styles.combatantFooter}>
            <div className={styles.hpBar}>
              <div
                className={styles.hpFill}
                style={{
                  width: `${hpPercent}%`,
                  backgroundColor: hpPercent > 50 ? '#4caf50' : hpPercent > 25 ? '#ff9800' : '#f44336'
                }}
              />
            </div>
          </div>
        </div>
        {combatant.status === 'defending' && (
          <div className={`${styles.statusBadge} ${styles.badgeDefending}`}>防御</div>
        )}
        {isDead && (
          <div className={`${styles.statusBadge} ${styles.badgeDead}`}>死亡</div>
        )}
        {isEscaped && (
          <div className={`${styles.statusBadge} ${styles.badgeEscaped}`}>逃脱</div>
        )}
        {isSubmitted && (
          <div className={styles.submittedBadge}>✓</div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.battlefieldGrid}>
      <div className={styles.gridContainer}>
        {/* 怪物区域（上方） */}
        <div className={styles.monsterArea}>
          <div className={styles.areaLabel}>敌方</div>
          <div className={styles.combatantGrid}>
            {monsterSlots.map((monster, index) => (
              <div key={index} className={styles.gridSlot}>
                {renderCombatant(monster, false)}
              </div>
            ))}
          </div>
        </div>

        {/* 中间分隔线与回合信息 */}
        <div className={styles.turnDivider}>
          {middleContent && (
            <div className={styles.turnDividerContent}>
              {middleContent}
            </div>
          )}
        </div>

        {/* 玩家区域（下方） */}
        <div className={styles.playerArea}>
          <div className={styles.areaLabel}>我方</div>
          <div className={styles.combatantGrid}>
            {playerSlots.map((player, index) => (
              <div key={index} className={styles.gridSlot}>
                {renderCombatant(player, true)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
