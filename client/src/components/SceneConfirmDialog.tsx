import { useEffect, useState } from 'react';
import styles from './SceneConfirmDialog.module.css';

interface Scene {
  mapId: string;
  name: string;
  description: string;
  levelRange: [number, number];
  monsterPool: Array<{
    monsterId: string;
    weight: number;
    levelRange: [number, number];
  }>;
}

interface MonsterInfo {
  monsterId: string;
  name: string;
}

interface SceneConfirmDialogProps {
  scene: Scene | null;
  playerLevel: number;
  onConfirm: () => void;
  onCancel: () => void;
}

// 怪物ID到名称的映射
const MONSTER_NAMES: Record<string, string> = {
  'mob_wolf': '山林野狼',
  'mob_bandit': '山贼',
  'mob_snake': '妖蛇',
  'mob_bear': '黑熊精',
  'mob_corpse': '腐尸',
};

export function SceneConfirmDialog({ scene, playerLevel, onConfirm, onCancel }: SceneConfirmDialogProps) {
  const [monsterNames, setMonsterNames] = useState<Record<string, string>>(MONSTER_NAMES);

  useEffect(() => {
    // 可以在这里从API加载怪物名称，目前使用硬编码的映射
    setMonsterNames(MONSTER_NAMES);
  }, []);

  if (!scene) return null;

  const [minLevel, maxLevel] = scene.levelRange;
  const isLevelSuitable = playerLevel >= minLevel && playerLevel <= maxLevel;
  const isLevelLow = playerLevel < minLevel;
  const isLevelHigh = playerLevel > maxLevel;

  const getMonsterName = (monsterId: string) => {
    return monsterNames[monsterId] || monsterId.replace('mob_', '');
  };

  return (
    <div className={styles['dialog-overlay']} onClick={onCancel}>
      <div className={styles['dialog-content']} onClick={(e) => e.stopPropagation()}>
        <div className={styles['dialog-header']}>
          <h2 className={styles['dialog-title']}>确认进入场景</h2>
          <button className={styles['close-button']} onClick={onCancel}>×</button>
        </div>

        <div className={styles['dialog-body']}>
          <div className={styles['scene-info']}>
            <div className={styles['scene-name']}>{scene.name}</div>
            <div className={styles['scene-description']}>{scene.description}</div>
          </div>

          <div className={styles['level-info']}>
            <div className={styles['level-range']}>
              <span className={styles['label']}>推荐等级：</span>
              <span className={styles['value']}>{minLevel}-{maxLevel}级</span>
            </div>
            <div className={styles['player-level']}>
              <span className={styles['label']}>你的等级：</span>
              <span className={styles['value']}>{playerLevel}级</span>
            </div>
          </div>

          {!isLevelSuitable && (
            <div className={`${styles['warning']} ${isLevelLow ? styles['warning-low'] : styles['warning-high']}`}>
              {isLevelLow 
                ? `⚠️ 警告：此场景对你来说较为困难，可能会遇到强大的敌人！`
                : `ℹ️ 提示：此场景对你来说较为简单，战斗可能缺乏挑战。`
              }
            </div>
          )}

          <div className={styles['monsters-section']}>
            <div className={styles['section-title']}>可能遇到的怪物</div>
            <div className={styles['monsters-list']}>
              {scene.monsterPool.map((monster) => {
                return (
                  <div key={monster.monsterId} className={styles['monster-item']}>
                    <span className={styles['monster-name']}>{getMonsterName(monster.monsterId)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className={styles['dialog-footer']}>
          <button className={styles['cancel-button']} onClick={onCancel}>
            取消
          </button>
          <button 
            className={styles['confirm-button']} 
            onClick={onConfirm}
          >
            确认进入
          </button>
        </div>
      </div>
    </div>
  );
}
