/**
 * The Alexandria cloud store, from Pliego.
 *
 * THIS IS THE SHARED API. Alexandria's Netlify function (`/api/nube/*`) already
 * holds an encrypted, always-on store that its own PC drains into the real
 * Markdown files on Drive. Pliego speaks the exact same protocol, so the
 * two apps are looking at ONE library — write a chapter here and Alexandria
 * shows it, with no second server, no second account and no copy to keep in
 * sync.
 *
 * The protocol, which must not drift from Alexandria's `lib/cloud-store.ts`
 * and `netlify/functions/nube.mjs`:
 *
 *   auth      x-alx-token: hex( PBKDF2-SHA256(clave, "alexandria-nube-auth", 210k) )
 *   cifrado   "ALXC" + iv(12) + AES-256-GCM(json), base64
 *             key = PBKDF2-SHA256(clave, "alexandria-nube-cambios", 210k)
 *   GET/PUT   /api/nube/datos/<nombre>   → { updatedAt, payload }
 *   POST      /api/nube/cambios          → { payload } (una escritura en cola)
 *
 * Netlify only ever holds ciphertext, and the token is useless for decrypting
 * it. Change any of these constants and the two apps stop seeing each other.
 */

import { leerClave } from "./clave";

/** Where the store lives. Same site as Alexandria — that is the point. */
export const SITIO_NUBE =
  (import.meta.env.VITE_NUBE_URL as string | undefined) ??
  "https://alexandria-carlosgzl.netlify.app";

const RONDAS = 210_000;
const SAL_AUTH = "alexandria-nube-auth";
const SAL_DATOS = "alexandria-nube-cambios";
const TOKEN_GUARDADO = "nube.token";
const TOKEN_PARA = "nube.token.para";

const codificador = new TextEncoder();
const decodificador = new TextDecoder();

/* ── Keys ─────────────────────────────────────────────────────────────────── */

async function claveBase(clave: string, usos: KeyUsage[]): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", codificador.encode(clave), "PBKDF2", false, [
    "deriveKey",
    "deriveBits",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: codificador.encode(SAL_DATOS), iterations: RONDAS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    usos,
  );
}

let claveDatos: { para: string; promesa: Promise<CryptoKey> } | null = null;

function claveDeDatos(clave: string): Promise<CryptoKey> {
  if (!claveDatos || claveDatos.para !== clave) {
    claveDatos = { para: clave, promesa: claveBase(clave, ["encrypt", "decrypt"]) };
  }
  return claveDatos.promesa;
}

/**
 * The access token proving we hold the passphrase.
 *
 * Deriving it costs about half a second of PBKDF2, so it is cached next to the
 * passphrase it belongs to and recomputed automatically if that ever changes.
 */
let tokenEnCurso: { para: string; promesa: Promise<string> } | null = null;

export async function tokenNube(): Promise<string | null> {
  const clave = leerClave();
  if (!clave) {
    return null;
  }
  if (tokenEnCurso?.para === clave) {
    return tokenEnCurso.promesa;
  }
  const promesa = (async () => {
    try {
      if (localStorage.getItem(TOKEN_PARA) === clave) {
        const guardado = localStorage.getItem(TOKEN_GUARDADO);
        if (guardado) {
          return guardado;
        }
      }
    } catch {
      // No storage: derive it every time.
    }
    const material = await crypto.subtle.importKey(
      "raw",
      codificador.encode(clave),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: codificador.encode(SAL_AUTH), iterations: RONDAS, hash: "SHA-256" },
      material,
      256,
    );
    const token = Array.from(new Uint8Array(bits))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    try {
      localStorage.setItem(TOKEN_GUARDADO, token);
      localStorage.setItem(TOKEN_PARA, clave);
    } catch {
      // Session only.
    }
    return token;
  })();
  tokenEnCurso = { para: clave, promesa };
  return promesa;
}

export function olvidarToken(): void {
  tokenEnCurso = null;
  claveDatos = null;
  try {
    localStorage.removeItem(TOKEN_GUARDADO);
    localStorage.removeItem(TOKEN_PARA);
  } catch {
    // Nothing cached.
  }
}

/* ── Base64 ───────────────────────────────────────────────────────────────── */

function aBase64(bytes: Uint8Array): string {
  let binario = "";
  for (const byte of bytes) {
    binario += String.fromCharCode(byte);
  }
  return btoa(binario);
}

function deBase64(texto: string): Uint8Array {
  const binario = atob(texto);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) {
    bytes[i] = binario.charCodeAt(i);
  }
  return bytes;
}

async function cifrar(valor: unknown, clave: string): Promise<string> {
  const key = await claveDeDatos(clave);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifrado = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    codificador.encode(JSON.stringify(valor)),
  );
  const cuerpo = new Uint8Array(cifrado);
  const salida = new Uint8Array(4 + iv.length + cuerpo.length);
  salida.set(codificador.encode("ALXC"), 0);
  salida.set(iv, 4);
  salida.set(cuerpo, 16);
  return aBase64(salida);
}

async function descifrar<T>(payload: string, clave: string): Promise<T | null> {
  try {
    const crudo = deBase64(payload);
    if (decodificador.decode(crudo.slice(0, 4)) !== "ALXC") {
      return null;
    }
    const key = await claveDeDatos(clave);
    const plano = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: crudo.slice(4, 16) },
      key,
      crudo.slice(16),
    );
    return JSON.parse(decodificador.decode(plano)) as T;
  } catch {
    // Written with another passphrase, or corrupt. Not an error we can fix.
    return null;
  }
}

/* ── Requests ─────────────────────────────────────────────────────────────── */

async function pedir(ruta: string, init: RequestInit = {}): Promise<Response | null> {
  const token = await tokenNube();
  if (!token) {
    return null;
  }
  try {
    return await fetch(`${SITIO_NUBE}/api/nube/${ruta}`, {
      ...init,
      headers: { ...(init.headers ?? {}), "x-alx-token": token },
    });
  } catch {
    return null; // offline
  }
}

export type EstadoNube = "sin-clave" | "inalcanzable" | "rechazada" | "lista";

/** Whether the cloud is reachable AND this passphrase opens it. */
export async function comprobarNube(): Promise<EstadoNube> {
  if (!leerClave()) {
    return "sin-clave";
  }
  const respuesta = await pedir("estado");
  if (!respuesta) {
    return "inalcanzable";
  }
  if (respuesta.status === 401 || respuesta.status === 403) {
    return "rechazada";
  }
  return respuesta.ok ? "lista" : "inalcanzable";
}

export interface DocNube<T> {
  /** When the store says it was last written (ms since epoch, 0 if never). */
  at: number;
  valor: T | null;
}

/**
 * Read a shared document.
 *
 * `null` means the store could not be reached or read. A DocNube with
 * `valor: null` means the store answered and there is simply nothing there —
 * the caller needs the difference to tell "no hay libros" from "no hay nube".
 */
export async function leerDoc<T>(nombre: string): Promise<DocNube<T> | null> {
  const clave = leerClave();
  if (!clave) {
    return null;
  }
  const respuesta = await pedir(`datos/${nombre}`);
  if (!respuesta?.ok) {
    return null;
  }
  const guardado = (await respuesta.json()) as { updatedAt?: number; payload?: string | null };
  if (!guardado.payload) {
    return { at: guardado.updatedAt ?? 0, valor: null };
  }
  const valor = await descifrar<T>(guardado.payload, clave);
  return { at: guardado.updatedAt ?? 0, valor };
}

/** The store refuses anything over 4 MB of ciphertext. Stop well short. */
export const TOPE_DOC = 3_500_000;

export type ResultadoEscritura = "ok" | "sin-clave" | "inalcanzable" | "demasiado-grande";

export async function escribirDoc(
  nombre: string,
  valor: unknown,
  at = Date.now(),
): Promise<ResultadoEscritura> {
  const clave = leerClave();
  if (!clave) {
    return "sin-clave";
  }
  const payload = await cifrar(valor, clave);
  if (payload.length > TOPE_DOC) {
    return "demasiado-grande";
  }
  const respuesta = await pedir(`datos/${nombre}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ payload, updatedAt: at }),
  });
  return respuesta?.ok ? "ok" : "inalcanzable";
}

/**
 * Queue one write for the PC to apply to the real Markdown file.
 *
 * The shared document above makes a change visible on every device in seconds,
 * but it is a mirror: the book on Drive only changes when the PC drains this
 * log (`scripts/sincronizar-nube.mjs`) and replays the request against its own
 * API. Both are needed — the mirror so you can keep writing, the queue so the
 * file is really the book.
 */
export async function encolarCambio(
  method: string,
  path: string,
  body: unknown,
): Promise<boolean> {
  const clave = leerClave();
  if (!clave) {
    return false;
  }
  const payload = await cifrar({ method, path, body, at: new Date().toISOString() }, clave);
  const respuesta = await pedir("cambios", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ payload }),
  });
  return Boolean(respuesta?.ok);
}
