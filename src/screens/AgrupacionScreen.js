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
            .reduce((sum, b) => sum + (b.bancho || 0), 0);
        setAnchoTotal(total);
    }, [selectedIds, bloques]);

    const fetchBloques = async () => {
        try {
            // En un escenario real, filtraríamos por estado en el backend: /bloques?estado=LISTO
            const res = await api.get('/bloques');
            // Filtramos localmente para demo: Listo o Encolado
            const filtered = res.data.filter(b => b.bestado === 'LISTO' || b.bestado === 'ENCOLADO');
            setBloques(filtered);
        } catch (e) {
            console.error(e);
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
            // 1. Crear el Cuerpo
            const cuerpoRes = await api.post('/cuerpos', {
                cuerpoAnchoFinal: anchoTotal,
                cuerpoObservacion: `Generado desde App con ${selectedIds.length} bloques`
            });
            const nuevoCuerpo = cuerpoRes.data;

            // 2. Actualizar los bloques seleccionados para pertenecer a este cuerpo
            // Nota: Esto asume que tienes un endpoint para actualizar batch o un loop
            // Aquí haremos un loop simple
            const updatePromises = selectedIds.map(id => {
                const bloqueOriginal = bloques.find(b => b.idBloque === id);
                return api.put(`/bloques/${id}`, {
                    ...bloqueOriginal, // mantienes datos viejos
                    cuerpo: { idCuerpo: nuevoCuerpo.idCuerpo },
                    bEstado: 'DESPACHO' // Nuevo estado
                });
            });

            await Promise.all(updatePromises);

            Alert.alert('Éxito', 'Cuerpo creado y bloques asignados para despacho.');
            setSelectedIds([]);
            setAnchoTotal(0);
            fetchBloques(); // Recargar lista
        } catch (e) {
            Alert.alert('Error', 'No se pudo procesar la agrupación.');
            console.error(e);
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
                    <Text style={styles.itemSub}>Ancho: {item.bancho}" | {item.bestado}</Text>
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