import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Animated, Dimensions, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SW, height: SH } = Dimensions.get('window');

// ── Difficulty config ─────────────────────────────────────────────────────────
const DIFFICULTY = {
  easy:   { label: 'EASY',   color: '#4ade80', glow: '#22c55e', depth: 1 },
  medium: { label: 'MEDIUM', color: '#facc15', glow: '#eab308', depth: 3 },
  hard:   { label: 'HARD',   color: '#f87171', glow: '#ef4444', depth: 9 },
};

// ── Minimax AI ────────────────────────────────────────────────────────────────
function checkWinner(board) {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6],
  ];
  for (const [a,b,c] of wins) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a,b,c] };
    }
  }
  if (board.every(Boolean)) return { winner: 'draw', line: [] };
  return null;
}

function minimax(board, isMax, depth, maxDepth, alpha, beta) {
  const result = checkWinner(board);
  if (result) {
    if (result.winner === 'O') return 10 - (maxDepth - depth);
    if (result.winner === 'X') return (maxDepth - depth) - 10;
    return 0;
  }
  if (depth === 0) return 0;

  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'O';
        best = Math.max(best, minimax(board, false, depth - 1, maxDepth, alpha, beta));
        board[i] = null;
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'X';
        best = Math.min(best, minimax(board, true, depth - 1, maxDepth, alpha, beta));
        board[i] = null;
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
    }
    return best;
  }
}

function getBestMove(board, depth) {
  // Easy: sometimes random
  const empty = board.map((v, i) => v ? null : i).filter(i => i !== null);
  if (depth === 1) {
    // 60% random for easy
    if (Math.random() < 0.6) return empty[Math.floor(Math.random() * empty.length)];
  }
  let best = -Infinity, bestIdx = empty[0];
  for (const i of empty) {
    board[i] = 'O';
    const score = minimax(board, false, depth, depth, -Infinity, Infinity);
    board[i] = null;
    if (score > best) { best = score; bestIdx = i; }
  }
  return bestIdx;
}

// ── Floating orb ──────────────────────────────────────────────────────────────
function FloatingOrb({ size, color, startX, startY, duration, delay }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, delay, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration,         useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -25] });
  const opacity    = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.08, 0.18, 0.08] });
  return (
    <Animated.View style={{
      position: 'absolute', left: startX, top: startY,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color, transform: [{ translateY }], opacity,
    }} />
  );
}

// ── Cell component ────────────────────────────────────────────────────────────
function Cell({ value, index, onPress, winLine, disabled }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const prevValue = useRef(null);

  useEffect(() => {
    if (value && value !== prevValue.current) {
      prevValue.current = value;
      scaleAnim.setValue(0);
      Animated.spring(scaleAnim, {
        toValue: 1, friction: 5, tension: 120, useNativeDriver: true,
      }).start();
    }
    if (!value) { scaleAnim.setValue(0); prevValue.current = null; }
  }, [value]);

  const isWin = winLine.includes(index);
  const glowColor = value === 'X' ? '#38bdf8' : '#f472b6';

  return (
    <TouchableOpacity
      onPress={() => onPress(index)}
      disabled={!!value || disabled}
      activeOpacity={0.7}
      style={[cs.cell, isWin && { borderColor: glowColor + 'aa' }]}
    >
      <LinearGradient
        colors={isWin ? [glowColor + '30', glowColor + '15'] : ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)']}
        style={StyleSheet.absoluteFill}
      />
      {value && (
        <Animated.Text style={[
          cs.cellText,
          { color: value === 'X' ? '#38bdf8' : '#f472b6', transform: [{ scale: scaleAnim }] },
          isWin && { textShadowColor: glowColor, textShadowRadius: 16, textShadowOffset: { width: 0, height: 0 } },
        ]}>
          {value}
        </Animated.Text>
      )}
    </TouchableOpacity>
  );
}

const cs = StyleSheet.create({
  cell: {
    width: (SW - 80) / 3,
    height: (SW - 80) / 3,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cellText: {
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: -2,
  },
});

// ── Result Modal ──────────────────────────────────────────────────────────────
function ResultModal({ visible, result, playerX, playerO, onPlayAgain, onMenu, mode }) {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!result) return null;

  const isDraw = result.winner === 'draw';
  const xWon   = result.winner === 'X';
  const oWon   = result.winner === 'O';

  const emoji  = isDraw ? '🤝' : xWon ? '🎉' : '🤖';
  const title  = isDraw ? 'DRAW!' : xWon ? `${playerX} WINS!` : oWon && mode === 'cpu' ? 'CPU WINS!' : `${playerO} WINS!`;
  const color  = isDraw ? '#facc15' : xWon ? '#38bdf8' : '#f472b6';

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={ms.overlay}>
        <Animated.View style={[ms.modal, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
          <LinearGradient
            colors={['#120830', '#1e0f4a', '#130835']}
            style={StyleSheet.absoluteFill}
          />
          <View style={[ms.glowBar, { backgroundColor: color }]} />
          <Text style={ms.emoji}>{emoji}</Text>
          <Text style={[ms.title, { color }]}>{title}</Text>
          <Text style={ms.sub}>{isDraw ? 'Nobody wins this round' : 'Congratulations!'}</Text>

          <TouchableOpacity onPress={onPlayAgain} activeOpacity={0.8} style={[ms.btn, { borderColor: color + '88' }]}>
            <LinearGradient colors={[color + '28', color + '10']} style={ms.btnGrad}>
              <Text style={[ms.btnTxt, { color }]}>▶  PLAY AGAIN</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={onMenu} activeOpacity={0.8} style={ms.menuBtn}>
            <Text style={ms.menuTxt}>← BACK TO MENU</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center' },
  modal: {
    width: SW * 0.82, borderRadius: 28, padding: 28,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', overflow: 'hidden',
    shadowColor: '#7c3aed', shadowOpacity: 0.6, shadowRadius: 30, elevation: 20,
  },
  glowBar: { position: 'absolute', top: 0, left: '20%', right: '20%', height: 2, borderRadius: 2 },
  emoji:   { fontSize: 56, marginTop: 8, marginBottom: 8 },
  title:   { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 6 },
  sub:     { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 28 },
  btn:     { width: '100%', borderRadius: 14, borderWidth: 1.5, overflow: 'hidden', marginBottom: 12 },
  btnGrad: { paddingVertical: 14, alignItems: 'center' },
  btnTxt:  { fontWeight: '800', fontSize: 15, letterSpacing: 2 },
  menuBtn: { paddingVertical: 10 },
  menuTxt: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
});

// ── Main XOX Game Screen ──────────────────────────────────────────────────────
export default function XOXGame({ navigation }) {
  // Game mode: 'select' | 'cpu' | 'two'
  const [screen, setScreen]       = useState('select');
  const [mode, setMode]           = useState(null);          // 'cpu' | 'two'
  const [difficulty, setDifficulty] = useState('medium');
  const [board, setBoard]         = useState(Array(9).fill(null));
  const [turn, setTurn]           = useState('X');           // X always human
  const [result, setResult]       = useState(null);
  const [winLine, setWinLine]     = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [score, setScore]         = useState({ X: 0, O: 0, D: 0 });
  const [thinking, setThinking]   = useState(false);

  // Player names
  const [p1Name] = useState('Player 1');
  const [p2Name] = useState('Player 2');

  // Entrance anim
  const headerOp = useRef(new Animated.Value(0)).current;
  const boardOp  = useRef(new Animated.Value(0)).current;
  const boardY   = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (screen === 'game') {
      Animated.sequence([
        Animated.timing(headerOp, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(boardOp, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(boardY,  { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
      ]).start();
    } else {
      headerOp.setValue(0); boardOp.setValue(0); boardY.setValue(30);
    }
  }, [screen]);

  // CPU move trigger
  useEffect(() => {
    if (screen !== 'game') return;
    if (mode !== 'cpu') return;
    if (turn !== 'O') return;
    if (result) return;

    setThinking(true);
    const timer = setTimeout(() => {
      const copy = [...board];
      const depth = DIFFICULTY[difficulty].depth;
      const move = getBestMove(copy, depth);
      if (move === undefined) return;
      copy[move] = 'O';
      const res = checkWinner(copy);
      setBoard(copy);
      setThinking(false);
      if (res) {
        setResult(res);
        setWinLine(res.line);
        setScore(s => ({
          ...s,
          X: res.winner === 'X' ? s.X + 1 : s.X,
          O: res.winner === 'O' ? s.O + 1 : s.O,
          D: res.winner === 'draw' ? s.D + 1 : s.D,
        }));
        setTimeout(() => setModalVisible(true), 600);
      } else {
        setTurn('X');
      }
    }, 500 + Math.random() * 300);
    return () => clearTimeout(timer);
  }, [turn, board, mode, difficulty, screen, result]);

  const handleCellPress = useCallback((index) => {
    if (board[index] || result || thinking) return;
    if (mode === 'cpu' && turn === 'O') return;

    const copy = [...board];
    copy[index] = turn;
    const res = checkWinner(copy);
    setBoard(copy);

    if (res) {
      setResult(res);
      setWinLine(res.line);
      setScore(s => ({
        ...s,
        X: res.winner === 'X' ? s.X + 1 : s.X,
        O: res.winner === 'O' ? s.O + 1 : s.O,
        D: res.winner === 'draw' ? s.D + 1 : s.D,
      }));
      setTimeout(() => setModalVisible(true), 600);
    } else {
      setTurn(t => t === 'X' ? 'O' : 'X');
    }
  }, [board, result, thinking, turn, mode]);

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setTurn('X');
    setResult(null);
    setWinLine([]);
    setModalVisible(false);
  };

  const goToMenu = () => {
    setModalVisible(false);
    setTimeout(() => {
      setScreen('select');
      setBoard(Array(9).fill(null));
      setTurn('X');
      setResult(null);
      setWinLine([]);
      setScore({ X: 0, O: 0, D: 0 });
    }, 300);
  };

  const startGame = (gameMode) => {
    setMode(gameMode);
    setBoard(Array(9).fill(null));
    setTurn('X');
    setResult(null);
    setWinLine([]);
    setScore({ X: 0, O: 0, D: 0 });
    setScreen('game');
  };

  // ── Select screen ─────────────────────────────────────────────────────────
  if (screen === 'select') {
    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#04040f', '#0a0520', '#130835', '#0c1a3d']}
          locations={[0, 0.3, 0.65, 1]}
          style={StyleSheet.absoluteFill}
        />
        <FloatingOrb size={200} color="#6c3fc4" startX={-60}     startY={80}        duration={3800} delay={0} />
        <FloatingOrb size={140} color="#1a56db" startX={SW - 80} startY={160}       duration={4200} delay={600} />
        <FloatingOrb size={100} color="#e91e8c" startX={SW*0.3}  startY={SH * 0.5}  duration={3400} delay={300} />

        {[...Array(18)].map((_, i) => (
          <View key={i} style={{
            position: 'absolute',
            left: (i * 137.5) % SW, top: (i * 83.7) % SH,
            width: i % 3 === 0 ? 2.5 : 1.5, height: i % 3 === 0 ? 2.5 : 1.5,
            borderRadius: 2, backgroundColor: `rgba(255,255,255,${0.08 + (i % 4) * 0.06})`,
          }} />
        ))}

        <View style={s.selectWrap}>
          {/* Header */}
          <View style={s.selectHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <Text style={s.backTxt}>‹</Text>
            </TouchableOpacity>
            <View style={s.selectTitleWrap}>
              <Text style={s.selectTitle}>✕ ○ ✕</Text>
              <Text style={s.selectSub}>XOX GAME</Text>
            </View>
          </View>

          {/* Mode buttons */}
          <Text style={s.selectLabel}>SELECT MODE</Text>

          <ModeCard
            emoji="🤖"
            title="VS Computer"
            desc="Challenge the AI"
            color="#38bdf8"
            gradient={['#031525', '#062a4a', '#041e38']}
            onPress={() => startGame('cpu')}
          />
          <ModeCard
            emoji="👥"
            title="2 Players"
            desc="Pass & play locally"
            color="#f472b6"
            gradient={['#2a0020', '#4a0035', '#2d001e']}
            onPress={() => startGame('two')}
          />

          {/* Difficulty (cpu only) */}
          <Text style={[s.selectLabel, { marginTop: 28 }]}>AI DIFFICULTY</Text>
          <View style={s.diffRow}>
            {Object.entries(DIFFICULTY).map(([key, d]) => (
              <TouchableOpacity
                key={key}
                onPress={() => setDifficulty(key)}
                activeOpacity={0.8}
                style={[
                  s.diffBtn,
                  difficulty === key && { borderColor: d.color + 'aa', backgroundColor: d.color + '18' },
                ]}
              >
                <Text style={[s.diffTxt, { color: difficulty === key ? d.color : 'rgba(255,255,255,0.35)' }]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  }

  // ── Game screen ───────────────────────────────────────────────────────────
  const diff = DIFFICULTY[difficulty];
  const xLabel = p1Name;
  const oLabel = mode === 'cpu' ? `CPU (${diff.label})` : p2Name;

  const turnColor  = turn === 'X' ? '#38bdf8' : '#f472b6';
  const turnLabel  = turn === 'X' ? xLabel : (mode === 'cpu' ? 'CPU thinking…' : oLabel);
  const isThinking = mode === 'cpu' && turn === 'O' && thinking;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#04040f', '#0a0520', '#130835', '#0c1a3d']}
        locations={[0, 0.3, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />
      <FloatingOrb size={200} color="#6c3fc4" startX={-60}     startY={80}        duration={3800} delay={0} />
      <FloatingOrb size={140} color="#1a56db" startX={SW - 80} startY={160}       duration={4200} delay={600} />
      <FloatingOrb size={90}  color="#e91e8c" startX={SW*0.3}  startY={SH * 0.55} duration={3400} delay={300} />

      {[...Array(16)].map((_, i) => (
        <View key={i} style={{
          position: 'absolute',
          left: (i * 137.5) % SW, top: (i * 83.7) % SH,
          width: i % 3 === 0 ? 2.5 : 1.5, height: i % 3 === 0 ? 2.5 : 1.5,
          borderRadius: 2, backgroundColor: `rgba(255,255,255,${0.08 + (i % 4) * 0.06})`,
        }} />
      ))}

      {/* ── Top bar ── */}
      <Animated.View style={[s.topBar, { opacity: headerOp }]}>
        <TouchableOpacity onPress={goToMenu} style={s.backBtn}>
          <Text style={s.backTxt}>‹</Text>
        </TouchableOpacity>
        <View style={s.topCenter}>
          <Text style={s.topTitle}>✕  ○  ✕</Text>
          {mode === 'cpu' && (
            <View style={[s.diffPill, { backgroundColor: diff.color + '22', borderColor: diff.color + '66' }]}>
              <Text style={[s.diffPillTxt, { color: diff.color }]}>{diff.label}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={resetGame} style={s.resetBtn}>
          <Text style={s.resetTxt}>↺</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Score bar ── */}
      <Animated.View style={[s.scoreBar, { opacity: headerOp }]}>
        <ScoreBox label={xLabel} symbol="X" value={score.X} color="#38bdf8" active={turn === 'X' && !result} />
        <View style={s.drawBox}>
          <Text style={s.drawVal}>{score.D}</Text>
          <Text style={s.drawLbl}>DRAW</Text>
        </View>
        <ScoreBox label={oLabel} symbol="O" value={score.O} color="#f472b6" active={turn === 'O' && !result} />
      </Animated.View>

      {/* ── Turn indicator ── */}
      <Animated.View style={[s.turnWrap, { opacity: headerOp }]}>
        <View style={[s.turnPill, { borderColor: turnColor + '55', backgroundColor: turnColor + '12' }]}>
          {isThinking ? (
            <ThinkingDots color={turnColor} />
          ) : (
            <Text style={[s.turnTxt, { color: turnColor }]}>
              {result ? '— GAME OVER —' : `${turnLabel}'s turn`}
            </Text>
          )}
        </View>
      </Animated.View>

      {/* ── Board ── */}
      <Animated.View style={[s.boardWrap, { opacity: boardOp, transform: [{ translateY: boardY }] }]}>
        <View style={s.board}>
          {board.map((val, i) => (
            <Cell
              key={i}
              value={val}
              index={i}
              onPress={handleCellPress}
              winLine={winLine}
              disabled={!!result || isThinking}
            />
          ))}
        </View>
      </Animated.View>

      {/* ── Quick reset ── */}
      <Animated.View style={[s.bottomBar, { opacity: boardOp }]}>
        <TouchableOpacity onPress={resetGame} activeOpacity={0.8} style={s.newGameBtn}>
          <LinearGradient colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.03)']} style={s.newGameGrad}>
            <Text style={s.newGameTxt}>NEW ROUND</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Result modal ── */}
      <ResultModal
        visible={modalVisible}
        result={result}
        playerX={xLabel}
        playerO={oLabel}
        onPlayAgain={() => resetGame()}
        onMenu={goToMenu}
        mode={mode}
      />
    </View>
  );
}

// ── Score box ─────────────────────────────────────────────────────────────────
function ScoreBox({ label, symbol, value, color, active }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (active) {
      const p = Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ]));
      p.start();
      return () => p.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [active]);

  return (
    <Animated.View style={[s.scoreBox, active && { borderColor: color + '77' }, { transform: [{ scale: pulseAnim }] }]}>
      <LinearGradient
        colors={active ? [color + '22', color + '0a'] : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
        style={StyleSheet.absoluteFill}
      />
      <Text style={[s.scoreSymbol, { color }]}>{symbol}</Text>
      <Text style={[s.scoreVal, { color }]}>{value}</Text>
      <Text style={s.scoreLbl} numberOfLines={1}>{label.length > 8 ? label.slice(0,8)+'…' : label}</Text>
    </Animated.View>
  );
}

// ── Thinking dots ─────────────────────────────────────────────────────────────
function ThinkingDots({ color }) {
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];
  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 160),
        Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        Animated.delay(320 - i * 160),
      ]))
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={[s.turnTxt, { color }]}>CPU thinking</Text>
      {dots.map((dot, i) => (
        <Animated.Text key={i} style={[{ color, fontSize: 16, fontWeight: '900' }, { opacity: dot }]}>•</Animated.Text>
      ))}
    </View>
  );
}

// ── Mode card ─────────────────────────────────────────────────────────────────
function ModeCard({ emoji, title, desc, color, gradient, onPress }) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(pressScale, { toValue: 0.97, useNativeDriver: true, friction: 6 }).start();
  const onOut = () => Animated.spring(pressScale, { toValue: 1,    useNativeDriver: true, friction: 6 }).start();

  return (
    <Animated.View style={{ transform: [{ scale: pressScale }] }}>
      <TouchableOpacity onPress={onPress} onPressIn={onIn} onPressOut={onOut} activeOpacity={1}>
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[s.modeCard, { shadowColor: color }]}>
          <View style={[s.modeCorner, { backgroundColor: color + '28' }]} />
          <View style={[s.modeEmoji, { backgroundColor: color + '22', borderColor: color + '55' }]}>
            <Text style={{ fontSize: 30 }}>{emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.modeTitle, { color: '#fff' }]}>{title}</Text>
            <Text style={s.modeDesc}>{desc}</Text>
          </View>
          <View style={[s.modeArrow, { borderColor: color + '55' }]}>
            <Text style={[{ fontSize: 22, fontWeight: '700', color, marginTop: -2 }]}>›</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1 },

  // ── Select screen
  selectWrap:      { flex: 1, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 30 },
  selectHeader:    { flexDirection: 'row', alignItems: 'center', marginBottom: 36 },
  selectTitleWrap: { flex: 1, alignItems: 'center' },
  selectTitle:     { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: 6 },
  selectSub:       { color: 'rgba(167,139,250,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 4, marginTop: 2 },
  selectLabel:     { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '800', letterSpacing: 4, textAlign: 'center', marginBottom: 14 },

  modeCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 22, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 18, elevation: 12,
    overflow: 'hidden',
  },
  modeCorner: { position: 'absolute', right: -20, top: -20, width: 80, height: 80, borderRadius: 40 },
  modeEmoji:  { width: 58, height: 58, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  modeTitle:  { fontSize: 17, fontWeight: '800', letterSpacing: 0.2, marginBottom: 3 },
  modeDesc:   { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  modeArrow:  { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  diffRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  diffBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  diffTxt: { fontWeight: '800', fontSize: 11, letterSpacing: 2 },

  // ── Game screen
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backTxt: { color: 'rgba(255,255,255,0.6)', fontSize: 30, fontWeight: '300', marginTop: -4 },

  topBar:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 52, paddingBottom: 8 },
  topCenter:{ flex: 1, alignItems: 'center', gap: 6 },
  topTitle: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 8 },
  diffPill: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 20, borderWidth: 1 },
  diffPillTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  resetBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  resetTxt: { color: 'rgba(255,255,255,0.5)', fontSize: 24 },

  scoreBar: { flexDirection: 'row', marginHorizontal: 18, marginVertical: 10, gap: 10 },
  scoreBox: {
    flex: 1, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    padding: 12, alignItems: 'center', overflow: 'hidden',
  },
  scoreSymbol: { fontSize: 20, fontWeight: '900', letterSpacing: -1 },
  scoreVal:    { fontSize: 28, fontWeight: '900', letterSpacing: -1, lineHeight: 32 },
  scoreLbl:    { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  drawBox:     { width: 56, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  drawVal:     { color: 'rgba(255,255,255,0.5)', fontSize: 22, fontWeight: '900' },
  drawLbl:     { color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  turnWrap: { alignItems: 'center', marginBottom: 16 },
  turnPill: { paddingHorizontal: 18, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  turnTxt:  { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },

  boardWrap: { alignItems: 'center', marginTop: 4 },
  board: {
    flexDirection: 'row', flexWrap: 'wrap',
    width: SW - 48, gap: 10,
    justifyContent: 'center',
  },

  bottomBar: { alignItems: 'center', marginTop: 24 },
  newGameBtn: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  newGameGrad: { paddingHorizontal: 32, paddingVertical: 12 },
  newGameTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 3 },
});