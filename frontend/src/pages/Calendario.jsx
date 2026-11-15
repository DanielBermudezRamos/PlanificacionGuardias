import { useCallback, useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import api from "../services/api";
import ModalGuardia from "../components/ModalGuardia";
import { useAuth } from "../context/useAuth";
import styles from "./Calendario.module.css";

const coloresPaciente = [
    "#4CAF50",
    "#2196F3",
    "#FF9800",
    "#9C27B0",
    "#F44336",
    "#009688",
    "#3F51B5",
    "#795548"
];

function colorPaciente(nombre) {
    let hash = 0;

    for (let i = 0; i < nombre.length; i++) {
        hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash % coloresPaciente.length);

    return coloresPaciente[index];
}

function Calendario() {
    const { usuario } = useAuth();
    const puedeEditar = usuario?.rol === "coordinador" ||
        usuario?.rol === "admin";

    const [eventos, setEventos] = useState([]);
    const [modal, setModal] = useState(false);
    const [infoGuardia, setInfoGuardia] = useState(null);
    const [pacientes, setPacientes] = useState([]);

    const rangoRef = useRef(null);

    const cargarGuardias = useCallback((start, end) => {
        const desde = start || rangoRef.current?.desde;
        const hasta = end || rangoRef.current?.hasta;

        if (!desde || !hasta) {
            return;
        }

        rangoRef.current = { desde, hasta };

        api.get("/calendario", {
            params: { desde, hasta }
        })
            .then((res) => {
                const eventosFormateados = res.data.map((g) => ({
                    id: g.id,
                    title: g.prestador + " - " + g.paciente,
                    start: g.fecha_hora_entrada,
                    end: g.fecha_hora_salida,
                    backgroundColor: colorPaciente(g.paciente),
                    borderColor: colorPaciente(g.paciente)
                }));

                setEventos(eventosFormateados);
            })
            .catch(() => {
                setEventos([]);
            });
    }, []);

    const recargar = useCallback(() => {
        cargarGuardias();
    }, [cargarGuardias]);

    useEffect(() => {
        api.get("/pacientes")
            .then((res) => {
                setPacientes(res.data);
            })
            .catch(() => {
                setPacientes([]);
            });
    }, []);

    const crearGuardia = (info) => {
        setInfoGuardia(info);
        setModal(true);
    };

    const moverGuardia = async (info) => {
        const id = info.event.id;
        const nuevaEntrada = info.event.start;
        const nuevaSalida = info.event.end ||
            new Date(info.event.start.getTime() + 60 * 60 * 1000);

        try {
            await api.put("/guardias/" + id, {
                fecha_hora_entrada: nuevaEntrada.toISOString(),
                fecha_hora_salida: nuevaSalida.toISOString()
            });

            alert("Guardia actualizada");
        } catch (error) {
            info.revert();
            alert(
                error.response?.data?.error ||
                "No se pudo actualizar la guardia"
            );
        }
    };

    return (
        <div className={styles.container}>
            <h2>Calendario de Guardias</h2>
            <div className={styles.calendarioScroll}>
                <div className={styles.calendario}>
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="timeGridWeek"
                        events={eventos}
                        editable={puedeEditar}
                        selectable={puedeEditar}
                        select={puedeEditar ? crearGuardia : undefined}
                        eventDrop={puedeEditar ? moverGuardia : undefined}
                        datesSet={(info) => cargarGuardias(info.start, info.end)}
                    />
                </div>
            </div>

            {modal && puedeEditar && (
                <ModalGuardia
                    info={infoGuardia}
                    cerrar={() => setModal(false)}
                    pacientes={pacientes}
                    recargar={recargar}
                />
            )}
        </div>
    );
}

export default Calendario;
