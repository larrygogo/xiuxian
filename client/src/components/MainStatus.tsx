import './MainStatus.css';
import { stageName, needQi } from '../utils/gameUtils';
import type { GameState } from '../types/game';

interface MainStatusProps {
  state: GameState | null;
}

interface StatItem {
  key: string;
  label: string;
  value: number | string | null | undefined;
  suffix?: string;
}

export function MainStatus({ state }: MainStatusProps) {
  if (!state) return null;

  const stage = stageName(state);
  const requiredQi = needQi(state);
  const baseStats = state.baseStats ?? {
    str: 0,
    agi: 0,
    vit: 0,
    int: 0,
    spi: 0,
    luk: state.luck ?? 0
  };
  const combatStats = state.combatStats ?? {};

  const baseStatItems: StatItem[] = [
    { key: 'str', label: '力道', value: baseStats.str },
    { key: 'agi', label: '身法', value: baseStats.agi },
    { key: 'vit', label: '体魄', value: baseStats.vit },
    { key: 'int', label: '灵识', value: baseStats.int },
    { key: 'spi', label: '心境', value: baseStats.spi },
    { key: 'luk', label: '气运', value: baseStats.luk }
  ];

  const combatStatItems: StatItem[] = [
    { key: 'hp', label: '生命', value: `${state.hp} / ${state.maxHp}` },
    { key: 'mp', label: '法力', value: `${state.mp ?? 0} / ${state.maxMp ?? 0}` },
    { key: 'atk', label: '物攻', value: combatStats.atk },
    { key: 'matk', label: '法攻', value: combatStats.matk },
    { key: 'def', label: '物防', value: combatStats.def },
    { key: 'mdef', label: '法防', value: combatStats.mdef },
    { key: 'spd', label: '速度', value: combatStats.spd },
    { key: 'hit', label: '命中', value: combatStats.hit },
    { key: 'eva', label: '闪避', value: combatStats.eva },
    { key: 'crit', label: '暴击率', value: combatStats.crit, suffix: '%' },
    { key: 'critDmg', label: '暴击伤害', value: combatStats.critDmg, suffix: 'x' },
    { key: 'critRes', label: '暴击抗性', value: combatStats.critRes, suffix: '%' },
    { key: 'ccHit', label: '控制命中', value: combatStats.ccHit, suffix: '%' },
    { key: 'ccRes', label: '控制抗性', value: combatStats.ccRes, suffix: '%' },
    { key: 'statusPower', label: '异常触发', value: combatStats.statusPower, suffix: '%' },
    { key: 'statusRes', label: '异常抗性', value: combatStats.statusRes, suffix: '%' },
    { key: 'hpRegen', label: '生命回复', value: combatStats.hpRegen },
    { key: 'mpRegen', label: '法力回复', value: combatStats.mpRegen },
    { key: 'dropRate', label: '掉落加成', value: combatStats.dropRate, suffix: '%' },
    { key: 'procRate', label: '触发加成', value: combatStats.procRate, suffix: '%' }
  ];

  const formatStat = (item: StatItem) => {
    if (typeof item.value === 'number') {
      const fixed = Number.isInteger(item.value) ? item.value : item.value.toFixed(1);
      return item.suffix ? `${fixed}${item.suffix}` : fixed;
    }
    return item.value ?? '-';
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
        </div>
      </div>
    </div>
  );
}
