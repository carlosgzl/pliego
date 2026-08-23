/**
 * Pantalla completa de verdad: que no se vea nada del navegador.
 *
 * El «modo escritura» ya escondía la aplicación —la barra, la página compuesta,
 * los gadgets, el índice— pero seguía dejando arriba la barra de direcciones,
 * las pestañas y los marcadores, que es justo lo que hay que perder de vista.
 * Aquí se pide al navegador que se aparte del todo.
 *
 * DOS CAMINOS, y hacen falta los dos:
 *
 *   · La API de pantalla completa. Funciona en cualquier navegador de
 *     escritorio y solo se puede pedir DENTRO de un gesto de la persona —un
 *     clic, una tecla—, nunca desde un efecto al arrancar. Por eso esto se
 *     llama desde el botón y desde el atajo, y nunca «porque el ajuste estaba
 *     guardado».
 *   · La instalación como aplicación (el manifest, con `display: standalone`).
 *     Es la buena para el móvil, donde iOS no deja pedir pantalla completa por
 *     API: instalada desde «Añadir a la pantalla de inicio», Pliego abre sin
 *     barra de direcciones y sin pestañas.
 *
 * SALIR TIENE QUE ESTAR SINCRONIZADO. El navegador se sale solo de pantalla
 * completa cuando alguien pulsa Esc o F11, y la aplicación tiene que enterarse;
 * si no, queda en modo escritura con el marco del navegador de vuelta y sin
 * saber por qué. De eso se encarga `alCambiarPantalla`.
 */

/** Los nombres con prefijo que todavía usa Safari. */
interface ElementoConPrefijo extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

interface DocumentoConPrefijo extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

export function sePuedePantallaCompleta(): boolean {
  const raiz = document.documentElement as ElementoConPrefijo;
  return typeof raiz.requestFullscreen === "function" || typeof raiz.webkitRequestFullscreen === "function";
}

export function enPantallaCompleta(): boolean {
  const doc = document as DocumentoConPrefijo;
  return Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement);
}

/**
 * Pide pantalla completa. Devuelve si se ha conseguido.
 *
 * No lanza: que el navegador diga que no —porque no hubo gesto, porque es iOS,
 * porque una política lo prohíbe— no puede impedir que el modo escritura se
 * active igualmente. Se pierde el marco escondido, no el modo.
 */
export async function pedirPantallaCompleta(): Promise<boolean> {
  if (enPantallaCompleta()) {
    return true;
  }
  const raiz = document.documentElement as ElementoConPrefijo;
  try {
    if (typeof raiz.requestFullscreen === "function") {
      await raiz.requestFullscreen({ navigationUI: "hide" });
    } else if (typeof raiz.webkitRequestFullscreen === "function") {
      await raiz.webkitRequestFullscreen();
    } else {
      return false;
    }
  } catch {
    return false;
  }
  return enPantallaCompleta();
}

export async function salirDePantallaCompleta(): Promise<void> {
  if (!enPantallaCompleta()) {
    return;
  }
  const doc = document as DocumentoConPrefijo;
  try {
    if (typeof doc.exitFullscreen === "function") {
      await doc.exitFullscreen();
    } else if (typeof doc.webkitExitFullscreen === "function") {
      await doc.webkitExitFullscreen();
    }
  } catch {
    // Ya estaba fuera, o el navegador se adelantó. No hay nada que arreglar.
  }
}

export function alCambiarPantalla(oyente: () => void): () => void {
  document.addEventListener("fullscreenchange", oyente);
  document.addEventListener("webkitfullscreenchange", oyente);
  return () => {
    document.removeEventListener("fullscreenchange", oyente);
    document.removeEventListener("webkitfullscreenchange", oyente);
  };
}

/**
 * Instalada como aplicación: sin barra de direcciones y sin pestañas.
 *
 * Sirve para no ofrecer «pantalla completa» donde ya no hay marco que esconder,
 * y para no insistir con el cartel de instalar a quien ya la instaló.
 */
export function comoAplicacion(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    // El de iOS, que va por su cuenta.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
