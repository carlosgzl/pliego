/**
 * How the ROOM is set up, as opposed to how the book is designed.
 *
 * A book's design travels with the book — it is in the file, and the same
 * manuscript looks the same on any machine. These settings are the opposite:
 * they belong to the person sitting here, not to the work. Which theme, where
 * the page sits, which gadgets are on. Kept in this browser on purpose;
 * carrying them between devices would mean a phone imposing its column width on
 * a desktop.
 */

const ALMACEN = "pliego.ajustes";

export type Tema = "claro" | "oscuro" | "sepia" | "sistema";

/**
 * Where the composed page sits.
 *
 * "abajo" was the only option and it was the wrong default: a strip under the
 * editor is short, so the page comes out tiny and you cannot read it. Beside
 * the text it gets the full height of the screen, which is the shape a page
 * actually is. Left as well as right because a writer who works with the
 * chapter list open wants the page on the other side.
 */
export type SitioPrevia = "derecha" | "izquierda" | "abajo" | "oculta";

/** Where the gadget strip lives. */
export type SitioGadgets = "arriba" | "abajo" | "oculta";

/**
 * The gadgets, by key. Order here is the order on the strip.
 *
 * They are all things a writer glances at without stopping: how much is
 * written, how much today, how far to the goal, how long this session has
 * been going. Nothing that needs reading, nothing that moves on its own except
 * the clock and the timer.
 */
export const GADGETS = [
  { clave: "palabras", nombre: "Palabras", que: "Cuántas lleva el libro" },
  { clave: "hoy", nombre: "Escrito hoy", que: "Cuántas has sumado desde esta mañana" },
  { clave: "meta", nombre: "Objetivo", que: "Lo que te falta para la meta del libro" },
  { clave: "sesion", nombre: "Sesión", que: "Cuánto llevas escribiendo de una sentada" },
  { clave: "paginas", nombre: "Páginas", que: "En qué página vas y cuántas hay" },
  { clave: "capitulo", nombre: "Capítulo", que: "En cuál estás y cuánto tiene" },
  { clave: "lectura", nombre: "Tiempo de lectura", que: "Lo que se tarda en leerlo" },
  { clave: "reloj", nombre: "Hora", que: "La hora, para no mirar el móvil" },
] as const;

export type ClaveGadget = (typeof GADGETS)[number]["clave"];

export interface Ajustes {
  tema: Tema;
  /** Accent colour of the APP (not of the book). Drives the favicon too. */
  acento: string;
  /** Typeface of the EDITOR — not of the book. */
  fuenteEditor: string;
  /** Editor body size in px. */
  tamanoEditor: number;
  /** Characters per line in the editor, which is what a measure really is. */
  anchoEditor: number;
  interlineadoEditor: number;
  /** Dim everything but the paragraph being written. */
  foco: boolean;
  /** Keep the caret line vertically centred, like a typewriter's platen. */
  maquina: boolean;
  previa: SitioPrevia;
  /** Height (abajo) or width (a los lados) of the preview, in px. */
  previaTamano: number;
  gadgets: ClaveGadget[];
  sitioGadgets: SitioGadgets;
  /** Show the chapter list beside the manuscript. */
  capitulos: boolean;
  /** Type-as-you-go typographic replacements («», —, …). */
  tipografia: boolean;
  /**
   * El corrector del navegador, encendido o apagado.
   *
   * Se usa el del sistema y no uno propio a propósito: trae el diccionario de
   * español del usuario, sus palabras añadidas y el menú de sugerencias del
   * botón derecho. Un corrector escrito aquí sería peor y pesaría megas.
   * Apagable porque a mucha gente el subrayado rojo le corta el hilo.
   */
  corrector: boolean;
  /** Warn before leaving with unsaved text. */
  avisarSalida: boolean;
}

export const AJUSTES_POR_DEFECTO: Ajustes = {
  tema: "sistema",
  acento: "pizarra",
  fuenteEditor: "garamond",
  tamanoEditor: 18,
  anchoEditor: 68,
  interlineadoEditor: 1.7,
  foco: false,
  maquina: false,
  // Beside the text and wide enough to read, which the old 260 px strip
  // underneath never was.
  previa: "derecha",
  previaTamano: 420,
  gadgets: ["palabras", "hoy", "paginas", "sesion"],
  sitioGadgets: "abajo",
  capitulos: false,
  tipografia: true,
  corrector: true,
  avisarSalida: true,
};

export function leerAjustes(): Ajustes {
  try {
    const crudo = localStorage.getItem(ALMACEN);
    if (!crudo) {
      return { ...AJUSTES_POR_DEFECTO };
    }
    const guardados = { ...AJUSTES_POR_DEFECTO, ...(JSON.parse(crudo) as Partial<Ajustes>) };
    // Una lista de gadgets de una versión anterior puede traer claves que ya no
    // existen; filtrarlas aquí evita un hueco vacío en la barra.
    const validas = new Set(GADGETS.map((g) => g.clave as string));
    guardados.gadgets = (guardados.gadgets ?? []).filter((clave) => validas.has(clave));
    return guardados;
  } catch {
    return { ...AJUSTES_POR_DEFECTO };
  }
}

export function guardarAjustes(ajustes: Ajustes): void {
  try {
    localStorage.setItem(ALMACEN, JSON.stringify(ajustes));
  } catch {
    // Session only.
  }
}

/**
 * Words written today, per book, so the goal means something.
 *
 * Counted as "the count now minus the count at the first save of the day",
 * which is the honest version: it goes DOWN when you cut, because cutting three
 * hundred words is not writing three hundred words.
 */
const DIARIO = "pliego.diario";

interface Diario {
  fecha: string;
  base: Record<string, number>;
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function leerDiario(): Diario {
  try {
    const guardado = JSON.parse(localStorage.getItem(DIARIO) ?? "null") as Diario | null;
    if (guardado && guardado.fecha === hoy()) {
      return guardado;
    }
  } catch {
    // Start a fresh day.
  }
  return { fecha: hoy(), base: {} };
}

/** Register today's starting point for a book, once. */
export function marcarArranque(slug: string, palabras: number): void {
  const diario = leerDiario();
  if (diario.base[slug] === undefined) {
    diario.base[slug] = palabras;
    try {
      localStorage.setItem(DIARIO, JSON.stringify(diario));
    } catch {
      // Session only.
    }
  }
}

export function palabrasDeHoy(slug: string, palabras: number): number {
  const base = leerDiario().base[slug];
  return base === undefined ? 0 : palabras - base;
}
