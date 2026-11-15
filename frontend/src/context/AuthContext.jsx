import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(() =>
        Boolean(localStorage.getItem("token"))
    );

    useEffect(() => {
        let activo = true;
        const token = localStorage.getItem("token");

        if (!token) {
            return undefined;
        }

        api.get("/auth/me")
            .then((res) => {
                if (activo) {
                    setUsuario(res.data.usuario);
                }
            })
            .catch(() => {
                localStorage.removeItem("token");

                if (activo) {
                    setUsuario(null);
                }
            })
            .finally(() => {
                if (activo) {
                    setCargando(false);
                }
            });

        return () => {
            activo = false;
        };
    }, []);

    const login = useCallback(async (email, password) => {
        const res = await api.post("/auth/login", { email, password });

        localStorage.setItem("token", res.data.token);
        setUsuario(res.data.usuario);

        return res.data.usuario;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem("token");
        setUsuario(null);
    }, []);

    const value = useMemo(() => ({
        usuario,
        cargando,
        autenticado: Boolean(usuario),
        login,
        logout
    }), [usuario, cargando, login, logout]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
