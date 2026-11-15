import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import ModalPaciente from "../components/ModalPaciente";
import common from "../styles/common.module.css";
import tabla from "../styles/tablaDatos.module.css";
import styles from "./Pacientes.module.css";

function Pacientes() {
    const [pacientes, setPacientes] = useState([]);
    const [clinicas, setClinicas] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [estado, setEstado] = useState("1");
    const [clinicaId, setClinicaId] = useState("");
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [modalAbierto, setModalAbierto] = useState(false);
    const [editando, setEditando] = useState(null);

    const cargar = useCallback(() => {
        let activo = true;

        Promise.all([
            api.get("/pacientes?incluir_inactivos=1"),
            api.get("/clinicas").catch(() => ({ data: [] }))
        ])
            .then(([resPacientes, resClinicas]) => {
                if (activo) {
                    setPacientes(resPacientes.data);
                    setClinicas(resClinicas.data);
                    setError("");
                }
            })
            .catch((err) => {
                if (activo) {
                    setError(
                        err.response?.data?.error ||
                        "No se pudieron cargar los pacientes"
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

        return pacientes.filter((paciente) => {
            if (estado === "1" && !paciente.activo) {
                return false;
            }

            if (estado === "0" && paciente.activo) {
                return false;
            }

            if (clinicaId && String(paciente.clinica_id) !== clinicaId) {
                return false;
            }

            if (!texto) {
                return true;
            }

            return [
                paciente.nombre,
                paciente.edad,
                paciente.direccion,
                paciente.localidad,
                paciente.telefono_propio,
                paciente.familiar_responsable,
                paciente.patologia,
                paciente.tipo_servicio,
                paciente.modalidad,
                paciente.dias_prestacion,
                paciente.clinica_nombre,
                paciente.motivo_baja,
                paciente.codigo_padron
            ]
                .filter(Boolean)
                .some((valor) =>
                    String(valor).toLowerCase().includes(texto)
                );
        });
    }, [pacientes, busqueda, estado, clinicaId]);

    const abrirNuevo = () => {
        setEditando(null);
        setModalAbierto(true);
    };

    const abrirEdicion = (paciente) => {
        setEditando(paciente);
        setModalAbierto(true);
    };

    const alGuardar = (esEdicion) => {
        setError("");
        setMensaje(
            esEdicion ? "Paciente actualizado." : "Paciente creado."
        );
    };

    return (
        <div className={common.page}>
            <div className={styles.cabecera}>
                <div>
                    <h2>Pacientes</h2>
                    <p className={common.muted}>
                        Consultá y editá los datos de los pacientes, su
                        prestación, internación y ubicación GPS.
                    </p>
                </div>

                <button
                    type="button"
                    className={common.btnPrimary}
                    onClick={abrirNuevo}
                >
                    Nuevo paciente
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
                        placeholder="Nombre, dirección, localidad, clínica..."
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
                        <option value="1">Activos</option>
                        <option value="0">Inactivos</option>
                        <option value="">Todos</option>
                    </select>
                </label>

                <label className={styles.campo}>
                    Clínica
                    <select
                        value={clinicaId}
                        onChange={(evento) =>
                            setClinicaId(evento.target.value)
                        }
                    >
                        <option value="">Todas las clínicas</option>
                        {clinicas.map((clinica) => (
                            <option key={clinica.id} value={clinica.id}>
                                {clinica.nombre}
                                {clinica.activa ? "" : " (inactiva)"}
                            </option>
                        ))}
                    </select>
                </label>

                <p className={styles.contador}>
                    {visibles.length} de {pacientes.length} pacientes
                </p>
            </div>

            {cargando && pacientes.length === 0 ? (
                <p>Cargando pacientes...</p>
            ) : pacientes.length === 0 ? (
                <div className={common.emptyState}>
                    <p>Todavía no hay pacientes cargados.</p>
                    <p className={common.muted}>
                        Creá el primero con el botón{" "}
                        <strong>Nuevo paciente</strong>.
                    </p>
                </div>
            ) : visibles.length === 0 ? (
                <div className={common.emptyState}>
                    <p>No hay pacientes que coincidan con los filtros.</p>
                </div>
            ) : (
                <div className={tabla.contenedor}>
                    <table>
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Edad</th>
                                <th>Localidad</th>
                                <th>Servicio</th>
                                <th>Clínica</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibles.map((paciente) => (
                                <tr key={paciente.id}>
                                    <td data-label="Nombre">
                                        {paciente.nombre}
                                    </td>
                                    <td data-label="Edad">
                                        {paciente.edad ?? "—"}
                                    </td>
                                    <td data-label="Localidad">
                                        {paciente.localidad || "—"}
                                    </td>
                                    <td data-label="Servicio">
                                        {paciente.tipo_servicio || "—"}
                                    </td>
                                    <td data-label="Clínica">
                                        {paciente.clinica_nombre
                                            ? `${paciente.clinica_nombre}${
                                                paciente.clinica_activa
                                                    ? ""
                                                    : " (inactiva)"
                                            }`
                                            : "—"}
                                    </td>
                                    <td data-label="Estado">
                                        <span
                                            className={
                                                paciente.activo
                                                    ? styles.badgeActivo
                                                    : styles.badgeInactivo
                                            }
                                        >
                                            {paciente.activo
                                                ? "Activo"
                                                : "Inactivo"}
                                        </span>
                                    </td>
                                    <td data-label="Acciones">
                                        <div className={tabla.accionesFila}>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    abrirEdicion(paciente)
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
                <ModalPaciente
                    paciente={editando}
                    clinicas={clinicas}
                    cerrar={() => setModalAbierto(false)}
                    recargar={cargar}
                    alGuardar={alGuardar}
                />
            )}
        </div>
    );
}

export default Pacientes;
