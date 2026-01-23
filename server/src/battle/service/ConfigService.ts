import { readFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * 地图配置
 */
export interface MapConfig {
  mapId: string;
  name: string;
  levelRange: [number, number];
  monsterPool: Array<{
    monsterId: string;
    weight: number;
  }>;
}

/**
 * 怪物基础属性
 */
export interface MonsterBaseStats {
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
}

/**
 * 成长曲线配置
 */
export interface LinearGrowth {
  type: "LINEAR";
  perLevel: {
    maxHp: number;
    atk: number;
    def: number;
    spd: number;
  };
}

export interface ExponentialGrowth {
  type: "EXPONENTIAL";
  rate: {
    maxHp: number;
    atk: number;
    def: number;
    spd: number;
  };
}

export interface SegmentGrowth {
  type: "SEGMENT";
  segments: Array<{
    from: number;
    to: number;
    perLevel: {
      maxHp: number;
      atk: number;
      def: number;
      spd: number;
    };
  }>;
}

export type GrowthConfig = LinearGrowth | ExponentialGrowth | SegmentGrowth;

/**
 * 怪物模板
 */
export interface MonsterTemplate {
  monsterId: string;
  name: string;
  rarity: "NORMAL" | "ELITE" | "BOSS";
  baseStats: MonsterBaseStats;
  growth: GrowthConfig;
  caps?: {
    maxHp: number;
    atk: number;
    def: number;
    spd: number;
  };
}

/**
 * 计算后的怪物属性
 */
export interface CalculatedMonsterStats {
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
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
   * 加载地图配置
   */
  loadMapsConfig(): MapConfig[] {
    if (this.mapsCache) {
      return this.mapsCache;
    }

    const filePath = join(DATA_DIR, "maps.json");
    const data = readFileSync(filePath, "utf-8");
    this.mapsCache = JSON.parse(data) as MapConfig[];
    return this.mapsCache;
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
   * 根据怪物模板和等级计算属性
   */
  calculateMonsterStats(monsterId: string, level: number): CalculatedMonsterStats | null {
    const template = this.getMonsterById(monsterId);
    if (!template) {
      return null;
    }

    const { baseStats, growth, caps } = template;
    const stats: CalculatedMonsterStats = {
      maxHp: baseStats.maxHp,
      atk: baseStats.atk,
      def: baseStats.def,
      spd: baseStats.spd
    };

    // 计算成长
    if (growth.type === "LINEAR") {
      const levelDiff = level - 1;
      stats.maxHp += growth.perLevel.maxHp * levelDiff;
      stats.atk += growth.perLevel.atk * levelDiff;
      stats.def += growth.perLevel.def * levelDiff;
      stats.spd += growth.perLevel.spd * levelDiff;
    } else if (growth.type === "EXPONENTIAL") {
      const levelDiff = level - 1;
      stats.maxHp = baseStats.maxHp * Math.pow(growth.rate.maxHp, levelDiff);
      stats.atk = baseStats.atk * Math.pow(growth.rate.atk, levelDiff);
      stats.def = baseStats.def * Math.pow(growth.rate.def, levelDiff);
      stats.spd = baseStats.spd * Math.pow(growth.rate.spd, levelDiff);
    } else if (growth.type === "SEGMENT") {
      const levelDiff = level - 1;
      // 找到对应的 segment
      const segment = growth.segments.find(
        (s) => level >= s.from && level <= s.to
      );
      if (segment) {
        const segmentLevelDiff = level - segment.from;
        stats.maxHp += segment.perLevel.maxHp * segmentLevelDiff;
        stats.atk += segment.perLevel.atk * segmentLevelDiff;
        stats.def += segment.perLevel.def * segmentLevelDiff;
        stats.spd += segment.perLevel.spd * segmentLevelDiff;
      }
    }

    // 应用上限
    if (caps) {
      stats.maxHp = Math.min(stats.maxHp, caps.maxHp);
      stats.atk = Math.min(stats.atk, caps.atk);
      stats.def = Math.min(stats.def, caps.def);
      stats.spd = Math.min(stats.spd, caps.spd);
    }

    // 确保数值为正整数
    stats.maxHp = Math.max(1, Math.floor(stats.maxHp));
    stats.atk = Math.max(1, Math.floor(stats.atk));
    stats.def = Math.max(0, Math.floor(stats.def));
    stats.spd = Math.max(1, Math.floor(stats.spd));

    return stats;
  }
}

// 单例实例
export const configService = new ConfigService();
