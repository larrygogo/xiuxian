export interface User {
  id: string;
  username?: string;
  isAdmin?: boolean;
}

export interface BaseStats {
  str: number;
  agi: number;
  vit: number;
  int: number;
  spi: number;
}

export interface CombatStats {
  hit: number;
  pdmg: number;
  pdef: number;
  spd: number;
  mdmg: number;
  mdef: number;
  maxHp: number;
  maxMp: number;
}

import type { Item, EquipmentSlots } from './item.types';

export interface GameState {
  characterId: number;
  name: string;
  level: number;
  qi: number;
  lingshi: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  statPoints: number;
  baseStats: BaseStats;
  combatStats: CombatStats;
  lastTs: number;
  eventLog: string[];
  inventory: (Item | null)[]; // 固定20个位置，null表示空位置
  equipment: EquipmentSlots;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
}
