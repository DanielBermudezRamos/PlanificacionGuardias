import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import ModalClinica from "../components/ModalClinica";
import common from "../styles/common.module.css";
import tabla from "../styles/tablaDatos.module.css";
import styles from "./Clinicas.module.css";

function Clinicas() {
    const [clinicas, setClinicas] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [estado, setEstado] = useState("1");
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [modalAbierto, setModalAbierto] = useState(false);
    const [editando, setEditando] = useState(null);

    const cargar = useCallback(() => {
        let activo = true;

        api.get("/clinicas")
            .then((res) => {
                if (activo) {
                    setClinicas(res.data);
                    setError("");
                }
            })
            .catch((err) => {
                if (activo) {
                    setError(
                        err.response?.data?.error ||
                        "No se pudieron cargar las clínicas"
                    );
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

    useEffect(() => {
        const cancelar = cargar();

        return cancelar;
    }, [cargar]);

    const visibles = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();

        return clinicas.filter((clinica) => {
            if (estado === "1" && !clinica.activa) {
                return false;
            }

            if (estado === "0" && clinica.activa) {
                return false;
            }

            if (!texto) {
                return true;
            }

            return [
                clinica.nombre,
                clinica.direccion,
                clinica.localidad,
                clinica.telefono,
                clinica.contacto,
                clinica.servicios
            ]
                .filter(Boolean)
                .some((valor) =>
                    String(valor).toLowerCase().includes(texto)
                );
        });
    }, [clinicas, busqueda, estado]);

    const abrirNuevo = () => {
        setEditando(null);
        setModalAbierto(true);
    };

    const abrirEdicion = (clinica) => {
        setEditando(clinica);
        setModalAbierto(true);
    };

    const alGuardar = (esEdicion) => {
        setError("");
        setMensaje(
            esEdicion ? "Clínica actualizada." : "Clínica creada."
        );
    };

    return (
        <div className={common.page}>
            <div className={styles.cabecera}>
                <div>
                    <h2>Clínicas</h2>
                    <p className={common.muted}>
                        Registrá las clínicas y residencias donde están
                        internados los pacientes.
                    </p>
                </div>

                <button
                    type="button"
                    className={common.btnPrimary}
                    onClick={abrirNuevo}
                >
                    Nueva clínica
                </button>
            </div>

            {mensaje && <p className={common.mensajeOk}>{mensaje}</p>}
            {error && <p className={common.formError}>{error}</p>}

            <div className={styles.filtros}>
                <label className={styles.campo}>
                    Buscar
                    <input
                        type="search"
                        value={busqueda}
                        placeholder="Nombre, dirección, localidad o contacto"
                        onChange={(evento) =>
                            setBusqueda(evento.target.value)
                        }
                    />
                </label>

                <label className={styles.campo}>
                    Estado
                    <select
                        value={estado}
                        onChange={(evento) =>
                            setEstado(evento.target.value)
                        }
                    >
                        <option value="1">Activas</option>
                        <option value="0">Inactivas</option>
                        <option value="">Todas</option>
                    </select>
                </label>

                <p className={styles.contador}>
                    {visibles.length} de {clinicas.length} clínicas
                </p>
            </div>

            {cargando && clinicas.length === 0 ? (
                <p>Cargando clínicas...</p>
            ) : clinicas.length === 0 ? (
                <div className={common.emptyState}>
                    <p>Todavía no hay clínicas cargadas.</p>
                    <p className={common.muted}>
                        Creá la primera con el botón{" "}
                        <strong>Nueva clínica</strong>.
                    </p>
                </div>
            ) : visibles.length === 0 ? (
                <div className={common.emptyState}>
                    <p>No hay clínicas que coincidan con los filtros.</p>
                </div>
            ) : (
                <div className={tabla.contenedor}>
                    <table>
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Dirección</th>
                                <th>Localidad</th>
                                <th>Teléfono</th>
                                <th>Contacto</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibles.map((clinica) => (
                                <tr key={clinica.id}>
                                    <td data-label="Nombre">
                                        {clinica.nombre}
                                    </td>
                                    <td data-label="Dirección">
                                        {clinica.direccion || "—"}
                                    </td>
                                    <td data-label="Localidad">
                                        {clinica.localidad || "—"}
                                    </td>
                                    <td data-label="Teléfono">
                                        {clinica.telefono || "—"}
                                    </td>
                                    <td data-label="Contacto">
                                        {clinica.contacto || "—"}
                                    </td>
                                    <td data-label="Estado">
                                        <span
                                            className={
                                                clinica.activa
                                                    ? styles.badgeActivo
                                                    : styles.badgeInactivo
                                            }
                                        >
                                            {clinica.activa
                                                ? "Activa"
                                                : "Inactiva"}
                                        </span>
                                    </td>
                                    <td data-label="Acciones">
                                        <div className={tabla.accionesFila}>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    abrirEdicion(clinica)
                                                }
                                            >
                                                Editar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {modalAbierto && (
                <ModalClinica
                    clinica={editando}
                    cerrar={() => setModalAbierto(false)}
                    recargar={cargar}
                    alGuardar={alGuardar}
                />
            )}
        </div>
    );
}

export default Clinicas;
