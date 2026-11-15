import { useState } from "react";
import dayjs from "dayjs";
import api from "../services/api";
import common from "../styles/common.module.css";

function aInput(valor) {
    return valor ? dayjs(valor).format("YYYY-MM-DDTHH:mm") : "";
}

function ModalHorario({ guardia, cerrar, recargar, alGuardar }) {
    const [inicio, setInicio] = useState(
        aInput(guardia.fecha_hora_entrada)
    );
    const [fin, setFin] = useState(aInput(guardia.fecha_hora_salida));
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");

    const guardar = async (evento) => {
        evento.preventDefault();
        setError("");

        if (!inicio || !fin) {
            setError("Completá el inicio y el fin.");
            return;
        }

        if (!dayjs(fin).isAfter(dayjs(inicio))) {
            setError("El fin debe ser posterior al inicio.");
            return;
        }

        setGuardando(true);

        try {
            await api.put(`/guardias/${guardia.id}`, {
                fecha_hora_entrada: dayjs(inicio).format("YYYY-MM-DD HH:mm:ss"),
                fecha_hora_salida: dayjs(fin).format("YYYY-MM-DD HH:mm:ss")
            });

            recargar();
            alGuardar?.();
            cerrar();
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "No se pudo actualizar el horario"
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
                <h3>Editar horario</h3>

                <p className={common.muted}>
                    {guardia.paciente} — {guardia.prestador}
                </p>

                <form onSubmit={guardar}>
                    <label className={common.field}>
                        Inicio programado
                        <input
                            type="datetime-local"
                            value={inicio}
                            onChange={(e) => setInicio(e.target.value)}
                            required
                        />
                    </label>

                    <label className={common.field}>
                        Fin programado
                        <input
                            type="datetime-local"
                            value={fin}
                            onChange={(e) => setFin(e.target.value)}
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
                            {guardando ? "Guardando..." : "Guardar cambios"}
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

export default ModalHorario;
