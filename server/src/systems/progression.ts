import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { LEVEL_MAX } from "../config";
import { logLine } from "../services/logger";
import type { GameState } from "../types/game";

// 加载升级灵气表
function getDataDir(): string {
  const cwd = process.cwd();
  const possiblePaths = [
    join(cwd, "server", "data"),  // 从项目根目录启动
    join(cwd, "data"),             // 从 server 目录启动
    join(__dirname, "..", "..", "data"),  // 从编译后的位置
    join(__dirname, "..", "data")  // 从 src/systems 位置
  ];
  
  for (const path of possiblePaths) {
    try {
      const testFile = join(path, "levelQiTable.json");
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

function loadLevelQiTable(): Record<string, number> {
  const dataDir = getDataDir();
  const filePath = join(dataDir, "levelQiTable.json");
  const data = readFileSync(filePath, "utf-8");
  return JSON.parse(data) as Record<string, number>;
}

// 缓存灵气表数据
let levelQiTableCache: Record<string, number> | null = null;

function getLevelQiTable(): Record<string, number> {
  if (!levelQiTableCache) {
    levelQiTableCache = loadLevelQiTable();
  }
  return levelQiTableCache;
}

/**
 * 获取当前等级的显示名称
 * 格式："{等级}级"
 */
export function stageName(state: GameState): string {
  return `${state.level}级`;
}

/**
 * 计算进境所需的灵气数量
 * 从 levelQiTable.json 文件中读取
 */
export function qiNeedForStep(level: number): number {
  const lvl = Math.max(1, Math.min(level, LEVEL_MAX));
  const table = getLevelQiTable();
  const qi = table[lvl.toString()];
  
  // 如果表中没有该等级的数据，使用默认值（向后兼容）
  if (qi === undefined) {
    // 降级到旧的线性公式作为后备
    return 30 + (lvl - 1) * 6;
  }
  
  return qi;
}

/**
 * 获取当前状态进境所需的灵气数量
 */
export function needQi(state: GameState): number {
  return qiNeedForStep(state.level);
}

/**
 * 检查是否已达到最高境界
 */
export function isMaxed(state: GameState): boolean {
  return state.level >= LEVEL_MAX;
}

/**
 * 执行一次进境（如果条件满足）
 * 按照 阶段 -> 层数 -> 大境界 的顺序推进
 */
export function stepUpOnce(state: GameState): boolean {
  if (isMaxed(state)) return false;

  const req = needQi(state);
  if (state.qi < req) return false;

  // 消耗灵气，准备推进
  state.qi -= req;

  if (state.level < LEVEL_MAX) {
    state.level += 1;
    state.statPoints += 5;
    state.hp = state.maxHp;
    state.mp = state.maxMp;
    logLine(`升级：${stageName(state)}（消耗灵气 ${req}）。`, state);
    return true;
  }

  return false;
}

/**
 * 尽可能多地推进境界，直到达到限制或灵气不足
 */
export function stepUpAsMuchAsPossible(state: GameState, limit: number): number {
  let count = 0;
  while (count < limit && stepUpOnce(state)) count += 1;
  return count;
}

