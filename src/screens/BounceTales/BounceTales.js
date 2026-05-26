import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Dimensions, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SW, height: SH } = Dimensions.get('window');

// ── Physics ───────────────────────────────────────────────────────────────────
const BALL_R     = 20;
const GRAVITY    = 0.58;
const JUMP_POWER = -17.5;
const MOVE_SPEED = 5.5;
const FRICTION   = 0.80;
const FPS_MS     = 16;
const FLOOR_Y    = SH - 90;

// ── Level definitions ─────────────────────────────────────────────────────────
// Each level: sky colors, ground color, platform configs, coin multiplier, has spikes, moving platforms
const LEVEL_CONFIGS = [
  // LVL 1 – Green meadow, easy
  {
    name: 'Green Meadow', num: 1,
    sky: ['#87ceeb', '#b0e0ff'],
    groundTop: '#5cb82e', groundBody: '#3a7d1e',
    platTop: '#5cb82e', platBody: '#3a7d1e',
    coinMult: 1,
    coinsPerPlat: [2, 2],
    flowers: ['🌸','🌺','🌼'],
    spikes: false, moving: false,
    defs: [
      {x:180, y:FLOOR_Y-110, w:160},
      {x:400, y:FLOOR_Y-190, w:140},
      {x:610, y:FLOOR_Y-130, w:150},
      {x:820, y:FLOOR_Y-240, w:130},
      {x:1040,y:FLOOR_Y-160, w:140},
      {x:1260,y:FLOOR_Y-220, w:120},
      {x:1460,y:FLOOR_Y-140, w:150},
      {x:1680,y:FLOOR_Y-280, w:130},
      {x:1880,y:FLOOR_Y-190, w:140},
      {x:2080,y:FLOOR_Y-130, w:160},
    ],
    goalX: 2320,
  },
  // LVL 2 – Forest, slightly tighter gaps
  {
    name: 'Deep Forest', num: 2,
    sky: ['#2d5a1b', '#4a8c2a', '#87ceeb'],
    groundTop: '#4a8c2a', groundBody: '#2d5a1b',
    platTop: '#4a8c2a', platBody: '#2d5a1b',
    coinMult: 1,
    coinsPerPlat: [2, 3],
    flowers: ['🌿','🍃','🌳'],
    spikes: false, moving: false,
    defs: [
      {x:180, y:FLOOR_Y-110, w:160},
      {x:430, y:FLOOR_Y-210, w:110},
      {x:640, y:FLOOR_Y-150, w:120},
      {x:860, y:FLOOR_Y-270, w:100},
      {x:1060,y:FLOOR_Y-180, w:115},
      {x:1280,y:FLOOR_Y-250, w:100},
      {x:1490,y:FLOOR_Y-160, w:120},
      {x:1710,y:FLOOR_Y-300, w:100},
      {x:1920,y:FLOOR_Y-210, w:110},
      {x:2140,y:FLOOR_Y-150, w:130},
      {x:2360,y:FLOOR_Y-240, w:110},
    ],
    goalX: 2600,
  },
  // LVL 3 – Desert, first spikes appear, wider gaps
  {
    name: 'Sandy Desert', num: 3,
    sky: ['#fde68a', '#fbbf24', '#f97316'],
    groundTop: '#d97706', groundBody: '#92400e',
    platTop: '#d97706', platBody: '#92400e',
    coinMult: 2,
    coinsPerPlat: [2, 3],
    flowers: ['🌵','🌵','🏜️'],
    spikes: true, spikeChance: 0.25,
    moving: false,
    defs: [
      {x:180, y:FLOOR_Y-110, w:160},
      {x:460, y:FLOOR_Y-220, w:100},
      {x:670, y:FLOOR_Y-160, w:110},
      {x:900, y:FLOOR_Y-290, w:90},
      {x:1110,y:FLOOR_Y-190, w:100},
      {x:1340,y:FLOOR_Y-270, w:90},
      {x:1560,y:FLOOR_Y-170, w:100},
      {x:1790,y:FLOOR_Y-320, w:85},
      {x:2010,y:FLOOR_Y-230, w:100},
      {x:2240,y:FLOOR_Y-160, w:110},
      {x:2470,y:FLOOR_Y-280, w:90},
      {x:2700,y:FLOOR_Y-200, w:100},
    ],
    goalX: 2950,
  },
  // LVL 4 – Ice cave, slippery (low friction), moving platforms start
  {
    name: 'Ice Caves', num: 4,
    sky: ['#0c4a6e', '#075985', '#0ea5e9'],
    groundTop: '#7dd3fc', groundBody: '#0369a1',
    platTop: '#bae6fd', platBody: '#0284c7',
    coinMult: 2,
    coinsPerPlat: [3, 4],
    flowers: ['❄️','🧊','❄️'],
    spikes: true, spikeChance: 0.3,
    moving: true, movingChance: 0.3,
    friction: 0.90,
    defs: [
      {x:180, y:FLOOR_Y-110, w:160},
      {x:470, y:FLOOR_Y-230, w:95},
      {x:690, y:FLOOR_Y-170, w:100},
      {x:920, y:FLOOR_Y-300, w:85},
      {x:1140,y:FLOOR_Y-200, w:95},
      {x:1370,y:FLOOR_Y-280, w:85},
      {x:1600,y:FLOOR_Y-180, w:95},
      {x:1830,y:FLOOR_Y-330, w:80},
      {x:2060,y:FLOOR_Y-240, w:90},
      {x:2300,y:FLOOR_Y-170, w:100},
      {x:2540,y:FLOOR_Y-310, w:80},
      {x:2780,y:FLOOR_Y-220, w:90},
      {x:3010,y:FLOOR_Y-160, w:100},
    ],
    goalX: 3260,
  },
  // LVL 5 – Lava world, lots of spikes, bigger gaps
  {
    name: 'Lava World', num: 5,
    sky: ['#1c0a00', '#450a0a', '#7f1d1d'],
    groundTop: '#dc2626', groundBody: '#7f1d1d',
    platTop: '#f97316', platBody: '#c2410c',
    coinMult: 3,
    coinsPerPlat: [3, 4],
    flowers: ['🔥','💀','🔥'],
    spikes: true, spikeChance: 0.45,
    moving: true, movingChance: 0.4,
    defs: [
      {x:180, y:FLOOR_Y-110, w:160},
      {x:510, y:FLOOR_Y-250, w:85},
      {x:740, y:FLOOR_Y-180, w:90},
      {x:980, y:FLOOR_Y-320, w:80},
      {x:1210,y:FLOOR_Y-210, w:85},
      {x:1460,y:FLOOR_Y-300, w:80},
      {x:1700,y:FLOOR_Y-190, w:90},
      {x:1950,y:FLOOR_Y-350, w:75},
      {x:2190,y:FLOOR_Y-260, w:80},
      {x:2440,y:FLOOR_Y-180, w:90},
      {x:2690,y:FLOOR_Y-330, w:75},
      {x:2940,y:FLOOR_Y-230, w:85},
      {x:3190,y:FLOOR_Y-170, w:95},
      {x:3440,y:FLOOR_Y-290, w:80},
    ],
    goalX: 3700,
  },
  // LVL 6 – Night city, fast moving platforms
  {
    name: 'Night City', num: 6,
    sky: ['#0f0f23', '#1a1a3e', '#2d2b55'],
    groundTop: '#6d28d9', groundBody: '#4c1d95',
    platTop: '#8b5cf6', platBody: '#5b21b6',
    coinMult: 3,
    coinsPerPlat: [3, 5],
    flowers: ['🌆','💜','⭐'],
    spikes: true, spikeChance: 0.45,
    moving: true, movingChance: 0.5, movingSpeed: 1.8,
    defs: [
      {x:180, y:FLOOR_Y-110, w:160},
      {x:530, y:FLOOR_Y-260, w:80},
      {x:770, y:FLOOR_Y-190, w:85},
      {x:1020,y:FLOOR_Y-330, w:75},
      {x:1260,y:FLOOR_Y-220, w:80},
      {x:1510,y:FLOOR_Y-310, w:75},
      {x:1760,y:FLOOR_Y-200, w:85},
      {x:2020,y:FLOOR_Y-360, w:70},
      {x:2270,y:FLOOR_Y-270, w:75},
      {x:2530,y:FLOOR_Y-190, w:85},
      {x:2790,y:FLOOR_Y-340, w:70},
      {x:3050,y:FLOOR_Y-240, w:80},
      {x:3310,y:FLOOR_Y-180, w:90},
      {x:3570,y:FLOOR_Y-300, w:75},
      {x:3830,y:FLOOR_Y-230, w:80},
    ],
    goalX: 4100,
  },
  // LVL 7 – Sky temple, very narrow platforms, big gaps
  {
    name: 'Sky Temple', num: 7,
    sky: ['#eff6ff', '#bfdbfe', '#93c5fd'],
    groundTop: '#fbbf24', groundBody: '#d97706',
    platTop: '#fde68a', platBody: '#f59e0b',
    coinMult: 4,
    coinsPerPlat: [4, 5],
    flowers: ['🏛️','✨','☁️'],
    spikes: true, spikeChance: 0.5,
    moving: true, movingChance: 0.55, movingSpeed: 2.0,
    defs: [
      {x:180, y:FLOOR_Y-110, w:160},
      {x:570, y:FLOOR_Y-270, w:70},
      {x:820, y:FLOOR_Y-200, w:75},
      {x:1080,y:FLOOR_Y-340, w:65},
      {x:1330,y:FLOOR_Y-230, w:70},
      {x:1590,y:FLOOR_Y-320, w:65},
      {x:1850,y:FLOOR_Y-210, w:75},
      {x:2120,y:FLOOR_Y-370, w:60},
      {x:2380,y:FLOOR_Y-280, w:65},
      {x:2650,y:FLOOR_Y-200, w:75},
      {x:2920,y:FLOOR_Y-350, w:60},
      {x:3190,y:FLOOR_Y-250, w:70},
      {x:3460,y:FLOOR_Y-190, w:80},
      {x:3730,y:FLOOR_Y-310, w:65},
      {x:4000,y:FLOOR_Y-240, w:70},
      {x:4270,y:FLOOR_Y-180, w:80},
    ],
    goalX: 4550,
  },
  // LVL 8 – Haunted graveyard, very spikey, fast movers
  {
    name: 'Haunted Yard', num: 8,
    sky: ['#0d0d0d', '#1a0a2e', '#2d1b4e'],
    groundTop: '#374151', groundBody: '#1f2937',
    platTop: '#4b5563', platBody: '#374151',
    coinMult: 4,
    coinsPerPlat: [4, 6],
    flowers: ['👻','💀','🕷️'],
    spikes: true, spikeChance: 0.6,
    moving: true, movingChance: 0.6, movingSpeed: 2.4,
    defs: [
      {x:180, y:FLOOR_Y-110, w:160},
      {x:590, y:FLOOR_Y-280, w:65},
      {x:860, y:FLOOR_Y-210, w:70},
      {x:1130,y:FLOOR_Y-350, w:60},
      {x:1400,y:FLOOR_Y-240, w:65},
      {x:1670,y:FLOOR_Y-330, w:60},
      {x:1950,y:FLOOR_Y-220, w:70},
      {x:2230,y:FLOOR_Y-380, w:55},
      {x:2510,y:FLOOR_Y-290, w:60},
      {x:2790,y:FLOOR_Y-210, w:70},
      {x:3070,y:FLOOR_Y-360, w:55},
      {x:3350,y:FLOOR_Y-260, w:65},
      {x:3630,y:FLOOR_Y-200, w:75},
      {x:3910,y:FLOOR_Y-320, w:60},
      {x:4190,y:FLOOR_Y-250, w:65},
      {x:4470,y:FLOOR_Y-190, w:75},
    ],
    goalX: 4760,
  },
  // LVL 9 – Volcano peak, extreme spikes, tiny platforms
  {
    name: 'Volcano Peak', num: 9,
    sky: ['#1c0000', '#3b0000', '#7f1d1d'],
    groundTop: '#ef4444', groundBody: '#991b1b',
    platTop: '#fbbf24', platBody: '#d97706',
    coinMult: 5,
    coinsPerPlat: [5, 6],
    flowers: ['🌋','🔥','💥'],
    spikes: true, spikeChance: 0.7,
    moving: true, movingChance: 0.65, movingSpeed: 2.8,
    defs: [
      {x:180, y:FLOOR_Y-110, w:160},
      {x:620, y:FLOOR_Y-290, w:60},
      {x:910, y:FLOOR_Y-220, w:65},
      {x:1200,y:FLOOR_Y-360, w:55},
      {x:1480,y:FLOOR_Y-250, w:60},
      {x:1760,y:FLOOR_Y-340, w:55},
      {x:2060,y:FLOOR_Y-230, w:65},
      {x:2370,y:FLOOR_Y-390, w:50},
      {x:2670,y:FLOOR_Y-300, w:55},
      {x:2970,y:FLOOR_Y-220, w:65},
      {x:3270,y:FLOOR_Y-370, w:50},
      {x:3570,y:FLOOR_Y-270, w:60},
      {x:3870,y:FLOOR_Y-210, w:70},
      {x:4170,y:FLOOR_Y-330, w:55},
      {x:4470,y:FLOOR_Y-260, w:60},
      {x:4770,y:FLOOR_Y-200, w:70},
      {x:5070,y:FLOOR_Y-350, w:50},
    ],
    goalX: 5350,
  },
  // LVL 10 – Final boss stage: EXTREME. Tiny platforms, max speed movers, spikes everywhere
  {
    name: 'FINAL STAGE', num: 10,
    sky: ['#000000', '#0a0010', '#1a0030'],
    groundTop: '#7c3aed', groundBody: '#4c1d95',
    platTop: '#a78bfa', platBody: '#6d28d9',
    coinMult: 6,
    coinsPerPlat: [5, 8],
    flowers: ['👑','⚡','💎'],
    spikes: true, spikeChance: 0.75,
    moving: true, movingChance: 0.75, movingSpeed: 3.2,
    defs: [
      {x:180, y:FLOOR_Y-110, w:160},
      {x:660, y:FLOOR_Y-310, w:55},
      {x:970, y:FLOOR_Y-240, w:60},
      {x:1280,y:FLOOR_Y-380, w:50},
      {x:1590,y:FLOOR_Y-270, w:55},
      {x:1910,y:FLOOR_Y-360, w:50},
      {x:2240,y:FLOOR_Y-250, w:60},
      {x:2580,y:FLOOR_Y-410, w:45},
      {x:2920,y:FLOOR_Y-320, w:50},
      {x:3260,y:FLOOR_Y-240, w:60},
      {x:3600,y:FLOOR_Y-390, w:45},
      {x:3940,y:FLOOR_Y-290, w:55},
      {x:4280,y:FLOOR_Y-220, w:65},
      {x:4620,y:FLOOR_Y-350, w:50},
      {x:4960,y:FLOOR_Y-280, w:55},
      {x:5300,y:FLOOR_Y-210, w:65},
      {x:5640,y:FLOOR_Y-370, w:45},
      {x:5980,y:FLOOR_Y-300, w:50},
    ],
    goalX: 6280,
  },
];

// ── Build level from config ───────────────────────────────────────────────────
function buildLevel(cfg) {
  const platforms = [];
  const coins     = [];
  const spikes    = [];
  const flowers   = [];
  const LEVEL_W   = cfg.goalX + 300;

  // Ground
  platforms.push({ id: 'ground', x: 0, y: FLOOR_Y, w: LEVEL_W, h: 60, isGround: true, moving: false });

  cfg.defs.forEach((d, i) => {
    const isMoving = cfg.moving && Math.random() < (cfg.movingChance || 0.3);
    const mSpeed = isMoving ? ((cfg.movingSpeed || 1.5) * (Math.random() > 0.5 ? 1 : -1)) : 0;
    const mRange = isMoving ? (60 + Math.random() * 80) : 0;
    platforms.push({
      id: i, x: d.x, y: d.y, w: d.w, h: 18,
      moving: isMoving, mSpeed, mRange,
      mOriginX: d.x, mPhase: Math.random() * Math.PI * 2,
    });

    // Coins
    const nc = cfg.coinsPerPlat[0] + Math.floor(Math.random() * (cfg.coinsPerPlat[1] - cfg.coinsPerPlat[0] + 1));
    for (let c = 0; c < nc; c++) {
      coins.push({ id: `c${i}_${c}`, x: d.x + 18 + c * 26, y: d.y - 34, collected: false, mult: cfg.coinMult });
    }

    // Spikes on ground below platform (danger zone)
    if (cfg.spikes && Math.random() < (cfg.spikeChance || 0.3)) {
      spikes.push({ id: `s${i}`, x: d.x + d.w * 0.1, y: FLOOR_Y - 20, w: d.w * 0.8 });
    }
  });

  // Ground flowers
  for (let fx = 80; fx < LEVEL_W - 200; fx += 180 + Math.floor(Math.random() * 150)) {
    flowers.push({ x: fx, icon: cfg.flowers[Math.floor(Math.random() * cfg.flowers.length)] });
  }

  return { platforms, coins, spikes, flowers, goal: { x: cfg.goalX, y: FLOOR_Y - 130 }, levelW: LEVEL_W };
}

// ── Sub-components ────────────────────────────────────────────────────────────
function CoinView({ cx, cy, camX, mult }) {
  const sx = cx - camX;
  if (sx < -30 || sx > SW + 30) return null;
  const colors = mult >= 5 ? ['#c084fc','#a855f7'] : mult >= 3 ? ['#f97316','#ea580c'] : ['#facc15','#f59e0b'];
  return (
    <View style={{ position:'absolute', left:sx-12, top:cy-12, width:24, height:24, borderRadius:12,
      backgroundColor:colors[0], alignItems:'center', justifyContent:'center',
      borderWidth:2, borderColor:colors[1],
      shadowColor:colors[0], shadowOpacity:0.9, shadowRadius:6, shadowOffset:{width:0,height:0}, elevation:6 }}>
      <Text style={{ fontSize:11, fontWeight:'900', color:'#fff' }}>★</Text>
    </View>
  );
}

function PlatformView({ p, camX, cfg, tick }) {
  let wx = p.x;
  if (p.moving) {
    wx = p.mOriginX + Math.sin((tick * 0.04) + p.mPhase) * p.mRange;
  }
  const sx = wx - camX;
  if (sx + p.w < -20 || sx > SW + 20) return null;
  if (p.isGround) {
    return (
      <View style={{ position:'absolute', left:sx, top:p.y, width:p.w, height:p.h }}>
        <LinearGradient colors={[cfg.groundTop, cfg.groundBody, cfg.groundBody]}
          style={{ flex:1, borderTopLeftRadius:6, borderTopRightRadius:6 }} />
        {[...Array(Math.ceil(Math.min(p.w, SW*2) / 40))].map((_,i) => (
          <View key={i} style={{ position:'absolute', left:i*40+5, top:-7, width:30, height:14, borderRadius:10, backgroundColor:cfg.groundTop }} />
        ))}
      </View>
    );
  }
  return (
    <View style={{ position:'absolute', left:sx, top:p.y, width:p.w, height:p.h+6 }}>
      <View style={{ height:10, backgroundColor:cfg.platTop, borderTopLeftRadius:8, borderTopRightRadius:8,
        borderWidth:1, borderColor:cfg.platBody }} />
      <View style={{ flex:1, backgroundColor:cfg.platBody, borderBottomLeftRadius:4, borderBottomRightRadius:4 }} />
      {p.moving && (
        <View style={{ position:'absolute', top:-8, right:6, backgroundColor:'#facc15', borderRadius:4, paddingHorizontal:4, paddingVertical:1 }}>
          <Text style={{ fontSize:7, fontWeight:'900', color:'#000' }}>MOV</Text>
        </View>
      )}
    </View>
  );
}

function SpikeView({ sp, camX }) {
  const sx = sp.x - camX;
  if (sx + sp.w < -10 || sx > SW + 10) return null;
  const count = Math.max(2, Math.floor(sp.w / 18));
  return (
    <View style={{ position:'absolute', left:sx, top:sp.y, flexDirection:'row', alignItems:'flex-end' }}>
      {[...Array(count)].map((_,i) => (
        <View key={i} style={{ width:0, height:0, borderLeftWidth:9, borderRightWidth:9, borderBottomWidth:20,
          borderLeftColor:'transparent', borderRightColor:'transparent', borderBottomColor:'#ef4444', marginHorizontal:0 }} />
      ))}
    </View>
  );
}

function FlowerView({ flower, camX }) {
  const sx = flower.x - camX;
  if (sx < -30 || sx > SW + 30) return null;
  return <Text style={{ position:'absolute', left:sx, top:FLOOR_Y-44, fontSize:28 }}>{flower.icon}</Text>;
}

function Particle({ x, y, color }) {
  const anim = useRef(new Animated.Value(1)).current;
  const ty   = useRef(new Animated.Value(0)).current;
  const tx   = useRef(new Animated.Value((Math.random()-0.5)*50)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim, { toValue:0, duration:500, useNativeDriver:true }),
      Animated.timing(ty,   { toValue:-(20+Math.random()*30), duration:500, useNativeDriver:true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ position:'absolute', left:x-5, top:y-5, width:10, height:10, borderRadius:5,
      backgroundColor:color, opacity:anim, transform:[{translateY:ty},{translateX:tx}] }} />
  );
}

// ── Level Select Screen ───────────────────────────────────────────────────────
function LevelSelect({ onSelect, onBack, highScores, completedLevels }) {
  return (
    <View style={ss.root}>
      <LinearGradient colors={['#0a0520','#130835','#0c1a3d']} style={StyleSheet.absoluteFill} />
      <View style={ss.header}>
        <TouchableOpacity onPress={onBack} style={ss.backBtn}>
          <Text style={ss.backTxt}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={ss.title}>SELECT LEVEL</Text>
      </View>
      <View style={ss.grid}>
        {LEVEL_CONFIGS.map((cfg) => {
          const locked = cfg.num > 1 && !completedLevels.includes(cfg.num - 1);
          const done   = completedLevels.includes(cfg.num);
          const hs     = highScores[cfg.num] || 0;
          const stars  = done ? (hs >= cfg.num * 80 ? 3 : hs >= cfg.num * 40 ? 2 : 1) : 0;
          return (
            <TouchableOpacity key={cfg.num} style={[ss.card, locked && ss.cardLocked, done && ss.cardDone]}
              onPress={() => !locked && onSelect(cfg.num)} activeOpacity={locked ? 1 : 0.8}>
              <LinearGradient
                colors={locked ? ['#1f1f1f','#2d2d2d'] : done ? ['#14532d','#166534'] : ['#1e1b4b','#312e81']}
                style={ss.cardGrad}>
                {locked ? (
                  <Text style={ss.lockIcon}>🔒</Text>
                ) : (
                  <>
                    <Text style={ss.lvlNum}>{cfg.num}</Text>
                    <Text style={ss.lvlName} numberOfLines={1}>{cfg.name}</Text>
                    <View style={ss.stars}>
                      {[1,2,3].map(s => <Text key={s} style={{ fontSize:14, opacity: s<=stars ? 1 : 0.2 }}>⭐</Text>)}
                    </View>
                    {hs > 0 && <Text style={ss.hs}>Best: {hs}</Text>}
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const ss = StyleSheet.create({
  root: { flex:1 },
  header: { paddingTop:52, paddingHorizontal:20, paddingBottom:16, flexDirection:'row', alignItems:'center' },
  backBtn: { marginRight:16 },
  backTxt: { color:'rgba(255,255,255,0.7)', fontSize:17, fontWeight:'700' },
  title: { color:'#fff', fontSize:22, fontWeight:'900', letterSpacing:3 },
  grid: { flexDirection:'row', flexWrap:'wrap', paddingHorizontal:16, gap:10 },
  card: { width:(SW-52)/2, borderRadius:16, overflow:'hidden' },
  cardLocked: { opacity:0.55 },
  cardDone: {},
  cardGrad: { padding:16, alignItems:'center', minHeight:100, justifyContent:'center',
    borderWidth:1, borderColor:'rgba(255,255,255,0.08)', borderRadius:16 },
  lockIcon: { fontSize:30 },
  lvlNum: { color:'#fff', fontSize:28, fontWeight:'900' },
  lvlName: { color:'rgba(255,255,255,0.65)', fontSize:10, fontWeight:'700', letterSpacing:1, marginTop:2 },
  stars: { flexDirection:'row', gap:2, marginTop:6 },
  hs: { color:'rgba(250,204,21,0.8)', fontSize:10, fontWeight:'700', marginTop:4 },
});

// ── Main Game ─────────────────────────────────────────────────────────────────
export default function BounceTales({ navigation }) {
  const [screen, setScreen]     = useState('menu'); // menu | levelselect | game
  const [currentLevel, setCurrentLevel] = useState(1);
  const [gameState, setGameState] = useState('idle'); // idle | playing | dead | win
  const [score, setScore]       = useState(0);
  const [highScores, setHighScores] = useState({});
  const [completedLevels, setCompletedLevels] = useState([]);
  const [renderTick, setRenderTick] = useState(0);
  const [particles, setParticles] = useState([]);
  const [gameTick, setGameTick] = useState(0); // for moving platforms

  const ballX    = useRef(60);
  const ballY    = useRef(FLOOR_Y - BALL_R * 2 - 2);
  const velX     = useRef(0);
  const velY     = useRef(0);
  const camX     = useRef(0);
  const leftHeld  = useRef(false);
  const rightHeld = useRef(false);
  const levelRef  = useRef(null);
  const cfgRef    = useRef(null);
  const coinsRef  = useRef([]);
  const scoreRef  = useRef(0);
  const loopRef   = useRef(null);
  const stateRef  = useRef('idle');
  const partIdRef = useRef(0);
  const tickRef   = useRef(0);

  useEffect(() => { stateRef.current = gameState; }, [gameState]);

  const spawnParticles = useCallback((x, y, color='#facc15') => {
    const id = partIdRef.current++;
    setParticles(p => [...p.slice(-12), { id, x, y, color }]);
    setTimeout(() => setParticles(p => p.filter(pp => pp.id !== id)), 600);
  }, []);

  const loadLevel = useCallback((lvlNum) => {
    const cfg = LEVEL_CONFIGS[lvlNum - 1];
    cfgRef.current = cfg;
    const built = buildLevel(cfg);
    levelRef.current = built;
    coinsRef.current = built.coins.map(c => ({ ...c }));
    ballX.current = 60;
    ballY.current = FLOOR_Y - BALL_R * 2 - 2;
    velX.current  = 0;
    velY.current  = 0;
    camX.current  = 0;
    scoreRef.current = 0;
    tickRef.current = 0;
    setScore(0);
    setParticles([]);
    setGameTick(0);
  }, []);

  const startLevel = useCallback((lvlNum) => {
    setCurrentLevel(lvlNum);
    loadLevel(lvlNum);
    setScreen('game');
    setGameState('playing');
    stateRef.current = 'playing';
  }, [loadLevel]);

  const restartLevel = useCallback(() => {
    loadLevel(currentLevel);
    setGameState('playing');
    stateRef.current = 'playing';
  }, [currentLevel, loadLevel]);

  // ── Game loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'game' || gameState !== 'playing') {
      if (loopRef.current) clearInterval(loopRef.current);
      return;
    }
    const cfg = cfgRef.current;
    const friction = cfg.friction || FRICTION;

    loopRef.current = setInterval(() => {
      tickRef.current += 1;

      // Input
      if (leftHeld.current)  velX.current -= 1.1;
      if (rightHeld.current) velX.current += 1.1;
      if (velX.current >  MOVE_SPEED) velX.current =  MOVE_SPEED;
      if (velX.current < -MOVE_SPEED) velX.current = -MOVE_SPEED;
      if (!leftHeld.current && !rightHeld.current) velX.current *= friction;

      velY.current += GRAVITY;
      ballX.current += velX.current;
      ballY.current += velY.current;

      const { levelW } = levelRef.current;
      if (ballX.current < BALL_R)         { ballX.current = BALL_R;         velX.current = 0; }
      if (ballX.current > levelW - BALL_R) { ballX.current = levelW - BALL_R; velX.current = 0; }

      // Compute moving platform positions
      const tick = tickRef.current;
      const { platforms } = levelRef.current;
      const computedX = (p) => p.moving
        ? p.mOriginX + Math.sin(tick * 0.04 + p.mPhase) * p.mRange
        : p.x;

      // Platform collision
      for (const p of platforms) {
        const px  = computedX(p);
        const bL  = ballX.current - BALL_R;
        const bR  = ballX.current + BALL_R;
        const bT  = ballY.current - BALL_R;
        const bB  = ballY.current + BALL_R;
        const overX = bR > px && bL < px + p.w;
        const overY = bB > p.y && bT < p.y + p.h;
        if (overX && overY) {
          const fromTop = velY.current >= 0 && bB - velY.current <= p.y + 5;
          if (fromTop) {
            ballY.current = p.y - BALL_R;
            velY.current  = p.isGround ? JUMP_POWER * 0.82 : JUMP_POWER;
            if (!p.isGround) spawnParticles(ballX.current, ballY.current + BALL_R, cfg.platTop);
            // Moving platform carries ball horizontally
            if (p.moving) ballX.current += Math.cos(tick * 0.04 + p.mPhase) * p.mRange * 0.04 * p.mSpeed;
          } else {
            const fromLeft  = velX.current > 0 && bR - velX.current <= px + 4;
            const fromRight = velX.current < 0 && bL - velX.current >= px + p.w - 4;
            if (fromLeft)  { ballX.current = px - BALL_R;         velX.current = -velX.current * 0.4; }
            if (fromRight) { ballX.current = px + p.w + BALL_R;   velX.current = -velX.current * 0.4; }
          }
        }
      }

      // Spike collision
      if (cfg.spikes) {
        for (const sp of levelRef.current.spikes) {
          if (ballX.current > sp.x && ballX.current < sp.x + sp.w && ballY.current + BALL_R > sp.y) {
            clearInterval(loopRef.current);
            setHighScores(h => ({ ...h, [currentLevel]: Math.max(h[currentLevel]||0, scoreRef.current) }));
            setGameState('dead');
            stateRef.current = 'dead';
            return;
          }
        }
      }

      // Fell off bottom
      if (ballY.current > SH + 80) {
        clearInterval(loopRef.current);
        setHighScores(h => ({ ...h, [currentLevel]: Math.max(h[currentLevel]||0, scoreRef.current) }));
        setGameState('dead');
        stateRef.current = 'dead';
        return;
      }

      // Coins
      coinsRef.current.forEach(coin => {
        if (coin.collected) return;
        const dx = coin.x - ballX.current;
        const dy = coin.y - ballY.current;
        if (Math.sqrt(dx*dx+dy*dy) < BALL_R + 14) {
          coin.collected = true;
          scoreRef.current += 10 * coin.mult;
          setScore(scoreRef.current);
          spawnParticles(coin.x - camX.current, coin.y, '#facc15');
        }
      });

      // Goal
      const { goal } = levelRef.current;
      const gDx = goal.x - ballX.current;
      const gDy = goal.y - ballY.current;
      if (Math.sqrt(gDx*gDx + gDy*gDy) < 44) {
        clearInterval(loopRef.current);
        const finalScore = scoreRef.current;
        setHighScores(h => ({ ...h, [currentLevel]: Math.max(h[currentLevel]||0, finalScore) }));
        setCompletedLevels(cl => cl.includes(currentLevel) ? cl : [...cl, currentLevel]);
        setGameState('win');
        stateRef.current = 'win';
        return;
      }

      // Camera
      const targetCamX = ballX.current - SW * 0.35;
      camX.current = Math.max(0, Math.min(levelRef.current.levelW - SW, targetCamX));

      setGameTick(tick);
      setRenderTick(t => t + 1);
    }, FPS_MS);

    return () => clearInterval(loopRef.current);
  }, [screen, gameState, currentLevel, spawnParticles]);

  // ── Render helpers ────────────────────────────────────────────────────────
  const cfg = cfgRef.current || LEVEL_CONFIGS[0];

  if (screen === 'menu') {
    return (
      <View style={{ flex:1 }}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#04040f','#0a0520','#130835']} style={StyleSheet.absoluteFill} />
        <View style={{ flex:1, alignItems:'center', justifyContent:'center', padding:28 }}>
          {/* Ball preview */}
          <View style={{ width:90, height:90, borderRadius:45, overflow:'hidden', marginBottom:24, borderWidth:3, borderColor:'rgba(239,68,68,0.5)' }}>
            <LinearGradient colors={['#ff6b35','#ef4444','#b91c1c']} style={{ flex:1 }}>
              <View style={{ position:'absolute', left:14, top:12, width:22, height:14, borderRadius:11, backgroundColor:'rgba(255,255,255,0.5)' }} />
              <View style={{ position:'absolute', bottom:16, left:0, right:0, alignItems:'center' }}>
                <View style={{ flexDirection:'row', gap:10 }}>
                  <View style={{ width:7, height:7, borderRadius:4, backgroundColor:'#7f1d1d' }} />
                  <View style={{ width:7, height:7, borderRadius:4, backgroundColor:'#7f1d1d' }} />
                </View>
                <View style={{ width:22, height:10, borderBottomLeftRadius:11, borderBottomRightRadius:11, backgroundColor:'#7f1d1d', marginTop:3 }} />
              </View>
            </LinearGradient>
          </View>
          <Text style={{ color:'#fff', fontSize:38, fontWeight:'900', letterSpacing:3, marginBottom:4 }}>BOUNCE TALES</Text>
          <Text style={{ color:'rgba(167,139,250,0.75)', fontSize:12, fontWeight:'700', letterSpacing:4, marginBottom:40 }}>10 LEVELS · NOKIA CLASSIC</Text>

          <TouchableOpacity style={{ width:'100%', borderRadius:50, overflow:'hidden', marginBottom:14 }}
            onPress={() => setScreen('levelselect')}>
            <LinearGradient colors={['#ef4444','#b91c1c']} style={{ paddingVertical:18, alignItems:'center' }}>
              <Text style={{ color:'#fff', fontSize:18, fontWeight:'900', letterSpacing:3 }}>▶  PLAY</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={{ padding:14 }} onPress={() => navigation.goBack()}>
            <Text style={{ color:'rgba(255,255,255,0.45)', fontSize:14, fontWeight:'600' }}>‹ Main Menu</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (screen === 'levelselect') {
    return (
      <LevelSelect
        onSelect={(lvl) => startLevel(lvl)}
        onBack={() => setScreen('menu')}
        highScores={highScores}
        completedLevels={completedLevels}
      />
    );
  }

  // ── GAME screen ────────────────────────────────────────────────────────────
  const bsx = ballX.current - camX.current;
  const bsy = ballY.current;
  const cam  = camX.current;
  const tick = gameTick;
  const { platforms, coins: _, spikes, flowers, goal } = levelRef.current || { platforms:[], coins:[], spikes:[], flowers:[], goal:{x:0,y:0} };
  const coins = coinsRef.current;
  const totalCoins  = coins.length;
  const collected   = coins.filter(c => c.collected).length;
  const nextLevel   = currentLevel < 10 ? currentLevel + 1 : null;

  // Compute moving platform world X (for goal arrow)
  const getPlatX = (p) => p.moving ? p.mOriginX + Math.sin(tick * 0.04 + p.mPhase) * p.mRange : p.x;

  return (
    <View style={st.root}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={cfg.sky.length >= 2 ? cfg.sky : [cfg.sky[0], cfg.sky[0]]} style={StyleSheet.absoluteFill} />

      {/* Clouds */}
      {[0.15, 0.45, 0.72].map((rx, i) => {
        const cx = ((rx * 3000 - cam * 0.25) % (SW + 220)) - 110;
        return <View key={i} style={[st.cloud, { left:cx, top:55+i*55 }]} />;
      })}

      {/* Flowers */}
      {flowers.map((f,i) => <FlowerView key={i} flower={f} camX={cam} />)}

      {/* Platforms */}
      {platforms.map(p => (
        <PlatformView key={p.id} p={p} camX={cam} cfg={cfg} tick={tick} />
      ))}

      {/* Spikes */}
      {spikes.map(sp => <SpikeView key={sp.id} sp={sp} camX={cam} />)}

      {/* Coins */}
      {coins.map(c => !c.collected && (
        <CoinView key={c.id} cx={c.x} cy={c.y} camX={cam} mult={c.mult} />
      ))}

      {/* Goal flag */}
      {(() => {
        const gsx = goal.x - cam;
        if (gsx > -60 && gsx < SW + 60) return (
          <View style={{ position:'absolute', left:gsx-10, top:FLOOR_Y-125 }}>
            <View style={{ width:4, height:100, backgroundColor:'#374151' }} />
            <View style={{ position:'absolute', left:4, top:0, width:46, height:30, backgroundColor:'#ef4444',
              borderTopRightRadius:6, borderBottomRightRadius:6, alignItems:'center', justifyContent:'center' }}>
              <Text style={{ color:'#fff', fontSize:8, fontWeight:'900' }}>GOAL!</Text>
            </View>
          </View>
        );
        // Arrow hint
        const dir = goal.x > ballX.current ? '→ GOAL' : 'GOAL ←';
        return <Text style={{ position:'absolute', top:110, right:16, color:'rgba(255,255,0,0.8)', fontSize:11, fontWeight:'900' }}>{dir}</Text>;
      })()}

      {/* Particles */}
      {particles.map(p => <Particle key={p.id} x={p.x} y={p.y} color={p.color} />)}

      {/* Ball */}
      {gameState !== 'dead' && gameState !== 'win' && (
        <View style={{ position:'absolute', left:bsx-BALL_R, top:bsy-BALL_R, width:BALL_R*2, height:BALL_R*2 }}>
          <View style={{ position:'absolute', bottom:-6, left:4, right:4, height:8, borderRadius:10,
            backgroundColor:'rgba(0,0,0,0.18)' }} />
          <View style={{ width:BALL_R*2, height:BALL_R*2, borderRadius:BALL_R, overflow:'hidden' }}>
            <LinearGradient colors={['#ff6b35','#ef4444','#b91c1c']} style={{ flex:1 }} />
            <View style={{ position:'absolute', left:6, top:5, width:12, height:8, borderRadius:6, backgroundColor:'rgba(255,255,255,0.5)' }} />
            <View style={{ position:'absolute', bottom:7, left:0, right:0, alignItems:'center' }}>
              <View style={{ flexDirection:'row', gap:6 }}>
                <View style={{ width:4, height:4, borderRadius:2, backgroundColor:'#7f1d1d' }} />
                <View style={{ width:4, height:4, borderRadius:2, backgroundColor:'#7f1d1d' }} />
              </View>
              <View style={{ width:12, height:5, borderBottomLeftRadius:6, borderBottomRightRadius:6, backgroundColor:'#7f1d1d', marginTop:2 }} />
            </View>
          </View>
        </View>
      )}

      {/* HUD */}
      <View style={st.hud}>
        <TouchableOpacity style={st.backBtn} onPress={() => { clearInterval(loopRef.current); setScreen('levelselect'); setGameState('idle'); }}>
          <Text style={st.backTxt}>‹</Text>
        </TouchableOpacity>
        <View style={st.hudCenter}>
          <Text style={st.hudLvl}>LEVEL {currentLevel}  ·  {cfg.name}</Text>
          <Text style={st.hudLabel}>⭐ {score}</Text>
        </View>
        <View style={st.hudRight}>
          <Text style={st.hudSub}>{collected}/{totalCoins}</Text>
          <Text style={[st.hudSub, {fontSize:9}]}>coins</Text>
        </View>
      </View>

      {/* Difficulty bar */}
      <View style={st.diffBar}>
        {[...Array(10)].map((_,i) => (
          <View key={i} style={[st.diffDot, i < currentLevel && st.diffDotOn]} />
        ))}
      </View>

      {/* Controls */}
      {gameState === 'playing' && (
        <View style={st.controls}>
          <TouchableOpacity
            style={[st.btn, leftHeld.current && st.btnActive]}
            onPressIn={() => { leftHeld.current = true; }}
            onPressOut={() => { leftHeld.current = false; }}
            activeOpacity={1}>
            <LinearGradient colors={leftHeld.current ? ['#7c3aed','#4338ca'] : ['rgba(0,0,0,0.5)','rgba(0,0,0,0.35)']} style={st.btnGrad}>
              <Text style={st.btnTxt}>◀</Text>
            </LinearGradient>
          </TouchableOpacity>
          <View style={{ flex:1 }} />
          <TouchableOpacity
            style={[st.btn, rightHeld.current && st.btnActive]}
            onPressIn={() => { rightHeld.current = true; }}
            onPressOut={() => { rightHeld.current = false; }}
            activeOpacity={1}>
            <LinearGradient colors={rightHeld.current ? ['#7c3aed','#4338ca'] : ['rgba(0,0,0,0.5)','rgba(0,0,0,0.35)']} style={st.btnGrad}>
              <Text style={st.btnTxt}>▶</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* DEAD overlay */}
      {gameState === 'dead' && (
        <View style={st.overlay}>
          <LinearGradient colors={['rgba(30,0,0,0.96)','rgba(80,0,0,0.96)']} style={st.overlayBox}>
            <Text style={{ fontSize:48, marginBottom:6 }}>💥</Text>
            <Text style={[st.oTitle, {color:'#fff'}]}>OOPS!</Text>
            <Text style={[st.oSub, {color:'rgba(255,180,180,0.8)'}]}>
              {cfg.spikes ? 'Watch out for spikes!' : 'You fell off!'}
            </Text>
            <View style={st.scoreRow}>
              <View style={st.scoreItem}><Text style={st.sLabel}>SCORE</Text><Text style={[st.sVal,{color:'#fff'}]}>{score}</Text></View>
              <View style={{width:1,height:50,backgroundColor:'rgba(255,255,255,0.15)'}} />
              <View style={st.scoreItem}><Text style={st.sLabel}>BEST</Text><Text style={[st.sVal,{color:'#facc15'}]}>{highScores[currentLevel]||0}</Text></View>
            </View>
            <TouchableOpacity style={st.oBtn} onPress={restartLevel}>
              <LinearGradient colors={['#ef4444','#b91c1c']} style={st.oBtnGrad}>
                <Text style={st.oBtnTxt}>TRY AGAIN</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={{marginTop:10,padding:10}} onPress={() => { setScreen('levelselect'); setGameState('idle'); }}>
              <Text style={{color:'rgba(255,255,255,0.45)',fontSize:13,fontWeight:'600'}}>Level Select</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}

      {/* WIN overlay */}
      {gameState === 'win' && (
        <View style={st.overlay}>
          <LinearGradient
            colors={currentLevel === 10 ? ['rgba(60,0,120,0.97)','rgba(100,0,180,0.97)'] : ['rgba(5,46,22,0.96)','rgba(20,83,45,0.96)']}
            style={st.overlayBox}>
            <Text style={{ fontSize:48, marginBottom:6 }}>{currentLevel===10?'👑':'🏆'}</Text>
            <Text style={[st.oTitle, {color: currentLevel===10?'#c084fc':'#4ade80'}]}>
              {currentLevel === 10 ? 'MASTER!' : 'LEVEL CLEAR!'}
            </Text>
            <Text style={[st.oSub, {color:'rgba(187,247,208,0.8)'}]}>
              {currentLevel === 10 ? 'You conquered all 10 levels!' : `Level ${currentLevel} Complete!`}
            </Text>
            {/* Stars */}
            <View style={{flexDirection:'row',gap:8,marginVertical:12}}>
              {[1,2,3].map(s => {
                const threshold = s===1 ? 1 : s===2 ? currentLevel*40 : currentLevel*80;
                const lit = s===1 || score >= threshold;
                return <Text key={s} style={{fontSize:28,opacity:lit?1:0.2}}>⭐</Text>;
              })}
            </View>
            <View style={st.scoreRow}>
              <View style={st.scoreItem}><Text style={st.sLabel}>SCORE</Text><Text style={[st.sVal,{color:'#fff'}]}>{score}</Text></View>
              <View style={{width:1,height:50,backgroundColor:'rgba(255,255,255,0.15)'}} />
              <View style={st.scoreItem}><Text style={st.sLabel}>COINS</Text><Text style={[st.sVal,{color:'#facc15'}]}>{collected}/{totalCoins}</Text></View>
            </View>
            {score >= (highScores[currentLevel]||0) && score > 0 && (
              <Text style={{color:'#facc15',fontWeight:'800',fontSize:13,marginBottom:6}}>🏅 NEW RECORD!</Text>
            )}
            {nextLevel && (
              <TouchableOpacity style={st.oBtn} onPress={() => startLevel(nextLevel)}>
                <LinearGradient colors={currentLevel===10?['#9333ea','#6d28d9']:['#22c55e','#15803d']} style={st.oBtnGrad}>
                  <Text style={st.oBtnTxt}>NEXT LEVEL ▶</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[st.oBtn,{marginTop:nextLevel?8:0}]} onPress={restartLevel}>
              <LinearGradient colors={['rgba(255,255,255,0.12)','rgba(255,255,255,0.06)']} style={st.oBtnGrad}>
                <Text style={[st.oBtnTxt,{color:'rgba(255,255,255,0.7)'}]}>REPLAY</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={{marginTop:10,padding:10}} onPress={() => { setScreen('levelselect'); setGameState('idle'); }}>
              <Text style={{color:'rgba(255,255,255,0.45)',fontSize:13,fontWeight:'600'}}>Level Select</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex:1 },
  cloud: { position:'absolute', width:90, height:36, borderRadius:18, backgroundColor:'rgba(255,255,255,0.82)' },

  hud: { position:'absolute', top:0, left:0, right:0, flexDirection:'row', alignItems:'center',
    paddingTop:46, paddingHorizontal:16, paddingBottom:8, backgroundColor:'rgba(0,0,0,0.28)' },
  backBtn: { width:36, height:36, borderRadius:18, backgroundColor:'rgba(0,0,0,0.45)', alignItems:'center', justifyContent:'center' },
  backTxt: { color:'#fff', fontSize:22, fontWeight:'900', lineHeight:26 },
  hudCenter: { flex:1, alignItems:'center' },
  hudLvl: { color:'rgba(255,255,255,0.6)', fontSize:9, fontWeight:'800', letterSpacing:2 },
  hudLabel: { color:'#fff', fontSize:18, fontWeight:'900' },
  hudRight: { alignItems:'flex-end', minWidth:50 },
  hudSub: { color:'rgba(255,255,255,0.7)', fontSize:14, fontWeight:'800' },

  diffBar: { position:'absolute', top:96, left:0, right:0, flexDirection:'row', justifyContent:'center', gap:5 },
  diffDot: { width:8, height:8, borderRadius:4, backgroundColor:'rgba(255,255,255,0.18)' },
  diffDotOn: { backgroundColor:'#facc15' },

  controls: { position:'absolute', bottom:28, left:0, right:0, flexDirection:'row', paddingHorizontal:22 },
  btn: { borderRadius:20, overflow:'hidden', elevation:8, shadowColor:'#000', shadowOpacity:0.5, shadowRadius:8, shadowOffset:{width:0,height:4} },
  btnActive: { transform:[{scale:1.08}] },
  btnGrad: { width:82, height:82, alignItems:'center', justifyContent:'center', borderRadius:20 },
  btnTxt: { color:'#fff', fontSize:30, fontWeight:'900' },

  overlay: { ...StyleSheet.absoluteFillObject, alignItems:'center', justifyContent:'center' },
  overlayBox: { width:SW*0.84, borderRadius:28, padding:26, alignItems:'center',
    borderWidth:1, borderColor:'rgba(255,255,255,0.1)', elevation:20 },
  oTitle: { fontSize:28, fontWeight:'900', letterSpacing:2, marginBottom:4 },
  oSub: { fontSize:12, fontWeight:'700', letterSpacing:1, marginBottom:6, textAlign:'center' },
  scoreRow: { flexDirection:'row', alignItems:'center', gap:22, marginVertical:14 },
  scoreItem: { alignItems:'center', minWidth:75 },
  sLabel: { color:'rgba(255,255,255,0.45)', fontSize:9, fontWeight:'800', letterSpacing:2 },
  sVal: { fontSize:32, fontWeight:'900' },
  oBtn: { borderRadius:50, overflow:'hidden', width:'100%', marginTop:6 },
  oBtnGrad: { paddingVertical:15, alignItems:'center', borderRadius:50 },
  oBtnTxt: { color:'#fff', fontSize:15, fontWeight:'900', letterSpacing:2 },
});