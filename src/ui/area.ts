/**
 * Hablarle al <textarea> como le habla el teclado, y no como le habla React.
 *
 * EL FALLO QUE ARREGLA ESTO ERA EL PEOR DE TODOS, y era invisible: **Ctrl+Z
 * dejaba de funcionar mientras escribías**. Cada vez que la aplicación tocaba
 * el texto —negrita, cursiva, convertir en capítulo, y sobre todo la
 * tipografía automática, que salta sola al escribir `...` o `--`— lo hacía
 * poniendo el valor nuevo por estado de React. Para el navegador eso no es una
 * edición: es que alguien ha sustituido el contenido entero. Y cuando eso pasa,
 * **el navegador tira su historial de deshacer a la basura**.
 *
 * O sea: escribes tres puntos, el programa los convierte en puntos suspensivos
 * —que está muy bien— y a cambio pierdes todo lo que podías deshacer del último
 * rato. En una sesión de escritura eso pasa cada dos párrafos. No es raro que
 * escribir aquí no diera gusto.
 *
 * LA FORMA CORRECTA es pedirle al navegador que haga la edición él, con
 * `execCommand("insertText")`, que es la única puerta que queda para escribir
 * en un campo de texto **como si lo hubiera escrito una persona**: entra en la
 * pila de deshacer, respeta el corrector, respeta el IME y dispara el evento
 * `input` que React ya estaba escuchando.
 *
 * Y se sustituye SOLO EL TROZO QUE CAMBIA, no todo el texto: si el manuscrito
 * son doscientas mil letras y la edición mete dos asteriscos, deshacer tiene
 * que devolver esos dos asteriscos, no doscientas mil letras. Por eso lo
 * primero que hace esto es buscar el prefijo y el sufijo comunes.
 *
 * Si el navegador dice que no —`execCommand` está obsoleto y algún día se irá—
 * devuelve `false` y quien llama vuelve al camino de siempre. Se pierde el
 * deshacer fino, no el texto.
 */

import type { Edicion } from "@/nucleo/edicion";

/** El trozo que de verdad cambia entre dos textos: [desde, hastaViejo, hastaNuevo]. */
export function trozoQueCambia(viejo: string, nuevo: string): [number, number, number] {
  let inicio = 0;
  const tope = Math.min(viejo.length, nuevo.length);
  while (inicio < tope && viejo.charCodeAt(inicio) === nuevo.charCodeAt(inicio)) {
    inicio += 1;
  }
  let finViejo = viejo.length;
  let finNuevo = nuevo.length;
  while (
    finViejo > inicio &&
    finNuevo > inicio &&
    viejo.charCodeAt(finViejo - 1) === nuevo.charCodeAt(finNuevo - 1)
  ) {
    finViejo -= 1;
    finNuevo -= 1;
  }
  return [inicio, finViejo, finNuevo];
}

/**
 * Aplica una edición conservando el deshacer del navegador.
 *
 * Devuelve `true` si se hizo así. `false` significa «hazlo tú por estado», y
 * entonces el deshacer de ese paso se pierde pero el texto no.
 */
export function aplicarConDeshacer(area: HTMLTextAreaElement, edicion: Edicion): boolean {
  const viejo = area.value;
  if (viejo === edicion.texto) {
    area.setSelectionRange(edicion.desde, edicion.hasta);
    return true;
  }

  const [inicio, finViejo, finNuevo] = trozoQueCambia(viejo, edicion.texto);
  const puesto = edicion.texto.slice(inicio, finNuevo);

  // `execCommand` exige que el campo tenga el foco; si no, no hace nada y
  // devuelve true igualmente en algunos navegadores.
  if (document.activeElement !== area) {
    area.focus({ preventScroll: true });
  }
  area.setSelectionRange(inicio, finViejo);

  let hecho = false;
  try {
    hecho =
      puesto.length > 0
        ? document.execCommand("insertText", false, puesto)
        : document.execCommand("delete");
  } catch {
    hecho = false;
  }

  if (!hecho || area.value !== edicion.texto) {
    return false;
  }
  area.setSelectionRange(edicion.desde, edicion.hasta);
  return true;
}

/* ── Dónde está el cursor, en píxeles ─────────────────────────────────────── */

/**
 * Un <div> gemelo, escondido, con las MISMAS métricas que el campo.
 *
 * Un textarea no dice a qué altura está su cursor, y sin ese dato no se puede
 * mantener la línea que escribes a media pantalla: lo que había antes contaba
 * saltos de línea (`\n`), que es contar párrafos, no líneas. Con una medida de
 * sesenta y ocho caracteres un párrafo son ocho o diez líneas en pantalla, así
 * que el «centro» calculado así se equivocaba por media pantalla larga y el
 * texto pegaba tirones.
 *
 * La técnica es la conocida: se copia el texto hasta el cursor en un gemelo con
 * la misma letra, el mismo ancho y el mismo interlineado, se le pone una marca
 * al final y se pregunta por su posición. El gemelo es uno solo y se reutiliza.
 */
let gemelo: HTMLDivElement | null = null;

const COPIAR = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "letterSpacing",
  "lineHeight",
  "textTransform",
  "wordSpacing",
  "textIndent",
  "whiteSpace",
  "overflowWrap",
  "wordBreak",
  "tabSize",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "boxSizing",
] as const;

/** La altura del cursor dentro del campo, en píxeles desde su borde superior. */
export function altoDelCursor(area: HTMLTextAreaElement): { arriba: number; alto: number } {
  if (!gemelo) {
    gemelo = document.createElement("div");
    gemelo.setAttribute("aria-hidden", "true");
    gemelo.style.position = "absolute";
    gemelo.style.visibility = "hidden";
    gemelo.style.top = "0";
    gemelo.style.left = "-9999px";
    gemelo.style.pointerEvents = "none";
    document.body.appendChild(gemelo);
  }

  const estilo = window.getComputedStyle(area);
  for (const propiedad of COPIAR) {
    gemelo.style[propiedad] = estilo[propiedad];
  }
  gemelo.style.width = `${area.clientWidth}px`;

  const hasta = area.selectionStart;
  gemelo.textContent = area.value.slice(0, hasta);
  const marca = document.createElement("span");
  /* Un cero de ancho cero: sin algo dentro, el <span> mide cero de alto en una
     línea vacía y el cursor «salta» al final de un párrafo. */
  marca.textContent = "​";
  gemelo.appendChild(marca);

  const alto = Number.parseFloat(estilo.lineHeight) || area.clientHeight;
  return { arriba: marca.offsetTop, alto: Number.isFinite(alto) ? alto : 24 };
}
