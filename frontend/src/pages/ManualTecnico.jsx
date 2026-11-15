import contenidoManual from "../../../docs/manual-tecnico.md?raw";
import ManualDocumento from "../components/ManualDocumento";

function ManualTecnico() {
    return (
        <ManualDocumento
            contenido={contenidoManual}
            nota="Manual técnico · documentación para programadores"
        />
    );
}

export default ManualTecnico;
