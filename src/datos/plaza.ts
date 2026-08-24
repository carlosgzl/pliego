/**
 * La plaza: lo que alguien decide enseñar a los demás.
 *
 * TODO LO DE AQUÍ ES DELIBERADAMENTE APARTE DE LA BIBLIOTECA. Un libro
 * publicado no es el mismo objeto que el libro que escribes: es una COPIA
 * congelada en el momento de publicarla, con su propio identificador y su
 * propia vida. Si fueran lo mismo, cada palabra que escribieras cambiaría lo
 * que otro está leyendo en ese instante, y borrar un borrador dejaría un hueco
 * en la estantería de un desconocido.
 *
 * Publicar es, entonces, un gesto explícito que se repite: escribes, y cuando
 * quieres, vuelves a publicar. Como una edición.
 *
 * LEER NO PIDE CUENTA. El escaparate y las obras se sirven a cualquiera que
 * llegue; la cuenta solo hace falta para PONER algo. Es lo que separa esto de
 * una red social cerrada: un enlace a una obra se puede mandar a quien sea.
 */

import { leerSesion } from "./sesion";

const PUERTA = import.meta.env.DEV ? "https://pliego-cga.netlify.app" : "";
const ESPERA = 15_000;

/** Lo justo para pintar una portada en el escaparate. */
export interface FichaPlaza {
  id: string;
  usuario: string;
  titulo: string;
  subtitulo: string;
  autor: string;
  palabras: number;
  /** El DISEÑO de la portada, sin la fotografía: se dibuja, no se descarga. */
  portada: unknown;
  publicado: number;
}

/** Una obra entera, ya con su texto. */
export interface ObraPlaza extends FichaPlaza {
  contenido: string;
}

async function pedir<T>(
  ruta: string,
  init: RequestInit = {},
  conSesion = false,
): Promise<T | null> {
  const cabeceras: Record<string, string> = { ...((init.headers as Record<string, string>) ?? {}) };
  if (conSesion) {
    const sesion = leerSesion();
    if (!sesion) {
      return null;
    }
    cabeceras.authorization = `Bearer ${sesion.token}`;
  }
  try {
    const respuesta = await fetch(`${PUERTA}/api/plaza${ruta}`, {
      ...init,
      headers: cabeceras,
      signal: AbortSignal.timeout(ESPERA),
    });
    if (!respuesta.ok) {
      /* El servidor explica qué ha pasado —demasiado larga, ya tienes veinte—
         y repetirlo aquí en genérico solo empeora el mensaje. */
      const datos = (await respuesta.json().catch(() => null)) as { error?: string } | null;
      throw new Error(datos?.error ?? "No se ha podido.");
    }
    return (await respuesta.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.message !== "No se ha podido.") {
      throw error;
    }
    throw new Error("No se ha podido conectar con la plaza.");
  }
}

/** Todo lo publicado, lo más nuevo primero. Sin cuenta. */
export async function leerEscaparate(): Promise<FichaPlaza[]> {
  const datos = await pedir<{ obras: FichaPlaza[] }>("");
  return datos?.obras ?? [];
}

/** Una obra entera para leerla. Sin cuenta. */
export function leerObra(id: string): Promise<ObraPlaza | null> {
  return pedir<ObraPlaza>(`/obra?id=${encodeURIComponent(id)}`);
}

export interface LoQueSePublica {
  slug: string;
  titulo: string;
  subtitulo: string;
  autor: string;
  palabras: number;
  portada: unknown;
  contenido: string;
}

/** Publicar o volver a publicar. Devuelve el identificador público. */
export async function publicar(obra: LoQueSePublica): Promise<string> {
  const datos = await pedir<{ id: string }>(
    "/obra",
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(obra),
    },
    true,
  );
  if (!datos?.id) {
    throw new Error("Hay que entrar para publicar.");
  }
  return datos.id;
}

/** Retirarla de la plaza. Solo puede quien la puso. */
export async function retirar(id: string): Promise<void> {
  await pedir(`/obra?id=${encodeURIComponent(id)}`, { method: "DELETE" }, true);
}

/**
 * El identificador que tendrá una obra tuya, sin llamar a nadie.
 *
 * Sirve para saber si ESTE libro ya está publicado sin preguntarle al servidor
 * por cada uno. Tiene que dar exactamente lo mismo que `idDeObra` de la función
 * de cuentas — si se separan, la aplicación diría «publicado» de una obra que
 * no lo está.
 */
export function idPrevisto(usuario: string, slug: string): string {
  const limpio = slug
    .toLowerCase()
    .normalize("NFD")
    // Los signos diacríticos que NFD acaba de separar de sus letras.
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${usuario}/${limpio || "obra"}`;
}
