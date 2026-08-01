import { useEffect,useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import api from "../services/api";
import ModalGuardia from "../components/ModalGuardia";

function Calendario() {

    const [eventos,setEventos] = useState([]);
    const [modal,setModal] = useState(false);
    const [infoGuardia,setInfoGuardia] = useState(null);

    const [pacientes,setPacientes] = useState([]);
    const [prestadores,setPrestadores] = useState([]);

    useEffect(() => {
        
        cargarGuardias();

        // 👇 cargar pacientes
        api.get("/pacientes").then(res=>{
            setPacientes(res.data);
        });

        // 👇 cargar prestadores
        api.get("/prestadores").then(res=>{
            setPrestadores(res.data);
        });

    }, []);

    const cargarGuardias = () => {
        api.get("/calendario?desde=2026-03-01&hasta=2026-03-31")
        .then(res => {
            const eventosFormateados = res.data.map(g => ({
                id: g.id,
                title: g.prestador + " - " + g.paciente,
                start: g.fecha_hora_entrada,
                end: g.fecha_hora_salida,
                backgroundColor: colorPaciente(g.paciente),
                borderColor: colorPaciente(g.paciente)
            }));

            setEventos(eventosFormateados);

        });
    };

    const crearGuardia = (info) => {
        setInfoGuardia(info);
        setModal(true);
    };

    const moverGuardia = async(info) => {

        const id = info.event.id;

        const nuevaEntrada = info.event.start;
        const nuevaSalida = info.event.end;

        await api.put("/guardias/"+id, {
            fecha_hora_entrada:nuevaEntrada,
            fecha_hora_salida:nuevaSalida
        });

        alert("Guardia actualizada");

    };

    const colorPaciente = (nombre) => {

        const colores = [
            "#4CAF50",
            "#2196F3",
            "#FF9800",
            "#9C27B0",
            "#F44336",
            "#009688",
            "#3F51B5",
            "#795548"
        ];

        let hash = 0;

        for(let i = 0; i < nombre.length; i++){
            hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
        }

        const index = Math.abs(hash % colores.length);

        return colores[index];

    };

    const divStyle = {
        border: '2px solid #333', // Grosor, estilo y color
        borderRadius: '8px',        // Opcional: bordes redondeados
        padding: '10px',            // Opcional: espacio interno
        margin: '10px  auto',       // Opcional: espacio externo
        minWidth: '550px', maxWidth: '800px',
    };

    return(
        <div style={divStyle}>
            <h2>Calendario de Guardias</h2>
            <FullCalendar
                plugins = {[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                events={eventos}
                editable={true}
                selectable={true}
                select={crearGuardia}
                eventDrop={moverGuardia}
            />

            {modal &&

            <ModalGuardia
                info = {infoGuardia}
                cerrar = {() => setModal(false)}
                pacientes = {pacientes}
                prestadores = {prestadores}
                recargar = {cargarGuardias}
            />
            }
        </div>
    );

}

export default Calendario;