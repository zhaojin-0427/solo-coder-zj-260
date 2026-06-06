import type { OreType, QualityLevel, LevelConfig, GameEvent } from '../types';

export const ORE_TYPES: Record<string, OreType> = {
  hematite: {
    id: 'hematite',
    name: '赤铁矿',
    grade: 0.7,
    color: 0xa04030,
    baseTempRequired: 1200,
    baseSmeltTime: 40,
    description: '高品质铁矿石，含铁量高，冶炼相对容易'
  },
  magnetite: {
    id: 'magnetite',
    name: '磁铁矿',
    grade: 0.6,
    color: 0x404050,
    baseTempRequired: 1300,
    baseSmeltTime: 55,
    description: '中等品质，磁性较强，需要更高温度'
  },
  limonite: {
    id: 'limonite',
    name: '褐铁矿',
    grade: 0.45,
    color: 0x806040,
    baseTempRequired: 1400,
    baseSmeltTime: 70,
    description: '低品位矿石，杂质多，需要高温长时间冶炼'
  },
  siderite: {
    id: 'siderite',
    name: '菱铁矿',
    grade: 0.35,
    color: 0x907050,
    baseTempRequired: 1500,
    baseSmeltTime: 90,
    description: '极低品位，冶炼难度大，产量低但品质独特'
  },
  copperOre: {
    id: 'copperOre',
    name: '孔雀石(铜)',
    grade: 0.55,
    color: 0x30a060,
    baseTempRequired: 1100,
    baseSmeltTime: 45,
    description: '铜矿石，用于青铜冶炼，需与锡矿配合'
  },
  cassiterite: {
    id: 'cassiterite',
    name: '锡石(锡)',
    grade: 0.6,
    color: 0x606080,
    baseTempRequired: 1000,
    baseSmeltTime: 35,
    description: '锡矿石，熔点低，用于青铜合金'
  }
};

export const QUALITY_LEVELS: QualityLevel[] = [
  { name: '凡品', minScore: 0, color: 0x808080, description: '最普通的铁料，勉强可用' },
  { name: '良品', minScore: 50, color: 0xc0a060, description: '品质尚可，日常使用足够' },
  { name: '精品', minScore: 70, color: 0x60a0c0, description: '精心冶炼，品质优良' },
  { name: '上品', minScore: 85, color: 0xc060ff, description: '上等品质，工匠心血之作' },
  { name: '极品', minScore: 95, color: 0xffd700, description: '天工神作，可遇不可求' }
];

export const LEVEL_CONFIGS: LevelConfig[] = [
  {
    level: 1,
    name: '学徒试炼',
    description: '学习基本冶炼技艺，使用赤铁矿和磁铁矿，完成基础订单',
    availableOres: ['hematite', 'magnetite'],
    allowBronze: false,
    batchProduction: false,
    qualityChecks: 1,
    timeLimit: 180,
    targetQuality: '良品',
    minOrders: 3,
    maxOrders: 5,
    eventChance: 0.2
  },
  {
    level: 2,
    name: '工匠进阶',
    description: '引入褐铁矿和紧急订单，天气因素开始影响冶炼',
    availableOres: ['hematite', 'magnetite', 'limonite'],
    allowBronze: false,
    batchProduction: false,
    qualityChecks: 2,
    timeLimit: 240,
    targetQuality: '精品',
    minOrders: 4,
    maxOrders: 7,
    eventChance: 0.4
  },
  {
    level: 3,
    name: '大师挑战',
    description: '所有矿石可用，支持批量生产，需应对各种突发事件',
    availableOres: ['hematite', 'magnetite', 'limonite', 'siderite', 'copperOre', 'cassiterite'],
    allowBronze: true,
    batchProduction: true,
    qualityChecks: 3,
    timeLimit: 300,
    targetQuality: '上品',
    minOrders: 5,
    maxOrders: 9,
    eventChance: 0.6
  }
];

export const GAME_EVENTS: GameEvent[] = [
  {
    id: 'ore_shortage',
    name: '矿石短缺',
    description: '矿区运输受阻，矿石供应不足！',
    type: 'supply',
    effect: { oreAvailability: 0.5 },
    duration: 30
  },
  {
    id: 'rainy_day',
    name: '阴雨绵绵',
    description: '天气潮湿，炉温难以维持，温度下降更快',
    type: 'weather',
    effect: { tempModifier: -0.5 },
    duration: 40
  },
  {
    id: 'heat_wave',
    name: '酷暑难当',
    description: '天气炎热，炉温容易过高，小心烧毁炉膛！',
    type: 'weather',
    effect: { tempModifier: 0.3 },
    duration: 35
  },
  {
    id: 'wind_storm',
    name: '大风骤起',
    description: '大风助燃，鼓风效果增强',
    type: 'weather',
    effect: { tempModifier: 0.2 },
    duration: 25
  },
  {
    id: 'urgent_order',
    name: '皇家急件',
    description: '朝廷紧急订单！时间减半但奖励翻倍',
    type: 'emergency',
    effect: { timeModifier: 0.5, qualityModifier: 1.2 },
    duration: 0
  },
  {
    id: 'good_ore',
    name: '上等矿料',
    description: '矿区送来一批优质矿石，品质判定加成',
    type: 'supply',
    effect: { qualityModifier: 1.1 },
    duration: 50
  }
];

export const FURNACE_CONFIG = {
  minTemp: 200,
  maxSafeTemp: 1400,
  maxTemp: 1800,
  damagePerDegOver: 0.05,
  tempDecayRate: 5,
  blowTempIncrease: 80,
  fuelConsumptionPerBlow: 2
};

export const RATIO_CONFIG = {
  minPart: 1,
  maxPart: 10,
  totalParts: 12
};

export const COMBO_CONFIG = {
  baseMultiplier: 1.0,
  multiplierPerCombo: 0.2,
  maxMultiplier: 3.0,
  breakOnFailure: true
};

export const ALMANAC_CONFIG = {
  maxHistoryPerOre: 10
};
