export interface OreType {
  id: string;
  name: string;
  grade: number;
  color: number;
  baseTempRequired: number;
  baseSmeltTime: number;
  description: string;
}

export interface QualityLevel {
  name: string;
  minScore: number;
  color: number;
  description: string;
}

export interface LevelConfig {
  level: number;
  name: string;
  description: string;
  availableOres: string[];
  allowBronze: boolean;
  batchProduction: boolean;
  qualityChecks: number;
  timeLimit: number;
  targetQuality: string;
  minOrders: number;
  maxOrders: number;
  eventChance: number;
}

export interface Order {
  id: string;
  targetQuality: string;
  quantity: number;
  timeLimit: number;
  bonus: number;
  isEmergency: boolean;
}

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  type: 'supply' | 'weather' | 'emergency';
  effect: {
    tempModifier?: number;
    oreAvailability?: number;
    timeModifier?: number;
    qualityModifier?: number;
  };
  duration: number;
}

export interface SmeltResult {
  quality: number;
  qualityName: string;
  timeSpent: number;
  fuelUsed: number;
  furnaceDamage: number;
  score: number;
  messages: string[];
}

export interface HighScoreRecord {
  level: number;
  score: number;
  date: string;
  quality: string;
  maxCombo?: number;
}

export interface Ratio {
  ore: number;
  charcoal: number;
  flux: number;
}

export interface SmeltingRecord {
  oreId: string;
  oreName: string;
  ratio: Ratio;
  avgTemp: number;
  quality: number;
  qualityName: string;
  score: number;
  date: string;
  level: number;
}

export interface AlmanacEntry {
  oreId: string;
  unlocked: boolean;
  bestRecord: SmeltingRecord | null;
  history: SmeltingRecord[];
}

export interface ComboState {
  currentCombo: number;
  maxCombo: number;
  lastOrderSuccess: boolean;
}
