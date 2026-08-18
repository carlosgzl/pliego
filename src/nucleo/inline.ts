/**
 * The marks inside a paragraph: bold and italic. Nothing else.
 *
 * WHY SO FEW. A book is prose. Links, code, tables, images and the rest of
 * Markdown are not what this is for, and every one added here is another thing
 * that can render wrongly in the middle of somebody's novel. Two marks — plus
 * the emphasis of both together — is what a printed page actually uses.
 *
 * WHY IT MUST EXIST AT ALL: the composed page prints paragraphs as text, so
 * without this a "bold" button would put `**palabra**` on the page, asterisks
 * and all. A button that shows you the file format is worse than no button.
 *
 * Compatible with Alexandria's reader, which parses the same two marks.
 */

export interface Trozo {
  texto: string;
  fuerte: boolean;
  cursiva: boolean;
}

/**
 * Split a line into runs of plain / bold / italic.
 *
 * `***así***` is bold AND italic, which is why the pattern tries three stars
 * first: matching `**` first would leave a stray star at each end.
 *
 * An unclosed mark stays literal text — a lone `*` in a sentence is far more
 * likely a typo or an actual asterisk than an emphasis somebody forgot to
 * close, and eating the rest of the paragraph over it is unforgivable.
 */
export function trozos(linea: string): Trozo[] {
  const salida: Trozo[] = [];
  const patron = /(\*\*\*)(.+?)\1|(\*\*)(.+?)\3|(\*)([^*]+?)\5|(_)([^_]+?)\7/g;
  let ultimo = 0;

  for (let hallazgo = patron.exec(linea); hallazgo; hallazgo = patron.exec(linea)) {
    if (hallazgo.index > ultimo) {
      salida.push({ texto: linea.slice(ultimo, hallazgo.index), fuerte: false, cursiva: false });
    }
    const [, tres, textoTres, dos, textoDos, , textoUno, , textoGuion] = hallazgo;
    if (tres) {
      salida.push({ texto: textoTres!, fuerte: true, cursiva: true });
    } else if (dos) {
      salida.push({ texto: textoDos!, fuerte: true, cursiva: false });
    } else {
      salida.push({ texto: (textoUno ?? textoGuion)!, fuerte: false, cursiva: true });
    }
    ultimo = patron.lastIndex;
  }

  if (ultimo < linea.length) {
    salida.push({ texto: linea.slice(ultimo), fuerte: false, cursiva: false });
  }
  return salida.length > 0 ? salida : [{ texto: linea, fuerte: false, cursiva: false }];
}

/**
 * The same line with the marks removed and nothing else changed.
 *
 * For the places that can only hold plain text — the chapter list, the index's
 * dotted leader, the shelf card — where `La **tormenta**` is exactly the leak
 * this module exists to stop.
 */
export function sinMarcas(linea: string): string {
  return trozos(linea)
    .map((trozo) => trozo.texto)
    .join("");
}
