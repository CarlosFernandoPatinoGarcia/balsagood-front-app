import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, FlatList, Platform } from 'react-native';
import api from '../api/api';
import { colors } from '../theme/colors';

// --- Components Helpers ---

const CameraSelectorModal = ({ visible, onClose, cameras, onSelect }) => {
    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Seleccionar Cámara</Text>
                    <FlatList
                        data={cameras}
                        keyExtractor={(item, index) => {
                            const id = item.id_camara || item.idCamara || item.id;
                            return id ? id.toString() : `cam-fallback-${index}`;
                        }}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.modalItem} onPress={() => onSelect(item)}>
                                <Text style={styles.modalItemText}>
                                    {item.camaraDescripcion}
                                    {/* Mostrar Capacidad Disponible si existe, si no, la total */}
                                    {item.capacidadDisponible != null
                                        ? ` (Disp: ${parseFloat(item.capacidadDisponible).toFixed(2)})`
                                        : ` (Cap: ${item.capacidadTotal || item.camaraCapacidad})`}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Text style={styles.closeBtnText}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const DatePickerModal = ({ visible, onClose, onSelect, initialDate, title }) => {
    const [year, setYear] = useState(initialDate ? initialDate.split('-')[0] : new Date().getFullYear().toString());
    const [month, setMonth] = useState(initialDate ? initialDate.split('-')[1] : (new Date().getMonth() + 1).toString().padStart(2, '0'));
    const [day, setDay] = useState(initialDate ? initialDate.split('-')[2] : new Date().getDate().toString().padStart(2, '0'));

    const handleConfirm = () => {
        // Simple Validation
        if (!year || !month || !day) return;
        const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T08:00:00`; // Appending time to match ISO format req roughly
        onSelect(dateStr);
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContentSmall}>
                    <Text style={styles.modalTitle}>{title}</Text>
                    <View style={styles.dateRow}>
                        <TextInput style={styles.dateInput} value={day} onChangeText={setDay} placeholder="DD" keyboardType="numeric" maxLength={2} />
                        <Text style={styles.dateSep}>/</Text>
                        <TextInput style={styles.dateInput} value={month} onChangeText={setMonth} placeholder="MM" keyboardType="numeric" maxLength={2} />
                        <Text style={styles.dateSep}>/</Text>
                        <TextInput style={styles.dateInput} value={year} onChangeText={setYear} placeholder="YYYY" keyboardType="numeric" maxLength={4} />
                    </View>
                    <View style={styles.modalBtnRow}>
                        <TouchableOpacity style={[styles.closeBtn, { flex: 1, marginRight: 5 }]} onPress={onClose}>
                            <Text style={styles.closeBtnText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.confirmBtn, { flex: 1, marginLeft: 5 }]} onPress={handleConfirm}>
                            <Text style={styles.confirmBtnText}>Confirmar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// --- Main Screen ---

const GestionSecadoScreen = () => {
    const [activeTab, setActiveTab] = useState('pendientes'); // pendientes, proceso, historial
    const [palletsDisponibles, setPalletsDisponibles] = useState([]);
    const [selectedPallets, setSelectedPallets] = useState([]);
    const [camaras, setCamaras] = useState([]);
    const [lotes, setLotes] = useState([]);

    // Función helper para obtener fecha local YYYY-MM-DD
    const getLocalDate = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [formData, setFormData] = useState({
        idCamara: null,
        camaraDescripcion: '',
        loteCodigo: '', // Nuevo campo obligatorio
        // Usar fecha local
        loteFechaInicio: getLocalDate() + 'T08:00:00',
        loteFechaFin: '',
        loteObservaciones: ''
    });

    // Modal States
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // 1. Pallets Disponibles (Madera Verde)
            // Endpoint updated to /api/secado/disponibles as per user request
            const resPallets = await api.get('/api/secado/disponibles');
            setPalletsDisponibles(resPallets.data || []);

            // 2. Camaras Disponibles
            const resCamaras = await api.get('/api/camaras/estado/disponibles');
            setCamaras(resCamaras.data || []);

            // 3. Lotes
            const resLotes = await api.get('/api/lotes-secado');
            setLotes(resLotes.data || []);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    // --- Tab 1: Pendientes Logic ---

    const togglePalletSelection = (id) => {
        if (selectedPallets.includes(id)) {
            setSelectedPallets(prev => prev.filter(pId => pId !== id));
        } else {
            setSelectedPallets(prev => [...prev, id]);
        }
    };

    const calculateSelectedBFT = () => {
        // Ajustar ID matching: p.idPallet (DTO) en lugar de p.id_pallet
        const selected = palletsDisponibles.filter(p => selectedPallets.includes(p.idPallet));
        return selected.reduce((sum, p) => sum + (parseFloat(p.bftVerdeAceptado) || 0), 0);
    };

    // Validation Logic
    const totalBFT = calculateSelectedBFT();
    const selectedCamera = camaras.find(c => (c.idCamara || c.id) === formData.idCamara);
    // Capacidad disponible: si viene del backend, usala. Si no, usa capacidad total como fallback (o Infinite si no hay data)
    // Pero el requisito dice que capacityDisponible viene en el DTO.
    const availableCapacity = selectedCamera ? parseFloat(selectedCamera.capacidadDisponible || selectedCamera.camaraCapacidad || 0) : 0;

    // Validar si excede capacidad. Solo validar si se ha seleccionado cámara.
    const isCapacityExceeded = formData.idCamara && totalBFT > availableCapacity;

    const isValid =
        formData.idCamara !== null &&
        formData.loteCodigo.trim() !== '' && // Validar código obligatorio
        formData.loteFechaInicio &&
        formData.loteFechaFin &&
        selectedPallets.length > 0 &&
        !isCapacityExceeded;

    const handleCreateLote = async () => {
        if (!isValid) return;

        const payload = {
            idCamara: parseInt(formData.idCamara),
            loteCodigo: formData.loteCodigo, // Enviamos el nuevo campo
            loteFechaInicio: formData.loteFechaInicio,
            loteFechaFin: formData.loteFechaFin,
            idPallets: selectedPallets.map(id => parseInt(id)),
            loteObservaciones: formData.loteObservaciones
        };

        console.log("SENDING PAYLOAD:", JSON.stringify(payload, null, 2));

        try {
            const response = await api.post('/api/secado/crear', payload);
            console.log("RESPONSE SUCCESS:", response.data);

            const estado = response.data?.estado || 'PROGRAMADO';
            Alert.alert('Éxito', `Lote Creado. Estado: ${estado}`);

            setFormData({
                idCamara: null,
                camaraDescripcion: '',
                loteCodigo: '',
                // fecha local
                loteFechaInicio: getLocalDate() + 'T08:00:00',
                loteFechaFin: '',
                loteObservaciones: ''
            });
            console.log("Datos del formulario reseteados");
            setSelectedPallets([]);
            fetchData();
            setActiveTab('proceso');
        } catch (error) {
            console.log("ERROR CREATE LOTE:", error);
            if (error.response) {
                console.log("SERVER ERROR DATA:", JSON.stringify(error.response.data, null, 2));
                // Mostrar mensaje específico del backend si existe (e.g., validación de capacidad)
                const errorMsg = error.response.data?.message || JSON.stringify(error.response.data);
                Alert.alert('Error', errorMsg);
            } else {
                Alert.alert('Error', error.message || 'No se pudo crear el lote');
            }
        }
    };

    // --- Tab 2/3: Lotes Logic ---

    // Updated Logic:
    // Process = Not 'FINALIZADO'
    // History = 'FINALIZADO'

    const handleFinalizeLote = (lote) => {
        Alert.alert(
            'Confirmar Finalización',
            '¿Confirmas que el lote ha salido físicamente de la cámara y está listo para stock seco?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar', onPress: async () => {
                        try {
                            await api.patch(`/api/secado/finalizar/${lote.idLote}`);
                            Alert.alert('Éxito', 'Lote enviado a Stock Seco');
                            fetchData();
                        } catch (error) {
                            console.error("ERROR FINALIZING LOTE:", error);
                            if (error.response) {
                                console.log("SERVER ERROR FINALIZING:", JSON.stringify(error.response.data, null, 2));
                                const errorMsg = error.response.data?.message || JSON.stringify(error.response.data);
                                Alert.alert('Error del Servidor', `No se pudo finalizar.\n${errorMsg}`);
                            } else {
                                Alert.alert('Error', error.message || 'No se pudo finalizar el lote');
                            }
                        }
                    }
                }
            ]
        );
    };

    // --- Renderers ---

    const renderPendientes = () => (
        <ScrollView style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Configuración de Lote</Text>

            <View style={styles.card}>
                {/* Cámara Selector */}
                <Text style={styles.label}>Cámara *</Text>
                <TouchableOpacity style={styles.selector} onPress={() => setShowCameraModal(true)}>
                    <Text style={[styles.selectorText, !formData.idCamara && styles.placeholderText]}>
                        {formData.camaraDescripcion || 'Seleccionar Cámara...'}
                    </Text>
                </TouchableOpacity>

                {/* Nuevo Campo: Lote Código */}
                <Text style={[styles.label, { marginTop: 15 }]}>Código de Lote *</Text>
                <TextInput
                    style={styles.input}
                    value={formData.loteCodigo}
                    onChangeText={t => setFormData({ ...formData, loteCodigo: t })}
                    placeholder="Ingrese código manual (e.g. 1500)"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="default"
                />

                <View style={styles.row}>
                    <View style={styles.col}>
                        <Text style={styles.label}>Inicio *</Text>
                        <TouchableOpacity style={styles.selector} onPress={() => setShowStartPicker(true)}>
                            <Text style={styles.selectorText}>
                                {formData.loteFechaInicio.split('T')[0]}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.label}>Fin Estimado *</Text>
                        <TouchableOpacity style={styles.selector} onPress={() => setShowEndPicker(true)}>
                            <Text style={[styles.selectorText, !formData.loteFechaFin && styles.placeholderText]}>
                                {formData.loteFechaFin ? formData.loteFechaFin.split('T')[0] : 'Seleccionar'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={styles.label}>Observaciones</Text>
                <TextInput
                    style={styles.input}
                    value={formData.loteObservaciones}
                    onChangeText={t => setFormData({ ...formData, loteObservaciones: t })}
                />
            </View>

            <Text style={styles.sectionTitle}>Seleccionar Pallets (Verdes)</Text>
            <View style={styles.summaryContainer}>
                <Text style={styles.summaryText}>Seleccionados: {selectedPallets.length}</Text>
                <Text style={[
                    styles.summaryText,
                    isCapacityExceeded ? { color: colors.danger } : {}
                ]}>
                    Total BFT: {totalBFT.toFixed(2)}
                    {formData.idCamara && ` / ${availableCapacity.toFixed(2)}`}
                </Text>
            </View>

            {palletsDisponibles.map((p, index) => {
                // Robust ID check to fix "unique key" error
                // Production Endpoint: idPallet
                // Secado Endpoint: id_pallet
                const id = p.idPallet || p.id;
                const uniqueKey = id ? id.toString() : `fallback-${index}`;

                return (
                    <TouchableOpacity
                        key={uniqueKey}
                        style={[styles.palletItem, selectedPallets.includes(id) && styles.palletSelected]}
                        onPress={() => togglePalletSelection(id)}
                    >
                        {/* 
                           Display Logic:
                           - If 'codigo' exists (Production Endpoint), show it.
                           - Else show 'Pallet #' + pallet_numero/palletNumero 
                         */}
                        <Text style={styles.palletText}>
                            {/* DTO Mappings: codigo, palletNumero, recepcion.proveedor.provNombre */}
                            {p.codigo ? `Código: ${p.codigo}` : `Pallet #${p.palletNumero || '?'}`}
                            {p.recepcion?.proveedor?.provNombre ? ` - ${p.recepcion.proveedor.provNombre}` : ''}
                        </Text>

                        <Text style={styles.palletSub}>
                            {/* Accedemos al numViaje dentro de recepcion */}
                            Viaje: {p.recepcion?.numViaje || '-'}
                            {p.bftVerdeAceptado ? ` • BFT: ${p.bftVerdeAceptado}` : ''}
                        </Text>
                    </TouchableOpacity>
                );
            })}

            {palletsDisponibles.length === 0 && <Text style={styles.emptyText}>No hay pallets disponibles.</Text>}

            <TouchableOpacity
                style={[styles.actionBtn, !isValid && styles.disabledBtn]}
                onPress={handleCreateLote}
                disabled={!isValid}
                activeOpacity={isValid ? 0.7 : 1}
            >
                <Text style={styles.actionBtnText}>CREAR LOTE</Text>
            </TouchableOpacity>

            {!isValid && (
                <View>
                    <Text style={styles.validationText}>
                        Complete cámara, fechas y seleccione al menos un pallet.
                    </Text>
                    {isCapacityExceeded && (
                        <Text style={[styles.validationText, { color: colors.danger, fontWeight: 'bold' }]}>
                            ¡La capacidad de la cámara es insuficiente!
                            {'\n'}Requerido: {totalBFT.toFixed(2)} - Disponible: {availableCapacity.toFixed(2)}
                        </Text>
                    )}
                </View>
            )}

            <View style={{ height: 50 }} />

            {/* Modals */}
            <CameraSelectorModal
                visible={showCameraModal}
                onClose={() => setShowCameraModal(false)}
                cameras={camaras}
                onSelect={(cam) => {
                    // DTO Mappings: idCamara, camaraDescripcion
                    const id = cam.idCamara || cam.id;
                    setFormData({ ...formData, idCamara: id, camaraDescripcion: cam.camaraDescripcion || `Cámara ${id}` });
                    setShowCameraModal(false);
                }}
            />

            <DatePickerModal
                visible={showStartPicker}
                onClose={() => setShowStartPicker(false)}
                initialDate={formData.loteFechaInicio.split('T')[0]}
                title="Fecha Inicio"
                onSelect={(date) => {
                    setFormData({ ...formData, loteFechaInicio: date });
                    setShowStartPicker(false);
                }}
            />

            <DatePickerModal
                visible={showEndPicker}
                onClose={() => setShowEndPicker(false)}
                initialDate={formData.loteFechaFin ? formData.loteFechaFin.split('T')[0] : ''}
                title="Fecha Fin Estimada"
                onSelect={(date) => {
                    setFormData({ ...formData, loteFechaFin: date });
                    setShowEndPicker(false);
                }}
            />

        </ScrollView>
    );

    const renderLotesList = (dataLotes, isHistory) => (
        <ScrollView style={styles.tabContent}>
            {dataLotes.length === 0 && <Text style={styles.emptyText}>No hay lotes en esta categoría.</Text>}
            {dataLotes.map(lote => {
                // Estado esperado: LISTO PARA BFT
                const isReady = lote.estado === 'LISTO PARA BFT';
                return (
                    // DTO Mapping: idLote
                    <View key={lote.idLote} style={styles.loteCard}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Lote #{lote.idLote}</Text>
                            <View style={[
                                styles.badge,
                                isHistory ? styles.badgeHistory : (isReady ? styles.badgeReady : styles.badgeProcess)
                            ]}>
                                <Text style={styles.badgeText}>
                                    {isHistory ? 'HISTORIAL' : (isReady ? 'LISTO PARA BFT' : (lote.estado || 'SECANDO'))}
                                </Text>
                            </View>
                        </View>

                        {/* DTO Mapping: camara.idCamara */}
                        <Text style={styles.cardSub}>Cámara {lote.camara?.idCamara || '?'} • {lote.especie || 'Balsa'}</Text>

                        <View style={styles.cardBody}>
                            {/* DTO Mappings: loteFechaInicio, loteFechaFin, bftTotalLote */}
                            <Text style={styles.cardInfo}>Inicio: {lote.loteFechaInicio ? lote.loteFechaInicio.split('T')[0] : '-'}</Text>
                            <Text style={styles.cardInfo}>Fin Est: {lote.loteFechaFin ? lote.loteFechaFin.split('T')[0] : '-'}</Text>
                            {isHistory && (
                                <Text style={[styles.cardInfo, { marginTop: 5, color: colors.primary, fontWeight: 'bold' }]}>


                                    BFT Total: {lote.bftTotalLote}
                                </Text>
                            )}
                        </View>

                        {!isHistory && isReady && (
                            <TouchableOpacity
                                style={styles.finalizeBtn}
                                onPress={() => handleFinalizeLote(lote)}
                            >
                                <Text style={styles.finalizeBtnText}>Finalizar y Enviar a Stock</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                );
            })}
            <View style={{ height: 50 }} />
        </ScrollView>
    );

    const lotesProceso = lotes.filter(l => l.estado !== 'FINALIZADO');
    const lotesHistorial = lotes.filter(l => l.estado === 'FINALIZADO');

    return (
        <View style={styles.container}>
            <View style={styles.tabsContainer}>
                {['pendientes', 'proceso', 'historial'].map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {activeTab === 'pendientes' && renderPendientes()}
            {activeTab === 'proceso' && renderLotesList(lotesProceso, false)}
            {activeTab === 'historial' && renderLotesList(lotesHistorial, true)}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    tabsContainer: { flexDirection: 'row', backgroundColor: colors.card },
    tab: { flex: 1, padding: 15, alignItems: 'center' },
    activeTab: { borderBottomWidth: 3, borderBottomColor: colors.primary },
    tabText: { color: colors.textSecondary, fontWeight: 'bold' },
    activeTabText: { color: colors.white },

    tabContent: { padding: 15 },
    sectionTitle: { color: colors.primary, fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginTop: 10 },
    emptyText: { color: colors.textSecondary, textAlign: 'center', marginTop: 20 },

    card: { backgroundColor: colors.card, padding: 15, borderRadius: 10, marginBottom: 15 },
    row: { flexDirection: 'row', gap: 10, marginBottom: 15 },
    col: { flex: 1 },
    label: { color: colors.textSecondary, marginBottom: 8 },
    input: { backgroundColor: 'rgba(255,255,255,0.1)', color: colors.white, padding: 12, borderRadius: 8 },

    // Summary Styles (Requested fix)
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        paddingHorizontal: 5
    },
    summaryText: {
        color: colors.white,
        fontWeight: 'bold',
        fontSize: 16
    },

    // Selectors
    selector: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 8 },
    selectorText: { color: colors.white },
    placeholderText: { color: colors.textSecondary },

    // Pallet Item
    palletItem: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: 'transparent' },
    palletSelected: { borderColor: colors.primary, backgroundColor: 'rgba(76, 175, 80, 0.1)' },
    palletText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
    palletSub: { color: colors.textSecondary, marginTop: 4 },

    actionBtn: { backgroundColor: colors.primary, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
    disabledBtn: { backgroundColor: colors.border, opacity: 0.5 },
    actionBtnText: { color: colors.background, fontWeight: 'bold' },
    validationText: { color: colors.danger, textAlign: 'center', marginTop: 10, fontSize: 12 },

    // Lote Card
    loteCard: { backgroundColor: colors.card, padding: 15, borderRadius: 10, marginBottom: 15, borderLeftWidth: 5, borderLeftColor: colors.primary },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    cardTitle: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
    cardSub: { color: colors.textSecondary, marginBottom: 10 },
    cardBody: { backgroundColor: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 5 },
    cardInfo: { color: colors.textSecondary },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeProcess: { backgroundColor: '#FF9800' },
    badgeReady: { backgroundColor: colors.primary },
    badgeHistory: { backgroundColor: '#607D8B' },
    badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    finalizeBtn: { backgroundColor: colors.primary, marginTop: 15, padding: 12, borderRadius: 5, alignItems: 'center' },
    finalizeBtnText: { color: colors.background, fontWeight: 'bold' },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: colors.background, borderRadius: 15, padding: 20, maxHeight: '70%', borderWidth: 1, borderColor: colors.border },
    modalContentSmall: { width: '80%', backgroundColor: colors.background, borderRadius: 15, padding: 20, borderWidth: 1, borderColor: colors.border },
    modalTitle: { color: colors.primary, fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
    modalItemText: { color: colors.white, fontSize: 16 },
    closeBtn: { marginTop: 15, padding: 10, alignItems: 'center', backgroundColor: colors.card, borderRadius: 8 },
    closeBtnText: { color: colors.textSecondary },
    confirmBtn: { marginTop: 15, padding: 10, alignItems: 'center', backgroundColor: colors.primary, borderRadius: 8 },
    confirmBtnText: { color: colors.background, fontWeight: 'bold' },

    // Date Picker Styles
    dateRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 },
    dateInput: { backgroundColor: 'rgba(255,255,255,0.1)', color: colors.white, padding: 10, borderRadius: 5, width: 60, textAlign: 'center', fontSize: 18 },
    dateSep: { color: colors.white, fontSize: 20 },
    modalBtnRow: { flexDirection: 'row', marginTop: 20 }
});

export default GestionSecadoScreen;
