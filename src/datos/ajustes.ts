/**
 * How the ROOM is set up, as opposed to how the book is designed.
 *
 * A book's design travels with the book — it is in the file, and the same
 * manuscript looks the same on any machine. These settings are the opposite:
 * they belong to the person sitting here, not to the work. Which theme, how
 * wide the writing column is, whether the page follows the caret. Kept in this
 * browser on purpose; carrying them between devices would mean a phone imposing
 * its column width on a desktop.
 */

const ALMACEN = "pliego.ajustes";

export type Tema = "claro" | "oscuro" | "sepia" | "sistema";
export type SitioPrevia = "abajo" | "lado" | "oculta";

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
  /** Height (abajo) or width (lado) of the preview, in px. */
  previaTamano: number;
  /** Show the chapter list beside the manuscript. */
  capitulos: boolean;
  /** Type-as-you-go typographic replacements («», —, …). */
  tipografia: boolean;
  /** Warn before leaving with unsaved text. */
  avisarSalida: boolean;
  /** Daily word goal, 0 for none. */
  metaDiaria: number;
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
  previa: "abajo",
  previaTamano: 260,
  capitulos: false,
  tipografia: true,
  avisarSalida: true,
  metaDiaria: 0,
};

export function leerAjustes(): Ajustes {
  try {
    const crudo = localStorage.getItem(ALMACEN);
    if (!crudo) {
      return { ...AJUSTES_POR_DEFECTO };
    }
    return { ...AJUSTES_POR_DEFECTO, ...(JSON.parse(crudo) as Partial<Ajustes>) };
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
