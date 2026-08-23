/**
 * Cuentas de Pliego: registrarse, entrar, y llevarse los libros a otro sitio.
 *
 * POR QUÉ CAMBIÓ. La primera versión tenía un solo usuario y su contraseña en
 * variables de entorno: nadie más podía entrar, y él quería que se pudieran
 * crear cuentas. Y había algo peor — los libros se guardaban en el navegador,
 * así que abrir Pliego en el otro ordenador era encontrarse la estantería
 * vacía. Su pregunta era la correcta: «¿qué sentido tiene que solo se guarde en
 * un navegador en concreto?». Ninguno.
 *
 * Ahora cada cuenta tiene su espacio en Netlify Blobs y ahí viven los libros y
 * los ajustes. Entras con la misma cuenta en el portátil y está todo.
 *
 * SIN SERVICIOS DE TERCEROS. Ni Google, ni Supabase, ni Auth0: una función y un
 * almacén que ya vienen con el plan gratuito de Netlify. Nada que registrar,
 * nada que caduque, ninguna cuota que vigilar.
 *
 * CÓMO SE GUARDA UNA CONTRASEÑA, porque es lo que hay que hacer bien:
 *   · nunca en claro, ni en un registro, ni de vuelta en una respuesta;
 *   · scrypt con sal propia por usuario (N=16384), que es caro a propósito:
 *     probar contraseñas a lo bruto cuesta tiempo real;
 *   · la comparación es de tiempo constante, para no filtrar por cuánto tarda;
 *   · y el usuario se normaliza en minúsculas para que «Carlos» y «carlos» no
 *     sean dos cuentas distintas.
 *
 * La sesión es un testigo firmado con HMAC-SHA256 y caducidad dentro. El
 * servidor no guarda sesiones: si la firma cuadra y no ha caducado, vale.
 */

import {
  createHmac,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

export const config = { path: "/api/auth/*" };

const DIAS = 30;
const SCRYPT = { N: 16384, r: 8, p: 1, largo: 32 };
/** Un almacén por cuenta; la clave es el nombre de usuario normalizado. */
const ALMACEN = "pliego-cuentas";

const CABECERAS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function json(cuerpo, estado = 200) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: CABECERAS });
}

/* ── Netlify Blobs por REST ───────────────────────────────────────────────── */

/**
 * Se habla con Blobs por su API REST y no con `@netlify/blobs`.
 *
 * Es la misma lección que costó una sesión en Alexandria: el empaquetador deja
 * fuera esa dependencia y la función revienta con «error decoding lambda
 * response», sin traza y sin pista. El contexto que hace falta —URL, token y
 * el identificador del despliegue— llega en una variable de entorno.
 */
function contexto() {
  const crudo = process.env.NETLIFY_BLOBS_CONTEXT;
  if (!crudo) {
    return null;
  }
  try {
    const ctx = JSON.parse(Buffer.from(crudo, "base64").toString("utf8"));
    return ctx?.token && ctx?.siteID && (ctx.uncachedEdgeURL || ctx.edgeURL) ? ctx : null;
  } catch {
    return null;
  }
}

/**
 * La dirección de un blob. Dos detalles que costaron una tanda de pruebas.
 *
 * 1. `uncachedEdgeURL`, NO `edgeURL`. El borde con caché es de consistencia
 *    eventual: se crea una cuenta, se lee un segundo después y no está. Justo
 *    lo que pasaba — el registro decía «creada» y entrar acto seguido fallaba,
 *    y un libro guardado volvía vacío. Para un almacén de cuentas eso no vale.
 * 2. El prefijo `site:`. Sin él el almacén es del DESPLIEGUE, así que cada vez
 *    que se sube un cambio se estrena almacén vacío y desaparecen las cuentas.
 *    Con `site:` el almacén es del sitio y sobrevive a los despliegues.
 *
 * Es la misma lección que ya está aprendida en `nube.mjs` de Alexandria.
 */
function direccion(ctx, clave) {
  const base = ctx.uncachedEdgeURL ?? ctx.edgeURL;
  return new URL(`/${ctx.siteID}/site:${ALMACEN}/${encodeURIComponent(clave)}`, base).toString();
}

async function leerBlob(clave) {
  const ctx = contexto();
  if (!ctx) {
    return null;
  }
  const respuesta = await fetch(direccion(ctx, clave), {
    headers: { authorization: `Bearer ${ctx.token}` },
  });
  if (respuesta.status === 404) {
    return null;
  }
  if (!respuesta.ok) {
    throw new Error(`blobs ${respuesta.status}`);
  }
  return respuesta.json();
}

async function escribirBlob(clave, valor) {
  const ctx = contexto();
  if (!ctx) {
    throw new Error("sin almacén");
  }
  const respuesta = await fetch(direccion(ctx, clave), {
    method: "PUT",
    headers: { authorization: `Bearer ${ctx.token}`, "content-type": "application/json" },
    body: JSON.stringify(valor),
  });
  if (!respuesta.ok) {
    throw new Error(`blobs ${respuesta.status}`);
  }
}

/* ── Contraseñas y sesiones ───────────────────────────────────────────────── */

function derivar(clave, sal) {
  return scryptSync(clave, sal, SCRYPT.largo, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    // scrypt con N=16384 pide más memoria de la que Node concede por defecto.
    maxmem: 64 * 1024 * 1024,
  }).toString("hex");
}

function iguales(a, b) {
  const ha = createHmac("sha256", "cmp").update(String(a)).digest();
  const hb = createHmac("sha256", "cmp").update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * El secreto que firma las sesiones.
 *
 * Si está puesto en el entorno, ese; si no, uno derivado del token del almacén,
 * que es estable para este sitio y no viaja a ningún sitio. Así la puerta
 * funciona en un despliegue recién hecho sin configurar nada a mano — que es
 * justo lo que él pidió: «que no me dé problemas».
 */
function secreto() {
  if (process.env.PLIEGO_SECRETO) {
    return process.env.PLIEGO_SECRETO;
  }
  const ctx = contexto();
  return ctx ? createHmac("sha256", "pliego-sesiones").update(ctx.token).digest("hex") : null;
}

function firmar(datos) {
  const llave = secreto();
  const cuerpo = Buffer.from(JSON.stringify(datos)).toString("base64url");
  const firma = createHmac("sha256", llave).update(cuerpo).digest("base64url");
  return `${cuerpo}.${firma}`;
}

function comprobar(token) {
  const llave = secreto();
  if (!llave || typeof token !== "string" || !token.includes(".")) {
    return null;
  }
  const [cuerpo, firma] = token.split(".");
  const esperada = createHmac("sha256", llave).update(cuerpo).digest("base64url");
  if (!firma || !iguales(firma, esperada)) {
    return null;
  }
  try {
    const datos = JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf8"));
    return typeof datos?.exp === "number" && datos.exp > Date.now() ? datos : null;
  } catch {
    return null;
  }
}

function tokenDe(request) {
  const cabecera = request.headers.get("authorization") ?? "";
  return cabecera.startsWith("Bearer ") ? cabecera.slice(7) : null;
}

function normalizar(usuario) {
  return String(usuario ?? "")
    .trim()
    .toLowerCase();
}

/** Qué nombres de usuario se aceptan. Aburrido a propósito: es una clave de blob. */
const USUARIO_VALIDO = /^[a-z0-9._-]{3,32}$/;

function sesionNueva(usuario) {
  const exp = Date.now() + DIAS * 24 * 60 * 60 * 1000;
  return { token: firmar({ u: usuario, sid: randomUUID(), iat: Date.now(), exp }), expira: exp };
}

/* ── Fundir bibliotecas ───────────────────────────────────────────────────── */

/**
 * La misma aritmética que `src/datos/fusion.ts`, y por el mismo motivo: nunca
 * se sustituye una copia por otra, se funde libro a libro y gana el más nuevo.
 * Un borrado deja una lápida —`borrados[slug] = cuándo`— que mata a las copias
 * anteriores a ella; sin eso, el primer dispositivo que llevara una semana
 * apagado resucitaría lo borrado en cuanto volviera.
 *
 * ⚠ Si cambia esto, cambia `fusion.ts` en el cliente.
 */
const VIDA_LAPIDA = 90 * 24 * 60 * 60 * 1000;

function normalizarBiblioteca(crudo) {
  const salida = { libros: {}, borrados: {} };
  if (!crudo || typeof crudo !== "object") {
    return salida;
  }
  if (crudo.libros && typeof crudo.libros === "object") {
    for (const [slug, libro] of Object.entries(crudo.libros)) {
      if (libro && typeof libro.contenido === "string") {
        salida.libros[slug] = {
          contenido: libro.contenido,
          at: Number.isFinite(libro.at) ? libro.at : 0,
        };
      }
    }
  }
  if (crudo.borrados && typeof crudo.borrados === "object") {
    for (const [slug, at] of Object.entries(crudo.borrados)) {
      if (Number.isFinite(at)) {
        salida.borrados[slug] = at;
      }
    }
  }
  return salida;
}

function fundir(unoCrudo, otroCrudo) {
  const uno = normalizarBiblioteca(unoCrudo);
  const otro = normalizarBiblioteca(otroCrudo);

  const borrados = { ...uno.borrados };
  for (const [slug, at] of Object.entries(otro.borrados)) {
    borrados[slug] = Math.max(borrados[slug] ?? 0, at);
  }

  const libros = {};
  for (const slug of new Set([...Object.keys(uno.libros), ...Object.keys(otro.libros)])) {
    const mio = uno.libros[slug];
    const suyo = otro.libros[slug];
    const gana = !suyo || (mio && mio.at >= suyo.at) ? mio : suyo;
    if (!gana) {
      continue;
    }
    const lapida = borrados[slug];
    if (lapida !== undefined && lapida >= gana.at) {
      continue;
    }
    libros[slug] = gana;
  }

  const ahora = Date.now();
  const vivas = {};
  for (const [slug, at] of Object.entries(borrados)) {
    if (ahora - at < VIDA_LAPIDA && !libros[slug]) {
      vivas[slug] = at;
    }
  }
  return { libros, borrados: vivas };
}

/* ── Rutas ────────────────────────────────────────────────────────────────── */

export default async function handler(request) {
  const ruta = new URL(request.url).pathname.replace(/^\/api\/auth\/?/, "").replace(/\/+$/, "");

  if (!contexto()) {
    return json({ error: "El almacén de cuentas no está disponible." }, 503);
  }

  /* --- Quién soy --------------------------------------------------------- */
  if (ruta === "sesion") {
    const datos = comprobar(tokenDe(request));
    return datos ? json({ ok: true, usuario: datos.u, expira: datos.exp }) : json({ ok: false }, 401);
  }

  /* --- Crear cuenta ------------------------------------------------------ */
  if (ruta === "registrar" && request.method === "POST") {
    const cuerpo = await request.json().catch(() => null);
    const usuario = normalizar(cuerpo?.usuario);
    const clave = String(cuerpo?.clave ?? "");

    if (!USUARIO_VALIDO.test(usuario)) {
      return json(
        { error: "El usuario debe tener entre 3 y 32 letras, números, puntos o guiones." },
        400,
      );
    }
    if (clave.length < 8) {
      return json({ error: "La contraseña necesita ocho caracteres como mínimo." }, 400);
    }
    if (await leerBlob(`u/${usuario}`)) {
      return json({ error: "Ese usuario ya existe." }, 409);
    }

    const sal = randomBytes(16).toString("hex");
    await escribirBlob(`u/${usuario}`, {
      usuario,
      sal,
      hash: derivar(clave, sal),
      creado: new Date().toISOString(),
    });
    return json(sesionNueva(usuario), 201);
  }

  /* --- Entrar ------------------------------------------------------------ */
  if (ruta === "entrar" && request.method === "POST") {
    const cuerpo = await request.json().catch(() => null);
    const usuario = normalizar(cuerpo?.usuario);
    const clave = String(cuerpo?.clave ?? "");
    const ficha = USUARIO_VALIDO.test(usuario) ? await leerBlob(`u/${usuario}`) : null;

    /* La derivación se hace SIEMPRE, exista el usuario o no, contra una sal de
       pega. Si solo se hiciera cuando el usuario existe, la diferencia de
       tiempo diría qué nombres están registrados. */
    const sal = ficha?.sal ?? "0".repeat(32);
    const derivada = derivar(clave, sal);
    if (!ficha || !iguales(derivada, ficha.hash)) {
      return json({ error: "Usuario o contraseña incorrectos." }, 401);
    }
    return json(sesionNueva(usuario));
  }

  /* --- Los datos de la cuenta: libros y ajustes --------------------------- */
  if (ruta === "datos") {
    const datos = comprobar(tokenDe(request));
    if (!datos) {
      return json({ error: "Hay que entrar." }, 401);
    }
    const clave = `d/${datos.u}`;

    if (request.method === "GET") {
      return json((await leerBlob(clave)) ?? { libros: {}, borrados: {}, ajustes: null, at: 0 });
    }

    if (request.method === "PUT") {
      const cuerpo = await request.json().catch(() => null);
      if (!cuerpo || typeof cuerpo !== "object") {
        return json({ error: "Contenido no válido." }, 400);
      }
      /*
       * SE FUNDE AQUÍ, no se sustituye.
       *
       * Antes ganaba el paquete entero más reciente, y eso tiene una carrera de
       * verdad: dos dispositivos leen a la vez, los dos escriben, y el segundo
       * borra el capítulo del primero porque su paquete es un segundo más
       * nuevo. Fundiendo libro a libro contra lo que hay en el momento de
       * escribir, ese caso converge en vez de perder prosa.
       *
       * La respuesta es la fusión, así que el cliente se entera al momento de
       * lo que escribió el otro dispositivo.
       */
      const actual = await leerBlob(clave);
      const at = typeof cuerpo.at === "number" ? cuerpo.at : Date.now();
      const fundido = fundir(actual, cuerpo);
      const ajustes = cuerpo.ajustes ?? actual?.ajustes ?? null;
      const salida = { ...fundido, ajustes, at: Math.max(at, actual?.at ?? 0) };
      await escribirBlob(clave, salida);
      return json(salida);
    }
  }

  return json({ error: "No existe." }, 404);
}
