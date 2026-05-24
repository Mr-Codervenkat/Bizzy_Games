import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { getCompletedPuzzles } from '../../storage/StorageService';
import { getImageSource } from '../../utils/imageSource';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 52) / 3;

export default function CategoryScreen({ route, navigation }) {
  const { category } = route.params;
  const { currentTheme, playMusic, toggleMusic, settings } = useApp();
  const [completedImages, setCompletedImages] = useState({});
  const [isMuted, setIsMuted] = useState(!settings.musicEnabled);
  const headerAnim = useRef(new Animated.Value(-80)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    React.useCallback(() => {
      playMusic('default');
      loadCompleted();
    }, [])
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const loadCompleted = async () => {
    const completed = await getCompletedPuzzles();
    setCompletedImages(completed[category.id] || {});
  };

  const handleMuteToggle = async () => {
    const enabled = await toggleMusic();
    setIsMuted(!enabled);
  };

  const renderImageCard = ({ item, index }) => {
    const isCompleted = !!completedImages[item.id];

    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        }}
      >
        <TouchableOpacity
          style={styles.imageCard}
          onPress={() =>
            navigation.navigate('Puzzle', {
              category,
              image: item,
              imageIndex: index,
            })
          }
          activeOpacity={0.85}
        >
          <Image source={getImageSource(item)} style={styles.imageThumb} resizeMode="cover" />

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.imageOverlay}
          >
            <Text style={styles.imageName} numberOfLines={1}>
              {item.name}
            </Text>
          </LinearGradient>

          {isCompleted && (
            <>
              <View style={styles.completedBadge}>
                <Text style={styles.completedBadgeText}>✓</Text>
              </View>
              <View style={styles.starsBadge}>
                <Text style={styles.starsBadgeText}>★★★</Text>
              </View>
            </>
          )}

          <View style={styles.indexBadge}>
            <Text style={styles.indexText}>{index + 1}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const completedCount = Object.keys(completedImages).length;

  return (
    <LinearGradient colors={currentTheme.gradient} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f23" />

      <Animated.View style={[styles.header, { transform: [{ translateY: headerAnim }] }]}>
        <LinearGradient
          colors={[...category.gradientColors, 'transparent']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backBtnText}>{"<"} Back</Text>
            </TouchableOpacity>

            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleMuteToggle} style={styles.iconBtn}>
                <Text style={styles.iconBtnText}>{isMuted ? 'Mute' : 'Music'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <View>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryProgress}>
                {completedCount} of {category.totalPuzzles} completed
              </Text>
            </View>
          </View>

          <View style={styles.progressBg}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: `${(completedCount / category.totalPuzzles) * 100}%` },
              ]}
            />
          </View>
        </LinearGradient>
      </Animated.View>

      {!isMuted && (
        <View style={styles.musicBar}>
          <Text style={styles.musicBarText}>Playing {category.name} music</Text>
          <View style={styles.musicWaves}>
            {[...Array(5)].map((_, i) => (
              <MusicWave key={i} delay={i * 120} />
            ))}
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Tap an image to start puzzle</Text>

      <FlatList
        data={category.images}
        keyExtractor={(item) => item.id}
        renderItem={renderImageCard}
        numColumns={3}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.row}
      />
    </LinearGradient>
  );
}

const MusicWave = ({ delay }) => {
  const anim = useRef(new Animated.Value(4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 18, duration: 400, delay, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 4, duration: 400, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        width: 3,
        height: anim,
        backgroundColor: '#f0abfc',
        borderRadius: 2,
        marginHorizontal: 2,
      }}
    />
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {},
  headerGradient: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  categoryIcon: { fontSize: 48 },
  categoryName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  categoryProgress: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  progressBg: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 3,
  },
  musicBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(168,85,247,0.15)',
    borderColor: 'rgba(168,85,247,0.3)',
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  musicBarText: {
    color: '#f0abfc',
    fontSize: 13,
    fontWeight: '600',
  },
  musicWaves: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
  },
  sectionTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  imageCard: {
    width: CARD_SIZE,
    height: CARD_SIZE * 1.15,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  imageThumb: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingBottom: 6,
    paddingTop: 20,
  },
  imageName: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  completedBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  starsBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  starsBadgeText: {
    color: '#facc15',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  indexBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indexText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
