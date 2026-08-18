/**
 * The library server: Alexandria's API, which owns the real Markdown files.
 *
 * These are the SAME endpoints Alexandria's own Escritorio calls
 * (`/writing/*`, served by `apps/api/src/writing/`), pointed at the same folder
 * on Drive. Nothing here is a Scriptorium-only backend — that is what makes the
 * two apps one library rather than two copies.
 *
 * Where the server is, resolved on every request so the same build works from
 * the desk, from the phone on the Wi-Fi and from a classroom:
 *   1. an address typed into Ajustes (wins over everything);
 *   2. `localhost:4000` when this page is on localhost — in development Vite
 *      proxies `/writing` there, so it is same-origin and CORS cannot break it;
 *   3. the PC's public tunnel, discovered the way Alexandria discovers it, but
 *      ONLY when the library passphrase is stored here. A stranger who opens
 *      the deployed site must never see their own machine being probed.
 */

import { leerClave } from "./clave";

const DIRECCION_GUARDADA = "servidor.url";
const TUNEL_GUARDADO = "servidor.tunel";
const TUNEL_MIRADO = "servidor.tunel.visto";
/** Between failed rediscoveries, wait at least this long. */
const ESPERA_DESCUBRIMIENTO = 25_000;

/**
 * Where the PC publishes its current tunnel address.
 *
 * A Cloudflare quick tunnel is free but its URL changes on every restart, so
 * the PC writes the current one to this fixed Gist and every device reads it
 * from here. Same address Alexandria uses; if it ever moves, both move.
 */
const DESCUBRIMIENTO =
  "https://gist.githubusercontent.com/carlosgzl/1d72b97100270b9cc208b80093d61039/raw/alexandria-api.json";

export function direccionGuardada(): string | null {
  try {
    const guardada = localStorage.getItem(DIRECCION_GUARDADA);
    return guardada && guardada.trim().length > 0 ? normalizar(guardada) : null;
  } catch {
    return null;
  }
}

export function guardarDireccion(url: string | null): void {
  try {
    if (url && url.trim().length > 0) {
      localStorage.setItem(DIRECCION_GUARDADA, normalizar(url));
    } else {
      localStorage.removeItem(DIRECCION_GUARDADA);
    }
  } catch {
    // Session only.
  }
}

function normalizar(crudo: string): string {
  let url = crudo.trim().replace(/\/+$/, "");
  if (url.length > 0 && !/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }
  return url;
}

function enLocal(): boolean {
  const { hostname } = window.location;
  return hostname === "localhost" || hostname === "127.0.0.1" || /^192\.168\./.test(hostname);
}

function tunelGuardado(): string | null {
  try {
    const guardado = localStorage.getItem(TUNEL_GUARDADO);
    return guardado && /^https:\/\//.test(guardado) ? guardado : null;
  } catch {
    return null;
  }
}

function apuntarTunel(url: string | null): void {
  try {
    if (url) {
      localStorage.setItem(TUNEL_GUARDADO, url.replace(/\/+$/, ""));
    } else {
      localStorage.removeItem(TUNEL_GUARDADO);
    }
  } catch {
    // Session only.
  }
}

/** Forget a tunnel that proved dead, so the next call rediscovers instead of
 * paying the same dead round trip again. */
export function olvidarTunel(): void {
  apuntarTunel(null);
}

async function descubrirTunel(): Promise<string | null> {
  const guardado = tunelGuardado();
  if (guardado) {
    return guardado;
  }
  try {
    const visto = Number.parseInt(localStorage.getItem(TUNEL_MIRADO) ?? "0", 10);
    if (Date.now() - visto < ESPERA_DESCUBRIMIENTO) {
      return null;
    }
    localStorage.setItem(TUNEL_MIRADO, String(Date.now()));
  } catch {
    // No storage: just try.
  }
  try {
    const respuesta = await fetch(DESCUBRIMIENTO, { cache: "no-store" });
    if (!respuesta.ok) {
      return null;
    }
    const datos = (await respuesta.json()) as { url?: string };
    if (typeof datos.url === "string" && /^https:\/\//.test(datos.url)) {
      apuntarTunel(datos.url);
      return datos.url.replace(/\/+$/, "");
    }
  } catch {
    // No network, or the Gist moved.
  }
  return null;
}

/** The server's base address right now, or null when there is none to try. */
export async function baseServidor(): Promise<string | null> {
  const guardada = direccionGuardada();
  if (guardada) {
    return guardada;
  }
  if (enLocal()) {
    // Vite proxies /writing to :4000 in dev, so the empty base means
    // "same origin" and the browser never sees a cross-origin request.
    return import.meta.env.DEV ? "" : "http://localhost:4000";
  }
  // Deployed: only the owner goes looking for the PC.
  return leerClave() ? descubrirTunel() : null;
}

/** Requests through the tunnel must carry the library key; local ones must not. */
function esRemoto(base: string): boolean {
  if (base === "") {
    return false;
  }
  try {
    const { protocol, hostname } = new URL(base);
    if (protocol !== "https:") {
      return false;
    }
    return !(hostname === "localhost" || hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

async function llamar(ruta: string, init: RequestInit = {}): Promise<Response | null> {
  const base = await baseServidor();
  if (base === null) {
    return null;
  }
  const cabeceras: Record<string, string> = { ...((init.headers as Record<string, string>) ?? {}) };
  if (esRemoto(base)) {
    const clave = leerClave();
    if (!clave) {
      return null;
    }
    // The header the API's remote-key middleware looks for. Local and LAN
    // requests are exempt, which is why it is only attached out here.
    cabeceras["x-api-key"] = clave;
  }
  try {
    const respuesta = await fetch(`${base}${ruta}`, {
      ...init,
      headers: cabeceras,
      // A dead quick tunnel answers from Cloudflare's edge and can hang; the
      // app must fall back to the cloud rather than sit there spinning.
      signal: AbortSignal.timeout(esRemoto(base) ? 12_000 : 6_000),
    });
    if (!respuesta.ok && esRemoto(base) && respuesta.status >= 500) {
      olvidarTunel();
    }
    return respuesta;
  } catch {
    if (esRemoto(base)) {
      olvidarTunel();
    }
    return null;
  }
}

export interface LibroServidor {
  slug: string;
  title: string;
  updatedAt: string;
}

/** Every book the server knows about, or null when it did not answer. */
export async function listarEnServidor(): Promise<LibroServidor[] | null> {
  const respuesta = await llamar("/writing");
  if (!respuesta?.ok) {
    return null;
  }
  const datos = (await respuesta.json()) as { books?: LibroServidor[] };
  return datos.books ?? [];
}

export async function leerEnServidor(slug: string): Promise<string | null> {
  const respuesta = await llamar(`/writing/book?slug=${encodeURIComponent(slug)}`);
  if (!respuesta?.ok) {
    return null;
  }
  const datos = (await respuesta.json()) as { content?: string | null };
  return datos.content ?? null;
}

export async function guardarEnServidor(slug: string, contenido: string): Promise<boolean> {
  const respuesta = await llamar("/writing/book", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug, content: contenido }),
  });
  return Boolean(respuesta?.ok);
}

export async function renombrarEnServidor(desde: string, hasta: string): Promise<boolean> {
  const respuesta = await llamar("/writing/rename", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ from: desde, to: hasta }),
  });
  return Boolean(respuesta?.ok);
}

export async function borrarEnServidor(slug: string): Promise<boolean> {
  const respuesta = await llamar(`/writing/book?slug=${encodeURIComponent(slug)}`, {
    method: "DELETE",
  });
  return Boolean(respuesta?.ok);
}
