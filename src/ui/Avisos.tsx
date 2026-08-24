/**
 * Las frases de una línea que dice la aplicación en voz alta.
 *
 * A propósito no es un centro de notificaciones: un programa de escribir tiene
 * que interrumpir lo menos posible, así que esto aparece al pie, dice una cosa
 * y se va. Los únicos mensajes que valen aquí son los que cambian lo que harías
 * a continuación — «no se ha guardado» lo es, «guardado» no (de eso ya informa
 * la línea de la barra, callada y permanente).
 *
 * SE IBAN DE GOLPE, Y ESO ERA LO QUE SE VEÍA. Aparecían con su animación de
 * rebote y luego desaparecían en un fotograma, porque se quitaban del estado
 * directamente. La clase `.aviso--cerrando` y su animación llevaban escritas
 * desde el principio en `movimiento.css`; simplemente no las ponía nadie.
 *
 * Ahora hay tres momentos —entra, vive, se va— y el desmontaje espera a que la
 * animación de salida termine. Es la misma idea que `useSalida`, resuelta aquí
 * a mano porque hay varios avisos a la vez y cada uno lleva su propio reloj.
 */

import { useEffect, useRef, useState } from "react";

export interface Aviso {
  id: number;
  texto: string;
  tono: "normal" | "error";
  /** Está en su animación de salida: montado, pero ya de camino a la puerta. */
  saliendo?: boolean;
}

/** Cuánto dura la salida. Tiene que ir con `--veloz` de `movimiento.css`. */
const SALIDA = 200;

let siguienteId = 1;
let publicar: ((aviso: Aviso) => void) | null = null;

export function avisar(texto: string, tono: Aviso["tono"] = "normal"): void {
  publicar?.({ id: siguienteId++, texto, tono });
}

export function Avisos() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const relojes = useRef<number[]>([]);

  useEffect(() => {
    publicar = (aviso) => {
      setAvisos((previos) => [...previos, aviso]);
      /* Un error se queda más rato: casi siempre pide una decisión, y cuatro
         segundos no dan para leer una frase y entenderla. */
      const vida = aviso.tono === "error" ? 6500 : 2800;
      relojes.current.push(
        window.setTimeout(() => {
          setAvisos((previos) =>
            previos.map((otro) => (otro.id === aviso.id ? { ...otro, saliendo: true } : otro)),
          );
          relojes.current.push(
            window.setTimeout(() => {
              setAvisos((previos) => previos.filter((otro) => otro.id !== aviso.id));
            }, SALIDA),
          );
        }, vida),
      );
    };
    return () => {
      publicar = null;
      for (const reloj of relojes.current) {
        window.clearTimeout(reloj);
      }
      relojes.current = [];
    };
  }, []);

  if (avisos.length === 0) {
    return null;
  }

  return (
    <div className="avisos" role="status" aria-live="polite">
      {avisos.map((aviso) => (
        <div
          key={aviso.id}
          className={[
            "aviso",
            aviso.tono === "error" ? "aviso--error" : "",
            aviso.saliendo ? "aviso--cerrando" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {aviso.texto}
        </div>
      ))}
    </div>
  );
}
