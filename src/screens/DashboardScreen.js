import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import FormIP from './FormIP';
import { AuthContext } from '../context/AuthContext';

const MenuButton = ({ title, onPress }) => (
    <TouchableOpacity style={styles.card} onPress={onPress}>
        <Text style={styles.cardTitle}>{title}</Text>
    </TouchableOpacity>
);

const DashboardScreen = ({ navigation }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const { authContext } = useContext(AuthContext);

    return (
        <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.headerContainer}>
                    <Text style={styles.header}>Panel Supervisor</Text>
                    <View style={{ flexDirection: 'row' }}>
                        <TouchableOpacity onPress={() => authContext.signOut()} style={[styles.settingsBtn, { marginRight: 10 }]}>
                            <Text style={styles.settingsBtnText}>🚪</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.settingsBtn}>
                            <Text style={styles.settingsBtnText}>⚙️</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <MenuButton
                    title="🌲 Madera Verde"
                    onPress={() => navigation.navigate('IngresoPallets')}
                />
                <MenuButton
                    title="🌪️ Secado"
                    onPress={() => navigation.navigate('GestionSecado')}
                />
                <MenuButton
                    title="⚙️ Taller"
                    onPress={() => navigation.navigate('Produccion')}
                />
                <MenuButton
                    title="📦 Embarque"
                    onPress={() => navigation.navigate('Agrupacion')}
                />
            </ScrollView>

            <FormIP
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 20, backgroundColor: colors.background },
    headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    header: { fontSize: 24, color: colors.primary, fontWeight: 'bold' },
    settingsBtn: { padding: 10 },
    settingsBtnText: { fontSize: 24 },

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