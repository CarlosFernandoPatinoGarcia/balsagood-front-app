import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import api from '../api/api';
import { colors } from '../theme/colors';

const DespachoLoteScreen = ({ route, navigation }) => {
    const { idLote } = route.params;
    const [lote, setLote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchLoteDetails();
    }, []);

    const fetchLoteDetails = async () => {
        try {
            const res = await api.get(`/api/lotes-secado/${idLote}/despacho`);
            setLote(res.data);
            setLoading(false);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo cargar la información del lote');
            navigation.goBack();
        }
    };

    const handleDespacho = () => {
        Alert.alert(
            'Confirmar Despacho',
            '¿Enviar Lote a Taller? Los pallets pasarán a estado CONSUMIDO.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar', onPress: async () => {
                        setProcessing(true);
                        try {
                            await api.patch(`/api/lotes-secado/despachar/${idLote}`);
                            Alert.alert('Éxito', 'Lote despachado a taller correctamente', [
                                { text: 'OK', onPress: () => navigation.navigate('GestionSecado') }
                            ]);
                        } catch (error) {
                            console.error(error);
                            const errorMsg = error.response?.data?.message || 'Error al despachar el lote';
                            Alert.alert('Error', errorMsg);
                            setProcessing(false);
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!lote) return null;

    return (
        <View style={styles.container}>
            {/* 1. HEADER */}
            <View style={styles.headerCard}>
                <View style={styles.headerRow}>
                    <Text style={styles.loteTitle}>Lote #{lote.loteCodigo || lote.idLote}</Text>
                </View>

                <View style={styles.bftContainer}>
                    <Text style={styles.bftLabel}>Total BFT Seco</Text>
                    <Text style={styles.bftValue}>{lote.bftLoteSeco || '0.00'}</Text>
                </View>

                <View style={styles.datesRow}>
                    <Text style={styles.dateText}>Inicio: {lote.loteFechaInicio?.split('T')[0]}</Text>
                    <Text style={styles.dateText}>Fin: {lote.loteFechaFin?.split('T')[0]}</Text>
                </View>
            </View>

            {/* 2. LISTA DE PALLETS */}
            <FlatList
                data={lote.pallets || []}
                keyExtractor={(item) => (item.idPallet ? item.idPallet.toString() : Math.random().toString())}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <View style={styles.palletRow}>
                        <View style={styles.palletInfo}>
                            <Text style={styles.palletMainText}>
                                {item.codigo || `Pallet #${item.palletNumero}`}
                            </Text>
                            <Text style={styles.palletSubText}>
                                {item.proveedor || item.recepcion?.proveedor?.provNombre || 'Proveedor Desconocido'}
                            </Text>
                        </View>
                        <View style={styles.palletBft}>
                            <Text style={styles.palletBftValue}>
                                {item.bft != null ? item.bft : (item.bftVerdeSeco || item.bftVerdeAceptado || '0')} BFT
                            </Text>
                        </View>
                    </View>
                )}
            />

            {/* 3. FOOTER */}
            <View style={styles.footer}>
                <Text style={styles.footerSummary}>Total Pallets: {lote.pallets?.length || 0}</Text>
                <TouchableOpacity
                    style={[styles.confirmBtn, processing && styles.disabledBtn]}
                    onPress={handleDespacho}
                    disabled={processing}
                >
                    <Text style={styles.confirmBtnText}>
                        {processing ? 'PROCESANDO...' : 'CONFIRMAR SALIDA A TALLER'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

    // Header Styles
    headerCard: {
        backgroundColor: colors.card,
        padding: 20,
        margin: 15,
        borderRadius: 12,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    loteTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
    loteId: { color: colors.textSecondary, fontSize: 16 },

    bftContainer: { alignItems: 'center', marginVertical: 10, padding: 10, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8 },
    bftLabel: { color: colors.primary, fontSize: 14, textTransform: 'uppercase', marginBottom: 5 },
    bftValue: { color: colors.white, fontSize: 32, fontWeight: 'bold' },

    datesRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    dateText: { color: colors.textSecondary, fontSize: 13 },

    // List Styles
    listContent: { paddingHorizontal: 15, paddingBottom: 100 },
    palletRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 15,
        marginBottom: 10,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: colors.border
    },
    palletInfo: { flex: 1 },
    palletMainText: { color: colors.white, fontWeight: 'bold', marginBottom: 4 },
    palletSubText: { color: colors.textSecondary, fontSize: 12 },

    palletBft: { marginLeft: 10 },
    palletBftValue: { color: colors.primary, fontWeight: 'bold', fontSize: 16 },

    // Footer Styles
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.card,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        elevation: 10
    },
    footerSummary: { color: colors.textSecondary, textAlign: 'center', marginBottom: 15 },
    confirmBtn: { backgroundColor: colors.primary, paddingVertical: 15, borderRadius: 10, alignItems: 'center' },
    disabledBtn: { opacity: 0.7 },
    confirmBtnText: { color: colors.background, fontWeight: 'bold', fontSize: 16, textTransform: 'uppercase' }
});

export default DespachoLoteScreen;
