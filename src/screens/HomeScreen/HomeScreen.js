import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { getCompletedPuzzles } from '../../storage/StorageService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export default function HomeScreen({ navigation }) {
  const { categories, currentTheme, playMusic, settings, toggleMusic } = useApp();
  const [completedMap, setCompletedMap] = useState({});
  const [isMuted, setIsMuted] = useState(!settings.musicEnabled);
  const headerAnim = useRef(new Animated.Value(-100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(categories.map(() => new Animated.Value(0))).current;

  useFocusEffect(
    React.useCallback(() => {
      playMusic('default');
      loadCompleted();
    }, [])
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    categories.forEach((_, index) => {
      Animated.timing(cardAnims[index] || new Animated.Value(0), {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }).start();
    });
  }, [categories]);

  const loadCompleted = async () => {
    const completed = await getCompletedPuzzles();
    const map = {};

    Object.entries(completed).forEach(([catId, images]) => {
      map[catId] = Object.keys(images).length;
    });

    setCompletedMap(map);
  };

  const handleMuteToggle = async () => {
    const enabled = await toggleMusic();
    setIsMuted(!enabled);
  };

  const renderCategory = ({ item, index }) => {
    const completed = completedMap[item.id] || 0;
    const progress = (completed / item.totalPuzzles) * 100;
    const animVal = cardAnims[index] || new Animated.Value(1);

    return (
      <Animated.View
        style={{
          opacity: animVal,
          transform: [
            { scale: animVal.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
            { translateY: animVal.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
          ],
        }}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Category', { category: item })}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={item.gradientColors}
            style={styles.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.cardBgEmoji}>{item.icon}</Text>

            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.cardIcon}>{item.icon}</Text>
              <Text style={styles.cardName} numberOfLines={2}>
                {item.name}
              </Text>
              <View style={styles.cardStats}>
                <Text style={styles.cardCompleted}>
                  {completed}/{item.totalPuzzles}
                </Text>
                <Text style={styles.cardLabel}>done</Text>
              </View>
            </View>

            {completed === item.totalPuzzles && (
              <View style={styles.completeBadge}>
                <Text style={styles.completeBadgeText}>✓</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const totalCompleted = Object.values(completedMap).reduce((sum, value) => sum + value, 0);
  const totalPuzzles = categories.reduce((sum, category) => sum + category.totalPuzzles, 0);

  return (
    <LinearGradient colors={currentTheme.gradient} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f23" />

      <Animated.View style={[styles.header, { transform: [{ translateY: headerAnim }] }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainMenu'))}
            style={styles.headerBackBtn}
          >
            <Text style={styles.headerBackText}>{'‹'}</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Puzzle</Text>
            <Text style={styles.headerSubtitle}>Image Puzzle Game</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleMuteToggle} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>{isMuted ? '🔇' : '🔊'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
      <Animated.View style={[styles.statsBanner, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={['rgba(168,85,247,0.3)', 'rgba(79,70,229,0.3)']}
          style={styles.statsGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{categories.length}</Text>
            <Text style={styles.statLabel}>Categories</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalPuzzles}</Text>
            <Text style={styles.statLabel}>Total Puzzles</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalCompleted}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.Text style={[styles.sectionTitle, { opacity: fadeAnim }]}>
        Choose a Category
      </Animated.Text>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        numColumns={2}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.row}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  headerBackText: { fontSize: 20, color: '#fff', fontWeight: '700' },
  headerTitleWrap: { justifyContent: 'center' },
  iconBtn: {
    minWidth: 52,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  iconBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  statsBanner: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statsGradient: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
    borderRadius: 16,
  },
  statItem: { alignItems: 'center' },
  statNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: '#f0abfc',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 20,
    paddingBottom: 12,
    letterSpacing: 0.5,
  },
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.1,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  cardGradient: {
    flex: 1,
    padding: 14,
  },
  cardBgEmoji: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    fontSize: 80,
    opacity: 0.15,
  },
  progressContainer: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 2,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardIcon: {
    fontSize: 38,
    marginBottom: 6,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 18,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    gap: 4,
  },
  cardCompleted: {
    fontSize: 16,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.9)',
  },
  cardLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  completeBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeBadgeText: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '900',
  },
});
