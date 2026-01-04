import axios from 'axios';

// CAMBIA ESTA IP POR LA DE TU MÁQUINA LOCAL
const BASE_URL = 'http://localhost:8080';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;