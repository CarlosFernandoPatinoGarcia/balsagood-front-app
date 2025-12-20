import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import api from '../api/api';
import { colors } from '../theme/colors';

const IngresoPalletsScreen = () => {
    const [form, setForm] = useState({
        // idRecepcion: '', // Eliminado
        // palletNumero: '', // Eliminado
        palletCantPlantillas: '',
        palletLargo: '',
        palletAncho: '',
        palletEspesor: '',
        calificacion: 5,
    });

    // Estado para guardar la respuesta del servidor y mostrarla
    const [ultimoPallet, setUltimoPallet] = useState(null);

    const handleChange = (key, value) => setForm({ ...form, [key]: value });

    const handleSubmit = async () => {
        // Validaciones básicas antes de enviar
        if (!form.palletLargo || !form.palletAncho || !form.palletEspesor) {
            Alert.alert('Error', 'Por favor complete las dimensiones');
            return;
        }

        try {
            // 1. Preparamos el objeto SOLO con los datos físicos (dimensiones)
            // NO enviamos BFT, el backend lo hará.
            const palletPayload = {
                recepcion: { idRecepcion: 1 }, // Hardcoded temporalmente o manejado por backend
                // palletNumero: parseInt(form.palletNumero), // Eliminado
                palletCantPlantillas: parseInt(form.palletCantPlantillas || 0),
                palletLargo: parseFloat(form.palletLargo),
                // IMPORTANTE: El backend usa 'palletAnchoPlantilla' para la fórmula
                palletAnchoPlantilla: parseFloat(form.palletAncho),
                palletAncho: parseFloat(form.palletAncho),
                palletEspesor: parseFloat(form.palletEspesor),
                palletEstado: 'MADERA VERDE'
            };

            // 2. Enviamos al Backend
            const response = await api.post('/pallets-verdes', palletPayload);

            // 3. RECIBIMOS el cálculo del Backend
            // Spring Boot nos devuelve el objeto creado, que ya incluye los BFT calculados
            const palletGuardado = response.data;
            const newPalletId = palletGuardado.idPallet;

            // 4. Guardamos la calificación (si aplica)
            if (newPalletId) {
                await api.post('/calificaciones-pallets', {
                    palletVerde: { idPallet: newPalletId },
                    calificacionValor: parseFloat(form.calificacion),
                    calificadorUsuario: 'Supervisor Movil',
                    calificacionFecha: new Date().toISOString()
                });
            }

            // 5. Actualizamos la UI con los datos REALES del servidor
            setUltimoPallet({
                numero: palletGuardado.palletNumero, // El backend debe haberlo generado
                bftRecibido: palletGuardado.bftVerdeRecibido,
                bftAceptado: palletGuardado.bftVerdeAceptado
            });

            Alert.alert('Éxito', `Pallet #${palletGuardado.palletNumero || 'Registrado'} procesado correctamente.`);

            // Limpiamos el formulario para el siguiente
            setForm({
                ...form,
                palletCantPlantillas: '',
                // Opcional: limpiar dimensiones si varían mucho
            });

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo guardar. Verifique conexión.');
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.sectionTitle}>Datos del Pallet</Text>

            {/* Campos de ID eliminados: ID Recepción y Número de Pallet */}

            <View style={styles.row}>
                <View style={styles.col}>
                    <Text style={styles.label}>Largo (pies)</Text>
                    <TextInput style={styles.input} keyboardType="numeric" onChangeText={(v) => handleChange('palletLargo', v)} value={form.palletLargo} />
                </View>
                <View style={styles.col}>
                    <Text style={styles.label}>Ancho (pulg)</Text>
                    <TextInput style={styles.input} keyboardType="numeric" onChangeText={(v) => handleChange('palletAncho', v)} value={form.palletAncho} />
                </View>
            </View>

            <View style={styles.row}>
                <View style={styles.col}>
                    <Text style={styles.label}>Espesor (pulg)</Text>
                    <TextInput style={styles.input} keyboardType="numeric" onChangeText={(v) => handleChange('palletEspesor', v)} value={form.palletEspesor} />
                </View>
                <View style={styles.col}>
                    <Text style={styles.label}>Cant. Plantillas</Text>
                    <TextInput style={styles.input} keyboardType="numeric" onChangeText={(v) => handleChange('palletCantPlantillas', v)} value={form.palletCantPlantillas} />
                </View>
            </View>

            <Text style={styles.label}>Calidad (1-10)</Text>
            <View style={styles.qualityContainer}>
                {[1, 5, 10].map((val) => (
                    <TouchableOpacity
                        key={val}
                        style={[styles.qualityBtn, form.calificacion === val && styles.qualityBtnActive]}
                        onPress={() => handleChange('calificacion', val)}
                    >
                        <Text style={styles.qualityText}>{val}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                <Text style={styles.submitText}>PROCESAR Y GUARDAR</Text>
            </TouchableOpacity>

            {/* Tarjeta de Confirmación de Cálculo del Backend */}
            {ultimoPallet && (
                <View style={styles.resultCard}>
                    <Text style={styles.resultTitle}>Último Registro (Backend):</Text>
                    <Text style={styles.resultText}>Pallet #{ultimoPallet.numero}</Text>
                    <View style={styles.divider} />
                    <View style={styles.row}>
                        <View>
                            <Text style={styles.labelSmall}>BFT Recibido</Text>
                            <Text style={styles.resultValue}>{ultimoPallet.bftRecibido}</Text>
                        </View>
                        <View>
                            <Text style={styles.labelSmall}>BFT Aceptado</Text>
                            <Text style={styles.resultValue}>{ultimoPallet.bftAceptado}</Text>
                        </View>
                    </View>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { padding: 20, backgroundColor: colors.background, flexGrow: 1 },
    sectionTitle: { color: colors.primary, fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    label: { color: colors.textSecondary, marginBottom: 5 },
    labelSmall: { color: colors.textSecondary, fontSize: 12 },
    input: { backgroundColor: colors.card, color: colors.white, borderRadius: 8, padding: 10, marginBottom: 15, borderWidth: 1, borderColor: colors.border },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    col: { width: '48%' },

    // Estilos de Calidad
    qualityContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
    qualityBtn: { padding: 10, borderRadius: 50, backgroundColor: colors.card, width: 50, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    qualityBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    qualityText: { color: colors.white, fontWeight: 'bold' },

    // Botón Principal
    submitBtn: { backgroundColor: colors.primary, padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
    submitText: { color: colors.background, fontWeight: 'bold', fontSize: 16 },

    // Tarjeta de Resultado
    resultCard: { backgroundColor: '#1A4D36', padding: 15, borderRadius: 10, borderColor: colors.primary, borderWidth: 1, marginTop: 10 },
    resultTitle: { color: colors.white, fontWeight: 'bold', marginBottom: 5 },
    resultText: { color: colors.text, fontSize: 16, marginBottom: 10 },
    resultValue: { color: colors.primary, fontSize: 22, fontWeight: 'bold' },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 }
});

export default IngresoPalletsScreen;