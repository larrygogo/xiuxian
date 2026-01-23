import { useEffect, useState } from 'react';
import styles from './MainStatus.module.css';
import { needQi } from '../utils/gameUtils';
import { gameAPI } from '../services/api';
import type { GameState, ActionResult } from '../types/game';

interface MainStatusProps {
  state: GameState | null;
  onLevelUp?: () => Promise<ActionResult>;
  onAllocateStats?: (payload: StatAllocationPayload) => Promise<ActionResult>;
}

interface StatItem {
  key: string;
  label: string;
  value: number | string | null | undefined;
  suffix?: string;
}

interface StatAllocationPayload {
  str: number;
  agi: number;
  vit: number;
  int: number;
  spi: number;
}

type StatKey = keyof StatAllocationPayload;

export function MainStatus({ state, onLevelUp, onAllocateStats }: MainStatusProps) {
  const [levelUpLoading, setLevelUpLoading] = useState(false);
  const [allocationLoading, setAllocationLoading] = useState(false);
  const [copyButtonText, setCopyButtonText] = useState('复制');
  const [pendingAllocations, setPendingAllocations] = useState<StatAllocationPayload>({
    str: 0,
    agi: 0,
    vit: 0,
    int: 0,
    spi: 0,
  });

  if (!state) return null;

  const requiredQi = needQi(state);
  const canLevelUp = state.qi >= requiredQi;
  const baseStats = state.baseStats ?? {
    str: 0,
    agi: 0,
    vit: 0,
    int: 0,
    spi: 0
  };
  const combatStats = state.combatStats ?? {};

  const baseStatItems: StatItem[] = [
    { key: 'str', label: '力道', value: baseStats.str },
    { key: 'agi', label: '身法', value: baseStats.agi },
    { key: 'vit', label: '体魄', value: baseStats.vit },
    { key: 'int', label: '灵识', value: baseStats.int },
    { key: 'spi', label: '根骨', value: baseStats.spi }
  ];

  const totalStatPoints = Math.max(0, state.statPoints ?? 0);
  const pendingTotal = Object.values(pendingAllocations).reduce((sum, value) => sum + value, 0);
  const remainingPoints = Math.max(0, totalStatPoints - pendingTotal);

  const combatStatItems: StatItem[] = [
    { key: 'hp', label: '生命', value: `${state.hp} / ${state.maxHp}` },
    { key: 'mp', label: '法力', value: `${state.mp ?? 0} / ${state.maxMp ?? 0}` },
    { key: 'hit', label: '命中', value: combatStats.hit },
    { key: 'pdmg', label: '物伤', value: combatStats.pdmg },
    { key: 'pdef', label: '物防', value: combatStats.pdef },
    { key: 'spd', label: '速度', value: combatStats.spd },
    { key: 'mdmg', label: '法伤', value: combatStats.mdmg },
    { key: 'mdef', label: '法防', value: combatStats.mdef }
  ];

  const formatStat = (item: StatItem) => {
    if (typeof item.value === 'number') {
      const fixed = Number.isInteger(item.value) ? item.value : item.value.toFixed(1);
      return item.suffix ? `${fixed}${item.suffix}` : fixed;
    }
    return item.value ?? '-';
  };

  useEffect(() => {
    setPendingAllocations({
      str: 0,
      agi: 0,
      vit: 0,
      int: 0,
      spi: 0,
    });
  }, [state.statPoints]);

  const getCharacterIdDisplay = (characterId: string): string => {
    return characterId.replace(/(.{4})/g, '$1 ').trim();
  };

  const handleLevelUp = async () => {
    if (!canLevelUp || levelUpLoading) return;

    setLevelUpLoading(true);
    try {
      if (onLevelUp) {
        const result = await onLevelUp();
        if (!result.success && result.error) {
          alert(result.error);
        }
      } else {
        // 降级方案：直接调用 API
        await gameAPI.levelUp();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || '升级失败');
    } finally {
      setLevelUpLoading(false);
    }
  };

  const adjustAllocation = (key: StatKey, delta: number) => {
    setPendingAllocations((prev) => {
      const currentTotal = Object.values(prev).reduce((sum, value) => sum + value, 0);
      if (delta > 0 && currentTotal >= totalStatPoints) return prev;
      const nextValue = prev[key] + delta;
      if (nextValue < 0) return prev;
      return { ...prev, [key]: nextValue };
    });
  };

  const handleAllocateStats = async () => {
    if (!onAllocateStats || allocationLoading || pendingTotal <= 0) return;

    setAllocationLoading(true);
    try {
      const result = await onAllocateStats(pendingAllocations);
      if (!result.success && result.error) {
        alert(result.error);
        return;
      }
      setPendingAllocations({ str: 0, agi: 0, vit: 0, int: 0, spi: 0 });
    } catch (error: any) {
      alert(error.response?.data?.error || '分配失败');
    } finally {
      setAllocationLoading(false);
    }
  };

  const handleCopyCharacterId = async () => {
    if (!state.characterId) return;

    try {
      const idText = state.characterId.toString();
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(idText);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = idText;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopyButtonText('已复制');
      setTimeout(() => {
        setCopyButtonText('复制');
      }, 2000);
    } catch (err) {
      console.error('复制失败:', err);
      // 降级方案：使用传统方法
      const textArea = document.createElement('textarea');
      textArea.value = state.characterId.toString();
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopyButtonText('已复制');
        setTimeout(() => {
          setCopyButtonText('复制');
        }, 2000);
      } catch (e) {
        console.error('降级复制也失败:', e);
        setCopyButtonText('复制失败');
        setTimeout(() => {
          setCopyButtonText('复制');
        }, 2000);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className={styles['main-status-card']}>
      <div className={styles['main-status']}>
        <div className={styles['main-status-stats']}>
          <div className={styles['stats-group']}>
            <div className={styles['identity-grid']}>
              <div className={styles['stats-item']}>
                <span className={styles['stats-label']}>角色名</span>
                <div className={styles['stats-value-box']}>
                  <span className={styles['stats-value']}>{state.name}</span>
                </div>
              </div>
              <div className={styles['stats-item']}>
                <span className={styles['stats-label']}>等级</span>
                <div className={styles['stats-value-box']}>
                  <span className={styles['stats-value']}>{state.level}</span>
                </div>
              </div>
              {state.characterId && (
                <div className={`${styles['stats-item']} ${styles['identity-id-row']}`}>
                  <span className={styles['stats-label']}>角色ID</span>
                  <div className={styles['stats-value-box']}>
                    <span className={`${styles['stats-value']} ${styles['identity-id-value']}`}>
                      {getCharacterIdDisplay(state.characterId.toString())}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles['copy-character-id-button']}
                    onClick={handleCopyCharacterId}
                    title="复制角色ID"
                  >
                    {copyButtonText}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className={styles['stats-group']}>
            <div className={styles['stats-list']}>
              {baseStatItems.map((item) => (
                <div key={item.key} className={styles['stats-row']}>
                  <span className={styles['stats-label']}>{item.label}</span>
                  <div className={styles['stats-value-box']}>
                    <span className={styles['stats-value']}>
                      {formatStat({
                        ...item,
                        value: typeof item.value === 'number' ? item.value + pendingAllocations[item.key as StatKey] : item.value
                      })}
                    </span>
                  </div>
                  <div className={styles['stats-inline-controls']}>
                    <button
                      type="button"
                      className={styles['stats-control-button']}
                      onClick={() => adjustAllocation(item.key as StatKey, -1)}
                      disabled={pendingAllocations[item.key as StatKey] <= 0 || allocationLoading}
                      aria-label={`减少${item.label}`}
                    >
                      -
                    </button>
                    <button
                      type="button"
                      className={styles['stats-control-button']}
                      onClick={() => adjustAllocation(item.key as StatKey, 1)}
                      disabled={remainingPoints <= 0 || allocationLoading}
                      aria-label={`增加${item.label}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles['stats-allocation']}>
              <div className={styles['stats-allocation-info']}>
                待分配点数: <span className={styles['stats-allocation-value']}>{remainingPoints}</span>
              </div>
              <button
                type="button"
                className={styles['stats-allocation-button']}
                onClick={handleAllocateStats}
                disabled={!onAllocateStats || allocationLoading || pendingTotal <= 0}
                title={pendingTotal > 0 ? '确认分配' : '暂无可提交点数'}
              >
                {allocationLoading ? '提交中...' : '确认分配'}
              </button>
            </div>
          </div>
          <div className={styles['stats-group']}>
            <div className={`${styles['stats-grid']} ${styles['stats-grid-combat']}`}>
              {combatStatItems.map((item) => (
                <div key={item.key} className={styles['stats-item']}>
                  <span className={styles['stats-label']}>{item.label}</span>
                  <div className={styles['stats-value-box']}>
                    <span className={styles['stats-value']}>{formatStat(item)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={styles['main-status-progress']}>
          <div
            className={styles['main-progress-fill']}
            style={{ width: `${Math.min(100, (state.qi / requiredQi) * 100)}%` }}
          />
        </div>
        <div className={styles['main-progress-text']}>
          灵气进度: {state.qi} / {requiredQi}
          <button
            className={styles['level-up-button']}
            onClick={handleLevelUp}
            disabled={!canLevelUp || levelUpLoading}
            title={canLevelUp ? '点击升级' : `需要 ${requiredQi} 点灵气才能升级`}
          >
            {levelUpLoading ? '升级中...' : '升级'}
          </button>
        </div>
      </div>
    </div>
  );
}
