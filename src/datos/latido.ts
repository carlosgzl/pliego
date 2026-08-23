/**
 * El latido: cuándo se vuelve a mirar si hay algo nuevo en otro sitio.
 *
 * SIN ESTO, LA FUSIÓN NO SE NOTA. Se puede fundir perfectamente bien y seguir
 * viendo la estantería de hace media hora, porque la única sincronización que
 * había ocurría al cargar la página. El caso real es exactamente ese: escribe
 * un rato en el portátil, se gira al ordenador de sobremesa —que lleva la
 * pestaña abierta desde la mañana— y allí no hay nada.
 *
 * Se mira en los cuatro momentos en que puede haber cambiado algo y en ninguno
 * más, porque una aplicación de escribir no debe estar hablando por la red
 * mientras alguien escribe:
 *
 *   · al volver a la pestaña, que es el gesto de «a ver qué hay»;
 *   · al recuperar la conexión, porque lo escrito sin red espera turno;
 *   · cada pocos minutos con la pestaña delante, para el caso de dos
 *     ordenadores encendidos a la vez;
 *   · cuando alguien lo pide a mano.
 *
 * Nunca dos a la vez: si ya hay una sincronización en marcha, quien llegue
 * después se engancha a la misma promesa. Dos fusiones simultáneas no rompen
 * nada —la aritmética de `fusion.ts` converge igual— pero sí gastan el doble de
 * red para llegar al mismo sitio.
 */

import { notificarCambio, sincronizar, type Catalogo } from "./biblioteca";
import { hayCuenta } from "./cuenta";

/** Con la pestaña delante y algo escrito, cada tres minutos basta y sobra. */
const CADA = 3 * 60 * 1000;

let enCurso: Promise<Catalogo> | null = null;
let ultima = 0;

/**
 * Sincroniza, o se engancha a la sincronización que ya estaba en marcha.
 *
 * `porLasBuenas` es para cuando lo pide una persona: entonces no se respeta el
 * mínimo entre intentos, porque pulsar un botón y que no pase nada visible es
 * peor que una petición de más.
 */
export function sincronizarYa(porLasBuenas = false): Promise<Catalogo | null> {
  if (!hayCuenta()) {
    return Promise.resolve(null);
  }
  if (enCurso) {
    return enCurso;
  }
  if (!porLasBuenas && Date.now() - ultima < 20_000) {
    return Promise.resolve(null);
  }
  ultima = Date.now();
  enCurso = sincronizar().finally(() => {
    enCurso = null;
    ultima = Date.now();
  });
  return enCurso;
}

/**
 * Arranca el latido. Devuelve cómo pararlo.
 *
 * Se llama una vez desde la aplicación entera, no una por pantalla: dos
 * relojes andando serían dos sincronizaciones cada tres minutos.
 */
export function arrancarLatido(): () => void {
  let reloj: number | null = null;

  const mirar = () => {
    void sincronizarYa().then((catalogo) => {
      if (catalogo) {
        notificarCambio();
      }
    });
  };

  const alVolver = () => {
    if (document.visibilityState === "visible") {
      mirar();
      poner();
    } else {
      quitar();
    }
  };

  const poner = () => {
    quitar();
    reloj = window.setInterval(mirar, CADA);
  };

  const quitar = () => {
    if (reloj !== null) {
      window.clearInterval(reloj);
      reloj = null;
    }
  };

  document.addEventListener("visibilitychange", alVolver);
  window.addEventListener("online", mirar);
  if (document.visibilityState === "visible") {
    poner();
  }

  return () => {
    quitar();
    document.removeEventListener("visibilitychange", alVolver);
    window.removeEventListener("online", mirar);
  };
}
