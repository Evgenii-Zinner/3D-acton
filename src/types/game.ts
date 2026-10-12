export type FactionId = 'elf' | 'guard' | 'villain';

export interface Ability {
  id: string;
  name: string;
  description: string;
  cooldown: number; // in seconds
  icon: string;
  hotkey: string;
  damage: number;
}

export interface FactionConfig {
  id: FactionId;
  name: string;
  subtitle: string;
  role: string;
  description: string;
  loreQuote: string;
  color: string;
  accentColor: string;
  baseHealth: number;
  baseSpeed: number;
  weaponName: string;
  abilities: Ability[];
  primaryObjective: string;
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  gold: number;
  level: number;
  exp: number;
  caravansRobbed: number;
  caravansProtected: number;
  hutsDefended: number;
  hutsRaided: number;
  enemiesDefeated: number;
  raidsSurvived: number;
}

export interface CaravanState {
  id: string;
  active: boolean;
  position: { x: number; y: number; z: number };
  hp: number;
  maxHp: number;
  progress: number; // 0 to 1
  totalGold: number;
  robbed: boolean;
  guardsRemaining: number;
}

export interface WoodenHut {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  hp: number;
  maxHp: number;
  isBurning: boolean;
  ruined: boolean;
}

export interface GameEventMessage {
  id: string;
  text: string;
  type: 'caravan' | 'raid' | 'kill' | 'loot' | 'system';
  timestamp: number;
}

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  unlocked: boolean;
  progress?: string;
}
