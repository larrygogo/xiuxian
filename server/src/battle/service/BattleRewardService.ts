import type { BattleRoom } from "../domain/BattleRoom";
import type { Combatant } from "../domain/Combatant";
import { getUserGameState, updateUserGameState } from "../../services/gameService";
import { addItemToInventory } from "../../systems/items";
import { ItemGenerator } from "../../services/ItemGenerator";
import type { Item } from "../../types/item";
import { generateRandomItem } from "../../services/itemService";
import { logLine } from "../../services/logger";

/**
 * 战斗奖励结果
 */
export interface BattleReward {
  playerId: string;
  userId: number;
  experience: number; // 经验值
  qi: number; // 灵气
  items: Item[]; // 掉落的物品
  success: boolean; // 是否成功（未死亡且未逃跑）
}

/**
 * 战斗奖励结算服务
 */
export class BattleRewardService {
  private itemGenerator: ItemGenerator;

  constructor() {
    this.itemGenerator = new ItemGenerator();
  }

  /**
   * 计算战斗奖励
   * @param room 战斗房间
   * @param winner 获胜方
   * @returns 每个玩家的奖励
   */
  calculateRewards(
    room: BattleRoom,
    winner: "players" | "monsters" | "draw"
  ): BattleReward[] {
    const rewards: BattleReward[] = [];

    // 只有玩家获胜时才给予奖励
    if (winner !== "players") {
      return rewards;
    }

    // 获取所有存活的玩家（未死亡且未逃跑）
    const alivePlayers = room.participants.filter(
      (p) => p.side === "player" && p.status === "alive" && p.userId
    );

    // 获取所有被击败的怪物
    const defeatedMonsters = room.participants.filter(
      (m) => m.side === "monster" && (m.status === "dead" || m.status === "escaped")
    );

    if (defeatedMonsters.length === 0) {
      return rewards;
    }

    // 计算平均怪物等级（用于奖励计算）
    const avgMonsterLevel =
      defeatedMonsters.reduce((sum, m) => sum + m.level, 0) / defeatedMonsters.length;

    // 为每个存活玩家计算奖励
    for (const player of alivePlayers) {
      if (!player.userId) continue;

      const userId = player.userId;
      const playerLevel = player.level;

      // 计算经验值（考虑等级差距）
      const experience = this.calculateExperience(playerLevel, avgMonsterLevel, defeatedMonsters.length);

      // 计算灵气奖励（基础值 + 怪物数量加成）
      const qi = this.calculateQiReward(avgMonsterLevel, defeatedMonsters.length);

      // 生成物品掉落（每个怪物有概率掉落）
      const items = this.generateItemDrops(defeatedMonsters, playerLevel);

      rewards.push({
        playerId: player.id,
        userId,
        experience,
        qi,
        items,
        success: true
      });
    }

    return rewards;
  }

  /**
   * 计算经验值
   * 等级差距越大，经验越少，直至为0
   * @param playerLevel 玩家等级
   * @param monsterLevel 怪物等级
   * @param monsterCount 怪物数量
   */
  private calculateExperience(
    playerLevel: number,
    monsterLevel: number,
    monsterCount: number
  ): number {
    // 基础经验值 = 怪物等级 * 10
    const baseExp = monsterLevel * 10;

    // 计算等级差距
    const levelDiff = playerLevel - monsterLevel;

    // 经验衰减公式：
    // - 等级差 <= 0: 100% 经验（玩家等级 <= 怪物等级）
    // - 等级差 = 1-5: 线性衰减到 50%
    // - 等级差 = 6-10: 线性衰减到 10%
    // - 等级差 > 10: 0% 经验
    let expMultiplier = 1.0;
    if (levelDiff > 0) {
      if (levelDiff <= 5) {
        // 1-5级差距：从100%衰减到50%
        expMultiplier = 1.0 - (levelDiff / 5) * 0.5;
      } else if (levelDiff <= 10) {
        // 6-10级差距：从50%衰减到10%
        expMultiplier = 0.5 - ((levelDiff - 5) / 5) * 0.4;
      } else {
        // 超过10级差距：0%经验
        expMultiplier = 0;
      }
    }

    // 最终经验 = 基础经验 * 衰减系数 * 怪物数量
    const totalExp = Math.floor(baseExp * expMultiplier * monsterCount);

    return totalExp;
  }

  /**
   * 计算灵气奖励
   * @param monsterLevel 怪物等级
   * @param monsterCount 怪物数量
   */
  private calculateQiReward(monsterLevel: number, monsterCount: number): number {
    // 基础灵气 = 怪物等级 * 2
    const baseQi = monsterLevel * 2;
    
    // 怪物数量加成（每多一只怪物 +10%）
    const countBonus = 1 + (monsterCount - 1) * 0.1;
    
    // 最终灵气 = 基础灵气 * 数量加成
    const totalQi = Math.floor(baseQi * countBonus * monsterCount);
    
    return totalQi;
  }

  /**
   * 生成物品掉落
   * @param defeatedMonsters 被击败的怪物列表
   * @param playerLevel 玩家等级
   */
  private generateItemDrops(defeatedMonsters: Combatant[], playerLevel: number): Item[] {
    const items: Item[] = [];
    
    // 每个怪物有30%概率掉落物品
    for (const monster of defeatedMonsters) {
      if (Math.random() < 0.3) {
        // 根据怪物等级生成物品（使用玩家等级和怪物等级的平均值）
        const itemLevel = Math.floor((playerLevel + monster.level) / 2);
        const item = generateRandomItem(itemLevel);
        items.push(item);
      }
    }
    
    return items;
  }

  /**
   * 应用奖励到玩家状态
   * @param reward 奖励信息
   */
  async applyReward(reward: BattleReward): Promise<void> {
    if (!reward.success) {
      return; // 玩家死亡或逃跑，不给予奖励
    }

    const state = getUserGameState(reward.userId);
    if (!state) {
      console.error(`[BattleRewardService] 玩家状态不存在: userId=${reward.userId}`);
      return;
    }

    // 添加经验值（如果游戏状态有经验字段）
    // 注意：当前 GameState 没有经验字段，可能需要添加到类型中
    // 这里先记录日志，后续可以根据实际需求调整
    if (reward.experience > 0) {
      // TODO: 如果 GameState 有经验字段，在这里添加
      // state.experience += reward.experience;
      logLine(`获得经验 +${reward.experience}。`, state);
    }

    // 添加灵气
    if (reward.qi > 0) {
      state.qi += reward.qi;
      logLine(`获得灵气 +${reward.qi}。`, state);
    }

    // 添加物品
    for (const item of reward.items) {
      const success = addItemToInventory(state, item);
      if (!success) {
        logLine(`背包已满，无法获得 ${item.name}。`, state);
      }
    }

    // 保存状态
    await updateUserGameState(reward.userId, state);
  }

  /**
   * 批量应用奖励
   */
  async applyRewards(rewards: BattleReward[]): Promise<void> {
    const promises = rewards.map((reward) => this.applyReward(reward));
    await Promise.all(promises);
  }
}
