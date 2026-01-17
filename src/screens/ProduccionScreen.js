import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView, FlatList, Modal, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/api';
import { colors } from '../theme/colors';
import { generarReportePDF } from '../utils/pdfGenerator';

const SelectionModal = ({ visible, onClose, onSelect, options, title }) => {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContentSmall}>
                    <Text style={styles.modalTitle}>{title}</Text>
                    <FlatList
                        data={options}
                        keyExtractor={(item) => item.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.modalItem}
                                onPress={() => onSelect(item)}
                            >
                                <Text style={styles.modalItemText}>{item}</Text>
                            </TouchableOpacity>
                        )}
                        style={{ maxHeight: 300 }}
                    />
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Text style={styles.closeBtnText}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const LARGO_OPTIONS = ['25', '24', '23', '22', '21', '20', '18', '16', '14', '12', '10', '8', '6'];

const ProduccionScreen = () => {
    const [activeOrder, setActiveOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('NUEVO'); // 'NUEVO' | 'ENCOLADO'
    const [tiposMadera, setTiposMadera] = useState([]);

    // Formulario Nuevo Bloque
    const [newBlock, setNewBlock] = useState({ codigo: '', largo: '', pesoSin: '', observacion: '', tipoMaderaId: null });

    // Estado Encolado (Modal)
    const [glueModalVisible, setGlueModalVisible] = useState(false);
    const [selectedBlock, setSelectedBlock] = useState(null); // Bloque seleccionado para encolar
    const [glueWeight, setGlueWeight] = useState('');

    // Estado Selección Largo
    const [lengthModalVisible, setLengthModalVisible] = useState(false);

    const fetchActiveOrder = async () => {
        setLoading(true);
        try {
            // Cargar tipos madera en paralelo
            const resMadera = await api.get('/api/tipos-madera');
            setTiposMadera(resMadera.data || []);

            let response = await api.get('/api/ordenes-taller/activa');

            // Si retorna 204 o vacío, significa que no hay orden activa.
            // La creamos automáticamente "por debajo".
            if (response.status === 204 || !response.data) {
                // console.log("No hay orden activa, auto-generando orden diaria...");
                try {
                    await api.post('/api/ordenes-taller/iniciar');
                    // Volvemos a consultar para obtener la orden recién creada
                    response = await api.get('/api/ordenes-taller/activa');
                    // console.log("Orden auto-generada con éxito.");
                } catch (createErr) {
                    console.error("Error al auto-generar orden:", createErr);
                    // Si falla la creación, no podemos hacer mucho más que avisar,
                    // pero intentaremos que no bloquee fatalmente si es un error de red temporal.
                }
            }

            if (response.data) {
                // Auto-cierre de órdenes de días anteriores
                try {
                    let orderDate = new Date(response.data.ordenFechaInicio);

                    // Soporte para fechas en array [anio, mes, dia, ...] (común en Spring Boot)
                    if (Array.isArray(response.data.ordenFechaInicio)) {
                        const [y, m, d] = response.data.ordenFechaInicio;
                        // Mes en JS es 0-indexado
                        orderDate = new Date(y, m - 1, d);
                    }

                    if (isNaN(orderDate.getDate())) {
                        console.warn("Fecha orden inválida:", response.data.fechaInicio);
                    } else {
                        console.log("Fecha orden:", orderDate.toLocaleDateString());
                        console.log("Fecha hoy:", new Date().toLocaleDateString());
                        const today = new Date();
                        // Comparación segura (ignora hora)
                        const isSameDay = orderDate.toLocaleDateString() === today.toLocaleDateString();

                        if (!isSameDay) {
                            console.log(`Orden vencida (${orderDate.toLocaleDateString()}). Renovando...`);
                            await api.patch('/api/ordenes-taller/finalizar');
                            const resStart = await api.post('/api/ordenes-taller/iniciar');

                            if (resStart.data) {
                                setActiveOrder(resStart.data);
                                Alert.alert("Nueva Jornada", `Iniciando orden del ${new Date().toLocaleDateString()}`);
                            } else {
                                const resNew = await api.get('/api/ordenes-taller/activa');
                                setActiveOrder(resNew.data);
                            }
                            return;
                        }
                    }
                } catch (err) {
                    console.error("Error al validar fecha orden:", err);
                }

                // console.log("Orden Activa cargada:", response.data);
                setActiveOrder(response.data);
            }
        } catch (error) {
            console.error("Error cargando orden:", error);
            console.error("Error cargando orden:", error.response.data);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchActiveOrder();
        }, [])
    );

    const handleCreateBlock = async () => {
        if (!newBlock.codigo || !newBlock.largo || !newBlock.pesoSin || !newBlock.tipoMaderaId) {
            Alert.alert('Error', 'Complete todos los campos obligatorios (incluyendo Tipo Madera)');
            return;
        }

        // Recuperamos el ID de la orden activa si existe
        const orderId = activeOrder?.id || activeOrder?.idOrdenTaller || activeOrder?.idOrden;

        // Si el backend requiere obligatoriamente asociar a una orden:
        if (!orderId) {
            Alert.alert('Atención', 'No se ha detectado una orden de taller activa para hoy. Asegúrese de que el sistema haya iniciado el día o consulte con soporte.');
            return;
        }

        try {
            const payload = {
                ordenTaller: { idOrden: orderId }, // Restauramos la vinculación
                bloqueCodigo: newBlock.codigo,
                bloqueLargo: parseFloat(newBlock.largo),
                bloqueAncho: 24,
                bloqueAlto: 48,
                bloquePesoSinCola: parseFloat(newBlock.pesoSin),
                // Cálculo del volumen (BFT): largo * 8
                bloqueBftFinal: (parseFloat(newBlock.largo)) * 8,
                bloqueEstado: 'PR',
                bloqueObservacion: newBlock.observacion, // Campo de observación
                tipoMadera: { idTipoMadera: newBlock.tipoMaderaId }
            };


            // console.log(payload);
            await api.post('/api/bloques', payload);
            Alert.alert('Éxito', 'Bloque registrado');

            // Auto-incrementar código
            const nextCode = newBlock.codigo ? (parseInt(newBlock.codigo) + 1).toString() : '';

            setNewBlock({
                codigo: nextCode,
                largo: '',
                pesoSin: '',
                observacion: '',
                tipoMaderaId: null
            });
            fetchActiveOrder(); // Recargar lista de bloques
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Falló el registro del bloque. Verifique conexión.');
        }
    };

    const openGlueModal = (block) => {
        setSelectedBlock(block);
        setGlueWeight('');
        setGlueModalVisible(true);
    };

    const handleRegisterGlue = async () => {
        // 1. Validar que haya texto
        if (!glueWeight) {
            Alert.alert("Atención", "Por favor ingrese un peso.");
            return;
        }

        try {
            // 2. Normalizar: Cambiar comas por puntos y limpiar espacios
            const normalizedWeight = glueWeight.toString().replace(',', '.').trim();
            const pesoCon = parseFloat(normalizedWeight);

            // 3. Validar que sea un número real
            if (isNaN(pesoCon)) {
                Alert.alert('Error', 'El valor ingresado no es un número válido');
                return;
            }

            // 4. Validar lógica de negocio (Peso Con > Peso Sin)
            // Nota: Usamos una cadena de "OR" (||) para asegurar que encontramos el peso sin cola venga como venga del backend
            const pesoSin = selectedBlock.bloquePesoSinCola || selectedBlock.pesoSin || selectedBlock.bPesoSinCola || 0;

            if (pesoCon <= pesoSin) {
                Alert.alert('Error', `El peso con cola (${pesoCon}kg) debe ser mayor al peso sin cola (${pesoSin}g)`);
                return;
            }

            // 5. Obtener ID del bloque de forma segura
            const blockId = selectedBlock.id || selectedBlock.idBloque || selectedBlock.id_bloque;

            if (!blockId) {
                console.error("Error de ID: El objeto selectedBlock no tiene ID", selectedBlock);
                Alert.alert('Error', 'No se pudo identificar el bloque. El ID es nulo.');
                return;
            }

            // 6. DEBUG: Ver qué estamos enviando realmente (Míralo en tu terminal)
            // console.log("Enviando a Backend:", {
            //     url: `/api/bloques/${blockId}/encolado`,
            //     payload: { bloquePesoConCola: pesoCon }
            // });

            // 7. Llamada a la API
            await api.put(`/api/bloques/${blockId}/encolado`, {
                bloquePesoConCola: pesoCon
            });

            // Éxito
            setGlueModalVisible(false);
            setGlueWeight(''); // Limpiar input
            Alert.alert('Éxito', 'Peso registrado correctamente');
            fetchActiveOrder(); // Recargar la lista

        } catch (e) {
            console.error("Error en petición:", e);
            // Mostrar mensaje detallado si el backend lo envía
            const msg = e.response?.data?.message || e.response?.data || "Error de conexión o validación";
            Alert.alert('Error al guardar', `Servidor respondió: ${e.response?.status} - ${msg}`);
        }
    };

    const handleExportarPDF = () => {
        if (!activeOrder || !activeOrder.bloques) {
            Alert.alert("Atención", "No hay datos para exportar");
            return;
        }
        // Llamamos a la función
        generarReportePDF(activeOrder, activeOrder.bloques);
    };

    // Renderizado condicional
    if (loading && !activeOrder) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    // Filtrar bloques para Encolado
    const bloquesEncolado = activeOrder && activeOrder.bloques ? activeOrder.bloques.filter(b => b.estado === 'PR') : [];
    // Bloques recientes (todos o invertidos)
    const bloquesRecientes = activeOrder && activeOrder.bloques ? [...activeOrder.bloques].sort((a, b) => b.id - a.id) : [];

    return (
        <View style={styles.container}>
            {/* ENCABEZADO ORDEN (Simple) */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Producción del Día</Text>
                    <Text style={styles.headerSubtitle}>
                        {new Date().toLocaleDateString()}
                    </Text>


                </View>
                <View>
                    <Text style={styles.headerSubtitle}>
                        {"Reporte Rápido"}
                    </Text>
                    <TouchableOpacity onPress={handleExportarPDF} style={{ backgroundColor: '#e74c3c', padding: 8, borderRadius: 5 }}>
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>PDF</Text>
                    </TouchableOpacity>

                </View>

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
                    style={[styles.tab, activeTab === 'EN' && styles.tabActive]}
                    onPress={() => setActiveTab('EN')}
                >
                    <Text style={[styles.tabText, activeTab === 'EN' && styles.tabTextActive]}>
                        Encolado ({bloquesEncolado.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'NUEVO' ? (
                <ScrollView contentContainerStyle={styles.content}>
                    {/* FORMULARIO */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Registrar Bloque</Text>

                        {/* Cada que se registra un bloque, que se aumente en uno el codigo */}
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
                                <TouchableOpacity
                                    style={[styles.input, { justifyContent: 'center' }]}
                                    onPress={() => setLengthModalVisible(true)}
                                >
                                    <Text style={{ color: newBlock.largo ? colors.white : colors.textSecondary }}>
                                        {newBlock.largo || "Seleccionar"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.col}>
                                <Text style={styles.label}>Peso Sin Cola</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej. 31.2"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="numeric"
                                    value={newBlock.pesoSin}
                                    onChangeText={t => setNewBlock({ ...newBlock, pesoSin: t })}
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>Observación (Opcional)</Text>
                        <TextInput
                            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                            placeholder="Detalles adicionales..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            numberOfLines={3}
                            value={newBlock.observacion}
                            onChangeText={t => setNewBlock({ ...newBlock, observacion: t })}
                        />

                        <Text style={styles.label}>Tipo de Madera *</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                            {tiposMadera.map((tipo) => {
                                const label = tipo.tipoDescripcion === 'L' ? 'LIVIANA' :
                                    tipo.tipoDescripcion === 'P' ? 'PESADA' :
                                        tipo.tipoDescripcion;
                                const isSelected = newBlock.tipoMaderaId === tipo.idTipoMadera;

                                return (
                                    <TouchableOpacity
                                        key={tipo.idTipoMadera}
                                        style={[
                                            styles.input,
                                            { flex: 1, alignItems: 'center', marginBottom: 0, justifyContent: 'center' },
                                            isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
                                        ]}
                                        onPress={() => setNewBlock({ ...newBlock, tipoMaderaId: tipo.idTipoMadera })}
                                    >
                                        <Text style={{
                                            color: isSelected ? colors.background : colors.textSecondary,
                                            fontWeight: isSelected ? 'bold' : 'normal'
                                        }}>
                                            {label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TouchableOpacity style={styles.saveBtn} onPress={handleCreateBlock}>
                            <Text style={styles.saveBtnText}>GUARDAR BLOQUE</Text>
                        </TouchableOpacity>
                    </View>

                    {/* LISTA RECIENTE */}
                    <Text style={styles.listTitle}>Últimos Bloques Registrados</Text>
                    {bloquesRecientes.slice(bloquesRecientes.length - 5, bloquesRecientes.length).map((item, index) => (
                        <View key={item.id || index} style={styles.itemRow}>
                            <Text style={styles.itemTextBold}>{item.bloqueCodigo || item.codigo || item.bCodigo || "S/C"}</Text>
                            <Text style={styles.itemText}>L:{item.bloqueLargo || item.largo || item.bLargo || 0}</Text>
                            <Text style={styles.itemText}>BFT:{item.bloqueBftFinal || item.bftFinal || item.bBftFinal || 0}</Text>
                            <Text style={styles.itemText}>{item.bloquePesoSinCola || item.pesoSin || item.bPesoSinCola || 0}kg</Text>
                            <Text style={[styles.itemBadge, { backgroundColor: item.estado === 'EN' ? colors.success : colors.warning }]}>
                                {/* Mostrar los dos primeros caracteres */}
                                {item.estado ? item.estado.charAt(0) + item.estado.charAt(1) : ''}
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
                                    <Text style={styles.glueItemSub}>Peso Sin: {item.bloquePesoSinCola || item.pesoSin || item.bPesoSinCola}kg</Text>
                                </View>
                                <Text style={styles.tapAction}>Pesar &gt;</Text>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={<Text style={styles.emptyText}>No hay bloques pendientes de encolado</Text>}
                    />
                </View>
            )}

            <Modal visible={glueModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Registro de Encolado</Text>
                        {selectedBlock && (
                            <Text style={styles.modalSub}>
                                Bloque: {selectedBlock.bloqueCodigo || selectedBlock.codigo} (Sin: {selectedBlock.bloquePesoSinCola || selectedBlock.pesoSin}kg)
                            </Text>
                        )}

                        <Text style={styles.label}>Peso Con Cola (kg)</Text>
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

            <SelectionModal
                visible={lengthModalVisible}
                onClose={() => setLengthModalVisible(false)}
                options={LARGO_OPTIONS}
                title="Seleccionar Largo"
                onSelect={(val) => {
                    setNewBlock({ ...newBlock, largo: val });
                    setLengthModalVisible(false);
                }}
            />
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
    itemBadge: { paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, color: '#fff', fontSize: 16, fontWeight: 'bold', overflow: 'hidden' },

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
    cancelBtnText: { color: colors.textSecondary },

    // Selection Modal Styles
    modalContentSmall: { width: '80%', backgroundColor: colors.background, borderRadius: 15, padding: 20, borderWidth: 1, borderColor: colors.border },
    modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
    modalItemText: { color: colors.white, fontSize: 16 },
    closeBtn: { marginTop: 15, padding: 10, alignItems: 'center', backgroundColor: colors.card, borderRadius: 8 },
    closeBtnText: { color: colors.textSecondary },
});

export default ProduccionScreen;