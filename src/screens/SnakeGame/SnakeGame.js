import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  PanResponder,
  StatusBar,
  Animated,
  AsyncStorage,
} from 'react-native';

// ─── AsyncStorage safe import (Expo) ────────────────────────────────────────
// If using Expo, AsyncStorage is from '@react-native-async-storage/async-storage'
// We'll use a try/catch fallback with a simple in-memory store if unavailable
let Storage = null;
try {
  Storage = require('@react-native-async-storage/async-storage').default;
} catch {
  const mem = {};
  Storage = {
    getItem: async (k) => mem[k] ?? null,
    setItem: async (k, v) => { mem[k] = v; },
  };
}

// ─── Level configs ────────────────────────────────────────────────────────────
const LEVELS = {
  easy:   { label: 'EASY',   emoji: '🟢', initialSpeed: 200, minSpeed: 100, speedStep: 3,  color: '#4ade80', glow: '#4ade80', scoreMultiplier: 1 },
  medium: { label: 'MEDIUM', emoji: '🟡', initialSpeed: 140, minSpeed: 65,  speedStep: 6,  color: '#facc15', glow: '#facc15', scoreMultiplier: 2 },
  hard:   { label: 'HARD',   emoji: '🔴', initialSpeed: 85,  minSpeed: 35,  speedStep: 10, color: '#f87171', glow: '#f87171', scoreMultiplier: 3 },
};

// ─── Constants ───────────────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
const COLS = 20;
const ROWS = 28;
const CELL = Math.floor((SCREEN_W - 24) / COLS);
const BW = CELL * COLS;
const BH = CELL * ROWS;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const rand = (n) => Math.floor(Math.random() * n);
const newFood = (snake) => {
  const set = new Set(snake.map((p) => `${p.x},${p.y}`));
  let pos;
  do { pos = { x: rand(COLS), y: rand(ROWS) }; }
  while (set.has(`${pos.x},${pos.y}`));
  return pos;
};

const INIT_SNAKE = [{ x: 10, y: 14 }, { x: 9, y: 14 }, { x: 8, y: 14 }];

// ─── Pure RN Snake Renderer (no Skia) ────────────────────────────────────────
const SnakeRenderer = React.memo(({ snake, food, foodPulse, levelColor }) => {
  const gap = 2;
  const headDir = snake.length > 1
    ? { x: snake[0].x - snake[1].x, y: snake[0].y - snake[1].y }
    : { x: 1, y: 0 };

  return (
    <View style={{ width: BW, height: BH, position: 'relative' }}>
      {/* Grid lines */}
      {Array.from({ length: COLS + 1 }).map((_, i) => (
        <View key={`v${i}`} style={{ position: 'absolute', left: i * CELL, top: 0, width: 0.5, height: BH, backgroundColor: 'rgba(255,255,255,0.04)' }} />
      ))}
      {Array.from({ length: ROWS + 1 }).map((_, i) => (
        <View key={`h${i}`} style={{ position: 'absolute', left: 0, top: i * CELL, width: BW, height: 0.5, backgroundColor: 'rgba(255,255,255,0.04)' }} />
      ))}

      {/* Snake segments */}
      {snake.map((seg, idx) => {
        const isHead = idx === 0;
        const isTail = idx === snake.length - 1;
        const opacity = Math.max(0.45, 1 - idx * 0.025);
        const size = isHead ? CELL - gap : isTail ? CELL - gap * 3 : CELL - gap;
        const offset = isHead ? gap / 2 : isTail ? gap * 1.5 : gap / 2;

        // Connection bridge to next segment
        const next = snake[idx + 1];
        const bridgeEl = next ? (() => {
          const isHoriz = seg.y === next.y;
          const bw = isHoriz ? CELL : CELL - gap * 2;
          const bh = isHoriz ? CELL - gap * 2 : CELL;
          const bx = isHoriz ? Math.min(seg.x, next.x) * CELL + (seg.x < next.x ? CELL / 2 : 0) : seg.x * CELL + gap;
          const by = isHoriz ? seg.y * CELL + gap : Math.min(seg.y, next.y) * CELL + (seg.y < next.y ? CELL / 2 : 0);
          return (
            <View key={`br${idx}`} style={{
              position: 'absolute',
              left: bx, top: by, width: bw, height: bh,
              backgroundColor: levelColor,
              opacity: opacity * 0.8,
            }} />
          );
        })() : null;

        return (
          <React.Fragment key={`sg${idx}`}>
            {bridgeEl}
            <View style={{
              position: 'absolute',
              left: seg.x * CELL + offset,
              top: seg.y * CELL + offset,
              width: size, height: size,
              borderRadius: size / 2,
              backgroundColor: isHead ? '#fff' : levelColor,
              opacity,
              // Head gets a subtle border
              ...(isHead ? { borderWidth: 2, borderColor: levelColor } : {}),
            }} />
            {/* Eyes on head */}
            {isHead && (() => {
              const hw = CELL;
              const hx = seg.x * CELL;
              const hy = seg.y * CELL;
              const eyeSize = CELL * 0.18;
              const eyeOffset = CELL * 0.25;
              const fwdX = headDir.x * CELL * 0.12;
              const fwdY = headDir.y * CELL * 0.12;
              const perpX = -headDir.y * eyeOffset;
              const perpY = headDir.x * eyeOffset;
              const e1x = hx + hw / 2 + fwdX + perpX - eyeSize / 2;
              const e1y = hy + hw / 2 + fwdY + perpY - eyeSize / 2;
              const e2x = hx + hw / 2 + fwdX - perpX - eyeSize / 2;
              const e2y = hy + hw / 2 + fwdY - perpY - eyeSize / 2;
              return (
                <>
                  <View style={{ position: 'absolute', left: e1x, top: e1y, width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: '#0a1628' }} />
                  <View style={{ position: 'absolute', left: e2x, top: e2y, width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: '#0a1628' }} />
                </>
              );
            })()}
          </React.Fragment>
        );
      })}

      {/* Food */}
      {food && (
        <Animated.View style={{
          position: 'absolute',
          left: food.x * CELL + CELL / 2 - (CELL * 0.35 * foodPulse),
          top: food.y * CELL + CELL / 2 - (CELL * 0.35 * foodPulse),
          width: CELL * 0.7 * foodPulse,
          height: CELL * 0.7 * foodPulse,
          borderRadius: CELL * 0.35 * foodPulse,
          backgroundColor: '#ff3b30',
          shadowColor: '#ff3b30',
          shadowOpacity: 0.9,
          shadowRadius: 8,
          elevation: 8,
        }}>
          {/* Shine dot */}
          <View style={{
            position: 'absolute', left: '20%', top: '15%',
            width: '25%', height: '25%',
            borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.65)',
          }} />
        </Animated.View>
      )}
    </View>
  );
});

// ─── Level Selector ───────────────────────────────────────────────────────────
function LevelSelector({ selected, onSelect, highScores }) {
  return (
    <View style={ls.wrap}>
      <Text style={ls.title}>SELECT LEVEL</Text>
      <View style={ls.row}>
        {Object.entries(LEVELS).map(([key, cfg]) => {
          const isActive = selected === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => onSelect(key)}
              style={[ls.btn, isActive && { borderColor: cfg.color, backgroundColor: `${cfg.color}22` }]}
              activeOpacity={0.7}
            >
              <Text style={ls.emoji}>{cfg.emoji}</Text>
              <Text style={[ls.label, { color: isActive ? cfg.color : '#64748b' }]}>{cfg.label}</Text>
              <Text style={[ls.mult, { color: isActive ? cfg.color : '#334155' }]}>×{cfg.scoreMultiplier}</Text>
              {highScores[key] > 0 && (
                <Text style={[ls.hs, { color: isActive ? cfg.color : '#475569' }]}>
                  BEST {highScores[key]}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const ls = StyleSheet.create({
  wrap: { width: '100%', paddingHorizontal: 12, marginBottom: 10 },
  title: { color: '#475569', fontSize: 10, fontWeight: '800', letterSpacing: 3, textAlign: 'center', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  btn: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#1e293b', backgroundColor: '#0d1b2e',
  },
  emoji: { fontSize: 18, marginBottom: 2 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  mult: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  hs: { fontSize: 9, fontWeight: '700', marginTop: 3, letterSpacing: 1 },
});

// ─── Main Component ──────────────────────────────────────────────────────────
export default function SnakeGame({ navigation }) {
  const [selectedLevel, setSelectedLevel] = useState('easy');
  const [gameState, setGameState] = useState('idle'); // idle | running | over
  const [score, setScore] = useState(0);
  const [highScores, setHighScores] = useState({ easy: 0, medium: 0, hard: 0 });
  const [displaySnake, setDisplaySnake] = useState([...INIT_SNAKE]);
  const [displayFood, setDisplayFood] = useState(newFood(INIT_SNAKE));
  const [pulseVal, setPulseVal] = useState(1);

  // Game loop refs
  const snakeRef = useRef([...INIT_SNAKE]);
  const dirRef = useRef({ x: 1, y: 0 });
  const pendingDir = useRef({ x: 1, y: 0 });
  const foodRef = useRef(newFood(INIT_SNAKE));
  const scoreRef = useRef(0);
  const runningRef = useRef(false);
  const timerRef = useRef(null);
  const levelRef = useRef('easy');

  // Food pulse animation
  const foodAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(foodAnim, { toValue: 1.18, duration: 400, useNativeDriver: false }),
        Animated.timing(foodAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
      ])
    );
    loop.start();
    const id = foodAnim.addListener(({ value }) => setPulseVal(value));
    return () => { loop.stop(); foodAnim.removeListener(id); };
  }, []);

  // Load high scores
  useEffect(() => {
    (async () => {
      try {
        const raw = await Storage.getItem('snake_highscores');
        if (raw) setHighScores(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  const saveHighScore = useCallback(async (level, s) => {
    setHighScores((prev) => {
      if (s > (prev[level] || 0)) {
        const next = { ...prev, [level]: s };
        Storage.setItem('snake_highscores', JSON.stringify(next)).catch(() => {});
        return next;
      }
      return prev;
    });
  }, []);

  // ── Game tick ──
  const tick = useCallback(() => {
    if (!runningRef.current) return;

    const pd = pendingDir.current;
    const cd = dirRef.current;
    if (!(pd.x === -cd.x && pd.y === -cd.y)) dirRef.current = { ...pd };

    const snake = snakeRef.current;
    const dir = dirRef.current;
    const head = snake[0];
    const nx = head.x + dir.x;
    const ny = head.y + dir.y;

    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) { endGame(); return; }
    if (snake.some((p) => p.x === nx && p.y === ny)) { endGame(); return; }

    const newHead = { x: nx, y: ny };
    const food = foodRef.current;
    const ate = nx === food.x && ny === food.y;

    const next = [newHead, ...snake];
    if (!ate) next.pop();
    snakeRef.current = next;

    if (ate) {
      const cfg = LEVELS[levelRef.current];
      scoreRef.current += cfg.scoreMultiplier;
      foodRef.current = newFood(next);
      setScore(scoreRef.current);
      setDisplayFood({ ...foodRef.current });

      const rawStep = Math.floor(scoreRef.current / cfg.scoreMultiplier);
      const delay = Math.max(cfg.minSpeed, cfg.initialSpeed - rawStep * cfg.speedStep);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(tick, delay);
    }

    setDisplaySnake([...next]);
  }, []);

  const startGame = useCallback(() => {
    const initSnake = [{ x: 10, y: 14 }, { x: 9, y: 14 }, { x: 8, y: 14 }];
    levelRef.current = selectedLevel;
    snakeRef.current = initSnake;
    dirRef.current = { x: 1, y: 0 };
    pendingDir.current = { x: 1, y: 0 };
    foodRef.current = newFood(initSnake);
    scoreRef.current = 0;
    setScore(0);
    setDisplaySnake([...initSnake]);
    setDisplayFood({ ...foodRef.current });
    setGameState('running');
    runningRef.current = true;

    clearInterval(timerRef.current);
    timerRef.current = setInterval(tick, LEVELS[selectedLevel].initialSpeed);
  }, [selectedLevel, tick]);

  const endGame = useCallback(() => {
    runningRef.current = false;
    clearInterval(timerRef.current);
    saveHighScore(levelRef.current, scoreRef.current);
    setGameState('over');
  }, [saveHighScore]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  // ── Swipe ──
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, { dx, dy }) => {
        if (Math.abs(dx) > Math.abs(dy))
          pendingDir.current = dx > 15 ? { x: 1, y: 0 } : { x: -1, y: 0 };
        else
          pendingDir.current = dy > 15 ? { x: 0, y: 1 } : { x: 0, y: -1 };
      },
    })
  ).current;

  const changeDir = (x, y) => { pendingDir.current = { x, y }; };

  const levelCfg = LEVELS[gameState === 'running' ? levelRef.current : selectedLevel];
  const currentHS = highScores[gameState === 'running' ? levelRef.current : selectedLevel] || 0;

  // ─── UI ────────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => { endGame(); navigation?.goBack?.(); }} style={s.backBtn}>
          <Text style={s.backTxt}>‹ Back</Text>
        </TouchableOpacity>

        {/* Score + High Score */}
        <View style={s.scoreRow}>
          <View style={s.scoreBox}>
            <Text style={s.scoreLabel}>BEST</Text>
            <Text style={[s.scoreNum, { color: '#facc15', fontSize: 20 }]}>{currentHS}</Text>
          </View>
          <View style={[s.scoreDivider, { backgroundColor: levelCfg.color + '55' }]} />
          <View style={s.scoreBox}>
            <Text style={s.scoreLabel}>SCORE</Text>
            <Text style={[s.scoreNum, { color: levelCfg.color }]}>{score}</Text>
          </View>
        </View>
      </View>

      {/* Level selector — only when idle or over */}
      {gameState !== 'running' && (
        <LevelSelector
          selected={selectedLevel}
          onSelect={(lvl) => { if (gameState !== 'running') setSelectedLevel(lvl); }}
          highScores={highScores}
        />
      )}

      {/* Board */}
      <View style={[s.boardWrap, { width: BW + 4, height: BH + 4, borderColor: levelCfg.color, shadowColor: levelCfg.glow }]}>
        <View
          style={[s.board, { width: BW, height: BH }]}
          {...panResponder.panHandlers}
        >
          <SnakeRenderer
            snake={displaySnake}
            food={displayFood}
            foodPulse={pulseVal}
            levelColor={levelCfg.color}
          />

          {/* Idle overlay */}
          {gameState === 'idle' && (
            <View style={s.overlay}>
              <Text style={[s.overlayTitle, { color: levelCfg.color, textShadowColor: levelCfg.glow }]}>
                🐍 SNAKE
              </Text>
              <Text style={s.overlaySub}>Swipe or use D-pad to move</Text>
              <Text style={[s.levelBadge, { backgroundColor: levelCfg.color + '22', borderColor: levelCfg.color, color: levelCfg.color }]}>
                {levelCfg.emoji} {levelCfg.label} · ×{levelCfg.scoreMultiplier} points
              </Text>
              <TouchableOpacity style={[s.playBtn, { backgroundColor: levelCfg.color }]} onPress={startGame}>
                <Text style={s.playTxt}>PLAY</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Game over overlay */}
          {gameState === 'over' && (
            <View style={s.overlay}>
              <Text style={[s.overlayTitle, { color: '#f87171', textShadowColor: '#f87171', fontSize: 30 }]}>
                GAME OVER
              </Text>
              <Text style={s.overlaySub}>Score: <Text style={{ color: levelCfg.color, fontWeight: '800' }}>{score}</Text></Text>
              {score >= currentHS && score > 0 && (
                <Text style={[s.newHsBadge, { color: '#facc15' }]}>🏆 NEW BEST!</Text>
              )}
              <Text style={[s.levelBadge, { backgroundColor: levelCfg.color + '22', borderColor: levelCfg.color, color: levelCfg.color }]}>
                {levelCfg.emoji} {levelCfg.label}
              </Text>
              <TouchableOpacity style={[s.playBtn, { backgroundColor: levelCfg.color, marginTop: 6 }]} onPress={startGame}>
                <Text style={s.playTxt}> 🔄 RESTART</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.changeLvlBtn} onPress={() => setGameState('idle')}>
                <Text style={[s.changeLvlTxt, { color: levelCfg.color }]}>Change Level</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* D-Pad */}
      <View style={s.dpad}>
        <View style={s.drow}>
          <TouchableOpacity style={[s.dBtn, { borderColor: levelCfg.color + '55', backgroundColor: levelCfg.color + '15' }]} onPress={() => changeDir(0, -1)}>
            <Text style={[s.dTxt, { color: levelCfg.color }]}>▲</Text>
          </TouchableOpacity>
        </View>
        <View style={s.drow}>
          <TouchableOpacity style={[s.dBtn, { borderColor: levelCfg.color + '55', backgroundColor: levelCfg.color + '15' }]} onPress={() => changeDir(-1, 0)}>
            <Text style={[s.dTxt, { color: levelCfg.color }]}>◀</Text>
          </TouchableOpacity>
          <View style={s.dCenter} />
          <TouchableOpacity style={[s.dBtn, { borderColor: levelCfg.color + '55', backgroundColor: levelCfg.color + '15' }]} onPress={() => changeDir(1, 0)}>
            <Text style={[s.dTxt, { color: levelCfg.color }]}>▶</Text>
          </TouchableOpacity>
        </View>
        <View style={s.drow}>
          <TouchableOpacity style={[s.dBtn, { borderColor: levelCfg.color + '55', backgroundColor: levelCfg.color + '15' }]} onPress={() => changeDir(0, 1)}>
            <Text style={[s.dTxt, { color: levelCfg.color }]}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', backgroundColor: '#060d1f', paddingTop: 48 },

  header: {
    width: '100%', flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 18, marginBottom: 10,
  },
  backBtn: { padding: 6 },
  backTxt: { color: '#7dd3fc', fontSize: 18, fontWeight: '600' },

  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoreBox: { alignItems: 'center' },
  scoreDivider: { width: 1, height: 30, borderRadius: 1 },
  scoreLabel: { color: '#475569', fontSize: 9, fontWeight: '800', letterSpacing: 3 },
  scoreNum: { fontSize: 26, fontWeight: '900', lineHeight: 30 },

  boardWrap: {
    borderRadius: 12, padding: 2,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.85, shadowRadius: 14,
    elevation: 16, borderWidth: 1.5,
  },
  board: { borderRadius: 10, overflow: 'hidden', backgroundColor: '#07112a' },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6,13,31,0.9)',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  overlayTitle: {
    fontSize: 34, fontWeight: '900', letterSpacing: 4,
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 14,
  },
  overlaySub: { color: '#94a3b8', fontSize: 13 },
  levelBadge: {
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: 2,
  },
  newHsBadge: { fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  playBtn: {
    marginTop: 10, paddingHorizontal: 44, paddingVertical: 13,
    borderRadius: 30,
  },
  playTxt: { color: '#060d1f', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  changeLvlBtn: { marginTop: 4, padding: 8 },
  changeLvlTxt: { fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },

  dpad: { marginTop: 14, alignItems: 'center', gap: 4 },
  drow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dBtn: {
    width: 58, height: 58, borderRadius: 12,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  dTxt: { fontSize: 22 },
  dCenter: { width: 58, height: 58 },
});