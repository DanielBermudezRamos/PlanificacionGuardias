import { useState } from "react";
import dayjs from "dayjs";
import api from "../services/api";
import common from "../styles/common.module.css";
import styles from "./ModalPublicacion.module.css";

function aInput(valor) {
    return valor ? dayjs(valor).format("YYYY-MM-DDTHH:mm") : "";
}

function ModalPublicacion({
    publicacion,
    pacientes,
    trabajadores,
    cerrar,
    recargar,
    alGuardar
}) {
    const editando = Boolean(publicacion?.id);

    const [pacienteId, setPacienteId] = useState(
        publicacion ? String(publicacion.paciente_id) : ""
    );
    const [direccion, setDireccion] = useState(publicacion?.direccion || "");
    const [patologia, setPatologia] = useState(publicacion?.patologia || "");
    const [inicio, setInicio] = useState(
        aInput(publicacion?.fecha_hora_entrada)
    );
    const [fin, setFin] = useState(aInput(publicacion?.fecha_hora_salida));
    const [precio, setPrecio] = useState(
        publicacion ? String(publicacion.precio) : "0"
    );
    const [paraTodos, setParaTodos] = useState(
        publicacion ? Boolean(publicacion.para_todos) : true
    );
    const [seleccionados, setSeleccionados] = useState(
        (publicacion?.destinatarios || []).map((item) => item.id)
    );
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);

    const cambiarPaciente = (evento) => {
        const valor = evento.target.value;
        const paciente = pacientes.find(
            (item) => String(item.id) === valor
        );

        setPacienteId(valor);

        if (paciente) {
            setDireccion(paciente.direccion || "");
            setPatologia(paciente.patologia || "");
        }
    };

    const alternarPrestador = (trabajadorId) => {
        setSeleccionados((previos) =>
            previos.includes(trabajadorId)
                ? previos.filter((id) => id !== trabajadorId)
                : [...previos, trabajadorId]
        );
    };

    const guardar = async (evento) => {
        evento.preventDefault();
        setError("");

        if (!pacienteId) {
            setError("Elegí un paciente.");
            return;
        }

        if (!inicio || !fin) {
            setError("Completá el inicio y el fin.");
            return;
        }

        if (!dayjs(fin).isAfter(dayjs(inicio))) {
            setError("El fin debe ser posterior al inicio.");
            return;
        }

        if (precio === "" || Number(precio) < 0 || !Number.isFinite(Number(precio))) {
            setError("El precio debe ser un número mayor o igual a 0.");
            return;
        }

        if (!paraTodos && seleccionados.length === 0) {
            setError("Elegí al menos un prestador o la opción Todos.");
            return;
        }

        setGuardando(true);

        try {
            const cuerpo = {
                paciente_id: Number(pacienteId),
                direccion: direccion.trim() || null,
                patologia: patologia.trim() || null,
                fecha_hora_entrada: dayjs(inicio).format(
                    "YYYY-MM-DD HH:mm:ss"
                ),
                fecha_hora_salida: dayjs(fin).format("YYYY-MM-DD HH:mm:ss"),
                precio: Number(precio),
                para_todos: paraTodos,
                trabajadores: paraTodos ? [] : seleccionados
            };

            if (editando) {
                await api.put(`/publicaciones/${publicacion.id}`, cuerpo);
            } else {
                await api.post("/publicaciones", cuerpo);
            }

            recargar();
            alGuardar?.(editando);
            cerrar();
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "No se pudo guardar la publicación"
            );
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div
            className={common.modalBackdrop}
            role="presentation"
            onClick={(evento) => {
                if (evento.target === evento.currentTarget && !guardando) {
                    cerrar();
                }
            }}
        >
            <div
                className={`${common.modalCard} ${common.modalCardSm}`}
                role="dialog"
                aria-modal="true"
            >
                <h3>
                    {editando ? "Editar publicación" : "Nueva publicación"}
                </h3>

                <p className={common.muted}>
                    Publicá las características de la guardia y elegí quiénes
                    pueden verla.
                </p>

                <form onSubmit={guardar}>
                    <label className={common.field}>
                        Paciente
                        <select
                            value={pacienteId}
                            onChange={cambiarPaciente}
                            required
                        >
                            <option value="">Seleccionar paciente</option>
                            {pacientes.map((paciente) => (
                                <option key={paciente.id} value={paciente.id}>
                                    {paciente.nombre}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className={common.field}>
                        Dirección
                        <input
                            type="text"
                            value={direccion}
                            maxLength={200}
                            placeholder="Calle, número, localidad"
                            onChange={(evento) =>
                                setDireccion(evento.target.value)
                            }
                        />
                    </label>

                    <label className={common.field}>
                        Patología
                        <textarea
                            value={patologia}
                            rows={2}
                            maxLength={5000}
                            placeholder="Diagnóstico o cuidados requeridos"
                            onChange={(evento) =>
                                setPatologia(evento.target.value)
                            }
                        />
                    </label>

                    <div className={styles.fila}>
                        <label className={common.field}>
                            Inicio
                            <input
                                type="datetime-local"
                                value={inicio}
                                onChange={(evento) =>
                                    setInicio(evento.target.value)
                                }
                                required
                            />
                        </label>

                        <label className={common.field}>
                            Fin
                            <input
                                type="datetime-local"
                                value={fin}
                                onChange={(evento) =>
                                    setFin(evento.target.value)
                                }
                                required
                            />
                        </label>
                    </div>

                    <label className={common.field}>
                        Precio de la guardia
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={precio}
                            onChange={(evento) =>
                                setPrecio(evento.target.value)
                            }
                            required
                        />
                    </label>

                    <fieldset className={styles.destino}>
                        <legend>¿Quiénes pueden verla?</legend>

                        <label className={styles.opcion}>
                            <input
                                type="radio"
                                name="alcance"
                                checked={paraTodos}
                                onChange={() => setParaTodos(true)}
                            />
                            Todos los prestadores
                        </label>

                        <label className={styles.opcion}>
                            <input
                                type="radio"
                                name="alcance"
                                checked={!paraTodos}
                                onChange={() => setParaTodos(false)}
                            />
                            Solo los prestadores seleccionados
                        </label>

                        {!paraTodos && (
                            <div className={styles.listaPrestadores}>
                                {trabajadores.length === 0 ? (
                                    <p className={common.muted}>
                                        No hay prestadores cargados.
                                    </p>
                                ) : (
                                    trabajadores.map((trabajador) => (
                                        <label
                                            key={trabajador.id}
                                            className={styles.opcion}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={seleccionados.includes(
                                                    trabajador.id
                                                )}
                                                onChange={() =>
                                                    alternarPrestador(
                                                        trabajador.id
                                                    )
                                                }
                                            />
                                            {trabajador.nombre}
                                        </label>
                                    ))
                                )}
                            </div>
                        )}
                    </fieldset>

                    {error && <p className={common.formError}>{error}</p>}

                    <div className={common.modalActions}>
                        <button
                            type="submit"
                            className={common.btnPrimary}
                            disabled={guardando}
                        >
                            {guardando
                                ? "Guardando..."
                                : editando
                                    ? "Guardar cambios"
                                    : "Publicar guardia"}
                        </button>
                        <button
                            type="button"
                            onClick={cerrar}
                            disabled={guardando}
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ModalPublicacion;
