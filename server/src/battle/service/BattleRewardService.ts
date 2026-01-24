import type { BattleRoom } from "../domain/BattleRoom";
import type { Combatant } from "../domain/Combatant";
import { getUserGameState, updateUserGameState } from "../../services/gameService";
import { addItemToInventory } from "../../systems/items";
import { ItemGenerator } from "../../services/ItemGenerator";
import type { Item } from "../../types/item";
import { logLine } from "../../services/logger";
import { configService } from "./ConfigService";
import { getMaterialData } from "../../services/itemService";

/**
 * 战斗奖励结果
 */
export interface BattleReward {
  playerId: string;
  userId: number;
  qi: number; // 灵气（用于升级）
  lingshi: number; // 灵石
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

      // 计算灵气奖励（考虑等级差距和怪物数量）
      const qi = this.calculateQiReward(playerLevel, avgMonsterLevel, defeatedMonsters.length);

      // 计算灵石奖励（考虑等级差距和怪物数量）
      const lingshi = this.calculateLingshiReward(playerLevel, avgMonsterLevel, defeatedMonsters.length);

      // 生成物品掉落（每个怪物有概率掉落，物品按模板等级生成）
      const items = this.generateItemDrops(defeatedMonsters);

      rewards.push({
        playerId: player.id,
        userId,
        qi,
        lingshi,
        items,
        success: true
      });
    }

    return rewards;
  }

  /**
   * 计算灵气奖励（考虑等级差距）
   * 等级差距越大，灵气越少，直至为0
   * @param playerLevel 玩家等级
   * @param monsterLevel 怪物等级
   * @param monsterCount 怪物数量
   */
  private calculateQiReward(
    playerLevel: number,
    monsterLevel: number,
    monsterCount: number
  ): number {
    // 基础灵气 = 怪物等级 * 10
    const baseQi = monsterLevel * 10;

    // 计算等级差距
    const levelDiff = playerLevel - monsterLevel;

    // 灵气衰减公式：
    // - 等级差 <= 0: 100% 灵气（玩家等级 <= 怪物等级）
    // - 等级差 = 1-5: 线性衰减到 50%
    // - 等级差 = 6-10: 线性衰减到 10%
    // - 等级差 > 10: 0% 灵气
    let qiMultiplier = 1.0;
    if (levelDiff > 0) {
      if (levelDiff <= 5) {
        // 1-5级差距：从100%衰减到50%
        qiMultiplier = 1.0 - (levelDiff / 5) * 0.5;
      } else if (levelDiff <= 10) {
        // 6-10级差距：从50%衰减到10%
        qiMultiplier = 0.5 - ((levelDiff - 5) / 5) * 0.4;
      } else {
        // 超过10级差距：0%灵气
        qiMultiplier = 0;
      }
    }

    // 怪物数量加成（每多一只怪物 +10%）
    const countBonus = 1 + (monsterCount - 1) * 0.1;
    
    // 最终灵气 = 基础灵气 * 衰减系数 * 数量加成 * 怪物数量
    const totalQi = Math.floor(baseQi * qiMultiplier * countBonus * monsterCount);
    
    return totalQi;
  }

  /**
   * 计算灵石奖励（考虑等级差距）
   * 等级差距越大，灵石越少，直至为0
   * @param playerLevel 玩家等级
   * @param monsterLevel 怪物等级
   * @param monsterCount 怪物数量
   */
  private calculateLingshiReward(
    playerLevel: number,
    monsterLevel: number,
    monsterCount: number
  ): number {
    // 基础灵石 = 怪物等级 * 5
    const baseLingshi = monsterLevel * 5;

    // 计算等级差距
    const levelDiff = playerLevel - monsterLevel;

    // 灵石衰减公式（与灵气相同）：
    // - 等级差 <= 0: 100% 灵石（玩家等级 <= 怪物等级）
    // - 等级差 = 1-5: 线性衰减到 50%
    // - 等级差 = 6-10: 线性衰减到 10%
    // - 等级差 > 10: 0% 灵石
    let lingshiMultiplier = 1.0;
    if (levelDiff > 0) {
      if (levelDiff <= 5) {
        // 1-5级差距：从100%衰减到50%
        lingshiMultiplier = 1.0 - (levelDiff / 5) * 0.5;
      } else if (levelDiff <= 10) {
        // 6-10级差距：从50%衰减到10%
        lingshiMultiplier = 0.5 - ((levelDiff - 5) / 5) * 0.4;
      } else {
        // 超过10级差距：0%灵石
        lingshiMultiplier = 0;
      }
    }

    // 怪物数量加成（每多一只怪物 +10%）
    const countBonus = 1 + (monsterCount - 1) * 0.1;
    
    // 最终灵石 = 基础灵石 * 衰减系数 * 数量加成 * 怪物数量
    const totalLingshi = Math.floor(baseLingshi * lingshiMultiplier * countBonus * monsterCount);
    
    return totalLingshi;
  }

  /**
   * 生成物品掉落（根据怪物配置的掉落列表）
   * @param defeatedMonsters 被击败的怪物列表
   */
  private generateItemDrops(defeatedMonsters: Combatant[]): Item[] {
    const items: Item[] = [];
    
    // 为每个怪物生成掉落
    for (const monster of defeatedMonsters) {
      // 获取怪物模板
      if (!monster.monsterId) {
        continue; // 怪物没有 monsterId，跳过
      }
      
      const monsterTemplate = configService.getMonsterById(monster.monsterId);
      if (!monsterTemplate || !monsterTemplate.drops || monsterTemplate.drops.length === 0) {
        continue; // 怪物没有配置掉落列表，跳过
      }

      // 遍历怪物的掉落列表，根据概率决定是否掉落
      for (const drop of monsterTemplate.drops) {
        if (Math.random() < drop.probability) {
          try {
            // 传入怪物等级，用于材料动态选择
            const item = this.generateItemFromTemplate(drop.templateId, monster.level);
            if (item) {
              items.push(item);
            }
          } catch (error) {
            console.error(`[BattleRewardService] 生成物品失败: templateId=${drop.templateId}`, error);
          }
        }
      }
    }
    
    return items;
  }

  /**
   * 根据模板ID生成物品
   * @param templateId 物品模板ID
   * @param monsterLevel 怪物等级（用于材料动态选择）
   */
  private generateItemFromTemplate(templateId: string, monsterLevel?: number): Item | null {
    try {
      // 判断物品类型
      if (templateId.startsWith('weapon_') || templateId.startsWith('helmet_') || 
          templateId.startsWith('armor_') || templateId.startsWith('boots_') ||
          templateId.startsWith('accessory_')) {
        // 装备：不传 level 参数，使用模板的 requiredLevel
        return this.itemGenerator.generateEquipmentFromTemplate(templateId);
      } else if (templateId.startsWith('potion_')) {
        // 消耗品：不传 level 参数，使用默认值
        return this.itemGenerator.generateConsumableFromTemplate(templateId);
      } else if (templateId.startsWith('material_')) {
        // 材料：根据怪物等级动态选择对应的材料模板
        if (monsterLevel !== undefined) {
          const materialTemplateId = this.selectMaterialTemplateByLevel(templateId, monsterLevel);
          return this.itemGenerator.generateMaterialFromTemplate(materialTemplateId);
        } else {
          // 如果没有提供怪物等级，使用原模板ID
          return this.itemGenerator.generateMaterialFromTemplate(templateId);
        }
      } else {
        console.warn(`[BattleRewardService] 未知的物品模板ID: ${templateId}`);
        return null;
      }
    } catch (error) {
      console.error(`[BattleRewardService] 生成物品失败: templateId=${templateId}`, error);
      return null;
    }
  }

  /**
   * 根据怪物等级选择对应的材料模板ID
   * 材料模板ID格式：material_iron_001, material_iron_010, material_iron_020, ...
   * 根据怪物等级选择最接近的材料等级（向下取整到最近的10的倍数，最小为1）
   */
  private selectMaterialTemplateByLevel(baseTemplateId: string, monsterLevel: number): string {
    // 提取基础名称（如 "material_iron"）
    const baseNameMatch = baseTemplateId.match(/^(material_\w+)_\d+$/);
    if (!baseNameMatch) {
      // 如果格式不匹配，返回原模板ID
      return baseTemplateId;
    }

    const baseName = baseNameMatch[1];
    
    // 根据怪物等级计算材料等级（每10级一个段，最小0级）
    // 1-9级 -> 0级材料，10-19级 -> 10级材料，20-29级 -> 20级材料，...
    const materialLevel = monsterLevel < 10 ? 0 : Math.floor(monsterLevel / 10) * 10;
    
    // 生成对应的模板ID（格式：material_iron_001, material_iron_010, material_iron_020, ...）
    const levelStr = materialLevel.toString().padStart(3, '0');
    const targetTemplateId = `${baseName}_${levelStr}`;
    
    // 验证模板是否存在，如果不存在则尝试找最接近的较低等级模板
    const templates = getMaterialData();
    const targetTemplate = templates.find((t: { templateId: string; level?: number }) => t.templateId === targetTemplateId);
    
    if (targetTemplate) {
      return targetTemplateId;
    }
    
    // 如果目标模板不存在，找最接近的较低等级模板
    const availableTemplates = templates
      .filter((t: { templateId: string; level?: number }) => t.templateId.startsWith(baseName + "_"))
      .map((t: { templateId: string; level?: number }) => {
        const match = t.templateId.match(/_(\d+)$/);
        const level = match ? parseInt(match[1], 10) : 0;
        return { templateId: t.templateId, level };
      })
      .filter((t: { templateId: string; level: number }) => t.level <= materialLevel)
      .sort((a: { templateId: string; level: number }, b: { templateId: string; level: number }) => b.level - a.level);
    
    if (availableTemplates.length > 0) {
      return availableTemplates[0].templateId;
    }
    
    // 如果都找不到，返回原模板ID
    return baseTemplateId;
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

    // 添加灵气
    if (reward.qi > 0) {
      state.qi += reward.qi;
      logLine(`获得灵气 +${reward.qi}。`, state);
    }

    // 添加灵石
    if (reward.lingshi > 0) {
      state.lingshi += reward.lingshi;
      logLine(`获得灵石 +${reward.lingshi}。`, state);
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
