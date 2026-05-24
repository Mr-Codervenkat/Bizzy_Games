// src/screens/SplashScreen.js
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(40)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const puzzleRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleY, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start(() => {
        setTimeout(() => {
        navigation.replace('MainMenu');
      }, 1000);
    });

    Animated.loop(
      Animated.timing(puzzleRotate, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = puzzleRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient colors={['#1a0533', '#2d0a5e', '#1a0533']} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a0533" />

      {/* Floating puzzle pieces bg */}
      {[...Array(8)].map((_, i) => (
        <Animated.Text
          key={i}
          style={[
            styles.bgEmoji,
            {
              top: (i * 120) % height,
              left: (i * 80 + 20) % width,
              opacity: 0.1,
              transform: [{ rotate: `${i * 45}deg` }],
            },
          ]}
        >
          🧩
        </Animated.Text>
      ))}

      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{ scale: logoScale }, { rotate: spin }],
            opacity: logoOpacity,
          },
        ]}
      >
        <Text style={styles.logoEmoji}>🧩</Text>
      </Animated.View>

      <Animated.Text
        style={[
          styles.title,
          { transform: [{ translateY: titleY }], opacity: titleOpacity },
        ]}
      >
        Image Puzzle
      </Animated.Text>
      <Animated.Text
        style={[
          styles.subtitle,
          { opacity: subtitleOpacity },
        ]}
      >
        GAME
      </Animated.Text>

      <Animated.Text style={[styles.tagline, { opacity: subtitleOpacity }]}>
        ✨ Challenge Your Mind ✨
      </Animated.Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bgEmoji: {
    position: 'absolute',
    fontSize: 40,
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  logoEmoji: {
    fontSize: 70,
  },
  title: {
    fontFamily: undefined,
    fontSize: 42,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
    textShadowColor: '#a855f7',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#f0abfc',
    letterSpacing: 12,
    marginTop: -5,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 20,
    letterSpacing: 1,
  },
});
