import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../theme/colors';

const MenuButton = ({ title, onPress }) => (
    <TouchableOpacity style={styles.card} onPress={onPress}>
        <Text style={styles.cardTitle}>{title}</Text>
    </TouchableOpacity>
);

const DashboardScreen = ({ navigation }) => {
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.header}>Panel Supervisor</Text>

            <MenuButton
                title="Ingreso de Pallets Verdes"
                onPress={() => navigation.navigate('IngresoPallets')}
            />
            {/* Botón placeholder para gestión futura */}
            <MenuButton
                title="Gestión de Secado"
                onPress={() => console.log('Gestión de Secado')}
            />
            <MenuButton
                title="Producción y Encolado"
                onPress={() => navigation.navigate('Produccion')}
            />
            <MenuButton
                title="Agrupación para Despacho"
                onPress={() => navigation.navigate('Agrupacion')}
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 20, backgroundColor: colors.background },
    header: { fontSize: 24, color: colors.primary, marginBottom: 20, fontWeight: 'bold' },
    card: {
        backgroundColor: colors.card,
        padding: 20,
        borderRadius: 12,
        marginBottom: 15,
        borderLeftWidth: 5,
        borderLeftColor: colors.primary,
    },
    cardTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
});

export default DashboardScreen;