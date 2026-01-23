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
  hit?: number | null;
  pdmg?: number | null;
  pdef?: number | null;
  spd?: number | null;
  mdmg?: number | null;
  mdef?: number | null;
  maxHp?: number | null;
  maxMp?: number | null;
}

import type { Item, EquipmentSlots } from './item';

export interface GameState {
  characterId?: number;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  mp?: number | null;
  maxMp?: number | null;
  qi: number;
  lingshi?: number;
  statPoints?: number;
  baseStats?: BaseStats;
  combatStats?: CombatStats;
  eventLog?: string[];
  inventory?: (Item | null)[]; // 固定20个位置，null表示空位置
  equipment?: EquipmentSlots;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
}
