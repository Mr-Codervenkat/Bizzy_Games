// src/storage/StorageService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CATEGORIES } from '../utils/categoriesData';

const KEYS = {
  CATEGORIES: '@puzzle_categories',
  COMPLETED_PUZZLES: '@completed_puzzles',
  GAME_PROGRESS: '@game_progress',
  SETTINGS: '@settings',
  HIGH_SCORES: '@high_scores',
};

// ─── Categories ───────────────────────────────────────────────────────────────

export const getCategories = async () => {
  try {
    const stored = await AsyncStorage.getItem(KEYS.CATEGORIES);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge stored custom categories with defaults
      const defaultIds = DEFAULT_CATEGORIES.map((c) => c.id);
      const customCategories = parsed.filter((c) => !defaultIds.includes(c.id));
      return [...DEFAULT_CATEGORIES, ...customCategories];
    }
    return DEFAULT_CATEGORIES;
  } catch (e) {
    console.error('getCategories error:', e);
    return DEFAULT_CATEGORIES;
  }
};

export const saveCustomCategory = async (category) => {
  try {
    const categories = await getCategories();
    const defaultIds = DEFAULT_CATEGORIES.map((c) => c.id);
    const customCategories = categories.filter((c) => !defaultIds.includes(c.id));
    const existingIndex = customCategories.findIndex((c) => c.id === category.id);
    if (existingIndex >= 0) {
      customCategories[existingIndex] = category;
    } else {
      customCategories.push(category);
    }
    await AsyncStorage.setItem(KEYS.CATEGORIES, JSON.stringify([...DEFAULT_CATEGORIES, ...customCategories]));
    return true;
  } catch (e) {
    console.error('saveCustomCategory error:', e);
    return false;
  }
};

export const deleteCustomCategory = async (categoryId) => {
  try {
    const defaultIds = DEFAULT_CATEGORIES.map((c) => c.id);
    if (defaultIds.includes(categoryId)) return false; // Cannot delete defaults
    const categories = await getCategories();
    const filtered = categories.filter((c) => c.id !== categoryId);
    await AsyncStorage.setItem(KEYS.CATEGORIES, JSON.stringify(filtered));
    return true;
  } catch (e) {
    console.error('deleteCustomCategory error:', e);
    return false;
  }
};

// ─── Completed Puzzles ─────────────────────────────────────────────────────────

export const getCompletedPuzzles = async () => {
  try {
    const stored = await AsyncStorage.getItem(KEYS.COMPLETED_PUZZLES);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    return {};
  }
};

export const markPuzzleCompleted = async (categoryId, imageId, stats) => {
  try {
    const completed = await getCompletedPuzzles();
    if (!completed[categoryId]) completed[categoryId] = {};
    completed[categoryId][imageId] = {
      completedAt: new Date().toISOString(),
      moves: stats.moves,
      time: stats.time,
    };
    await AsyncStorage.setItem(KEYS.COMPLETED_PUZZLES, JSON.stringify(completed));
    return true;
  } catch (e) {
    return false;
  }
};

export const isPuzzleCompleted = async (categoryId, imageId) => {
  try {
    const completed = await getCompletedPuzzles();
    return !!(completed[categoryId] && completed[categoryId][imageId]);
  } catch (e) {
    return false;
  }
};

// ─── High Scores ───────────────────────────────────────────────────────────────

export const getHighScores = async () => {
  try {
    const stored = await AsyncStorage.getItem(KEYS.HIGH_SCORES);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    return {};
  }
};

export const saveHighScore = async (categoryId, imageId, moves, time) => {
  try {
    const scores = await getHighScores();
    const key = `${categoryId}_${imageId}`;
    const existing = scores[key];
    if (!existing || moves < existing.moves || (moves === existing.moves && time < existing.time)) {
      scores[key] = { moves, time, date: new Date().toISOString() };
      await AsyncStorage.setItem(KEYS.HIGH_SCORES, JSON.stringify(scores));
    }
    return scores[key];
  } catch (e) {
    return null;
  }
};

// ─── Settings ─────────────────────────────────────────────────────────────────

export const getSettings = async () => {
  try {
    const stored = await AsyncStorage.getItem(KEYS.SETTINGS);
    return stored
      ? JSON.parse(stored)
      : {
          musicEnabled: true,
          soundEnabled: true,
          vibration: true,
          musicVolume: 0.6,
          soundVolume: 0.6,
          theme: 'midnight',
        };
  } catch (e) {
    return {
      musicEnabled: true,
      soundEnabled: true,
      vibration: true,
      musicVolume: 0.6,
      soundVolume: 0.6,
      theme: 'midnight',
    };
  }
};

export const saveSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (e) {
    return false;
  }
};

// ─── Clear All Data ────────────────────────────────────────────────────────────

export const clearAllData = async () => {
  try {
    await AsyncStorage.multiRemove(Object.values(KEYS));
    return true;
  } catch (e) {
    return false;
  }
};
