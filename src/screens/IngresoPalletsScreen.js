import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Switch, Modal, FlatList } from 'react-native';
import api from '../api/api';
import { colors } from '../theme/colors';
import { generarReporteInventario } from '../utils/pdfGenerator';

const DatePickerModal = ({ visible, onClose, onSelect, initialDate, title }) => {
    const [year, setYear] = useState(initialDate ? initialDate.split('-')[0] : new Date().getFullYear().toString());
    const [month, setMonth] = useState(initialDate ? initialDate.split('-')[1] : (new Date().getMonth() + 1).toString().padStart(2, '0'));
    const [day, setDay] = useState(initialDate ? initialDate.split('-')[2] : new Date().getDate().toString().padStart(2, '0'));

    useEffect(() => {
        if (visible && initialDate) {
            const parts = initialDate.split('-');
            if (parts.length >= 3) {
                setYear(parts[0]);
                setMonth(parts[1]);
                setDay(parts[2]);
            }
        }
    }, [visible, initialDate]);

    const handleConfirm = () => {
        // Simple Validation
        if (!year || !month || !day) return;
        // Construct YYYY-MM-DD
        const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        onSelect(dateStr);
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContentSmall}>
                    <Text style={styles.modalTitle}>{title || "Seleccionar Fecha"}</Text>
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

const ANCHO_OPTIONS = ['74', '81'];
const LARGO_OPTIONS = ['4', '3.5', '3', '2.5', '2'];
const ESPESOR_OPTIONS = ['3', '2.5', '2', '1.5', '1', '0.875'];

const IngresoPalletsScreen = () => {
    const [formData, setFormData] = useState({
        num_viaje: '',
        fecha_ingreso: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD local format
        prov_nombre: '',
        id_proveedor: null, // Nuevo campo ID
        id_tipo_madera: null, // Tipo de Madera
        pallet_numero: '',
        pallet_emplantillador: 'Jefferson',
        ancho_global: '81', // Ancho Global Fijo
        calificaciones: [{ largo: '', espesor: '', cantidad: '', castigado: false, largo_original: '' }] // Lista dinámica inicializada con una fila
    });

    const [proveedores, setProveedores] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [newProviderModalVisible, setNewProviderModalVisible] = useState(false);
    const [newProviderName, setNewProviderName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Selection Modal state
    const [selectionModalVisible, setSelectionModalVisible] = useState(false);
    const [selectionOptions, setSelectionOptions] = useState([]);
    const [selectionTitle, setSelectionTitle] = useState('');
    const [selectionTarget, setSelectionTarget] = useState(null); // { type: 'global' | 'row', field: string, index?: number }

    // Date Picker state
    // const [date, setDate] = useState(new Date()); // No longer needed
    const [openDatePicker, setOpenDatePicker] = useState(false);

    const [isValid, setIsValid] = useState(false);
    const [totalBFTRecibido, setTotalBFTRecibido] = useState(0);
    const [totalBFTAceptado, setTotalBFTAceptado] = useState(0);

    // Refs para manejo de foco
    const itemsRef = React.useRef({});

    // Estado para trackear adición de filas
    const prevCalificacionesLength = React.useRef(formData.calificaciones.length);

    const [tiposMadera, setTiposMadera] = useState([]);

    // Cargar proveedores con búsqueda
    const fetchProveedores = async (query = '') => {
        try {
            const endpoint = query.trim()
                ? `/api/proveedores/buscar?nombre=${encodeURIComponent(query)}`
                : '/api/proveedores';
            const response = await api.get(endpoint);
            setProveedores(response.data);
        } catch (error) {
            console.error('Error fetching proveedores:', error);
            // No alertar en cada tipeo fallido para no interrumpir
        }
    };

    const fetchTiposMadera = async () => {
        try {
            const response = await api.get('/api/tipos-madera');
            setTiposMadera(response.data || []);
        } catch (error) {
            console.error("Error fetching tipos madera:", error);
        }
    };

    useEffect(() => {
        fetchTiposMadera();
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchProveedores(searchQuery);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    // Efecto para enfocar nuevo item cuando se agrega
    useEffect(() => {
        if (formData.calificaciones.length > prevCalificacionesLength.current) {
            const index = formData.calificaciones.length - 1;
            // Pequeño timeout para asegurar que el componente se renderizó
            // Ya no enfocamos largo automáticamente porque es un dropdown, quizás enfocar cantidad o nada?
            // Dejamos el foco comentado o lo movemos a cantidad si se desea flujo rápido, 
            // pero como ahora son selects, el flujo de teclado se rompe un poco.
        }
        prevCalificacionesLength.current = formData.calificaciones.length;
    }, [formData.calificaciones.length]);

    // Calcular BFT en tiempo real y validar formulario
    useEffect(() => {
        const calculateAndValidate = () => {
            const { num_viaje, prov_nombre, pallet_numero, ancho_global, calificaciones } = formData;

            // 1. Cálculo BFT
            // Fórmula: SUMA( (Largo * 81 * Espesor * Cantidad) / 12 )
            let tempTotalRecibido = 0;
            let tempTotalAceptado = 0;

            calificaciones.forEach(item => {
                const l = parseFloat(item.largo) || 0;
                const e = parseFloat(item.espesor) || 0;
                const c = parseFloat(item.cantidad) || 0;
                const ancho = parseFloat(ancho_global) || 81;

                // Si es castigado, usamos largo_original para el recibido, sino usamos largo (que es el recibido = aceptado)
                const l_original = item.castigado ? (parseFloat(item.largo_original) || 0) : l;

                if (e > 0 && c > 0) {
                    // Cálculo con redondeo a 4 decimales para igualar al backend
                    if (l > 0) {
                        const val = (l * ancho * e * c) / 12;
                        tempTotalAceptado += parseFloat(val.toFixed(4));
                    }
                    if (l_original > 0) {
                        const valOrig = (l_original * ancho * e * c) / 12;
                        tempTotalRecibido += parseFloat(valOrig.toFixed(4));
                    }
                }
            });
            setTotalBFTRecibido(tempTotalRecibido);
            setTotalBFTAceptado(tempTotalAceptado);

            // 2. Validación
            // Campos de cabecera
            if (!num_viaje || !prov_nombre || !pallet_numero || !ancho_global || !formData.id_tipo_madera) return false;

            // Validar filas dinámica
            // Cada fila debe tener datos válidos si hay filas
            if (calificaciones.length === 0) return false;

            const itemsValidos = calificaciones.every(item =>
                item.largo && item.espesor && item.cantidad &&
                (!item.castigado || item.largo_original)
            );

            if (!itemsValidos) return false;

            return true;
        };

        setIsValid(calculateAndValidate());
    }, [formData]);

    const handleChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    // Manejo de items dinámicos
    const addRow = () => {
        setFormData(prev => ({
            ...prev,
            calificaciones: [...prev.calificaciones, { largo: '', espesor: '', cantidad: '', castigado: false, largo_original: '' }]
        }));
    };

    const updateRow = (index, field, value) => {
        const newCalificaciones = [...formData.calificaciones];
        newCalificaciones[index][field] = value;
        setFormData(prev => ({ ...prev, calificaciones: newCalificaciones }));
    };

    const removeRow = (index) => {
        const newCalificaciones = formData.calificaciones.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, calificaciones: newCalificaciones }));
    };

    const handleOpenSelection = (type, field, index = null, currentVal = '') => {
        let options = [];
        let title = '';

        if (field === 'ancho_global') {
            options = ANCHO_OPTIONS;
            title = 'Seleccionar Ancho';
        } else if (field === 'largo') {
            options = LARGO_OPTIONS;
            title = 'Seleccionar Largo';
        } else if (field === 'espesor') {
            options = ESPESOR_OPTIONS;
            title = 'Seleccionar Espesor';
        }

        setSelectionOptions(options);
        setSelectionTitle(title);
        setSelectionTarget({ type, field, index });
        setSelectionModalVisible(true);
    };

    const handleSelectOption = (value) => {
        if (!selectionTarget) return;

        const { type, field, index } = selectionTarget;

        if (type === 'global') {
            handleChange(field, value);
        } else if (type === 'row') {
            updateRow(index, field, value);
        }

        setSelectionModalVisible(false);
        setSelectionTarget(null);
    };

    const handleSubmit = async () => {
        if (!isValid) return;

        try {
            // Construir payload
            const payload = {
                num_viaje: parseInt(formData.num_viaje),
                fecha_ingreso: formData.fecha_ingreso,
                prov_nombre: formData.prov_nombre,
                id_proveedor: formData.id_proveedor, // Enviar ID si existe
                id_tipo_madera: formData.id_tipo_madera,
                pallet_numero: parseInt(formData.pallet_numero),
                pallet_emplantillador: formData.pallet_emplantillador || "",
                dimensiones: {
                    largo: 0,
                    ancho_plantilla: parseFloat(formData.ancho_global),
                    espesor: 0,
                    cantidad_plantilla: 0
                },
                calificaciones: formData.calificaciones.map(c => {
                    const l = parseFloat(c.largo);
                    const lo_input = parseFloat(c.largo_original);
                    // Si el usuario activó el switch o si el largo original es mayor al largo (implica castigo)
                    const isCastigado = c.castigado || (lo_input > l && lo_input > 0);

                    return {
                        largo: l,
                        espesor: parseFloat(c.espesor),
                        cantidad: parseFloat(c.cantidad),
                        es_castigado: isCastigado,
                        largo_original: isCastigado ? lo_input : l
                    };
                })
            };

            const response = await api.post('/api/ingreso/ingreso-completo', payload);

            Alert.alert('Éxito', 'Ingreso registrado correctamente');

            // Resetear formulario
            setFormData(prev => ({
                ...prev,
                pallet_numero: '',
                calificaciones: [{ largo: '', espesor: '', cantidad: '', castigado: false, largo_original: '' }]
            }));

        } catch (error) {
            console.error('Error submitting:', error);
            Alert.alert('Error', 'Hubo un problema al registrar el ingreso');
        }
    };

    const handleExportarInventario = async () => {
        try {
            // New Endpoint: Backend already aggregated data
            const response = await api.get('/api/inventario/pallets');
            const data = response.data || [];

            // Pass the flat list directly to the report generator
            await generarReporteInventario(data);

        } catch (error) {
            console.error("Error fetching data for report:", error);
            Alert.alert("Error", "No se pudieron cargar los datos para el reporte.");
        }
    };

    return (
        <View style={{ flex: 1 }}>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <Text style={[styles.headerTitle, { marginBottom: 0 }]}>Ingreso de Pallets</Text>
                    <TouchableOpacity onPress={handleExportarInventario} style={{ backgroundColor: '#e74c3c', padding: 8, borderRadius: 5 }}>
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>PDF INV.</Text>
                    </TouchableOpacity>
                </View>

                {/* 1. Datos de Recepción */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Datos de Recepción</Text>

                    <Text style={styles.label}>Número de Viaje *</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="Ej. 123"
                        placeholderTextColor={colors.textSecondary}
                        value={formData.num_viaje}
                        onChangeText={(text) => handleChange('num_viaje', text)}
                    />

                    <Text style={styles.label}>Fecha Ingreso (YYYY-MM-DD)</Text>
                    <TouchableOpacity
                        style={[styles.input, { justifyContent: 'center' }]}
                        onPress={() => setOpenDatePicker(true)}
                    >
                        <Text style={{ color: colors.white }}>{formData.fecha_ingreso}</Text>
                    </TouchableOpacity>

                    <DatePickerModal
                        visible={openDatePicker}
                        onClose={() => setOpenDatePicker(false)}
                        initialDate={formData.fecha_ingreso}
                        title="Fecha Ingreso"
                        onSelect={(dateStr) => {
                            handleChange('fecha_ingreso', dateStr);
                            setOpenDatePicker(false);
                        }}
                    />

                    <Text style={styles.label}>Nombre Proveedor *</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                        <TouchableOpacity
                            style={[styles.input, { flex: 1, marginBottom: 0, justifyContent: 'center' }]}
                            onPress={() => setModalVisible(true)}
                        >
                            <Text style={{ color: formData.prov_nombre ? colors.white : colors.textSecondary }}>
                                {formData.prov_nombre || "Seleccione Proveedor"}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{
                                marginLeft: 10,
                                backgroundColor: colors.primary,
                                width: 50,
                                height: 50,
                                borderRadius: 25,
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}
                            onPress={() => setNewProviderModalVisible(true)}
                        >
                            <Text style={{ color: colors.background, fontSize: 30, fontWeight: 'bold', lineHeight: 32 }}>+</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Modal de Selección de Proveedor */}
                    <Modal
                        animationType="slide"
                        transparent={true}
                        visible={modalVisible}
                        onRequestClose={() => setModalVisible(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Seleccionar Proveedor</Text>
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Buscar proveedor..."
                                    placeholderTextColor={colors.textSecondary}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                                <FlatList
                                    data={proveedores}
                                    keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.modalItem}
                                            onPress={() => {
                                                const name = item.prov_nombre || item.provNombre || item.nombre || "Sin Nombre";
                                                setFormData(prev => ({
                                                    ...prev,
                                                    prov_nombre: name,
                                                    id_proveedor: item.id
                                                }));
                                                setModalVisible(false);
                                            }}
                                        >
                                            <Text style={styles.modalItemText}>{item.prov_nombre || item.provNombre || item.nombre || "Sin Nombre"}</Text>
                                        </TouchableOpacity>
                                    )}
                                    ListEmptyComponent={<Text style={styles.emptyText}>No hay proveedores disponibles</Text>}
                                />
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.closeButtonText}>Cancelar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>

                    {/* Modal Nuevo Proveedor */}
                    <Modal
                        animationType="slide"
                        transparent={true}
                        visible={newProviderModalVisible}
                        onRequestClose={() => setNewProviderModalVisible(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Nuevo Proveedor</Text>
                                <Text style={styles.label}>Nombre:</Text>
                                <TextInput
                                    style={styles.input}
                                    value={newProviderName}
                                    onChangeText={setNewProviderName}
                                    placeholder="Nombre del proveedor"
                                    placeholderTextColor={colors.textSecondary}
                                />
                                <TouchableOpacity
                                    style={styles.submitBtn}
                                    onPress={() => {
                                        if (newProviderName.trim()) {
                                            setFormData(prev => ({
                                                ...prev,
                                                prov_nombre: newProviderName.trim(),
                                                id_proveedor: null
                                            }));
                                            setNewProviderModalVisible(false);
                                            setNewProviderName('');
                                        } else {
                                            Alert.alert('Error', 'El nombre no puede estar vacío');
                                        }
                                    }}
                                >
                                    <Text style={styles.submitText}>Usar este Proveedor</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={() => setNewProviderModalVisible(false)}
                                >
                                    <Text style={styles.closeButtonText}>Cancelar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>
                </View>

                {/* 2. Datos del Pallet */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. Datos del Pallet</Text>

                    <Text style={styles.label}>Tipo de Madera *</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                        {tiposMadera.map((tipo) => {
                            const label = tipo.tipoDescripcion === 'L' ? 'Liviana' :
                                tipo.tipoDescripcion === 'P' ? 'Pesada' :
                                    tipo.tipoDescripcion;
                            const isSelected = formData.id_tipo_madera === tipo.idTipoMadera;

                            return (
                                <TouchableOpacity
                                    key={tipo.idTipoMadera}
                                    style={[
                                        styles.input,
                                        { flex: 1, alignItems: 'center', marginBottom: 0, justifyContent: 'center' },
                                        isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
                                    ]}
                                    onPress={() => handleChange('id_tipo_madera', tipo.idTipoMadera)}
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

                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.label}>Número Pallet *</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                placeholder="Ej. 1, 2, ..."
                                placeholderTextColor={colors.textSecondary}
                                value={formData.pallet_numero}
                                onChangeText={(text) => handleChange('pallet_numero', text)}
                            />
                        </View>
                    </View>
                </View>

                {/* 3. Dimensiones Globales */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. Configuración Global</Text>
                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.label}>Ancho (Fijo)</Text>
                            <TouchableOpacity
                                style={[styles.input, { justifyContent: 'center' }]}
                                onPress={() => handleOpenSelection('global', 'ancho_global')}
                            >
                                <Text style={{ color: colors.white }}>{formData.ancho_global}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* 4. Formulario Dinámico de Ítems */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>4. Detalle de Ítems (Calificaciones)</Text>

                    {formData.calificaciones.map((item, index) => (
                        <View key={index} style={styles.card}>
                            {/* Cabecera del Item con Switch Castigar */}
                            <View style={styles.itemHeader}>
                                <Text style={styles.itemIndex}>Item #{index + 1}</Text>
                                <View style={styles.switchContainer}>
                                    <Text style={styles.labelSwitch}>Castigar</Text>
                                    <Switch
                                        value={item.castigado}
                                        onValueChange={(val) => updateRow(index, 'castigado', val)}
                                        trackColor={{ false: "#767577", true: colors.primary }}
                                        thumbColor={item.castigado ? "#f4f3f4" : "#f4f3f4"}
                                    />
                                </View>
                            </View>

                            <View style={styles.row}>
                                {/* Campo Largo Original (Condicional) */}
                                {item.castigado && (
                                    <View style={styles.col}>
                                        <Text style={[styles.label, { color: '#f39c12' }]}>L. Orig.</Text>
                                        <TextInput
                                            ref={(el) => itemsRef.current[`largo_original-${index}`] = el}
                                            style={[styles.input, { borderColor: '#f39c12' }]}
                                            keyboardType="numeric"
                                            placeholder="0.0"
                                            placeholderTextColor={colors.textSecondary}
                                            value={item.largo_original}
                                            onChangeText={(text) => updateRow(index, 'largo_original', text)}
                                        />
                                    </View>
                                )}

                                <View style={styles.col}>
                                    <Text style={styles.label}>{item.castigado ? "L. Acept." : "Largo"}</Text>
                                    <TouchableOpacity
                                        style={[styles.input, { justifyContent: 'center' }]}
                                        onPress={() => handleOpenSelection('row', 'largo', index)}
                                    >
                                        <Text style={{ color: item.largo ? colors.white : colors.textSecondary }}>
                                            {item.largo || "0.0"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.col}>
                                    <Text style={styles.label}>Espesor</Text>
                                    <TouchableOpacity
                                        style={[styles.input, { justifyContent: 'center' }]}
                                        onPress={() => handleOpenSelection('row', 'espesor', index)}
                                    >
                                        <Text style={{ color: item.espesor ? colors.white : colors.textSecondary }}>
                                            {item.espesor || "0.0"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.col}>
                                    <Text style={styles.label}>Cant.</Text>
                                    <TextInput
                                        ref={(el) => itemsRef.current[`cantidad-${index}`] = el}
                                        style={styles.input}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        placeholderTextColor={colors.textSecondary}
                                        value={item.cantidad}
                                        onChangeText={(text) => updateRow(index, 'cantidad', text)}
                                        returnKeyType="next"
                                        blurOnSubmit={false}
                                        onSubmitEditing={() => {
                                            addRow();
                                        }}
                                    />
                                </View>
                                {/* Botón eliminar fila */}
                                <TouchableOpacity onPress={() => removeRow(index)} style={styles.deleteButtonContainer}>
                                    <Text style={styles.deleteButtonText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}

                    <View style={styles.addButtonContainer}>
                        <TouchableOpacity onPress={addRow} style={styles.circularAddButton}>
                            <Text style={styles.circularAddButtonText}>+</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Selection Modal */}
                <SelectionModal
                    visible={selectionModalVisible}
                    onClose={() => setSelectionModalVisible(false)}
                    options={selectionOptions}
                    title={selectionTitle}
                    onSelect={handleSelectOption}
                />

                {/* Cálculo Visual Total */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Resumen BFT</Text>
                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.label}>Total Recibido</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: '#e0e0e0', color: colors.textPrimary, fontWeight: 'bold' }]}
                                value={Math.round(totalBFTRecibido).toString()}
                                editable={false}
                            />
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.label}>Total Aceptado</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: '#d1f2eb', color: '#0b5345', fontWeight: 'bold' }]}
                                value={Math.round(totalBFTAceptado).toString()}
                                editable={false}
                            />
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.submitBtn, !isValid && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={!isValid}
                >
                    <Text style={styles.submitText}>REGISTRAR INGRESO</Text>
                </TouchableOpacity>

                <View style={{ height: 50 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    // ... styles existing ...
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: colors.background,
        borderRadius: 10,
        padding: 20,
        maxHeight: '80%',
        borderWidth: 1,
        borderColor: colors.border
    },
    modalContentSmall: {
        width: '80%',
        backgroundColor: colors.background,
        borderRadius: 15,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border
    },
    modalTitle: {
        color: colors.primary,
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center'
    },
    modalItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)'
    },
    modalItemText: {
        color: colors.white,
        fontSize: 16
    },
    closeButton: {
        marginTop: 15,
        backgroundColor: colors.card,
        padding: 10,
        borderRadius: 8,
        alignItems: 'center'
    },
    closeButtonText: {
        color: '#ff4444',
        fontSize: 16,
        fontWeight: 'bold'
    },
    closeBtn: { marginTop: 15, padding: 10, alignItems: 'center', backgroundColor: colors.card, borderRadius: 8 },
    closeBtnText: { color: colors.textSecondary },
    confirmBtn: { marginTop: 15, padding: 10, alignItems: 'center', backgroundColor: colors.primary, borderRadius: 8 },
    confirmBtnText: { color: colors.background, fontWeight: 'bold' },

    // Date Picker Styles
    dateRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 },
    dateInput: { backgroundColor: 'rgba(255,255,255,0.1)', color: colors.white, padding: 10, borderRadius: 5, width: 60, textAlign: 'center', fontSize: 18 },
    dateSep: { color: colors.white, fontSize: 20 },
    modalBtnRow: { flexDirection: 'row', marginTop: 20 },
    container: { padding: 20, backgroundColor: colors.background, flexGrow: 1 },
    headerTitle: { color: colors.primary, fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    section: { marginBottom: 25, backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 10 },
    sectionTitle: { color: colors.primary, fontSize: 18, fontWeight: 'bold', marginBottom: 15 },

    label: { color: colors.textSecondary, marginBottom: 5, fontSize: 14 },
    input: {
        backgroundColor: colors.card,
        color: colors.white,
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: colors.border,
        fontSize: 16
    },
    searchInput: {
        backgroundColor: colors.card,
        color: colors.white,
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: colors.border,
        fontSize: 16
    },

    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    col: { flex: 1 },

    // List Items Styles
    card: {
        backgroundColor: colors.background,
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: colors.border
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        paddingBottom: 5
    },
    itemIndex: {
        color: colors.primary,
        fontWeight: 'bold',
        fontSize: 14
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    labelSwitch: {
        color: colors.textSecondary,
        marginRight: 10,
        fontSize: 12
    },
    addButtonContainer: {
        alignItems: 'center',
        marginTop: 10
    },
    circularAddButton: {
        backgroundColor: colors.primary,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    circularAddButtonText: {
        color: colors.background,
        fontSize: 24,
        fontWeight: 'bold',
        lineHeight: 28 // Center vertically
    },
    deleteButtonContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 5,
        // Align with inputs roughly? Inputs have marginBottom 15.
        // We can just rely on flex layout
    },
    deleteButtonText: {
        color: '#ff4444',
        fontWeight: 'bold',
        fontSize: 22
    },
    emptyText: { color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center' },

    // Submit
    submitBtn: { backgroundColor: colors.primary, padding: 15, borderRadius: 8, alignItems: 'center' },
    submitBtnDisabled: { backgroundColor: colors.border, opacity: 0.5 },
    submitText: { color: colors.background, fontWeight: 'bold', fontSize: 16 },
});

export default IngresoPalletsScreen;