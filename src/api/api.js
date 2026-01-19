import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuración por defecto
const DEFAULT_IP = '192.168.1.63';
const DEFAULT_PORT = '8080';
const BASE_URL = `http://${DEFAULT_IP}:${DEFAULT_PORT}`;

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- AGREGAR ESTO: EL INTERCEPTOR ---
api.interceptors.request.use(
    async (config) => {
        // 1. Obtener la IP dinámica guardada (para que no falle si cambiaste de red)
        // La URL base ya es manejada por api.defaults.baseURL y loadApiConfiguration
        // No sobreescribir aquí con una lógica diferente.

        // 2. Obtener el TOKEN de seguridad
        const token = await AsyncStorage.getItem('userToken');

        // 3. Si existe, pegarlo en la cabecera Authorization
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// (Opcional) Interceptor de respuesta para manejar cuando el token expira
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response && error.response.status === 403) {
            // El token venció o es inválido. Podrías borrarlo y mandar al Login.
            await AsyncStorage.removeItem('userToken');
            console.error("Acceso denegado (403). El token puede haber expirado.");
        }
        return Promise.reject(error);
    }
);

export const configureApi = async (url) => {
    try {
        let cleanUrl = url.trim();

        // Validar si ya tiene protocolo
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
            // Si no tiene protocolo, asumir http
            cleanUrl = `http://${cleanUrl}`;

            // Si después de agregar http:// no tiene puerto (buscamos un segundo :), agregar 8080
            // http://ip:port -> 2 colons. http://ip -> 1 colon.
            if ((cleanUrl.match(/:/g) || []).length < 2) {
                cleanUrl = `${cleanUrl}:${DEFAULT_PORT}`;
            }
        }

        console.log("Configuring API URL:", cleanUrl); // Debug log
        api.defaults.baseURL = cleanUrl;
        await AsyncStorage.setItem('API_IP', cleanUrl);

    } catch (e) {
        console.error("Error saving IP", e);
    }
};

export const loadApiConfiguration = async () => {
    try {
        const savedUrl = await AsyncStorage.getItem('API_IP'); // We reuse API_IP key for full URL
        if (savedUrl) {
            api.defaults.baseURL = savedUrl; // Ensure axios is updated
            return savedUrl;
        }
    } catch (e) {
        console.error("Error loading IP", e);
    }
    return BASE_URL;
};

export default api;