import { useMemo } from "react";
import common from "../styles/common.module.css";
import styles from "./ManualDocumento.module.css";
import { renderMarkdown, slug } from "../utils/markdown";

function ManualDocumento({ contenido, nota }) {
    const html = useMemo(() => renderMarkdown(contenido), [contenido]);

    const secciones = useMemo(() => {
        return contenido
            .split("\n")
            .map((linea) => linea.match(/^##\s+(.+)$/))
            .filter(Boolean)
            .map((coincidencia) => {
                const titulo = coincidencia[1].replace(/\*\*/g, "").trim();

                return { titulo, id: slug(titulo) };
            });
    }, [contenido]);

    return (
        <div className={common.page}>
            <div className={styles.barra}>
                <span className={common.muted}>{nota}</span>
                <button
                    type="button"
                    className={common.btnPrimary}
                    onClick={() => window.print()}
                >
                    Imprimir / Guardar PDF
                </button>
            </div>

            <nav className={styles.indice} aria-label="Contenido del manual">
                <h2>Contenido</h2>
                <ol>
                    {secciones.map((seccion) => (
                        <li key={seccion.id}>
                            <a href={`#${seccion.id}`}>{seccion.titulo}</a>
                        </li>
                    ))}
                </ol>
            </nav>

            <article
                className={styles.documento}
                dangerouslySetInnerHTML={{ __html: html }}
            />
        </div>
    );
}

export default ManualDocumento;
