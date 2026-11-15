import contenidoManual from "../../../docs/manual-usuario.md?raw";
import ManualDocumento from "../components/ManualDocumento";

function Manual() {
    return (
        <ManualDocumento
            contenido={contenidoManual}
            nota="Manual de usuario · se actualiza junto con la aplicación"
        />
    );
}

export default Manual;
