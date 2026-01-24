import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { computeDerivedStats } from "../../systems/stats";
import type { BaseStats } from "../../types/game";

/**
 * 地图配置
 */
export interface MapConfig {
  mapId: string;
  name: string;
  description?: string;
  levelRange: [number, number];
  monsterPool: Array<{
    monsterId: string;
    weight: number;
    levelRange: [number, number];
  }>;
}

/**
 * 怪物基础属性（和玩家一样的基础属性系统）
 */
export interface MonsterBaseAttributes {
  str: number; // 力道
  agi: number; // 身法
  vit: number; // 体魄
  int: number; // 灵识
  spi: number; // 根骨
}

/**
 * 怪物基础属性（兼容旧格式）
 */
export interface MonsterBaseStats {
  maxHp?: number; // 最大生命值（如果提供，会覆盖基于 vit 的计算）
  atk?: number; // 攻击力（兼容字段，如果提供 baseAttributes 则忽略）
  def?: number; // 防御力（兼容字段，如果提供 baseAttributes 则忽略）
  spd?: number; // 速度（兼容字段，如果提供 baseAttributes 则忽略）
  // 新的基础属性系统（和玩家一样）
  baseAttributes?: MonsterBaseAttributes; // 基础属性（优先使用）
}

/**
 * 成长曲线配置（线性成长）
 */
export interface GrowthConfig {
  perLevel: {
    maxHp?: number; // 最大生命值成长
    // 基础属性成长（优先使用）
    str?: number; // 力道成长
    agi?: number; // 身法成长
    vit?: number; // 体魄成长
    int?: number; // 灵识成长
    spi?: number; // 根骨成长
    // 兼容字段
    atk?: number; // 攻击力成长（如果提供 baseAttributes 成长则忽略）
    def?: number; // 防御力成长（如果提供 baseAttributes 成长则忽略）
    spd?: number; // 速度成长（如果提供 baseAttributes 成长则忽略）
  };
}

/**
 * 怪物掉落物品配置
 */
export interface MonsterDrop {
  templateId: string; // 物品模板ID
  probability: number; // 掉落概率 (0-1)
}

/**
 * 怪物模板
 */
export interface MonsterTemplate {
  monsterId: string;
  name: string;
  baseStats: MonsterBaseStats;
  growth: GrowthConfig;
  drops?: MonsterDrop[]; // 掉落物品列表
}

/**
 * 计算后的怪物属性（和玩家一样的战斗属性系统）
 */
export interface CalculatedMonsterStats {
  maxHp: number;
  maxMp: number;
  pdmg: number; // 物理伤害
  mdmg: number; // 法术伤害
  pdef: number; // 物理防御
  mdef: number; // 法术防御
  spd: number; // 速度
  // 兼容字段
  atk?: number; // 攻击力（取 pdmg 和 mdmg 的较大值）
  def?: number; // 防御力（取 pdef 和 mdef 的较大值）
}

/**
 * 获取数据目录
 */
function getDataDir(): string {
  const cwd = process.cwd();
  const possiblePaths = [
    join(cwd, "server", "data"), // 从项目根目录启动
    join(cwd, "data"), // 从 server 目录启动
    join(__dirname, "..", "..", "data"), // 从编译后的位置
    join(__dirname, "..", "data") // 从 src/battle/service 位置
  ];

  for (const path of possiblePaths) {
    try {
      const testFile = join(path, "maps.json");
      if (existsSync(testFile)) {
        return path;
      }
    } catch {
      // 继续尝试下一个路径
    }
  }

  // 如果都找不到，默认使用 server/data
  return join(cwd, "server", "data");
}

const DATA_DIR = getDataDir();

/**
 * 配置服务
 */
export class ConfigService {
  private mapsCache: MapConfig[] | null = null;
  private monstersCache: MonsterTemplate[] | null = null;

  /**
   * 清除地图配置缓存
   */
  clearMapsCache(): void {
    this.mapsCache = null;
  }

  /**
   * 加载地图配置
   */
  loadMapsConfig(): MapConfig[] {
    // 每次都重新读取文件，确保获取最新数据
    const filePath = join(DATA_DIR, "maps.json");
    const data = readFileSync(filePath, "utf-8");
    const maps = JSON.parse(data) as MapConfig[];
    this.mapsCache = maps;
    return maps;
  }

  /**
   * 加载怪物配置
   */
  loadMonstersConfig(): MonsterTemplate[] {
    if (this.monstersCache) {
      return this.monstersCache;
    }

    const filePath = join(DATA_DIR, "monsters.json");
    const data = readFileSync(filePath, "utf-8");
    this.monstersCache = JSON.parse(data) as MonsterTemplate[];
    return this.monstersCache;
  }

  /**
   * 根据ID获取地图配置
   */
  getMapById(mapId: string): MapConfig | null {
    const maps = this.loadMapsConfig();
    return maps.find((m) => m.mapId === mapId) || null;
  }

  /**
   * 根据ID获取怪物模板
   */
  getMonsterById(monsterId: string): MonsterTemplate | null {
    const monsters = this.loadMonstersConfig();
    return monsters.find((m) => m.monsterId === monsterId) || null;
  }

  /**
   * 根据怪物模板和等级计算属性（使用和玩家一样的属性系统）
   */
  calculateMonsterStats(monsterId: string, level: number): CalculatedMonsterStats | null {
    const template = this.getMonsterById(monsterId);
    if (!template) {
      return null;
    }

    const { baseStats, growth } = template;
    const levelDiff = level - 1;

    // 如果提供了基础属性，使用基础属性系统（和玩家一样）
    if (baseStats.baseAttributes) {
      const baseAttrs = baseStats.baseAttributes;
      const growthAttrs = growth.perLevel;

      // 计算当前等级的基础属性
      const currentBase: BaseStats = {
        str: baseAttrs.str + (growthAttrs.str || 0) * levelDiff,
        agi: baseAttrs.agi + (growthAttrs.agi || 0) * levelDiff,
        vit: baseAttrs.vit + (growthAttrs.vit || 0) * levelDiff,
        int: baseAttrs.int + (growthAttrs.int || 0) * levelDiff,
        spi: baseAttrs.spi + (growthAttrs.spi || 0) * levelDiff
      };

      // 使用和玩家一样的公式计算战斗属性
      const combatStats = computeDerivedStats(currentBase);

      // 如果提供了 maxHp 覆盖值，使用它
      let maxHp = combatStats.maxHp;
      if (baseStats.maxHp !== undefined) {
        maxHp = baseStats.maxHp + (growth.perLevel.maxHp || 0) * levelDiff;
      }

      return {
        maxHp: Math.max(1, Math.floor(maxHp)),
        maxMp: combatStats.maxMp,
        pdmg: combatStats.pdmg,
        mdmg: combatStats.mdmg,
        pdef: combatStats.pdef,
        mdef: combatStats.mdef,
        spd: combatStats.spd,
        atk: Math.max(combatStats.pdmg, combatStats.mdmg), // 兼容字段
        def: Math.max(combatStats.pdef, combatStats.mdef) // 兼容字段
      };
    }

    // 兼容旧格式：使用 atk/def/spd
    // 将旧的 atk/def 转换为基础属性（反向计算）
    const baseAtk = baseStats.atk || 8;
    const baseDef = baseStats.def || 3;
    const baseSpd = baseStats.spd || 6;
    const baseMaxHp = baseStats.maxHp || 45;

    // 根据旧的 atk/def 反推基础属性（简化处理：假设物理为主）
    // pdmg = str * 2.8 + agi * 0.3，假设 agi = str * 0.5，则 str ≈ atk / 3.0
    // pdef = spi * 2.2 + vit * 0.6，假设 vit = spi，则 spi ≈ def / 2.8
    const estimatedStr = Math.max(1, Math.floor(baseAtk / 3.0));
    const estimatedAgi = Math.max(1, Math.floor(estimatedStr * 0.5));
    const estimatedSpi = Math.max(1, Math.floor(baseDef / 2.8));
    const estimatedVit = Math.max(1, Math.floor(baseDef / 2.8));
    // spd = 50 + agi * 2.0，反推 agi = (spd - 50) / 2.0
    const estimatedAgiFromSpd = Math.max(1, Math.floor((baseSpd - 50) / 2.0));
    // 使用速度反推的 agi 如果更合理，使用它
    const finalAgi = estimatedAgiFromSpd > 0 ? estimatedAgiFromSpd : estimatedAgi;
    // maxHp = 60 + vit * 6，反推 vit = (maxHp - 60) / 6
    const estimatedVitFromHp = Math.max(1, Math.floor((baseMaxHp - 60) / 6));
    const finalVit = estimatedVitFromHp > 0 ? estimatedVitFromHp : estimatedVit;

    const baseAttrs: BaseStats = {
      str: estimatedStr,
      agi: finalAgi,
      vit: finalVit,
      int: 0, // 假设怪物主要是物理攻击
      spi: estimatedSpi
    };

    // 应用成长
    if (growth.perLevel.atk) {
      baseAttrs.str += Math.floor(growth.perLevel.atk / 3.0 * levelDiff);
    }
    if (growth.perLevel.def) {
      baseAttrs.spi += Math.floor(growth.perLevel.def / 2.8 * levelDiff);
      baseAttrs.vit += Math.floor(growth.perLevel.def / 2.8 * levelDiff);
    }
    if (growth.perLevel.spd) {
      baseAttrs.agi += Math.floor(growth.perLevel.spd / 2.0 * levelDiff);
    }

    // 使用和玩家一样的公式计算战斗属性
    const combatStats = computeDerivedStats(baseAttrs);

    // 计算 maxHp（考虑成长）
    let maxHp = combatStats.maxHp;
    if (baseStats.maxHp !== undefined) {
      maxHp = baseStats.maxHp + (growth.perLevel.maxHp || 0) * levelDiff;
    }

    return {
      maxHp: Math.max(1, Math.floor(maxHp)),
      maxMp: combatStats.maxMp,
      pdmg: combatStats.pdmg,
      mdmg: combatStats.mdmg,
      pdef: combatStats.pdef,
      mdef: combatStats.mdef,
      spd: combatStats.spd,
      atk: Math.max(combatStats.pdmg, combatStats.mdmg), // 兼容字段
      def: Math.max(combatStats.pdef, combatStats.mdef) // 兼容字段
    };
  }
}

// 单例实例
export const configService = new ConfigService();
