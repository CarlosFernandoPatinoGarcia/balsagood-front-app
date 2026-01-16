import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Alert, Switch } from 'react-native';
import { colors } from '../theme/colors';
import { configureApi, loadApiConfiguration } from '../api/api';

const MenuButton = ({ title, onPress }) => (
    <TouchableOpacity style={styles.card} onPress={onPress}>
        <Text style={styles.cardTitle}>{title}</Text>
    </TouchableOpacity>
);

const DashboardScreen = ({ navigation }) => {
    const [modalVisible, setModalVisible] = useState(false);

    // Config States
    const [mode, setMode] = useState('ip'); // 'ip' or 'url'
    const [protocol, setProtocol] = useState('http');
    const [ip, setIp] = useState('');
    const [port, setPort] = useState('8080');
    const [fullUrl, setFullUrl] = useState('');

    useEffect(() => {
        if (modalVisible) {
            loadSettings();
        }
    }, [modalVisible]);

    const loadSettings = async () => {
        const currentUrl = await loadApiConfiguration();

        // Populate Full URL field
        setFullUrl(currentUrl);

        // Try to parse for IP mode
        // Regex to match: (http|https)://(hostname)(:port)?
        const match = currentUrl.match(/^(https?):\/\/([^:]+)(?::(\d+))?$/);
        if (match) {
            setProtocol(match[1]);
            setIp(match[2]);
            setPort(match[3] || '8080');
            setMode('ip');
        } else {
            // If complex URL, default to URL mode
            setMode('url');
        }
    };

    const handleSaveSettings = async () => {
        let finalUrl = '';

        if (mode === 'ip') {
            if (!ip.trim()) {
                Alert.alert('Error', 'Ingrese una IP o Host válido');
                return;
            }
            const cleanIp = ip.trim();
            const cleanPort = port.trim();
            finalUrl = `${protocol}://${cleanIp}${cleanPort ? ':' + cleanPort : ''}`;
        } else {
            if (!fullUrl.trim()) {
                Alert.alert('Error', 'Ingrese una URL válida');
                return;
            }
            finalUrl = fullUrl.trim();
        }

        await configureApi(finalUrl);
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

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Configuración de Conexión</Text>

                        {/* Toggle Mode */}
                        <View style={styles.modeToggleContainer}>
                            <TouchableOpacity
                                style={[styles.modeBtn, mode === 'ip' && styles.modeBtnActive]}
                                onPress={() => setMode('ip')}
                            >
                                <Text style={[styles.modeBtnText, mode === 'ip' && styles.modeBtnTextActive]}>Modo IP</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modeBtn, mode === 'url' && styles.modeBtnActive]}
                                onPress={() => setMode('url')}
                            >
                                <Text style={[styles.modeBtnText, mode === 'url' && styles.modeBtnTextActive]}>URL Completa</Text>
                            </TouchableOpacity>
                        </View>

                        {mode === 'ip' ? (
                            <View>
                                <Text style={styles.label}>Protocolo</Text>
                                <View style={styles.protocolContainer}>
                                    <TouchableOpacity
                                        style={[styles.protocolBtn, protocol === 'http' && styles.protocolBtnActive]}
                                        onPress={() => setProtocol('http')}
                                    >
                                        <Text style={[styles.protocolText, protocol === 'http' && styles.protocolTextActive]}>HTTP</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.protocolBtn, protocol === 'https' && styles.protocolBtnActive]}
                                        onPress={() => setProtocol('https')}
                                    >
                                        <Text style={[styles.protocolText, protocol === 'https' && styles.protocolTextActive]}>HTTPS</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.label}>Host / IP</Text>
                                <TextInput
                                    style={styles.input}
                                    value={ip}
                                    onChangeText={setIp}
                                    placeholder="Ej. 192.168.1.63"
                                    autoCapitalize="none"
                                />

                                <Text style={styles.label}>Puerto</Text>
                                <TextInput
                                    style={styles.input}
                                    value={port}
                                    onChangeText={setPort}
                                    placeholder="Ej. 8080"
                                    keyboardType="numeric"
                                />
                            </View>
                        ) : (
                            <View>
                                <Text style={styles.label}>URL del Servidor</Text>
                                <TextInput
                                    style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                                    value={fullUrl}
                                    onChangeText={setFullUrl}
                                    placeholder="https://api.midominio.com/v1"
                                    multiline
                                    autoCapitalize="none"
                                />
                            </View>
                        )}

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

    label: { fontSize: 14, color: '#666', marginBottom: 5, marginTop: 5 },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 16, marginBottom: 5 },

    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
    btn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
    btnCancel: { backgroundColor: '#ccc' },
    btnSave: { backgroundColor: colors.primary },
    btnText: { color: 'white', fontWeight: 'bold' },

    // Mode Toggle
    modeToggleContainer: { flexDirection: 'row', marginBottom: 15, backgroundColor: '#f0f0f0', borderRadius: 8, padding: 4 },
    modeBtn: { flex: 1, padding: 8, alignItems: 'center', borderRadius: 6 },
    modeBtnActive: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41, elevation: 2 },
    modeBtnText: { color: '#666', fontWeight: '600' },
    modeBtnTextActive: { color: colors.primary, fontWeight: 'bold' },

    // Protocol Toggle
    protocolContainer: { flexDirection: 'row', marginBottom: 10 },
    protocolBtn: { paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 6, marginRight: 10 },
    protocolBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' }, // 10 is hex opacity ~6%
    protocolText: { color: '#666' },
    protocolTextActive: { color: colors.primary, fontWeight: 'bold' },
});

export default DashboardScreen;