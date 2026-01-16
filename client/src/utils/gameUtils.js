// 游戏配置常量（应该与服务端保持一致）
const REALMS = ["练气", "筑基", "金丹", "元婴", "化神"];
const PHASE_NAMES = ["前期", "中期", "后期"];

export function stageName(state) {
  return `${REALMS[state.realmIndex]} ${state.level}层·${PHASE_NAMES[state.phase]}`;
}

export function needQi(state) {
  // 计算进境所需的灵气数量（与服务端逻辑保持一致）
  const realmMul = Math.pow(2.2, state.realmIndex);
  const lvl = Math.max(1, state.level);
  const levelMul = 1 + (lvl - 1) * 0.35 + Math.pow(lvl - 1, 2) * 0.04;
  const phaseMul = [1.0, 1.35, 1.8][state.phase] ?? 1.0;
  const base = 30;
  return Math.floor(base * realmMul * levelMul * phaseMul);
}
