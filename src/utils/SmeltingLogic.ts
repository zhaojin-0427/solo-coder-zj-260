import type { Ratio, SmeltResult, OreType, QualityLevel } from '../types';
import { QUALITY_LEVELS, FURNACE_CONFIG } from '../config/GameData';

export function getQualityLevel(score: number): QualityLevel {
  let result = QUALITY_LEVELS[0];
  for (const level of QUALITY_LEVELS) {
    if (score >= level.minScore) {
      result = level;
    }
  }
  return result;
}

export function calculateSmeltResult(
  ore: OreType,
  ratio: Ratio,
  avgTemp: number,
  smeltTime: number,
  furnaceDamage: number,
  qualityModifier: number = 1.0
): SmeltResult {
  const messages: string[] = [];
  let score = 50;

  const totalParts = ratio.ore + ratio.charcoal + ratio.flux;
  const charcoalRatio = ratio.charcoal / totalParts;
  const fluxRatio = ratio.flux / totalParts;
  const oreRatio = ratio.ore / totalParts;

  const idealCharcoal = 0.30 + (1 - ore.grade) * 0.15;
  const charcoalDiff = Math.abs(charcoalRatio - idealCharcoal);
  if (charcoalDiff < 0.05) {
    score += 10;
    messages.push('木炭配比极佳');
  } else if (charcoalDiff < 0.1) {
    score += 5;
    messages.push('木炭配比合理');
  } else if (charcoalDiff > 0.2) {
    score -= 15;
    messages.push('木炭配比严重失调');
  } else {
    messages.push('木炭配比略有偏差');
  }

  const idealFlux = 0.10 + (1 - ore.grade) * 0.10;
  const fluxDiff = Math.abs(fluxRatio - idealFlux);
  if (fluxDiff < 0.03) {
    score += 8;
    messages.push('助熔剂用量精准');
  } else if (fluxDiff < 0.08) {
    score += 3;
    messages.push('助熔剂用量适当');
  } else if (fluxDiff > 0.15) {
    score -= 10;
    messages.push('助熔剂用量过多或过少');
  }

  if (oreRatio < 0.4) {
    score -= 20;
    messages.push('矿石比例不足，产出稀少');
  }

  const tempRequired = ore.baseTempRequired;
  if (avgTemp >= tempRequired && avgTemp < tempRequired + 100) {
    score += 20;
    messages.push('炉温控制精准，冶炼效果极佳');
  } else if (avgTemp >= tempRequired - 50 && avgTemp < tempRequired + 200) {
    score += 10;
    messages.push('炉温基本合适');
  } else if (avgTemp < tempRequired - 100) {
    score -= 25;
    messages.push('炉温严重不足，冶炼不充分');
  } else if (avgTemp > tempRequired + 200) {
    score -= 15;
    messages.push('炉温过高，部分铁料被氧化');
  }

  const idealTime = ore.baseSmeltTime;
  const timeRatio = smeltTime / idealTime;
  if (timeRatio >= 0.9 && timeRatio <= 1.1) {
    score += 15;
    messages.push('冶炼时间恰到好处');
  } else if (timeRatio >= 0.7 && timeRatio <= 1.4) {
    score += 7;
    messages.push('冶炼时间基本合适');
  } else if (timeRatio < 0.6) {
    score -= 20;
    messages.push('冶炼时间过短，铁料生涩');
  } else if (timeRatio > 1.6) {
    score -= 10;
    messages.push('冶炼时间过长，燃料浪费');
  }

  score *= ore.grade;

  if (furnaceDamage > 0.3) {
    score *= 0.8;
    messages.push('炉膛受损，影响冶炼品质');
  }

  score = Math.round(score * qualityModifier);
  score = Math.max(0, Math.min(100, score));

  const qualityLevel = getQualityLevel(score);

  return {
    quality: score,
    qualityName: qualityLevel.name,
    timeSpent: smeltTime,
    fuelUsed: Math.round(ratio.charcoal * 10 + smeltTime * 0.5),
    furnaceDamage: furnaceDamage,
    score: score,
    messages: messages
  };
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
