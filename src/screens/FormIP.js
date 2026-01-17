import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { colors } from '../theme/colors';
import { configureApi, loadApiConfiguration } from '../api/api';

const FormIP = ({ visible, onClose }) => {
    // Config States
    const [mode, setMode] = useState('ip'); // 'ip' or 'url'
    const [protocol, setProtocol] = useState('http');
    const [ip, setIp] = useState('');
    const [port, setPort] = useState('8080');
    const [fullUrl, setFullUrl] = useState('');

    useEffect(() => {
        if (visible) {
            loadSettings();
        }
    }, [visible]);

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

            // Allow empty port (defaults to 80/443 standard implicitly by browser/http client, 
            // but here we used to force 8080. Logic in api.js handles empty port by default?
            // Actually our previous logic in api.js: if no port, add 8080.
            // But here we construct the URL explicitly.
            // If user leaves port empty in IP mode, let's assume they mean default (80/443) or 8080?
            // The prompt "Puerto por defecto: 8080" implies we should use 8080 if not specified? 
            // Let's keep logic: if port provided, use it. If not, don't append colon.

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
        onClose();
        Alert.alert('Éxito', 'Configuración guardada');
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
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
                        <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={onClose}>
                            <Text style={styles.btnText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleSaveSettings}>
                            <Text style={styles.btnText}>Guardar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
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
    protocolBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
    protocolText: { color: '#666' },
    protocolTextActive: { color: colors.primary, fontWeight: 'bold' },
});

export default FormIP;
