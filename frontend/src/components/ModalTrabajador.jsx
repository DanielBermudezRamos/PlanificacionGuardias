import { useState } from "react";
import api from "../services/api";
import common from "../styles/common.module.css";
import styles from "./ModalTrabajador.module.css";
import {
    formatearCbu,
    formatearCuit,
    formatearDni,
    formatearTelefono,
    normalizarCbu,
    soloDigitos
} from "../utils/formato";

function ModalTrabajador({
    trabajador,
    cargos,
    cerrar,
    recargar,
    alGuardar
}) {
    const editando = Boolean(trabajador?.id);

    const [nombre, setNombre] = useState(trabajador?.nombre || "");
    const [dni, setDni] = useState(formatearDni(trabajador?.dni));
    const [cuit, setCuit] = useState(formatearCuit(trabajador?.cuit));
    const [cbu, setCbu] = useState(formatearCbu(trabajador?.cbu));
    const [cargoId, setCargoId] = useState(
        trabajador ? String(trabajador.cargo_id) : ""
    );
    const [telefono, setTelefono] = useState(
        formatearTelefono(trabajador?.telefono)
    );
    const [telefonoAlternativo, setTelefonoAlternativo] = useState(
        formatearTelefono(trabajador?.telefono_alternativo)
    );
    const [activo, setActivo] = useState(
        trabajador ? Boolean(trabajador.activo) : true
    );
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);

    const guardar = async (evento) => {
        evento.preventDefault();
        setError("");

        if (!nombre.trim() || !cargoId) {
            setError("El nombre y el cargo son obligatorios.");
            return;
        }

        setGuardando(true);

        try {
            const cuerpo = {
                nombre: nombre.trim(),
                dni: soloDigitos(dni) || null,
                cuit: soloDigitos(cuit) || null,
                cbu: normalizarCbu(cbu),
                cargo_id: Number(cargoId),
                telefono: soloDigitos(telefono) || null,
                telefono_alternativo:
                    soloDigitos(telefonoAlternativo) || null,
                activo
            };

            if (editando) {
                await api.put(`/trabajadores/${trabajador.id}`, cuerpo);
            } else {
                await api.post("/trabajadores", cuerpo);
            }

            recargar();
            alGuardar?.(editando);
            cerrar();
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "No se pudo guardar el trabajador"
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
                    {editando ? "Editar trabajador" : "Nuevo trabajador"}
                </h3>

                <form onSubmit={guardar}>
                    <label className={common.field}>
                        Nombre
                        <input
                            type="text"
                            value={nombre}
                            maxLength={100}
                            required
                            autoFocus
                            onChange={(evento) =>
                                setNombre(evento.target.value)
                            }
                        />
                    </label>

                    <div className={styles.fila}>
                        <label className={common.field}>
                            DNI
                            <input
                                type="text"
                                inputMode="numeric"
                                value={dni}
                                maxLength={14}
                                placeholder="30.000.001"
                                onChange={(evento) =>
                                    setDni(evento.target.value)
                                }
                                onBlur={() => setDni(formatearDni(dni))}
                            />
                        </label>

                        <label className={common.field}>
                            CUIT / CUIL
                            <input
                                type="text"
                                inputMode="numeric"
                                value={cuit}
                                maxLength={20}
                                placeholder="27-35350824-0"
                                onChange={(evento) =>
                                    setCuit(evento.target.value)
                                }
                                onBlur={() => setCuit(formatearCuit(cuit))}
                            />
                        </label>
                    </div>

                    <p className={styles.ayuda}>
                        DNI y CUIT/CUIL son opcionales, pero se recomienda
                        completar al menos uno. Se guardan sin puntos ni
                        guiones.
                    </p>

                    <label className={common.field}>
                        CBU / CVU
                        <input
                            type="text"
                            value={cbu}
                            maxLength={50}
                            placeholder="0000003100000000000000 o alias"
                            onChange={(evento) =>
                                setCbu(evento.target.value)
                            }
                            onBlur={() => setCbu(formatearCbu(cbu))}
                        />
                    </label>

                    <div className={styles.fila}>
                        <label className={common.field}>
                            Cargo
                            <select
                                value={cargoId}
                                required
                                onChange={(evento) =>
                                    setCargoId(evento.target.value)
                                }
                            >
                                <option value="">Seleccionar cargo</option>
                                {cargos.map((cargo) => (
                                    <option
                                        key={cargo.id}
                                        value={cargo.id}
                                    >
                                        {cargo.nombre}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className={common.field}>
                            Teléfono
                            <input
                                type="tel"
                                value={telefono}
                                maxLength={25}
                                placeholder="11 2345-6789"
                                onChange={(evento) =>
                                    setTelefono(evento.target.value)
                                }
                                onBlur={() =>
                                    setTelefono(formatearTelefono(telefono))
                                }
                            />
                        </label>
                    </div>

                    <label className={common.field}>
                        Teléfono alternativo
                        <input
                            type="tel"
                            value={telefonoAlternativo}
                            maxLength={25}
                            placeholder="11 2345-6789"
                            onChange={(evento) =>
                                setTelefonoAlternativo(evento.target.value)
                            }
                            onBlur={() =>
                                setTelefonoAlternativo(
                                    formatearTelefono(telefonoAlternativo)
                                )
                            }
                        />
                    </label>

                    <label className={styles.estado}>
                        <input
                            type="checkbox"
                            checked={activo}
                            onChange={(evento) =>
                                setActivo(evento.target.checked)
                            }
                        />
                        Trabajador activo
                    </label>

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
                                    : "Crear trabajador"}
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

export default ModalTrabajador;
