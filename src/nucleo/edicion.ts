/**
 * Writing without writing Markdown.
 *
 * The manuscript on disk is Markdown — that is the whole point, and it is not
 * negotiable: a book has to open in Obsidian and outlive this program. But
 * NOBODY SHOULD HAVE TO TYPE IT. A screen that shows you `# Capítulo primero`
 * where a chapter title belongs is a screen showing you the file format instead
 * of your book.
 *
 * So every mark this app can make is made from here, by a button or a shortcut,
 * and these functions are the whole of that logic — pure text in, pure text and
 * a caret position out. Pure on purpose: this is the part that can silently eat
 * a paragraph, and so it is the part worth testing hard.
 *
 * Every function returns where the caret should end up, because an editing
 * command that leaves the caret in the wrong place is one you have to undo by
 * hand, and after two of those you go back to typing the hashes.
 */

export interface Edicion {
  texto: string;
  /** Where the selection should sit afterwards. */
  desde: number;
  hasta: number;
}

/** The line containing `posicion`, as [start, end) offsets into `texto`. */
export function lineaEn(texto: string, posicion: number): [number, number] {
  const limite = Math.max(0, Math.min(posicion, texto.length));
  const inicio = texto.lastIndexOf("\n", limite - 1) + 1;
  const salto = texto.indexOf("\n", limite);
  return [inicio, salto === -1 ? texto.length : salto];
}

/** The heading level of a line (0 when it is prose). */
export function nivelDe(linea: string): number {
  return /^(#{1,6})\s/.exec(linea)?.[1]?.length ?? 0;
}

/**
 * Turn the current line into a heading of `nivel`, or back into prose when it
 * already is one — pressing "Capítulo" twice undoes it, which is what every
 * editor does and what a hand-typed `#` cannot.
 */
export function alternarTitulo(texto: string, posicion: number, nivel: number): Edicion {
  const [inicio, fin] = lineaEn(texto, posicion);
  const linea = texto.slice(inicio, fin);
  const actual = nivelDe(linea);
  const desnuda = linea.replace(/^#{1,6}\s+/, "");
  const siguiente = actual === nivel ? desnuda : `${"#".repeat(nivel)} ${desnuda}`;
  // Keep the caret where it was RELATIVE TO THE WORDS, not to the line: the
  // marks move under it and the writer must not have to find their place again.
  const dentro = Math.max(0, posicion - inicio - (linea.length - desnuda.length));
  const nuevoInicio = siguiente.length - desnuda.length;
  const caret = inicio + Math.min(nuevoInicio + dentro, siguiente.length);
  return {
    texto: texto.slice(0, inicio) + siguiente + texto.slice(fin),
    desde: caret,
    hasta: caret,
  };
}

/**
 * Wrap the selection in `marca` (bold, italic), or unwrap it when it already
 * is — including when the marks sit just OUTSIDE the selection, which is what
 * happens when you double-click a word and press Ctrl+B twice.
 *
 * With nothing selected it writes the pair and puts the caret between them, so
 * you can keep typing inside the emphasis.
 */
export function envolver(texto: string, desde: number, hasta: number, marca: string): Edicion {
  const seleccion = texto.slice(desde, hasta);
  const largo = marca.length;

  /**
   * How many of the mark's character run along an edge.
   *
   * Counting the RUN, not just testing the ends, is what tells `*` from `**`.
   * `startsWith("*")` is true of bold too, so italic-on-bold used to strip a
   * star off each side — press italic on **negrita** and you got *negrita*,
   * the opposite of what was asked. A selection counts as wrapped in this mark
   * only when its run is exactly this mark's length; anything longer is a
   * different (or compound) emphasis, and then we ADD ours.
   */
  const caracter = marca[0]!;
  const corrida = (cadena: string, paso: 1 | -1): number => {
    let n = 0;
    const desdeI = paso === 1 ? 0 : cadena.length - 1;
    while (cadena[desdeI + paso * n] === caracter) {
      n += 1;
    }
    return n;
  };

  if (
    seleccion.length >= largo * 2 &&
    corrida(seleccion, 1) === largo &&
    corrida(seleccion, -1) === largo
  ) {
    const dentro = seleccion.slice(largo, -largo);
    return {
      texto: texto.slice(0, desde) + dentro + texto.slice(hasta),
      desde,
      hasta: desde + dentro.length,
    };
  }

  const fuera =
    desde >= largo &&
    texto.slice(desde - largo, desde) === marca &&
    texto.slice(hasta, hasta + largo) === marca;
  if (fuera) {
    return {
      texto: texto.slice(0, desde - largo) + seleccion + texto.slice(hasta + largo),
      desde: desde - largo,
      // Relative to the NEW string: the opening mark has gone, so the selection
      // now starts `largo` earlier and runs its own length from there.
      hasta: desde - largo + seleccion.length,
    };
  }

  const puesto = `${marca}${seleccion}${marca}`;
  return {
    texto: texto.slice(0, desde) + puesto + texto.slice(hasta),
    desde: desde + largo,
    hasta: desde + largo + seleccion.length,
  };
}

/**
 * Start a new chapter after the one the caret is in.
 *
 * Appending at the very end would be wrong the moment a book has more than one
 * chapter and you are working in the middle of it: the new one belongs where
 * you are. The caret lands ON THE TITLE, empty and waiting, because the first
 * thing you do with a new chapter is name it.
 */
export function nuevoCapitulo(texto: string, posicion: number, titulo = ""): Edicion {
  const siguiente = /\n#{1,3}\s/.exec(texto.slice(posicion));
  const corte = siguiente ? posicion + siguiente.index + 1 : texto.length;
  const antes = texto.slice(0, corte).replace(/\s*$/, "");
  const despues = texto.slice(corte).replace(/^\s*/, "");
  const bloque = `# ${titulo}`;
  // The blank line belongs to what FOLLOWS the new chapter. Making it part of
  // the block itself left "# \n\n" dangling at the end of every book whose last
  // chapter this was — two blank lines the writer then has to delete.
  const cuerpo = `${antes}${antes ? "\n\n" : ""}${bloque}${despues ? `\n\n${despues}` : ""}`;
  const caret = (antes ? antes.length + 2 : 0) + bloque.length;
  return { texto: cuerpo, desde: caret, hasta: caret };
}

/**
 * A scene break: the "time passes" line inside a chapter.
 *
 * Written as `***` on its own line — the one separator every Markdown reader
 * and every word processor understands — and printed by the page as whatever
 * ornament the design asks for.
 */
export function nuevaEscena(texto: string, posicion: number): Edicion {
  const [, fin] = lineaEn(texto, posicion);
  const despues = texto.slice(fin).replace(/^\n+/, "");
  const antes = texto.slice(0, fin).replace(/\s*$/, "");
  const cuerpo = `${antes}\n\n***\n\n${despues}`;
  const caret = antes.length + 7; // past "\n\n***\n\n"
  return { texto: cuerpo, desde: caret, hasta: caret };
}

/**
 * What Enter should do inside a heading: leave it.
 *
 * Pressing Enter at the end of `# Capítulo uno` and getting a second heading
 * line is the single most annoying thing a Markdown editor does — you then
 * delete the hashes it helpfully typed. A heading is a heading, and what
 * follows a heading is always prose.
 *
 * Returns null when the default behaviour is correct, which is nearly always.
 */
export function enterTrasTitulo(texto: string, posicion: number): Edicion | null {
  const [inicio, fin] = lineaEn(texto, posicion);
  if (posicion !== fin || nivelDe(texto.slice(inicio, fin)) === 0) {
    return null;
  }
  const caret = fin + 2;
  return { texto: `${texto.slice(0, fin)}\n\n${texto.slice(fin)}`, desde: caret, hasta: caret };
}

/**
 * Spanish typography, applied as you type.
 *
 * A printed book uses « » for speech, — for dialogue and … for a trailing
 * thought, and a keyboard has none of them within reach. Typing "..." and
 * getting an ellipsis is the difference between a manuscript that looks set and
 * one that looks typed.
 *
 * Runs ONLY on the characters just typed, never over the whole text: a sweep of
 * the manuscript would eventually change something inside a quotation the
 * author wanted left alone.
 */
export function tipografia(texto: string, posicion: number): Edicion | null {
  const antes = texto.slice(Math.max(0, posicion - 3), posicion);

  const cambiar = (largo: number, por: string): Edicion => {
    const desde = posicion - largo;
    return {
      texto: texto.slice(0, desde) + por + texto.slice(posicion),
      desde: desde + por.length,
      hasta: desde + por.length,
    };
  };

  if (antes.endsWith("...")) {
    return cambiar(3, "…");
  }
  // Two hyphens at the start of a line is dialogue; anywhere else it is an
  // em dash in an aside. Both print as the same character in Spanish.
  if (antes.endsWith("--")) {
    return cambiar(2, "—");
  }
  if (antes.endsWith('<<')) {
    return cambiar(2, "«");
  }
  if (antes.endsWith(">>")) {
    return cambiar(2, "»");
  }
  return null;
}

/**
 * Where the caret should go to reach a chapter.
 *
 * Sending it to the heading's first character puts the view at the very top of
 * the chapter, which is what "go to chapter nine" means.
 */
export function irACapitulo(desde: number): { desde: number; hasta: number } {
  return { desde, hasta: desde };
}
