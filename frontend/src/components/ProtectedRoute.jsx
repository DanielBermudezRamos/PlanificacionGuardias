import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/useAuth";

function ProtectedRoute({ roles }) {
    const { usuario, cargando } = useAuth();

    if (cargando) {
        return <p style={{ padding: "24px", textAlign: "center" }}>Cargando...</p>;
    }

    if (!usuario) {
        return <Navigate to="/" replace />;
    }

    if (roles && !roles.includes(usuario.rol)) {
        return <Navigate to="/inicio" replace />;
    }

    return <Outlet />;
}

export default ProtectedRoute;
