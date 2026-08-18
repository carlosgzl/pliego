/**
 * The furniture of a printed page: folios, running heads, chapter openers and
 * the mark between scenes.
 *
 * These are conventions, not preferences — a verso carries the author and a
 * recto the title because that is what tells a reader which half of the spread
 * they are on. The design panel can turn each of them off; what it cannot do is
 * put them somewhere a book would not.
 */

import { aRomano, enPalabras } from "./bloques";
import type { Diseno, Meta } from "./libro";

/** The folio as the book prints it: arabic, roman, or none at all. */
export function folioDe(pagina: number, diseno: Diseno): string {
  if (diseno.numeracion === "ninguna") {
    return "";
  }
  return diseno.numeracion === "romanos" ? aRomano(pagina) : String(pagina);
}

/**
 * The running head.
 *
 * A book with no author on the cover would print a blank left-hand head, so
 * that case falls back to the title rather than leaving half the pages bare.
 * Returns "" when the design asks for no head, which is the caller's cue to
 * draw nothing at all — not an empty line that still takes its space.
 */
export function cornisaDe(pagina: number, meta: Meta, capitulo?: string): string {
  const { encabezado } = meta.diseno;
  if (encabezado === "ninguno") {
    return "";
  }
  const titulo = meta.titulo.trim();
  if (encabezado === "titulo") {
    return titulo;
  }
  if (encabezado === "capitulo") {
    // Verso keeps the title so the spread still names the book; recto carries
    // the chapter, which is the thing you flip pages looking for.
    return pagina % 2 === 0 ? titulo : (capitulo?.trim() || titulo);
  }
  const autor = meta.autor.trim();
  return pagina % 2 === 0 ? autor || titulo : titulo;
}

/** Which side of the page the folio hangs on, for the layout to place it. */
export type LadoFolio = "centro" | "izquierda" | "derecha";

export function ladoFolio(pagina: number, diseno: Diseno): LadoFolio {
  if (diseno.folio === "pie-centro") {
    return "centro";
  }
  // "Fuera" is the outer edge: left on a verso, right on a recto.
  return pagina % 2 === 0 ? "izquierda" : "derecha";
}

export function folioArriba(diseno: Diseno): boolean {
  return diseno.folio === "cabeza-fuera";
}

/** The line printed above a chapter title, or "" when the design wants none. */
export function numeroCapituloDe(numero: number, diseno: Diseno): string {
  switch (diseno.numeroCapitulo) {
    case "romano":
      return aRomano(numero).toUpperCase();
    case "arabigo":
      return String(numero);
    case "palabra":
      return `Capítulo ${enPalabras(numero)}`;
    default:
      return "";
  }
}

/** What to print where a scene break falls. "" means real white space. */
export function dinkusDe(diseno: Diseno): string {
  switch (diseno.dinkus) {
    case "asteriscos":
      return "* * *";
    case "rombo":
      return "◆";
    case "regla":
      return "———";
    default:
      return "";
  }
}

/**
 * Whether a chapter has to start on a right-hand page.
 *
 * "pagina-impar" is how a printed book does it, and it means the composer
 * sometimes inserts a blank verso. The galley needs to know so the page count
 * it reports is the one the printer would give.
 */
export function abreEnImpar(diseno: Diseno): boolean {
  return diseno.capituloEn === "pagina-impar";
}
