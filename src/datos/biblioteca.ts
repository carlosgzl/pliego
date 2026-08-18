/**
 * The library, from the app's point of view: books in, books out.
 *
 * Three places hold the same books, and the whole design is about which one
 * answers and how the other two catch up:
 *
 *   servidor  the PC. It owns the REAL Markdown files on Drive. When it is
 *             reachable, it is the truth and everything else is a copy.
 *   nube      Alexandria's encrypted store. Always on, reachable from a phone
 *             or a classroom with the PC unplugged. Holds a MIRROR of the books
 *             plus a queue of writes the PC has not applied yet.
 *   local     this browser. So the app opens instantly, works on a train, and
 *             never loses a paragraph because a network blinked.
 *
 * THE RULE THAT MATTERS: a save is only reported as saved when it has landed
 * somewhere that survives closing the tab. Writing to the PC counts. Writing to
 * the cloud counts. Writing to this browser alone does NOT — it is a cache, and
 * the app says so plainly instead of showing a green tick over a manuscript
 * that exists on one device.
 *
 * Conflicts are resolved by time, per book, never by merge. Two devices editing
 * one chapter at once is not a case this solves, and pretending otherwise would
 * lose prose; the newest write wins and the older one is kept as a rescue copy
 * in this browser.
 */

import { contarPalabras } from "@/nucleo/bloques";
import { componer, descomponer, metaPorDefecto, type Meta } from "@/nucleo/libro";
import { encolarCambio, escribirDoc, leerDoc, type ResultadoEscritura } from "./nube";
import {
  borrarEnServidor,
  guardarEnServidor,
  leerEnServidor,
  listarEnServidor,
  renombrarEnServidor,
} from "./servidor";

/** The mirror document inside Alexandria's cloud store. */
const DOC_ESPEJO = "escritorio";
const CACHE_LIBROS = "scriptorium.libros";
const CACHE_RESCATE = "scriptorium.rescate";

export type Via = "servidor" | "nube" | "local";

export interface LibroResumen {
  slug: string;
  meta: Meta;
  palabras: number;
  actualizado: string;
}

interface Espejo {
  /** slug → the whole file, plus when this copy was written. */
  libros: Record<string, { contenido: string; at: number }>;
}

/* ── This browser's copy ──────────────────────────────────────────────────── */

function leerCache(): Espejo {
  try {
    const crudo = localStorage.getItem(CACHE_LIBROS);
    if (!crudo) {
      return { libros: {} };
    }
    const analizado = JSON.parse(crudo) as Espejo;
    return analizado?.libros ? analizado : { libros: {} };
  } catch {
    return { libros: {} };
  }
}

function escribirCache(espejo: Espejo): void {
  try {
    localStorage.setItem(CACHE_LIBROS, JSON.stringify(espejo));
  } catch {
    // Quota, or private mode. The book is still on the server or in the cloud;
    // only the offline copy is missing, and the status line will say so.
  }
}

/**
 * Keep a copy of what we are about to overwrite with someone else's newer
 * version. Nothing in this app should ever be the reason a paragraph is gone.
 */
function guardarRescate(slug: string, contenido: string): void {
  try {
    const previo = JSON.parse(localStorage.getItem(CACHE_RESCATE) ?? "{}") as Record<
      string,
      { contenido: string; at: string }
    >;
    previo[slug] = { contenido, at: new Date().toISOString() };
    localStorage.setItem(CACHE_RESCATE, JSON.stringify(previo));
  } catch {
    // If even this fails there is nothing more we can do here.
  }
}

export function leerRescates(): { slug: string; contenido: string; at: string }[] {
  try {
    const guardado = JSON.parse(localStorage.getItem(CACHE_RESCATE) ?? "{}") as Record<
      string,
      { contenido: string; at: string }
    >;
    return Object.entries(guardado).map(([slug, dato]) => ({ slug, ...dato }));
  } catch {
    return [];
  }
}

export function olvidarRescate(slug: string): void {
  try {
    const guardado = JSON.parse(localStorage.getItem(CACHE_RESCATE) ?? "{}") as Record<
      string,
      unknown
    >;
    delete guardado[slug];
    localStorage.setItem(CACHE_RESCATE, JSON.stringify(guardado));
  } catch {
    // Nothing to forget.
  }
}

/* ── Reading ──────────────────────────────────────────────────────────────── */

export interface Catalogo {
  libros: LibroResumen[];
  /** Which of the three answered. */
  via: Via;
  /** True when the PC is reachable, so the files on Drive are being written. */
  servidorVivo: boolean;
  /** True when the cloud answered, so other devices will see this. */
  nubeViva: boolean;
}

function resumir(slug: string, contenido: string, actualizado: string): LibroResumen {
  const { meta, cuerpo } = descomponer(contenido);
  return { slug, meta, palabras: contarPalabras(cuerpo), actualizado };
}

/**
 * Every book, newest first, from whichever source can answer.
 *
 * When the PC answers, its books are pushed into the cloud mirror as well —
 * that is what makes them readable later from a phone with the PC off, and it
 * costs one request that nobody is waiting on.
 */
export async function cargarCatalogo(): Promise<Catalogo> {
  const enServidor = await listarEnServidor();

  if (enServidor) {
    const contenidos = await Promise.all(
      enServidor.map(async (libro) => ({
        slug: libro.slug,
        actualizado: libro.updatedAt,
        contenido: (await leerEnServidor(libro.slug)) ?? "",
      })),
    );
    const espejo: Espejo = { libros: {} };
    for (const libro of contenidos) {
      espejo.libros[libro.slug] = {
        contenido: libro.contenido,
        at: Date.parse(libro.actualizado) || Date.now(),
      };
    }
    escribirCache(espejo);
    // Not awaited: the shelf must not wait on the network to paint.
    const subida = escribirDoc(DOC_ESPEJO, espejo).catch(() => "inalcanzable" as const);
    const nubeViva = (await Promise.race([subida, esperar(2500)])) === "ok";
    return {
      libros: ordenar(
        contenidos.map((libro) => resumir(libro.slug, libro.contenido, libro.actualizado)),
      ),
      via: "servidor",
      servidorVivo: true,
      nubeViva,
    };
  }

  const doc = await leerDoc<Espejo>(DOC_ESPEJO);
  if (doc?.valor?.libros) {
    escribirCache(doc.valor);
    return {
      libros: ordenar(desdeEspejo(doc.valor)),
      via: "nube",
      servidorVivo: false,
      nubeViva: true,
    };
  }

  return {
    libros: ordenar(desdeEspejo(leerCache())),
    via: "local",
    servidorVivo: false,
    nubeViva: doc !== null,
  };
}

function desdeEspejo(espejo: Espejo): LibroResumen[] {
  return Object.entries(espejo.libros).map(([slug, dato]) =>
    resumir(slug, dato.contenido, new Date(dato.at).toISOString()),
  );
}

function ordenar(libros: LibroResumen[]): LibroResumen[] {
  return libros.sort((a, b) => b.actualizado.localeCompare(a.actualizado));
}

function esperar(ms: number): Promise<"tarde"> {
  return new Promise((resolver) => setTimeout(() => resolver("tarde"), ms));
}

/** One book's whole file, from wherever it can be had. */
export async function leerLibro(slug: string): Promise<string | null> {
  const delServidor = await leerEnServidor(slug);
  if (delServidor !== null) {
    const espejo = leerCache();
    espejo.libros[slug] = { contenido: delServidor, at: Date.now() };
    escribirCache(espejo);
    return delServidor;
  }
  const doc = await leerDoc<Espejo>(DOC_ESPEJO);
  const enNube = doc?.valor?.libros?.[slug];
  if (enNube) {
    return enNube.contenido;
  }
  return leerCache().libros[slug]?.contenido ?? null;
}

/* ── Writing ──────────────────────────────────────────────────────────────── */

export interface ResultadoGuardado {
  /** Where it actually landed. Empty means nowhere durable. */
  en: Via[];
  /** True when the real .md file on Drive has (or will have) this text. */
  enDisco: boolean;
  /** Set when nothing durable took it, so the UI can say why. */
  problema?: string;
}

/**
 * Save a book.
 *
 * With the PC up this is one request and the file on Drive changes. With the PC
 * down the text goes to the cloud mirror (so every other device sees it now)
 * AND into the queue the PC drains when it wakes (so the file catches up). Both,
 * not either: the mirror alone would be a copy that never becomes the book.
 */
export async function guardarLibro(slug: string, contenido: string): Promise<ResultadoGuardado> {
  const ahora = Date.now();
  const espejo = leerCache();
  espejo.libros[slug] = { contenido, at: ahora };
  escribirCache(espejo);

  const enServidor = await guardarEnServidor(slug, contenido);
  const enNube = await subirEspejo(espejo, ahora);

  if (enServidor) {
    return { en: enNube === "ok" ? ["servidor", "nube"] : ["servidor"], enDisco: true };
  }

  const encolado = await encolarCambio("PUT", "/writing/book", { slug, content: contenido });
  if (enNube === "ok" || encolado) {
    return {
      en: ["nube"],
      enDisco: encolado,
      ...(encolado
        ? {}
        : { problema: "Guardado en la nube, pero el ordenador aún no lo tiene en cola." }),
    };
  }

  return {
    en: [],
    enDisco: false,
    problema:
      enNube === "sin-clave"
        ? "Sin la clave de la biblioteca no se puede guardar fuera de este navegador."
        : enNube === "demasiado-grande"
          ? "El conjunto de libros no cabe ya en la nube. Archiva alguno."
          : "Sin conexión con el ordenador ni con la nube: solo está en este navegador.",
  };
}

async function subirEspejo(espejo: Espejo, at: number): Promise<ResultadoEscritura> {
  try {
    return await escribirDoc(DOC_ESPEJO, espejo, at);
  } catch {
    return "inalcanzable";
  }
}

/** Start a book. Returns its slug, which is the file name it will have. */
export async function crearLibro(titulo: string): Promise<string> {
  const slug = limpiarSlug(titulo);
  const meta = metaPorDefecto(titulo);
  await guardarLibro(slug, componer(meta, "# Primero\n\n"));
  return slug;
}

export async function duplicarLibro(slug: string): Promise<string | null> {
  const original = await leerLibro(slug);
  if (original === null) {
    return null;
  }
  const { meta, cuerpo } = descomponer(original);
  const copia = `${meta.titulo} (copia)`;
  const nuevo = limpiarSlug(copia);
  await guardarLibro(nuevo, componer({ ...meta, titulo: copia }, cuerpo));
  return nuevo;
}

export async function renombrarLibro(desde: string, hasta: string): Promise<boolean> {
  const limpio = limpiarSlug(hasta);
  const contenido = await leerLibro(desde);
  if (contenido === null) {
    return false;
  }
  const enServidor = await renombrarEnServidor(desde, limpio);
  const espejo = leerCache();
  espejo.libros[limpio] = espejo.libros[desde] ?? { contenido, at: Date.now() };
  delete espejo.libros[desde];
  escribirCache(espejo);
  await subirEspejo(espejo, Date.now());
  if (!enServidor) {
    await encolarCambio("POST", "/writing/rename", { from: desde, to: limpio });
  }
  return true;
}

export async function borrarLibro(slug: string): Promise<boolean> {
  const contenido = await leerLibro(slug);
  if (contenido !== null) {
    // Deleting a manuscript is the one action with no undo, so the text stays
    // in this browser under "rescates" even when the file is gone.
    guardarRescate(slug, contenido);
  }
  const enServidor = await borrarEnServidor(slug);
  const espejo = leerCache();
  delete espejo.libros[slug];
  escribirCache(espejo);
  await subirEspejo(espejo, Date.now());
  if (!enServidor) {
    await encolarCambio("DELETE", `/writing/book?slug=${encodeURIComponent(slug)}`, undefined);
  }
  return true;
}

/**
 * A title turned into a file name.
 *
 * The server refuses anything that could climb out of the Escritorio folder or
 * break on Windows, so the same characters come off here — a book should not be
 * rejected after you have typed its name.
 */
export function limpiarSlug(titulo: string): string {
  const limpio = titulo
    .replace(/[\\/]/g, "·")
    .replace(/\.\.+/g, ".")
    .replace(/[<>:"|?*]/g, "")
    // Control characters are not legal in a Windows file name.
    .replace(/\p{Cc}/gu, "")
    .replace(/\.md$/i, "")
    .trim();
  return limpio.length > 0 ? limpio : "Libro sin título";
}
