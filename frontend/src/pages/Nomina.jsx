import { Fragment, useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import common from "../styles/common.module.css";
import styles from "./Nomina.module.css";

const MESES = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre"
];

const moneda = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS"
});

function formatearMoneda(valor) {
    return moneda.format(Number(valor || 0));
}

function formatearHoras(valor) {
    return Number(valor || 0).toFixed(2);
}

function formatearFecha(valor) {
    return valor ? dayjs(valor).format("DD/MM/YYYY") : "—";
}

function formatearFechaHora(valor) {
    return valor ? dayjs(valor).format("DD/MM/YYYY HH:mm") : "—";
}

function Nomina() {
    const { usuario } = useAuth();
    const puedeGestionar = usuario?.rol === "admin" ||
        usuario?.rol === "coordinador";

    const hoy = dayjs();

    const [mes, setMes] = useState(hoy.month() + 1);
    const [anio, setAnio] = useState(hoy.year());
    const [nominas, setNominas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [generando, setGenerando] = useState(false);
    const [pagandoId, setPagandoId] = useState(null);
    const [detalleAbierto, setDetalleAbierto] = useState(null);
    const [detalles, setDetalles] = useState([]);
    const [detalleCargando, setDetalleCargando] = useState(false);

    const anios = [];
    for (let valor = hoy.year() - 3; valor <= hoy.year() + 1; valor += 1) {
        anios.push(valor);
    }

    const cargar = useCallback(() => {
        let activo = true;

        setCargando(true);
        setError("");

        api.get("/nomina", { params: { mes, anio } })
            .then((res) => {
                if (activo) {
                    setNominas(res.data);
                }
            })
            .catch((err) => {
                if (activo) {
                    setNominas([]);
                    setError(
                        err.response?.data?.error ||
                        "No se pudo cargar la nómina"
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
    }, [mes, anio]);

    useEffect(() => {
        const cancelar = cargar();

        return cancelar;
    }, [cargar]);

    const cambiarPeriodo = (nuevoMes, nuevoAnio) => {
        setMes(nuevoMes);
        setAnio(nuevoAnio);
        setMensaje("");
        setDetalleAbierto(null);
        setDetalles([]);
    };

    const generar = async () => {
        setGenerando(true);
        setMensaje("");
        setError("");

        try {
            const res = await api.post("/nomina/generar", { mes, anio });
            const { registros, detalles: lineas, omitidos } = res.data;

            setMensaje(
                `${res.data.mensaje}: ${registros} nómina(s), ` +
                `${lineas} detalle(s)` +
                (omitidos > 0 ? `, ${omitidos} omitida(s) por estar pagadas` : "")
            );

            cargar();
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "No se pudo generar la nómina"
            );
        } finally {
            setGenerando(false);
        }
    };

    const verDetalle = async (nomina) => {
        if (detalleAbierto === nomina.id) {
            setDetalleAbierto(null);
            setDetalles([]);
            return;
        }

        setDetalleAbierto(nomina.id);
        setDetalles([]);
        setDetalleCargando(true);
        setError("");

        try {
            const res = await api.get(`/nomina/${nomina.id}/detalle`);
            setDetalles(res.data.detalles);
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "No se pudo cargar el detalle"
            );
        } finally {
            setDetalleCargando(false);
        }
    };

    const marcarPagada = async (nomina) => {
        const confirmado = window.confirm(
            `¿Marcar como pagada la nómina de ${nomina.trabajador} ` +
            `(${MESES[nomina.mes - 1]} ${nomina.anio}) por ` +
            `${formatearMoneda(nomina.total_a_pagar)}?`
        );

        if (!confirmado) {
            return;
        }

        setPagandoId(nomina.id);
        setError("");

        try {
            await api.patch(`/nomina/${nomina.id}/pagar`);
            setMensaje("Nómina marcada como pagada.");
            cargar();
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "No se pudo marcar la nómina como pagada"
            );
        } finally {
            setPagandoId(null);
        }
    };

    return (
        <div className={common.page}>
            <h2>Nómina</h2>

            <div className={styles.toolbar}>
                <label>
                    Mes{" "}
                    <select
                        value={mes}
                        onChange={(e) => cambiarPeriodo(Number(e.target.value), anio)}
                    >
                        {MESES.map((nombre, indice) => (
                            <option key={nombre} value={indice + 1}>
                                {nombre}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    Año{" "}
                    <select
                        value={anio}
                        onChange={(e) => cambiarPeriodo(mes, Number(e.target.value))}
                    >
                        {anios.map((valor) => (
                            <option key={valor} value={valor}>
                                {valor}
                            </option>
                        ))}
                    </select>
                </label>

                {puedeGestionar && (
                    <button
                        type="button"
                        className={common.btnPrimary}
                        onClick={generar}
                        disabled={generando}
                    >
                        {generando ? "Generando..." : "Generar nómina"}
                    </button>
                )}
            </div>

            {mensaje && <p className={common.mensajeOk}>{mensaje}</p>}
            {error && <p className={common.formError}>{error}</p>}

            {cargando ? (
                <p>Cargando nómina...</p>
            ) : nominas.length === 0 ? (
                <div className={common.emptyState}>
                    <p>
                        No hay nóminas para {MESES[mes - 1]} de {anio}.
                    </p>
                    {puedeGestionar && (
                        <p className={common.muted}>
                            Generá la nómina del período para incluir las horas
                            cerradas.
                        </p>
                    )}
                </div>
            ) : (
                <div className={styles.tablaContenedor}>
                    <table>
                        <thead>
                        <tr>
                            <th>Trabajador</th>
                            <th>Paciente</th>
                            <th>Horas N / F</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Fecha de pago</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {nominas.map((nomina) => (
                            <Fragment key={nomina.id}>
                                <tr>
                                    <td>{nomina.trabajador}</td>
                                    <td>{nomina.paciente}</td>
                                    <td>
                                        {formatearHoras(nomina.total_horas_normales)}
                                        {" / "}
                                        {formatearHoras(nomina.total_horas_feriados)}
                                    </td>
                                    <td>{formatearMoneda(nomina.total_a_pagar)}</td>
                                    <td>
                                        <span className={
                                            common.badge + " " +
                                            (nomina.pagado
                                                ? common.badgePagada
                                                : common.badgeImpaga)
                                        }>
                                            {nomina.pagado ? "Pagada" : "Pendiente"}
                                        </span>
                                    </td>
                                    <td>{formatearFecha(nomina.fecha_pago)}</td>
                                    <td className={styles.accionesCelda}>
                                        <button
                                            type="button"
                                            onClick={() => verDetalle(nomina)}
                                        >
                                            {detalleAbierto === nomina.id
                                                ? "Ocultar detalle"
                                                : "Ver detalle"}
                                        </button>

                                        {puedeGestionar && !nomina.pagado && (
                                            <button
                                                type="button"
                                                className={common.btnPrimary}
                                                disabled={pagandoId === nomina.id}
                                                onClick={() => marcarPagada(nomina)}
                                            >
                                                {pagandoId === nomina.id
                                                    ? "Guardando..."
                                                    : "Marcar pagada"}
                                            </button>
                                        )}
                                    </td>
                                </tr>

                                {detalleAbierto === nomina.id && (
                                    <tr key={nomina.id + "-detalle"}>
                                        <td colSpan="7">
                                            {detalleCargando ? (
                                                <p>Cargando detalle...</p>
                                            ) : detalles.length === 0 ? (
                                                <p className={common.muted}>
                                                    Esta nómina no tiene detalle de horas.
                                                </p>
                                            ) : (
                                                <div className={styles.detalleScroll}>
                                                    <table className={styles.detailTable}>
                                                    <thead>
                                                        <tr>
                                                            <th>Fecha</th>
                                                            <th>Entrada programada</th>
                                                            <th>Salida programada</th>
                                                            <th>Horas normales</th>
                                                            <th>Horas feriado</th>
                                                            <th>Feriado</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {detalles.map((linea) => (
                                                            <tr key={linea.id}>
                                                                <td>{formatearFecha(linea.fecha)}</td>
                                                                <td>
                                                                    {formatearFechaHora(
                                                                        linea.fecha_hora_entrada
                                                                    )}
                                                                </td>
                                                                <td>
                                                                    {formatearFechaHora(
                                                                        linea.fecha_hora_salida
                                                                    )}
                                                                </td>
                                                                <td>
                                                                    {formatearHoras(
                                                                        linea.horas_normales
                                                                    )}
                                                                </td>
                                                                <td>
                                                                    {formatearHoras(
                                                                        linea.horas_feriado
                                                                    )}
                                                                </td>
                                                                <td>
                                                                    {linea.es_feriado ? "Sí" : "No"}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                    </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default Nomina;
