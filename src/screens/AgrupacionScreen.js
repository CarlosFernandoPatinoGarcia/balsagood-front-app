import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, TextInput, Modal } from 'react-native';
import api from '../api/api';
import { colors } from '../theme/colors';

const AgrupacionScreen = () => {
    const [bloques, setBloques] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [largoTotal, setLargoTotal] = useState(0);
    const [bftTotal, setBftTotal] = useState(0);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [exportCode, setExportCode] = useState('');
    const [observacion, setObservacion] = useState('');

    useEffect(() => {
        fetchBloques();
    }, []);

    // Recalcular totales al seleccionar
    useEffect(() => {
        if (!Array.isArray(bloques)) return;
        const selectedBloques = bloques.filter(b => selectedIds.includes(b.idBloque));

        const sumLargo = selectedBloques.reduce((sum, b) => sum + (b.bloqueLargo || 0), 0);
        setLargoTotal(sumLargo);

        const sumBft = selectedBloques.reduce((sum, b) => sum + (b.bloqueBftFinal || 0), 0);
        setBftTotal(sumBft);

    }, [selectedIds, bloques]);

    const fetchBloques = async () => {
        try {
            const res = await api.get('/api/bloques/encolados');
            setBloques(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'No se pudieron cargar los bloques encolados.');
        }
    };

    const toggleSelection = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handlePreConfirm = () => {
        if (selectedIds.length === 0) {
            Alert.alert('Atención', 'Seleccione al menos un bloque.');
            return;
        }
        setExportCode('');
        setObservacion('');
        setModalVisible(true);
    };

    const handleFinalizar = async () => {
        if (!exportCode.trim()) {
            Alert.alert('Error', 'Ingrese un código de exportación (Despacho).');
            return;
        }

        try {
            const payload = {
                despacho: {
                    despCodigo: exportCode,
                    despFecha: new Date().toISOString().split('T')[0],
                    despObservacion: observacion || "Sin observaciones"
                },
                cuerpo: {
                    observacion: "Agrupación desde App Móvil",
                    bftFinal: bftTotal,
                    idsBloques: selectedIds
                }
            };

            console.log("Enviando despacho:", payload);
            await api.post('/api/despachos/registrar', payload);

            Alert.alert('Éxito', 'Despacho registrado correctamente.');
            setModalVisible(false);
            setSelectedIds([]);
            fetchBloques(); // Recargar lista
        } catch (e) {
            console.error("Error al registrar despacho:", e);
            const msg = e.response?.data?.message || e.response?.data || 'No se pudo procesar el despacho.';
            Alert.alert('Error', `Status ${e.response?.status}: ${msg}`);
        }
    };

    const renderItem = ({ item }) => {
        const isSelected = selectedIds.includes(item.idBloque);
        return (
            <TouchableOpacity
                style={[styles.item, isSelected && styles.itemSelected]}
                onPress={() => toggleSelection(item.idBloque)}
            >
                <View>
                    <Text style={styles.itemText}>Bloque #{item.bloqueCodigo}</Text>
                    <Text style={styles.itemSub}>
                        Largo: {item.bloqueLargo}" | BFT: {(item.bloqueBftFinal || 0).toFixed(2)}
                    </Text>
                </View>
                {isSelected && <Text style={styles.check}>✓</Text>}
            </TouchableOpacity>
        );
    };

    const filteredBloques = Array.isArray(bloques) ? bloques.filter(b =>
        (b.bloqueCodigo || '').toString().includes(searchQuery)
    ) : [];

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Seleccione Bloques para Despacho</Text>
            <Text style={styles.subHeader}>Seleccionados: {selectedIds.length} | BFT Total: {bftTotal.toFixed(2)}</Text>

            <TextInput
                style={styles.searchInput}
                placeholder="Buscar por código..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
                keyboardType="numeric"
            />

            <FlatList
                data={filteredBloques}
                keyExtractor={item => item.idBloque.toString()}
                renderItem={renderItem}
                contentContainerStyle={{ paddingBottom: 100 }}
            />

            <View style={styles.footer}>
                <TouchableOpacity
                    onPress={handlePreConfirm}
                    style={[styles.btn, selectedIds.length === 0 && styles.btnDisabled]}
                    disabled={selectedIds.length === 0}
                >
                    <Text style={styles.btnText}>CONFIRMAR EXPORTACIÓN</Text>
                </TouchableOpacity>
            </View>

            {/* Modal de Confirmación */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Confirmar Despacho</Text>

                        <Text style={styles.label}>Código de Exportación / Despacho</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej. EXP-2026-001"
                            value={exportCode}
                            onChangeText={setExportCode}
                            autoCapitalize="characters"
                        />

                        <Text style={styles.label}>Observaciones</Text>
                        <TextInput
                            style={[styles.input, { height: 60 }]}
                            placeholder="Notas opcionales..."
                            value={observacion}
                            onChangeText={setObservacion}
                            multiline
                        />

                        <View style={styles.summaryContainer}>
                            <Text style={styles.summaryText}>Bloques: {selectedIds.length}</Text>
                            <Text style={styles.summaryText}>Total BFT: {bftTotal.toFixed(2)}</Text>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalBtn, styles.btnCancel]} onPress={() => setModalVisible(false)}>
                                <Text style={styles.btnText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, styles.btnSave]} onPress={handleFinalizar}>
                                <Text style={styles.btnText}>Enviar Despacho</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 20 },
    header: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
    subHeader: { color: colors.primary, fontSize: 16, marginBottom: 15 },
    searchInput: {
        backgroundColor: colors.card,
        color: colors.white,
        padding: 10,
        borderRadius: 8,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#555'
    },
    item: { backgroundColor: colors.card, padding: 15, borderRadius: 8, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    itemSelected: { borderColor: colors.primary, borderWidth: 1 },
    itemText: { color: colors.white, fontWeight: 'bold' },
    itemSub: { color: colors.textSecondary },
    check: { color: colors.primary, fontSize: 20, fontWeight: 'bold' },
    footer: { position: 'absolute', bottom: 20, left: 20, right: 20 },
    btn: { backgroundColor: colors.primary, padding: 15, borderRadius: 8, alignItems: 'center' },
    btnDisabled: { backgroundColor: '#555' },
    btnText: { color: colors.background, fontWeight: 'bold' },

    // Modal Styles
    modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 },
    modalContent: { backgroundColor: 'white', borderRadius: 15, padding: 20, elevation: 5 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#333', textAlign: 'center' },
    label: { fontSize: 14, color: '#666', marginBottom: 5, marginTop: 10 },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 16 },
    summaryContainer: { marginVertical: 15, padding: 10, backgroundColor: '#f9f9f9', borderRadius: 8 },
    summaryText: { color: '#333', fontWeight: '600' },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    modalBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
    btnCancel: { backgroundColor: '#ccc' },
    btnSave: { backgroundColor: colors.primary },
});

export default AgrupacionScreen;