import { useEffect,useState } from "react";
import api from "../services/api";

function Guardias() {
    const [guardias,setGuardias] = useState([]);
    useEffect(() => {
        api.get("/guardias").then(res => {
            setGuardias(res.data);
        });
    }, []);
    
    return(
        <div>
            <h2>Guardias</h2>
            <table>
                <thead>
                    <tr>
                        <th>Paciente</th>
                        <th>Prestador</th>
                        <th>Entrada</th>
                        <th>Salida</th>
                    </tr>
                </thead>
                <tbody>
                    {guardias.map(g=>(
                    <tr key={g.id}>
                        <td>{g.paciente}</td>
                        <td>{g.prestador}</td>
                        <td>{g.fecha_hora_entrada}</td>
                        <td>{g.fecha_hora_salida}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );

}

export default Guardias;