import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import api from '../api/api';
import { colors } from '../theme/colors';

const AgrupacionScreen = () => {
    const [bloques, setBloques] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [anchoTotal, setAnchoTotal] = useState(0);

    useEffect(() => {
        fetchBloques();
    }, []);

    // Recalcular ancho total al seleccionar
    useEffect(() => {
        const total = bloques
            .filter(b => selectedIds.includes(b.idBloque))
            .reduce((sum, b) => sum + (b.bloqueAncho || b.bancho || 0), 0);
        setAnchoTotal(total);
    }, [selectedIds, bloques]);

    const fetchBloques = async () => {
        try {
            // endpoint específico para bloques encolados
            const res = await api.get('/api/bloques/encolados');
            setBloques(res.data);
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

    const handleCrearCuerpo = async () => {
        // Validación de Rango 86 - 88
        if (anchoTotal < 86 || anchoTotal > 88) {
            Alert.alert('Rango Inválido', `El ancho acumulado (${anchoTotal}") debe estar entre 86" y 88".`);
            return;
        }

        try {
            // Construcción del Payload para /api/cuerpos/agrupar
            const payload = {
                idsBloques: selectedIds,
                anchoFinal: anchoTotal,
                observacion: `Generado desde App. Ancho: ${anchoTotal}"`,
                // [MODULAR] Agrega aquí más campos si son necesarios en el futuro
                // ejemploCampo: "Valor"
            };

            await api.post('/api/cuerpos/agrupar', payload);

            Alert.alert('Éxito', 'Cuerpo creado y bloques asignados para exportación.');

            setSelectedIds([]);
            setAnchoTotal(0);
            fetchBloques(); // Recargar lista
        } catch (e) {
            console.error("Error al agrupar:", e);
            const msg = e.response?.data?.message || e.response?.data || 'No se pudo procesar la agrupación.';
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
                    <Text style={styles.itemText}>Bloque #{item.idBloque}</Text>
                    <Text style={styles.itemSub}>Ancho: {item.bloqueAncho}" | {item.estado}</Text>
                </View>
                {isSelected && <Text style={styles.check}>✓</Text>}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Seleccione Bloques</Text>
            <Text style={styles.subHeader}>Acumulado: {anchoTotal.toFixed(2)}" (Meta: 86-88)</Text>

            <FlatList
                data={bloques}
                keyExtractor={item => item.idBloque.toString()}
                renderItem={renderItem}
                contentContainerStyle={{ paddingBottom: 100 }}
            />

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.btn, (anchoTotal < 86 || anchoTotal > 88) ? styles.btnDisabled : null]}
                    onPress={handleCrearCuerpo}
                    disabled={anchoTotal < 86 || anchoTotal > 88}
                >
                    <Text style={styles.btnText}>CONFIRMAR AGRUPACIÓN</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 20 },
    header: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
    subHeader: { color: colors.primary, fontSize: 16, marginBottom: 15 },
    item: { backgroundColor: colors.card, padding: 15, borderRadius: 8, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    itemSelected: { borderColor: colors.primary, borderWidth: 1 },
    itemText: { color: colors.white, fontWeight: 'bold' },
    itemSub: { color: colors.textSecondary },
    check: { color: colors.primary, fontSize: 20, fontWeight: 'bold' },
    footer: { position: 'absolute', bottom: 20, left: 20, right: 20 },
    btn: { backgroundColor: colors.primary, padding: 15, borderRadius: 8, alignItems: 'center' },
    btnDisabled: { backgroundColor: '#555' },
    btnText: { color: colors.background, fontWeight: 'bold' }
});

export default AgrupacionScreen;