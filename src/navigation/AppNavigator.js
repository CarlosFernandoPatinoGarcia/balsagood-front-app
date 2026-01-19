// importamos archivos necesarios a partir de este proyecto
import React, { useContext } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';

// Importamos el contexto de autenticación
import { AuthContext } from '../context/AuthContext';

// Importamos el archivo para el dashboard
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import IngresoPalletsScreen from '../screens/IngresoPalletsScreen';
import ProduccionScreen from '../screens/ProduccionScreen';
import AgrupacionScreen from '../screens/AgrupacionScreen';
import GestionSecadoScreen from '../screens/GestionSecadoScreen';
import DespachoLoteScreen from '../screens/DespachoLoteScreen';
import { colors } from '../theme/colors';
import { StatusBar } from 'react-native';

const Stack = createStackNavigator();

const AppNavigator = () => {
    const { state } = useContext(AuthContext);

    if (state.isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

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
                {state.userToken == null ? (
                    <Stack.Screen
                        name="Login"
                        component={LoginScreen}
                        options={{ headerShown: false }}
                    />
                ) : (
                    <>
                        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Producción Balsagood S.A.' }} />
                        <Stack.Screen name="IngresoPallets" component={IngresoPalletsScreen} options={{ title: 'Ingreso Pallets' }} />
                        <Stack.Screen name="Produccion" component={ProduccionScreen} options={{ title: 'Producción y Encolado' }} />
                        <Stack.Screen name="Agrupacion" component={AgrupacionScreen} options={{ title: 'Despacho' }} />
                        <Stack.Screen name="GestionSecado" component={GestionSecadoScreen} options={{ title: 'Gestión de Secado' }} />
                        <Stack.Screen name="DespachoLote" component={DespachoLoteScreen} options={{ title: 'Despacho a Taller' }} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;