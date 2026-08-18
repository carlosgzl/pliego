/**
 * Turning a manuscript into the pieces a page is made of.
 *
 * Deliberately small: chapters, scenes, paragraphs and scene breaks — which is
 * what a book is made of and what an index can be built from. Anything else in
 * the file survives as text. It is the author's manuscript, not a markup
 * exercise.
 */

import { sinMarcas } from "./inline";

export interface Bloque {
  texto: string;
  /** 0 for a paragraph, 1..3 for a heading level, -1 for a scene break. */
  nivel: number;
  /** First paragraph after a heading or a break: no first-line indent. */
  primero: boolean;
  /** Where this block starts and ends in the prose, so the caret can be
   * followed: knowing which block the cursor is in is what lets the preview
   * show the page being written rather than page one for ever. */
  desde: number;
  hasta: number;
}

/** The line a writer types to mean "time passes". */
const SEPARADOR = /^\s*(\*\s*\*\s*\*|#{0,0}---+|~~~+|·\s*·\s*·)\s*$/;

export function partirEnBloques(cuerpo: string): Bloque[] {
  const bloques: Bloque[] = [];
  let acumulado: string[] = [];
  let inicio = 0;
  let fin = 0;
  let trasTitulo = true;
  let posicion = 0;

  const cerrarParrafo = () => {
    const texto = acumulado.join(" ").trim();
    acumulado = [];
    if (texto.length === 0) {
      return;
    }
    bloques.push({ texto, nivel: 0, primero: trasTitulo, desde: inicio, hasta: fin });
    trasTitulo = false;
  };

  for (const linea of cuerpo.split("\n")) {
    const arranque = posicion;
    posicion += linea.length + 1; // the newline that split() removed

    const titulo = /^(#{1,3})\s+(.*)$/.exec(linea);
    if (titulo) {
      cerrarParrafo();
      bloques.push({
        texto: titulo[2]!.trim(),
        nivel: titulo[1]!.length,
        primero: false,
        desde: arranque,
        hasta: posicion,
      });
      trasTitulo = true;
      continue;
    }

    if (SEPARADOR.test(linea)) {
      cerrarParrafo();
      bloques.push({ texto: "", nivel: -1, primero: false, desde: arranque, hasta: posicion });
      trasTitulo = true;
      continue;
    }

    if (linea.trim().length === 0) {
      cerrarParrafo();
      continue;
    }
    if (acumulado.length === 0) {
      inicio = arranque;
    }
    fin = posicion;
    acumulado.push(linea.trim());
  }
  cerrarParrafo();
  return bloques;
}

/**
 * How long the manuscript is, counted the way a writer counts.
 *
 * The heading marks are not words and neither is the front matter, so both come
 * off first; everything else separated by whitespace counts as one.
 */
export function contarPalabras(cuerpo: string): number {
  const limpio = cuerpo
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*(\*\s*\*\s*\*|---+|~~~+)\s*$/gm, "")
    .trim();
  return limpio.length === 0 ? 0 : limpio.split(/\s+/).length;
}

/** Letters, for the writers who count those instead. */
export function contarCaracteres(cuerpo: string): number {
  return cuerpo.replace(/\s+/g, " ").trim().length;
}

/**
 * Minutes of reading, at 250 words a minute.
 *
 * The figure is the usual publishing rule of thumb for adult prose in Spanish
 * and English alike. It is an estimate and the app says so.
 */
export function minutosDeLectura(palabras: number): number {
  return Math.max(1, Math.round(palabras / 250));
}

export interface Capitulo {
  titulo: string;
  /** Offset in the prose where its heading starts, so the caret can be sent there. */
  desde: number;
  palabras: number;
  /** 1-based, for the chapters that were never given a name. */
  numero: number;
  /** Scene breaks inside it — a rough measure of how built it is. */
  escenas: number;
}

/**
 * The book's chapters, with how long each one is.
 *
 * Only `#` counts. `##` is a scene inside a chapter, and putting those here
 * would turn a nine-line list into a sixty-line one. Word counts come along
 * because they are the question a writer actually asks of a chapter list:
 * "which one is thin?".
 */
export function capitulosDe(bloques: Bloque[]): Capitulo[] {
  const capitulos: Capitulo[] = [];
  for (const bloque of bloques) {
    if (bloque.nivel === 1) {
      capitulos.push({
        // Without this the list printed `La **tormenta**` — the one place the
        // writer looks to find a chapter is the last place to show them the
        // file format.
        titulo: sinMarcas(bloque.texto).trim(),
        desde: bloque.desde,
        palabras: 0,
        numero: capitulos.length + 1,
        escenas: 1,
      });
      continue;
    }
    const actual = capitulos[capitulos.length - 1];
    if (!actual) {
      continue;
    }
    if (bloque.nivel === 0) {
      actual.palabras += contarPalabras(bloque.texto);
    } else if (bloque.nivel === -1) {
      actual.escenas += 1;
    }
  }
  return capitulos;
}

/** Which block a cursor position falls in (-1 when there is nothing there). */
export function bloqueEnPosicion(bloques: Bloque[], posicion: number): number {
  for (let i = bloques.length - 1; i >= 0; i -= 1) {
    if (posicion >= bloques[i]!.desde) {
      return i;
    }
  }
  return bloques.length > 0 ? 0 : -1;
}

const ROMANOS: [number, string][] = [
  [1000, "m"],
  [900, "cm"],
  [500, "d"],
  [400, "cd"],
  [100, "c"],
  [90, "xc"],
  [50, "l"],
  [40, "xl"],
  [10, "x"],
  [9, "ix"],
  [5, "v"],
  [4, "iv"],
  [1, "i"],
];

export function aRomano(numero: number): string {
  let resto = Math.max(0, Math.floor(numero));
  let salida = "";
  for (const [valor, letra] of ROMANOS) {
    while (resto >= valor) {
      salida += letra;
      resto -= valor;
    }
  }
  return salida;
}

const PALABRAS = [
  "cero",
  "uno",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve",
  "diez",
  "once",
  "doce",
  "trece",
  "catorce",
  "quince",
  "dieciséis",
  "diecisiete",
  "dieciocho",
  "diecinueve",
  "veinte",
];

/** «Capítulo doce». Past twenty it falls back to the figure, which is what a
 * book does too rather than printing «cuarenta y siete». */
export function enPalabras(numero: number): string {
  return PALABRAS[numero] ?? String(numero);
}
