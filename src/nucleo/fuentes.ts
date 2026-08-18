/**
 * The typefaces a book can be set in.
 *
 * THE KEYS ARE A SHARED CONTRACT. They are written into the file's front matter
 * and Alexandria reads the same files with its own copy of this table, so a key
 * that exists here and not there lays the book out in the fallback face. The
 * first twelve keys below are exactly Alexandria's, in the same order and with
 * the same stacks; anything added after them is a Scriptorium extra and
 * degrades to the fallback elsewhere, which is fine — but never CHANGE one.
 *
 * These are all system faces on purpose. A web font is a request that can fail,
 * and a book that reflows because a font arrived late is a book whose page
 * count you cannot trust. What is installed is what is used, and the stack
 * names several so the same book looks close to right on Windows and on a Mac.
 */

export interface Fuente {
  key: string;
  name: string;
  hint: string;
  /** Which shelf of the picker it belongs to. */
  grupo: "libro" | "moderna" | "maquina" | "display";
  stack: string;
  /** True when the face carries real small caps and old-style figures well. */
  fina?: boolean;
}

export const FUENTES: Fuente[] = [
  /* ── Shared with Alexandria (do not reorder or edit the stacks) ─────────── */
  {
    key: "garamond",
    name: "Garamond",
    hint: "Renacentista, suave. La cara de una novela.",
    grupo: "libro",
    stack: '"EB Garamond", Garamond, "Adobe Garamond Pro", "Book Antiqua", Georgia, serif',
    fina: true,
  },
  {
    key: "biblioteca",
    name: "Iowan",
    hint: "Serif editorial de mucho cuerpo, cómoda de leer.",
    grupo: "libro",
    stack: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
    fina: true,
  },
  {
    key: "pluma",
    name: "Baskerville",
    hint: "Imprenta inglesa: clara, un punto formal.",
    grupo: "libro",
    stack:
      'Baskerville, "Baskerville Old Face", "Libre Baskerville", "Book Antiqua", Palatino, serif',
    fina: true,
  },
  {
    key: "elegante",
    name: "Didona",
    hint: "Alto contraste, de revista. Luce en títulos.",
    grupo: "libro",
    stack: 'Didot, "Bodoni MT", "Playfair Display", Constantia, "Times New Roman", serif',
  },
  {
    key: "clasica",
    name: "Georgia",
    hint: "Serif pensada para pantalla. Nunca falla.",
    grupo: "libro",
    stack: 'Georgia, Cambria, "Times New Roman", serif',
  },
  {
    key: "losa",
    name: "De losa",
    hint: "Remate cuadrado. Manuales y ensayo técnico.",
    grupo: "libro",
    stack: 'Rockwell, "Roboto Slab", "Bookman Old Style", "Courier New", Georgia, serif',
  },
  {
    key: "moderna",
    name: "Moderna",
    hint: "La sans del sistema, limpia y neutra.",
    grupo: "moderna",
    stack: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  {
    key: "humanista",
    name: "Humanista",
    hint: "Sans cálida, de trazo escrito.",
    grupo: "moderna",
    stack: 'Seravek, "Segoe UI", Verdana, Tahoma, "Trebuchet MS", sans-serif',
  },
  {
    key: "candida",
    name: "Cándida",
    hint: "Sans redondeada y amable.",
    grupo: "moderna",
    stack: 'Candara, Optima, "Gill Sans", "Segoe UI", Verdana, sans-serif',
  },
  {
    key: "compacta",
    name: "Compacta",
    hint: "Condensada: cabe más línea en menos ancho.",
    grupo: "moderna",
    stack: '"Avenir Next Condensed", "Arial Narrow", "Roboto Condensed", Arial, sans-serif',
  },
  {
    key: "maquina",
    name: "Máquina",
    hint: "Monoespaciada. Para guiones y borradores.",
    grupo: "maquina",
    stack: '"Cascadia Code", Consolas, "JetBrains Mono", "Courier New", monospace',
  },
  {
    key: "gotica",
    name: "Gótica",
    hint: "Letra quebrada de códice. Con cuidado.",
    grupo: "display",
    stack:
      '"Old English Text MT", "Blackadder ITC", Luminari, "UnifrakturMaguntia", "Iowan Old Style", Georgia, serif',
  },

  /* ── Scriptorium's own ──────────────────────────────────────────────────── */
  {
    key: "caslon",
    name: "Caslon",
    hint: "«Cuando dudes, usa Caslon». Cálida y sin ruido.",
    grupo: "libro",
    stack: '"Big Caslon", "Adobe Caslon Pro", "Libre Caslon Text", Georgia, serif',
    fina: true,
  },
  {
    key: "minion",
    name: "Cambria",
    hint: "Robusta y estrecha: aprovecha bien la caja.",
    grupo: "libro",
    stack: 'Cambria, "Minion Pro", Constantia, Georgia, serif',
    fina: true,
  },
  {
    key: "charter",
    name: "Charter",
    hint: "Diseñada para imprimir barato y salir nítida.",
    grupo: "libro",
    stack: 'Charter, "Bitstream Charter", "Charis SIL", Constantia, Georgia, serif',
  },
  {
    key: "hoefler",
    name: "Antigua",
    hint: "Serif densa de época, para novela histórica.",
    grupo: "libro",
    stack: '"Hoefler Text", "Sitka Text", "Palatino Linotype", "Book Antiqua", serif',
    fina: true,
  },
  {
    key: "grotesca",
    name: "Grotesca",
    hint: "Sans seca y sin adornos. Ensayo moderno.",
    grupo: "moderna",
    stack: '"Helvetica Neue", Helvetica, Inter, Arial, sans-serif',
  },
  {
    key: "corondel",
    name: "Corondel",
    hint: "Sans geométrica, muy abierta. Infantil o divulgación.",
    grupo: "moderna",
    stack: 'Futura, "Century Gothic", "Avenir Next", "Trebuchet MS", sans-serif',
  },
  {
    key: "remington",
    name: "Remington",
    hint: "Mecanografiada de verdad: como un manuscrito enviado.",
    grupo: "maquina",
    stack: '"Courier New", Courier, "Nimbus Mono PS", monospace',
  },
];

const POR_CLAVE = new Map(FUENTES.map((fuente) => [fuente.key, fuente]));

/** The fallback when a book names a face this build does not know. */
export const FUENTE_POR_DEFECTO = FUENTES[0]!;

export function fuenteDe(key: string | null | undefined): Fuente {
  return (key ? POR_CLAVE.get(key) : undefined) ?? FUENTE_POR_DEFECTO;
}

export function pilaDe(key: string | null | undefined): string {
  return fuenteDe(key).stack;
}

export const GRUPOS_FUENTE: { grupo: Fuente["grupo"]; titulo: string }[] = [
  { grupo: "libro", titulo: "De libro" },
  { grupo: "moderna", titulo: "Modernas" },
  { grupo: "maquina", titulo: "De máquina" },
  { grupo: "display", titulo: "De adorno" },
];
