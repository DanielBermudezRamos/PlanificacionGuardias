import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api"
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const url = error.config?.url || "";

        // Un 401 en el login es credenciales invalidas, no sesion vencida.
        if (status === 401 && !url.includes("/auth/login")) {
            localStorage.removeItem("token");

            if (window.location.pathname !== "/") {
                window.location.assign("/");
            }
        }

        return Promise.reject(error);
    }
);

export default api;
