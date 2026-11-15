import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import common from "../styles/common.module.css";
import styles from "./Inicio.module.css";

const etiquetasEstado = {
    pendiente: "Pendiente",
    en_curso: "En curso",
    finalizada: "Finalizada"
};

const badgesEstado = {
    pendiente: common.badgePendiente,
    en_curso: common.badgeEnCurso,
    finalizada: common.badgeFinalizada
};

function formatearFecha(valor) {
    return valor ? dayjs(valor).format("DD/MM/YYYY HH:mm") : "—";
}

function obtenerUbicacion() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(
                new Error(
                    "Este navegador no permite obtener la ubicación."
                )
            );
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (posicion) => {
                resolve({
                    latitud: Number(posicion.coords.latitude.toFixed(7)),
                    longitud: Number(posicion.coords.longitude.toFixed(7)),
                    precision: Number(posicion.coords.accuracy.toFixed(2))
                });
            },
            (error) => {
                if (error.code === 1) {
                    reject(
                        new Error(
                            "Permiso de ubicación denegado. Habilitá el " +
                            "acceso a la ubicación del navegador e intentá " +
                            "de nuevo."
                        )
                    );
                } else if (error.code === 2) {
                    reject(
                        new Error(
                            "No se pudo determinar la ubicación del " +
                            "dispositivo."
                        )
                    );
                } else {
                    reject(
                        new Error(
                            "Se agotó el tiempo para obtener la ubicación. " +
                            "Intentá de nuevo."
                        )
                    );
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    });
}

function Inicio() {
    const { usuario } = useAuth();
    const esPrestador = usuario?.rol === "prestador";

    const [cargando, setCargando] = useState(esPrestador);
    const [error, setError] = useState("");
    const [guardias, setGuardias] = useState([]);
    const [proxima, setProxima] = useState(null);
    const [accionError, setAccionError] = useState("");
    const [mensaje, setMensaje] = useState(null);
    const [estadoUbicacion, setEstadoUbicacion] = useState("");
    const [procesando, setProcesando] = useState(false);

    const cargar = useCallback(() => {
        if (!esPrestador) {
            return;
        }

        setCargando(true);
        setError("");

        api.get("/asistencia/actual")
            .then((res) => {
                setGuardias(res.data.guardias || []);
                setProxima(res.data.proxima || null);
            })
            .catch((err) => {
                setGuardias([]);
                setProxima(null);
                setError(
                    err.response?.data?.error ||
                    "No se pudo cargar tu guardia actual"
                );
            })
            .finally(() => {
                setCargando(false);
            });
    }, [esPrestador]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const ejecutarAccion = async (guardia, accion) => {
        setProcesando(true);
        setAccionError("");
        setMensaje(null);
        setEstadoUbicacion("");

        try {
            const cuerpo = { horario_programado_id: guardia.id };

            if (accion === "iniciar" && guardia.tiene_ubicacion) {
                setEstadoUbicacion("Verificando ubicación...");

                const ubicacion = await obtenerUbicacion();

                cuerpo.latitud = ubicacion.latitud;
                cuerpo.longitud = ubicacion.longitud;
                cuerpo.precision = ubicacion.precision;
            }

            setEstadoUbicacion(
                accion === "iniciar" ? "Registrando inicio..." : ""
            );

            const res = await api.post("/asistencia/" + accion, cuerpo);

            if (accion === "iniciar") {
                if (res.data?.advertencia) {
                    setMensaje({
                        tipo: "aviso",
                        texto: res.data.advertencia
                    });
                } else if (res.data?.verificada) {
                    setMensaje({
                        tipo: "ok",
                        texto:
                            "Guardia iniciada. Ubicación verificada a " +
                            `${Math.round(res.data.distancia_metros)} metros ` +
                            "del paciente."
                    });
                } else {
                    setMensaje({
                        tipo: "ok",
                        texto: "Guardia iniciada."
                    });
                }
            } else {
                setMensaje({
                    tipo: "ok",
                    texto: "Guardia finalizada."
                });
            }

            cargar();
        } catch (err) {
            const data = err.response?.data;
            const distancia = data?.distancia_metros;

            setAccionError(
                data?.detalle ||
                (distancia !== undefined
                    ? "Estás fuera del radio permitido para iniciar la " +
                      `guardia (${Math.round(distancia)} metros).`
                    : null) ||
                data?.error ||
                err.message ||
                "No se pudo completar la acción"
            );
        } finally {
            setEstadoUbicacion("");
            setProcesando(false);
        }
    };

    if (!esPrestador) {
        return (
            <div className={common.page}>
                <h1>Hola, {usuario.nombre}</h1>
                <p>
                    Sesión iniciada como <strong>{usuario.rol}</strong>.
                </p>
                <p>
                    Desde el calendario podés planificar y ajustar las guardias
                    del equipo.
                </p>

                <ul>
                    <li>
                        <Link to="/guardias">Ver guardias</Link>
                    </li>
                    <li>
                        <Link to="/publicaciones">Ver publicaciones</Link>
                    </li>
                    <li>
                        <Link to="/calendario">Ver calendario</Link>
                    </li>
                    <li>
                        <Link to="/pacientes">Ver pacientes</Link>
                    </li>
                    <li>
                        <Link to="/clinicas">Ver clínicas</Link>
                    </li>
                    <li>
                        <Link to="/trabajadores">Ver trabajadores</Link>
                    </li>
                </ul>
            </div>
        );
    }

    return (
        <div className={common.page}>
            <h1>Hola, {usuario.nombre}</h1>

            {mensaje && (
                <p
                    className={
                        mensaje.tipo === "aviso"
                            ? styles.mensajeAviso
                            : common.mensajeOk
                    }
                >
                    {mensaje.texto}
                </p>
            )}

            {accionError && <p className={common.formError}>{accionError}</p>}

            {cargando && <p>Cargando tu guardia...</p>}

            {!cargando && error && <p className={common.formError}>{error}</p>}

            {!cargando && !error && guardias.length === 0 && (
                <div className={common.emptyState}>
                    <p>
                        No tenés una guardia para iniciar o finalizar en este
                        momento.
                    </p>

                    {proxima ? (
                        <p className={common.muted}>
                            Próxima guardia:{" "}
                            <strong>{formatearFecha(proxima.fecha_hora_entrada)}</strong>
                            {" — "}
                            {proxima.paciente_nombre}
                        </p>
                    ) : (
                        <p className={common.muted}>
                            No tenés guardias próximas asignadas.
                        </p>
                    )}

                    <p>
                        <Link to="/guardias">Ver todas mis guardias</Link>
                    </p>
                </div>
            )}

            {!cargando && !error && guardias.length > 0 && (
                <div>
                    {guardias.map((guardia) => (
                        <article key={guardia.id} className={styles.guardiaCard}>
                            <header>
                                <h2>{guardia.paciente}</h2>
                                <span className={`${common.badge} ${badgesEstado[guardia.estado] || ""}`}>
                                    {etiquetasEstado[guardia.estado]}
                                </span>
                            </header>

                            <dl>
                                <div>
                                    <dt>Inicio programado</dt>
                                    <dd>{formatearFecha(guardia.fecha_hora_entrada)}</dd>
                                </div>
                                <div>
                                    <dt>Fin programado</dt>
                                    <dd>{formatearFecha(guardia.fecha_hora_salida)}</dd>
                                </div>
                                <div>
                                    <dt>Duración estimada</dt>
                                    <dd>{guardia.horas_estimadas} h</dd>
                                </div>
                                {guardia.fecha_hora_entrada_real && (
                                    <div>
                                        <dt>Inicio real</dt>
                                        <dd>
                                            {formatearFecha(guardia.fecha_hora_entrada_real)}
                                        </dd>
                                    </div>
                                )}
                                {guardia.fecha_hora_salida_real && (
                                    <div>
                                        <dt>Fin real</dt>
                                        <dd>
                                            {formatearFecha(guardia.fecha_hora_salida_real)}
                                        </dd>
                                    </div>
                                )}
                            </dl>

                            {guardia.estado === "pendiente" && (
                                <p
                                    className={
                                        guardia.tiene_ubicacion
                                            ? styles.ubicacionOk
                                            : styles.ubicacionAviso
                                    }
                                >
                                    {guardia.tiene_ubicacion
                                        ? "Ubicación GPS disponible " +
                                          `(${
                                              guardia.ubicacion_origen ===
                                              "clinica"
                                                  ? "de la clínica"
                                                  : "del paciente"
                                          }). El inicio se verifica a ` +
                                          "menos de 50 metros."
                                        : "Este paciente no tiene ubicación " +
                                          "GPS cargada. El inicio se " +
                                          "registrará sin verificación."}
                                </p>
                            )}

                            <div className={styles.guardiaActions}>
                                {guardia.puede_iniciar && (
                                    <button
                                        type="button"
                                        className={common.btnPrimary}
                                        disabled={procesando}
                                        onClick={() => ejecutarAccion(guardia, "iniciar")}
                                    >
                                        {procesando
                                            ? estadoUbicacion || "Procesando..."
                                            : "Iniciar guardia"}
                                    </button>
                                )}

                                {guardia.puede_finalizar && (
                                    <button
                                        type="button"
                                        className={common.btnPrimary}
                                        disabled={procesando}
                                        onClick={() => ejecutarAccion(guardia, "finalizar")}
                                    >
                                        {procesando ? "Procesando..." : "Finalizar guardia"}
                                    </button>
                                )}

                                {guardia.estado === "pendiente" && !guardia.puede_iniciar && (
                                    <p className={common.muted}>
                                        Podés iniciar esta guardia desde el{" "}
                                        {formatearFecha(guardia.ventana?.desde)}.
                                    </p>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Inicio;
