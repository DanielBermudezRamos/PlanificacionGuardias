import { useState } from "react";
import dayjs from "dayjs";
import api from "../services/api";
import SelectorUbicacion from "./SelectorUbicacion";
import common from "../styles/common.module.css";
import styles from "./ModalPaciente.module.css";

function aFechaInput(valor) {
    return valor ? dayjs(valor).format("YYYY-MM-DD") : "";
}

function ModalPaciente({ paciente, clinicas, cerrar, recargar, alGuardar }) {
    const editando = Boolean(paciente?.id);

    const [nombre, setNombre] = useState(paciente?.nombre || "");
    const [edad, setEdad] = useState(
        paciente?.edad === null || paciente?.edad === undefined
            ? ""
            : String(paciente.edad)
    );
    const [patologia, setPatologia] = useState(paciente?.patologia || "");
    const [direccion, setDireccion] = useState(paciente?.direccion || "");
    const [telefono, setTelefono] = useState(
        paciente?.telefono_propio || ""
    );
    const [familiar, setFamiliar] = useState(
        paciente?.familiar_responsable || ""
    );
    const [localidad, setLocalidad] = useState(paciente?.localidad || "");
    const [tipoServicio, setTipoServicio] = useState(
        paciente?.tipo_servicio || ""
    );
    const [modalidad, setModalidad] = useState(paciente?.modalidad || "");
    const [dias, setDias] = useState(paciente?.dias_prestacion || "");
    const [horario, setHorario] = useState(
        paciente?.horario_prestacion || ""
    );
    const [horas, setHoras] = useState(paciente?.horas_prestacion || "");
    const [fechaInicio, setFechaInicio] = useState(
        aFechaInput(paciente?.fecha_inicio)
    );
    const [fechaBaja, setFechaBaja] = useState(
        aFechaInput(paciente?.fecha_baja)
    );
    const [motivoBaja, setMotivoBaja] = useState(
        paciente?.motivo_baja || ""
    );
    const [activo, setActivo] = useState(
        paciente ? Boolean(paciente.activo) : true
    );
    const [clinicaId, setClinicaId] = useState(
        paciente?.clinica_id ? String(paciente.clinica_id) : ""
    );
    const [codigoPadron, setCodigoPadron] = useState(
        paciente?.codigo_padron || ""
    );
    const [latitud, setLatitud] = useState(paciente?.latitud ?? null);
    const [longitud, setLongitud] = useState(paciente?.longitud ?? null);
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);

    const clinicaSeleccionada = clinicas.find(
        (clinica) => String(clinica.id) === clinicaId
    );

    const copiarDireccionClinica = () => {
        if (!clinicaSeleccionada) {
            return;
        }

        if (clinicaSeleccionada.direccion) {
            setDireccion(clinicaSeleccionada.direccion);
        }

        if (clinicaSeleccionada.localidad) {
            setLocalidad(clinicaSeleccionada.localidad);
        }
    };

    const copiarUbicacionClinica = () => {
        if (!clinicaSeleccionada?.latitud || !clinicaSeleccionada?.longitud) {
            return;
        }

        setLatitud(clinicaSeleccionada.latitud);
        setLongitud(clinicaSeleccionada.longitud);
    };

    const guardar = async (evento) => {
        evento.preventDefault();
        setError("");

        if (!nombre.trim()) {
            setError("El nombre es obligatorio.");
            return;
        }

        if (edad !== "") {
            const numeroEdad = Number(edad);

            if (
                !Number.isInteger(numeroEdad) ||
                numeroEdad < 0 ||
                numeroEdad > 120
            ) {
                setError("La edad debe ser un número entre 0 y 120.");
                return;
            }
        }

        if (fechaInicio && fechaBaja && fechaBaja < fechaInicio) {
            setError(
                "La fecha de baja no puede ser anterior a la fecha de inicio."
            );
            return;
        }

        setGuardando(true);

        try {
            const cuerpo = {
                nombre: nombre.trim(),
                edad: edad === "" ? null : Number(edad),
                patologia: patologia.trim() || null,
                direccion: direccion.trim() || null,
                telefono_propio: telefono.trim() || null,
                familiar_responsable: familiar.trim() || null,
                localidad: localidad.trim() || null,
                tipo_servicio: tipoServicio.trim() || null,
                modalidad: modalidad.trim() || null,
                dias_prestacion: dias.trim() || null,
                horario_prestacion: horario.trim() || null,
                horas_prestacion: horas.trim() || null,
                fecha_inicio: fechaInicio || null,
                fecha_baja: fechaBaja || null,
                motivo_baja: motivoBaja.trim() || null,
                activo,
                clinica_id: clinicaId ? Number(clinicaId) : null,
                codigo_padron: codigoPadron.trim() || null,
                latitud,
                longitud
            };

            if (editando) {
                await api.put(`/pacientes/${paciente.id}`, cuerpo);
            } else {
                await api.post("/pacientes", cuerpo);
            }

            recargar();
            alGuardar?.(editando);
            cerrar();
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "No se pudo guardar el paciente"
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
                <h3>{editando ? "Editar paciente" : "Nuevo paciente"}</h3>

                <form onSubmit={guardar}>
                    <fieldset className={styles.seccion}>
                        <legend>Datos del paciente</legend>

                        <div className={styles.fila}>
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

                            <label className={common.field}>
                                Edad
                                <input
                                    type="number"
                                    value={edad}
                                    min={0}
                                    max={120}
                                    placeholder="Años"
                                    onChange={(evento) =>
                                        setEdad(evento.target.value)
                                    }
                                />
                            </label>
                        </div>

                        <div className={styles.fila}>
                            <label className={common.field}>
                                Teléfono de contacto
                                <input
                                    type="text"
                                    value={telefono}
                                    maxLength={20}
                                    placeholder="Teléfono propio o del familiar"
                                    onChange={(evento) =>
                                        setTelefono(evento.target.value)
                                    }
                                />
                            </label>

                            <label className={common.field}>
                                Familiar responsable
                                <input
                                    type="text"
                                    value={familiar}
                                    maxLength={150}
                                    placeholder="Nombre y vínculo"
                                    onChange={(evento) =>
                                        setFamiliar(evento.target.value)
                                    }
                                />
                            </label>
                        </div>

                        <label className={common.field}>
                            Patología
                            <textarea
                                value={patologia}
                                rows={3}
                                maxLength={5000}
                                placeholder="Diagnóstico o cuidados requeridos"
                                onChange={(evento) =>
                                    setPatologia(evento.target.value)
                                }
                            />
                        </label>

                        <label className={common.field}>
                            Código de padrón
                            <input
                                type="text"
                                value={codigoPadron}
                                maxLength={10}
                                placeholder="Opcional, para trazabilidad"
                                onChange={(evento) =>
                                    setCodigoPadron(evento.target.value)
                                }
                            />
                        </label>
                    </fieldset>

                    <fieldset className={styles.seccion}>
                        <legend>Domicilio</legend>

                        <div className={styles.fila}>
                            <label className={common.field}>
                                Dirección
                                <input
                                    type="text"
                                    value={direccion}
                                    maxLength={200}
                                    placeholder="Calle, número, piso"
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
                                    placeholder="Ciudad o partido"
                                    onChange={(evento) =>
                                        setLocalidad(evento.target.value)
                                    }
                                />
                            </label>
                        </div>
                    </fieldset>

                    <fieldset className={styles.seccion}>
                        <legend>Prestación</legend>

                        <div className={styles.filaTres}>
                            <label className={common.field}>
                                Tipo de servicio
                                <input
                                    type="text"
                                    value={tipoServicio}
                                    maxLength={50}
                                    list="tipos-servicio"
                                    placeholder="ASISTENTE"
                                    onChange={(evento) =>
                                        setTipoServicio(evento.target.value)
                                    }
                                />
                                <datalist id="tipos-servicio">
                                    <option value="ASISTENTE" />
                                    <option value="ENFERMERIA" />
                                    <option value="COCINA" />
                                    <option value="CUIDADOR" />
                                </datalist>
                            </label>

                            <label className={common.field}>
                                Modalidad
                                <input
                                    type="text"
                                    value={modalidad}
                                    maxLength={100}
                                    placeholder="CAMA ADENTRO"
                                    onChange={(evento) =>
                                        setModalidad(evento.target.value)
                                    }
                                />
                            </label>

                            <label className={common.field}>
                                Días
                                <input
                                    type="text"
                                    value={dias}
                                    maxLength={100}
                                    placeholder="LUNES A LUNES"
                                    onChange={(evento) =>
                                        setDias(evento.target.value)
                                    }
                                />
                            </label>
                        </div>

                        <div className={styles.filaTres}>
                            <label className={common.field}>
                                Horario
                                <input
                                    type="text"
                                    value={horario}
                                    maxLength={150}
                                    placeholder="9:00 A 9:00"
                                    onChange={(evento) =>
                                        setHorario(evento.target.value)
                                    }
                                />
                            </label>

                            <label className={common.field}>
                                Horas
                                <input
                                    type="text"
                                    value={horas}
                                    maxLength={30}
                                    placeholder="24 HORAS"
                                    onChange={(evento) =>
                                        setHoras(evento.target.value)
                                    }
                                />
                            </label>

                            <label className={common.field}>
                                Fecha de inicio
                                <input
                                    type="date"
                                    value={fechaInicio}
                                    onChange={(evento) =>
                                        setFechaInicio(evento.target.value)
                                    }
                                />
                            </label>
                        </div>
                    </fieldset>

                    <fieldset className={styles.seccion}>
                        <legend>Internación</legend>

                        <label className={common.field}>
                            Clínica
                            <select
                                value={clinicaId}
                                onChange={(evento) =>
                                    setClinicaId(evento.target.value)
                                }
                            >
                                <option value="">
                                    Sin clínica (domicilio)
                                </option>
                                {clinicas.map((clinica) => (
                                    <option
                                        key={clinica.id}
                                        value={clinica.id}
                                    >
                                        {clinica.nombre}
                                        {clinica.activa ? "" : " (inactiva)"}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {clinicaSeleccionada && (
                            <div className={styles.clinicaAcciones}>
                                <button
                                    type="button"
                                    onClick={copiarDireccionClinica}
                                >
                                    Usar dirección de la clínica
                                </button>

                                {clinicaSeleccionada.latitud &&
                                    clinicaSeleccionada.longitud && (
                                    <button
                                        type="button"
                                        onClick={copiarUbicacionClinica}
                                    >
                                        Usar GPS de la clínica
                                    </button>
                                )}
                            </div>
                        )}
                    </fieldset>

                    <fieldset className={styles.seccion}>
                        <legend>Estado</legend>

                        <label className={styles.estado}>
                            <input
                                type="checkbox"
                                checked={activo}
                                onChange={(evento) =>
                                    setActivo(evento.target.checked)
                                }
                            />
                            Paciente activo
                        </label>

                        <div className={styles.fila}>
                            <label className={common.field}>
                                Fecha de baja
                                <input
                                    type="date"
                                    value={fechaBaja}
                                    onChange={(evento) =>
                                        setFechaBaja(evento.target.value)
                                    }
                                />
                            </label>

                            <label className={common.field}>
                                Motivo de baja
                                <input
                                    type="text"
                                    value={motivoBaja}
                                    maxLength={255}
                                    placeholder="Fallecimiento, cambio de obra social..."
                                    onChange={(evento) =>
                                        setMotivoBaja(evento.target.value)
                                    }
                                />
                            </label>
                        </div>
                    </fieldset>

                    <fieldset className={styles.seccion}>
                        <legend>Ubicación GPS</legend>

                        <p className={styles.ayuda}>
                            La ubicación se usa para verificar que el prestador
                            inicie la guardia a menos de 50 metros.
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
                                    : "Crear paciente"}
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

export default ModalPaciente;
