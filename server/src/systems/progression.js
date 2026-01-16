"use strict";

const { REALMS, PHASE_NAMES, MAX_LEVEL } = require("../config");
const { logLine } = require("../services/logger");

/**
 * 获取当前境界的显示名称
 * @param {Object} s - 游戏状态对象
 * @returns {string} 境界名称，格式："{境界} {层数}层·{阶段}"
 */
function stageName(s) {
  return `${REALMS[s.realmIndex]} ${s.level}层·${PHASE_NAMES[s.phase]}`;
}

/**
 * 计算进境所需的灵气数量
 * @param {number} realmIndex - 大境界索引（0-4）
 * @param {number} level - 层数（1-9）
 * @param {number} phase - 阶段（0前期 1中期 2后期）
 * @returns {number} 所需的灵气数量
 */
function qiNeedForStep(realmIndex, level, phase) {
  // 这套参数是"慢但不无聊"的基准；你可以后续调 base/realmMul 等
  const realmMul = Math.pow(2.2, realmIndex);
  const lvl = Math.max(1, level);
  const levelMul = 1 + (lvl - 1) * 0.35 + Math.pow(lvl - 1, 2) * 0.04;
  const phaseMul = [1.0, 1.35, 1.8][phase] ?? 1.0;
  const base = 30;
  return Math.floor(base * realmMul * levelMul * phaseMul);
}

/**
 * 获取当前状态进境所需的灵气数量
 * @param {Object} s - 游戏状态对象
 * @returns {number} 所需的灵气数量
 */
function needQi(s) {
  return qiNeedForStep(s.realmIndex, s.level, s.phase);
}

/**
 * 检查是否已达到最高境界
 * @param {Object} s - 游戏状态对象
 * @returns {boolean} 如果已达到最高境界（最后一个境界的最高层最高阶段）返回 true
 */
function isMaxed(s) {
  return s.realmIndex >= REALMS.length - 1 && s.level === MAX_LEVEL && s.phase === 2;
}

/**
 * 执行一次进境（如果条件满足）
 * 按照 阶段 -> 层数 -> 大境界 的顺序推进
 * @param {Object} s - 游戏状态对象
 * @returns {boolean} 如果成功进境返回 true，否则返回 false
 */
function stepUpOnce(s) {
  if (isMaxed(s)) return false;

  const req = needQi(s);
  if (s.qi < req) return false;

  s.qi -= req;

  if (s.phase < 2) {
    s.phase += 1;
    logLine(`进境：${stageName(s)}（消耗灵气 ${req}）。`, s);
    return true;
  }

  s.phase = 0;
  if (s.level < MAX_LEVEL) {
    s.level += 1;
    logLine(`进境：${stageName(s)}（消耗灵气 ${req}）。`, s);
    return true;
  }

  // 破境：进入下一大境界
  if (s.realmIndex < REALMS.length - 1) {
    s.level = 1;
    s.realmIndex += 1;

    s.maxHp += 20 + s.realmIndex * 5;
    s.hp = s.maxHp;
    if (Math.random() < 0.25) s.luck += 1;

    logLine(`破境：踏入【${REALMS[s.realmIndex]}】！当前 ${stageName(s)}，生命上限 ${s.maxHp}。`, s);
    return true;
  }

  return false;
}

/**
 * 尽可能多地推进境界，直到达到限制或灵气不足
 * @param {Object} s - 游戏状态对象
 * @param {number} limit - 最大推进次数（可使用 Infinity 表示无上限）
 * @returns {number} 实际推进的次数
 */
function stepUpAsMuchAsPossible(s, limit) {
  let count = 0;
  while (count < limit && stepUpOnce(s)) count += 1;
  return count;
}

module.exports = {
  stageName,
  needQi,
  stepUpAsMuchAsPossible,
  qiNeedForStep,
  isMaxed
};
