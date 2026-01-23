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
    
    // 使用 ConfigService 计算属性
    const stats = configService.calculateMonsterStats(template.monsterId, level);
    if (stats) {
      combatant.maxHp = stats.maxHp;
      combatant.hp = stats.maxHp;
      combatant.atk = stats.atk;
      combatant.def = stats.def;
      combatant.spd = stats.spd;
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

    // 计算怪物数量：1~2只/人，上限10只
    const monsterCount = Math.min(10, Math.floor(playerCount * (1 + Math.random())));

    // 确保至少生成1只怪物
    const finalCount = Math.max(1, monsterCount);

    const monsters: Combatant[] = [];
    const battlefieldWidth = 10;
    const battlefieldHeight = 10;

    // 确定怪物等级（在地图等级范围内，或使用玩家平均等级）
    const [minLevel, maxLevel] = mapConfig.levelRange;
    const monsterLevel = Math.max(
      minLevel,
      Math.min(maxLevel, Math.floor(playersAvgLevel))
    );

    // 准备加权随机选择的数据
    const weightedPool = mapConfig.monsterPool.map((pool) => ({
      item: pool.monsterId,
      weight: pool.weight
    }));

    // 生成每只怪物（有放回抽样）
    for (let i = 0; i < finalCount; i++) {
      const selectedMonsterId = this.weightedRandomSelect(weightedPool);
      const monster = this.spawnByMonsterId(selectedMonsterId, monsterLevel);

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
