/**
 * The page, in pixels, at whatever size it is being shown.
 *
 * THE ONE RULE: everything scales together. Page, margins and type are all
 * multiplied by the same factor, because the galley under the editor is small
 * and the reader's page is large — and unless the type scales with the paper
 * the two break lines differently and disagree about how long the book is. A
 * page count that changes when you resize a panel is not a page count.
 */

import type { Diseno } from "./libro";

/** CSS reference pixels per millimetre (96 dpi / 25.4). */
export const PX_POR_MM = 96 / 25.4;
/** CSS pixels per typographic point (96 / 72). */
export const PX_POR_PUNTO = 4 / 3;

export interface Formato {
  clave: Diseno["pagina"];
  nombre: string;
  hint: string;
  anchoMm: number;
  altoMm: number;
}

/** Trim sizes, named as a printer names them. */
export const FORMATOS: Formato[] = [
  {
    clave: "bolsillo",
    nombre: "Bolsillo",
    hint: "110 × 180 mm · novela de quiosco",
    anchoMm: 110,
    altoMm: 180,
  },
  { clave: "a5", nombre: "A5", hint: "148 × 210 mm · el tamaño de un libro", anchoMm: 148, altoMm: 210 },
  { clave: "b5", nombre: "B5", hint: "176 × 250 mm · ensayo y manual", anchoMm: 176, altoMm: 250 },
  { clave: "a4", nombre: "A4", hint: "210 × 297 mm · folio, para imprimir", anchoMm: 210, altoMm: 297 },
  {
    clave: "personalizada",
    nombre: "A medida",
    hint: "Tú pones los milímetros",
    anchoMm: 0,
    altoMm: 0,
  },
];

export interface JuegoMargenes {
  clave: Diseno["margenes"];
  nombre: string;
  hint: string;
  mm: number;
}

export const MARGENES: JuegoMargenes[] = [
  { clave: "estrecho", nombre: "Estrechos", hint: "14 mm · cabe más texto", mm: 14 },
  { clave: "normal", nombre: "Normales", hint: "20 mm · lo habitual", mm: 20 },
  { clave: "amplio", nombre: "Amplios", hint: "28 mm · mucho aire, edición cuidada", mm: 28 },
  { clave: "personalizados", nombre: "A medida", hint: "Cada lado por separado", mm: 0 },
];

export interface Geometria {
  escala: number;
  paginaAncho: number;
  paginaAlto: number;
  textoAncho: number;
  textoAlto: number;
  margenArriba: number;
  margenAbajo: number;
  margenLomo: number;
  margenCorte: number;
  /** Body size in CSS pixels at this scale. */
  cuerpo: number;
  /** One line of body text, in CSS pixels at this scale. */
  linea: number;
}

/** The trim size a design asks for, in millimetres. */
export function medidaMm(diseno: Diseno): { ancho: number; alto: number } {
  if (diseno.pagina === "personalizada") {
    return {
      ancho: acotar(diseno.anchoMm, 70, 420),
      alto: acotar(diseno.altoMm, 100, 594),
    };
  }
  const formato = FORMATOS.find((f) => f.clave === diseno.pagina) ?? FORMATOS[1]!;
  return { ancho: formato.anchoMm, alto: formato.altoMm };
}

/** The four margins a design asks for, in millimetres. */
export function margenesMm(diseno: Diseno): {
  arriba: number;
  abajo: number;
  lomo: number;
  corte: number;
} {
  if (diseno.margenes === "personalizados") {
    return {
      arriba: acotar(diseno.margenArriba, 5, 60),
      abajo: acotar(diseno.margenAbajo, 5, 60),
      lomo: acotar(diseno.margenLomo, 5, 60),
      corte: acotar(diseno.margenCorte, 5, 60),
    };
  }
  const juego = MARGENES.find((m) => m.clave === diseno.margenes) ?? MARGENES[1]!;
  return { arriba: juego.mm, abajo: juego.mm, lomo: juego.mm, corte: juego.mm };
}

function acotar(valor: number, minimo: number, maximo: number): number {
  if (!Number.isFinite(valor)) {
    return minimo;
  }
  return Math.min(maximo, Math.max(minimo, valor));
}

/**
 * `altoDeseado` is how tall the page should render — a strip under the editor
 * is a few hundred pixels, a page in the reader is most of the screen. The
 * scale it implies is applied to the type as well, so both agree line for line.
 */
export function geometria(diseno: Diseno, altoDeseado?: number): Geometria {
  const mm = medidaMm(diseno);
  const m = margenesMm(diseno);
  const altoNatural = mm.alto * PX_POR_MM;
  const escala = altoDeseado && altoDeseado > 0 ? altoDeseado / altoNatural : 1;

  const paginaAncho = Math.round(mm.ancho * PX_POR_MM * escala);
  const paginaAlto = Math.round(altoNatural * escala);
  const margenArriba = Math.round(m.arriba * PX_POR_MM * escala);
  const margenAbajo = Math.round(m.abajo * PX_POR_MM * escala);
  const margenLomo = Math.round(m.lomo * PX_POR_MM * escala);
  const margenCorte = Math.round(m.corte * PX_POR_MM * escala);
  const cuerpo = diseno.tamano * PX_POR_PUNTO * escala;

  return {
    escala,
    paginaAncho,
    paginaAlto,
    margenArriba,
    margenAbajo,
    margenLomo,
    margenCorte,
    textoAncho: paginaAncho - margenLomo - margenCorte,
    textoAlto: paginaAlto - margenArriba - margenAbajo,
    cuerpo,
    linea: cuerpo * diseno.interlineado,
  };
}

/**
 * Which page a block landed on.
 *
 * `offsetLeft` is measured from the flow's padding box, so the first page's
 * inner margin has to come off before dividing; one column step is exactly one
 * page (column width + gap = text width + both side margins).
 */
export function paginaDe(offsetLeft: number, geo: Geometria): number {
  return Math.floor(Math.max(0, offsetLeft - geo.margenLomo) / Math.max(1, geo.paginaAncho)) + 1;
}

/**
 * How many characters fit on a line, roughly.
 *
 * Typographers judge a text block by its MEASURE, and the good range is 60–75
 * characters; under 45 the eye jumps, over 90 it loses the return. The design
 * panel shows this number and says which side of the range it is on, because
 * "45 characters" is advice a writer can act on and "148 mm at 11.5 pt" is not.
 * The 0.5 em average character width is the usual rule of thumb for a text
 * face — good enough to steer a decision, not a claim about a specific font.
 */
export function medidaEnCaracteres(diseno: Diseno): number {
  const mm = medidaMm(diseno);
  const m = margenesMm(diseno);
  const anchoTexto = (mm.ancho - m.lomo - m.corte) * PX_POR_MM;
  const anchoCaracter = diseno.tamano * PX_POR_PUNTO * 0.5;
  return Math.round(anchoTexto / Math.max(1, anchoCaracter));
}

export type JuicioMedida = "corta" | "buena" | "larga";

export function juzgarMedida(caracteres: number): JuicioMedida {
  if (caracteres < 52) {
    return "corta";
  }
  return caracteres > 82 ? "larga" : "buena";
}
