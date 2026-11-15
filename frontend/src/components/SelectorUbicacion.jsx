import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./SelectorUbicacion.module.css";

const CENTRO_INICIAL = [-34.6037, -58.3816];

function numeroCoordenada(valor) {
    const numero = Number(valor);

    return Number.isFinite(numero) ? numero : null;
}

function SelectorUbicacion({ latitud, longitud, onChange, deshabilitado }) {
    const contenedorRef = useRef(null);
    const mapaRef = useRef(null);
    const marcadorRef = useRef(null);
    const onChangeRef = useRef(onChange);
    const inicialRef = useRef({ latitud, longitud });

    const [mensaje, setMensaje] = useState("");
    const [errorUbicacion, setErrorUbicacion] = useState("");
    const [buscando, setBuscando] = useState(false);

    const lat = numeroCoordenada(latitud);
    const lng = numeroCoordenada(longitud);
    const tieneCoordenadas = lat !== null && lng !== null;

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        if (!contenedorRef.current || mapaRef.current) {
            return undefined;
        }

        const inicialLat = numeroCoordenada(inicialRef.current.latitud);
        const inicialLng = numeroCoordenada(inicialRef.current.longitud);
        const hayInicial = inicialLat !== null && inicialLng !== null;

        const mapa = L.map(contenedorRef.current, {
            center: hayInicial ? [inicialLat, inicialLng] : CENTRO_INICIAL,
            zoom: hayInicial ? 16 : 11,
            scrollWheelZoom: false
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap"
        }).addTo(mapa);

        mapa.on("click", (evento) => {
            const { lat: nuevaLat, lng: nuevaLng } = evento.latlng;

            onChangeRef.current?.({
                latitud: Number(nuevaLat.toFixed(7)),
                longitud: Number(nuevaLng.toFixed(7))
            });
        });

        mapaRef.current = mapa;

        const temporizador = setTimeout(() => {
            mapa.invalidateSize();
        }, 120);

        return () => {
            clearTimeout(temporizador);
            mapa.remove();
            mapaRef.current = null;
            marcadorRef.current = null;
        };
    }, []);

    useEffect(() => {
        const mapa = mapaRef.current;

        if (!mapa) {
            return;
        }

        if (!tieneCoordenadas) {
            if (marcadorRef.current) {
                mapa.removeLayer(marcadorRef.current);
                marcadorRef.current = null;
            }

            return;
        }

        const posicion = [lat, lng];

        if (marcadorRef.current) {
            marcadorRef.current.setLatLng(posicion);
        } else {
            marcadorRef.current = L.circleMarker(posicion, {
                radius: 9,
                color: "#1565c0",
                weight: 2,
                fillColor: "#1976d2",
                fillOpacity: 0.85
            }).addTo(mapa);
        }

        mapa.setView(posicion, Math.max(mapa.getZoom(), 15));
    }, [lat, lng, tieneCoordenadas]);

    const usarUbicacionActual = () => {
        setMensaje("");
        setErrorUbicacion("");

        if (!navigator.geolocation) {
            setErrorUbicacion(
                "Este navegador no permite obtener la ubicación."
            );
            return;
        }

        setBuscando(true);

        navigator.geolocation.getCurrentPosition(
            (posicion) => {
                setBuscando(false);
                setMensaje(
                    `Ubicación tomada (precisión aproximada: ` +
                    `${Math.round(posicion.coords.accuracy)} m).`
                );

                onChange?.({
                    latitud: Number(posicion.coords.latitude.toFixed(7)),
                    longitud: Number(posicion.coords.longitude.toFixed(7))
                });
            },
            (error) => {
                setBuscando(false);

                if (error.code === 1) {
                    setErrorUbicacion(
                        "Permiso de ubicación denegado. Habilitá el acceso " +
                        "a la ubicación en el navegador."
                    );
                } else if (error.code === 2) {
                    setErrorUbicacion(
                        "No se pudo determinar la ubicación del dispositivo."
                    );
                } else {
                    setErrorUbicacion(
                        "Se agotó el tiempo para obtener la ubicación."
                    );
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    };

    const quitarUbicacion = () => {
        setMensaje("");
        setErrorUbicacion("");
        onChange?.(null);
    };

    return (
        <div className={styles.contenedor}>
            <div ref={contenedorRef} className={styles.mapa} />

            <div className={styles.acciones}>
                <button
                    type="button"
                    onClick={usarUbicacionActual}
                    disabled={deshabilitado || buscando}
                >
                    {buscando
                        ? "Obteniendo ubicación..."
                        : "Usar ubicación actual"}
                </button>

                {tieneCoordenadas && (
                    <>
                        <button
                            type="button"
                            onClick={quitarUbicacion}
                            disabled={deshabilitado}
                        >
                            Quitar ubicación
                        </button>
                        <a
                            className={styles.enlace}
                            href={
                                `https://www.openstreetmap.org/?mlat=${lat}` +
                                `&mlon=${lng}#map=17/${lat}/${lng}`
                            }
                            target="_blank"
                            rel="noreferrer"
                        >
                            Ver en el mapa
                        </a>
                    </>
                )}
            </div>

            {tieneCoordenadas ? (
                <p className={styles.coordenadas}>
                    Latitud <strong>{lat}</strong> · Longitud{" "}
                    <strong>{lng}</strong>
                </p>
            ) : (
                <p className={styles.coordenadas}>
                    Sin ubicación guardada. Hacé clic en el mapa para marcar
                    el domicilio.
                </p>
            )}

            {mensaje && <p className={styles.mensaje}>{mensaje}</p>}
            {errorUbicacion && (
                <p className={`${styles.mensaje} ${styles.mensajeError}`}>
                    {errorUbicacion}
                </p>
            )}
        </div>
    );
}

export default SelectorUbicacion;
