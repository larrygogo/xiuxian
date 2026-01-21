export interface User {
  id: string;
  username?: string;
}

export interface DailyState {
  remainingTicks?: number;
}

export interface BaseStats {
  str: number;
  agi: number;
  vit: number;
  int: number;
  spi: number;
  luk: number;
}

export interface CombatStats {
  atk?: number | null;
  matk?: number | null;
  def?: number | null;
  mdef?: number | null;
  spd?: number | null;
  hit?: number | null;
  eva?: number | null;
  crit?: number | null;
  critDmg?: number | null;
  critRes?: number | null;
  ccHit?: number | null;
  ccRes?: number | null;
  statusPower?: number | null;
  statusRes?: number | null;
  hpRegen?: number | null;
  mpRegen?: number | null;
  dropRate?: number | null;
  procRate?: number | null;
}

import type { Item, EquipmentSlots } from './item';

export interface GameState {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  mp?: number | null;
  maxMp?: number | null;
  qi: number;
  herbs: number;
  luck: number;
  isTuna: boolean;
  alive: boolean;
  daily?: DailyState;
  baseStats?: BaseStats;
  combatStats?: CombatStats;
  eventLog?: string[];
  inventory?: Item[];
  equipment?: EquipmentSlots;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
}
