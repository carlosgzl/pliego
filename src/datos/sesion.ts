/**
 * La sesión: quién está sentado delante.
 *
 * Two levels, and the difference is deliberate:
 *
 *   sin sesión   puedes mirar. La web abre, hay un libro de muestra, y todo el
 *                panel de diseño funciona sobre él — así se puede enseñar y
 *                probar sin pedirle nada a nadie. No se puede abrir la
 *                biblioteca de verdad ni guardar.
 *   con sesión   se desbloquea todo: la clave de la biblioteca, la estantería
 *                real y el guardado.
 *
 * WHAT THIS IS NOT. This is a lock on the door, not a safe. What actually keeps
 * the books unreadable to anyone else is the library passphrase, which never
 * leaves this browser and encrypts everything before it reaches a server. The
 * session decides who gets to use the app; the passphrase decides who can read
 * a word of it. Both matter and they are not the same thing.
 */

const ALMACEN = "pliego.sesion";

export interface Sesion {
  token: string;
  usuario: string;
  expira: number;
}

const oyentes = new Set<() => void>();

function avisarCambio(): void {
  for (const oyente of oyentes) {
    oyente();
  }
}

export function alCambiarSesion(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

/** The session held here, or null when there is none or it has run out. */
export function leerSesion(): Sesion | null {
  try {
    const crudo = localStorage.getItem(ALMACEN);
    if (!crudo) {
      return null;
    }
    const sesion = JSON.parse(crudo) as Sesion;
    if (!sesion?.token || typeof sesion.expira !== "number" || sesion.expira < Date.now()) {
      localStorage.removeItem(ALMACEN);
      return null;
    }
    return sesion;
  } catch {
    return null;
  }
}

function guardar(sesion: Sesion | null): void {
  try {
    if (sesion) {
      localStorage.setItem(ALMACEN, JSON.stringify(sesion));
    } else {
      localStorage.removeItem(ALMACEN);
    }
  } catch {
    // Private mode: the session lasts as long as the tab.
  }
  avisarCambio();
}

export function hayEntrado(): boolean {
  return leerSesion() !== null;
}

export type ResultadoEntrada =
  | { ok: true; sesion: Sesion }
  | { ok: false; motivo: string };

/**
 * Where the door lives.
 *
 * On the deployed site it is this same origin. In development there is no
 * Netlify runtime on the Vite port, so it points at the deployed function —
 * which is the honest thing: the door is the same door, and testing against a
 * fake one would prove nothing.
 */
const PUERTA = import.meta.env.DEV ? "https://pliego-cga.netlify.app" : "";

/** Crear cuenta. Mismo trato que entrar: si sale bien, ya estás dentro. */
export async function registrar(usuario: string, clave: string): Promise<ResultadoEntrada> {
  return llamar("registrar", usuario, clave);
}

export async function entrar(usuario: string, clave: string): Promise<ResultadoEntrada> {
  return llamar("entrar", usuario, clave);
}

async function llamar(
  ruta: "entrar" | "registrar",
  usuario: string,
  clave: string,
): Promise<ResultadoEntrada> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${PUERTA}/api/auth/${ruta}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ usuario, clave }),
    });
  } catch {
    return { ok: false, motivo: "No hay conexión con el servidor." };
  }

  if (!respuesta.ok) {
    /* El servidor ya explica qué ha pasado —el usuario existe, la contraseña es
       corta, el almacén no está—: repetirlo aquí en genérico solo empeora el
       mensaje. Se usa el suyo y se guarda uno de reserva por si no manda nada. */
    const datos = (await respuesta.json().catch(() => null)) as { error?: string } | null;
    return {
      ok: false,
      motivo: datos?.error ?? "No se ha podido completar. Inténtalo otra vez.",
    };
  }

  const datos = (await respuesta.json()) as { token?: string; expira?: number };
  if (!datos.token || !datos.expira) {
    return { ok: false, motivo: "El servidor ha contestado algo raro." };
  }
  const sesion: Sesion = { token: datos.token, usuario, expira: datos.expira };
  guardar(sesion);
  return { ok: true, sesion };
}

export function salir(): void {
  guardar(null);
}

/**
 * Borrarse del todo: la cuenta, los libros del servidor y lo publicado.
 *
 * Pide la contraseña otra vez aunque haya sesión abierta. Es la única acción de
 * la aplicación que no tiene vuelta atrás, y un testigo robado no puede bastar
 * para borrarle a alguien todo lo que ha escrito.
 *
 * Lo que queda en ESTE navegador no lo borra el servidor: eso se limpia aquí,
 * y se dice en la política de privacidad.
 */
export async function borrarCuenta(clave: string): Promise<{ ok: boolean; motivo?: string }> {
  const sesion = leerSesion();
  if (!sesion) {
    return { ok: false, motivo: "No hay ninguna sesión abierta." };
  }
  try {
    const respuesta = await fetch(`${PUERTA}/api/auth/cuenta`, {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${sesion.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ clave }),
    });
    if (!respuesta.ok) {
      const datos = (await respuesta.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, motivo: datos?.error ?? "No se ha podido borrar la cuenta." };
    }
  } catch {
    return { ok: false, motivo: "Sin conexión: inténtalo cuando vuelva." };
  }

  /* Y la copia local. Si esto se dejara, entrar con otra cuenta en el mismo
     navegador se encontraría con los libros de la anterior. */
  for (const llave of ["pliego.libros", "pliego.rescate", "pliego.borrador", "pliego.diario"]) {
    try {
      localStorage.removeItem(llave);
    } catch {
      // Modo privado: no había nada que borrar.
    }
  }
  guardar(null);
  return { ok: true };
}

/**
 * Ask the server whether this session is still good.
 *
 * The token carries its own expiry and is signed, so the client can already
 * tell a stale one from a fresh one. This is for the other case: a session
 * issued with a secret that has since been rotated. Silent — if the network is
 * down we keep what we have rather than throwing the writer out mid-chapter.
 */
export async function revisarSesion(): Promise<boolean> {
  const sesion = leerSesion();
  if (!sesion) {
    return false;
  }
  try {
    const respuesta = await fetch(`${PUERTA}/api/auth/sesion`, {
      headers: { authorization: `Bearer ${sesion.token}` },
    });
    if (respuesta.status === 401) {
      guardar(null);
      return false;
    }
    return respuesta.ok;
  } catch {
    return true; // sin red, la sesión que hay sigue valiendo
  }
}
