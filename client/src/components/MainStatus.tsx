import { useState } from 'react';
import './MainStatus.css';
import { stageName, needQi } from '../utils/gameUtils';
import type { GameState, ActionResult } from '../types/game';

interface MainStatusProps {
  state: GameState | null;
  onLevelUp?: () => Promise<ActionResult>;
}

interface StatItem {
  key: string;
  label: string;
  value: number | string | null | undefined;
  suffix?: string;
}

export function MainStatus({ state, onLevelUp }: MainStatusProps) {
  const [levelUpLoading, setLevelUpLoading] = useState(false);

  if (!state) return null;

  const stage = stageName(state);
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

  return (
    <div className="main-status-card">
      <div className="main-status">
        <div className="main-status-top">
          <div className="main-status-name">{state.name}</div>
          <div className="main-status-realm">{stage}</div>
        </div>
        <div className="main-status-stats">
          <div className="stats-group">
            <div className="stats-title">基础属性</div>
            <div className="stats-grid">
              {baseStatItems.map((item) => (
                <div key={item.key} className="stats-item">
                  <span className="stats-label">{item.label}</span>
                  <span className="stats-value">{formatStat(item)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="stats-group">
            <div className="stats-title">战斗属性</div>
            <div className="stats-grid stats-grid-combat">
              {combatStatItems.map((item) => (
                <div key={item.key} className="stats-item">
                  <span className="stats-label">{item.label}</span>
                  <span className="stats-value">{formatStat(item)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="main-status-progress">
          <div
            className="main-progress-fill"
            style={{ width: `${Math.min(100, (state.qi / requiredQi) * 100)}%` }}
          />
        </div>
        <div className="main-progress-text">
          灵气进度: {state.qi} / {requiredQi}
          <button
            className="level-up-button"
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
