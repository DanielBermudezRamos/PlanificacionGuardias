import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import ModalPublicacion from "../components/ModalPublicacion";
import common from "../styles/common.module.css";
import styles from "./Publicaciones.module.css";

const moneda = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS"
});

function formatearFechaHora(valor) {
    return valor ? dayjs(valor).format("DD/MM/YYYY HH:mm") : "—";
}

function Publicaciones() {
    const { usuario } = useAuth();
    const puedeGestionar = usuario?.rol === "admin" ||
        usuario?.rol === "coordinador";

    const [publicaciones, setPublicaciones] = useState([]);
    const [pacientes, setPacientes] = useState([]);
    const [trabajadores, setTrabajadores] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [modalAbierto, setModalAbierto] = useState(false);
    const [editando, setEditando] = useState(null);
    const [procesandoId, setProcesandoId] = useState(null);

    const cargar = useCallback(() => {
        let activo = true;

        api.get("/publicaciones")
            .then((res) => {
                if (activo) {
                    setPublicaciones(res.data);
                    setError("");
                }
            })
            .catch((err) => {
                if (activo) {
                    setError(
                        err.response?.data?.error ||
                        "No se pudieron cargar las publicaciones"
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
        if (!puedeGestionar) {
            return undefined;
        }

        let activo = true;

        Promise.all([
            api.get("/pacientes"),
            api.get("/trabajadores", {
                params: { solo_prestadores: 1, activo: 1 }
            })
        ])
            .then(([resPacientes, resTrabajadores]) => {
                if (activo) {
                    setPacientes(resPacientes.data);
                    setTrabajadores(resTrabajadores.data);
                }
            })
            .catch(() => {
                if (activo) {
                    setPacientes([]);
                    setTrabajadores([]);
                }
            });

        return () => {
            activo = false;
        };
    }, [puedeGestionar]);

    const abrirNueva = () => {
        setEditando(null);
        setModalAbierto(true);
    };

    const abrirEdicion = (publicacion) => {
        setEditando(publicacion);
        setModalAbierto(true);
    };

    const alGuardar = (esEdicion) => {
        setError("");
        setMensaje(
            esEdicion
                ? "Publicación actualizada."
                : "Publicación creada."
        );
    };

    const cambiarEstado = async (publicacion) => {
        const cerrar = Boolean(publicacion.activa);
        const confirmado = window.confirm(
            cerrar
                ? "¿Cerrar esta publicación? Los prestadores dejarán de verla."
                : "¿Reabrir esta publicación? Volverá a mostrarse a los prestadores elegidos."
        );

        if (!confirmado) {
            return;
        }

        setProcesandoId(publicacion.id);
        setError("");

        try {
            await api.patch(`/publicaciones/${publicacion.id}/estado`, {
                activa: !publicacion.activa
            });

            setMensaje(
                cerrar ? "Publicación cerrada." : "Publicación reabierta."
            );
            cargar();
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "No se pudo cambiar el estado de la publicación"
            );
        } finally {
            setProcesandoId(null);
        }
    };

    return (
        <div className={common.page}>
            <div className={styles.cabecera}>
                <div>
                    <h2>Publicaciones</h2>
                    <p className={common.muted}>
                        {puedeGestionar
                            ? "Publicá las características de una guardia y elegí qué prestadores pueden verla."
                            : "Guardias publicadas para vos por la coordinación."}
                    </p>
                </div>

                {puedeGestionar && (
                    <button
                        type="button"
                        className={common.btnPrimary}
                        onClick={abrirNueva}
                    >
                        Nueva publicación
                    </button>
                )}
            </div>

            {mensaje && <p className={common.mensajeOk}>{mensaje}</p>}
            {error && <p className={common.formError}>{error}</p>}

            {cargando && publicaciones.length === 0 ? (
                <p>Cargando publicaciones...</p>
            ) : publicaciones.length === 0 ? (
                <div className={common.emptyState}>
                    <p>
                        {puedeGestionar
                            ? "Todavía no hay publicaciones de guardias."
                            : "No tenés publicaciones disponibles por ahora."}
                    </p>
                    <p className={common.muted}>
                        {puedeGestionar
                            ? "Creá una publicación para que los prestadores vean el paciente, la dirección, la patología, el horario y el precio."
                            : "Cuando la coordinación publique una guardia para vos, va a aparecer en esta pantalla."}
                    </p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {publicaciones.map((publicacion) => (
                        <article
                            key={publicacion.id}
                            className={`${styles.card} ${
                                publicacion.activa
                                    ? ""
                                    : styles.cardCerrada
                            }`}
                        >
                            <div className={styles.cardTop}>
                                <div>
                                    <h3>{publicacion.paciente}</h3>
                                    <p className={styles.precio}>
                                        {moneda.format(
                                            Number(publicacion.precio || 0)
                                        )}
                                    </p>
                                </div>

                                {puedeGestionar && (
                                    <span
                                        className={`${styles.badge} ${
                                            publicacion.activa
                                                ? styles.badgeActiva
                                                : styles.badgeCerrada
                                        }`}
                                    >
                                        {publicacion.activa
                                            ? "Activa"
                                            : "Cerrada"}
                                    </span>
                                )}
                            </div>

                            <dl className={styles.datos}>
                                <div>
                                    <dt>Horario</dt>
                                    <dd>
                                        {formatearFechaHora(
                                            publicacion.fecha_hora_entrada
                                        )}
                                        {" — "}
                                        {formatearFechaHora(
                                            publicacion.fecha_hora_salida
                                        )}
                                    </dd>
                                </div>
                                <div>
                                    <dt>Dirección</dt>
                                    <dd>
                                        {publicacion.direccion ||
                                            "Sin dirección"}
                                    </dd>
                                </div>
                                <div>
                                    <dt>Patología</dt>
                                    <dd>
                                        {publicacion.patologia || "Sin datos"}
                                    </dd>
                                </div>
                                {puedeGestionar && (
                                    <div>
                                        <dt>Alcance</dt>
                                        <dd>
                                            {publicacion.para_todos
                                                ? "Todos los prestadores"
                                                : publicacion.destinatarios
                                                    .map((item) => item.nombre)
                                                    .join(", ") ||
                                                    "Sin prestadores"}
                                        </dd>
                                    </div>
                                )}
                            </dl>

                            <footer className={styles.cardFooter}>
                                <span className={styles.creador}>
                                    Publicada por{" "}
                                    {publicacion.creador || "—"}
                                    {" · "}
                                    {formatearFechaHora(
                                        publicacion.created_at
                                    )}
                                </span>

                                {puedeGestionar && (
                                    <div className={styles.acciones}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                abrirEdicion(publicacion)
                                            }
                                        >
                                            Editar
                                        </button>
                                        <button
                                            type="button"
                                            disabled={
                                                procesandoId === publicacion.id
                                            }
                                            onClick={() =>
                                                cambiarEstado(publicacion)
                                            }
                                        >
                                            {procesandoId === publicacion.id
                                                ? "Guardando..."
                                                : publicacion.activa
                                                    ? "Cerrar"
                                                    : "Reabrir"}
                                        </button>
                                    </div>
                                )}
                            </footer>
                        </article>
                    ))}
                </div>
            )}

            {modalAbierto && puedeGestionar && (
                <ModalPublicacion
                    publicacion={editando}
                    pacientes={pacientes}
                    trabajadores={trabajadores}
                    cerrar={() => setModalAbierto(false)}
                    recargar={cargar}
                    alGuardar={alGuardar}
                />
            )}
        </div>
    );
}

export default Publicaciones;
