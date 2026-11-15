import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import ModalAsistencia from "../components/ModalAsistencia";
import ModalHorario from "../components/ModalHorario";
import common from "../styles/common.module.css";
import styles from "./Guardias.module.css";

const etiquetasEstado = {
    pendiente: "Pendiente",
    en_curso: "En curso",
    finalizada: "Finalizada"
};

const filtrosIniciales = {
    desde: "",
    hasta: "",
    paciente_id: "",
    trabajador_id: "",
    estado: ""
};

function formatearFecha(valor) {
    return valor ? dayjs(valor).format("DD/MM/YYYY HH:mm") : "—";
}

function formatearHoras(valor) {
    return valor === null || valor === undefined ? "—" : `${valor} h`;
}

function Guardias() {
    const { usuario } = useAuth();
    const puedeCorregir = usuario?.rol === "admin" ||
        usuario?.rol === "coordinador";
    const puedeFiltrarPrestador = usuario?.rol !== "prestador";

    const [guardias, setGuardias] = useState([]);
    const [pacientes, setPacientes] = useState([]);
    const [trabajadores, setTrabajadores] = useState([]);
    const [filtros, setFiltros] = useState(filtrosIniciales);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [editando, setEditando] = useState(null);
    const [editandoHorario, setEditandoHorario] = useState(null);

    const cargar = useCallback(() => {
        let activo = true;

        const params = {};

        if (filtros.desde) {
            params.desde = filtros.desde;
        }

        if (filtros.hasta) {
            params.hasta = filtros.hasta;
        }

        if (filtros.paciente_id) {
            params.paciente_id = filtros.paciente_id;
        }

        if (puedeFiltrarPrestador && filtros.trabajador_id) {
            params.trabajador_id = filtros.trabajador_id;
        }

        if (filtros.estado) {
            params.estado = filtros.estado;
        }

        api.get("/guardias", { params })
            .then((res) => {
                if (activo) {
                    setGuardias(res.data);
                    setError("");
                }
            })
            .catch((err) => {
                if (activo) {
                    setError(
                        err.response?.data?.error ||
                        "No se pudieron cargar las guardias"
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
    }, [filtros, puedeFiltrarPrestador]);

    useEffect(() => {
        const cancelar = cargar();

        return cancelar;
    }, [cargar]);

    useEffect(() => {
        let activo = true;

        Promise.all([api.get("/pacientes"), api.get("/trabajadores")])
            .then(([resPacientes, resTrabajadores]) => {
                if (activo) {
                    setPacientes(resPacientes.data);
                    setTrabajadores(resTrabajadores.data);
                }
            })
            .catch(() => {
                // Si falla un catálogo, los filtros de fecha y estado siguen
                // funcionando igual.
            });

        return () => {
            activo = false;
        };
    }, []);

    const resumen = useMemo(() => {
        const finalizadas = guardias.filter(
            (guardia) => guardia.estado === "finalizada"
        );

        const horas = finalizadas.reduce(
            (total, guardia) => total + Number(guardia.horas_reales || 0),
            0
        );

        const extras = finalizadas.reduce(
            (total, guardia) =>
                total + Math.max(0, Number(guardia.diferencia_horas || 0)),
            0
        );

        const faltantes = finalizadas.reduce(
            (total, guardia) =>
                total + Math.min(0, Number(guardia.diferencia_horas || 0)),
            0
        );

        return {
            total: guardias.length,
            finalizadas: finalizadas.length,
            horas,
            extras,
            faltantes: Math.abs(faltantes)
        };
    }, [guardias]);

    const hayFiltros = Object.values(filtros).some(Boolean);

    const cambiarFiltro = (campo, valor) => {
        setCargando(true);
        setFiltros((previos) => ({ ...previos, [campo]: valor }));
    };

    const limpiarFiltros = () => {
        setCargando(true);
        setFiltros(filtrosIniciales);
    };

    const alGuardar = () => {
        setError("");
        setMensaje("Asistencia corregida y registrada en la auditoría.");
    };

    const alGuardarHorario = () => {
        setError("");
        setMensaje("Horario de la guardia actualizado.");
    };

    if (cargando && guardias.length === 0 && !hayFiltros) {
        return (
            <div className={common.page}>
                <p>Cargando guardias...</p>
            </div>
        );
    }

    return (
        <div className={common.page}>
            <h2>Guardias</h2>

            {mensaje && <p className={common.mensajeOk}>{mensaje}</p>}

            <div className={styles.filtros}>
                <label className={styles.campo}>
                    Desde
                    <input
                        type="date"
                        value={filtros.desde}
                        max={filtros.hasta || undefined}
                        onChange={(evento) =>
                            cambiarFiltro("desde", evento.target.value)
                        }
                    />
                </label>

                <label className={styles.campo}>
                    Hasta
                    <input
                        type="date"
                        value={filtros.hasta}
                        min={filtros.desde || undefined}
                        onChange={(evento) =>
                            cambiarFiltro("hasta", evento.target.value)
                        }
                    />
                </label>

                <label className={styles.campo}>
                    Paciente
                    <select
                        value={filtros.paciente_id}
                        onChange={(evento) =>
                            cambiarFiltro("paciente_id", evento.target.value)
                        }
                    >
                        <option value="">Todos</option>
                        {pacientes.map((paciente) => (
                            <option key={paciente.id} value={paciente.id}>
                                {paciente.nombre}
                            </option>
                        ))}
                    </select>
                </label>

                {puedeFiltrarPrestador && (
                    <label className={styles.campo}>
                        Prestador
                        <select
                            value={filtros.trabajador_id}
                            onChange={(evento) =>
                                cambiarFiltro(
                                    "trabajador_id",
                                    evento.target.value
                                )
                            }
                        >
                            <option value="">Todos</option>
                            {trabajadores.map((trabajador) => (
                                <option
                                    key={trabajador.id}
                                    value={trabajador.id}
                                >
                                    {trabajador.nombre}
                                </option>
                            ))}
                        </select>
                    </label>
                )}

                <label className={styles.campo}>
                    Estado
                    <select
                        value={filtros.estado}
                        onChange={(evento) =>
                            cambiarFiltro("estado", evento.target.value)
                        }
                    >
                        <option value="">Todos</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="en_curso">En curso</option>
                        <option value="finalizada">Finalizada</option>
                    </select>
                </label>

                <div className={styles.acciones}>
                    <button
                        type="button"
                        onClick={limpiarFiltros}
                        disabled={!hayFiltros}
                    >
                        Limpiar filtros
                    </button>
                </div>
            </div>

            {error && <p className={common.formError}>{error}</p>}

            <div className={styles.resumen}>
                <span>
                    <strong>{resumen.total}</strong>{" "}
                    {resumen.total === 1 ? "guardia" : "guardias"}
                </span>
                <span>
                    <strong>{resumen.finalizadas}</strong> finalizadas
                </span>
                <span>
                    <strong>{resumen.horas.toFixed(2)} h</strong> trabajadas
                </span>
                <span className={styles.extras}>
                    {resumen.extras.toFixed(2)} h extras
                </span>
                <span className={styles.faltantes}>
                    {resumen.faltantes.toFixed(2)} h faltantes
                </span>
            </div>

            {guardias.length === 0 ? (
                <p>
                    {hayFiltros
                        ? "No hay guardias que coincidan con los filtros."
                        : "No hay guardias para mostrar."}
                </p>
            ) : (
                <div className={styles.tablaContenedor}>
                    <table>
                        <thead>
                            <tr>
                                <th>Paciente</th>
                                <th>Prestador</th>
                                <th>Entrada programada</th>
                                <th>Salida programada</th>
                                <th>Entrada real</th>
                                <th>Salida real</th>
                                <th>Horas</th>
                                <th>Estado</th>
                                {puedeCorregir && <th>Acciones</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {guardias.map((guardia) => (
                                <tr key={guardia.id}>
                                    <td data-label="Paciente">
                                        {guardia.paciente}
                                    </td>
                                    <td data-label="Prestador">
                                        {guardia.prestador}
                                    </td>
                                    <td data-label="Entrada programada">
                                        {formatearFecha(
                                            guardia.fecha_hora_entrada
                                        )}
                                    </td>
                                    <td data-label="Salida programada">
                                        {formatearFecha(
                                            guardia.fecha_hora_salida
                                        )}
                                    </td>
                                    <td data-label="Entrada real">
                                        {formatearFecha(
                                            guardia.fecha_hora_entrada_real
                                        )}
                                    </td>
                                    <td data-label="Salida real">
                                        {formatearFecha(
                                            guardia.fecha_hora_salida_real
                                        )}
                                    </td>
                                    <td data-label="Horas">
                                        {formatearHoras(guardia.horas_reales)}
                                    </td>
                                    <td data-label="Estado">
                                        {etiquetasEstado[guardia.estado] ||
                                            guardia.estado}
                                    </td>
                                    {puedeCorregir && (
                                        <td
                                            className={styles.accionesFila}
                                            data-label="Acciones"
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setEditandoHorario(guardia)
                                                }
                                                disabled={Boolean(
                                                    guardia.fecha_hora_entrada_real
                                                )}
                                                title={
                                                    guardia.fecha_hora_entrada_real
                                                        ? "No se puede cambiar el horario de una guardia iniciada"
                                                        : "Editar el inicio y el fin programados"
                                                }
                                            >
                                                Editar horario
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setEditando(guardia)
                                                }
                                                disabled={
                                                    !guardia.fecha_hora_entrada_real ||
                                                    !guardia.fecha_hora_salida_real
                                                }
                                                title={
                                                    !guardia.fecha_hora_entrada_real ||
                                                    !guardia.fecha_hora_salida_real
                                                        ? "Solo se corrigen guardias con entrada y salida registradas"
                                                        : "Corregir entrada y salida reales"
                                                }
                                            >
                                                Corregir
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {editando && puedeCorregir && (
                <ModalAsistencia
                    guardia={editando}
                    cerrar={() => setEditando(null)}
                    recargar={cargar}
                    alGuardar={alGuardar}
                />
            )}

            {editandoHorario && puedeCorregir && (
                <ModalHorario
                    guardia={editandoHorario}
                    cerrar={() => setEditandoHorario(null)}
                    recargar={cargar}
                    alGuardar={alGuardarHorario}
                />
            )}
        </div>
    );
}

export default Guardias;
