import axios from 'axios';

import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuración por defecto
const DEFAULT_IP = '192.168.1.63';
const BASE_URL = `http://${DEFAULT_IP}:8080`;

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const configureApi = async (ip) => {
    try {
        const cleanIp = ip.trim();
        // Si el usuario no pone http, asumimos http y puerto 8080 si no lo especifica
        let url = cleanIp;
        if (!url.startsWith('http')) {
            url = `http://${cleanIp}`;
        }
        if ((url.match(/:/g) || []).length < 2) { // Si no tiene dos puntos (http: y :port)
            url = `${url}:8080`;
        }

        api.defaults.baseURL = url;
        await AsyncStorage.setItem('API_IP', cleanIp);

    } catch (e) {
        console.error("Error saving IP", e);
    }
};

export const loadApiConfiguration = async () => {
    try {
        const savedIp = await AsyncStorage.getItem('API_IP');
        if (savedIp) {
            await configureApi(savedIp);
            return savedIp;
        }
    } catch (e) {
        console.error("Error loading IP", e);
    }
    return DEFAULT_IP;
};

export default api;