import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./estilos/base.css";
import "./estilos/movimiento.css";
import "./estilos/app.css";
import "./estilos/pagina.css";

const raiz = document.getElementById("raiz");
if (!raiz) {
  throw new Error("Falta el nodo #raiz en index.html");
}

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/*
 * El trabajador de servicio, que es lo que hace que Pliego abra sin red.
 *
 * Solo en producción: en desarrollo se interpondría entre Vite y el navegador y
 * daría exactamente el fallo más molesto de depurar —un cambio guardado que no
 * aparece—. Y siempre después de pintar, porque registrarlo antes retrasa el
 * primer fotograma sin comprar nada.
 *
 * Se pide la actualización a mano cada vez que se vuelve a la pestaña: un
 * despliegue nuevo entra así en la siguiente recarga en lugar de esperar a que
 * el navegador se acuerde de mirar.
 */
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registro) => {
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            void registro.update();
          }
        });
      })
      .catch(() => {
        // Sin trabajador no hay modo sin conexión; todo lo demás sigue igual.
      });
  });
}
