import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView, FlatList, Modal, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/api';
import { colors } from '../theme/colors';

const ProduccionScreen = () => {
    const [activeOrder, setActiveOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('NUEVO'); // 'NUEVO' | 'ENCOLADO'

    // Formulario Nuevo Bloque
    const [newBlock, setNewBlock] = useState({ codigo: '', largo: '', pesoSin: '' });

    // Estado Encolado (Modal)
    const [glueModalVisible, setGlueModalVisible] = useState(false);
    const [selectedBlock, setSelectedBlock] = useState(null); // Bloque seleccionado para encolar
    const [glueWeight, setGlueWeight] = useState('');

    const fetchActiveOrder = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/ordenes-taller/activa');
            // Si retorna 204 o vacío, es null
            if (response.status === 204 || !response.data) {
                setActiveOrder(null);
            } else {
                setActiveOrder(response.data);
            }
        } catch (error) {
            console.error(error);
            setActiveOrder(null);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchActiveOrder();
        }, [])
    );

    const handleStartOrder = async () => {
        Alert.alert(
            'Confirmar Inicio',
            '¿Desea iniciar una nueva orden de taller?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Iniciar',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await api.post('/api/ordenes-taller/iniciar');
                            fetchActiveOrder();
                        } catch (e) {
                            Alert.alert('Error', 'No se pudo iniciar la orden');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleFinishOrder = async () => {
        if (!activeOrder) return;
        Alert.alert(
            'Finalizar Orden',
            '¿Está seguro de finalizar la producción actual?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Finalizar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            // Asumimos endpoint global o por ID
                            await api.patch(`/api/ordenes-taller/finalizar`);
                            fetchActiveOrder(); // Debería volver a null
                        } catch (e) {
                            Alert.alert('Error', 'No se pudo finalizar la orden');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleCreateBlock = async () => {
        if (!newBlock.codigo || !newBlock.largo || !newBlock.pesoSin) {
            Alert.alert('Error', 'Complete todos los campos');
            return;
        }

        try {
            const payload = {
                ordenTaller: { id: activeOrder.id },
                bloqueCodigo: newBlock.codigo, // String o number según BD, enviamos lo que capta el input (string)
                bloqueLargo: parseFloat(newBlock.largo),
                // Asumiendo bAncho y bAlto opcionales o 0 por ahora
                bloqueAncho: 0,
                bloqueAlto: 0,
                bloquePesoSinCola: parseFloat(newBlock.pesoSin),
                bloqueBftFinal: 0,
                bloqueEstado: 'PRESENTADO'
            };

            await api.post('/api/bloques', payload);
            Alert.alert('Éxito', 'Bloque registrado');
            setNewBlock({ codigo: '', largo: '', pesoSin: '' });
            fetchActiveOrder(); // Recargar lista de bloques
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Falló el registro del bloque');
        }
    };

    const openGlueModal = (block) => {
        setSelectedBlock(block);
        setGlueWeight('');
        setGlueModalVisible(true);
    };

    const handleRegisterGlue = async () => {
        if (!glueWeight) return;

        try {
            const pesoCon = parseFloat(glueWeight);
            const pesoSin = selectedBlock.bloquePesoSinCola || selectedBlock.pesoSin || selectedBlock.bPesoSinCola || 0;

            if (pesoCon <= pesoSin) {
                Alert.alert('Error', `Debe ingresar un valor mayor al peso sin cola (${pesoSin}g)`);
                return;
            }

            // Aseguramos el ID del bloque
            const blockId = selectedBlock.id || selectedBlock.idBloque;

            if (!blockId) {
                Alert.alert('Error', 'No se encontró el ID del bloque. Intente recargar.');
                return;
            }

            await api.put(`/api/bloques/${blockId}/encolado`, {
                bloquePesoConCola: pesoCon
            });

            setGlueModalVisible(false);
            Alert.alert('Éxito', 'Peso con cola registrado');
            fetchActiveOrder(); // Actualizar lista
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'No se pudo registrar el peso');
        }
    };

    // Renderizado condicional
    if (loading && !activeOrder) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    // VISTA: SIN ORDEN
    if (!activeOrder) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={styles.noOrderText}>No hay producción en curso</Text>
                <TouchableOpacity style={styles.startBtn} onPress={handleStartOrder}>
                    <Text style={styles.startBtnText}>INICIAR NUEVA ORDEN</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Filtrar bloques para Encolado
    const bloquesEncolado = activeOrder.bloques ? activeOrder.bloques.filter(b => b.estado === 'PRESENTADO') : [];
    // Bloques recientes (todos o invertidos)
    const bloquesRecientes = activeOrder.bloques ? [...activeOrder.bloques].sort((a, b) => b.id - a.id) : [];

    return (
        <View style={styles.container}>
            {/* ENCABEZADO ORDEN */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Orden de Taller #{activeOrder.id || activeOrder.idOrdenTaller || '---'}</Text>
                    <Text style={styles.headerSubtitle}>Inicio: {activeOrder.fechaInicio ? new Date(activeOrder.fechaInicio).toLocaleTimeString() : '---'}</Text>
                </View>
                <TouchableOpacity style={styles.finishBtn} onPress={handleFinishOrder}>
                    <Text style={styles.finishBtnText}>FINALIZAR</Text>
                </TouchableOpacity>
            </View>

            {/* TABS */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'NUEVO' && styles.tabActive]}
                    onPress={() => setActiveTab('NUEVO')}
                >
                    <Text style={[styles.tabText, activeTab === 'NUEVO' && styles.tabTextActive]}>Nuevo Bloque</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'ENCOLADO' && styles.tabActive]}
                    onPress={() => setActiveTab('ENCOLADO')}
                >
                    <Text style={[styles.tabText, activeTab === 'ENCOLADO' && styles.tabTextActive]}>
                        Encolado ({bloquesEncolado.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'NUEVO' ? (
                <ScrollView contentContainerStyle={styles.content}>
                    {/* FORMULARIO */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Registrar Bloque</Text>

                        <Text style={styles.label}>Código Bloque</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej. 1045"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="numeric"
                            value={newBlock.codigo}
                            onChangeText={t => setNewBlock({ ...newBlock, codigo: t })}
                        />

                        <View style={styles.row}>
                            <View style={[styles.col, { marginRight: 10 }]}>
                                <Text style={styles.label}>Largo</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    value={newBlock.largo}
                                    onChangeText={t => setNewBlock({ ...newBlock, largo: t })}
                                />
                            </View>
                            <View style={styles.col}>
                                <Text style={styles.label}>Peso Sin Cola</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    value={newBlock.pesoSin}
                                    onChangeText={t => setNewBlock({ ...newBlock, pesoSin: t })}
                                />
                            </View>
                        </View>

                        <TouchableOpacity style={styles.saveBtn} onPress={handleCreateBlock}>
                            <Text style={styles.saveBtnText}>GUARDAR BLOQUE</Text>
                        </TouchableOpacity>
                    </View>

                    {/* LISTA RECIENTE */}
                    <Text style={styles.listTitle}>Bloques Registrados</Text>
                    {bloquesRecientes.map((item, index) => (
                        <View key={item.id || index} style={styles.itemRow}>
                            <Text style={styles.itemTextBold}>{item.bloqueCodigo || item.codigo || item.bCodigo || "S/C"}</Text>
                            <Text style={styles.itemText}>L:{item.bloqueLargo || item.largo || item.bLargo || 0}</Text>
                            <Text style={styles.itemText}>{item.bloquePesoSinCola || item.pesoSin || item.bPesoSinCola || 0}g</Text>
                            <Text style={[styles.itemBadge, { backgroundColor: item.estado === 'ENCOLADO' ? colors.success : colors.warning }]}>
                                {item.estado}
                            </Text>
                        </View>
                    ))}
                </ScrollView>
            ) : (
                <View style={styles.content}>
                    <Text style={styles.listTitle}>Seleccione bloque para Encolar</Text>
                    <FlatList
                        data={bloquesEncolado}
                        keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.glueItem} onPress={() => openGlueModal(item)}>
                                <View>
                                    <Text style={styles.glueItemTitle}>Código: {item.bloqueCodigo || item.codigo || item.bCodigo}</Text>
                                    <Text style={styles.glueItemSub}>Peso Sin: {item.bloquePesoSinCola || item.pesoSin || item.bPesoSinCola}g</Text>
                                </View>
                                <Text style={styles.tapAction}>Pesar &gt;</Text>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={<Text style={styles.emptyText}>No hay bloques pendientes de encolado</Text>}
                    />
                </View>
            )}

            {/* MODAL ENCOLADO */}
            <Modal visible={glueModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Registro de Encolado</Text>
                        {selectedBlock && (
                            <Text style={styles.modalSub}>
                                Bloque: {selectedBlock.bloqueCodigo || selectedBlock.codigo} (Sin: {selectedBlock.bloquePesoSinCola || selectedBlock.pesoSin}g)
                            </Text>
                        )}

                        <Text style={styles.label}>Peso Con Cola (g)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            autoFocus
                            value={glueWeight}
                            onChangeText={setGlueWeight}
                        />

                        <TouchableOpacity style={styles.saveBtn} onPress={handleRegisterGlue}>
                            <Text style={styles.saveBtnText}>CONFIRMAR PESO</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setGlueModalVisible(false)}>
                            <Text style={styles.cancelBtnText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20 },

    // Estados Vacíos / Carga
    noOrderText: { color: colors.textSecondary, fontSize: 18, marginBottom: 20 },
    startBtn: { backgroundColor: colors.success, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 10 },
    startBtnText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },

    // Header Orden
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerTitle: { color: colors.primary, fontSize: 18, fontWeight: 'bold' },
    headerSubtitle: { color: colors.textSecondary, fontSize: 14 },
    finishBtn: { backgroundColor: '#c0392b', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 5 },
    finishBtnText: { color: colors.white, fontSize: 12, fontWeight: 'bold' },

    // Tabs
    tabs: { flexDirection: 'row', backgroundColor: colors.card },
    tab: { flex: 1, padding: 15, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: colors.primary },
    tabText: { color: colors.textSecondary, fontWeight: 'bold' },
    tabTextActive: { color: colors.primary },

    // Forms
    card: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 10, marginBottom: 20 },
    sectionTitle: { color: colors.white, fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
    label: { color: colors.textSecondary, marginBottom: 5, fontSize: 14 },
    input: { backgroundColor: colors.background, color: colors.white, borderRadius: 8, padding: 10, marginBottom: 15, borderWidth: 1, borderColor: colors.border },
    row: { flexDirection: 'row' },
    col: { flex: 1 },

    saveBtn: { backgroundColor: colors.primary, padding: 15, borderRadius: 8, alignItems: 'center' },
    saveBtnText: { color: colors.background, fontWeight: 'bold' },

    // Lista
    listTitle: { color: colors.primary, fontSize: 16, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: colors.card, marginBottom: 5, borderRadius: 8 },
    itemText: { color: colors.textSecondary },
    itemTextBold: { color: colors.white, fontWeight: 'bold' },
    itemBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, color: '#fff', fontSize: 10, fontWeight: 'bold', overflow: 'hidden' },

    // Encolado Items
    glueItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: colors.card, marginBottom: 10, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: colors.warning },
    glueItemTitle: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
    glueItemSub: { color: colors.textSecondary },
    tapAction: { color: colors.primary, fontWeight: 'bold' },
    emptyText: { color: colors.textSecondary, textAlign: 'center', marginTop: 20, fontStyle: 'italic' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: colors.background, padding: 20, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
    modalTitle: { color: colors.primary, fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    modalSub: { color: colors.white, marginBottom: 20, textAlign: 'center' },
    cancelBtn: { marginTop: 10, padding: 15, alignItems: 'center' },
    cancelBtnText: { color: colors.textSecondary }
});

export default ProduccionScreen;