/**
 * Texturas, plantillas de portada, y qué portada le pega a este libro.
 *
 * POR QUÉ HACE FALTA ESTO. El panel de portada tenía un estilo, dos colores y
 * una imagen: bastante para no empezar en blanco, poco para que una portada
 * parezca una portada. Lo que faltaba son las tres cosas que hace un diseñador
 * antes de tocar nada — elegir el material, partir de algo que ya funciona, y
 * decidir qué le pide ESTE libro y no un libro cualquiera.
 *
 * LAS TEXTURAS SE DIBUJAN, NO SE DESCARGAN. Todas son degradados de CSS o un
 * ruido generado con un filtro SVG en línea. Ninguna añade un byte al `.md`, y
 * un libro sigue siendo un archivo de texto que se abre en Obsidian. Una
 * portada con una foto de tela escaneada habría sido más fácil y habría roto la
 * única regla que este programa no se salta.
 *
 * TODO ESTE ARCHIVO ES PURO. Ni React ni DOM: entra un libro, sale una
 * recomendación. Por eso se puede probar, y se prueba.
 */

import type { Meta, Portada } from "./libro";

/* ── Texturas ─────────────────────────────────────────────────────────────── */

export interface Textura {
  clave: string;
  nombre: string;
  que: string;
}

export const TEXTURAS: Textura[] = [
  { clave: "ninguna", nombre: "Lisa", que: "Color plano, sin material." },
  { clave: "lino", nombre: "Lino", que: "Trama fina cruzada, como la tela de una tapa dura." },
  { clave: "verjurado", nombre: "Verjurado", que: "Los corondeles del papel hecho a mano." },
  { clave: "tela", nombre: "Tela", que: "Tejido apretado de encuadernación." },
  { clave: "carton", nombre: "Cartón", que: "Fibra basta de un cartoné sin recubrir." },
  { clave: "veta", nombre: "Veta", que: "Vetas largas, como madera o papel de aguas." },
  { clave: "grano", nombre: "Grano", que: "Grano de impresión: se nota y no se ve." },
];

export function esTextura(clave: string | undefined): boolean {
  return TEXTURAS.some((textura) => textura.clave === clave);
}

/* ── Plantillas ───────────────────────────────────────────────────────────── */

/**
 * Portadas hechas, para no empezar de cero.
 *
 * Cada una es una combinación COMPLETA —estilo, dos colores, la letra de cada
 * línea y el material—, no un tema de color: media portada bien elegida con la
 * otra media por defecto sigue siendo media portada. Y ninguna toca ni el
 * título ni el autor, que son del libro y no del diseño.
 *
 * Las parejas de color están elegidas a mano, no calculadas. Un algoritmo saca
 * complementarios que contrastan; lo que hace que una portada parezca una
 * portada es que los dos colores hayan convivido antes en algún sitio.
 */
export interface Plantilla {
  clave: string;
  nombre: string;
  /** Para qué clase de libro está pensada. Sale en la ficha. */
  para: string;
  portada: Partial<Portada>;
}

export const PLANTILLAS: Plantilla[] = [
  {
    clave: "penguin",
    nombre: "Faja naranja",
    para: "Novela de bolsillo, colección de toda la vida",
    portada: {
      diseno: "franja",
      color: "#e8552a",
      tinta: "#faf6ef",
      textura: "carton",
      fuente: "moderna",
      fuenteTitulo: "elegante",
      fuenteAutor: "moderna",
      colocacion: "ventana",
    },
  },
  {
    clave: "medianoche",
    nombre: "Medianoche",
    para: "Novela negra, intriga, algo que pasa de noche",
    portada: {
      diseno: "medianoche",
      color: "#12161d",
      tinta: "#e7e3d8",
      textura: "grano",
      fuente: "moderna",
      fuenteTitulo: "elegante",
      fuenteSub: "moderna",
      fuenteAutor: "moderna",
    },
  },
  {
    clave: "papel",
    nombre: "Papel de barba",
    para: "Poesía, diario, cuadernos",
    portada: {
      diseno: "liso",
      color: "#efe7d6",
      tinta: "#3a3226",
      textura: "verjurado",
      fuente: "garamond",
      fuenteTitulo: "garamond",
      fuenteAutor: "garamond",
    },
  },
  {
    clave: "academica",
    nombre: "Académica",
    para: "Ensayo, tesis, cualquier cosa con notas al pie",
    portada: {
      diseno: "rejilla",
      color: "#1f3b52",
      tinta: "#f2f0eb",
      textura: "lino",
      fuente: "moderna",
      fuenteTitulo: "pluma",
      fuenteSub: "moderna",
      fuenteAutor: "moderna",
    },
  },
  {
    clave: "tela-verde",
    nombre: "Tela inglesa",
    para: "Novela de época, clásicos, algo que quiere durar",
    portada: {
      diseno: "sello",
      color: "#2f4f3e",
      tinta: "#e9dfc4",
      textura: "tela",
      fuente: "pluma",
      fuenteTitulo: "pluma",
      fuenteAutor: "pluma",
    },
  },
  {
    clave: "granate",
    nombre: "Sello granate",
    para: "Cuento, relato corto, edición pequeña",
    portada: {
      diseno: "sello",
      color: "#6d2331",
      tinta: "#f4ece0",
      textura: "lino",
      fuente: "garamond",
      fuenteTitulo: "elegante",
      fuenteAutor: "moderna",
    },
  },
  {
    clave: "manual",
    nombre: "Manual",
    para: "Instrucciones, técnico, algo que se consulta",
    portada: {
      diseno: "rejilla",
      color: "#f0efe9",
      tinta: "#22252a",
      textura: "ninguna",
      fuente: "moderna",
      fuenteTitulo: "losa",
      fuenteSub: "moderna",
      fuenteAutor: "moderna",
    },
  },
  {
    clave: "madera",
    nombre: "Veta clara",
    para: "Naturaleza, viaje, memoria",
    portada: {
      diseno: "franja",
      color: "#9c7748",
      tinta: "#fbf6ec",
      textura: "veta",
      fuente: "biblioteca",
      fuenteTitulo: "biblioteca",
      fuenteAutor: "moderna",
    },
  },
];

export function plantillaDe(clave: string): Plantilla | undefined {
  return PLANTILLAS.find((plantilla) => plantilla.clave === clave);
}

/**
 * Aplicar una plantilla SIN pisar lo que es del libro.
 *
 * La imagen y los elementos puestos a mano sobreviven a propósito: alguien que
 * ha colocado una foto y prueba tres plantillas para ver cuál le pega no espera
 * perder la foto en la primera. Lo que cambia es el vestido, no lo que hay
 * dentro.
 */
export function aplicarPlantilla(portada: Portada, plantilla: Plantilla): Portada {
  return {
    ...portada,
    ...plantilla.portada,
    imagen: portada.imagen,
    elementos: portada.elementos,
  };
}

/* ── Qué le pega a este libro ─────────────────────────────────────────────── */

export interface Sugerencia {
  plantilla: Plantilla;
  /** Por qué esta y no otra, en una frase. Sin el porqué es un horóscopo. */
  porque: string;
}

/**
 * La plantilla que le pega a este libro, y el motivo.
 *
 * NO ES ADIVINACIÓN, ES LEER LO QUE YA HAY. Cuando alguien llega a la portada
 * lleva un rato tomando decisiones sobre el interior —el cuerpo de letra, el
 * tamaño de página, si hay subtítulo, cómo se separan las escenas— y esas
 * decisiones dicen bastante de qué clase de libro es. Un A5 en Garamond con
 * escenas separadas por asteriscos es una novela; un B5 en sans con subtítulo
 * es un ensayo. No acierta siempre, y por eso se enseña como sugerencia, con el
 * porqué escrito y ocho alternativas al lado.
 */
export function sugerirPortada(meta: Meta, palabras = 0): Sugerencia {
  const { diseno } = meta;
  const conSubtitulo = meta.subtitulo.trim().length > 0;
  const paginaGrande = diseno.pagina === "b5" || diseno.pagina === "a4";
  const sinSangria = !diseno.sangria;
  const espaciada = diseno.espacioParrafo > 0;

  const elegir = (clave: string, porque: string): Sugerencia => ({
    plantilla: plantillaDe(clave) ?? PLANTILLAS[0]!,
    porque,
  });

  /* Un manual: página grande, sin sangría, párrafos separados por aire y con
     subtítulo. Es la firma de un texto que se consulta, no que se lee seguido. */
  if (paginaGrande && sinSangria && espaciada) {
    return elegir("manual", "Página grande, sin sangría y con aire entre párrafos: se consulta más que se lee.");
  }

  /* Ensayo: página grande o letra de losa, y casi siempre subtítulo — que en un
     ensayo es donde va la mitad del título. */
  if (conSubtitulo && (paginaGrande || diseno.fuente === "losa" || diseno.fuente === "pluma")) {
    return elegir("academica", "Tiene subtítulo y una letra de ensayo: pide una portada seria y ordenada.");
  }

  /* Poesía: página pequeña, sin sangría y con espacio entre estrofas. */
  if (diseno.pagina === "bolsillo" && sinSangria) {
    return elegir("papel", "Página pequeña y versos sin sangría: papel de barba y poca tinta.");
  }

  /* Un libro breve es un cuento o un relato, y un cuento no lleva la misma
     portada que una novela de cuatrocientas páginas. */
  if (palabras > 0 && palabras < 12_000) {
    return elegir("granate", "Por ahora es breve: un sello sobrio es lo que mejor le sienta a un relato.");
  }

  /* Escenas separadas con ornamento y capitular: novela de las de sentarse. */
  if (diseno.capitular || diseno.dinkus === "rombo" || diseno.dinkus === "asteriscos") {
    return elegir("tela-verde", "Capitulares y escenas con ornamento: se está componiendo como una novela clásica.");
  }

  if (diseno.fuente === "garamond" || diseno.fuente === "biblioteca") {
    return elegir("penguin", "Una romana de novela en tamaño de bolsillo: la faja de toda la vida le va.");
  }

  return elegir("medianoche", "Sin más pistas, una portada oscura y sobria funciona con casi cualquier libro.");
}

/* ── Elementos ────────────────────────────────────────────────────────────── */

/** Un identificador corto y único. `crypto.randomUUID` no está en todas partes. */
export function nuevoId(): string {
  return `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
