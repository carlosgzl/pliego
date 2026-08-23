/**
 * Cómo se juntan dos copias de la biblioteca sin perder nada.
 *
 * ESTE ES EL ARCHIVO QUE ARREGLA «los libros no están en todos los
 * navegadores». Antes cada fuente —el ordenador, la cuenta, la nube, este
 * navegador— se creía la verdad entera: si el ordenador contestaba, su lista
 * SUSTITUÍA a las demás, así que un capítulo escrito en el portátil
 * desaparecía de la estantería en cuanto se abría Pliego en casa. Y al revés:
 * los libros del ordenador no subían nunca a la cuenta, de modo que el
 * portátil jamás llegaba a verlos.
 *
 * La regla ahora es una sola y vale para todas las fuentes: **nunca se
 * sustituye, siempre se funde, libro a libro y por fecha**. Cada copia aporta
 * lo que tiene más nuevo y se queda con lo más nuevo de la otra. Una fuente que
 * no conoce un libro no es una fuente que diga que ese libro no existe.
 *
 * BORRAR ES LO QUE OBLIGA A LAS LÁPIDAS. Si borrar fuese simplemente «quitarlo
 * de mi lista», el primer dispositivo que llevara una semana apagado lo
 * resucitaría al fundir: su copia tendría el libro y la nuestra no, y fundir
 * es quedarse con la unión. Por eso un borrado deja una lápida —el slug y
 * cuándo se borró— que viaja igual que un libro y gana a cualquier copia
 * anterior a ella. Se guardan noventa días, que es mucho más de lo que tarda
 * cualquier dispositivo suyo en volver a conectarse.
 *
 * Lo de aquí es aritmética pura, sin red y sin React, y por eso está probado:
 * es la parte que puede tragarse un capítulo sin que nadie se entere.
 *
 * ⚠ La MISMA lógica vive en `netlify/functions/auth.mjs` (`fundir`), porque el
 * almacén de la cuenta tiene que converger aunque dos dispositivos escriban a
 * la vez. Si cambia aquí, cambia allí.
 */

export interface LibroGuardado {
  contenido: string;
  /** Milisegundos. Cuándo se escribió ESTA copia. */
  at: number;
}

export interface Biblioteca {
  libros: Record<string, LibroGuardado>;
  /** slug → cuándo se borró. Ver arriba por qué hacen falta. */
  borrados: Record<string, number>;
}

/** Noventa días: mucho más de lo que tarda un dispositivo suyo en volver. */
export const VIDA_LAPIDA = 90 * 24 * 60 * 60 * 1000;

export function bibliotecaVacia(): Biblioteca {
  return { libros: {}, borrados: {} };
}

/**
 * Acepta cualquier cosa que venga de un almacén —una versión antigua sin
 * lápidas, un JSON a medias, `null`— y devuelve una biblioteca con forma.
 *
 * Se es deliberadamente permisivo: un campo raro en el almacén no puede ser el
 * motivo de que alguien abra la estantería y no vea sus libros.
 */
export function normalizar(crudo: unknown): Biblioteca {
  const salida = bibliotecaVacia();
  if (!crudo || typeof crudo !== "object") {
    return salida;
  }
  const dato = crudo as { libros?: unknown; borrados?: unknown };
  if (dato.libros && typeof dato.libros === "object") {
    for (const [slug, valor] of Object.entries(dato.libros as Record<string, unknown>)) {
      const libro = valor as { contenido?: unknown; at?: unknown };
      if (typeof libro?.contenido === "string") {
        salida.libros[slug] = {
          contenido: libro.contenido,
          at: typeof libro.at === "number" && Number.isFinite(libro.at) ? libro.at : 0,
        };
      }
    }
  }
  if (dato.borrados && typeof dato.borrados === "object") {
    for (const [slug, valor] of Object.entries(dato.borrados as Record<string, unknown>)) {
      if (typeof valor === "number" && Number.isFinite(valor)) {
        salida.borrados[slug] = valor;
      }
    }
  }
  return salida;
}

/**
 * Las dos copias, en una.
 *
 * Sin preferencia por ninguna de las dos: es conmutativa y asociativa a
 * propósito, para que dé igual en qué orden lleguen las fuentes y para que
 * fundir dos veces no cambie el resultado. Empatar a milisegundo es tan raro
 * que el desempate (gana `a`) solo tiene que ser estable, no justo.
 */
export function fundir(a: Biblioteca, b: Biblioteca): Biblioteca {
  const borrados: Record<string, number> = { ...a.borrados };
  for (const [slug, at] of Object.entries(b.borrados)) {
    borrados[slug] = Math.max(borrados[slug] ?? 0, at);
  }

  const libros: Record<string, LibroGuardado> = {};
  for (const slug of new Set([...Object.keys(a.libros), ...Object.keys(b.libros)])) {
    const mio = a.libros[slug];
    const suyo = b.libros[slug];
    const gana = !suyo || (mio && mio.at >= suyo.at) ? mio : suyo;
    if (!gana) {
      continue;
    }
    /* Una lápida solo mata a las copias ANTERIORES a ella. Volver a escribir un
       libro después de borrarlo lo resucita, que es lo que uno espera cuando
       recupera un rescate y sigue escribiendo. */
    const lapida = borrados[slug];
    if (lapida !== undefined && lapida >= gana.at) {
      continue;
    }
    libros[slug] = gana;
  }

  return { libros, borrados: podar(borrados, libros) };
}

/** Funde muchas de una vez, ignorando las que no llegaron. */
export function fundirTodas(...copias: (Biblioteca | null | undefined)[]): Biblioteca {
  let salida = bibliotecaVacia();
  for (const copia of copias) {
    if (copia) {
      salida = fundir(salida, copia);
    }
  }
  return salida;
}

/**
 * Lápidas que ya no sirven: las muy viejas, y las de un libro que ha vuelto.
 *
 * Sin esto la lista de borrados crece para siempre dentro de un blob que se
 * manda entero en cada guardado.
 */
function podar(
  borrados: Record<string, number>,
  libros: Record<string, LibroGuardado>,
  ahora = Date.now(),
): Record<string, number> {
  const salida: Record<string, number> = {};
  for (const [slug, at] of Object.entries(borrados)) {
    if (ahora - at < VIDA_LAPIDA && !libros[slug]) {
      salida[slug] = at;
    }
  }
  return salida;
}

/** Qué libros de `origen` le faltan a `destino` o los tiene más viejos. */
export function loQueFalta(origen: Biblioteca, destino: Biblioteca): string[] {
  return Object.keys(origen.libros).filter((slug) => {
    const alla = destino.libros[slug];
    return !alla || alla.at < origen.libros[slug]!.at;
  });
}
