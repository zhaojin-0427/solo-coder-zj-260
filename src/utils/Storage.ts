import type { HighScoreRecord } from '../types';

const STORAGE_KEY = 'smelting_furnace_high_scores';

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
