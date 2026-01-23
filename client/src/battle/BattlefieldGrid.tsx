import type { Combatant } from '../types/battle';
import styles from './BattlefieldGrid.module.css';

interface BattlefieldGridProps {
  players: Combatant[];
  monsters: Combatant[];
  selectedCommand?: 'attack' | 'defend' | 'escape' | null;
  selectedTarget?: string | null;
  targetingEnabled?: boolean;
  onTargetClick?: (targetId: string, isPlayer: boolean) => void;
}

export function BattlefieldGrid({ 
  players, 
  monsters, 
  selectedCommand,
  selectedTarget,
  targetingEnabled = true,
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
    
    // 判断是否可点击（需要选择目标时，且是攻击指令，且目标存活，且不是玩家）
    const canClick = targetingEnabled && selectedCommand === 'attack' && !isPlayer && isAlive;
    const isSelected = selectedTarget === combatant.id;

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
          <div className={styles.combatantInfo}>
            <div className={styles.combatantName}>{combatant.name}</div>
            <div className={styles.combatantLevel}>Lv.{combatant.level}</div>
          </div>
          <div className={styles.combatantStats}>
            <div className={styles.hpBar}>
              <div
                className={styles.hpFill}
                style={{
                  width: `${hpPercent}%`,
                  backgroundColor: hpPercent > 50 ? '#4caf50' : hpPercent > 25 ? '#ff9800' : '#f44336'
                }}
              />
            </div>
            <div className={styles.hpText}>
              {combatant.hp}/{combatant.maxHp}
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

        {/* 中间分隔线 */}
        <div className={styles.divider} />

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
