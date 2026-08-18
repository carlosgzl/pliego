/**
 * Whole designs, in one press.
 *
 * WHY PRESETS AND NOT JUST THE KNOBS: there are about thirty settings here, and
 * thirty knobs is not power, it is a wall. What makes a page look like a novel
 * is not any one of them — it is that they AGREE: a novel has a drop cap, an
 * indent, no space between paragraphs, justified text, a chapter per page. Get
 * one wrong and it looks amateur no matter how carefully you tuned the rest.
 *
 * So each recipe is a complete, coherent page, and the knobs are there for
 * afterwards. Start from the closest one, then adjust.
 */

import { DISENO_POR_DEFECTO, type Diseno } from "./libro";

export interface Receta {
  clave: string;
  nombre: string;
  que: string;
  diseno: Omit<Diseno, "fuentePila">;
}

function receta(cambios: Partial<Diseno>): Omit<Diseno, "fuentePila"> {
  const { fuentePila: _, ...base } = { ...DISENO_POR_DEFECTO, ...cambios };
  return base;
}

export const RECETAS: Receta[] = [
  {
    clave: "novela",
    nombre: "Novela",
    que: "Garamond, capitular, sangría y capítulo por página. Lo que parece un libro.",
    diseno: receta({
      fuente: "garamond",
      tamano: 11.5,
      interlineado: 1.42,
      pagina: "a5",
      margenes: "normal",
      justificado: true,
      guiones: true,
      sangria: true,
      sangriaEm: 1.2,
      espacioParrafo: 0,
      capitular: true,
      versalitas: true,
      numeracion: "arabigos",
      encabezado: "autor-titulo",
      folio: "pie-centro",
      capituloEn: "pagina-nueva",
      tituloCapitulo: "grande",
      numeroCapitulo: "ninguno",
      dinkus: "asteriscos",
    }),
  },
  {
    clave: "ensayo",
    nombre: "Ensayo",
    que: "Cambria en B5, sin capitular, con el capítulo numerado y la cornisa nombrándolo.",
    diseno: receta({
      fuente: "minion",
      tamano: 10.5,
      interlineado: 1.5,
      pagina: "b5",
      margenes: "amplio",
      justificado: true,
      guiones: true,
      sangria: true,
      sangriaEm: 1,
      espacioParrafo: 0,
      capitular: false,
      versalitas: false,
      numeracion: "arabigos",
      encabezado: "capitulo",
      folio: "pie-fuera",
      capituloEn: "pagina-nueva",
      tituloCapitulo: "discreto",
      numeroCapitulo: "arabigo",
      dinkus: "regla",
    }),
  },
  {
    clave: "poesia",
    nombre: "Poesía",
    que: "Caja estrecha, sin justificar, mucho aire y el título en versalitas.",
    diseno: receta({
      fuente: "caslon",
      tamano: 11,
      interlineado: 1.7,
      pagina: "bolsillo",
      margenes: "amplio",
      justificado: false,
      guiones: false,
      sangria: false,
      sangriaEm: 0,
      espacioParrafo: 0.7,
      capitular: false,
      versalitas: false,
      numeracion: "arabigos",
      encabezado: "titulo",
      folio: "pie-centro",
      capituloEn: "pagina-nueva",
      tituloCapitulo: "versalitas",
      numeroCapitulo: "ninguno",
      dinkus: "rombo",
    }),
  },
  {
    clave: "manual",
    nombre: "Manual",
    que: "Sans en A4, párrafos separados sin sangría, capítulos seguidos. Para documentación.",
    diseno: receta({
      fuente: "grotesca",
      tamano: 10,
      interlineado: 1.55,
      pagina: "a4",
      margenes: "normal",
      justificado: false,
      guiones: false,
      sangria: false,
      sangriaEm: 0,
      espacioParrafo: 0.85,
      capitular: false,
      versalitas: false,
      numeracion: "arabigos",
      encabezado: "capitulo",
      folio: "pie-fuera",
      capituloEn: "seguido",
      tituloCapitulo: "discreto",
      numeroCapitulo: "arabigo",
      dinkus: "regla",
    }),
  },
  {
    clave: "manuscrito",
    nombre: "Manuscrito",
    que: "Courier a doble espacio en A4: el formato que piden las editoriales y los concursos.",
    diseno: receta({
      fuente: "remington",
      tamano: 12,
      interlineado: 2,
      pagina: "a4",
      margenes: "amplio",
      justificado: false,
      guiones: false,
      sangria: true,
      sangriaEm: 2,
      espacioParrafo: 0,
      capitular: false,
      versalitas: false,
      numeracion: "arabigos",
      encabezado: "autor-titulo",
      folio: "cabeza-fuera",
      capituloEn: "pagina-nueva",
      tituloCapitulo: "discreto",
      numeroCapitulo: "arabigo",
      dinkus: "asteriscos",
    }),
  },
  {
    clave: "codice",
    nombre: "Códice",
    que: "Antigua con capitular grande, numeración romana y capítulos que abren en impar.",
    diseno: receta({
      fuente: "hoefler",
      tamano: 11.5,
      interlineado: 1.5,
      pagina: "a5",
      margenes: "amplio",
      justificado: true,
      guiones: true,
      sangria: true,
      sangriaEm: 1.3,
      espacioParrafo: 0,
      capitular: true,
      capitularLineas: 4,
      versalitas: true,
      numeracion: "romanos",
      encabezado: "titulo",
      folio: "pie-centro",
      capituloEn: "pagina-impar",
      tituloCapitulo: "versalitas",
      numeroCapitulo: "romano",
      dinkus: "rombo",
    }),
  },
];
