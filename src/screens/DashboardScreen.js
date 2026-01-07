import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { colors } from '../theme/colors';
import { configureApi, loadApiConfiguration } from '../api/api';

const MenuButton = ({ title, onPress }) => (
    <TouchableOpacity style={styles.card} onPress={onPress}>
        <Text style={styles.cardTitle}>{title}</Text>
    </TouchableOpacity>
);

const DashboardScreen = ({ navigation }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [ipAddress, setIpAddress] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const ip = await loadApiConfiguration();
        setIpAddress(ip);
    };

    const handleSaveSettings = async () => {
        if (!ipAddress) {
            Alert.alert('Error', 'Ingrese una IP válida');
            return;
        }
        await configureApi(ipAddress);
        setModalVisible(false);
        Alert.alert('Éxito', 'Configuración guardada');
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.headerContainer}>
                    <Text style={styles.header}>Panel Supervisor</Text>
                    <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.settingsBtn}>
                        <Text style={styles.settingsBtnText}>⚙️</Text>
                    </TouchableOpacity>
                </View>

                <MenuButton
                    title="🌲 Gestión Madera Verde"
                    onPress={() => navigation.navigate('IngresoPallets')}
                />
                <MenuButton
                    title="🌪️ Gestión de Secado"
                    onPress={() => navigation.navigate('GestionSecado')}
                />
                <MenuButton
                    title="⚙️ Gestión de Taller"
                    onPress={() => navigation.navigate('Produccion')}
                />
                <MenuButton
                    title="📦 Desembarque"
                    onPress={() => navigation.navigate('Agrupacion')}
                />
            </ScrollView>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Configuración de Conexión</Text>

                        <Text style={styles.label}>Dirección IP del Servidor</Text>
                        <TextInput
                            style={styles.input}
                            value={ipAddress}
                            onChangeText={setIpAddress}
                            placeholder="Ej. 192.168.X.X"
                            keyboardType="url"
                            autoCapitalize="none"
                        />
                        <Text style={styles.hint}>Puerto por defecto: 8080</Text>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => setModalVisible(false)}>
                                <Text style={styles.btnText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleSaveSettings}>
                                <Text style={styles.btnText}>Guardar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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

    // Modal Styles
    modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 },
    modalContent: { backgroundColor: 'white', borderRadius: 15, padding: 20, elevation: 5 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#333', textAlign: 'center' },
    label: { fontSize: 14, color: '#666', marginBottom: 5 },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 16, marginBottom: 5 },
    hint: { fontSize: 12, color: '#999', marginBottom: 20 },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
    btn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
    btnCancel: { backgroundColor: '#ccc' },
    btnSave: { backgroundColor: colors.primary },
    btnText: { color: 'white', fontWeight: 'bold' }
});

export default DashboardScreen;