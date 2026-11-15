import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import ModalTrabajador from "../components/ModalTrabajador";
import common from "../styles/common.module.css";
import tabla from "../styles/tablaDatos.module.css";
import styles from "./Trabajadores.module.css";
import {
    formatearCbu,
    formatearCuit,
    formatearDni,
    formatearTelefono
} from "../utils/formato";

function Trabajadores() {
    const [trabajadores, setTrabajadores] = useState([]);
    const [cargos, setCargos] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [cargoId, setCargoId] = useState("");
    const [estado, setEstado] = useState("");
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [modalAbierto, setModalAbierto] = useState(false);
    const [editando, setEditando] = useState(null);

    const cargar = useCallback(() => {
        let activo = true;

        api.get("/trabajadores")
            .then((res) => {
                if (activo) {
                    setTrabajadores(res.data);
                    setError("");
                }
            })
            .catch((err) => {
                if (activo) {
                    setError(
                        err.response?.data?.error ||
                        "No se pudieron cargar los trabajadores"
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

    useEffect(() => {
        let activo = true;

        api.get("/cargos")
            .then((res) => {
                if (activo) {
                    setCargos(res.data);
                }
            })
            .catch(() => {
                if (activo) {
                    setCargos([]);
                }
            });

        return () => {
            activo = false;
        };
    }, []);

    const visibles = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();

        return trabajadores.filter((trabajador) => {
            if (cargoId && String(trabajador.cargo_id) !== cargoId) {
                return false;
            }

            if (estado === "1" && !trabajador.activo) {
                return false;
            }

            if (estado === "0" && trabajador.activo) {
                return false;
            }

            if (!texto) {
                return true;
            }

            return [trabajador.nombre, trabajador.dni, trabajador.cuit,
                trabajador.cbu, trabajador.cargo, trabajador.telefono,
                trabajador.telefono_alternativo]
                .filter(Boolean)
                .some((valor) => String(valor).toLowerCase().includes(texto));
        });
    }, [trabajadores, busqueda, cargoId, estado]);

    const abrirNuevo = () => {
        setEditando(null);
        setModalAbierto(true);
    };

    const abrirEdicion = (trabajador) => {
        setEditando(trabajador);
        setModalAbierto(true);
    };

    const alGuardar = (esEdicion) => {
        setError("");
        setMensaje(
            esEdicion
                ? "Trabajador actualizado."
                : "Trabajador creado."
        );
    };

    return (
        <div className={common.page}>
            <div className={styles.cabecera}>
                <div>
                    <h2>Trabajadores</h2>
                    <p className={common.muted}>
                        Consultá y editá los datos del personal, su documento,
                        cargo, CBU/CVU y estado.
                    </p>
                </div>

                <button
                    type="button"
                    className={common.btnPrimary}
                    onClick={abrirNuevo}
                    disabled={cargos.length === 0}
                >
                    Nuevo trabajador
                </button>
            </div>

            {mensaje && <p className={common.mensajeOk}>{mensaje}</p>}
            {error && <p className={common.formError}>{error}</p>}
            {cargos.length === 0 && (
                <p className={common.formError}>
                    No se pudieron cargar los cargos: no se puede crear ni
                    editar trabajadores.
                </p>
            )}

            <div className={styles.filtros}>
                <label className={styles.campo}>
                    Buscar
                    <input
                        type="search"
                        value={busqueda}
                        placeholder="Nombre, DNI, CUIT, CBU o teléfono"
                        onChange={(evento) =>
                            setBusqueda(evento.target.value)
                        }
                    />
                </label>

                <label className={styles.campo}>
                    Cargo
                    <select
                        value={cargoId}
                        onChange={(evento) =>
                            setCargoId(evento.target.value)
                        }
                    >
                        <option value="">Todos los cargos</option>
                        {cargos.map((cargo) => (
                            <option key={cargo.id} value={cargo.id}>
                                {cargo.nombre}
                            </option>
                        ))}
                    </select>
                </label>

                <label className={styles.campo}>
                    Estado
                    <select
                        value={estado}
                        onChange={(evento) =>
                            setEstado(evento.target.value)
                        }
                    >
                        <option value="">Todos</option>
                        <option value="1">Activos</option>
                        <option value="0">Inactivos</option>
                    </select>
                </label>

                <p className={styles.contador}>
                    {visibles.length} de {trabajadores.length} trabajadores
                </p>
            </div>

            {cargando && trabajadores.length === 0 ? (
                <p>Cargando trabajadores...</p>
            ) : trabajadores.length === 0 ? (
                <div className={common.emptyState}>
                    <p>Todavía no hay trabajadores cargados.</p>
                    <p className={common.muted}>
                        Creá el primero con el botón{" "}
                        <strong>Nuevo trabajador</strong>.
                    </p>
                </div>
            ) : visibles.length === 0 ? (
                <div className={common.emptyState}>
                    <p>No hay trabajadores que coincidan con los filtros.</p>
                </div>
            ) : (
                <div className={tabla.contenedor}>
                    <table>
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Documento</th>
                                <th>CBU / CVU</th>
                                <th>Cargo</th>
                                <th>Teléfonos</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibles.map((trabajador) => (
                                <tr key={trabajador.id}>
                                    <td data-label="Nombre">
                                        {trabajador.nombre}
                                    </td>
                                    <td data-label="Documento">
                                        <div>
                                            {trabajador.dni
                                                ? `DNI ${formatearDni(trabajador.dni)}`
                                                : "—"}
                                        </div>
                                        {trabajador.cuit && (
                                            <div>
                                                {`CUIT ${formatearCuit(trabajador.cuit)}`}
                                            </div>
                                        )}
                                    </td>
                                    <td data-label="CBU / CVU">
                                        {trabajador.cbu
                                            ? formatearCbu(trabajador.cbu)
                                            : "—"}
                                    </td>
                                    <td data-label="Cargo">
                                        {trabajador.cargo}
                                    </td>
                                    <td data-label="Teléfonos">
                                        {trabajador.telefono
                                            ? formatearTelefono(trabajador.telefono)
                                            : "—"}
                                        {trabajador.telefono_alternativo
                                            ? ` / ${formatearTelefono(trabajador.telefono_alternativo)}`
                                            : ""}
                                    </td>
                                    <td data-label="Estado">
                                        <span
                                            className={
                                                trabajador.activo
                                                    ? styles.badgeActivo
                                                    : styles.badgeInactivo
                                            }
                                        >
                                            {trabajador.activo
                                                ? "Activo"
                                                : "Inactivo"}
                                        </span>
                                    </td>
                                    <td data-label="Acciones">
                                        <div className={tabla.accionesFila}>
                                            <button
                                                type="button"
                                                disabled={cargos.length === 0}
                                                onClick={() =>
                                                    abrirEdicion(trabajador)
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
                <ModalTrabajador
                    trabajador={editando}
                    cargos={cargos}
                    cerrar={() => setModalAbierto(false)}
                    recargar={cargar}
                    alGuardar={alGuardar}
                />
            )}
        </div>
    );
}

export default Trabajadores;
