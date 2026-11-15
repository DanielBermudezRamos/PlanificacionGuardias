import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import common from "../styles/common.module.css";
import styles from "./Login.module.css";

function Login() {
    const { login, usuario, cargando } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        if (!cargando && usuario) {
            navigate("/inicio", { replace: true });
        }
    }, [cargando, usuario, navigate]);

    const ingresar = async (evento) => {
        evento.preventDefault();

        setError("");
        setEnviando(true);

        try {
            await login(email.trim(), password);
            navigate("/inicio", { replace: true });
        } catch (err) {
            setError(
                err.response?.data?.error || "No se pudo iniciar sesión"
            );
        } finally {
            setEnviando(false);
        }
    };

    if (cargando) {
        return <p style={{ padding: "24px", textAlign: "center" }}>Cargando...</p>;
    }

    return (
        <div className={common.page}>
            <form className={styles.authCard} onSubmit={ingresar}>
                <h2>Login PERMED</h2>

                <label htmlFor="email">Email</label>
                <input
                    id="email"
                    type="email"
                    placeholder="Email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <label htmlFor="password">Contraseña</label>
                <input
                    id="password"
                    type="password"
                    placeholder="Contraseña"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                {error && <p className={common.formError}>{error}</p>}

                <button type="submit" disabled={enviando}>
                    {enviando ? "Ingresando..." : "Ingresar"}
                </button>
            </form>
        </div>
    );
}

export default Login;
