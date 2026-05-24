import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const ICON = require('../../../assets/icon.png');

export default function MainMenu({ navigation }) {
  return (
    <LinearGradient colors={["#0f0720", "#2d0a5e"]} style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.brandRow}>
        <Image source={ICON} style={styles.icon} />
        <View>
          <Text style={styles.brand}>BizFun</Text>
          <Text style={styles.subtitle}>Image Puzzle • Snake</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#6C63FF' }]}
        onPress={() => navigation.replace('Home')}
      >
        <Text style={styles.btnText}>Puzzle Game</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#22c55e' }]}
        onPress={() => navigation.navigate('Snake')}
      >
        <Text style={styles.btnText}>Snake Game</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 20 },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 40 },
  icon: { width: 72, height: 72, marginRight: 12, borderRadius: 12 },
  brand: { color: '#fff', fontSize: 34, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 },
  title: { color: '#fff', fontSize: 32, fontWeight: '800', marginBottom: 40 },
  button: {
    width: '70%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 12,
    elevation: 6,
  },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
