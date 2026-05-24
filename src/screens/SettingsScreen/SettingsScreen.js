import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  BackHandler,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../../context/AppContext';
import {
  clearAllData,
  deleteCustomCategory,
  getCompletedPuzzles,
  saveCustomCategory,
} from '../../storage/StorageService';
import { DEFAULT_CATEGORIES } from '../../utils/categoriesData';

const CATEGORY_COLORS = [
  ['#FF6B35', '#FF8C42'],
  ['#6C63FF', '#8B85FF'],
  ['#E91E63', '#F06292'],
  ['#4CAF50', '#66BB6A'],
  ['#FF9800', '#FFA726'],
  ['#795548', '#8D6E63'],
  ['#009688', '#26A69A'],
  ['#9C27B0', '#AB47BC'],
  ['#03A9F4', '#29B6F6'],
  ['#F44336', '#EF9A9A'],
];

const CATEGORY_ICONS = ['🎨', '🎭', '🎪', '🌊', '⚡', '🌈', '🎯', '🏆', '💎', '🔥'];

const clampVolume = (value) => Math.max(0, Math.min(1, value));

export default function SettingsScreen({ navigation }) {
  const { categories, currentTheme, refreshCategories, settings, themeOptions, updateSettings } =
    useApp();
  const [completedStats, setCompletedStats] = useState({ total: 0, categories: {} });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🎨');
  const [newCatColorIdx, setNewCatColorIdx] = useState(0);
  const [newCatImages, setNewCatImages] = useState([]);

  const defaultIds = DEFAULT_CATEGORIES.map((c) => c.id);
  const customCategories = categories.filter((c) => !defaultIds.includes(c.id));

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const completed = await getCompletedPuzzles();
    let total = 0;
    const catStats = {};

    Object.entries(completed).forEach(([catId, images]) => {
      const count = Object.keys(images).length;
      catStats[catId] = count;
      total += count;
    });

    setCompletedStats({ total, categories: catStats });
  };

  const updateVolume = async (key, delta) => {
    const nextValue = clampVolume((settings[key] ?? 0.6) + delta);
    await updateSettings({ [key]: nextValue });
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 10,
    });

    if (!result.canceled && result.assets) {
      const imgs = result.assets.map((asset, index) => ({
        id: `custom_${Date.now()}_${index}`,
        name: `Image ${newCatImages.length + index + 1}`,
        uri: asset.uri,
      }));
      setNewCatImages((prev) => [...prev, ...imgs].slice(0, 10));
    }
  };

  const handleSaveCategory = async () => {
    if (!newCatName.trim()) {
      Alert.alert('Error', 'Please enter a category name.');
      return;
    }

    if (newCatImages.length === 0) {
      Alert.alert('Error', 'Please add at least one image.');
      return;
    }

    const category = {
      id: editingCategory ? editingCategory.id : `custom_${Date.now()}`,
      name: newCatName.trim(),
      icon: newCatIcon,
      color: CATEGORY_COLORS[newCatColorIdx][0],
      gradientColors: CATEGORY_COLORS[newCatColorIdx],
      totalPuzzles: newCatImages.length,
      musicKey: 'default',
      images: newCatImages,
    };

    const success = await saveCustomCategory(category);
    if (success) {
      await refreshCategories();
      setShowAddModal(false);
      resetForm();
      Alert.alert('Success', `Category "${category.name}" saved.`);
    }
  };

  const handleDeleteCategory = (category) => {
    Alert.alert('Delete Category', `Delete "${category.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCustomCategory(category.id);
          await refreshCategories();
        },
      },
    ]);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setNewCatName(category.name);
    setNewCatIcon(category.icon);
    const colorIdx = CATEGORY_COLORS.findIndex((colors) => colors[0] === category.gradientColors?.[0]);
    setNewCatColorIdx(colorIdx >= 0 ? colorIdx : 0);
    setNewCatImages(category.images || []);
    setShowAddModal(true);
  };

  const resetForm = () => {
    setNewCatName('');
    setNewCatIcon('🎨');
    setNewCatColorIdx(0);
    setNewCatImages([]);
    setEditingCategory(null);
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all progress, scores, and custom categories.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            await refreshCategories();
            await loadStats();
            Alert.alert('Done', 'All data cleared.');
          },
        },
      ]
    );
  };

  const handleExitApp = () => {
    if (Platform.OS === 'android') {
      BackHandler.exitApp();
      return;
    }

    // On iOS we can't programmatically exit — navigate back to main menu instead
    Alert.alert('Exit App', 'On this platform the app cannot be closed programmatically. Return to main menu?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Main Menu', onPress: () => navigation.replace('MainMenu') },
    ]);
  };

  return (
    <LinearGradient colors={currentTheme.gradient} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{"<"} Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Game Settings</Text>
          <View style={[styles.card, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Background Music</Text>
                <Text style={styles.settingDesc}>Play music in puzzle screens</Text>
              </View>
              <Switch
                value={settings.musicEnabled}
                onValueChange={(value) => updateSettings({ musicEnabled: value })}
                trackColor={{ false: '#333', true: currentTheme.accent }}
                thumbColor={settings.musicEnabled ? '#fff' : '#aaa'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Sound Effects</Text>
                <Text style={styles.settingDesc}>Enable game sound feedback</Text>
              </View>
              <Switch
                value={settings.soundEnabled}
                onValueChange={(value) => updateSettings({ soundEnabled: value })}
                trackColor={{ false: '#333', true: currentTheme.accent }}
                thumbColor={settings.soundEnabled ? '#fff' : '#aaa'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Vibration</Text>
                <Text style={styles.settingDesc}>Haptic feedback on actions</Text>
              </View>
              <Switch
                value={settings.vibration}
                onValueChange={(value) => updateSettings({ vibration: value })}
                trackColor={{ false: '#333', true: currentTheme.accent }}
                thumbColor={settings.vibration ? '#fff' : '#aaa'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.volumeRow}>
              <View style={styles.volumeInfo}>
                <Text style={styles.settingLabel}>Music Volume</Text>
                <Text style={styles.settingDesc}>{Math.round((settings.musicVolume ?? 0.6) * 100)}%</Text>
              </View>
              <View style={styles.volumeControls}>
                <TouchableOpacity style={styles.volumeBtn} onPress={() => updateVolume('musicVolume', -0.1)}>
                  <Text style={styles.volumeBtnText}>-</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.volumeBtn} onPress={() => updateVolume('musicVolume', 0.1)}>
                  <Text style={styles.volumeBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.volumeRow}>
              <View style={styles.volumeInfo}>
                <Text style={styles.settingLabel}>Sound Volume</Text>
                <Text style={styles.settingDesc}>{Math.round((settings.soundVolume ?? 0.6) * 100)}%</Text>
              </View>
              <View style={styles.volumeControls}>
                <TouchableOpacity style={styles.volumeBtn} onPress={() => updateVolume('soundVolume', -0.1)}>
                  <Text style={styles.volumeBtnText}>-</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.volumeBtn} onPress={() => updateVolume('soundVolume', 0.1)}>
                  <Text style={styles.volumeBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme</Text>
          <View style={[styles.card, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.themeRow}>
              {themeOptions.map((theme) => {
                const selected = settings.theme === theme.id;
                return (
                  <TouchableOpacity
                    key={theme.id}
                    style={[styles.themeOption, selected && { borderColor: theme.accent }]}
                    onPress={() => updateSettings({ theme: theme.id })}
                  >
                    <LinearGradient colors={theme.gradient} style={styles.themeSwatch} />
                    <Text style={styles.themeName}>{theme.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={[styles.card, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxValue}>{categories.length}</Text>
                <Text style={styles.statBoxLabel}>Categories</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxValue}>{completedStats.total}</Text>
                <Text style={styles.statBoxLabel}>Completed</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxValue}>{customCategories.length}</Text>
                <Text style={styles.statBoxLabel}>Custom</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Custom Categories</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => {
                resetForm();
                setShowAddModal(true);
              }}
            >
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {customCategories.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📂</Text>
              <Text style={styles.emptyText}>No custom categories yet.</Text>
              <Text style={styles.emptySubtext}>Tap "+ Add" to create one.</Text>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: currentTheme.surface }]}>
              {customCategories.map((cat, index) => (
                <View key={cat.id}>
                  {index > 0 && <View style={styles.divider} />}
                  <View style={styles.categoryRow}>
                    <LinearGradient
                      colors={cat.gradientColors || ['#6C63FF', '#8B85FF']}
                      style={styles.categoryIconBox}
                    >
                      <Text style={styles.categoryIconText}>{cat.icon}</Text>
                    </LinearGradient>
                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryName}>{cat.name}</Text>
                      <Text style={styles.categoryMeta}>{cat.images?.length || 0} images</Text>
                    </View>
                    <View style={styles.categoryActions}>
                      <TouchableOpacity onPress={() => handleEditCategory(cat)} style={styles.editBtn}>
                        <Text style={styles.editBtnText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteCategory(cat)} style={styles.deleteBtn}>
                        <Text style={styles.deleteBtnText}>Del</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          <TouchableOpacity style={styles.dangerBtn} onPress={handleClearData}>
            <Text style={styles.dangerBtnText}>Clear All Progress & Data</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <TouchableOpacity style={[styles.dangerBtn, { backgroundColor: 'rgba(255,255,255,0.04)' }]} onPress={handleExitApp}>
            <Text style={[styles.dangerBtnText, { color: '#fff' }]}>Exit App</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Image Puzzle Game v1.0.0</Text>
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <LinearGradient colors={currentTheme.gradient} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingCategory ? 'Edit Category' : 'New Category'}</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.formLabel}>Category Name</Text>
              <TextInput
                style={styles.textInput}
                value={newCatName}
                onChangeText={setNewCatName}
                placeholder="Enter category name..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                maxLength={30}
              />

              <Text style={styles.formLabel}>Choose Icon</Text>
              <View style={styles.iconGrid}>
                {CATEGORY_ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    onPress={() => setNewCatIcon(icon)}
                    style={[styles.iconOption, newCatIcon === icon && styles.iconOptionSelected]}
                  >
                    <Text style={styles.iconOptionText}>{icon}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>Choose Color</Text>
              <View style={styles.colorGrid}>
                {CATEGORY_COLORS.map((colors, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setNewCatColorIdx(idx)}
                    style={[styles.colorOption, newCatColorIdx === idx && styles.colorOptionSelected]}
                  >
                    <LinearGradient colors={colors} style={styles.colorSwatch} />
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.imagesHeader}>
                <Text style={styles.formLabel}>Images ({newCatImages.length}/10)</Text>
                {newCatImages.length < 10 && (
                  <TouchableOpacity onPress={handlePickImage} style={styles.pickBtn}>
                    <Text style={styles.pickBtnText}>+ Pick Images</Text>
                  </TouchableOpacity>
                )}
              </View>

              {newCatImages.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
                  {newCatImages.map((img, idx) => (
                    <View key={img.id} style={styles.imagePreview}>
                      <Image source={{ uri: img.uri }} style={styles.imagePreviewThumb} resizeMode="cover" />
                      <TouchableOpacity
                        style={styles.removeImageBtn}
                        onPress={() => setNewCatImages((prev) => prev.filter((_, imageIndex) => imageIndex !== idx))}
                      >
                        <Text style={styles.removeImageText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCategory}>
                <LinearGradient colors={['#6C63FF', '#8B85FF']} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{editingCategory ? 'Update Category' : 'Create Category'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </LinearGradient>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  backBtnText: { color: '#fff', fontWeight: '700' },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.82)',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  settingDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  volumeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  volumeInfo: { flex: 1 },
  volumeControls: {
    flexDirection: 'row',
    gap: 10,
  },
  volumeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  volumeBtnText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 16,
  },
  themeOption: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  themeSwatch: {
    width: '100%',
    height: 44,
    borderRadius: 10,
    marginBottom: 8,
  },
  themeName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  statBox: { alignItems: 'center' },
  statBoxValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#f0abfc',
  },
  statBoxLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: 'rgba(108,99,255,0.3)',
    borderWidth: 1,
    borderColor: '#6C63FF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  addBtnText: {
    color: '#a78bfa',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderStyle: 'dashed',
  },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: '600' },
  emptySubtext: { color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 4 },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  categoryIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIconText: { fontSize: 22 },
  categoryInfo: { flex: 1 },
  categoryName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  categoryMeta: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  categoryActions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    minWidth: 42,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(108,99,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  editBtnText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  deleteBtn: {
    minWidth: 42,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239,68,68,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  deleteBtnText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  dangerBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  dangerBtnText: {
    color: '#f87171',
    fontSize: 15,
    fontWeight: '700',
  },
  version: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.25)',
    fontSize: 12,
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
  },
  modalClose: {
    fontSize: 26,
    color: 'rgba(255,255,255,0.6)',
    padding: 4,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 18,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: {
    borderColor: '#6C63FF',
    backgroundColor: 'rgba(108,99,255,0.2)',
  },
  iconOptionText: { fontSize: 24 },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  colorOptionSelected: {
    borderColor: '#fff',
  },
  colorSwatch: {
    width: '100%',
    height: '100%',
  },
  imagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pickBtn: {
    backgroundColor: 'rgba(108,99,255,0.3)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#6C63FF',
  },
  pickBtnText: {
    color: '#a78bfa',
    fontWeight: '700',
    fontSize: 13,
  },
  imagesScroll: {
    marginBottom: 18,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 8,
    position: 'relative',
  },
  imagePreviewThumb: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  saveBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  saveBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
