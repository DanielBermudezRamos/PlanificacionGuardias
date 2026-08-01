import { useState } from "react";
import api from "../services/api";

function ModalGuardia({ info, cerrar, pacientes, prestadores, recargar }) {
  const [paciente, setPaciente] = useState("");
  const [prestador, setPrestador] = useState("");
  const [prestadoresFiltrados,setPrestadoresFiltrados] = useState([]);
  const [conflicto,setConflicto] = useState(false);
  const guardar = async () => {

    try {
        // buscar asignación correcta
        const asignacion = await api.get("/asignaciones/buscar",{
            params:{
                paciente_id:paciente,
                prestador_id:prestador
            }
        });

        const asignacion_id = asignacion.data.id;

        // crear guardia
        await api.post("/guardias",{
            asignacion_id,
            coordinador_id:1,
            fecha_hora_entrada: info.startStr,
            fecha_hora_salida: info.endStr
        });

        recargar();
        cerrar();

    } catch(error){
        console.log(error.response?.data);
        alert("No existe asignación entre ese paciente y prestador");
    }
  };

    return (
        <div style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "#00000080",
                zIndex: 9999,
            }}
        >
        <div style={{
            background: "white",
            padding: "20px",
            width: "400px",
            margin: "100px auto",
        }}
        >
        <h3>Nueva Guardia</h3>
        <p>Inicio: {info.startStr}</p>
        <p>Fin: {info.endStr}</p>

        <select onChange={ async e => {
          const pacienteId = e.target.value;
          setPaciente(pacienteId);

          // 👇 llamar backend
          const res = await api.get("/asignaciones/prestadores", {
            params:{paciente_id:pacienteId}
          });
          setPrestadoresFiltrados(res.data);
        }}>
          <option value="">Seleccionar paciente</option>
          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>

        <br />
        <br />

        <select 
          disabled={!paciente} 
          onChange={async e=>{
            const prestadorId = e.target.value;

            setPrestador(prestadorId);

            // 🔴 verificar conflicto
            const res = await api
              .get("/guardias/verificar-conflicto",{
                params:{
                  prestador_id:prestadorId,
                  fecha_hora_entrada: info.startStr,
                  fecha_hora_salida: info.endStr
                }
              });

            setConflicto(res.data.conflicto);

          }}
        >
          <option value="">Seleccionar Prestador</option>

            <optgroup label="Asignados al paciente"> {
              prestadoresFiltrados
                .filter(p=>p.tipo==="asignado")
                .map(p=>(
                  <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </optgroup>

            <optgroup label="Otros disponibles">{
              prestadoresFiltrados
                .filter(p=>p.tipo==="disponible")
                .map(p=>(
                  <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </optgroup>
        </select>
        {conflicto && (
          <p style={{color:"red"}}>
          ⚠️ Este prestador ya tiene una guardia en ese horario
          </p>
        )}
        <br />
        <br />
        <button onClick={guardar} disabled={conflicto}>Guardar</button>
        <button onClick={cerrar}>Cancelar</button>
      </div>
    </div>
  );
}

export default ModalGuardia;
