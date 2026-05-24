# 🧩 Image Puzzle Game

A colorful, beginner-friendly offline mobile image puzzle game built with React Native & Expo.

## 📱 Features

- **10 Built-in Categories**: Devotional, Actors, Actresses, Fruits, Food, Animals, Nature, Cartoons, Festivals, Kids
- **10 Puzzle Images per Category** (with placeholder images; replace with real assets)
- **10-Piece Puzzle Mechanic**: Each image splits into a 2×5 grid of puzzle pieces
- **Timer & Move Counter**: Track your performance
- **Pause / Restart**: Full game control
- **Hint System**: Highlights which piece goes where (💡)
- **Win Animation**: Stars rating + stats modal on completion
- **Progress Tracking**: AsyncStorage saves completed puzzles, high scores
- **Settings Screen**: Toggle music/sound/vibration, create/edit/delete custom categories
- **Music System**: Per-category background music (ready to wire up your MP3 files)
- **Fully Offline**: No backend, no login, no internet required (after assets loaded)

---

## 🚀 Setup & Run

### 1. Prerequisites

```bash
node >= 18
npm or yarn
Expo CLI: npm install -g expo-cli
Expo Go app on your Android/iOS device
```

### 2. Install Dependencies

```bash
cd ImagePuzzleGame
npm install
```

### 3. Start the App

```bash
npx expo start
```

Scan the QR code with **Expo Go** on your phone.

---

## 🖼️ Adding Real Images

The default categories use placeholder images from `picsum.photos` for demo purposes.

To add real images:

1. Place images in `src/assets/images/<category_id>/` (e.g., `src/assets/images/fruits/apple.jpg`)
2. Edit `src/utils/categoriesData.js` and update the `uri` field for each image:

```js
// Change:
{ id: 'fr_1', name: 'Apple', uri: 'https://picsum.photos/seed/apple1/400/400' }

// To (local asset):
{ id: 'fr_1', name: 'Apple', uri: require('../assets/images/fruits/apple.jpg') }
```

> **Tip**: Use square images (400×400 or similar) for best puzzle display.

---

## 🎵 Adding Background Music

1. Place MP3 files in `src/assets/music/`:
   - `devotional.mp3`
   - `actors.mp3`
   - `actresses.mp3`
   - `fruits.mp3`
   - `food.mp3`
   - `animals.mp3`
   - `nature.mp3`
   - `cartoons.mp3`
   - `festivals.mp3`
   - `kids.mp3`

2. Open `src/context/AppContext.js` and update `playMusic()`:

```js
const playMusic = async (categoryId) => {
  await stopMusic();
  if (!settings.musicEnabled) return;

  const musicMap = {
    devotional: require('../assets/music/devotional.mp3'),
    actors:     require('../assets/music/actors.mp3'),
    fruits:     require('../assets/music/fruits.mp3'),
    // ... add all categories
  };

  if (!musicMap[categoryId]) return;

  await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
  const { sound } = await Audio.Sound.createAsync(musicMap[categoryId], {
    shouldPlay: true,
    isLooping: true,
    volume: 0.6,
  });
  soundRef.current = sound;
  setCurrentMusic(categoryId);
  setIsMusicPlaying(true);
  currentCategoryRef.current = categoryId;
};
```

---

## 📁 Project Structure

```
ImagePuzzleGame/
├── App.js                          ← Entry point
├── app.json                        ← Expo config
├── package.json
├── babel.config.js
└── src/
    ├── assets/
    │   ├── images/                 ← Add category images here
    │   └── music/                  ← Add MP3 files here
    ├── context/
    │   └── AppContext.js           ← Global state, music control
    ├── navigation/
    │   └── AppNavigator.js         ← Stack navigator
    ├── screens/
    │   ├── SplashScreen.js         ← Animated splash
    │   ├── HomeScreen/
    │   │   └── HomeScreen.js       ← Category grid
    │   ├── CategoryScreen/
    │   │   └── CategoryScreen.js   ← Image grid per category
    │   ├── PuzzleScreen/
    │   │   └── PuzzleScreen.js     ← The puzzle game!
    │   └── SettingsScreen/
    │       └── SettingsScreen.js   ← Settings + custom categories
    ├── storage/
    │   └── StorageService.js       ← AsyncStorage operations
    └── utils/
        └── categoriesData.js       ← Default 10 categories
```

---

## 🎮 How to Play

1. **Home Screen** → Tap any category card
2. **Category Screen** → Tap any image to start its puzzle
3. **Puzzle Screen**:
   - Puzzle pieces appear in a **tray** at the bottom
   - Tap a tray piece → it places on the board (first empty slot or correct slot)
   - Tap a board piece → it returns to the tray
   - Match all 10 pieces to their correct positions to win!
   - Use 💡 **Hint** to highlight a piece that can be placed correctly
4. **Win!** → See your time, moves, and star rating

---

## ➕ Creating Custom Categories

1. Go to **Settings** screen (⚙️ button on Home)
2. Tap **"+ Add"** under Custom Categories
3. Enter name, pick icon & color
4. Tap **"+ Pick Images"** to select from your device gallery
5. Tap **"✨ Create Category"**
6. Your new category appears on the Home screen!

---

## 🏗️ Build for Production

```bash
# Android APK
npx expo build:android

# Or with EAS (recommended)
npm install -g eas-cli
eas build --platform android
eas build --platform ios
```

---

## 🛠️ Tech Stack

| Library | Purpose |
|---|---|
| React Native | Mobile framework |
| Expo (~51) | Build toolchain |
| React Navigation | Screen navigation |
| AsyncStorage | Local data persistence |
| Expo AV | Audio playback |
| Expo Image Picker | Pick photos from gallery |
| Expo Linear Gradient | UI gradients |
| React Native Gesture Handler | Touch/gesture support |
| React Native Reanimated | Smooth animations |

---

## 📝 Notes

- **Internet** is only used to load placeholder images in demo mode. Replace with local assets for true offline usage.
- Music files are **not included**; add your own royalty-free MP3s.
- The puzzle uses a **tap-to-place** system (beginner friendly). Drag-and-drop can be added using `react-native-gesture-handler`.
- All progress is stored in **AsyncStorage** (local device only).

---

Made with ❤️ using React Native & Expo
