import 'react-native-gesture-handler'; // Importante para la navegación
import React from 'react';

import AppNavigator from './src/navigation/AppNavigator'; // Importamos tu navegación desde src

export default function App() {
  return (
    <AppNavigator />
  );
}