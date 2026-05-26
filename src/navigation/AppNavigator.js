// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import SplashScreen from '../screens/SplashScreen';
import MainMenu from '../screens/MainMenu/MainMenu';
import HomeScreen from '../screens/HomeScreen/HomeScreen';
import CategoryScreen from '../screens/CategoryScreen/CategoryScreen';
import PuzzleScreen from '../screens/PuzzleScreen/PuzzleScreen';
import SettingsScreen from '../screens/SettingsScreen/SettingsScreen';
import SnakeGame from '../screens/SnakeGame/SnakeGame';
import FruitSlicer from '../screens/FruitSlicer/Fruitslicer';
import BirdyBird from '../screens/BirdyBird/BirdyBird';
import XOXGame from '../screens/XOXGame/XOXGame';
import BounceTales from '../screens/BounceTales/BounceTales';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false, cardStyle: { backgroundColor: '#0f0f23' } }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="MainMenu" component={MainMenu} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Category" component={CategoryScreen} />
        <Stack.Screen name="Puzzle" component={PuzzleScreen} />
        <Stack.Screen name="Snake" component={SnakeGame} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="FruitSlicer" component={FruitSlicer} />
        <Stack.Screen name="BirdyBird" component={BirdyBird} />
        <Stack.Screen name="XOX" component={XOXGame} />
        <Stack.Screen name="BounceTales" component={BounceTales} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
