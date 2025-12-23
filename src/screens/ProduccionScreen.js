import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import api from '../api/api';
import { colors } from '../theme/colors';

const ProduccionScreen = () => {
    const [mode, setMode] = useState('NUEVO'); // NUEVO o ENCOLADO
    // const [idOrden, setIdOrden] = useState(''); // Eliminado: Se asume interno

    // Datos para nuevo bloque
    const [newBlock, setNewBlock] = useState({ largo: '', ancho: '', alto: '', pesoSin: '' });

    // Datos para encolado
    const [encolado, setEncolado] = useState({ idBloque: '', pesoCon: '' });

    const handleCreateBlock = async () => {
        try {
            const payload = {
                ordenTaller: { idOrden: 1 }, // Hardcoded o gestionado por backend (antes era manual)
                cuerpo: { idCuerpo: 1 }, // ID temporal o por defecto si es requerido por BD
                bLargo: parseFloat(newBlock.largo),
                bAncho: parseFloat(newBlock.ancho),
                bAlto: parseFloat(newBlock.alto),
                bPesoSinCola: parseFloat(newBlock.pesoSin),
                bBftFinal: 0, // Calculable si es necesario
                estado: 'PRESENTADO'
            };
            await api.post('/api/bloques', payload);
            Alert.alert('Éxito', 'Bloque registrado como PRESENTADO');
            setNewBlock({ largo: '', ancho: '', alto: '', pesoSin: '' });
        } catch (e) {
            Alert.alert('Error', 'Falló el registro del bloque');
        }
    };

    const handleUpdateEncolado = async () => {
        try {
            // 1. Obtener el bloque actual para validar peso
            const { data: bloque } = await api.get(`/api/bloques/${encolado.idBloque}`);
            const pesoSin = parseFloat(bloque.bpesoSinCola);
            const pesoCon = parseFloat(encolado.pesoCon);

            // Validación: 350g de diferencia (0.35 si la unidad es kg, 350 si es gramos)
            // Asumiremos gramos por la descripción del prompt "350g"
            if (pesoCon < pesoSin + 350) {
                Alert.alert('Alerta de Calidad', `El peso de cola es insuficiente. Diferencia: ${(pesoCon - pesoSin).toFixed(2)}g`);
                return;
            }

            // 2. Actualizar estado y peso
            await api.put(`/api/bloques/${encolado.idBloque}/encolado`, {
                bPesoConCola: pesoCon
            });

            Alert.alert('Éxito', 'Bloque actualizado a ENCOLADO');
            setEncolado({ idBloque: '', pesoCon: '' });
        } catch (e) {
            console.log(e);
            Alert.alert('Error', 'No se encontró el bloque o error de red');
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.tabs}>
                <TouchableOpacity style={[styles.tab, mode === 'NUEVO' && styles.tabActive]} onPress={() => setMode('NUEVO')}>
                    <Text style={styles.tabText}>Nuevo Bloque</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, mode === 'ENCOLADO' && styles.tabActive]} onPress={() => setMode('ENCOLADO')}>
                    <Text style={styles.tabText}>Registro Encolado</Text>
                </TouchableOpacity>
            </View>

            {mode === 'NUEVO' ? (
                <View>
                    {/* Campo ID Orden eliminado */}

                    <Text style={styles.label}>Dimensiones (L x A x H)</Text>
                    <View style={styles.row}>
                        <TextInput style={[styles.input, styles.col3]} placeholder="L" placeholderTextColor="#666" keyboardType="numeric" value={newBlock.largo} onChangeText={t => setNewBlock({ ...newBlock, largo: t })} />
                        <TextInput style={[styles.input, styles.col3]} placeholder="A" placeholderTextColor="#666" keyboardType="numeric" value={newBlock.ancho} onChangeText={t => setNewBlock({ ...newBlock, ancho: t })} />
                        <TextInput style={[styles.input, styles.col3]} placeholder="H" placeholderTextColor="#666" keyboardType="numeric" value={newBlock.alto} onChangeText={t => setNewBlock({ ...newBlock, alto: t })} />
                    </View>

                    <Text style={styles.label}>Peso Sin Cola (g)</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={newBlock.pesoSin} onChangeText={t => setNewBlock({ ...newBlock, pesoSin: t })} />

                    <TouchableOpacity style={styles.btn} onPress={handleCreateBlock}>
                        <Text style={styles.btnText}>REGISTRAR BLOQUE</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View>
                    <Text style={styles.label}>ID Bloque (Código)</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={encolado.idBloque} onChangeText={t => setEncolado({ ...encolado, idBloque: t })} />

                    <Text style={styles.label}>Peso Con Cola (g)</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={encolado.pesoCon} onChangeText={t => setEncolado({ ...encolado, pesoCon: t })} />

                    <TouchableOpacity style={styles.btn} onPress={handleUpdateEncolado}>
                        <Text style={styles.btnText}>VALIDAR Y ACTUALIZAR</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { padding: 20, backgroundColor: colors.background, flexGrow: 1 },
    tabs: { flexDirection: 'row', marginBottom: 20 },
    tab: { flex: 1, padding: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: colors.card },
    tabActive: { borderBottomColor: colors.primary },
    tabText: { color: colors.text, fontWeight: 'bold' },
    label: { color: colors.textSecondary, marginTop: 10, marginBottom: 5 },
    input: { backgroundColor: colors.card, color: colors.white, borderRadius: 8, padding: 10, marginBottom: 10 },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    col3: { width: '30%' },
    btn: { backgroundColor: colors.primary, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
    btnText: { color: colors.background, fontWeight: 'bold' }
});

export default ProduccionScreen;