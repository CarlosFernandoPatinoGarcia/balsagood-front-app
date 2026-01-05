import 'react-native-gesture-handler'; // Importante para la navegación
import React, { useEffect } from 'react';

import AppNavigator from './src/navigation/AppNavigator'; // Importamos tu navegación desde src
import { loadApiConfiguration } from './src/api/api';

export default function App() {
  useEffect(() => {
    loadApiConfiguration();
  }, []);

  return (
    <AppNavigator />
  );
}