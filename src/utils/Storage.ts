import type { HighScoreRecord, SmeltingRecord, AlmanacEntry, ComboState } from '../types';
import { ORE_TYPES, ALMANAC_CONFIG } from '../config/GameData';

const STORAGE_KEY = 'smelting_furnace_high_scores';
const ALMANAC_KEY = 'smelting_furnace_almanac';
const COMBO_KEY = 'smelting_furnace_combo';
const GLOBAL_MAX_COMBO_KEY = 'smelting_furnace_global_max_combo';

export function getHighScores(): HighScoreRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to read high scores:', e);
  }
  return [];
}

export function saveHighScore(record: HighScoreRecord): void {
  try {
    const scores = getHighScores();
    scores.push(record);
    scores.sort((a, b) => b.score - a.score);
    const topScores = scores.slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(topScores));
  } catch (e) {
    console.error('Failed to save high score:', e);
  }
}

export function getHighScoreForLevel(level: number): number {
  const scores = getHighScores().filter(s => s.level === level);
  if (scores.length > 0) {
    return scores[0].score;
  }
  return 0;
}

export function getTutorialComplete(): boolean {
  try {
    return localStorage.getItem('smelting_tutorial_complete') === 'true';
  } catch {
    return false;
  }
}

export function setTutorialComplete(): void {
  try {
    localStorage.setItem('smelting_tutorial_complete', 'true');
  } catch (e) {
    console.error('Failed to save tutorial status:', e);
  }
}

export function getAlmanac(): Record<string, AlmanacEntry> {
  try {
    const data = localStorage.getItem(ALMANAC_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to read almanac:', e);
  }
  const almanac: Record<string, AlmanacEntry> = {};
  Object.keys(ORE_TYPES).forEach(oreId => {
    almanac[oreId] = {
      oreId,
      unlocked: false,
      bestRecord: null,
      history: []
    };
  });
  return almanac;
}

export function saveSmeltingRecord(record: SmeltingRecord): void {
  try {
    const almanac = getAlmanac();
    if (!almanac[record.oreId]) {
      almanac[record.oreId] = {
        oreId: record.oreId,
        unlocked: false,
        bestRecord: null,
        history: []
      };
    }
    const entry = almanac[record.oreId];
    entry.unlocked = true;
    entry.history.unshift(record);
    if (entry.history.length > ALMANAC_CONFIG.maxHistoryPerOre) {
      entry.history = entry.history.slice(0, ALMANAC_CONFIG.maxHistoryPerOre);
    }
    if (!entry.bestRecord || record.score > entry.bestRecord.score) {
      entry.bestRecord = record;
    }
    localStorage.setItem(ALMANAC_KEY, JSON.stringify(almanac));
  } catch (e) {
    console.error('Failed to save smelting record:', e);
  }
}

export function getAlmanacEntry(oreId: string): AlmanacEntry | null {
  const almanac = getAlmanac();
  return almanac[oreId] || null;
}

export function getGlobalMaxCombo(): number {
  try {
    const data = localStorage.getItem(GLOBAL_MAX_COMBO_KEY);
    if (data) {
      return parseInt(data, 10) || 0;
    }
  } catch (e) {
    console.error('Failed to read global max combo:', e);
  }
  return 0;
}

export function saveGlobalMaxCombo(combo: number): void {
  try {
    const current = getGlobalMaxCombo();
    if (combo > current) {
      localStorage.setItem(GLOBAL_MAX_COMBO_KEY, combo.toString());
    }
  } catch (e) {
    console.error('Failed to save global max combo:', e);
  }
}

export function getComboState(): ComboState {
  try {
    const data = localStorage.getItem(COMBO_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to read combo state:', e);
  }
  return {
    currentCombo: 0,
    maxCombo: 0,
    lastOrderSuccess: false
  };
}

export function saveComboState(state: ComboState): void {
  try {
    localStorage.setItem(COMBO_KEY, JSON.stringify(state));
    if (state.maxCombo > getGlobalMaxCombo()) {
      saveGlobalMaxCombo(state.maxCombo);
    }
  } catch (e) {
    console.error('Failed to save combo state:', e);
  }
}

export function resetComboState(): void {
  try {
    localStorage.removeItem(COMBO_KEY);
  } catch (e) {
    console.error('Failed to reset combo state:', e);
  }
}
