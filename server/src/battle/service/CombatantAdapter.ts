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

    // 计算统一的攻击力和防御力（取物理和法术的较大值）
    const atk = Math.max(combatStats.pdmg, combatStats.mdmg);
    const def = Math.max(combatStats.pdef, combatStats.mdef);

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
      atk,
      def,
      status,
      position,
      userId
    };
  }
}
