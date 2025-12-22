import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import api from '../api/api';
import { colors } from '../theme/colors';

const IngresoPalletsScreen = () => {
    const [formData, setFormData] = useState({
        num_viaje: '',
        fecha_ingreso: new Date().toISOString().split('T')[0], // Default YYYY-MM-DD
        prov_nombre: '',
        pallet_numero: '',
        pallet_emplantillador: '',
        dimensiones: {
            largo: '',
            ancho_plantilla: '',
            espesor: '',
            cantidad_plantilla: ''
        },
        calificaciones: [] // Lista dinámica
    });

    const [isValid, setIsValid] = useState(false);

    // Validar formulario cada vez que cambian los datos
    useEffect(() => {
        const validate = () => {
            const { num_viaje, prov_nombre, pallet_numero, dimensiones, calificaciones } = formData;

            // Campos de primer nivel obligatorios
            if (!num_viaje || !prov_nombre || !pallet_numero) return false;

            // Dimensiones obligatorias
            if (!dimensiones.largo || !dimensiones.ancho_plantilla ||
                !dimensiones.espesor || !dimensiones.cantidad_plantilla) return false;

            // Calificaciones obligatorias (si existen, deben tener valor)
            // Nota: El array puede estar vacío o tener items. Si tiene items, valor es obligatorio.
            const calificacionesValidas = calificaciones.every(c => c.valor);
            if (!calificacionesValidas) return false;

            return true;
        };
        setIsValid(validate());
    }, [formData]);

    const handleChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleDimensionChange = (key, value) => {
        setFormData(prev => ({
            ...prev,
            dimensiones: { ...prev.dimensiones, [key]: value }
        }));
    };

    const addCalificacion = () => {
        setFormData(prev => ({
            ...prev,
            calificaciones: [...prev.calificaciones, { valor: '', motivo: '' }]
        }));
    };

    const updateCalificacion = (index, field, value) => {
        const newCalificaciones = [...formData.calificaciones];
        newCalificaciones[index][field] = value;
        setFormData(prev => ({ ...prev, calificaciones: newCalificaciones }));
    };

    const removeCalificacion = (index) => {
        const newCalificaciones = formData.calificaciones.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, calificaciones: newCalificaciones }));
    };

    const handleSubmit = async () => {
        if (!isValid) return;

        try {
            // Construir payload con tipos de datos correctos
            const payload = {
                num_viaje: parseInt(formData.num_viaje),
                fecha_ingreso: formData.fecha_ingreso,
                prov_nombre: formData.prov_nombre,
                pallet_numero: parseInt(formData.pallet_numero),
                pallet_emplantillador: formData.pallet_emplantillador || "",
                dimensiones: {
                    largo: parseFloat(formData.dimensiones.largo),
                    ancho_plantilla: parseFloat(formData.dimensiones.ancho_plantilla),
                    espesor: parseFloat(formData.dimensiones.espesor),
                    cantidad_plantilla: parseInt(formData.dimensiones.cantidad_plantilla)
                },
                calificaciones: formData.calificaciones.map(c => ({
                    valor: parseFloat(c.valor),
                    motivo: c.motivo || ""
                }))
            };

            const response = await api.post('/api/ingreso/ingreso-completo', payload);

            Alert.alert('Éxito', 'Ingreso registrado correctamente');

            // Resetear formulario o parte de él
            setFormData(prev => ({
                ...prev,
                pallet_numero: '',
                dimensiones: { ...prev.dimensiones, cantidad_plantilla: '' },
                calificaciones: []
            }));

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Hubo un problema al registrar el ingreso');
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
                <Text style={styles.headerTitle}>Ingreso de Pallets</Text>

                {/* 1. Datos de Recepción */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Datos de Recepción</Text>

                    <Text style={styles.label}>Número de Viaje *</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={formData.num_viaje}
                        onChangeText={(text) => handleChange('num_viaje', text)}
                    />

                    <Text style={styles.label}>Fecha Ingreso (YYYY-MM-DD)</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.fecha_ingreso}
                        onChangeText={(text) => handleChange('fecha_ingreso', text)}
                        placeholder="2024-01-01"
                        placeholderTextColor={colors.textSecondary}
                    />

                    <Text style={styles.label}>Nombre Proveedor *</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.prov_nombre}
                        onChangeText={(text) => handleChange('prov_nombre', text)}
                    />
                </View>

                {/* 2. Datos del Pallet */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. Datos del Pallet</Text>

                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.label}>Número Pallet *</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={formData.pallet_numero}
                                onChangeText={(text) => handleChange('pallet_numero', text)}
                            />
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.label}>Emplantillador</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.pallet_emplantillador}
                                onChangeText={(text) => handleChange('pallet_emplantillador', text)}
                            />
                        </View>
                    </View>
                </View>

                {/* 3. Dimensiones */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. Dimensiones *</Text>

                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.label}>Largo</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={formData.dimensiones.largo}
                                onChangeText={(text) => handleDimensionChange('largo', text)}
                            />
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.label}>Ancho Plantilla</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={formData.dimensiones.ancho_plantilla}
                                onChangeText={(text) => handleDimensionChange('ancho_plantilla', text)}
                            />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.label}>Espesor</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={formData.dimensiones.espesor}
                                onChangeText={(text) => handleDimensionChange('espesor', text)}
                            />
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.label}>Cantidad</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={formData.dimensiones.cantidad_plantilla}
                                onChangeText={(text) => handleDimensionChange('cantidad_plantilla', text)}
                            />
                        </View>
                    </View>
                </View>

                {/* Cálculos BFT (Visuales) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Cálculos Estimados (BFT)</Text>
                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.label}>BFT Recibido</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: '#e0e0e0', color: colors.textPrimary }]}
                                value={(
                                    (parseFloat(formData.dimensiones.largo || 0) *
                                        parseFloat(formData.dimensiones.ancho_plantilla || 0) *
                                        parseFloat(formData.dimensiones.espesor || 0) *
                                        parseInt(formData.dimensiones.cantidad_plantilla || 0)) / 12
                                ).toFixed(2)}
                                editable={false}
                            />
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.label}>BFT Aceptado (90%)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: '#e0e0e0', color: colors.textPrimary }]}
                                value={(
                                    ((parseFloat(formData.dimensiones.largo || 0) *
                                        parseFloat(formData.dimensiones.ancho_plantilla || 0) *
                                        parseFloat(formData.dimensiones.espesor || 0) *
                                        parseInt(formData.dimensiones.cantidad_plantilla || 0)) / 12) *
                                    0.9
                                ).toFixed(2)}
                                editable={false}
                            />
                        </View>
                    </View>
                </View>

                {/* 4. Calificaciones */}
                <View style={styles.section}>
                    <View style={styles.rowHeader}>
                        <Text style={styles.sectionTitle}>4. Calificaciones</Text>
                        <TouchableOpacity onPress={addCalificacion} style={styles.addButton}>
                            <Text style={styles.addButtonText}>+ Agregar</Text>
                        </TouchableOpacity>
                    </View>

                    {formData.calificaciones.map((cal, index) => (
                        <View key={index} style={styles.card}>
                            <View style={styles.row}>
                                <View style={[styles.col, { flex: 1 }]}>
                                    <Text style={styles.label}>Valor *</Text>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        value={cal.valor.toString()}
                                        onChangeText={(text) => updateCalificacion(index, 'valor', text)}
                                    />
                                </View>
                                <TouchableOpacity onPress={() => removeCalificacion(index)} style={styles.deleteButton}>
                                    <Text style={styles.deleteButtonText}>X</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.label}>Motivo</Text>
                            <TextInput
                                style={styles.input}
                                value={cal.motivo}
                                onChangeText={(text) => updateCalificacion(index, 'motivo', text)}
                                placeholder="Opcional"
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>
                    ))}
                    {formData.calificaciones.length === 0 && (
                        <Text style={styles.emptyText}>No hay calificaciones registradas</Text>
                    )}
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

    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    col: { flex: 1 },

    // Calificaciones
    card: {
        backgroundColor: colors.background,
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: colors.border
    },
    addButton: { backgroundColor: colors.primary, paddingVertical: 5, paddingHorizontal: 15, borderRadius: 20 },
    addButtonText: { color: colors.background, fontWeight: 'bold' },
    deleteButton: { marginLeft: 10, justifyContent: 'center', padding: 5 },
    deleteButtonText: { color: 'red', fontWeight: 'bold', fontSize: 18 },
    emptyText: { color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center' },

    // Submit
    submitBtn: { backgroundColor: colors.primary, padding: 15, borderRadius: 8, alignItems: 'center' },
    submitBtnDisabled: { backgroundColor: colors.border, opacity: 0.5 },
    submitText: { color: colors.background, fontWeight: 'bold', fontSize: 16 },
});

export default IngresoPalletsScreen;