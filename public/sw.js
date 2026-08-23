/**
 * El trabajador de servicio: que Pliego abra sin red y abra al instante.
 *
 * PARA QUÉ, aquí y no por moda. Escribir es lo que se hace en un tren, en una
 * clase con el wifi de la facultad, o con el portátil recién abierto antes de
 * que la red se decida. Sin esto, la web sin conexión es una pantalla de error;
 * con esto, es la aplicación de siempre trabajando contra la copia local, que
 * es lo que la biblioteca ya sabía hacer.
 *
 * LA ESTRATEGIA ESTÁ ELEGIDA PARA NO PODER SERVIR UNA VERSIÓN VIEJA, que es la
 * forma clásica en que estas cosas hacen más daño que bien:
 *
 *   · el DOCUMENTO va primero a la red. Así, en cuanto hay conexión, se ve el
 *     despliegue nuevo — nunca una aplicación de la semana pasada. Solo si la
 *     red falla se saca el `index.html` guardado.
 *   · los ASSETS de `/assets/` llevan un hash en el nombre y son inmutables por
 *     definición: `assets/index-DKCL3c5o.js` es siempre ese archivo o no
 *     existe. Ahí la caché va primero, y por eso abrir es instantáneo. Un
 *     despliegue nuevo trae nombres nuevos, así que no hay nada que invalidar.
 *   · TODO LO DEMÁS pasa de largo. Ni la API del ordenador, ni la cuenta, ni la
 *     nube cifrada tocan esta caché: guardar un capítulo no puede contestarse
 *     con una respuesta guardada, y una petición fallida no puede parecer que
 *     ha ido bien.
 *
 * No hay precarga: se guarda lo que se va usando. Eso significa que la primera
 * visita necesita red — que es cierto de todas formas, porque sin red no hay
 * primera visita.
 */

const VERSION = "pliego-v1";
const DOCUMENTO = `${VERSION}-doc`;
const ESTATICO = `${VERSION}-estatico`;

self.addEventListener("install", () => {
  // Sin precarga que esperar: se entra en servicio de inmediato. La página que
  // acaba de cargarse es la que instaló esto, así que no hay versión previa a
  // la que respetar.
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(
        nombres.filter((nombre) => !nombre.startsWith(VERSION)).map((nombre) => caches.delete(nombre)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Un mensaje desde la página para forzar el relevo tras un despliegue. */
self.addEventListener("message", (evento) => {
  if (evento.data === "relevo") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (evento) => {
  const peticion = evento.request;
  if (peticion.method !== "GET") {
    return;
  }

  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) {
    return; // la nube, la cuenta, el túnel del ordenador: no es asunto nuestro
  }
  if (url.pathname.startsWith("/api/")) {
    return; // las cuentas jamás salen de una caché
  }

  if (peticion.mode === "navigate") {
    evento.respondWith(documento(peticion));
    return;
  }

  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/fuentes/") ||
    /\.(?:png|svg|ico|webmanifest|woff2?)$/.test(url.pathname)
  ) {
    evento.respondWith(estatico(peticion));
  }
});

/**
 * El documento: red primero, caché de rescate.
 *
 * Con un tiempo de espera propio, porque una red que existe pero no contesta
 * —el wifi de un sitio público con portal cautivo— es peor que no tener red: el
 * navegador se queda esperando y la aplicación no aparece.
 */
async function documento(peticion) {
  const almacen = await caches.open(DOCUMENTO);
  try {
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), 4000);
    const respuesta = await fetch(peticion, { signal: control.signal });
    clearTimeout(reloj);
    if (respuesta && respuesta.ok) {
      await almacen.put("/index.html", respuesta.clone());
    }
    return respuesta;
  } catch {
    const guardado = (await almacen.match("/index.html")) ?? (await caches.match("/index.html"));
    if (guardado) {
      return guardado;
    }
    return new Response(
      "<!doctype html><meta charset=utf-8><title>Pliego</title>" +
        "<p style='font:16px/1.6 system-ui;margin:3rem;text-align:center'>" +
        "Sin conexión y sin copia guardada todavía. Vuelve a abrirlo con red una vez " +
        "y a partir de entonces Pliego funcionará también sin ella.</p>",
      { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }
}

/** Los archivos con hash: caché primero, y si no está se guarda al traerlo. */
async function estatico(peticion) {
  const almacen = await caches.open(ESTATICO);
  const guardado = await almacen.match(peticion);
  if (guardado) {
    return guardado;
  }
  const respuesta = await fetch(peticion);
  if (respuesta && respuesta.ok && respuesta.type === "basic") {
    await almacen.put(peticion, respuesta.clone());
  }
  return respuesta;
}
