// Conversor mínimo de Markdown a HTML para el manual del proyecto.
// Cubre lo que usa docs/manual-usuario.md: títulos, párrafos, listas
// (con un nivel de anidamiento), tablas con alineación, bloques de código,
// citas, reglas horizontales, negritas, código en línea y enlaces.

const MARCA_CODIGO = /@@code(\d+)@@/g;

function escapar(texto) {
    return texto
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function inline(texto) {
    const codigos = [];

    let resultado = escapar(texto).replace(/`([^`]+)`/g, (_coincidencia, codigo) => {
        codigos.push(codigo);
        return `@@code${codigos.length - 1}@@`;
    });

    resultado = resultado.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

    resultado = resultado.replace(
        /\[([^\]]+)\]\(([^)\s]+)\)/g,
        '<a href="$2" target="_blank" rel="noreferrer">$1</a>'
    );

    return resultado.replace(MARCA_CODIGO, (_coincidencia, indice) => {
        return `<code>${codigos[Number(indice)]}</code>`;
    });
}

export function slug(texto) {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function celdas(linea) {
    return linea
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((celda) => celda.trim());
}

function alineacionCelda(valor) {
    if (valor.startsWith(":") && valor.endsWith(":")) {
        return "center";
    }

    if (valor.endsWith(":")) {
        return "right";
    }

    return "";
}

function esSeparadorTabla(linea) {
    return /^\|?[\s:|-]+\|?$/.test(linea.trim()) && linea.includes("-");
}

function renderizarTabla(encabezado, separador, filas) {
    const alineaciones = celdas(separador).map(alineacionCelda);

    const celda = (etiqueta, texto, indice) => {
        const alineacion = alineaciones[indice];

        return `<${etiqueta}${alineacion ? ` style="text-align:${alineacion}"` : ""}>${inline(texto)}</${etiqueta}>`;
    };

    const cabecera = celdas(encabezado)
        .map((texto, indice) => celda("th", texto, indice))
        .join("");

    const cuerpo = filas
        .map((fila) => {
            const celdasFila = celdas(fila)
                .map((texto, indice) => celda("td", texto, indice))
                .join("");

            return `<tr>${celdasFila}</tr>`;
        })
        .join("");

    return `<table><thead><tr>${cabecera}</tr></thead><tbody>${cuerpo}</tbody></table>`;
}

function renderizarLista(items) {
    let html = "";
    const pila = [];

    items.forEach((item) => {
        const actual = pila[pila.length - 1];

        if (!actual) {
            const inicio = item.tipo === "ol" && item.numero > 1
                ? ` start="${item.numero}"`
                : "";

            html += `<${item.tipo}${inicio}><li>${inline(item.texto)}`;
            pila.push({ indentacion: item.indentacion, tipo: item.tipo });
            return;
        }

        if (item.indentacion > actual.indentacion) {
            html += `<${item.tipo}><li>${inline(item.texto)}`;
            pila.push({ indentacion: item.indentacion, tipo: item.tipo });
            return;
        }

        if (item.indentacion < actual.indentacion) {
            while (pila.length > 1 && item.indentacion < pila[pila.length - 1].indentacion) {
                html += `</li></${pila.pop().tipo}>`;
            }

            if (item.tipo !== pila[pila.length - 1].tipo) {
                html += `</li></${pila.pop().tipo}>`;
                const inicio = item.tipo === "ol" && item.numero > 1
                    ? ` start="${item.numero}"`
                    : "";

                html += `<${item.tipo}${inicio}><li>${inline(item.texto)}`;
                pila.push({ indentacion: item.indentacion, tipo: item.tipo });
                return;
            }

            html += `</li><li>${inline(item.texto)}`;
            return;
        }

        if (item.tipo !== actual.tipo) {
            html += `</li></${pila.pop().tipo}>`;
            html += `<${item.tipo}><li>${inline(item.texto)}`;
            pila.push({ indentacion: item.indentacion, tipo: item.tipo });
            return;
        }

        html += `</li><li>${inline(item.texto)}`;
    });

    while (pila.length > 0) {
        html += `</li></${pila.pop().tipo}>`;
    }

    return html;
}

function patronItem(linea) {
    const desordenado = linea.match(/^(\s*)[-*]\s+(.*)$/);

    if (desordenado) {
        return {
            indentacion: desordenado[1].length,
            tipo: "ul",
            numero: 0,
            texto: desordenado[2]
        };
    }

    const ordenado = linea.match(/^(\s*)(\d+)\.\s+(.*)$/);

    if (ordenado) {
        return {
            indentacion: ordenado[1].length,
            tipo: "ol",
            numero: Number(ordenado[2]),
            texto: ordenado[3]
        };
    }

    return null;
}

export function renderMarkdown(markdown) {
    const lineas = markdown.replace(/\r\n/g, "\n").split("\n");
    const html = [];
    let parrafo = [];
    let indice = 0;

    const cerrarParrafo = () => {
        if (parrafo.length > 0) {
            html.push(`<p>${inline(parrafo.join(" "))}</p>`);
            parrafo = [];
        }
    };

    while (indice < lineas.length) {
        const linea = lineas[indice];
        const texto = linea.trim();

        if (texto === "") {
            cerrarParrafo();
            indice += 1;
            continue;
        }

        if (texto.startsWith("```")) {
            cerrarParrafo();

            const indentacion = linea.length - linea.trimStart().length;
            const lenguaje = texto.slice(3).trim();
            const buffer = [];
            indice += 1;

            while (indice < lineas.length && !lineas[indice].trim().startsWith("```")) {
                buffer.push(lineas[indice].slice(indentacion));
                indice += 1;
            }

            indice += 1;

            const clase = lenguaje ? ` class="language-${lenguaje}"` : "";

            html.push(
                `<pre><code${clase}>${escapar(buffer.join("\n"))}</code></pre>`
            );

            continue;
        }

        if (/^---+$/.test(texto)) {
            cerrarParrafo();
            html.push("<hr />");
            indice += 1;
            continue;
        }

        const titulo = texto.match(/^(#{1,6})\s+(.*)$/);

        if (titulo) {
            cerrarParrafo();

            const nivel = titulo[1].length;
            const contenido = inline(titulo[2]);
            const id = slug(titulo[2]);

            html.push(`<h${nivel} id="${id}">${contenido}</h${nivel}>`);
            indice += 1;
            continue;
        }

        if (
            texto.startsWith("|") &&
            indice + 1 < lineas.length &&
            esSeparadorTabla(lineas[indice + 1])
        ) {
            cerrarParrafo();

            const encabezado = texto;
            const separador = lineas[indice + 1];
            const filas = [];
            indice += 2;

            while (indice < lineas.length && lineas[indice].trim().startsWith("|")) {
                filas.push(lineas[indice]);
                indice += 1;
            }

            html.push(renderizarTabla(encabezado, separador, filas));
            continue;
        }

        if (texto.startsWith(">")) {
            cerrarParrafo();

            const buffer = [];

            while (indice < lineas.length && lineas[indice].trim().startsWith(">")) {
                buffer.push(lineas[indice].trim().replace(/^>\s?/, ""));
                indice += 1;
            }

            html.push(`<blockquote><p>${inline(buffer.join(" "))}</p></blockquote>`);
            continue;
        }

        const item = patronItem(linea);

        if (item) {
            cerrarParrafo();

            const items = [];

            while (indice < lineas.length) {
                const siguiente = patronItem(lineas[indice]);

                if (!siguiente) {
                    break;
                }

                items.push(siguiente);
                indice += 1;
            }

            html.push(renderizarLista(items));
            continue;
        }

        parrafo.push(texto);
        indice += 1;
    }

    cerrarParrafo();

    return html.join("\n");
}
