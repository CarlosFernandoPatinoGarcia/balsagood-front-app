import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Switch } from 'react-native';
import api from '../api/api';
import { colors } from '../theme/colors';

const IngresoPalletsScreen = () => {
    const [formData, setFormData] = useState({
        num_viaje: '',
        fecha_ingreso: new Date().toISOString().split('T')[0], // Default YYYY-MM-DD
        prov_nombre: '',
        pallet_numero: '',
        pallet_emplantillador: '',
        ancho_global: '81', // Ancho Global Fijo
        calificaciones: [{ largo: '', espesor: '', cantidad: '', castigado: false, largo_original: '' }] // Lista dinámica inicializada con una fila
    });

    const [isValid, setIsValid] = useState(false);
    const [totalBFTRecibido, setTotalBFTRecibido] = useState(0);
    const [totalBFTAceptado, setTotalBFTAceptado] = useState(0);

    // Refs para manejo de foco
    const itemsRef = React.useRef({});

    // Estado para trackear adición de filas
    const prevCalificacionesLength = React.useRef(formData.calificaciones.length);

    // Efecto para enfocar nuevo item cuando se agrega
    useEffect(() => {
        if (formData.calificaciones.length > prevCalificacionesLength.current) {
            const index = formData.calificaciones.length - 1;
            // Pequeño timeout para asegurar que el componente se renderizó
            setTimeout(() => {
                if (itemsRef.current[`largo-${index}`]) {
                    itemsRef.current[`largo-${index}`].focus();
                }
            }, 100);
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
                    if (l > 0) {
                        tempTotalAceptado += (l * ancho * e * c) / 12;
                    }
                    if (l_original > 0) {
                        tempTotalRecibido += (l_original * ancho * e * c) / 12;
                    }
                }
            });
            setTotalBFTRecibido(tempTotalRecibido);
            setTotalBFTAceptado(tempTotalAceptado);

            // 2. Validación
            // Campos de cabecera
            if (!num_viaje || !prov_nombre || !pallet_numero || !ancho_global) return false;

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
        // Evitar borrar la última fila si se desea, pero el usuario puede querer vaciarlo. 
        // El prompt dice "botón al presionarlo aparece nueva fila".
        // Asumiremos que se puede borrar.
        const newCalificaciones = formData.calificaciones.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, calificaciones: newCalificaciones }));
    };

    const handleSubmit = async () => {
        if (!isValid) return;

        try {
            // Construir payload
            const payload = {
                num_viaje: parseInt(formData.num_viaje),
                fecha_ingreso: formData.fecha_ingreso,
                prov_nombre: formData.prov_nombre,
                pallet_numero: parseInt(formData.pallet_numero),
                pallet_emplantillador: formData.pallet_emplantillador || "",
                // El backend espera 'dimensiones' global? 
                // El prompt dice: "Envía el arreglo de todas las filas capturadas en el objeto JSON de calificaciones."
                // Probablemente el backend aun espere la estructura base. 
                // Asumiremos que enviamos 'dimensiones' con el ancho global y quizas valores dummy o sumas para largo/espesor si fuera necesario,
                // PERO el usuario especificó que las dimensiones son por fila.
                // Ajustaremos para enviar el ancho en 'dimensiones' si es requerido por compatibilidad, 
                // o si el backend fue modificado para ignorar las dimensiones globales viejas.
                // Por seguridad, enviaremos ancho_plantilla en dimensiones, y el resto en calificaciones.
                dimensiones: {
                    largo: 0, // Ya no hay largo global único
                    ancho_plantilla: parseFloat(formData.ancho_global),
                    espesor: 0, // Ya no hay espesor global único
                    cantidad_plantilla: 0 // Ya no hay cantidad global única
                },
                calificaciones: formData.calificaciones.map(c => ({
                    largo: parseFloat(c.largo),
                    espesor: parseFloat(c.espesor),
                    cantidad: parseFloat(c.cantidad),
                    es_castigado: c.castigado,
                    largo_original: c.castigado ? parseFloat(c.largo_original) : parseFloat(c.largo)
                    // Si el backend aun exige 'valor' o 'motivo', podrian fallar.
                    // Asumiremos que el backend se adaptó a esto segun instrucciones del usuario.
                }))
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

                {/* 3. Dimensiones Globales */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. Configuración Global</Text>
                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.label}>Ancho (Fijo)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: '#e0e0e0', color: colors.textPrimary }]}
                                value={formData.ancho_global}
                                editable={false} // Fijo en 81
                            />
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
                                            returnKeyType="next"
                                            blurOnSubmit={false}
                                            onSubmitEditing={() => {
                                                if (itemsRef.current[`largo-${index}`]) {
                                                    itemsRef.current[`largo-${index}`].focus();
                                                }
                                            }}
                                        />
                                    </View>
                                )}

                                <View style={styles.col}>
                                    <Text style={styles.label}>{item.castigado ? "L. Acept." : "Largo"}</Text>
                                    <TextInput
                                        ref={(el) => itemsRef.current[`largo-${index}`] = el}
                                        style={styles.input}
                                        keyboardType="numeric"
                                        placeholder="0.0"
                                        placeholderTextColor={colors.textSecondary}
                                        value={item.largo}
                                        onChangeText={(text) => updateRow(index, 'largo', text)}
                                        returnKeyType="next"
                                        blurOnSubmit={false}
                                        onSubmitEditing={() => {
                                            if (itemsRef.current[`espesor-${index}`]) {
                                                itemsRef.current[`espesor-${index}`].focus();
                                            }
                                        }}
                                    />
                                </View>
                                <View style={styles.col}>
                                    <Text style={styles.label}>Espesor</Text>
                                    <TextInput
                                        ref={(el) => itemsRef.current[`espesor-${index}`] = el}
                                        style={styles.input}
                                        keyboardType="numeric"
                                        placeholder="0.0"
                                        placeholderTextColor={colors.textSecondary}
                                        value={item.espesor}
                                        onChangeText={(text) => updateRow(index, 'espesor', text)}
                                        returnKeyType="next"
                                        blurOnSubmit={false}
                                        onSubmitEditing={() => {
                                            if (itemsRef.current[`cantidad-${index}`]) {
                                                itemsRef.current[`cantidad-${index}`].focus();
                                            }
                                        }}
                                    />
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

                {/* Cálculo Visual Total */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Resumen BFT</Text>
                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.label}>Total Recibido</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: '#e0e0e0', color: colors.textPrimary, fontWeight: 'bold' }]}
                                value={totalBFTRecibido.toFixed(2)}
                                editable={false}
                            />
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.label}>Total Aceptado</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: '#d1f2eb', color: '#0b5345', fontWeight: 'bold' }]}
                                value={totalBFTAceptado.toFixed(2)}
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