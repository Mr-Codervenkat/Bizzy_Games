import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { markPuzzleCompleted, saveHighScore } from '../../storage/StorageService';
import { getImageSource } from '../../utils/imageSource';
import { useApp } from '../../context/AppContext';

const { width } = Dimensions.get('window');

const BOARD_PADDING = 16;
const BOARD_WIDTH = width - BOARD_PADDING * 2;
const BOARD_HEIGHT = BOARD_WIDTH * 1.15;
const PUZZLE_COLS = 3;
const PUZZLE_ROWS = 5;
const TOTAL_PIECES = PUZZLE_COLS * PUZZLE_ROWS;
const TRAY_GAP = 10;
const TRAY_PIECE_W = 92;
const TRAY_PIECE_H = 118;

function shuffleArray(items) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
}

function getStarRating(moves, elapsedSec) {
  if (moves <= 15 && elapsedSec <= 90) {
    return 3;
  }

  if (moves <= 22 && elapsedSec <= 180) {
    return 2;
  }

  return 1;
}

export default function PuzzleScreen({ route, navigation }) {
  const { category, image } = route.params;
  const { currentTheme, playMusic } = useApp();
  const imageSource = getImageSource(image);

  const pieceWidth = BOARD_WIDTH / PUZZLE_COLS;
  const pieceHeight = BOARD_HEIGHT / PUZZLE_ROWS;

  const pieceIds = useMemo(
    () => Array.from({ length: TOTAL_PIECES }, (_, index) => index),
    []
  );

  const [trayPieces, setTrayPieces] = useState([]);
  const [placedPieces, setPlacedPieces] = useState(Array(TOTAL_PIECES).fill(null));
  const [moves, setMoves] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [hintPieceId, setHintPieceId] = useState(null);
  const [selectedPieceId, setSelectedPieceId] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  const timerRef = useRef(null);
  const boardRef = useRef(null);
  const boardLayoutRef = useRef({
    x: 0,
    y: 0,
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
  });
  const panRefs = useRef({});
  const winOpacity = useRef(new Animated.Value(0)).current;
  const winScale = useRef(new Animated.Value(0.9)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    startNewGame();

    return () => {
      clearInterval(timerRef.current);
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const trackKey =
        category.id === 'actors' && image.musicKey
          ? image.musicKey
          : category.musicKey
          ? category.musicKey
          : 'default';

      playMusic(trackKey);
    }, [category.id, image.musicKey])
  );

  const resetPieceAnimations = () => {
    pieceIds.forEach((pieceId) => {
      if (!panRefs.current[pieceId]) {
        panRefs.current[pieceId] = new Animated.ValueXY();
      }
      panRefs.current[pieceId].setValue({ x: 0, y: 0 });
    });
  };

  const startTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSec((current) => current + 1);
    }, 1000);
  };

  const startNewGame = () => {
    clearInterval(timerRef.current);
    setTrayPieces(shuffleArray(pieceIds));
    setPlacedPieces(Array(TOTAL_PIECES).fill(null));
    setMoves(0);
    setElapsedSec(0);
    setIsPaused(false);
    setIsComplete(false);
    setHintPieceId(null);
    setSelectedPieceId(null);
    setPreviewVisible(false);
    winOpacity.setValue(0);
    winScale.setValue(0.9);
    sparkleAnim.setValue(0);
    resetPieceAnimations();
    startTimer();
  };

  const measureBoard = () => {
    if (boardRef.current?.measureInWindow) {
      boardRef.current.measureInWindow((x, y, measuredWidth, measuredHeight) => {
        boardLayoutRef.current = {
          x,
          y,
          width: measuredWidth,
          height: measuredHeight,
        };
      });
    }
  };

  const finishGame = async (nextMoves, nextElapsedSec) => {
    clearInterval(timerRef.current);
    setIsComplete(true);

    Animated.parallel([
      Animated.timing(winOpacity, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.spring(winScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 90,
        friction: 8,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();

    await markPuzzleCompleted(category.id, image.id, {
      moves: nextMoves,
      time: nextElapsedSec,
    });
    await saveHighScore(category.id, image.id, nextMoves, nextElapsedSec);
  };

  const starRating = getStarRating(moves, elapsedSec);

  const placePiece = (pieceId, slotIndex) => {
    if (isPaused || isComplete) {
      return;
    }

    if (slotIndex < 0 || slotIndex >= TOTAL_PIECES) {
      return;
    }

    const existingPieceId = placedPieces[slotIndex];
    const nextTrayPieces = trayPieces.filter((id) => id !== pieceId);
    const nextPlacedPieces = [...placedPieces];

    if (existingPieceId !== null && existingPieceId !== pieceId) {
      nextTrayPieces.push(existingPieceId);
    }

    const previousSlotIndex = nextPlacedPieces.findIndex((id) => id === pieceId);
    if (previousSlotIndex !== -1) {
      nextPlacedPieces[previousSlotIndex] = null;
    }

    nextPlacedPieces[slotIndex] = pieceId;

    const uniqueTrayPieces = [...new Set(nextTrayPieces)];

    const nextMoves = moves + 1;
    const nextElapsedSec = elapsedSec;

    setTrayPieces(uniqueTrayPieces);
    setPlacedPieces(nextPlacedPieces);
    setMoves(nextMoves);
    setSelectedPieceId((current) => (current === pieceId ? null : current));

    if (uniqueTrayPieces.length === 0 && nextPlacedPieces.every((id) => id !== null)) {
      finishGame(nextMoves, nextElapsedSec);
    }
  };

  const returnPieceToTray = (slotIndex) => {
    if (isPaused || isComplete) {
      return;
    }

    const pieceId = placedPieces[slotIndex];
    if (pieceId === null) {
      return;
    }

    const nextPlacedPieces = [...placedPieces];
    nextPlacedPieces[slotIndex] = null;

    setPlacedPieces(nextPlacedPieces);
    setTrayPieces((current) => [...current, pieceId]);
    setMoves((current) => current + 1);
    setSelectedPieceId(null);
  };

  const handleHint = () => {
    if (trayPieces.length === 0) {
      return;
    }

    const nextHintPieceId = trayPieces.find((pieceId) => placedPieces[pieceId] === null);
    if (nextHintPieceId === undefined) {
      return;
    }

    setHintPieceId(nextHintPieceId);
    setSelectedPieceId(nextHintPieceId);
    setTimeout(() => {
      setHintPieceId((current) => (current === nextHintPieceId ? null : current));
    }, 1800);
  };

  const togglePause = () => {
    if (isComplete) {
      return;
    }

    if (isPaused) {
      setIsPaused(false);
      startTimer();
      return;
    }

    clearInterval(timerRef.current);
    setIsPaused(true);
  };

  const handleDrop = (pieceId, releaseX, releaseY, pan) => {
    if (isPaused || isComplete) {
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
      }).start();
      return;
    }

    const board = boardLayoutRef.current;
    const isInsideBoard =
      releaseX >= board.x &&
      releaseX <= board.x + board.width &&
      releaseY >= board.y &&
      releaseY <= board.y + board.height;

    if (isInsideBoard) {
      const relativeX = releaseX - board.x;
      const relativeY = releaseY - board.y;
      const col = Math.min(PUZZLE_COLS - 1, Math.max(0, Math.floor(relativeX / pieceWidth)));
      const row = Math.min(PUZZLE_ROWS - 1, Math.max(0, Math.floor(relativeY / pieceHeight)));
      const slotIndex = row * PUZZLE_COLS + col;
      placePiece(pieceId, slotIndex);
    }

    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
      friction: 7,
    }).start();
  };

  const getPiecePan = (pieceId) => {
    if (!panRefs.current[pieceId]) {
      panRefs.current[pieceId] = new Animated.ValueXY();
    }

    return panRefs.current[pieceId];
  };

  const renderBoardSlot = (slotIndex) => {
    const pieceId = placedPieces[slotIndex];
    const isCorrect = pieceId === slotIndex;

    return (
      <TouchableOpacity
        key={slotIndex}
        style={[styles.boardSlot, { width: pieceWidth, height: pieceHeight }]}
        activeOpacity={0.95}
        onPress={() => {
          if (selectedPieceId !== null) {
            placePiece(selectedPieceId, slotIndex);
            return;
          }

          returnPieceToTray(slotIndex);
        }}
      >
        {pieceId !== null && (
          <View style={styles.placedPiece}>
            <Image
              source={imageSource}
              style={[
                styles.pieceImage,
                {
                  width: BOARD_WIDTH,
                  height: BOARD_HEIGHT,
                  left: -(pieceId % PUZZLE_COLS) * pieceWidth,
                  top: -Math.floor(pieceId / PUZZLE_COLS) * pieceHeight,
                },
              ]}
              resizeMode="stretch"
            />
            <View style={[styles.statusDot, isCorrect ? styles.correctDot : styles.wrongDot]} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderTrayPiece = (pieceId) => {
    const pan = getPiecePan(pieceId);
    const isHinted = hintPieceId === pieceId;
    const isSelected = selectedPieceId === pieceId;
    const scale = TRAY_PIECE_W / pieceWidth;
    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => !isPaused && !isComplete,
      onMoveShouldSetPanResponder: () => !isPaused && !isComplete,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (event) => {
        handleDrop(pieceId, event.nativeEvent.pageX, event.nativeEvent.pageY, pan);
      },
      onPanResponderTerminate: () => {
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      },
    });

    return (
      <Animated.View
        key={pieceId}
        {...responder.panHandlers}
        style={[
          styles.trayPiece,
          isHinted && styles.trayPieceHinted,
          isSelected && styles.trayPieceSelected,
          {
            width: TRAY_PIECE_W,
            height: TRAY_PIECE_H,
            transform: pan.getTranslateTransform(),
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.trayPieceButton}
          onPress={() => setSelectedPieceId((current) => (current === pieceId ? null : pieceId))}
        >
          <View style={styles.trayPieceCrop}>
            <Image
              source={imageSource}
              style={[
                styles.pieceImage,
                {
                  width: BOARD_WIDTH * scale,
                  height: BOARD_HEIGHT * scale,
                  left: -(pieceId % PUZZLE_COLS) * pieceWidth * scale,
                  top: -Math.floor(pieceId / PUZZLE_COLS) * pieceHeight * scale,
                },
              ]}
              resizeMode="stretch"
            />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <LinearGradient colors={currentTheme.gradient} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f23" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>{"<"}</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.imageName} numberOfLines={1}>
            {image.name}
          </Text>
          <Text style={styles.categoryName}>
            {category.icon} {category.name}
          </Text>
        </View>

        <TouchableOpacity onPress={handleHint} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>?</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Text style={styles.statText}>{formatTime(elapsedSec)}</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statText}>{moves} moves</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statText}>{TOTAL_PIECES - trayPieces.length}/{TOTAL_PIECES}</Text>
        </View>
        <TouchableOpacity onPress={togglePause} style={styles.actionButton}>
          <Text style={styles.actionButtonText}>{isPaused ? 'Play' : 'Pause'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            Alert.alert('Restart game', 'Start this puzzle again?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Restart', onPress: startNewGame },
            ])
          }
          style={styles.actionButton}
        >
          <Text style={styles.actionButtonText}>Restart</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.previewRow}>
        <Text style={styles.previewLabel}>Reference</Text>
        <TouchableOpacity onPress={() => setPreviewVisible(true)} activeOpacity={0.9}>
          <Image source={imageSource} style={styles.previewThumb} resizeMode="cover" />
        </TouchableOpacity>
        <Text style={styles.instructions}>
          Select or drag a piece, then place it in any box. Green dot is correct, red dot is wrong.
        </Text>
      </View>

      <View ref={boardRef} onLayout={measureBoard} style={styles.board}>
        <Image
          source={imageSource}
          style={styles.boardGuideImage}
          resizeMode="stretch"
        />
        {Array.from({ length: PUZZLE_ROWS }, (_, rowIndex) => (
          <View key={rowIndex} style={styles.boardRow}>
            {Array.from({ length: PUZZLE_COLS }, (_, colIndex) => {
              const slotIndex = rowIndex * PUZZLE_COLS + colIndex;
              return renderBoardSlot(slotIndex);
            })}
          </View>
        ))}
      </View>

      <View style={styles.traySection}>
        <Text style={styles.trayTitle}>Puzzle pieces ({trayPieces.length} remaining)</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.trayScroll}
        >
          {trayPieces.map((pieceId) => renderTrayPiece(pieceId))}
        </ScrollView>
      </View>

      {isPaused && (
        <View style={styles.pauseOverlay}>
          <Text style={styles.pauseTitle}>Game paused</Text>
          <TouchableOpacity onPress={togglePause} style={styles.resumeButton}>
            <Text style={styles.resumeButtonText}>Resume</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={previewVisible} transparent animationType="fade">
        <View style={styles.previewOverlay}>
          <TouchableOpacity
            style={styles.previewBackdrop}
            activeOpacity={1}
            onPress={() => setPreviewVisible(false)}
          />
          <View style={styles.previewModal}>
            <Image source={imageSource} style={styles.previewFull} resizeMode="contain" />
            <TouchableOpacity
              onPress={() => setPreviewVisible(false)}
              style={styles.previewCloseButton}
            >
              <Text style={styles.previewCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={isComplete} animationType="fade">
        <View style={styles.winOverlay}>
          <Animated.View
            style={[
              styles.winCard,
              {
                opacity: winOpacity,
                transform: [{ scale: winScale }],
              },
            ]}
          >
            <LinearGradient colors={['#1a0533', '#2d0a5e']} style={styles.winGradient}>
              <Animated.Text
                style={[
                  styles.winSparkles,
                  {
                    opacity: sparkleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.45, 1],
                    }),
                    transform: [
                      {
                        scale: sparkleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.92, 1.08],
                        }),
                      },
                    ],
                  },
                ]}
              >
                ✨ ★ ✨
              </Animated.Text>
              <Text style={styles.winTitle}>Puzzle solved</Text>
              <Text style={styles.winSubtitle}>{image.name}</Text>
              <Text style={styles.winSummary}>Time {formatTime(elapsedSec)}  |  Moves {moves}</Text>
              <Text style={styles.winStars}>
                {'★'.repeat(starRating)}
                {'☆'.repeat(3 - starRating)}
              </Text>
              <View style={styles.winButtons}>
                <TouchableOpacity style={styles.primaryWinButton} onPress={startNewGame}>
                  <Text style={styles.primaryWinButtonText}>Play again</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryWinButton}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.secondaryWinButtonText}>Back</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  imageName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  categoryName: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    flexWrap: 'wrap',
  },
  statPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statText: {
    color: '#f5d0fe',
    fontSize: 12,
    fontWeight: '700',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  previewLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
  },
  previewThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(192,132,252,0.8)',
  },
  instructions: {
    flex: 1,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    lineHeight: 15,
  },
  board: {
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    alignSelf: 'center',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(192,132,252,0.35)',
    backgroundColor: 'rgba(5,5,20,0.92)',
  },
  boardGuideImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    opacity: 0.08,
  },
  boardRow: {
    flex: 1,
    flexDirection: 'row',
  },
  boardSlot: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
  },
  placedPiece: {
    flex: 1,
    overflow: 'hidden',
  },
  statusDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  correctDot: {
    backgroundColor: '#22c55e',
  },
  wrongDot: {
    backgroundColor: '#ef4444',
  },
  pieceImage: {
    position: 'absolute',
  },
  traySection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  trayTitle: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginBottom: 10,
  },
  trayScroll: {
    paddingHorizontal: 2,
    gap: TRAY_GAP,
  },
  trayPiece: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(192,132,252,0.35)',
    backgroundColor: 'rgba(0,0,0,0.30)',
    marginRight: TRAY_GAP,
  },
  trayPieceHinted: {
    borderColor: '#facc15',
    shadowColor: '#facc15',
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  trayPieceSelected: {
    borderColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  trayPieceButton: {
    flex: 1,
  },
  trayPieceCrop: {
    flex: 1,
    overflow: 'hidden',
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.80)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 16,
  },
  resumeButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  resumeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.90)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  previewModal: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  previewFull: {
    width: '100%',
    height: '75%',
  },
  previewCloseButton: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  previewCloseText: {
    color: '#fff',
    fontWeight: '700',
  },
  winOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  winCard: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  winGradient: {
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.35)',
  },
  winTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
  },
  winSparkles: {
    color: '#facc15',
    fontSize: 24,
    marginBottom: 8,
    letterSpacing: 4,
  },
  winSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    marginTop: 6,
  },
  winSummary: {
    color: '#f5d0fe',
    fontSize: 14,
    marginTop: 16,
  },
  winStars: {
    color: '#facc15',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 14,
    letterSpacing: 3,
  },
  winButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 22,
  },
  primaryWinButton: {
    flex: 1,
    backgroundColor: '#7c3aed',
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryWinButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  secondaryWinButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
  },
  secondaryWinButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
});
