import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Image, Animated, Dimensions, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SW, height: SH } = Dimensions.get('window');
const ICON = require('../../../assets/icon.png');

// ── Floating orb ──────────────────────────────────────────────────────────────
function FloatingOrb({ size, color, startX, startY, duration, delay }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, delay, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.1, 0.2, 0.1] });
  return (
    <Animated.View style={{
      position: 'absolute', left: startX, top: startY,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color, transform: [{ translateY }], opacity,
    }} />
  );
}

// ── Game card ─────────────────────────────────────────────────────────────────
function GameCard({ emoji, secondEmoji, title, description, tag, tagColor, gradientColors, glowColor, onPress, delay }) {
  const slideY = useRef(new Animated.Value(70)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideY, { toValue: 0, duration: 520, delay, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 480, delay, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, delay, friction: 7, tension: 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const onPressIn = () => Animated.spring(pressScale, { toValue: 0.96, useNativeDriver: true, friction: 6 }).start();
  const onPressOut = () => Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, friction: 6 }).start();

  return (
    <Animated.View style={{ opacity, transform: [{ translateY: slideY }, { scale }, { scale: pressScale }] }}>
      <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1}>
        <LinearGradient
          colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[cs.card, { shadowColor: glowColor }]}
        >
          <View style={[cs.cornerGlow, { backgroundColor: glowColor + '28' }]} />
          <View style={cs.cardLeft}>
            <View style={[cs.emojiBox, { backgroundColor: glowColor + '22', borderColor: glowColor + '55' }]}>
              <Text style={cs.mainEmoji}>{emoji}</Text>
              {secondEmoji && <Text style={cs.secondEmoji}>{secondEmoji}</Text>}
            </View>
          </View>
          <View style={cs.cardBody}>
            <View style={cs.titleRow}>
              <Text style={cs.cardTitle}>{title}</Text>
              <View style={[cs.tag, { backgroundColor: tagColor + '22', borderColor: tagColor + '55' }]}>
                <Text style={[cs.tagTxt, { color: tagColor }]}>{tag}</Text>
              </View>
            </View>
            <Text style={cs.cardDesc}>{description}</Text>
          </View>
          <View style={[cs.arrowCircle, { borderColor: glowColor + '55' }]}>
            <Text style={[cs.arrowTxt, { color: glowColor }]}>›</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const cs = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 18, marginVertical: 7, borderRadius: 22,
    padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 18, elevation: 12,
    overflow: 'hidden',
  },
  cornerGlow: { position: 'absolute', right: -24, top: -24, width: 90, height: 90, borderRadius: 45 },
  cardLeft: { marginRight: 14 },
  emojiBox: { width: 62, height: 62, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  mainEmoji: { fontSize: 30 },
  secondEmoji: { position: 'absolute', bottom: 4, right: 4, fontSize: 14 },
  cardBody: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  cardTitle: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, borderWidth: 1 },
  tagTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  cardDesc: { color: 'rgba(255,255,255,0.45)', fontSize: 12, lineHeight: 17 },
  arrowCircle: { marginLeft: 10, width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  arrowTxt: { fontSize: 22, fontWeight: '700', marginTop: -2 },
});

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MainMenu({ navigation }) {
  const logoScale = useRef(new Animated.Value(0.55)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(-28)).current;
  const titleOp = useRef(new Animated.Value(0)).current;
  const subOp = useRef(new Animated.Value(0)).current;
  const dividerScale = useRef(new Animated.Value(0)).current;  // scaleX — native driver safe
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleSlide, { toValue: 0, duration: 360, useNativeDriver: true }),
        Animated.timing(titleOp, { toValue: 1, duration: 360, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(subOp, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(dividerScale, { toValue: 1, duration: 340, useNativeDriver: true }),
      ]),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.055, duration: 1900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1900, useNativeDriver: true }),
      ])
    );
    setTimeout(() => pulse.start(), 900);
    return () => pulse.stop();
  }, []);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={['#04040f', '#0a0520', '#130835', '#0c1a3d']}
        locations={[0, 0.3, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />

      <FloatingOrb size={220} color="#6c3fc4" startX={-70} startY={60} duration={3800} delay={0} />
      <FloatingOrb size={150} color="#1a56db" startX={SW - 90} startY={170} duration={4200} delay={600} />
      <FloatingOrb size={110} color="#7c3aed" startX={SW * 0.3} startY={SH * 0.45} duration={3400} delay={300} />
      <FloatingOrb size={90} color="#0ea5e9" startX={SW * 0.6} startY={SH * 0.7} duration={5000} delay={900} />
      <FloatingOrb size={70} color="#e91e8c" startX={SW * 0.1} startY={SH * 0.62} duration={4600} delay={400} />

      {[...Array(22)].map((_, i) => (
        <View key={i} style={{
          position: 'absolute',
          left: (i * 137.5) % SW, top: (i * 83.7) % SH,
          width: i % 3 === 0 ? 2.5 : 1.5, height: i % 3 === 0 ? 2.5 : 1.5,
          borderRadius: 2,
          backgroundColor: `rgba(255,255,255,${0.08 + (i % 4) * 0.06})`,
        }} />
      ))}

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Brand ── */}
        <View style={s.brand}>
          <Animated.View style={[s.iconWrap, { transform: [{ scale: logoScale }, { scale: pulseAnim }], opacity: logoOpacity }]}>
            <LinearGradient colors={['#7c3aed', '#4338ca']} style={s.iconGrad}>
              <Image source={ICON} style={s.icon} />
            </LinearGradient>
            <View style={s.iconGlow} />
          </Animated.View>

          <View style={s.brandText}>
            <Animated.Text style={[s.brandName, { transform: [{ translateX: titleSlide }], opacity: titleOp }]}>
              BizFun
            </Animated.Text>
            {/* Divider via scaleX — NO useNativeDriver:false needed */}
            <Animated.View style={[s.divider, { transform: [{ scaleX: dividerScale }], opacity: subOp }]} />
            <Animated.Text style={[s.brandSub, { opacity: subOp }]}>GAME ARCADE</Animated.Text>
          </View>
        </View>

        <Animated.Text style={[s.sectionLabel, { opacity: subOp }]}>CHOOSE YOUR GAME</Animated.Text>

        {/* ── 4 Game Cards ── */}
        <GameCard
          emoji="🧩"
          title="Puzzle Game"
          description="Slide tiles to reassemble the image"
          tag="CLASSIC"
          tagColor="#a78bfa"
          gradientColors={['#1a0a3d', '#2d1a6e', '#1e1050']}
          glowColor="#7c3aed"
          onPress={() => navigation.replace('Home')}
          delay={320}
        />
        <GameCard
          emoji="🐍"
          title="Snake Game"
          description="Eat, grow & beat your high score"
          tag="ARCADE"
          tagColor="#4ade80"
          gradientColors={['#061c12', '#0d3320', '#07231a']}
          glowColor="#22c55e"
          onPress={() => navigation.navigate('Snake')}
          delay={440}
        />
        <GameCard
          emoji="🍉"
          secondEmoji="💣"
          title="Fruit Slicer"
          description="Slice fruits, dodge bombs, chain combos!"
          tag="ACTION"
          tagColor="#ff6ec7"
          gradientColors={['#2a0020', '#4a0035', '#2d001e']}
          glowColor="#ff3b8e"
          onPress={() => navigation.navigate('FruitSlicer')}
          delay={560}
        />
        <GameCard
          emoji="🐦"
          secondEmoji="🌿"
          title="Birdy Bird"
          description="Flap through pipes, chase the high score!"
          tag="ENDLESS"
          tagColor="#38bdf8"
          gradientColors={['#031525', '#062a4a', '#041e38']}
          glowColor="#0ea5e9"
          onPress={() => navigation.navigate('BirdyBird')}
          delay={680}
        />
        <GameCard
          emoji="✕"
          secondEmoji="○"
          title="XOX Game"
          description="Beat the AI or play with a friend!"
          tag="STRATEGY"
          tagColor="#facc15"
          gradientColors={['#1a1500', '#2d2600', '#1e1a00']}
          glowColor="#eab308"
          onPress={() => navigation.navigate('XOX')}
          delay={800}
        />

        <Animated.Text style={[s.footer, { opacity: subOp }]}>✦  Tap a game to begin  ✦</Animated.Text>
        <Animated.Text style={[s.footer, { opacity: subOp }]}>✦  Developed by Venkat S - Software Engineer  ✦</Animated.Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingTop: 60, paddingBottom: 30 },

  brand: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 28, marginBottom: 28 },
  iconWrap: { marginRight: 16, position: 'relative' },
  iconGrad: { width: 76, height: 76, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(167,139,250,0.4)' },
  icon: { width: 54, height: 54, borderRadius: 10 },
  iconGlow: { position: 'absolute', width: 76, height: 76, borderRadius: 22, shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 22, elevation: 0 },
  brandText: { flex: 1 },
  brandName: { color: '#fff', fontSize: 38, fontWeight: '900', letterSpacing: -1, lineHeight: 42 },
  divider: { width: '60%', height: 2, backgroundColor: '#7c3aed', borderRadius: 2, marginVertical: 5, transformOrigin: 'left' },
  brandSub: { color: 'rgba(167,139,250,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 4 },

  sectionLabel: { color: 'rgba(255,255,255,0.22)', fontSize: 10, fontWeight: '800', letterSpacing: 4, textAlign: 'center', marginBottom: 10 },
  footer: { color: 'rgba(255,255,255,0.16)', fontSize: 11, textAlign: 'center', marginTop: 24, letterSpacing: 2 },
});