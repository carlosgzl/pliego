/**
 * El manuscrito: un textarea que no parece un textarea.
 *
 * EL PROBLEMA. El archivo es Markdown y tiene que seguir siéndolo, pero quien
 * escribe y ve `# Capítulo primero` y `la **tormenta**` está leyendo el formato
 * del archivo en lugar de su libro. Los botones que ponen las marcas por ti son
 * solo media solución: las marcas siguen siendo lo que más grita en la página.
 *
 * LA SOLUCIÓN, y por qué es esta. Detrás de un textarea transparente hay un
 * espejo del mismo texto, compuesto con exactamente las mismas métricas, donde
 * los caracteres de sintaxis se pintan al 18 % y las palabras a tinta entera.
 * Ves prosa; las marcas siguen ahí, se siguen seleccionando y se siguen
 * borrando de un retroceso, pero han dejado de dar voces.
 *
 * LA REGLA DE LA QUE DEPENDE TODO: el espejo y el textarea tienen que cortar
 * las líneas EN EL MISMO SITIO, o el cursor se despega de las letras. Por eso
 * el resaltado solo cambia el COLOR — nunca el tamaño, nunca el grosor, nunca
 * el espaciado. Una negrita que se pintara de verdad sería más ancha que el
 * texto de debajo y todas las líneas siguientes irían mal. La negrita y la
 * cursiva viven en la página compuesta de al lado, que es donde un escritor las
 * busca de todas formas.
 *
 * POR QUÉ VA PARTIDO EN LÍNEAS MEMORIZADAS. Antes el espejo entero se volvía a
 * construir en cada tecla: en una novela son decenas de miles de <span> que
 * React tiene que comparar sesenta veces por segundo mientras alguien escribe,
 * y se notaba en los dedos. Una línea es una unidad natural aquí —el corte de
 * párrafo, el título, la escena— así que cada una es su propio componente
 * memorizado y una tecla solo repinta la línea en la que está el cursor.
 *
 * El modo foco va montado en el mismo espejo: el párrafo donde está el cursor
 * se queda a tinta entera y todo lo demás retrocede, que es algo que un
 * textarea a secas no puede hacer.
 */

import { memo, useMemo, type CSSProperties, type ReactNode } from "react";

/**
 * Pasado este número de caracteres se retira el espejo y el textarea enseña su
 * propio texto. Repintar una novela entera de <span> en cada tecla costaría más
 * de lo que cuestan las marcas — y a esa longitud quien escribe hace mucho que
 * dejó de verlas.
 */
export const TOPE_RESALTADO = 200_000;

export interface ManuscritoProps {
  valor: string;
  /** Dónde está el cursor, para el modo foco. */
  cursor: number;
  foco: boolean;
  estilo: CSSProperties;
}

export function Resaltado({ valor, cursor, foco, estilo }: ManuscritoProps) {
  const lineas = useMemo(() => valor.split("\n"), [valor]);

  /* Qué líneas quedan encendidas: las del párrafo del cursor. Se calcula con
     los desplazamientos de cada línea, no con una búsqueda por línea, para que
     mover el cursor no cueste más que escribir. */
  const encendidas = useMemo(() => {
    if (!foco) {
      return null;
    }
    const [desde, hasta] = parrafoDe(valor, cursor);
    const dentro: boolean[] = [];
    let posicion = 0;
    for (const linea of lineas) {
      const fin = posicion + linea.length;
      dentro.push(fin > desde && posicion < hasta);
      posicion = fin + 1; // el "\n"
    }
    return dentro;
  }, [foco, valor, cursor, lineas]);

  /*
   * Pasado el tope se retira el espejo entero, y el campo enseña su texto.
   *
   * Se probó a dejar aquí un «espejo mudo» —sin <span> y en tinta invisible—
   * para que siguiera dando la altura y no hubiera que medir el campo desde
   * JavaScript. MEDIDO EN COMPILACIÓN DE PRODUCCIÓN, sobre 210 000 caracteres:
   * 116 ms por tecla con espejo mudo contra 93 ms midiendo a mano. Componer un
   * segundo bloque de doscientas mil letras cuesta más que los dos recálculos
   * del campo. Así que a partir de aquí manda el efecto de altura del Taller.
   */
  if (valor.length > TOPE_RESALTADO) {
    return null;
  }

  return (
    <pre className="manuscrito__espejo" style={estilo} aria-hidden="true">
      {lineas.map((linea, indice) => (
        <Linea
          // eslint-disable-next-line react/no-array-index-key
          key={indice}
          texto={linea}
          apagada={encendidas ? !encendidas[indice] : false}
          salto={indice < lineas.length - 1}
        />
      ))}
      {/* Un <pre> se traga un salto de línea final; sin esto el espejo mide una
          línea menos en cuanto pulsas Enter al final y todo lo que hay bajo el
          cursor sube de golpe. */}
      {"\n"}
    </pre>
  );
}

/**
 * Una línea del espejo.
 *
 * Memorizada: sus tres propiedades son primitivas, así que React se salta la
 * línea que no ha cambiado, que en una novela son todas menos una.
 */
const Linea = memo(function Linea({
  texto,
  apagada,
  salto,
}: {
  texto: string;
  apagada: boolean;
  salto: boolean;
}) {
  const partes: ReactNode[] = [];
  let clave = 0;

  const empujar = (contenido: string, tipo: "texto" | "marca") => {
    if (contenido.length === 0) {
      return;
    }
    /* "sintaxis", no "marca": la estantería ya usa `.marca` para su rótulo y es
       un contenedor flex, así que reutilizar el nombre convertía cada `# ` en
       un bloque y echaba el título del capítulo a una línea aparte. */
    const clases = [tipo === "marca" ? "sintaxis" : null, apagada ? "apagado" : null]
      .filter(Boolean)
      .join(" ");
    partes.push(
      clases ? (
        <span key={clave++} className={clases}>
          {contenido}
        </span>
      ) : (
        <span key={clave++}>{contenido}</span>
      ),
    );
  };

  const titulo = /^(#{1,6}\s)(.*)$/.exec(texto);
  if (titulo) {
    empujar(titulo[1]!, "marca");
    pintarLinea(titulo[2]!, empujar);
  } else if (/^\s*(\*\s*\*\s*\*|---+|~~~+)\s*$/.test(texto)) {
    empujar(texto, "marca");
  } else {
    pintarLinea(texto, empujar);
  }

  return (
    <>
      {partes}
      {salto ? "\n" : null}
    </>
  );
});

/** Dónde empieza y dónde acaba el párrafo en el que está el cursor. */
function parrafoDe(texto: string, cursor: number): [number, number] {
  const limite = Math.max(0, Math.min(cursor, texto.length));
  const antes = texto.lastIndexOf("\n\n", Math.max(0, limite - 1));
  const despues = texto.indexOf("\n\n", limite);
  return [antes === -1 ? 0 : antes + 2, despues === -1 ? texto.length : despues];
}

/**
 * Los asteriscos de énfasis dentro de una línea.
 *
 * Deliberadamente simple: las almohadillas de título al principio de línea, los
 * asteriscos, y la línea de corte de escena. Son las únicas marcas que escribe
 * esta aplicación, así que son las únicas que merece la pena apagar — y un
 * resaltador que quisiera ser un intérprete de Markdown completo acabaría no
 * estando de acuerdo con el compositor sobre qué significa algo, que es peor
 * que no resaltar nada.
 */
function pintarLinea(
  linea: string,
  empujar: (contenido: string, tipo: "texto" | "marca") => void,
): void {
  const patron = /(\*{1,3})(.+?)\1/g;
  let ultimo = 0;
  for (let hallazgo = patron.exec(linea); hallazgo; hallazgo = patron.exec(linea)) {
    empujar(linea.slice(ultimo, hallazgo.index), "texto");
    empujar(hallazgo[1]!, "marca");
    empujar(hallazgo[2]!, "texto");
    empujar(hallazgo[1]!, "marca");
    ultimo = patron.lastIndex;
  }
  empujar(linea.slice(ultimo), "texto");
}
