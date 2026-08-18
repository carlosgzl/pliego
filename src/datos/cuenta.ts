/**
 * La cuenta como almacén: los mismos libros en los dos ordenadores.
 *
 * ESTO ES LO QUE FALTABA. Los libros vivían en el `localStorage` del navegador,
 * así que abrir Pliego en el portátil era encontrarse la estantería vacía. Su
 * pregunta —«¿qué sentido tiene que solo se guarde en un navegador en
 * concreto?»— no tenía respuesta. Ahora la cuenta lleva los libros consigo.
 *
 * ORDEN DE PREFERENCIA, y el motivo de cada paso:
 *   1. el ordenador de casa, si responde: son los .md de verdad, en Drive;
 *   2. la cuenta, que es el puente entre dispositivos;
 *   3. este navegador, para abrir sin red y no perder nada si se cae.
 *
 * La mezcla es POR LIBRO y por fecha, no por conjunto. Mandar el paquete
 * entero dejaría que un portátil que llevaba una semana apagado borrase lo
 * escrito desde el móvil; comparando libro a libro, cada uno se queda con su
 * versión más nueva y no se pierde ninguno.
 */

import { leerSesion } from "./sesion";

const PUERTA = import.meta.env.DEV ? "https://pliego-cga.netlify.app" : "";

export interface LibroEnCuenta {
  contenido: string;
  at: number;
}

export interface DatosCuenta {
  libros: Record<string, LibroEnCuenta>;
  ajustes: unknown | null;
  at: number;
}

async function pedir(metodo: "GET" | "PUT", cuerpo?: unknown): Promise<DatosCuenta | null> {
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
    });
    if (!respuesta.ok) {
      return null;
    }
    return (await respuesta.json()) as DatosCuenta;
  } catch {
    return null; // sin red: se sigue con lo local, que para eso está
  }
}

export function leerDeCuenta(): Promise<DatosCuenta | null> {
  return pedir("GET");
}

/** Sube la mezcla ya hecha. Devuelve false si no llegó (y no se pierde nada). */
export async function guardarEnCuenta(datos: {
  libros: Record<string, LibroEnCuenta>;
  ajustes?: unknown;
}): Promise<boolean> {
  const resultado = await pedir("PUT", { ...datos, at: Date.now() });
  return resultado !== null;
}

/** Para cada libro, la copia más reciente de las dos. */
export function mezclar(
  mios: Record<string, LibroEnCuenta>,
  suyos: Record<string, LibroEnCuenta>,
): Record<string, LibroEnCuenta> {
  const salida: Record<string, LibroEnCuenta> = { ...suyos };
  for (const [slug, libro] of Object.entries(mios)) {
    const otro = salida[slug];
    if (!otro || libro.at >= otro.at) {
      salida[slug] = libro;
    }
  }
  return salida;
}
