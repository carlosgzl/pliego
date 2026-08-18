/**
 * What a book IS — the contract this app shares with Alexandria.
 *
 * On disk a book is ONE Markdown file: a YAML front matter holding the title,
 * the author and two one-line JSON objects (the page design and the cover),
 * followed by the prose. The one-line JSON is deliberate: it is still valid
 * YAML, so the file opens in Obsidian like any other note, and nothing about a
 * manuscript depends on this app continuing to exist. That property is the
 * whole point — the app is a lens, the file is the book.
 *
 * BACKWARD COMPATIBILITY IS A RULE, NOT A NICETY. Alexandria reads these same
 * files with an older copy of this parser, so:
 *   · never rename a field, only add;
 *   · every new field needs a default that reproduces the old behaviour;
 *   · unknown fields survive a read/write round trip untouched.
 * A reader that does not know about a field must still lay the book out.
 */

import { FUENTES, pilaDe } from "./fuentes";

export interface Diseno {
  /** A key from FUENTES. */
  fuente: string;
  /** Resolved from `fuente` when reading; never written to disk. */
  fuentePila: string;
  /** Body size in points, as a printer would say it. */
  tamano: number;
  interlineado: number;
  /** Letter spacing in em; negative tightens a display serif. */
  tracking: number;

  pagina: "bolsillo" | "a5" | "b5" | "a4" | "personalizada";
  /** Only read when `pagina` is "personalizada". Millimetres. */
  anchoMm: number;
  altoMm: number;
  margenes: "estrecho" | "normal" | "amplio" | "personalizados";
  /** Only read when `margenes` is "personalizados". Millimetres. */
  margenArriba: number;
  margenAbajo: number;
  margenLomo: number;
  margenCorte: number;

  justificado: boolean;
  guiones: boolean;
  sangria: boolean;
  /** First-line indent, in em. */
  sangriaEm: number;
  /** Space between paragraphs, in em. A book uses 0 and an indent instead. */
  espacioParrafo: number;

  capitular: boolean;
  /** How many lines the drop cap descends. */
  capitularLineas: number;
  versalitas: boolean;

  numeracion: "arabigos" | "romanos" | "ninguna";
  encabezado: "autor-titulo" | "titulo" | "capitulo" | "ninguno";
  /** Where the folio sits on the page. */
  folio: "pie-centro" | "pie-fuera" | "cabeza-fuera";

  capituloEn: "pagina-nueva" | "pagina-impar" | "seguido";
  tituloCapitulo: "grande" | "discreto" | "versalitas";
  /** Prints «I», «Capítulo 1» or nothing above each chapter title. */
  numeroCapitulo: "ninguno" | "romano" | "arabigo" | "palabra";
  /** The mark between scenes inside a chapter. */
  dinkus: "linea-en-blanco" | "asteriscos" | "rombo" | "regla";
}

export interface Portada {
  diseno: "sello" | "franja" | "liso" | "rejilla" | "medianoche";
  color: string;
  tinta: string;
  imagen: string | null;
  encaje: "cubrir" | "contener";
  colocacion: "completa" | "arriba" | "abajo" | "ventana";
  /** Cover lettering: the body face, or a display face of its own. */
  fuente: string;
}

export interface Meta {
  titulo: string;
  subtitulo: string;
  autor: string;
  estado: string;
  creado: string;
  encuadernacion?: string;
  dedicatoria: string;
  /** Words the author is aiming for. 0 means "no target set". */
  meta?: number;
  diseno: Diseno;
  portada: Portada;
}

export const DISENO_POR_DEFECTO: Diseno = {
  fuente: "garamond",
  fuentePila: pilaDe("garamond"),
  tamano: 11.5,
  interlineado: 1.42,
  tracking: 0,

  pagina: "a5",
  anchoMm: 148,
  altoMm: 210,
  margenes: "normal",
  margenArriba: 20,
  margenAbajo: 20,
  margenLomo: 20,
  margenCorte: 20,

  justificado: true,
  guiones: true,
  sangria: true,
  sangriaEm: 1.2,
  espacioParrafo: 0,

  capitular: true,
  capitularLineas: 3,
  versalitas: true,

  numeracion: "arabigos",
  encabezado: "autor-titulo",
  folio: "pie-centro",

  capituloEn: "pagina-nueva",
  tituloCapitulo: "grande",
  numeroCapitulo: "ninguno",
  dinkus: "linea-en-blanco",
};

export const PORTADA_POR_DEFECTO: Portada = {
  diseno: "sello",
  color: "#2f3e4f",
  tinta: "#f4f1ea",
  imagen: null,
  encaje: "cubrir",
  colocacion: "arriba",
  fuente: "garamond",
};

export function metaPorDefecto(titulo: string): Meta {
  return {
    titulo,
    subtitulo: "",
    autor: "",
    estado: "borrador",
    creado: new Date().toISOString().slice(0, 10),
    dedicatoria: "",
    meta: 0,
    diseno: { ...DISENO_POR_DEFECTO },
    portada: { ...PORTADA_POR_DEFECTO },
  };
}

/* ── Reading and writing the file ─────────────────────────────────────────── */

/** A YAML scalar, quoted only when leaving it bare would break the file. */
function escalar(valor: string): string {
  const limpio = valor.replace(/\r?\n/g, " ").trim();
  if (limpio.length === 0) {
    return '""';
  }
  // Anything that could start a YAML construct, or that ends in a colon, gets
  // quoted. Cheaper to over-quote than to write a file YAML cannot read back.
  if (/^[-?:,[\]{}#&*!|>'"%@`]|: |:$|^\s|\s$/.test(limpio) || /^(true|false|null|~)$/i.test(limpio)) {
    return `"${limpio.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return limpio;
}

function desescalar(valor: string): string {
  const limpio = valor.trim();
  if (
    (limpio.startsWith('"') && limpio.endsWith('"') && limpio.length >= 2) ||
    (limpio.startsWith("'") && limpio.endsWith("'") && limpio.length >= 2)
  ) {
    return limpio
      .slice(1, -1)
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
  return limpio;
}

/** The design as it goes to disk: no derived fields. */
function disenoAJson(diseno: Diseno): string {
  const { fuentePila: _derivado, ...resto } = diseno;
  return JSON.stringify(resto);
}

/**
 * Turn a file into its front matter and its prose.
 *
 * Anything missing takes the default, so a book written by an older version —
 * or hand-edited in Obsidian, or half-broken — still opens. A manuscript is
 * never refused for having the wrong shape.
 */
export function descomponer(texto: string): { meta: Meta; cuerpo: string } {
  const coincide = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(texto);
  if (!coincide) {
    return { meta: metaPorDefecto("Sin título"), cuerpo: texto };
  }
  const campos = new Map<string, string>();
  for (const linea of coincide[1]!.split(/\r?\n/)) {
    const par = /^([A-Za-zñáéíóú_][\w-]*):\s*(.*)$/.exec(linea);
    if (par) {
      campos.set(par[1]!, par[2]!);
    }
  }

  const leerJson = <T,>(clave: string, porDefecto: T): T => {
    const crudo = campos.get(clave);
    if (!crudo) {
      return { ...porDefecto };
    }
    try {
      const analizado = JSON.parse(desescalar(crudo)) as Partial<T>;
      return { ...porDefecto, ...analizado };
    } catch {
      return { ...porDefecto };
    }
  };

  const diseno = leerJson<Diseno>("diseno", DISENO_POR_DEFECTO);
  diseno.fuentePila = pilaDe(diseno.fuente);
  const portada = leerJson<Portada>("portada", PORTADA_POR_DEFECTO);

  const numero = Number.parseInt(campos.get("meta") ?? "0", 10);
  const meta: Meta = {
    titulo: desescalar(campos.get("titulo") ?? "Sin título"),
    subtitulo: desescalar(campos.get("subtitulo") ?? ""),
    autor: desescalar(campos.get("autor") ?? ""),
    estado: desescalar(campos.get("estado") ?? "borrador"),
    creado: desescalar(campos.get("creado") ?? new Date().toISOString().slice(0, 10)),
    dedicatoria: desescalar(campos.get("dedicatoria") ?? ""),
    meta: Number.isFinite(numero) ? numero : 0,
    diseno,
    portada,
  };
  const encuadernacion = campos.get("encuadernacion");
  if (encuadernacion) {
    meta.encuadernacion = desescalar(encuadernacion);
  }

  return { meta, cuerpo: texto.slice(coincide[0].length) };
}

/** Front matter plus prose, ready to be written to disk. */
export function componer(meta: Meta, cuerpo: string): string {
  const lineas = [
    "---",
    `titulo: ${escalar(meta.titulo)}`,
    `subtitulo: ${escalar(meta.subtitulo)}`,
    `autor: ${escalar(meta.autor)}`,
    `estado: ${escalar(meta.estado)}`,
    `creado: ${escalar(meta.creado)}`,
  ];
  if (meta.encuadernacion) {
    lineas.push(`encuadernacion: ${escalar(meta.encuadernacion)}`);
  }
  lineas.push(
    `dedicatoria: ${escalar(meta.dedicatoria)}`,
    `meta: ${Math.max(0, Math.round(meta.meta ?? 0))}`,
    `diseno: ${disenoAJson(meta.diseno)}`,
    `portada: ${JSON.stringify(meta.portada)}`,
    "---",
    "",
  );
  return `${lineas.join("\n")}${cuerpo}`;
}

/** Every typeface the design panel offers, for the picker. */
export const FUENTES_DISPONIBLES = FUENTES;
