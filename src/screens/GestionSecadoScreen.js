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
        if (!year || !month || !day) return;
        const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`;
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

const GestionSecadoScreen = ({ navigation }) => {
    const [activeTab, setActiveTab] = useState('pendientes'); // pendientes, proceso, historial
    const [palletsDisponibles, setPalletsDisponibles] = useState([]);
    const [selectedPallets, setSelectedPallets] = useState([]);
    const [camaras, setCamaras] = useState([]);
    const [lotes, setLotes] = useState([]);

    // Search States
    const [searchPendientes, setSearchPendientes] = useState('');
    const [searchProceso, setSearchProceso] = useState('');
    const [searchHistorial, setSearchHistorial] = useState('');

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
        loteCodigo: '',
        loteFechaInicio: getLocalDate() + 'T00:00:00',
        loteFechaFin: '',
        loteObservaciones: ''
    });

    const [showCameraModal, setShowCameraModal] = useState(false);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchData();
        });
        return unsubscribe;
    }, [navigation]);

    const fetchData = async () => {
        try {
            const resPallets = await api.get('/api/secado/disponibles');
            setPalletsDisponibles(Array.isArray(resPallets.data) ? resPallets.data : []);

            const resCamaras = await api.get('/api/camaras/estado/disponibles');
            setCamaras(Array.isArray(resCamaras.data) ? resCamaras.data : []);

            const resLotes = await api.get('/api/lotes-secado');
            setLotes(Array.isArray(resLotes.data) ? resLotes.data : []);
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
        if (!Array.isArray(palletsDisponibles)) return 0;
        const selected = palletsDisponibles.filter(p => selectedPallets.includes(p.idPallet));
        return selected.reduce((sum, p) => sum + (parseFloat(p.bftVerdeAceptado) || 0), 0);
    };

    const totalBFT = calculateSelectedBFT();
    const selectedCamera = camaras.find(c => (c.idCamara || c.id) === formData.idCamara);
    const availableCapacity = selectedCamera ? parseFloat(selectedCamera.capacidadDisponible || selectedCamera.camaraCapacidad || 0) : 0;
    const isCapacityExceeded = formData.idCamara && totalBFT > availableCapacity;

    const isValid =
        formData.idCamara !== null &&
        formData.loteCodigo.trim() !== '' &&
        formData.loteFechaInicio &&
        formData.loteFechaFin &&
        selectedPallets.length > 0 &&
        !isCapacityExceeded;

    const handleCreateLote = async () => {
        if (!isValid) return;

        const payload = {
            idCamara: parseInt(formData.idCamara),
            loteCodigo: formData.loteCodigo,
            loteFechaInicio: formData.loteFechaInicio,
            loteFechaFin: formData.loteFechaFin,
            idPallets: selectedPallets.map(id => parseInt(id)),
            loteObservaciones: formData.loteObservaciones
        };

        try {
            const response = await api.post('/api/secado/crear', payload);
            const estado = response.data?.estado || 'PROGRAMADO';
            Alert.alert('Éxito', `Lote Creado. Estado: ${estado}`);

            setFormData({
                idCamara: null,
                camaraDescripcion: '',
                loteCodigo: '',
                loteFechaInicio: getLocalDate() + 'T00:00:00',
                loteFechaFin: '',
                loteObservaciones: ''
            });
            setSelectedPallets([]);
            fetchData();
            setActiveTab('proceso');
        } catch (error) {
            console.log("ERROR CREATE LOTE:", error);
            if (error.response) {
                const errorMsg = error.response.data?.message || JSON.stringify(error.response.data);
                Alert.alert('Error', errorMsg);
            } else {
                Alert.alert('Error', error.message || 'No se pudo crear el lote');
            }
        }
    };

    // --- Tab 2/3: Lotes Logic ---

    const handleFinalizeLote = (lote) => {
        Alert.alert(
            'Confirmar Finalización',
            '¿Confirmas que el lote ha salido físicamente de la cámara y está listo para stock seco?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar', onPress: async () => {
                        try {
                            const now = new Date();
                            const year = now.getFullYear();
                            const month = String(now.getMonth() + 1).padStart(2, '0');
                            const day = String(now.getDate()).padStart(2, '0');
                            const hours = String(now.getHours()).padStart(2, '0');
                            const minutes = String(now.getMinutes()).padStart(2, '0');
                            const seconds = String(now.getSeconds()).padStart(2, '0');
                            const exactTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

                            await api.patch(`/api/secado/finalizar/${lote.idLote}`, {
                                fechaFinalizacion: exactTime
                            });

                            Alert.alert('Éxito', 'Lote enviado a Stock Seco');
                            fetchData();
                        } catch (error) {
                            console.error("ERROR FINALIZING LOTE:", error);
                            if (error.response) {
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

    const renderPendientes = () => {
        const safePallets = Array.isArray(palletsDisponibles) ? palletsDisponibles : [];
        const filteredPallets = safePallets.filter(p =>
            (p.recepcion?.numViaje || '').toString().toLowerCase().includes(searchPendientes.toLowerCase())
        );

        return (
            <ScrollView style={styles.tabContent}>
                <Text style={styles.sectionTitle}>Configuración de Lote</Text>

                <View style={styles.card}>
                    <Text style={styles.label}>Cámara *</Text>
                    <TouchableOpacity style={styles.selector} onPress={() => setShowCameraModal(true)}>
                        <Text style={[styles.selectorText, !formData.idCamara && styles.placeholderText]}>
                            {formData.camaraDescripcion || 'Seleccionar Cámara...'}
                        </Text>
                    </TouchableOpacity>

                    <Text style={[styles.label, { marginTop: 15 }]}>Código de Lote *</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.loteCodigo}
                        onChangeText={t => setFormData({ ...formData, loteCodigo: t })}
                        placeholder="Ingrese código manual (Ej. 1500)"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="numeric"
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
                        placeholder="Madera azulada; madera podrida; etc."
                        placeholderTextColor={colors.textSecondary}
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

                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por numero de viaje o nombre de proveedor..."
                    placeholderTextColor="#999"
                    value={searchPendientes}
                    onChangeText={setSearchPendientes}
                />

                {filteredPallets.map((p, index) => {
                    //filtrar por numero de viaje o nombre de proveedor
                    const id = p.idPallet || p.recepcion.numViaje || p.recepcion.proveedor.provNombre;
                    const uniqueKey = id ? id.toString() : `fallback-${index}`;

                    return (
                        <TouchableOpacity
                            key={uniqueKey}
                            style={[styles.palletItem, selectedPallets.includes(id) && styles.palletSelected]}
                            onPress={() => togglePalletSelection(id)}
                        >
                            <Text style={styles.palletText}>
                                {p.codigo ? `Código: ${p.codigo}` : `Pallet #${p.palletNumero || '?'}`}
                                {p.recepcion?.proveedor?.provNombre ? ` - ${p.recepcion.proveedor.provNombre}` : ''}
                            </Text>

                            <Text style={styles.palletSub}>
                                Viaje: {p.recepcion?.numViaje || '-'}
                                {p.bftVerdeAceptado ? ` • BFT: ${p.bftVerdeAceptado}` : ''}
                            </Text>
                        </TouchableOpacity>
                    );
                })}

                {filteredPallets.length === 0 && <Text style={styles.emptyText}>No hay pallets disponibles.</Text>}

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

                <CameraSelectorModal
                    visible={showCameraModal}
                    onClose={() => setShowCameraModal(false)}
                    cameras={camaras}
                    onSelect={(cam) => {
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
    };

    const renderLotesList = (dataLotes, isHistory, searchQuery, setSearchQuery) => {
        const safeLotes = Array.isArray(dataLotes) ? dataLotes : [];
        const filteredLotes = safeLotes.filter(l =>
            (l.loteCodigo || '').toString().includes(searchQuery) ||
            l.idLote.toString().includes(searchQuery)
        );

        const sortedLotes = [...filteredLotes].sort((a, b) => {
            // Prioridad: STOCK SECO (FINALIZADO) primero en Proceso
            if (!isHistory) {
                const isAStock = a.estado === 'FIN';
                const isBStock = b.estado === 'FIN';
                if (isAStock && !isBStock) return -1;
                if (!isAStock && isBStock) return 1;
            }
            return b.idLote - a.idLote;
        });

        return (
            <ScrollView style={styles.tabContent}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar lote por código..."
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    keyboardType="numeric"
                />

                {sortedLotes.length === 0 && <Text style={styles.emptyText}>No hay lotes en esta categoría.</Text>}
                {sortedLotes.map(lote => {
                    const isReady = lote.estado === 'OK';
                    const isStock = lote.estado === 'FIN'; // Stock Seco
                    const isDespachado = lote.estado === 'DES';

                    // LÓGICA DE INTERACCIÓN:
                    // - STOCK SECO = 'SS' (Proceso): Habilitado -> Navega a Despacho.
                    // - DESPACHADO = 'DES' (Historial): Deshabilitado -> Solo Lectura.
                    // - Otros (Secando = 'SE', Listo = 'OK'): Deshabilitados (container), pero botones internos funcionan.
                    const isInteractive = isStock;

                    const handlePress = () => {
                        if (isInteractive) {
                            navigation.navigate('DespachoLote', { idLote: lote.idLote });
                        }
                    };

                    return (
                        <TouchableOpacity
                            key={lote.idLote}
                            style={[
                                styles.loteCard,
                                isDespachado && { borderLeftColor: '#FF9800' }, // Naranja para despachado
                                isStock && { borderLeftColor: colors.primary, borderWidth: 1, borderColor: colors.primary } // Verde/Resaltado para Stock
                            ]}
                            onPress={handlePress}
                            disabled={!isInteractive} // SOLO STOCK SECO ES PRESIONABLE
                            activeOpacity={0.7}
                        >
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>Lote #{lote.loteCodigo || lote.idLote}</Text>
                                <View style={[
                                    styles.badge,
                                    isDespachado ? { backgroundColor: '#FF9800' } :
                                        isStock ? styles.badgeHistory :
                                            (isReady ? styles.badgeReady : styles.badgeProcess)
                                ]}>
                                    <Text style={styles.badgeText}>
                                        {isDespachado ? 'DES' :
                                            isStock ? 'SS' :
                                                (isReady ? 'OK' : (lote.estado || 'SE'))}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.cardSub}>Cámara {lote.camara?.idCamara || '?'} • {lote.especie || 'Balsa'}</Text>

                            <View style={styles.cardBody}>
                                <Text style={styles.cardInfo}>Inicio: {lote.loteFechaInicio ? lote.loteFechaInicio.split('T')[0] : '-'}</Text>
                                <Text style={styles.cardInfo}>Fin Est: {lote.loteFechaFin ? lote.loteFechaFin.split('T')[0] : '-'}</Text>

                                {/* MOSTRAR BFT */}
                                {(isStock || isDespachado) && (
                                    <View style={{ marginTop: 5 }}>
                                        <Text style={[styles.cardInfo, { color: colors.primary, fontWeight: 'bold' }]}>
                                            BFT Seco: {lote.bftTotalLote || lote.bftLoteSeco || '---'}
                                        </Text>

                                        {/* MENSAJE SOLO PARA STOCK SECO */}
                                        {isStock && (
                                            <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 2, fontStyle: 'italic' }}>
                                                Toque para despachar a taller →
                                            </Text>
                                        )}
                                    </View>
                                )}
                            </View>

                            {/* Botón de Finalizar Secado (Solo aparece si NO es historial y está Listo) */}
                            {!isHistory && isReady && (
                                <TouchableOpacity
                                    style={styles.finalizeBtn}
                                    onPress={() => handleFinalizeLote(lote)}
                                >
                                    <Text style={styles.finalizeBtnText}>Finalizar y Enviar a Stock</Text>
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>
                    );
                })}
                <View style={{ height: 50 }} />
            </ScrollView>
        )
    };

    // --- FILTROS DE TABS ---

    // 1. Proceso: Todo lo que NO sea DESPACHADO
    const lotesProceso = lotes.filter(l => l.estado !== 'DES');

    // 2. Historial: Solo lo que SÍ sea DESPACHADO
    const lotesHistorial = lotes.filter(l => l.estado === 'DES');

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
            {activeTab === 'proceso' && renderLotesList(lotesProceso, false, searchProceso, setSearchProceso)}
            {activeTab === 'historial' && renderLotesList(lotesHistorial, true, searchHistorial, setSearchHistorial)}
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

    summaryContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 5 },
    summaryText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },

    selector: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 8 },
    selectorText: { color: colors.white },
    placeholderText: { color: colors.textSecondary },

    palletItem: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: 'transparent' },
    palletSelected: { borderColor: colors.primary, backgroundColor: 'rgba(76, 175, 80, 0.1)' },
    palletText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
    palletSub: { color: colors.textSecondary, marginTop: 4 },

    actionBtn: { backgroundColor: colors.primary, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
    disabledBtn: { backgroundColor: colors.border, opacity: 0.5 },
    actionBtnText: { color: colors.background, fontWeight: 'bold' },
    validationText: { color: colors.danger, textAlign: 'center', marginTop: 10, fontSize: 12 },

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

    dateRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 },
    dateInput: { backgroundColor: 'rgba(255,255,255,0.1)', color: colors.white, padding: 10, borderRadius: 5, width: 60, textAlign: 'center', fontSize: 18 },
    dateSep: { color: colors.white, fontSize: 20 },
    modalBtnRow: { flexDirection: 'row', marginTop: 20 },

    searchInput: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        color: colors.white,
        padding: 10,
        borderRadius: 8,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#555'
    },
});

export default GestionSecadoScreen;