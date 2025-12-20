// importamos archivos necesarios a partir de este proyecto
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
// Importamos el archivo para el dashboard
import DashboardScreen from '../screens/DashboardScreen';
import IngresoPalletsScreen from '../screens/IngresoPalletsScreen';
import ProduccionScreen from '../screens/ProduccionScreen';
import AgrupacionScreen from '../screens/AgrupacionScreen';
import { colors } from '../theme/colors';
import { StatusBar } from 'react-native';

const Stack = createStackNavigator();

const AppNavigator = () => {
    return (
        <NavigationContainer>
            <StatusBar barStyle="light-content" backgroundColor={colors.background} />
            <Stack.Navigator
                screenOptions={{
                    headerStyle: { backgroundColor: colors.background, elevation: 0, shadowOpacity: 0 },
                    headerTintColor: colors.text,
                    headerTitleStyle: { fontWeight: 'bold' },
                    cardStyle: { backgroundColor: colors.background },
                }}
            >
                <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'WoodFlow' }} />
                <Stack.Screen name="IngresoPallets" component={IngresoPalletsScreen} options={{ title: 'Ingreso Pallets' }} />
                <Stack.Screen name="Produccion" component={ProduccionScreen} options={{ title: 'Producción y Encolado' }} />
                <Stack.Screen name="Agrupacion" component={AgrupacionScreen} options={{ title: 'Despacho' }} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;