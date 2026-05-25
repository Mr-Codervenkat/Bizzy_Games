import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableWithoutFeedback,
    StatusBar,
    Animated,
    TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';

// ── Storage fallback ──────────────────────────────────────────────────────────
let Storage = null;
try {
    Storage = require('@react-native-async-storage/async-storage').default;
} catch {
    const mem = {};
    Storage = { getItem: async (k) => mem[k] ?? null, setItem: async (k, v) => { mem[k] = v; } };
}

const { width: SW, height: SH } = Dimensions.get('window');

// ── Game constants ────────────────────────────────────────────────────────────
const BIRD_X = SW * 0.22;
const BIRD_SIZE = 44;
const BIRD_RADIUS = BIRD_SIZE / 2 - 4;   // collision radius (slightly smaller than visual)
const PIPE_WIDTH = 64;
const PIPE_GAP = 250;                  // vertical gap between top/bottom pipe
const PIPE_SPEED = 2.5;                  // px per frame
const GRAVITY = 0.48;
const JUMP_FORCE = -6.8;
const GROUND_H = 80;
const PIPE_INTERVAL = 2200;                 // ms between new pipes
const PIPE_SPACING = SW * 0.65;            // horizontal distance between pipes

// ── Cloud data ────────────────────────────────────────────────────────────────
const CLOUDS = [
    { x: SW * 0.1, y: 55, w: 90, h: 34, speed: 0.3 },
    { x: SW * 0.5, y: 30, w: 120, h: 40, speed: 0.5 },
    { x: SW * 0.78, y: 70, w: 75, h: 28, speed: 0.4 },
    { x: SW * 0.3, y: 100, w: 60, h: 22, speed: 0.25 },
];

let _id = 0;
const uid = () => ++_id;
const rand = (min, max) => Math.random() * (max - min) + min;

// ── Sound helpers (graceful fallback if expo-av not available) ────────────────
async function loadSound(source) {
    try {
        const { sound } = await Audio.Sound.createAsync(source);
        return sound;
    } catch (e) {
        console.log(e);
        return null;
    }
}
async function playSound(sound, isMuted) {
    try {
        if (!sound || isMuted) return;

        await sound.replayAsync();
    } catch (e) {
        console.log("Play Error:", e);
    }
}

// ── Bird component ────────────────────────────────────────────────────────────
function Bird({ y, rotation }) {
    const rot = rotation.interpolate({
        inputRange: [-15, 0, 90],
        outputRange: ['-15deg', '0deg', '90deg'],
        extrapolate: 'clamp',
    });

    // Wing flap animation
    const wingAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(wingAnim, { toValue: 1, duration: 140, useNativeDriver: true }),
                Animated.timing(wingAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    const wingUp = wingAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-35deg'] });

    return (
        // <Animated.View style={[bs.birdWrap, { top: y - BIRD_SIZE / 2, transform: [{ rotate: rot }] }]}>
        <Animated.View
            style={[
                bs.birdWrap,
                {
                    transform: [
                        {
                            translateY: Animated.subtract(y, BIRD_SIZE / 2),
                        },
                        { rotate: rot },
                    ],
                },
            ]}
        >
            {/* Body */}
            <View style={bs.body}>
                {/* Wing */}
                <Animated.View style={[bs.wing, { transform: [{ rotate: wingUp }] }]} />
                {/* Eye */}
                <View style={bs.eye}>
                    <View style={bs.pupil} />
                </View>
                {/* Beak */}
                <View style={bs.beak} />
                {/* Tail */}
                <View style={bs.tail} />
                {/* Belly */}
                <View style={bs.belly} />
            </View>
        </Animated.View>
    );
}

const bs = StyleSheet.create({
    birdWrap: {
        position: 'absolute',
        left: BIRD_X - BIRD_SIZE / 2,
        width: BIRD_SIZE, height: BIRD_SIZE,
    },
    body: {
        width: BIRD_SIZE, height: BIRD_SIZE,
        borderRadius: BIRD_SIZE / 2,
        backgroundColor: '#FFD93D',
        borderWidth: 2, borderColor: '#E8A000',
        overflow: 'visible',
        alignItems: 'center', justifyContent: 'center',
    },
    wing: {
        position: 'absolute',
        width: 20, height: 13,
        backgroundColor: '#FFC300',
        borderRadius: 7,
        top: 10, left: -6,
        borderWidth: 1.5, borderColor: '#E8A000',
        transformOrigin: 'right center',
    },
    eye: {
        position: 'absolute',
        width: 13, height: 13,
        borderRadius: 7,
        backgroundColor: '#fff',
        top: 8, right: 7,
        borderWidth: 1, borderColor: '#ccc',
        alignItems: 'center', justifyContent: 'center',
    },
    pupil: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#1a1a2e' },
    beak: {
        position: 'absolute',
        width: 12, height: 8,
        backgroundColor: '#FF6B35',
        borderRadius: 3,
        right: -8, top: 16,
        borderWidth: 1, borderColor: '#cc4400',
    },
    tail: {
        position: 'absolute',
        width: 14, height: 10,
        backgroundColor: '#E8A000',
        borderRadius: 5,
        left: -10, bottom: 10,
        transform: [{ rotate: '-20deg' }],
    },
    belly: {
        position: 'absolute',
        width: 22, height: 16,
        backgroundColor: '#FFF5CC',
        borderRadius: 10,
        bottom: 6, right: 4,
    },
});

// ── Pipe pair ─────────────────────────────────────────────────────────────────
function PipePair({ pipe, gameAreaH }) {
    const topH = pipe.gapY;
    const bottomY = pipe.gapY + PIPE_GAP;
    const bottomH = gameAreaH - bottomY;

    return (
        <View style={{ position: 'absolute', left: pipe.x, top: 0, width: PIPE_WIDTH, height: gameAreaH }}>
            {/* Top pipe */}
            <View style={[pp.pipe, { top: 0, height: topH, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }]}>
                <LinearGradient colors={['#2d8a2d', '#3cb043', '#2d8a2d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                {/* Pipe cap */}
                <View style={[pp.cap, { bottom: -10 }]}>
                    <LinearGradient colors={['#3cb043', '#2d8a2d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                </View>
                {/* Highlight */}
                <View style={pp.highlight} />
            </View>

            {/* Bottom pipe */}
            <View style={[pp.pipe, { top: bottomY, height: bottomH, borderTopLeftRadius: 8, borderTopRightRadius: 8 }]}>
                <LinearGradient colors={['#2d8a2d', '#3cb043', '#2d8a2d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                {/* Pipe cap */}
                <View style={[pp.cap, { top: -10 }]}>
                    <LinearGradient colors={['#3cb043', '#2d8a2d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                </View>
                <View style={pp.highlight} />
            </View>
        </View>
    );
}

const pp = StyleSheet.create({
    pipe: { position: 'absolute', width: PIPE_WIDTH, overflow: 'hidden', borderWidth: 2, borderColor: '#1f6b1f' },
    cap: { position: 'absolute', left: -6, width: PIPE_WIDTH + 12, height: 22, borderRadius: 4, overflow: 'hidden', borderWidth: 2, borderColor: '#1f6b1f', zIndex: 2 },
    highlight: { position: 'absolute', left: 8, top: 0, bottom: 0, width: 10, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 5 },
});

// ── Scrolling ground ──────────────────────────────────────────────────────────
function Ground({ offsetX }) {
    const segW = SW + 40;
    const x1 = (-offsetX % segW + segW) % segW - 20;
    const x2 = x1 + segW;

    return (
        <View style={gs.groundWrap}>
            {[x1, x2].map((xPos, i) => (
                <View key={i} style={[gs.ground, { left: xPos }]}>
                    <LinearGradient colors={['#8BC34A', '#6aab20']} style={gs.grass} />
                    <LinearGradient colors={['#795548', '#5d4037']} style={gs.dirt} />
                    {/* Grass tufts */}
                    {[10, 35, 60, 85, 110, 140, 170, 200, 230, 260].map((tx, ti) => (
                        <View key={ti} style={[gs.tuft, { left: tx }]} />
                    ))}
                </View>
            ))}
        </View>
    );
}

const gs = StyleSheet.create({
    groundWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, height: GROUND_H, overflow: 'hidden' },
    ground: { position: 'absolute', top: 0, width: SW + 40, height: GROUND_H },
    grass: { position: 'absolute', top: 0, left: 0, right: 0, height: 20, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    dirt: { position: 'absolute', top: 20, left: 0, right: 0, bottom: 0 },
    tuft: { position: 'absolute', top: -4, width: 8, height: 8, backgroundColor: '#7cb528', borderRadius: 4 },
});

// ── Score flash ───────────────────────────────────────────────────────────────
function ScoreFlash({ score }) {
    const sc = useRef(new Animated.Value(1.4)).current;
    useEffect(() => {
        Animated.spring(sc, { toValue: 1, friction: 4, useNativeDriver: true }).start();
    }, [score]);
    return (
        <Animated.Text style={[sf.score, { transform: [{ scale: sc }] }]}>{score}</Animated.Text>
    );
}
const sf = StyleSheet.create({
    score: { color: '#fff', fontSize: 52, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 8, textShadowOffset: { width: 2, height: 2 } },
});

// ── Death flash overlay ───────────────────────────────────────────────────────
function DeathFlash({ onDone }) {
    const op = useRef(new Animated.Value(0.7)).current;
    useEffect(() => {
        Animated.sequence([
            Animated.timing(op, { toValue: 0.4, duration: 60, useNativeDriver: true }),
            Animated.timing(op, { toValue: 0.8, duration: 60, useNativeDriver: true }),
            Animated.timing(op, { toValue: 0, duration: 280, useNativeDriver: true }),
        ]).start(onDone);
    }, []);
    return <Animated.View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', opacity: op }} pointerEvents="none" />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Main Game ──────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function BirdyBird({ navigation }) {
    const gameAreaH = SH - GROUND_H;

    // ── Refs (no re-render on tick) ────────────────────────────────────────────
    const birdYRef = useRef(gameAreaH / 2);
    const birdVYRef = useRef(0);
    const pipesRef = useRef([]);
    const groundOffRef = useRef(0);
    const cloudOffRef = useRef([0, 0, 0, 0]);
    const scoreRef = useRef(0);
    const runningRef = useRef(false);
    const rafRef = useRef(null);
    const pipeTimerRef = useRef(null);
    const rotationRef = useRef(0);
    const jumpSoundRef = useRef(null);
    const hitSoundRef = useRef(null);
    const hasScoredRef = useRef(new Set());

    // ── Animated values ────────────────────────────────────────────────────────
    const birdYAnim = useRef(new Animated.Value(gameAreaH / 2)).current;
    const birdRotAnim = useRef(new Animated.Value(0)).current;
    const bgColorAnim = useRef(new Animated.Value(0)).current;

    // ── React state (display only) ─────────────────────────────────────────────
    const [displayPipes, setDisplayPipes] = useState([]);
    const [displayGround, setDisplayGround] = useState(0);
    const [displayClouds, setDisplayClouds] = useState(CLOUDS.map(c => c.x));
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [gameState, setGameState] = useState('idle'); // idle|ready|running|dead
    const [showFlash, setShowFlash] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    // ── Load sounds ────────────────────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                await Audio.setAudioModeAsync({
                    playsInSilentModeIOS: true,
                });

                const { sound: jumpSound } = await Audio.Sound.createAsync(
                    require('../../../assets/music/rajini_valthukal.mp3')
                );

                const { sound: hitSound } = await Audio.Sound.createAsync(
                    require('../../../assets/music/oh-my-god.mp3')
                );

                jumpSoundRef.current = jumpSound;
                hitSoundRef.current = hitSound;

                console.log("Sounds loaded successfully");

            } catch (error) {
                console.log("Sound Error:", error);
            }
        })();

        return () => {
            jumpSoundRef.current?.unloadAsync();
            hitSoundRef.current?.unloadAsync();
        };
    }, []);

    // ── Spawn pipe ─────────────────────────────────────────────────────────────
    const spawnPipe = useCallback(() => {
        if (!runningRef.current) return;
        const minGapY = 140;
        const maxGapY = gameAreaH - PIPE_GAP - 140;
        const gapY = rand(minGapY, maxGapY);
        pipesRef.current.push({ id: uid(), x: SW + 20, gapY, scored: false });
        pipeTimerRef.current = setTimeout(spawnPipe, PIPE_INTERVAL);
    }, [gameAreaH, isMuted]);

    // ── Game loop ──────────────────────────────────────────────────────────────
    const gameLoop = useCallback(() => {
        if (!runningRef.current) return;

        // ── Physics ──
        birdVYRef.current += GRAVITY;
        birdYRef.current += birdVYRef.current;

        // Rotation: nose up on jump, nose down on fall
        rotationRef.current = Math.min(90, birdVYRef.current * 4.5);
        birdYAnim.setValue(birdYRef.current);
        birdRotAnim.setValue(rotationRef.current);

        // ── Ground collision ──
        if (birdYRef.current + BIRD_RADIUS >= gameAreaH) {
            birdYRef.current = gameAreaH - BIRD_RADIUS;
            triggerDeath();
            return;
        }
        // ── Ceiling ──
        if (birdYRef.current - BIRD_RADIUS <= 0) {
            birdYRef.current = BIRD_RADIUS;
            birdVYRef.current = 0;
        }

        // ── Move pipes & check collision/score ──
        let scored = false;
        pipesRef.current = pipesRef.current
            .map(p => ({ ...p, x: p.x - PIPE_SPEED }))
            .filter(p => p.x > -PIPE_WIDTH - 20);

        pipesRef.current.forEach(p => {
            // Score: bird passed pipe midpoint
            const pipeMid = p.x + PIPE_WIDTH / 2;
            if (!hasScoredRef.current.has(p.id) && pipeMid < BIRD_X) {
                hasScoredRef.current.add(p.id);
                scoreRef.current++;
                setScore(scoreRef.current);
                playSound(jumpSoundRef.current, isMuted);
                scored = true;
            }

            // Collision detection
            const bx = BIRD_X, by = birdYRef.current;
            const pLeft = p.x, pRight = p.x + PIPE_WIDTH;
            if (bx + BIRD_RADIUS > pLeft && bx - BIRD_RADIUS < pRight) {
                // Check top pipe
                if (by - BIRD_RADIUS < p.gapY) { triggerDeath(); return; }
                // Check bottom pipe
                if (by + BIRD_RADIUS > p.gapY + PIPE_GAP) { triggerDeath(); return; }
            }
        });

        // ── Scroll ground ──
        groundOffRef.current += PIPE_SPEED;

        // ── Move clouds ──
        CLOUDS.forEach((c, i) => {
            cloudOffRef.current[i] = (cloudOffRef.current[i] + c.speed) % (SW + c.w + 40);
        });

        setDisplayPipes([...pipesRef.current]);
        setDisplayGround(groundOffRef.current);
        setDisplayClouds([...cloudOffRef.current]);

        rafRef.current = requestAnimationFrame(gameLoop);
    }, [gameAreaH]);

    // ── Jump ──────────────────────────────────────────────────────────────────
    const jump = useCallback(() => {
        if (gameState === 'dead') return;

        if (gameState === 'idle' || gameState === 'ready') {
            startGame();
            return;
        }

        if (!runningRef.current) return;
        birdVYRef.current = JUMP_FORCE;
    }, [gameState]);

    // ── Trigger death ──────────────────────────────────────────────────────────
    const triggerDeath = useCallback(() => {
        if (!runningRef.current) return;
        runningRef.current = false;
        cancelAnimationFrame(rafRef.current);
        clearTimeout(pipeTimerRef.current);
        playSound(hitSoundRef.current, isMuted);
        setShowFlash(true);
        const final = scoreRef.current;
        setHighScore(prev => {
            const best = Math.max(prev, final);
            Storage.setItem('birdy_highscore', String(best)).catch(() => { });
            return best;
        });
        setTimeout(() => setGameState('dead'), 400);
    }, []);

    // ── Start game ─────────────────────────────────────────────────────────────
    const startGame = useCallback(() => {
        birdYRef.current = gameAreaH / 2;
        birdVYRef.current = JUMP_FORCE; // first tap = first jump
        pipesRef.current = [];
        groundOffRef.current = 0;
        cloudOffRef.current = [0, 0, 0, 0];
        scoreRef.current = 0;
        hasScoredRef.current = new Set();

        birdYAnim.setValue(gameAreaH / 2);
        birdRotAnim.setValue(0);

        setScore(0);
        setDisplayPipes([]);
        setDisplayGround(0);
        setShowFlash(false);
        setGameState('running');
        runningRef.current = true;

        rafRef.current = requestAnimationFrame(gameLoop);
        pipeTimerRef.current = setTimeout(spawnPipe, PIPE_INTERVAL);
    }, [gameAreaH, gameLoop, spawnPipe]);

    useEffect(() => () => {
        cancelAnimationFrame(rafRef.current);
        clearTimeout(pipeTimerRef.current);
    }, []);

    // ── Idle bird bob ──────────────────────────────────────────────────────────
    const idleBob = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (gameState !== 'idle' && gameState !== 'ready') return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(idleBob, { toValue: -12, duration: 600, useNativeDriver: true }),
                Animated.timing(idleBob, { toValue: 12, duration: 600, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => { loop.stop(); idleBob.setValue(0); };
    }, [gameState]);

    // ── Sky colour transitions by score ───────────────────────────────────────
    const skyTop = score > 20 ? '#0a0a2e' : score > 10 ? '#1a3a6e' : '#1e90ff';
    const skyBottom = score > 20 ? '#1a0a3d' : score > 10 ? '#3a7bd5' : '#87ceeb';

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <TouchableWithoutFeedback onPress={jump}>
            <View style={s.root}>
                <StatusBar barStyle="light-content" />

                {/* Sky */}
                <LinearGradient colors={[skyTop, skyBottom]} style={StyleSheet.absoluteFill} />

                {/* Sun */}
                <View style={s.sun}>
                    <View style={s.sunGlow} />
                </View>

                {/* Clouds */}
                {CLOUDS.map((c, i) => {
                    const cx = (SW - displayClouds[i] + c.x) % (SW + c.w + 40) - c.w / 2;
                    return (
                        <View key={i} style={[s.cloud, { left: cx, top: c.y, width: c.w, height: c.h }]}>
                            <View style={[s.cloudPuff, { width: c.h * 1.2, height: c.h * 1.2, left: c.w * 0.1, top: -c.h * 0.3 }]} />
                            <View style={[s.cloudPuff, { width: c.h * 1.5, height: c.h * 1.5, left: c.w * 0.3, top: -c.h * 0.5 }]} />
                            <View style={[s.cloudPuff, { width: c.h * 1.1, height: c.h * 1.1, left: c.w * 0.55, top: -c.h * 0.25 }]} />
                        </View>
                    );
                })}

                {/* Game area */}
                <View style={[s.gameArea, { height: gameAreaH }]}>
                    {/* Pipes */}
                    {displayPipes.map(p => (
                        <PipePair key={p.id} pipe={p} gameAreaH={gameAreaH} />
                    ))}

                    {/* Bird */}
                    {(gameState === 'idle' || gameState === 'ready') ? (
                        <Animated.View style={[{ transform: [{ translateY: idleBob }] }]}>
                            <Bird y={gameAreaH / 2} rotation={new Animated.Value(0)} />
                        </Animated.View>
                    ) : (
                        <Bird y={birdYAnim} rotation={birdRotAnim} />
                    )}

                    {/* Score */}
                    {gameState === 'running' && (
                        <View style={s.scoreWrap}>
                            <ScoreFlash score={score} />
                        </View>
                    )}

                    {/* Death flash */}
                    {showFlash && <DeathFlash onDone={() => setShowFlash(false)} />}

                    {/* ── Idle screen ── */}
                    {(gameState === 'idle') && (
                        <View style={s.overlay} pointerEvents="none">
                            <View style={s.titleCard}>
                                <Text style={s.titleEmoji}>🐦</Text>
                                <Text style={s.titleText}>BIRDY{'\n'}BIRD</Text>
                                <Text style={s.titleSub}>Tap anywhere to fly!</Text>
                            </View>
                            <View style={s.instructBox}>
                                <Text style={s.instruct}>🖐  Tap to flap wings & rise</Text>
                                <Text style={s.instruct}>🌿  Dodge the green pipes</Text>
                                <Text style={s.instruct}>🏆  Best score: {highScore}</Text>
                            </View>
                            <View style={s.tapHint}>
                                <Text style={s.tapHintTxt}>TAP TO START</Text>
                            </View>
                        </View>
                    )}

                    {/* ── Game over screen ── */}
                    {gameState === 'dead' && (
                        <View style={s.overlay}>
                            <View style={s.gameOverCard}>
                                <Text style={s.gameOverEmoji}>💀</Text>
                                <Text style={s.gameOverTitle}>GAME OVER</Text>
                                <View style={s.scoreRow}>
                                    <View style={s.scoreBlock}>
                                        <Text style={s.scoreLbl}>SCORE</Text>
                                        <Text style={[s.scoreVal, { color: '#FFD93D' }]}>{score}</Text>
                                    </View>
                                    <View style={s.scoreDivider} />
                                    <View style={s.scoreBlock}>
                                        <Text style={s.scoreLbl}>BEST</Text>
                                        <Text style={[s.scoreVal, { color: '#FF6B6B' }]}>{highScore}</Text>
                                    </View>
                                </View>
                                {score > 0 && score >= highScore && (
                                    <Text style={s.newBest}>🏆 NEW RECORD!</Text>
                                )}
                            </View>

                            <TouchableOpacity style={s.restartBtn} onPress={startGame}>
                                <LinearGradient colors={['#FFD93D', '#FF6B35']} style={s.restartGrad}>
                                    <Text style={s.restartTxt}>▶  PLAY AGAIN</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity style={s.menuBtn} onPress={() => navigation?.goBack?.()}>
                                <Text style={s.menuTxt}>Main Menu</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Ground */}
                <Ground offsetX={displayGround} />

                {/* Back button */}
                {(gameState === 'idle' || gameState === 'dead') && (
                    <TouchableOpacity
                        style={s.backBtn}
                        onPress={() => { runningRef.current = false; cancelAnimationFrame(rafRef.current); navigation?.goBack?.(); }}
                    >
                        <Text style={s.backTxt}>‹</Text>
                    </TouchableOpacity>
                )}
                {/* Mute / Unmute Button */}
                <TouchableOpacity
                    style={s.soundBtn}
                    onPress={() => setIsMuted(!isMuted)}
                >
                    <Text style={s.soundTxt}>
                        {isMuted ? '🔇' : '🔊'}
                    </Text>
                </TouchableOpacity>
            </View>
        </TouchableWithoutFeedback>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#1e90ff' },
    gameArea: { position: 'relative', overflow: 'hidden' },

    sun: {
        position: 'absolute', top: 60, right: 50,
        width: 55, height: 55, borderRadius: 28,
        backgroundColor: '#FFF176',
        shadowColor: '#FFF176', shadowOpacity: 1, shadowRadius: 30, elevation: 8,
    },
    sunGlow: {
        position: 'absolute', top: -15, left: -15,
        width: 85, height: 85, borderRadius: 43,
        backgroundColor: 'rgba(255,241,118,0.25)',
    },

    cloud: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 30, overflow: 'visible' },
    cloudPuff: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 999 },

    scoreWrap: { position: 'absolute', top: 30, alignSelf: 'center', width: '100%', alignItems: 'center' },

    overlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.35)', gap: 16,
    },
    titleCard: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 24, padding: 24,
        alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
        backdropFilter: 'blur(10px)',
    },
    titleEmoji: { fontSize: 50, marginBottom: 6 },
    titleText: {
        color: '#fff', fontSize: 48, fontWeight: '900',
        textAlign: 'center', lineHeight: 50, letterSpacing: 5,
        textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 10,
    },
    titleSub: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 6 },

    instructBox: { gap: 8, paddingHorizontal: 12 },
    instruct: { color: 'rgba(255,255,255,0.85)', fontSize: 14, textAlign: 'center' },

    tapHint: {
        backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 30, paddingVertical: 10,
        borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
        marginTop: 4,
    },
    tapHintTxt: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 3 },

    gameOverCard: {
        backgroundColor: 'rgba(10,10,30,0.85)',
        borderRadius: 24, padding: 28, alignItems: 'center',
        borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', gap: 10, width: SW * 0.82,
    },
    gameOverEmoji: { fontSize: 44 },
    gameOverTitle: {
        color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: 4,
        textShadowColor: '#ff4444', textShadowRadius: 14,
    },
    scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 4 },
    scoreBlock: { alignItems: 'center' },
    scoreDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
    scoreLbl: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '800', letterSpacing: 3 },
    scoreVal: { fontSize: 32, fontWeight: '900', lineHeight: 36 },
    newBest: { color: '#ffd700', fontSize: 16, fontWeight: '900', letterSpacing: 2, marginTop: 4 },

    restartBtn: { borderRadius: 30, overflow: 'hidden', elevation: 8, shadowColor: '#FFD93D', shadowOpacity: 0.7, shadowRadius: 16 },
    restartGrad: { paddingHorizontal: 44, paddingVertical: 15 },
    restartTxt: { color: '#1a1a2e', fontSize: 18, fontWeight: '900', letterSpacing: 2 },

    menuBtn: { marginTop: 2, padding: 10 },
    menuTxt: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },

    backBtn: { position: 'absolute', top: 52, left: 16, zIndex: 100, padding: 8 },
    backTxt: { color: '#fff', fontSize: 34, fontWeight: '300', lineHeight: 38, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 6 },
    soundBtn: {
  position: 'absolute',
  top: 55,
  right: 18,
  zIndex: 999,
  backgroundColor: 'rgba(0,0,0,0.35)',
  width: 46,
  height: 46,
  borderRadius: 23,
  justifyContent: 'center',
  alignItems: 'center',
},

soundTxt: {
  fontSize: 24,
},
});