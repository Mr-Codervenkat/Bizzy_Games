import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  PanResponder,
  Animated,
} from 'react-native';

const { width } = Dimensions.get('window');
const GRID_COLS = 20;
const GRID_ROWS = 30;
const CELL_SIZE = Math.floor(width * 0.9 / GRID_COLS);
const BOARD_WIDTH = CELL_SIZE * GRID_COLS;
const BOARD_HEIGHT = CELL_SIZE * GRID_ROWS;

const randomFood = (snake) => {
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`));
  while (true) {
    const x = Math.floor(Math.random() * GRID_COLS);
    const y = Math.floor(Math.random() * GRID_ROWS);
    if (!occupied.has(`${x},${y}`)) return { x, y };
  }
};

export default function SnakeGame({ navigation }) {
  const [snake, setSnake] = useState([
    { x: 8, y: 15 },
    { x: 7, y: 15 },
    { x: 6, y: 15 },
  ]);
  const [dir, setDir] = useState({ x: 1, y: 0 });
  const [food, setFood] = useState(() => randomFood(snake));
  const [running, setRunning] = useState(true);
  const [score, setScore] = useState(0);
  const intervalRef = useRef(null);
  const panRef = useRef(null);
  const foodScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    start();
    return () => stop();
  }, []);

  useEffect(() => {
    if (!running) return;

    // dynamic speed based on score
    const delay = Math.max(60, 160 - score * 8);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(moveSnake, delay);

    return () => clearInterval(intervalRef.current);
  }, [dir, running, score]);

  useEffect(() => {
    // food pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(foodScale, { toValue: 1.25, duration: 400, useNativeDriver: true }),
        Animated.timing(foodScale, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    // pan responder for swipe / drag controls
    panRef.current = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, gestureState) => {
        const { dx, dy } = gestureState;
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 20) changeDir(1, 0);
          else if (dx < -20) changeDir(-1, 0);
        } else {
          if (dy > 20) changeDir(0, 1);
          else if (dy < -20) changeDir(0, -1);
        }
      },
    });
  }, [dir]);

  const start = () => {
    setRunning(true);
    setSnake([
      { x: 8, y: 15 },
      { x: 7, y: 15 },
      { x: 6, y: 15 },
    ]);
    setDir({ x: 1, y: 0 });
    setFood(randomFood([{ x: 8, y: 15 }, { x: 7, y: 15 }, { x: 6, y: 15 }]));
    setScore(0);
  };

  const stop = () => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const moveSnake = () => {
    setSnake((prev) => {
      const head = prev[0];
      const newHead = { x: head.x + dir.x, y: head.y + dir.y };

      // Check wall collision
      if (newHead.x < 0 || newHead.x >= GRID_COLS || newHead.y < 0 || newHead.y >= GRID_ROWS) {
        gameOver();
        return prev;
      }

      // Check self collision
      if (prev.some((p) => p.x === newHead.x && p.y === newHead.y)) {
        gameOver();
        return prev;
      }

      let grew = false;
      if (newHead.x === food.x && newHead.y === food.y) {
        grew = true;
        setScore((s) => s + 1);
        setFood(randomFood([newHead, ...prev]));
      }

      const next = [newHead, ...prev];
      if (!grew) next.pop();
      return next;
    });
  };

  const gameOver = () => {
    stop();
    Alert.alert('Game Over', `Score: ${score}`, [
      { text: 'Restart', onPress: () => start() },
      { text: 'Exit', onPress: () => navigation.goBack(), style: 'cancel' },
    ]);
  };

  const changeDir = (x, y) => {
    // Prevent reversing
    if (dir.x === -x && dir.y === -y) return;
    setDir({ x, y });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backTxt}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.score}>Score: {score}</Text>
      </View>

      <View
        style={[styles.board, { width: BOARD_WIDTH, height: BOARD_HEIGHT }]}
        {...(panRef.current ? panRef.current.panHandlers : {})}
      >
        {snake.map((segment, idx) => (
          <View
            key={`${segment.x}-${segment.y}-${idx}`}
            style={[
              styles.cell,
              { left: segment.x * CELL_SIZE, top: segment.y * CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE },
            ]}
          />
        ))}

        <Animated.View
          style={[
            styles.food,
            {
              left: food.x * CELL_SIZE,
              top: food.y * CELL_SIZE,
              width: CELL_SIZE,
              height: CELL_SIZE,
              transform: [{ scale: foodScale }],
            },
          ]}
        />
      </View>

      <View style={styles.controls}>
        <View style={styles.row}>
          <TouchableOpacity onPress={() => changeDir(0, -1)} style={styles.ctrlBtn}>
            <Text style={styles.ctrlTxt}>↑</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <TouchableOpacity onPress={() => changeDir(-1, 0)} style={styles.ctrlBtn}>
            <Text style={styles.ctrlTxt}>←</Text>
          </TouchableOpacity>
          <View style={{ width: 24 }} />
          <TouchableOpacity onPress={() => changeDir(1, 0)} style={styles.ctrlBtn}>
            <Text style={styles.ctrlTxt}>→</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <TouchableOpacity onPress={() => changeDir(0, 1)} style={styles.ctrlBtn}>
            <Text style={styles.ctrlTxt}>↓</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingTop: 40, backgroundColor: '#07102a' },
  header: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, marginBottom: 8 },
  backBtn: { padding: 6 },
  backTxt: { color: '#fff' },
  score: { color: '#fff', fontWeight: '700' },
  board: { backgroundColor: '#07132a', position: 'relative', borderRadius: 8, overflow: 'hidden' },
  cell: { position: 'absolute', backgroundColor: '#22c55e', borderRadius: 2 },
  food: { position: 'absolute', backgroundColor: '#ff3b30', borderRadius: 2 },
  controls: { marginTop: 14, alignItems: 'center' },
  row: { flexDirection: 'row', marginVertical: 6 },
  ctrlBtn: { backgroundColor: 'rgba(255,255,255,0.08)', padding: 12, borderRadius: 8, minWidth: 64, alignItems: 'center' },
  ctrlTxt: { color: '#fff', fontSize: 20, fontWeight: '800' },
});
