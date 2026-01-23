// 服务器与游戏配置，保持集中管理方便统一调整
export const PORT = Number(process.env.PORT) || 3000;
export const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
export const JWT_EXPIRES_IN = "7d";

// 数据库配置
export const DB_PATH = process.env.DB_PATH || "./game.db";

// 等级体系
/**
 * 最大等级
 */
export const LEVEL_MAX = 100;

// 探索事件素材
export const BEASTS = ["山魈", "血狼", "妖蛇", "腐尸", "黑熊精"] as const;

// 回合制战斗配置
export const BATTLE_CONFIG = {
  baseHit: 0.75,
  minHit: 0.15,
  maxHit: 0.95,
  hitScale: 0.002,
  baseCrit: 0.05,
  minCrit: 0.01,
  maxCrit: 0.5,
  critScale: 0.002,
  baseCc: 0.05,
  minCc: 0.01,
  maxCc: 0.35,
  ccScale: 0.002,
  baseStatus: 0.05,
  minStatus: 0.01,
  maxStatus: 0.45,
  statusScale: 0.002,
  defenseK: 60,
  maxDr: 0.7,
  maxRounds: 20,
  dotTurns: 2,
  dotRatio: 0.08
} as const;
