import type { EquipmentSlot } from "../types/item";

const TIER_EPITHETS: string[] = [
  "青霭",
  "玄铁",
  "灵木",
  "紫霄",
  "寒魄",
  "赤焰",
  "雷纹",
  "龙鳞",
  "星辉",
  "破军",
  "九幽",
  "天罡",
  "太虚",
  "斩仙",
  "混元",
  "诛神",
  "造化",
  "开天",
  "鸿蒙",
  "混沌",
  "大道"
];

const TIER_LORE: string[] = [
  "山门旧藏，清气未散",
  "寒铁淬火，锋芒内敛",
  "灵木孕纹，木心有声",
  "紫霄一缕，映照灵台",
  "寒魄凝霜，触之生凉",
  "赤焰藏炁，燎尽邪秽",
  "雷纹刻骨，气机若鸣",
  "龙鳞为甲，护身辟凶",
  "星辉入器，暗合天时",
  "破军之名，杀伐决断",
  "九幽沉冥，幽意自成",
  "天罡正气，压诸邪祟",
  "太虚澄澈，返照本真",
  "斩仙一念，断却尘缘",
  "混元一气，圆融无碍",
  "诛神旧誓，铭于器骨",
  "造化流转，生生不息",
  "开天遗意，隐现纹脉",
  "鸿蒙初判，清浊未分",
  "混沌无形，万象由此",
  "大道至简，归于一念"
];

function pickByParity(a: string, b: string, tier: number): string {
  return tier % 2 === 0 ? b : a;
}

function getTierEpithet(tier: number): string {
  const idx = Math.min(Math.max(1, tier), TIER_EPITHETS.length) - 1;
  return TIER_EPITHETS[idx];
}

function getTierLore(tier: number): string {
  const idx = Math.min(Math.max(1, tier), TIER_LORE.length) - 1;
  return TIER_LORE[idx];
}

function isMagicWeapon(combatStatTypes: string[]): boolean {
  return combatStatTypes.includes("mdmg");
}

export function getEquipmentName(slot: EquipmentSlot, tier: number, combatStatTypes: string[]): string {
  const epithet = getTierEpithet(tier);
  switch (slot) {
    case "weapon": {
      const magic = isMagicWeapon(combatStatTypes);
      const noun = magic
        ? pickByParity("法杖", "拂尘", tier)
        : pickByParity("长剑", "战刀", tier);
      return `${epithet}${noun}`;
    }
    case "helmet":
      return `${epithet}${pickByParity("云冠", "玄盔", tier)}`;
    case "armor":
      return `${epithet}${pickByParity("道袍", "法衣", tier)}`;
    case "leggings":
      return `${epithet}${pickByParity("行裳", "护胫", tier)}`;
    case "boots":
      return `${epithet}${pickByParity("行履", "云靴", tier)}`;
    case "accessory":
      return `${epithet}${pickByParity("玉佩", "灵符", tier)}`;
    default:
      return `${epithet}遗物`;
  }
}

export function getEquipmentDescription(slot: EquipmentSlot, tier: number, combatStatTypes: string[]): string {
  const lore = getTierLore(tier);
  switch (slot) {
    case "weapon": {
      const magic = isMagicWeapon(combatStatTypes);
      const tail = magic
        ? "执之可引灵机，法意相随"
        : "佩之如臂使指，气贯长虹";
      return `${lore}。${tail}。`;
    }
    case "helmet":
      return `${lore}。护灵台，定神识。`;
    case "armor":
      return `${lore}。护心脉，避煞气。`;
    case "leggings":
      return `${lore}。步稳气沉，行走如风。`;
    case "boots":
      return `${lore}。踏尘不染，来去无声。`;
    case "accessory":
      return `${lore}。佩之凝神聚气，心意自明。`;
    default:
      return `${lore}。`;
  }
}

