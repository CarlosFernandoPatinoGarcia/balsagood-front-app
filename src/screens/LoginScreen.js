import React, { useState, useContext } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { colors } from '../theme/colors';
import FormIP from './FormIP'; // Ensure this path is correct if we want to allow IP config on login
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [ipModalVisible, setIpModalVisible] = useState(false);

    const { authContext } = useContext(AuthContext);

    const handleLogin = async () => {

        if (!username || !password) {
            Alert.alert('Error', 'Por favor ingrese usuario y contraseña');
            return;
        }

        setLoading(true);
        try {
            await authContext.signIn({ username, password });
            // Navigation will be handled automatically by the state change in AppNavigator
        } catch (error) {
            console.error(error);
            Alert.alert('Login Fallido', 'Credenciales incorrectas o error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <View style={styles.logoContainer}>
                {/* Placeholder for logo if available, or just text */}
                <Text style={styles.title}>Balsagood S.A.</Text>
                <Text style={styles.subtitle}>Bienvenido, Supervisor</Text>
            </View>

            <View style={styles.formContainer}>
                <Text style={styles.label}>Usuario</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ingrese su usuario"
                    placeholderTextColor="#aaa"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                />

                <Text style={styles.label}>Contraseña</Text>
                <TextInput
                    textContentType="password"
                    style={styles.input}
                    placeholder="Ingrese su contraseña"
                    placeholderTextColor="#aaa"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={true}
                    autoCorrect={false}
                    autoCapitalize="none"
                    spellCheck={false}
                />

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Iniciar Sesión</Text>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity onPress={() => setIpModalVisible(true)}>
                    <Text style={{ color: colors.primary, textDecorationLine: 'underline', marginBottom: 10 }}>
                        Configurar Conexión
                    </Text>
                </TouchableOpacity>
                <FormIP
                    visible={ipModalVisible}
                    onClose={() => setIpModalVisible(false)}
                />
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background || '#1a1a1a', // Fallback if colors not loaded
        justifyContent: 'center',
        padding: 20,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.primary || '#4CAF50',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 18,
        color: '#ccc',
    },
    formContainer: {
        backgroundColor: '#2a2a2a',
        padding: 20,
        borderRadius: 10,
        elevation: 5,
    },
    label: {
        color: '#fff',
        marginBottom: 5,
        fontSize: 16,
    },
    input: {
        backgroundColor: '#333',
        color: '#fff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#444',
    },
    button: {
        backgroundColor: colors.primary || '#4CAF50',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    footer: {
        marginTop: 30,
        alignItems: 'center',
    }
});

export default LoginScreen;
