import type { GameState } from "../../types/game";
import type { Combatant } from "../domain/Combatant";
import { refreshDerivedStats } from "../../systems/stats";

/**
 * 战斗参与者适配器
 * 从 GameState 转换为 Combatant
 */
export class CombatantAdapter {
  /**
   * 将 GameState 转换为 Combatant
   */
  static gameStateToCombatant(
    userId: number,
    gameState: GameState,
    playerId: string
  ): Combatant {
    // 确保战斗属性是最新的
    const combatStats = refreshDerivedStats(gameState);

    // 确定状态
    let status: Combatant["status"] = "alive";
    if (gameState.hp <= 0) {
      status = "dead";
    }

    // 设置初始位置（玩家在左侧）
    const position = { x: 0, y: 0 }; // 后续可以根据玩家索引调整

    return {
      id: playerId,
      side: "player",
      name: gameState.name || "无名修士",
      level: gameState.level,
      hp: Math.max(0, gameState.hp),
      maxHp: gameState.maxHp,
      mp: Math.max(0, gameState.mp),
      maxMp: gameState.maxMp,
      spd: combatStats.spd,
      // 使用新的战斗属性系统
      pdmg: combatStats.pdmg,
      mdmg: combatStats.mdmg,
      pdef: combatStats.pdef,
      mdef: combatStats.mdef,
      // 兼容字段
      atk: Math.max(combatStats.pdmg, combatStats.mdmg),
      def: Math.max(combatStats.pdef, combatStats.mdef),
      status,
      position,
      userId
    };
  }
}
