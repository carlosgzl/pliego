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

/*
 * DOS FAMILIAS DE RUTAS EN UNA SOLA FUNCIÓN, y es a propósito.
 *
 * `/api/auth/*` son las cuentas; `/api/plaza/*` es lo que se publica para que
 * lo lea cualquiera. Podrían ser dos archivos, y sería más ordenado — pero
 * entonces el segundo tendría que importar de aquí el token firmado, el acceso
 * a Blobs y la comprobación de sesión, y ya sabemos cómo acaba eso: el
 * empaquetador de Netlify se deja cosas fuera y la función revienta con un
 * error sin traza. Un archivo que se basta a sí mismo no puede fallar así.
 */
/*
 * `/api/plaza` VA APARTE DE `/api/plaza/*`, y no sobra.
 *
 * El comodín de Netlify exige que haya algo detrás de la barra, así que el
 * escaparate —que se pide a pelo, sin ruta detrás— no lo cogía la función: se
 * lo llevaba el `/* → /index.html` del SPA y la respuesta era la página web en
 * lugar de la lista. Comprobado contra el sitio desplegado.
 */
export const config = { path: ["/api/auth/*", "/api/plaza", "/api/plaza/*"] };

const DIAS = 30;
const SCRYPT = { N: 16384, r: 8, p: 1, largo: 32 };
/** Un almacén por cuenta; la clave es el nombre de usuario normalizado. */
const ALMACEN = "pliego-cuentas";

/*
 * LÍMITES DE LA PLAZA. No son burocracia: es una superficie pública donde
 * cualquiera con cuenta puede escribir, y sin topes un solo usuario podría
 * llenar el almacén del sitio en una tarde.
 */
const PLAZA = {
  /** Lo más largo que puede tener una obra publicada. Una novela larga cabe. */
  tope: 900_000,
  /** Cuántas puede tener publicadas a la vez una misma persona. */
  porPersona: 20,
  /** Cuántas caben en el escaparate. Las más antiguas salen de la lista. */
  enPortada: 300,
};

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

async function borrarBlob(clave) {
  const ctx = contexto();
  if (!ctx) {
    return;
  }
  await fetch(direccion(ctx, clave), {
    method: "DELETE",
    headers: { authorization: `Bearer ${ctx.token}` },
  }).catch(() => null);
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

/* Exportada además de usada: es la aritmética que decide qué versión de un
   capítulo sobrevive, y eso se prueba (`auth.test.mjs`). Netlify solo mira
   `default` y `config`, así que un nombre más aquí no cambia nada. */
export function fundir(unoCrudo, otroCrudo) {
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

/* ── La plaza: lo que se publica para que lo lea cualquiera ───────────────── */

/**
 * El escaparate: una sola lista con lo justo para pintar una portada.
 *
 * Se guarda aparte del texto de las obras a propósito. Quien entra en la plaza
 * quiere ver qué hay, y eso son treinta portadas con su título y su autor; si
 * la lista llevara dentro el texto de cada libro, abrir la plaza sería
 * descargarse una biblioteca entera para leer treinta títulos.
 */
async function leerEscaparate() {
  const guardado = await leerBlob("plaza/escaparate");
  return Array.isArray(guardado?.obras) ? guardado.obras : [];
}

function escribirEscaparate(obras) {
  /* Lo más nuevo primero, y con tope: una lista que crece sin límite acaba
     siendo un blob de megas que se lee entero en cada visita. */
  const orden = [...obras].sort((a, b) => (b.publicado ?? 0) - (a.publicado ?? 0));
  return escribirBlob("plaza/escaparate", { obras: orden.slice(0, PLAZA.enPortada) });
}

/** La portada sin nada pesado dentro: solo el diseño. */
function sinImagenes(portada) {
  if (!portada || typeof portada !== "object") {
    return null;
  }
  const { imagen: _fuera, elementos, ...resto } = portada;
  return {
    ...resto,
    imagen: null,
    elementos: Array.isArray(elementos)
      ? elementos.filter((elemento) => elemento?.tipo === "texto").slice(0, 8)
      : undefined,
  };
}

/** Un identificador de obra: legible, único y que vale como clave de blob. */
function idDeObra(usuario, slug) {
  const limpio = String(slug)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${usuario}/${limpio || "obra"}`;
}

async function rutasDeLaPlaza(request, ruta) {
  /* --- El escaparate, abierto a cualquiera ------------------------------- */
  if (ruta === "" && request.method === "GET") {
    return json({ obras: await leerEscaparate() });
  }

  /* --- Una obra, para leerla. También sin cuenta: de eso se trata -------- */
  if (ruta === "obra" && request.method === "GET") {
    const id = new URL(request.url).searchParams.get("id") ?? "";
    const obra = await leerBlob(`plaza/o/${id.replace(/\//g, "~")}`);
    return obra ? json(obra) : json({ error: "Esa obra ya no está publicada." }, 404);
  }

  /* --- Publicar. Aquí sí hace falta ser alguien -------------------------- */
  if (ruta === "obra" && request.method === "PUT") {
    const datos = comprobar(tokenDe(request));
    if (!datos) {
      return json({ error: "Hay que entrar para publicar." }, 401);
    }
    const cuerpo = await request.json().catch(() => null);
    const contenido = typeof cuerpo?.contenido === "string" ? cuerpo.contenido : "";
    const slug = String(cuerpo?.slug ?? "").trim();
    if (!slug || contenido.length === 0) {
      return json({ error: "Falta el libro." }, 400);
    }
    if (contenido.length > PLAZA.tope) {
      return json({ error: "La obra es demasiado larga para publicarla aquí." }, 413);
    }

    const escaparate = await leerEscaparate();
    const mias = escaparate.filter((obra) => obra.usuario === datos.u);
    const id = idDeObra(datos.u, slug);
    if (!mias.some((obra) => obra.id === id) && mias.length >= PLAZA.porPersona) {
      return json(
        { error: `Puedes tener ${PLAZA.porPersona} obras publicadas a la vez. Retira alguna.` },
        409,
      );
    }

    const ficha = {
      id,
      usuario: datos.u,
      titulo: String(cuerpo?.titulo ?? "Sin título").slice(0, 160),
      subtitulo: String(cuerpo?.subtitulo ?? "").slice(0, 200),
      autor: String(cuerpo?.autor ?? "").slice(0, 120),
      palabras: Number(cuerpo?.palabras) || 0,
      /*
       * La portada viaja como DISEÑO, no como imagen.
       *
       * El escaparate se pinta con el mismo componente que dibuja las portadas
       * dentro de la aplicación, así que le basta con los colores, las letras y
       * el material: unos cientos de bytes. Mandar la fotografía de fondo sería
       * meter cincuenta kB por obra en una sola lista que se descarga entera
       * cada vez que alguien entra en la plaza — trescientas obras, quince
       * megas. La fotografía se queda en la obra, y se ve al abrirla.
       */
      portada: sinImagenes(cuerpo?.portada),
      publicado: Date.now(),
    };

    await escribirBlob(`plaza/o/${id.replace(/\//g, "~")}`, { ...ficha, contenido });
    await escribirEscaparate([...escaparate.filter((obra) => obra.id !== id), ficha]);
    return json({ ok: true, id });
  }

  /* --- Retirar. Solo lo tuyo -------------------------------------------- */
  if (ruta === "obra" && request.method === "DELETE") {
    const datos = comprobar(tokenDe(request));
    if (!datos) {
      return json({ error: "Hay que entrar." }, 401);
    }
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!id.startsWith(`${datos.u}/`)) {
      return json({ error: "Esa obra no es tuya." }, 403);
    }
    await borrarBlob(`plaza/o/${id.replace(/\//g, "~")}`);
    await escribirEscaparate((await leerEscaparate()).filter((obra) => obra.id !== id));
    return json({ ok: true });
  }

  return json({ error: "No existe." }, 404);
}

/* ── Rutas ────────────────────────────────────────────────────────────────── */

export default async function handler(request) {
  const camino = new URL(request.url).pathname;
  const esPlaza = camino.startsWith("/api/plaza");
  const ruta = camino
    .replace(/^\/api\/(auth|plaza)\/?/, "")
    .replace(/\/+$/, "");

  if (!contexto()) {
    return json({ error: "El almacén no está disponible." }, 503);
  }

  if (esPlaza) {
    return rutasDeLaPlaza(request, ruta);
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

  /* --- Borrarse del todo -------------------------------------------------- */
  /*
   * NO ES UN EXTRA: la política de privacidad promete el derecho de supresión
   * del artículo 17 del RGPD, y una promesa que hay que pedir por correo y
   * esperar a que alguien la atienda a mano no es un derecho, es un trámite.
   * Aquí es inmediato y no hay periodo de gracia.
   *
   * PIDE LA CONTRASEÑA otra vez aunque haya sesión. Es la única acción sin
   * vuelta atrás de toda la aplicación, y un testigo robado no puede bastar
   * para borrarle a alguien todo lo que ha escrito.
   */
  if (ruta === "cuenta" && request.method === "DELETE") {
    const datos = comprobar(tokenDe(request));
    if (!datos) {
      return json({ error: "Hay que entrar." }, 401);
    }
    const cuerpo = await request.json().catch(() => null);
    const ficha = await leerBlob(`u/${datos.u}`);
    if (!ficha || !iguales(derivar(String(cuerpo?.clave ?? ""), ficha.sal), ficha.hash)) {
      return json({ error: "La contraseña no es correcta." }, 401);
    }

    /* Primero lo publicado —que es lo que ve el resto del mundo— y después lo
       suyo. En ese orden: si algo fallara a medias, es preferible quedarse con
       una cuenta sin obras que con obras huérfanas en la plaza. */
    const escaparate = await leerEscaparate();
    const mias = escaparate.filter((obra) => obra.usuario === datos.u);
    for (const obra of mias) {
      await borrarBlob(`plaza/o/${obra.id.replace(/\//g, "~")}`);
    }
    if (mias.length > 0) {
      await escribirEscaparate(escaparate.filter((obra) => obra.usuario !== datos.u));
    }
    await borrarBlob(`d/${datos.u}`);
    await borrarBlob(`u/${datos.u}`);
    return json({ ok: true, obrasRetiradas: mias.length });
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
