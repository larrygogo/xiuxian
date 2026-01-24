import type { Combatant } from "../domain/Combatant";
import { createCombatant } from "../domain/Combatant";
import type { MonsterTemplate, MapConfig } from "../service/ConfigService";
import { configService } from "../service/ConfigService";

/**
 * 怪物生成服务
 */
export class MonsterSpawnService {
  /**
   * 根据模板生成怪物（Mock）
   */
  /**
   * 根据模板和等级生成怪物
   */
  spawnFromTemplate(template: MonsterTemplate, level: number = 1): Combatant {
    const monsterId = `monster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const combatant = createCombatant(monsterId, "monster", template.name, level);
    
    // 保存怪物模板ID，用于掉落物品
    combatant.monsterId = template.monsterId;
    
    // 使用 ConfigService 计算属性（和玩家一样的战斗属性系统）
    const stats = configService.calculateMonsterStats(template.monsterId, level);
    if (stats) {
      combatant.maxHp = stats.maxHp;
      combatant.hp = stats.maxHp;
      combatant.maxMp = stats.maxMp;
      combatant.mp = stats.maxMp;
      combatant.spd = stats.spd;
      // 使用新的战斗属性系统
      combatant.pdmg = stats.pdmg;
      combatant.mdmg = stats.mdmg;
      combatant.pdef = stats.pdef;
      combatant.mdef = stats.mdef;
      // 兼容字段
      combatant.atk = stats.atk;
      combatant.def = stats.def;
    }
    
    return combatant;
  }

  /**
   * 根据怪物ID和等级生成怪物
   */
  spawnByMonsterId(monsterId: string, level: number): Combatant | null {
    const template = configService.getMonsterById(monsterId);
    if (!template) {
      return null;
    }
    return this.spawnFromTemplate(template, level);
  }

  /**
   * 根据等级生成随机怪物（Mock）
   */
  spawnByLevel(level: number, name?: string): Combatant {
    const names = ["mob_wolf", "mob_bandit", "mob_snake", "mob_corpse", "mob_bear"];
    const randomMonsterId = names[Math.floor(Math.random() * names.length)];
    const monster = this.spawnByMonsterId(randomMonsterId, level);
    if (monster) {
      if (name) {
        monster.name = name;
      }
      return monster;
    }
    // 如果找不到，返回默认怪物
    return createCombatant(`monster_${Date.now()}`, "monster", name || `妖兽 Lv.${level}`, level);
  }

  /**
   * 加权随机选择
   */
  private weightedRandomSelect<T>(items: Array<{ item: T; weight: number }>): T {
    const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
    let random = Math.random() * totalWeight;
    for (const { item, weight } of items) {
      random -= weight;
      if (random <= 0) return item;
    }
    return items[items.length - 1].item;
  }

  /**
   * 根据地图和玩家信息生成怪物
   */
  spawnForMap(
    mapId: string,
    playersAvgLevel: number,
    playerCount: number
  ): Combatant[] {
    const mapConfig = configService.getMapById(mapId);
    if (!mapConfig || !mapConfig.monsterPool || mapConfig.monsterPool.length === 0) {
      console.warn(`地图 ${mapId} 不存在或没有怪物池`);
      return [];
    }

    // 计算怪物数量：使用加权随机，增加遇到两只怪物的概率
    // 对于单个玩家：70% 概率生成 2 只，30% 概率生成 1 只
    // 对于多个玩家：1~2只/人，上限10只
    let finalCount: number;
    if (playerCount === 1) {
      // 单个玩家时，70% 概率生成 2 只，30% 概率生成 1 只
      finalCount = Math.random() < 0.7 ? 2 : 1;
    } else {
      // 多个玩家时，使用原来的逻辑，但稍微增加生成 2 只/人的概率
      // 使用 0.3 + Math.random() * 0.7，这样范围是 [0.3, 1.0)，平均约 0.65
      // 乘以 playerCount 后，更倾向于生成接近 2 只/人的数量
      const multiplier = 0.3 + Math.random() * 0.7; // [0.3, 1.0)
      const monsterCount = Math.min(10, Math.floor(playerCount * (1 + multiplier)));
      finalCount = Math.max(1, monsterCount);
    }

    const monsters: Combatant[] = [];
    const battlefieldWidth = 10;
    const battlefieldHeight = 10;

    // 准备加权随机选择的数据（包含怪物ID和等级范围）
    const weightedPool = mapConfig.monsterPool.map((pool) => ({
      item: {
        monsterId: pool.monsterId,
        levelRange: pool.levelRange
      },
      weight: pool.weight
    }));

    // 用于跟踪已生成怪物的等级范围（确保等级差不超过5级）
    let minGeneratedLevel: number | null = null;
    let maxGeneratedLevel: number | null = null;

    // 生成每只怪物（有放回抽样）
    for (let i = 0; i < finalCount; i++) {
      const selected = this.weightedRandomSelect(weightedPool);
      const { monsterId, levelRange } = selected;
      
      // 根据怪物的等级范围确定等级
      const [monsterMinLevel, monsterMaxLevel] = levelRange;
      
      let monsterLevel: number;
      
      if (i === 0) {
        // 第一只怪物：完全随机选择
        monsterLevel = monsterMinLevel + Math.floor(Math.random() * (monsterMaxLevel - monsterMinLevel + 1));
        minGeneratedLevel = monsterLevel;
        maxGeneratedLevel = monsterLevel;
      } else {
        // 后续怪物：确保等级差不超过5级
        // 计算允许的等级范围：已生成怪物的等级范围 ± 5级，并与当前怪物的等级范围取交集
        const allowedMinLevel = Math.max(monsterMinLevel, (minGeneratedLevel ?? monsterMinLevel) - 5);
        const allowedMaxLevel = Math.min(monsterMaxLevel, (maxGeneratedLevel ?? monsterMaxLevel) + 5);
        
        // 确保有有效的等级范围
        if (allowedMinLevel <= allowedMaxLevel) {
          monsterLevel = allowedMinLevel + Math.floor(Math.random() * (allowedMaxLevel - allowedMinLevel + 1));
        } else {
          // 如果无法满足约束，使用当前怪物的等级范围（这种情况理论上不应该发生）
          monsterLevel = monsterMinLevel + Math.floor(Math.random() * (monsterMaxLevel - monsterMinLevel + 1));
        }
        
        // 更新已生成怪物的等级范围
        if (minGeneratedLevel !== null && maxGeneratedLevel !== null) {
          minGeneratedLevel = Math.min(minGeneratedLevel, monsterLevel);
          maxGeneratedLevel = Math.max(maxGeneratedLevel, monsterLevel);
        }
      }
      
      const monster = this.spawnByMonsterId(monsterId, monsterLevel);

      if (monster) {
        // 设置怪物位置（随机分布在战场右侧，x >= 6）
        const x = 6 + Math.floor(Math.random() * (battlefieldWidth - 6));
        const y = Math.floor(Math.random() * battlefieldHeight);
        monster.position = { x, y };

        monsters.push(monster);
      }
    }

    return monsters;
  }
}
