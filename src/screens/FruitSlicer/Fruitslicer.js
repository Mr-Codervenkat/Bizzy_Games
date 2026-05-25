import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ── Storage fallback ──────────────────────────────────────────────────────────
let Storage = null;
try {
  Storage = require('@react-native-async-storage/async-storage').default;
} catch {
  const mem = {};
  Storage = { getItem: async (k) => mem[k] ?? null, setItem: async (k, v) => { mem[k] = v; } };
}

const { width: SW, height: SH } = Dimensions.get('window');

// ── Fruit catalogue ───────────────────────────────────────────────────────────
const FRUITS = [
  { id: 'watermelon', emoji: '🍉', color: '#ff4757', juice: '#ff6b81', points: 1 },
  { id: 'orange',     emoji: '🍊', color: '#ff6348', juice: '#ffa502', points: 1 },
  { id: 'apple',      emoji: '🍎', color: '#ff4757', juice: '#ff6b81', points: 1 },
  { id: 'lemon',      emoji: '🍋', color: '#ffd32a', juice: '#ffdd59', points: 2 },
  { id: 'grape',      emoji: '🍇', color: '#9c59b6', juice: '#be90d4', points: 2 },
  { id: 'strawberry', emoji: '🍓', color: '#ff4757', juice: '#ff6b81', points: 2 },
  { id: 'peach',      emoji: '🍑', color: '#ff7f50', juice: '#ffb347', points: 1 },
  { id: 'pineapple',  emoji: '🍍', color: '#ffd32a', juice: '#ffdd59', points: 3 },
  { id: 'cherry',     emoji: '🍒', color: '#c0392b', juice: '#e74c3c', points: 3 },
  { id: 'kiwi',       emoji: '🥝', color: '#6ab04c', juice: '#badc58', points: 2 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
let _id = 0;
const uid = () => ++_id;
const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const dist = (ax, ay, bx, by) => Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);

// ── Slice trail segment ───────────────────────────────────────────────────────
function SliceTrail({ points }) {
  if (points.length < 2) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {points.map((pt, i) => {
        if (i === 0) return null;
        const prev = points[i - 1];
        const dx = pt.x - prev.x;
        const dy = pt.y - prev.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const alpha = (i / points.length) * 0.85;
        const thickness = (i / points.length) * 5 + 1;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: prev.x,
              top: prev.y - thickness / 2,
              width: length,
              height: thickness,
              backgroundColor: `rgba(255,255,255,${alpha})`,
              borderRadius: thickness,
              transform: [{ rotate: `${angle}deg` }, { translateX: 0 }],
              transformOrigin: '0 50%',
            }}
          />
        );
      })}
    </View>
  );
}

// ── Juice particle ────────────────────────────────────────────────────────────
function JuiceParticle({ x, y, color, onDone }) {
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(1)).current;
  const sc = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(40, 110);
    Animated.parallel([
      Animated.timing(tx, { toValue: Math.cos(angle) * speed, duration: 500, useNativeDriver: true }),
      Animated.timing(ty, { toValue: Math.sin(angle) * speed + 60, duration: 500, useNativeDriver: true }),
      Animated.timing(op, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(sc, { toValue: 0.2, duration: 500, useNativeDriver: true }),
    ]).start(onDone);
  }, []);

  const size = rand(6, 14);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size, height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: op,
        transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }],
      }}
      pointerEvents="none"
    />
  );
}

// ── Half-fruit (slice animation) ──────────────────────────────────────────────
function FruitHalf({ emoji, x, y, color, side, onDone }) {
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(1)).current;
  const rot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const dir = side === 'left' ? -1 : 1;
    Animated.parallel([
      Animated.timing(tx, { toValue: dir * rand(50, 100), duration: 600, useNativeDriver: true }),
      Animated.timing(ty, { toValue: rand(80, 180), duration: 600, useNativeDriver: true }),
      Animated.timing(op, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(rot, { toValue: dir * rand(80, 160), duration: 600, useNativeDriver: true }),
    ]).start(onDone);
  }, []);

  const spin = rot.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x - 24,
        top: y - 24,
        width: 48, height: 24,
        backgroundColor: color + 'cc',
        borderRadius: side === 'left' ? '24px 0 0 24px' : '0 24px 24px 0',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        opacity: op,
        transform: [{ translateX: tx }, { translateY: ty }, { rotate: spin }],
      }}
      pointerEvents="none"
    >
      <Text style={{ fontSize: 20, opacity: 0.6 }}>{emoji}</Text>
    </Animated.View>
  );
}

// ── Score popup ───────────────────────────────────────────────────────────────
function ScorePopup({ x, y, value, color, onDone }) {
  const ty = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(1)).current;
  const sc = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(ty, { toValue: -70, duration: 800, useNativeDriver: true }),
      Animated.timing(op, { toValue: 0, duration: 800, useNativeDriver: true }),
      Animated.spring(sc, { toValue: 1.2, friction: 4, useNativeDriver: true }),
    ]).start(onDone);
  }, []);

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        left: x - 30,
        top: y - 20,
        color,
        fontSize: value > 5 ? 28 : 22,
        fontWeight: '900',
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowRadius: 4,
        opacity: op,
        transform: [{ translateY: ty }, { scale: sc }],
        width: 80, textAlign: 'center',
      }}
      pointerEvents="none"
    >
      +{value}
    </Animated.Text>
  );
}

// ── Bomb flash overlay ────────────────────────────────────────────────────────
function BombFlash({ onDone }) {
  const op = useRef(new Animated.Value(0.85)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(op, { toValue: 0.6, duration: 80, useNativeDriver: true }),
      Animated.timing(op, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.timing(op, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(onDone);
  }, []);
  return (
    <Animated.View
      style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#ff0000', opacity: op }}
      pointerEvents="none"
    />
  );
}

// ── Lives display ─────────────────────────────────────────────────────────────
function Lives({ count }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[0, 1, 2].map((i) => (
        <Text key={i} style={{ fontSize: 20, opacity: i < count ? 1 : 0.2 }}>❤️</Text>
      ))}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Main Game Component ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function FruitSlicer({ navigation }) {
  // Game loop state in refs
  const itemsRef = useRef([]);       // active fruits/bombs on screen
  const rafRef = useRef(null);
  const runningRef = useRef(false);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const comboRef = useRef(0);
  const comboTimerRef = useRef(null);
  const spawnTimerRef = useRef(null);
  const difficultyRef = useRef(0);   // increases over time
  const diffTimerRef = useRef(null);
  const slicePointsRef = useRef([]);
  const lastFrameRef = useRef(0);

  // React display state
  const [displayItems, setDisplayItems] = useState([]);
  const [particles, setParticles] = useState([]);   // juice + halves + popups
  const [trailPoints, setTrailPoints] = useState([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState('idle'); // idle | running | over
  const [showBombFlash, setShowBombFlash] = useState(false);
  const [combo, setCombo] = useState(0);

  // Load high score
  useEffect(() => {
    Storage.getItem('fruit_highscore').then((v) => { if (v) setHighScore(parseInt(v)); }).catch(() => {});
  }, []);

  // ── Spawn a fruit or bomb ──────────────────────────────────────────────────
  const spawnItem = useCallback(() => {
    if (!runningRef.current) return;
    const diff = difficultyRef.current;
    const bombChance = Math.min(0.18 + diff * 0.015, 0.35);
    const isBomb = Math.random() < bombChance;

    // How many to spawn at once
    const batchSize = diff > 5 ? randInt(1, 3) : diff > 2 ? randInt(1, 2) : 1;

    for (let b = 0; b < batchSize; b++) {
      const x = rand(60, SW - 60);
      const speedMult = 1 + diff * 0.06;
      const vy = -rand(14, 22) * speedMult;   // upward velocity (pixels/frame at 60fps)
      const vx = rand(-3, 3);
      const fruit = isBomb && b === 0
        ? { id: uid(), type: 'bomb', emoji: '💣', color: '#2c2c2c', juice: '#555', points: 0, x, y: SH + 60, vy, vx, size: 56, sliced: false, missed: false }
        : { ...FRUITS[randInt(0, FRUITS.length - 1)], id: uid(), type: 'fruit', x, y: SH + 60, vy, vx, size: 52 + randInt(0, 14), sliced: false, missed: false };

      itemsRef.current.push(fruit);
    }

    // Schedule next spawn
    const interval = Math.max(600, 1400 - diff * 70);
    spawnTimerRef.current = setTimeout(spawnItem, interval + rand(-150, 150));
  }, []);

  // ── Game loop (RAF) ────────────────────────────────────────────────────────
  const gameLoop = useCallback((ts) => {
    if (!runningRef.current) return;
    const dt = ts - lastFrameRef.current;
    lastFrameRef.current = ts;

    const gravity = 0.45;
    let missedFruit = false;

    itemsRef.current = itemsRef.current
      .map((item) => {
        if (item.sliced) return item;
        const newVy = item.vy + gravity;
        const newY = item.y + newVy;
        const newX = item.x + item.vx;

        // Missed — fell off bottom
        if (newY > SH + 80 && !item.sliced) {
          if (item.type === 'fruit') missedFruit = true;
          return { ...item, missed: true };
        }
        return { ...item, vy: newVy, y: newY, x: newX };
      })
      .filter((item) => !item.missed || item.sliced);

    if (missedFruit) {
      livesRef.current -= 1;
      setLives(livesRef.current);
      if (livesRef.current <= 0) { triggerGameOver(); return; }
    }

    setDisplayItems([...itemsRef.current]);
    rafRef.current = requestAnimationFrame(gameLoop);
  }, []);

  // ── Slice detection ────────────────────────────────────────────────────────
  const checkSlice = useCallback((x1, y1, x2, y2) => {
    if (!runningRef.current) return;
    let slicedThisSwipe = 0;

    itemsRef.current = itemsRef.current.map((item) => {
      if (item.sliced) return item;

      // Check if line segment passes through item circle
      const cx = item.x, cy = item.y, r = item.size / 2 + 8;
      const dx = x2 - x1, dy = y2 - y1;
      const fx = x1 - cx, fy = y1 - cy;
      const a = dx * dx + dy * dy;
      if (a < 1) return item;
      const b = 2 * (fx * dx + fy * dy);
      const c = fx * fx + fy * fy - r * r;
      const disc = b * b - 4 * a * c;
      if (disc < 0) return item;
      const t1 = (-b - Math.sqrt(disc)) / (2 * a);
      const t2 = (-b + Math.sqrt(disc)) / (2 * a);
      if ((t1 < 0 || t1 > 1) && (t2 < 0 || t2 > 1)) return item;

      // Hit!
      if (item.type === 'bomb') {
        triggerBombHit(item.x, item.y);
        return { ...item, sliced: true };
      }

      // Fruit sliced
      slicedThisSwipe++;
      spawnEffects(item);

      // Combo
      comboRef.current++;
      clearTimeout(comboTimerRef.current);
      comboTimerRef.current = setTimeout(() => { comboRef.current = 0; setCombo(0); }, 600);

      const comboBonus = comboRef.current > 1 ? comboRef.current : 0;
      const pts = item.points + comboBonus;
      scoreRef.current += pts;
      setScore(scoreRef.current);
      setCombo(comboRef.current);

      // Score popup
      setParticles((p) => [
        ...p,
        { kind: 'popup', id: uid(), x: item.x, y: item.y, value: pts, color: comboBonus > 0 ? '#ffd700' : '#fff' },
      ]);

      return { ...item, sliced: true };
    });
    itemsRef.current = itemsRef.current.filter((i) => !i.sliced || i.type === 'bomb');
  }, []);

  const spawnEffects = (item) => {
    const newPs = [];
    // Juice particles
    for (let i = 0; i < 8; i++) {
      newPs.push({ kind: 'juice', id: uid(), x: item.x, y: item.y, color: item.juice || item.color });
    }
    // Two halves
    newPs.push({ kind: 'half', id: uid(), emoji: item.emoji, x: item.x, y: item.y, color: item.color, side: 'left' });
    newPs.push({ kind: 'half', id: uid(), emoji: item.emoji, x: item.x, y: item.y, color: item.color, side: 'right' });
    setParticles((p) => [...p, ...newPs]);
  };

  const triggerBombHit = (x, y) => {
    runningRef.current = false;
    setShowBombFlash(true);
    // Bomb juice-like red particles
    const newPs = [];
    for (let i = 0; i < 14; i++) {
      newPs.push({ kind: 'juice', id: uid(), x, y, color: '#ff4444' });
    }
    setParticles((p) => [...p, ...newPs]);
    setTimeout(() => triggerGameOver(), 400);
  };

  const triggerGameOver = useCallback(() => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    clearTimeout(spawnTimerRef.current);
    clearTimeout(diffTimerRef.current);
    const finalScore = scoreRef.current;
    setHighScore((prev) => {
      const best = Math.max(prev, finalScore);
      Storage.setItem('fruit_highscore', String(best)).catch(() => {});
      return best;
    });
    setGameState('over');
  }, []);

  // ── Start game ─────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    itemsRef.current = [];
    scoreRef.current = 0;
    livesRef.current = 3;
    comboRef.current = 0;
    difficultyRef.current = 0;
    setScore(0);
    setLives(3);
    setCombo(0);
    setDisplayItems([]);
    setParticles([]);
    setTrailPoints([]);
    setShowBombFlash(false);
    runningRef.current = true;
    setGameState('running');

    lastFrameRef.current = performance.now();
    rafRef.current = requestAnimationFrame(gameLoop);

    // Start spawning
    spawnTimerRef.current = setTimeout(spawnItem, 800);

    // Increase difficulty every 12s
    const incDiff = () => {
      difficultyRef.current++;
      diffTimerRef.current = setTimeout(incDiff, 12000);
    };
    diffTimerRef.current = setTimeout(incDiff, 12000);
  }, [gameLoop, spawnItem]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    clearTimeout(spawnTimerRef.current);
    clearTimeout(diffTimerRef.current);
    clearTimeout(comboTimerRef.current);
  }, []);

  // ── Swipe / slice pan responder ────────────────────────────────────────────
  const trailRef = useRef([]);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent;
        trailRef.current = [{ x, y }];
        setTrailPoints([{ x, y }]);
      },
      onPanResponderMove: (e) => {
        if (!runningRef.current) return;
        const { locationX: x, locationY: y } = e.nativeEvent;
        const trail = trailRef.current;
        const prev = trail[trail.length - 1];
        if (prev && dist(prev.x, prev.y, x, y) > 4) {
          checkSlice(prev.x, prev.y, x, y);
          trail.push({ x, y });
          if (trail.length > 18) trail.shift();
          trailRef.current = trail;
          setTrailPoints([...trail]);
        }
      },
      onPanResponderRelease: () => {
        trailRef.current = [];
        setTimeout(() => setTrailPoints([]), 120);
      },
    })
  ).current;

  const removeParticle = (id) => setParticles((p) => p.filter((x) => x.id !== id));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={st.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0a0015', '#1a0030', '#0d001a']} style={StyleSheet.absoluteFill} />

      {/* Decorative bg circles */}
      <View style={[st.bgOrb, { width: 300, height: 300, left: -80, top: -60, backgroundColor: '#3d0080' }]} />
      <View style={[st.bgOrb, { width: 200, height: 200, right: -50, top: 200, backgroundColor: '#002060' }]} />

      {/* ── Header ── */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => { runningRef.current = false; cancelAnimationFrame(rafRef.current); navigation?.goBack?.(); }} style={st.backBtn}>
          <Text style={st.backTxt}>‹</Text>
        </TouchableOpacity>
        <View style={st.scoreArea}>
          <View style={st.scoreBox}>
            <Text style={st.scoreLabel}>BEST</Text>
            <Text style={[st.scoreNum, { color: '#ffd700', fontSize: 18 }]}>{highScore}</Text>
          </View>
          <View style={st.scoreDivider} />
          <View style={st.scoreBox}>
            <Text style={st.scoreLabel}>SCORE</Text>
            <Text style={[st.scoreNum, { color: '#ff6ec7' }]}>{score}</Text>
          </View>
        </View>
        <Lives count={lives} />
      </View>

      {/* Combo banner */}
      {combo > 1 && gameState === 'running' && (
        <View style={st.comboBanner}>
          <Text style={st.comboTxt}>🔥 COMBO x{combo}</Text>
        </View>
      )}

      {/* ── Game area ── */}
      <View style={st.gameArea} {...panResponder.panHandlers}>
        {/* Fruits & Bombs */}
        {displayItems.map((item) => (
          <View
            key={item.id}
            style={{
              position: 'absolute',
              left: item.x - item.size / 2,
              top: item.y - item.size / 2,
              width: item.size, height: item.size,
              alignItems: 'center', justifyContent: 'center',
            }}
            pointerEvents="none"
          >
            {/* Glow shadow */}
            <View style={{
              position: 'absolute',
              width: item.size * 0.8, height: item.size * 0.8,
              borderRadius: item.size,
              backgroundColor: item.type === 'bomb' ? '#ff000044' : item.color + '44',
              shadowColor: item.type === 'bomb' ? '#ff0000' : item.color,
              shadowOpacity: 0.9,
              shadowRadius: 12,
              elevation: 8,
            }} />
            <Text style={{ fontSize: item.size * 0.72 }}>{item.emoji}</Text>
          </View>
        ))}

        {/* Particles */}
        {particles.map((p) => {
          if (p.kind === 'juice') return (
            <JuiceParticle key={p.id} x={p.x} y={p.y} color={p.color} onDone={() => removeParticle(p.id)} />
          );
          if (p.kind === 'half') return (
            <FruitHalf key={p.id} emoji={p.emoji} x={p.x} y={p.y} color={p.color} side={p.side} onDone={() => removeParticle(p.id)} />
          );
          if (p.kind === 'popup') return (
            <ScorePopup key={p.id} x={p.x} y={p.y} value={p.value} color={p.color} onDone={() => removeParticle(p.id)} />
          );
          return null;
        })}

        {/* Slice trail */}
        <SliceTrail points={trailPoints} />

        {/* Bomb flash */}
        {showBombFlash && <BombFlash onDone={() => setShowBombFlash(false)} />}

        {/* ── Idle overlay ── */}
        {gameState === 'idle' && (
          <View style={st.overlay}>
            <Text style={st.overlayEmojis}>🍉🍊🍋🍇🍓</Text>
            <Text style={st.overlayTitle}>FRUIT{'\n'}SLICER</Text>
            <Text style={st.overlaySub}>Slice fruits, dodge bombs!</Text>
            <View style={st.tipRow}>
              <Text style={st.tip}>🍑 Fruits = points</Text>
              <Text style={st.tip}>💣 Bomb = game over</Text>
              <Text style={st.tip}>❤️ Miss 3 = game over</Text>
              <Text style={st.tip}>🔥 Combos = bonus pts</Text>
            </View>
            <TouchableOpacity style={st.startBtn} onPress={startGame}>
              <LinearGradient colors={['#ff6ec7', '#ff3b8e']} style={st.startBtnGrad}>
                <Text style={st.startTxt}>PLAY NOW</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Game over overlay ── */}
        {gameState === 'over' && (
          <View style={st.overlay}>
            <Text style={st.gameOverTitle}>GAME{'\n'}OVER</Text>
            <Text style={[st.overlaySub, { fontSize: 16 }]}>
              Score: <Text style={{ color: '#ff6ec7', fontWeight: '900' }}>{score}</Text>
            </Text>
            {score >= highScore && score > 0 && (
              <Text style={st.newBest}>🏆 NEW BEST!</Text>
            )}
            <Text style={[st.overlaySub, { color: '#ffd700', fontSize: 13 }]}>
              Best: {highScore}
            </Text>
            <TouchableOpacity style={st.startBtn} onPress={startGame}>
              <LinearGradient colors={['#ff6ec7', '#ff3b8e']} style={st.startBtnGrad}>
                <Text style={st.startTxt}>PLAY AGAIN</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={st.menuBtn} onPress={() => navigation?.goBack?.()}>
              <Text style={st.menuTxt}>Main Menu</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0015' },
  bgOrb: { position: 'absolute', borderRadius: 999, opacity: 0.35 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 10,
    zIndex: 10,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backTxt: { color: '#ff6ec7', fontSize: 32, fontWeight: '300', lineHeight: 36 },
  scoreArea: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoreBox: { alignItems: 'center' },
  scoreDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,110,199,0.3)', borderRadius: 1 },
  scoreLabel: { color: '#ffffff55', fontSize: 9, fontWeight: '800', letterSpacing: 3 },
  scoreNum: { fontSize: 22, fontWeight: '900', lineHeight: 26 },

  comboBanner: {
    position: 'absolute', top: 108, alignSelf: 'center',
    backgroundColor: '#ff3b8e33', borderColor: '#ff6ec7', borderWidth: 1,
    paddingHorizontal: 18, paddingVertical: 5, borderRadius: 20, zIndex: 20,
  },
  comboTxt: { color: '#ff6ec7', fontWeight: '900', fontSize: 16, letterSpacing: 1 },

  gameArea: { flex: 1, position: 'relative' },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(10,0,21,0.88)', gap: 12,
  },
  overlayEmojis: { fontSize: 30, letterSpacing: 4 },
  overlayTitle: {
    color: '#fff', fontSize: 52, fontWeight: '900', textAlign: 'center',
    lineHeight: 54, letterSpacing: 4,
    textShadowColor: '#ff6ec7', textShadowRadius: 20,
  },
  gameOverTitle: {
    color: '#ff4444', fontSize: 52, fontWeight: '900', textAlign: 'center',
    lineHeight: 54, letterSpacing: 4,
    textShadowColor: '#ff0000', textShadowRadius: 20,
  },
  overlaySub: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  newBest: { color: '#ffd700', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  tipRow: { gap: 6, marginVertical: 6, alignItems: 'flex-start' },
  tip: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },

  startBtn: { marginTop: 10, borderRadius: 30, overflow: 'hidden', elevation: 8, shadowColor: '#ff3b8e', shadowOpacity: 0.7, shadowRadius: 16 },
  startBtnGrad: { paddingHorizontal: 50, paddingVertical: 15 },
  startTxt: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 3 },

  menuBtn: { marginTop: 4, padding: 10 },
  menuTxt: { color: '#ff6ec7', fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
});