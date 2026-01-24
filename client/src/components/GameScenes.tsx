import { useEffect, useState } from 'react';
import styles from './GameScenes.module.css';
import { Card } from './Card';
import type { GameState } from '../types/game';
import { battleAPI } from '../services/api';

// 怪物ID到名称的映射
const MONSTER_NAMES: Record<string, string> = {
  'mob_wolf': '山林野狼',
  'mob_bandit': '山贼',
  'mob_snake': '妖蛇',
  'mob_bear': '黑熊精',
  'mob_corpse': '腐尸',
};

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

interface GameScenesProps {
  state: GameState | null;
  onSelectScene?: (scene: Scene) => void;
}

export function GameScenes({ state, onSelectScene }: GameScenesProps) {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadScenes = async () => {
      try {
        setLoading(true);
        const response = await battleAPI.getScenes();
        const data = response.data as { scenes: Scene[] };
        setScenes(data.scenes);
        setError(null);
      } catch (err: any) {
        console.error('加载场景列表失败:', err);
        setError(err.response?.data?.error || '加载场景列表失败');
      } finally {
        setLoading(false);
      }
    };

    loadScenes();
  }, []);

  if (!state) return null;

  const playerLevel = state.level || 1;

  const getLevelSuitability = (levelRange: [number, number]) => {
    const [minLevel, maxLevel] = levelRange;
    if (playerLevel < minLevel) {
      return { status: 'low', text: '困难', className: styles['level-warning'] };
    } else if (playerLevel > maxLevel) {
      return { status: 'high', text: '简单', className: styles['level-info'] };
    } else {
      return { status: 'suitable', text: '适中', className: styles['level-suitable'] };
    }
  };

  const getMonsterName = (monsterId: string) => {
    return MONSTER_NAMES[monsterId] || monsterId.replace('mob_', '');
  };

  if (loading) {
    return (
      <Card title="场景选择">
        <div className={styles['loading-message']}>加载场景中...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="场景选择">
        <div className={styles['error-message']}>{error}</div>
      </Card>
    );
  }

  return (
    <Card title="场景选择">
      <div className={styles['scenes-grid']}>
        {scenes.map((scene) => {
          const suitability = getLevelSuitability(scene.levelRange);
          
          return (
            <div
              key={scene.mapId}
              className={`${styles['scene-card']} ${suitability.className} ${state.hp <= 0 ? styles['disabled'] : ''}`}
              onClick={() => {
                if (state.hp > 0 && onSelectScene) {
                  onSelectScene(scene);
                }
              }}
            >
              <div className={styles['scene-header']}>
                <h3 className={styles['scene-name']}>{scene.name}</h3>
                <div className={styles['scene-level-range']}>
                  {scene.levelRange[0]}-{scene.levelRange[1]}级
                </div>
              </div>
              
              <div className={styles['scene-description']}>
                {scene.description}
              </div>

              <div className={styles['scene-monsters']}>
                <div className={styles['monsters-label']}>可能遇到的怪物：</div>
                <div className={styles['monsters-list']}>
                  {scene.monsterPool.slice(0, 3).map((monster) => {
                    return (
                      <span key={monster.monsterId} className={styles['monster-tag']}>
                        {getMonsterName(monster.monsterId)}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className={styles['scene-footer']}>
                <div className={`${styles['suitability-badge']} ${suitability.className}`}>
                  {suitability.text}
                </div>
                {state.hp <= 0 && (
                  <div className={styles['disabled-hint']}>生命值为0，无法进入战斗</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
