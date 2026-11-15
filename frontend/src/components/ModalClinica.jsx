import { useState } from "react";
import api from "../services/api";
import SelectorUbicacion from "./SelectorUbicacion";
import common from "../styles/common.module.css";
import styles from "./ModalClinica.module.css";

function ModalClinica({ clinica, cerrar, recargar, alGuardar }) {
    const editando = Boolean(clinica?.id);

    const [nombre, setNombre] = useState(clinica?.nombre || "");
    const [direccion, setDireccion] = useState(clinica?.direccion || "");
    const [localidad, setLocalidad] = useState(clinica?.localidad || "");
    const [telefono, setTelefono] = useState(clinica?.telefono || "");
    const [contacto, setContacto] = useState(clinica?.contacto || "");
    const [servicios, setServicios] = useState(clinica?.servicios || "");
    const [activa, setActiva] = useState(
        clinica ? Boolean(clinica.activa) : true
    );
    const [latitud, setLatitud] = useState(clinica?.latitud ?? null);
    const [longitud, setLongitud] = useState(clinica?.longitud ?? null);
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);

    const guardar = async (evento) => {
        evento.preventDefault();
        setError("");

        if (!nombre.trim()) {
            setError("El nombre de la clínica es obligatorio.");
            return;
        }

        setGuardando(true);

        try {
            const cuerpo = {
                nombre: nombre.trim(),
                direccion: direccion.trim() || null,
                localidad: localidad.trim() || null,
                telefono: telefono.trim() || null,
                contacto: contacto.trim() || null,
                servicios: servicios.trim() || null,
                activa,
                latitud,
                longitud
            };

            if (editando) {
                await api.put(`/clinicas/${clinica.id}`, cuerpo);
            } else {
                await api.post("/clinicas", cuerpo);
            }

            recargar();
            alGuardar?.(editando);
            cerrar();
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "No se pudo guardar la clínica"
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
                className={common.modalCard}
                role="dialog"
                aria-modal="true"
            >
                <h3>{editando ? "Editar clínica" : "Nueva clínica"}</h3>

                <form onSubmit={guardar}>
                    <label className={common.field}>
                        Nombre
                        <input
                            type="text"
                            value={nombre}
                            maxLength={150}
                            required
                            autoFocus
                            placeholder="Clínica o residencia"
                            onChange={(evento) =>
                                setNombre(evento.target.value)
                            }
                        />
                    </label>

                    <div className={styles.fila}>
                        <label className={common.field}>
                            Dirección
                            <input
                                type="text"
                                value={direccion}
                                maxLength={200}
                                onChange={(evento) =>
                                    setDireccion(evento.target.value)
                                }
                            />
                        </label>

                        <label className={common.field}>
                            Localidad
                            <input
                                type="text"
                                value={localidad}
                                maxLength={100}
                                onChange={(evento) =>
                                    setLocalidad(evento.target.value)
                                }
                            />
                        </label>
                    </div>

                    <div className={styles.fila}>
                        <label className={common.field}>
                            Teléfono
                            <input
                                type="text"
                                value={telefono}
                                maxLength={30}
                                onChange={(evento) =>
                                    setTelefono(evento.target.value)
                                }
                            />
                        </label>

                        <label className={common.field}>
                            Contacto
                            <input
                                type="text"
                                value={contacto}
                                maxLength={150}
                                placeholder="Familiar o responsable"
                                onChange={(evento) =>
                                    setContacto(evento.target.value)
                                }
                            />
                        </label>
                    </div>

                    <label className={common.field}>
                        Servicios
                        <textarea
                            value={servicios}
                            rows={3}
                            maxLength={5000}
                            placeholder="COCINA LUNES A LUNES 06:00 A 14:00 (8 HORAS); ENFERMERIA..."
                            onChange={(evento) =>
                                setServicios(evento.target.value)
                            }
                        />
                    </label>

                    <label className={styles.estado}>
                        <input
                            type="checkbox"
                            checked={activa}
                            onChange={(evento) =>
                                setActiva(evento.target.checked)
                            }
                        />
                        Clínica activa
                    </label>

                    <fieldset className={styles.seccion}>
                        <legend>Ubicación GPS</legend>

                        <p className={styles.ayuda}>
                            Si el paciente está internado y no tiene GPS
                            propio, se usa esta ubicación para verificar el
                            inicio de la guardia.
                        </p>

                        <SelectorUbicacion
                            latitud={latitud}
                            longitud={longitud}
                            deshabilitado={guardando}
                            onChange={(valor) => {
                                setLatitud(valor?.latitud ?? null);
                                setLongitud(valor?.longitud ?? null);
                            }}
                        />
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
                                    : "Crear clínica"}
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

export default ModalClinica;
