/**
 * La puerta de Pliego: quién puede escribir.
 *
 * WHAT THIS DOES AND WHAT IT HONESTLY DOES NOT. This function decides who gets
 * a session, and a session is what unlocks the writing half of the app. It is
 * NOT what keeps the books secret — that is the library passphrase, which never
 * leaves the browser and encrypts everything before it reaches any server. Two
 * different jobs: this one is a lock on the door, that one is a safe.
 *
 * Why it is a function and not a check in the browser: a check in the browser
 * is a suggestion. Anyone with F12 flips a boolean. Here the session is a token
 * this server signed with a secret only it holds, so a forged one is rejected
 * by arithmetic rather than by good manners.
 *
 * SECRETS LIVE IN THE ENVIRONMENT, NEVER IN THE REPOSITORY:
 *   PLIEGO_USUARIO      the user name
 *   PLIEGO_SAL          per-install salt (hex)
 *   PLIEGO_CLAVE_HASH   PBKDF2-SHA256(clave, sal, 210k, 32 bytes) in hex
 *   PLIEGO_SECRETO      HMAC key that signs sessions
 * With any of them missing the door is CLOSED to everyone — never open. A
 * misconfigured deploy must lock people out, not let them in.
 */

import { createHmac, pbkdf2Sync, randomUUID, timingSafeEqual } from "node:crypto";

export const config = { path: "/api/auth/*" };

/** Same cost as Alexandria's cloud token: ~200 ms, which is also the throttle. */
const RONDAS = 210_000;
/** How long a session lasts. Long enough not to nag, short enough to expire. */
const DIAS = 30;

const CABECERAS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  // This endpoint is same-origin only. No CORS headers on purpose: a page on
  // another site should not be able to spend attempts against it.
};

function json(cuerpo, estado = 200) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: CABECERAS });
}

function base64url(buffer) {
  return Buffer.from(buffer).toString("base64url");
}

function iguales(a, b) {
  const uno = Buffer.from(String(a));
  const dos = Buffer.from(String(b));
  // timingSafeEqual throws on different lengths, which would itself leak the
  // length; compare a fixed-size digest of each instead.
  const ha = createHmac("sha256", "cmp").update(uno).digest();
  const hb = createHmac("sha256", "cmp").update(dos).digest();
  return timingSafeEqual(ha, hb);
}

function ajustes() {
  const usuario = process.env.PLIEGO_USUARIO;
  const sal = process.env.PLIEGO_SAL;
  const hash = process.env.PLIEGO_CLAVE_HASH;
  const secreto = process.env.PLIEGO_SECRETO;
  if (!usuario || !sal || !hash || !secreto) {
    return null; // fail closed
  }
  return { usuario, sal, hash, secreto };
}

/** `payload.firma`, where the signature covers the payload byte for byte. */
function firmar(datos, secreto) {
  const cuerpo = base64url(JSON.stringify(datos));
  const firma = base64url(createHmac("sha256", secreto).update(cuerpo).digest());
  return `${cuerpo}.${firma}`;
}

function comprobar(token, secreto) {
  if (typeof token !== "string" || !token.includes(".")) {
    return null;
  }
  const [cuerpo, firma] = token.split(".");
  const esperada = base64url(createHmac("sha256", secreto).update(cuerpo).digest());
  if (!firma || !iguales(firma, esperada)) {
    return null;
  }
  try {
    const datos = JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf8"));
    if (typeof datos?.exp !== "number" || datos.exp < Date.now()) {
      return null;
    }
    return datos;
  } catch {
    return null;
  }
}

function tokenDe(request) {
  const cabecera = request.headers.get("authorization") ?? "";
  return cabecera.startsWith("Bearer ") ? cabecera.slice(7) : null;
}

export default async function handler(request) {
  const ruta = new URL(request.url).pathname.replace(/^\/api\/auth\/?/, "").replace(/\/+$/, "");
  const config = ajustes();

  if (!config) {
    return json({ error: "La puerta no está configurada." }, 503);
  }

  if (ruta === "sesion") {
    const datos = comprobar(tokenDe(request), config.secreto);
    return datos
      ? json({ ok: true, usuario: datos.u, expira: datos.exp })
      : json({ ok: false }, 401);
  }

  if (ruta === "entrar") {
    if (request.method !== "POST") {
      return json({ error: "Método no permitido." }, 405);
    }
    const cuerpo = await request.json().catch(() => null);
    const usuario = String(cuerpo?.usuario ?? "");
    const clave = String(cuerpo?.clave ?? "");

    // Both checks always run, and the derivation always happens, so a wrong
    // user name costs exactly as long as a wrong password: the response time
    // never says which half was right.
    const derivada = pbkdf2Sync(clave, config.sal, RONDAS, 32, "sha256").toString("hex");
    const usuarioVale = iguales(usuario.trim().toLowerCase(), config.usuario.trim().toLowerCase());
    const claveVale = iguales(derivada, config.hash);

    if (!usuarioVale || !claveVale) {
      return json({ error: "Usuario o contraseña incorrectos." }, 401);
    }

    const exp = Date.now() + DIAS * 24 * 60 * 60 * 1000;
    return json({
      token: firmar({ u: config.usuario, sid: randomUUID(), iat: Date.now(), exp }, config.secreto),
      expira: exp,
    });
  }

  return json({ error: "No existe." }, 404);
}
