/**
 * La biblioteca: libros que entran, libros que salen, y cuatro sitios donde
 * viven a la vez.
 *
 *   servidor  el ordenador de casa. Tiene los .md DE VERDAD, en Drive. Cuando
 *             responde, es el que convierte lo escrito en un archivo.
 *   cuenta    el almacén de Netlify de su cuenta. Siempre encendido y sin
 *             necesitar la clave de la biblioteca: es el puente entre el
 *             portátil, el móvil y el ordenador de clase.
 *   nube      el espejo cifrado de Alexandria, más la cola que el ordenador
 *             vacía en los .md cuando vuelve. Necesita la clave.
 *   local     este navegador. Para abrir al instante y no perder un párrafo
 *             porque parpadee la red.
 *
 * LO QUE ESTABA MAL, Y ES EL MOTIVO DE ESTA REESCRITURA. Cada fuente se creía
 * la lista entera. Si el ordenador respondía, su catálogo SUSTITUÍA al de la
 * cuenta y al de este navegador: lo escrito en el portátil desaparecía de la
 * estantería nada más abrir Pliego en casa. Y al revés — con el ordenador
 * respondiendo no se subía nada a la cuenta, así que sus libros no llegaban
 * jamás al portátil. Los dos síntomas eran el mismo fallo: sustituir en vez de
 * fundir.
 *
 * AHORA: se pregunta a las cuatro EN PARALELO, se funde lo que conteste
 * (`fusion.ts`, libro a libro y por fecha) y **se devuelve la fusión a todas**.
 * Ninguna fuente puede encoger la estantería, y cualquiera de ellas basta para
 * repartir un capítulo a las demás. Un libro escrito en clase acaba siendo un
 * .md en Drive en cuanto el ordenador se enciende, sin hacer nada.
 *
 * LA REGLA QUE NO SE TOCA: un guardado solo se canta como guardado cuando ha
 * caído en algún sitio que sobreviva a cerrar la pestaña. Este navegador no
 * cuenta — es una caché, y se dice tal cual en vez de enseñar un visto verde
 * sobre un manuscrito que existe en un único dispositivo.
 *
 * Los conflictos se resuelven por fecha y por libro, nunca fundiendo texto. Dos
 * dispositivos escribiendo el mismo capítulo a la vez no es un caso que esto
 * resuelva, y fingir que sí perdería prosa: gana el más nuevo y el otro queda
 * como copia de rescate en este navegador.
 */

import { contarPalabras } from "@/nucleo/bloques";
import { componer, descomponer, metaPorDefecto, type Meta } from "@/nucleo/libro";
import { guardarEnCuenta, hayCuenta, leerDeCuenta } from "./cuenta";
import { hayClave } from "./clave";
import {
  bibliotecaVacia,
  fundir,
  fundirTodas,
  loQueFalta,
  normalizar,
  type Biblioteca,
} from "./fusion";
import { encolarCambio, escribirDoc, leerDoc, type ResultadoEscritura } from "./nube";
import {
  borrarEnServidor,
  guardarEnServidor,
  leerEnServidor,
  listarEnServidor,
  renombrarEnServidor,
  type LibroServidor,
} from "./servidor";

/** El documento espejo dentro del almacén cifrado de Alexandria. */
const DOC_ESPEJO = "escritorio";
const CACHE_LIBROS = "pliego.libros";
const CACHE_RESCATE = "pliego.rescate";

export type Via = "servidor" | "cuenta" | "nube" | "local";

export interface LibroResumen {
  slug: string;
  meta: Meta;
  palabras: number;
  actualizado: string;
}

/* ── La copia de este navegador ───────────────────────────────────────────── */

function leerCache(): Biblioteca {
  try {
    return normalizar(JSON.parse(localStorage.getItem(CACHE_LIBROS) ?? "null"));
  } catch {
    return bibliotecaVacia();
  }
}

function escribirCache(biblioteca: Biblioteca): void {
  try {
    localStorage.setItem(CACHE_LIBROS, JSON.stringify(biblioteca));
  } catch {
    // Cuota, o modo privado. El libro sigue en el servidor o en la nube; lo que
    // falta es la copia para abrir sin red, y la línea de estado lo dice.
  }
}

/**
 * Quien quiera enterarse de que la estantería ha cambiado por detrás.
 *
 * Hace falta porque la sincronización ya no ocurre solo cuando alguien pulsa
 * algo: pasa al volver a la pestaña, al recuperar la red y cada pocos minutos.
 * Sin un aviso, la estantería enseñaría lo de hace media hora.
 */
const oyentes = new Set<() => void>();

export function alCambiarBiblioteca(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export function notificarCambio(): void {
  for (const oyente of oyentes) {
    oyente();
  }
}

/**
 * Guardar lo que estamos a punto de tapar con una versión más nueva de otro
 * sitio. Nada de aquí puede ser el motivo de que un párrafo ya no esté.
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
    // Si hasta esto falla, ya no hay nada más que se pueda hacer aquí.
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
    // Nada que olvidar.
  }
}

/* ── Leer ─────────────────────────────────────────────────────────────────── */

export interface Catalogo {
  libros: LibroResumen[];
  /** La mejor de las que contestaron: en qué se apoya lo que se ve. */
  via: Via;
  /** El ordenador responde, así que se están escribiendo los .md de Drive. */
  servidorVivo: boolean;
  /** La nube cifrada contestó. */
  nubeViva: boolean;
  /** La cuenta contestó: lo de aquí se verá en los demás navegadores. */
  cuentaViva: boolean;
}

function resumir(slug: string, contenido: string, at: number): LibroResumen {
  const { meta, cuerpo } = descomponer(contenido);
  return { slug, meta, palabras: contarPalabras(cuerpo), actualizado: new Date(at).toISOString() };
}

function catalogar(biblioteca: Biblioteca): LibroResumen[] {
  return Object.entries(biblioteca.libros)
    .map(([slug, dato]) => resumir(slug, dato.contenido, dato.at))
    .sort((a, b) => b.actualizado.localeCompare(a.actualizado));
}

/**
 * El ordenador, como biblioteca.
 *
 * Solo se descarga el contenido de los libros que allí son más nuevos que aquí:
 * una novela son cientos de kB y volver a bajar los ocho libros enteros cada
 * vez que se abre la estantería es medio segundo de espera que no compra nada.
 */
async function pedirServidor(
  cache: Biblioteca,
): Promise<{ biblioteca: Biblioteca; lista: LibroServidor[] } | null> {
  const lista = await listarEnServidor();
  if (!lista) {
    return null;
  }
  const biblioteca = bibliotecaVacia();
  await Promise.all(
    lista.map(async (libro) => {
      const at = Date.parse(libro.updatedAt) || Date.now();
      const aqui = cache.libros[libro.slug];
      if (aqui && aqui.at >= at) {
        // Lo de aquí es igual o más nuevo: no hace falta bajarlo otra vez, y
        // fundir se queda igualmente con lo correcto.
        biblioteca.libros[libro.slug] = { contenido: aqui.contenido, at };
        return;
      }
      const contenido = await leerEnServidor(libro.slug);
      if (contenido !== null) {
        biblioteca.libros[libro.slug] = { contenido, at };
      }
    }),
  );
  return { biblioteca, lista };
}

async function pedirNube(): Promise<Biblioteca | null> {
  if (!hayClave()) {
    return null;
  }
  try {
    const doc = await leerDoc<unknown>(DOC_ESPEJO);
    return doc?.valor ? normalizar(doc.valor) : null;
  } catch {
    return null;
  }
}

/**
 * Preguntar a todos, fundir, y devolverles a todos la fusión.
 *
 * La segunda mitad es la que hace que esto sirva de algo: sin ella, cada
 * dispositivo se quedaria con la estantería completa en su pantalla y las
 * fuentes seguirian desparejas para siempre.
 */
export async function sincronizar(): Promise<Catalogo> {
  const cache = leerCache();

  const [delServidor, deCuenta, deNube] = await Promise.all([
    pedirServidor(cache).catch(() => null),
    hayCuenta() ? leerDeCuenta().catch(() => null) : Promise.resolve(null),
    pedirNube(),
  ]);

  const fundida = fundirTodas(cache, delServidor?.biblioteca, deCuenta, deNube);
  escribirCache(fundida);

  const servidorVivo = delServidor !== null;
  const nubeViva = deNube !== null;

  /* Devolver la fusión a la cuenta se ESPERA, porque su respuesta puede traer
     un capítulo de otro dispositivo escrito hace un segundo; lo demás se manda
     sin esperar, que la estantería no tiene por qué mirar a la red para
     pintarse. */
  let final = fundida;
  let cuentaViva = false;
  if (hayCuenta()) {
    const vuelta = await guardarEnCuenta(fundida).catch(() => null);
    if (vuelta) {
      cuentaViva = true;
      final = fundir(fundida, vuelta);
      escribirCache(final);
    }
  }

  void repartir(final, delServidor?.lista ?? null, nubeViva);

  return {
    libros: catalogar(final),
    via: servidorVivo ? "servidor" : cuentaViva ? "cuenta" : nubeViva ? "nube" : "local",
    servidorVivo,
    nubeViva,
    cuentaViva,
  };
}

/** El nombre viejo, que es el que llama la pantalla de inicio. */
export const cargarCatalogo = sincronizar;

/**
 * Lo que le falta a cada sitio, enviado sin que nadie espere.
 *
 * Al ordenador se le mandan los libros que aquí son más nuevos —que es como un
 * capítulo escrito en clase acaba siendo un .md de Drive— y se le pide que
 * borre los que tengan lápida. A la nube se le manda el espejo entero, que es
 * un solo documento.
 */
async function repartir(
  biblioteca: Biblioteca,
  enServidor: LibroServidor[] | null,
  nubeViva: boolean,
): Promise<void> {
  if (enServidor) {
    const suya: Biblioteca = { libros: {}, borrados: {} };
    for (const libro of enServidor) {
      suya.libros[libro.slug] = { contenido: "", at: Date.parse(libro.updatedAt) || 0 };
    }
    let repartido = false;
    for (const slug of loQueFalta(biblioteca, suya)) {
      repartido = (await guardarEnServidor(slug, biblioteca.libros[slug]!.contenido).catch(
        () => false,
      )) || repartido;
    }
    for (const slug of Object.keys(biblioteca.borrados)) {
      if (suya.libros[slug]) {
        await borrarEnServidor(slug).catch(() => false);
      }
    }
    if (repartido) {
      notificarCambio();
    }
  }

  if (nubeViva) {
    await escribirDoc(DOC_ESPEJO, biblioteca).catch(() => "inalcanzable" as const);
  }
}

/**
 * El archivo entero de un libro.
 *
 * De la caché si esta, que es abrir al instante; de la red solo cuando este
 * navegador no lo ha visto nunca. Lo que mantiene el texto al día no es esta
 * funcion sino la sincronización de fondo, que avisa por `alCambiarBiblioteca`
 * — y asi abrir un capítulo no depende de que conteste un túnel.
 */
export async function leerLibro(slug: string): Promise<string | null> {
  const cache = leerCache();
  const aqui = cache.libros[slug];
  if (aqui) {
    return aqui.contenido;
  }

  const [delServidor, deCuenta, deNube] = await Promise.all([
    leerEnServidor(slug).catch(() => null),
    hayCuenta() ? leerDeCuenta().catch(() => null) : Promise.resolve(null),
    pedirNube(),
  ]);

  const candidatos: Biblioteca[] = [cache];
  if (delServidor !== null) {
    candidatos.push({
      libros: { [slug]: { contenido: delServidor, at: Date.now() } },
      borrados: {},
    });
  }
  if (deCuenta) {
    candidatos.push(deCuenta);
  }
  if (deNube) {
    candidatos.push(deNube);
  }
  const fundida = fundirTodas(...candidatos);
  escribirCache(fundida);
  return fundida.libros[slug]?.contenido ?? null;
}

/** Lo que este navegador tiene de un libro ahora mismo, sin tocar la red. */
export function leerLibroDeCache(slug: string): { contenido: string; at: number } | null {
  return leerCache().libros[slug] ?? null;
}

/* ── Escribir ─────────────────────────────────────────────────────────────── */

export interface ResultadoGuardado {
  /** Dónde ha caído de verdad. Vacío significa en ningun sitio duradero. */
  en: Via[];
  /** El .md de Drive tiene (o va a tener) este texto. */
  enDisco: boolean;
  /** Puesto cuando nada duradero se lo quedó, para poder decir por qué. */
  problema?: string;
}

/**
 * Guardar un libro.
 *
 * Los tres destinos salen A LA VEZ, no en fila. Encadenados, un guardado desde
 * la web desplegada con el ordenador apagado costaba el tiempo de espera del
 * túnel MÁS el de la nube MÁS el de la cuenta —doce segundos largos— y eso se
 * nota escribiendo: la línea de estado se queda en «guardando…» y el siguiente
 * guardado ya viene pisando. En paralelo cuesta lo que el más lento.
 */
export async function guardarLibro(slug: string, contenido: string): Promise<ResultadoGuardado> {
  const ahora = Date.now();
  const biblioteca = leerCache();
  biblioteca.libros[slug] = { contenido, at: ahora };
  delete biblioteca.borrados[slug];
  escribirCache(biblioteca);

  const [enServidor, enNube, deCuenta] = await Promise.all([
    guardarEnServidor(slug, contenido).catch(() => false),
    subirEspejo(biblioteca),
    hayCuenta() ? guardarEnCuenta(biblioteca).catch(() => null) : Promise.resolve(null),
  ]);

  if (deCuenta) {
    /* La vuelta de la cuenta puede traer un libro que otro dispositivo acaba de
       escribir. Fundirla aquí es lo que hace que aparezca sin recargar. */
    const final = fundir(biblioteca, deCuenta);
    escribirCache(final);
    if (Object.keys(final.libros).length !== Object.keys(biblioteca.libros).length) {
      notificarCambio();
    }
  }

  const sitios: Via[] = [];
  if (enServidor) {
    sitios.push("servidor");
  }
  if (deCuenta) {
    sitios.push("cuenta");
  }
  if (enNube === "ok") {
    sitios.push("nube");
  }

  if (enServidor) {
    return { en: sitios, enDisco: true };
  }

  /* Sin ordenador, el texto va a la cola para que el lo aplique al .md cuando
     vuelva. Es lo que separa «una copia» de «el libro». */
  const encolado = await encolarCambio("PUT", "/writing/book", { slug, content: contenido }).catch(
    () => false,
  );

  if (sitios.length > 0) {
    return {
      en: sitios,
      enDisco: encolado,
      ...(encolado || sitios.includes("cuenta")
        ? {}
        : { problema: "Guardado en la nube, pero el ordenador aún no lo tiene en cola." }),
    };
  }

  return {
    en: [],
    enDisco: false,
    problema:
      enNube === "demasiado-grande"
        ? "El conjunto de libros no cabe ya en la nube. Archiva algúno."
        : hayCuenta()
          ? "Sin conexión: de momento solo esta en este navegador."
          : "Entra con tu cuenta para que lo escrito llegue a tus otros navegadores.",
  };
}

async function subirEspejo(biblioteca: Biblioteca): Promise<ResultadoEscritura> {
  if (!hayClave()) {
    return "sin-clave";
  }
  try {
    return await escribirDoc(DOC_ESPEJO, biblioteca, Date.now());
  } catch {
    return "inalcanzable";
  }
}

/** Empezar un libro. Devuelve su slug, que es el nombre que tendrá el archivo. */
export async function crearLibro(titulo: string): Promise<string> {
  const slug = libreDe(limpiarSlug(titulo));
  const meta = metaPorDefecto(titulo);
  await guardarLibro(slug, componer(meta, "# Primero\n\n"));
  return slug;
}

/** Un slug que no pise a otro libro: «Título», «Título 2», «Título 3»… */
function libreDe(slug: string): string {
  const libros = leerCache().libros;
  if (!libros[slug]) {
    return slug;
  }
  for (let n = 2; n < 500; n += 1) {
    if (!libros[`${slug} ${n}`]) {
      return `${slug} ${n}`;
    }
  }
  return `${slug} ${Date.now()}`;
}

export async function duplicarLibro(slug: string): Promise<string | null> {
  const original = await leerLibro(slug);
  if (original === null) {
    return null;
  }
  const { meta, cuerpo } = descomponer(original);
  const copia = `${meta.titulo} (copia)`;
  const nuevo = libreDe(limpiarSlug(copia));
  await guardarLibro(nuevo, componer({ ...meta, titulo: copia }, cuerpo));
  return nuevo;
}

export async function renombrarLibro(desde: string, hasta: string): Promise<boolean> {
  const limpio = limpiarSlug(hasta);
  if (limpio === desde) {
    return true;
  }
  const contenido = await leerLibro(desde);
  if (contenido === null) {
    return false;
  }

  const ahora = Date.now();
  const biblioteca = leerCache();
  biblioteca.libros[limpio] = { contenido, at: ahora };
  delete biblioteca.libros[desde];
  /* El nombre viejo lleva lápida como cualquier borrado: si no, el portátil que
     todavía tiene el libro con su nombre anterior lo devolvería a la
     estantería y el mismo texto saldría dos veces. */
  biblioteca.borrados[desde] = ahora;
  escribirCache(biblioteca);

  const enServidor = await renombrarEnServidor(desde, limpio).catch(() => false);
  await Promise.all([
    subirEspejo(biblioteca),
    hayCuenta() ? guardarEnCuenta(biblioteca).catch(() => null) : Promise.resolve(null),
    enServidor
      ? Promise.resolve(true)
      : encolarCambio("POST", "/writing/rename", { from: desde, to: limpio }).catch(() => false),
  ]);
  return true;
}

export async function borrarLibro(slug: string): Promise<boolean> {
  const contenido = leerCache().libros[slug]?.contenido ?? (await leerLibro(slug));
  if (contenido !== null) {
    // Borrar un manuscrito es la única acción sin deshacer, así que el texto se
    // queda en este navegador como «rescate» aunque el archivo ya no esté.
    guardarRescate(slug, contenido);
  }

  const biblioteca = leerCache();
  delete biblioteca.libros[slug];
  biblioteca.borrados[slug] = Date.now();
  escribirCache(biblioteca);

  const enServidor = await borrarEnServidor(slug).catch(() => false);
  await Promise.all([
    subirEspejo(biblioteca),
    hayCuenta() ? guardarEnCuenta(biblioteca).catch(() => null) : Promise.resolve(null),
    enServidor
      ? Promise.resolve(true)
      : encolarCambio("DELETE", `/writing/book?slug=${encodeURIComponent(slug)}`, undefined).catch(
          () => false,
        ),
  ]);
  return true;
}

/**
 * Un título convertido en nombre de archivo.
 *
 * El servidor rechaza cualquier cosa que pueda salirse de la carpeta Escritorio
 * o romper en Windows, así que los mismos caracteres se quitan aquí — un libro
 * no debería rechazarse después de haber escrito su nombre.
 */
export function limpiarSlug(titulo: string): string {
  const limpio = titulo
    .replace(/[\\/]/g, "·")
    .replace(/\.\.+/g, ".")
    .replace(/[<>:"|?*]/g, "")
    // Los caracteres de control no valen en un nombre de archivo de Windows.
    .replace(/\p{Cc}/gu, "")
    .replace(/\.md$/i, "")
    .trim();
  return limpio.length > 0 ? limpio : "Libro sin título";
}
