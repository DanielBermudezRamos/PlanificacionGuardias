import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import  styles  from './Layout.module.css';

function Layout() {
    const { usuario, logout } = useAuth();
    const navigate = useNavigate();

    const salir = () => {
        logout();
        navigate("/", { replace: true });
    };

    return (
        <div className={styles.principal}>
            <nav className={styles.navbar}>
                <div className={styles.navbarLinks}>
                    <strong>PERMED</strong>
                    <Link to="/inicio">Inicio</Link>
                    <Link to="/guardias">Guardias</Link>
                    <Link to="/publicaciones">Publicaciones</Link>
                    <Link to="/calendario">Calendario</Link>
                    <Link to="/nomina">Nómina</Link>
                    {(usuario?.rol === "admin" ||
                        usuario?.rol === "coordinador") && (
                        <>
                            <Link to="/pacientes">Pacientes</Link>
                            <Link to="/clinicas">Clínicas</Link>
                            <Link to="/trabajadores">Trabajadores</Link>
                        </>
                    )}
                    <Link to="/manual">Manual</Link>
                    {usuario?.rol === "admin" && (
                        <Link to="/manual-tecnico">Manual técnico</Link>
                    )}
                </div>

                <div className={styles.navbarLinks}>
                    <span className={styles.navbarUser}>
                        {usuario?.nombre} ({usuario?.rol})
                    </span>
                    <button type="button" onClick={salir}>
                        Salir
                    </button>
                </div>
            </nav>

            <main className={styles.main}>
                <Outlet />
            </main>
        </div>
    );
}

export default Layout;
