import axios from 'axios';

// CAMBIA ESTA IP POR LA DE TU MÁQUINA LOCAL
const BASE_URL = 'http://192.168.1.70:8080/api';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;