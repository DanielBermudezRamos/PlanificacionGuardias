import { useEffect, useState } from "react";
import dayjs from "dayjs";
import api from "../services/api";
import common from "../styles/common.module.css";
import styles from "./ModalAsistencia.module.css";

function aInput(valor) {
    return valor ? dayjs(valor).format("YYYY-MM-DDTHH:mm") : "";
}

function formatearFechaHora(valor) {
    return valor ? dayjs(valor).format("DD/MM/YYYY HH:mm") : "—";
}

function formatearDiferencia(valor) {
    if (valor === null || valor === undefined) {
        return "—";
    }

    const numero = Number(valor);

    return `${numero > 0 ? "+" : ""}${numero.toFixed(2)} h`;
}

function ModalAsistencia({ guardia, cerrar, recargar, alGuardar }) {
    const [entrada, setEntrada] = useState(
        aInput(guardia.fecha_hora_entrada_real)
    );
    const [salida, setSalida] = useState(
        aInput(guardia.fecha_hora_salida_real)
    );
    const [motivo, setMotivo] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [auditoria, setAuditoria] = useState([]);
    const [cargandoAuditoria, setCargandoAuditoria] = useState(true);

    useEffect(() => {
        let activo = true;

        api.get(`/asistencia/${guardia.id}/auditoria`)
            .then((res) => {
                if (activo) {
                    setAuditoria(res.data);
                }
            })
            .catch(() => {
                if (activo) {
                    setAuditoria([]);
                }
            })
            .finally(() => {
                if (activo) {
                    setCargandoAuditoria(false);
                }
            });

        return () => {
            activo = false;
        };
    }, [guardia.id]);

    const guardar = async (evento) => {
        evento.preventDefault();
        setError("");

        if (!entrada || !salida) {
            setError("Completá la entrada y la salida reales.");
            return;
        }

        if (!dayjs(salida).isAfter(dayjs(entrada))) {
            setError("La salida debe ser posterior a la entrada.");
            return;
        }

        if (motivo.trim().length < 5) {
            setError("Indicá un motivo de al menos 5 caracteres.");
            return;
        }

        setGuardando(true);

        try {
            await api.put(`/asistencia/${guardia.id}`, {
                fecha_hora_entrada_real: dayjs(entrada)
                    .format("YYYY-MM-DD HH:mm:ss"),
                fecha_hora_salida_real: dayjs(salida)
                    .format("YYYY-MM-DD HH:mm:ss"),
                motivo: motivo.trim()
            });

            recargar();
            alGuardar?.();
            cerrar();
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "No se pudo guardar la corrección"
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
            <div className={common.modalCard} role="dialog" aria-modal="true">
                <h3>Corrección de asistencia</h3>

                <p className={common.muted}>
                    {guardia.paciente} — {guardia.prestador}
                    <br />
                    Programada: {formatearFechaHora(guardia.fecha_hora_entrada)}
                    {" → "}
                    {formatearFechaHora(guardia.fecha_hora_salida)}
                </p>

                <form onSubmit={guardar}>
                    <label className={common.field}>
                        Entrada real
                        <input
                            type="datetime-local"
                            value={entrada}
                            onChange={(e) => setEntrada(e.target.value)}
                            required
                        />
                    </label>

                    <label className={common.field}>
                        Salida real
                        <input
                            type="datetime-local"
                            value={salida}
                            onChange={(e) => setSalida(e.target.value)}
                            required
                        />
                    </label>

                    <label className={common.field}>
                        Motivo de la corrección
                        <textarea
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            rows={3}
                            minLength={5}
                            placeholder="Ej.: el prestador olvidó registrar la salida"
                            required
                        />
                    </label>

                    {error && <p className={common.formError}>{error}</p>}

                    <div className={common.modalActions}>
                        <button
                            type="submit"
                            className={common.btnPrimary}
                            disabled={guardando}
                        >
                            {guardando ? "Guardando..." : "Guardar corrección"}
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

                <h4>Historial de correcciones</h4>

                {cargandoAuditoria ? (
                    <p>Cargando historial...</p>
                ) : auditoria.length === 0 ? (
                    <p className={common.muted}>
                        Esta guardia todavía no tiene correcciones manuales.
                    </p>
                ) : (
                    <div className={styles.auditScroll}>
                        <table className={styles.auditTable}>
                        <thead>
                            <tr>
                                <th>Cuándo</th>
                                <th>Usuario</th>
                                <th>Motivo</th>
                                <th>Entrada anterior → nueva</th>
                                <th>Salida anterior → nueva</th>
                                <th>Diferencia nueva</th>
                            </tr>
                        </thead>
                        <tbody>
                            {auditoria.map((registro) => (
                                <tr key={registro.id}>
                                    <td>
                                        {formatearFechaHora(registro.created_at)}
                                    </td>
                                    <td>{registro.usuario_email}</td>
                                    <td>{registro.motivo}</td>
                                    <td>
                                        {formatearFechaHora(
                                            registro.entrada_anterior
                                        )}
                                        {" → "}
                                        {formatearFechaHora(
                                            registro.entrada_nueva
                                        )}
                                    </td>
                                    <td>
                                        {formatearFechaHora(
                                            registro.salida_anterior
                                        )}
                                        {" → "}
                                        {formatearFechaHora(
                                            registro.salida_nueva
                                        )}
                                    </td>
                                    <td>
                                        {formatearDiferencia(
                                            registro.diferencia_nueva
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ModalAsistencia;
