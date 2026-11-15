import { useState } from "react";
import dayjs from "dayjs";
import api from "../services/api";
import common from "../styles/common.module.css";

function aInput(valor) {
    return valor ? dayjs(valor).format("YYYY-MM-DDTHH:mm") : "";
}

function ModalGuardia({ info, cerrar, pacientes, recargar }) {
    const [paciente, setPaciente] = useState("");
    const [trabajador, setTrabajador] = useState("");
    const [trabajadoresFiltrados, setTrabajadoresFiltrados] = useState([]);
    const [inicio, setInicio] = useState(aInput(info.startStr));
    const [fin, setFin] = useState(aInput(info.endStr));
    const [conflicto, setConflicto] = useState(false);
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);

    const rangoValido = Boolean(
        inicio && fin && dayjs(fin).isAfter(dayjs(inicio))
    );

    const verificarConflicto = async (trabajadorId, entrada, salida) => {
        if (
            !trabajadorId ||
            !entrada ||
            !salida ||
            !dayjs(salida).isAfter(dayjs(entrada))
        ) {
            setConflicto(false);
            return;
        }

        try {
            const res = await api.get("/guardias/verificar-conflicto", {
                params: {
                    trabajador_id: trabajadorId,
                    fecha_hora_entrada: dayjs(entrada).format(
                        "YYYY-MM-DD HH:mm:ss"
                    ),
                    fecha_hora_salida: dayjs(salida).format(
                        "YYYY-MM-DD HH:mm:ss"
                    )
                }
            });

            setConflicto(Boolean(res.data.conflicto));
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "No se pudo verificar el conflicto de horario"
            );
        }
    };

    const seleccionarPaciente = async (evento) => {
        const pacienteId = evento.target.value;

        setPaciente(pacienteId);
        setTrabajador("");
        setConflicto(false);
        setError("");
        setTrabajadoresFiltrados([]);

        if (!pacienteId) {
            return;
        }

        try {
            const res = await api.get("/asignaciones/trabajadores", {
                params: { paciente_id: pacienteId }
            });

            setTrabajadoresFiltrados(res.data);
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "No se pudieron cargar los prestadores"
            );
        }
    };

    const seleccionarTrabajador = (evento) => {
        const trabajadorId = evento.target.value;

        setTrabajador(trabajadorId);
        setConflicto(false);
        setError("");
        verificarConflicto(trabajadorId, inicio, fin);
    };

    const cambiarInicio = (valor) => {
        setInicio(valor);
        setError("");
        verificarConflicto(trabajador, valor, fin);
    };

    const cambiarFin = (valor) => {
        setFin(valor);
        setError("");
        verificarConflicto(trabajador, inicio, valor);
    };

    const guardar = async () => {
        if (!paciente || !trabajador || conflicto || !rangoValido) {
            return;
        }

        setGuardando(true);
        setError("");

        try {
            const asignacion = await api.post("/asignaciones/buscar-o-crear", {
                paciente_id: paciente,
                trabajador_id: trabajador
            });

            await api.post("/guardias", {
                asignacion_id: asignacion.data.id,
                fecha_hora_entrada: dayjs(inicio).format(
                    "YYYY-MM-DD HH:mm:ss"
                ),
                fecha_hora_salida: dayjs(fin).format("YYYY-MM-DD HH:mm:ss")
            });

            recargar();
            cerrar();
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "No se pudo guardar la guardia"
            );
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className={common.modalBackdrop} role="presentation">
            <div
                className={`${common.modalCard} ${common.modalCardSm}`}
                role="dialog"
                aria-modal="true"
            >
                <h3>Nueva Guardia</h3>

                <label className={common.field}>
                    Inicio
                    <input
                        type="datetime-local"
                        value={inicio}
                        onChange={(evento) =>
                            cambiarInicio(evento.target.value)
                        }
                        required
                    />
                </label>

                <label className={common.field}>
                    Fin
                    <input
                        type="datetime-local"
                        value={fin}
                        onChange={(evento) => cambiarFin(evento.target.value)}
                        required
                    />
                </label>

                {inicio && fin && !rangoValido && (
                    <p className={common.formError}>
                        El fin debe ser posterior al inicio.
                    </p>
                )}

                <label className={common.field}>
                    Paciente
                    <select value={paciente} onChange={seleccionarPaciente}>
                        <option value="">Seleccionar paciente</option>
                        {pacientes.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.nombre}
                            </option>
                        ))}
                    </select>
                </label>

                <label className={common.field}>
                    Prestador
                    <select
                        value={trabajador}
                        disabled={!paciente}
                        onChange={seleccionarTrabajador}
                    >
                        <option value="">Seleccionar prestador</option>

                        <optgroup label="Asignados al paciente">
                            {trabajadoresFiltrados
                                .filter((p) => p.tipo === "asignado")
                                .map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.nombre}
                                    </option>
                                ))}
                        </optgroup>

                        <optgroup label="Otros disponibles">
                            {trabajadoresFiltrados
                                .filter((p) => p.tipo === "disponible")
                                .map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.nombre}
                                    </option>
                                ))}
                        </optgroup>
                    </select>
                </label>

                {conflicto && (
                    <p className={common.formError}>
                        ⚠️ Este prestador ya tiene una guardia en ese horario
                    </p>
                )}

                {error && <p className={common.formError}>{error}</p>}

                <div className={common.modalActions}>
                    <button
                        type="button"
                        className={common.btnPrimary}
                        onClick={guardar}
                        disabled={
                            !paciente ||
                            !trabajador ||
                            conflicto ||
                            !rangoValido ||
                            guardando
                        }
                    >
                        {guardando ? "Guardando..." : "Guardar"}
                    </button>
                    <button type="button" onClick={cerrar} disabled={guardando}>
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ModalGuardia;
