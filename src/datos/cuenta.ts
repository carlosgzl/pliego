/**
 * La cuenta como almacén: los mismos libros en todos los navegadores.
 *
 * ESTO ES EL PUENTE. El ordenador de casa tiene los .md de verdad pero está
 * apagado la mitad del día; la nube cifrada necesita la clave de la biblioteca,
 * que no se teclea en un ordenador de clase. La cuenta no necesita ninguna de
 * las dos cosas: basta con haber entrado, y entonces la estantería es la misma
 * en el portátil, en el móvil y en el navegador de al lado.
 *
 * Nunca sustituye: manda una biblioteca, el servidor la funde con la que tiene
 * y devuelve el resultado, que es el que se adopta aquí. Por eso dos
 * dispositivos escribiendo a la vez convergen en lugar de pisarse — y por eso
 * `guardarEnCuenta` devuelve datos en vez de un booleano.
 */

import { normalizar, type Biblioteca } from "./fusion";
import { leerSesion } from "./sesion";

const PUERTA = import.meta.env.DEV ? "https://pliego-cga.netlify.app" : "";

/** Ni la red ni una función tienen por qué tardar más que esto. */
const ESPERA = 12_000;

async function pedir(metodo: "GET" | "PUT", cuerpo?: unknown): Promise<Biblioteca | null> {
  const sesion = leerSesion();
  if (!sesion) {
    return null;
  }
  try {
    const respuesta = await fetch(`${PUERTA}/api/auth/datos`, {
      method: metodo,
      headers: {
        authorization: `Bearer ${sesion.token}`,
        ...(cuerpo ? { "content-type": "application/json" } : {}),
      },
      ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
      signal: AbortSignal.timeout(ESPERA),
    });
    if (!respuesta.ok) {
      return null;
    }
    return normalizar(await respuesta.json());
  } catch {
    return null; // sin red: se sigue con lo local, que para eso está
  }
}

/** Lo que la cuenta tiene ahora, o null si no contestó (que no es «vacía»). */
export function leerDeCuenta(): Promise<Biblioteca | null> {
  return pedir("GET");
}

/**
 * Sube una biblioteca y devuelve la fusión que ha quedado en el servidor.
 *
 * Devolver la fusión —y no un «ok»— es lo que cierra el círculo: si otro
 * dispositivo escribió mientras tanto, su capítulo vuelve en esta misma
 * respuesta y aparece en la estantería sin tener que recargar nada.
 */
export function guardarEnCuenta(biblioteca: Biblioteca): Promise<Biblioteca | null> {
  return pedir("PUT", { ...biblioteca, at: Date.now() });
}

export function hayCuenta(): boolean {
  return leerSesion() !== null;
}
