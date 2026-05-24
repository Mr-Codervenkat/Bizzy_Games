import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { getCategories, getSettings, saveSettings } from '../storage/StorageService';

const AppContext = createContext();

const MUSIC_TRACKS = {
  default: require('../../assets/music/default.wav'),
  devotional: require('../../assets/categories/devotional/Devotional_music.mp3'),
  '1': require('../../assets/categories/actors/1.mp3'),
  '2': require('../../assets/categories/actors/2.mp3'),
  '3': require('../../assets/categories/actors/3.mp3'),
  '4': require('../../assets/categories/actors/4.mp3'),
  '5': require('../../assets/categories/actors/5.mp3'),
  '6': require('../../assets/categories/actors/6.mp3'),
  '7': require('../../assets/categories/actors/7.mp3'),
  '8': require('../../assets/categories/actors/8.mp3'),
  '9': require('../../assets/categories/actors/9.mp3'),
  '10': require('../../assets/categories/actors/10.mp3'),
  actor_1: require('../../assets/categories/actors/1.mp3'),
  actor_2: require('../../assets/categories/actors/2.mp3'),
  actor_3: require('../../assets/categories/actors/3.mp3'),
  actor_4: require('../../assets/categories/actors/4.mp3'),
  actor_5: require('../../assets/categories/actors/5.mp3'),
  actor_6: require('../../assets/categories/actors/6.mp3'),
  actor_7: require('../../assets/categories/actors/7.mp3'),
  actor_8: require('../../assets/categories/actors/8.mp3'),
  actor_9: require('../../assets/categories/actors/9.mp3'),
  actor_10: require('../../assets/categories/actors/10.mp3'),
};

const THEMES = {
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    gradient: ['#0f0f23', '#1a1a3e', '#0f0f23'],
    accent: '#8b5cf6',
    surface: 'rgba(255,255,255,0.08)',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    gradient: ['#2b124c', '#522258', '#8c3061'],
    accent: '#f59e0b',
    surface: 'rgba(255,255,255,0.10)',
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    gradient: ['#0b1f1a', '#173c35', '#0f2c26'],
    accent: '#22c55e',
    surface: 'rgba(255,255,255,0.09)',
  },
};

const DEFAULT_SETTINGS = {
  musicEnabled: true,
  soundEnabled: true,
  vibration: true,
  musicVolume: 0.6,
  soundVolume: 0.6,
  theme: 'midnight',
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

export const AppProvider = ({ children }) => {
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [currentMusic, setCurrentMusic] = useState(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const soundRef = useRef(null);
  const currentTrackRef = useRef(null);

  const currentTheme = useMemo(
    () => THEMES[settings.theme] || THEMES.midnight,
    [settings.theme]
  );

  useEffect(() => {
    loadInitialData();

    return () => {
      stopMusic();
    };
  }, []);

  const loadInitialData = async () => {
    const [storedSettings, storedCategories] = await Promise.all([
      getSettings(),
      getCategories(),
    ]);

    setSettings({ ...DEFAULT_SETTINGS, ...storedSettings });
    setCategories(storedCategories);
  };

  const refreshCategories = async () => {
    const nextCategories = await getCategories();
    setCategories(nextCategories);
  };

  const updateSettings = async (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await saveSettings(updated);

    if (!updated.musicEnabled) {
      await stopMusic();
      return;
    }

    if (soundRef.current) {
      try {
        await soundRef.current.setVolumeAsync(updated.musicVolume ?? DEFAULT_SETTINGS.musicVolume);
      } catch (e) {
        console.log('setVolumeAsync error:', e);
      }
    }
  };

  const playMusic = async (trackKey = 'default') => {
    if (currentTrackRef.current === trackKey && soundRef.current) {
      return;
    }

    await stopMusic();
    if (!settings.musicEnabled) {
      return;
    }

    const source = MUSIC_TRACKS[trackKey] || MUSIC_TRACKS.default;
    if (!source) {
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playsInSilentModeIOS: true,
      });

      const { sound } = await Audio.Sound.createAsync(source, {
        isLooping: true,
        volume: settings.musicVolume ?? DEFAULT_SETTINGS.musicVolume,
        shouldPlay: true,
      });

      soundRef.current = sound;
      currentTrackRef.current = trackKey;
      setCurrentMusic(trackKey);
      setIsMusicPlaying(true);
    } catch (e) {
      console.log('playMusic error:', e);
      soundRef.current = null;
      currentTrackRef.current = null;
      setCurrentMusic(null);
      setIsMusicPlaying(false);
    }
  };

  const stopMusic = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) {
        console.log('stopMusic error:', e);
      }
      soundRef.current = null;
    }

    currentTrackRef.current = null;
    setCurrentMusic(null);
    setIsMusicPlaying(false);
  };

  const toggleMusic = async () => {
    const nextEnabled = !settings.musicEnabled;
    await updateSettings({ musicEnabled: nextEnabled });

    if (!nextEnabled) {
      await stopMusic();
      return nextEnabled;
    }

    if (currentTrackRef.current) {
      await playMusic(currentTrackRef.current);
    } else {
      await playMusic('default');
    }

    return nextEnabled;
  };

  return (
    <AppContext.Provider
      value={{
        categories,
        currentMusic,
        currentTheme,
        isMusicPlaying,
        settings,
        themeOptions: Object.values(THEMES),
        playMusic,
        refreshCategories,
        stopMusic,
        toggleMusic,
        updateSettings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
