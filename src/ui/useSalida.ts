/**
 * Que las cosas se vayan como vinieron.
 *
 * EL PROBLEMA. En React, cerrar un panel es dejar de renderizarlo, y eso lo
 * borra del DOM en el mismo fotograma: la animación de entrada se ve preciosa y
 * al cerrar desaparece de golpe. Él lo dijo con estas palabras — «al cerrar y a
 * la X las animaciones al principio sí van, pero al cerrarlas se van rápido».
 * Tenía razón y no es un detalle: la mitad brusca es la que se recuerda.
 *
 * CÓMO SE ARREGLA. Este hook mete un estado intermedio entre «abierto» y «no
 * existe»: cuando se pide cerrar, el elemento sigue montado con un atributo
 * `data-cerrando`, el CSS le pone la animación de salida, y solo cuando esa
 * animación termina se desmonta de verdad.
 *
 * NO USA UN TEMPORIZADOR. Un `setTimeout(260)` que hay que mantener a mano
 * igual que el CSS se desincroniza a la primera que alguien cambie una
 * duración, y con «reducir movimiento» activado dejaría el panel 260 ms en
 * pantalla sin animar nada. Se escucha `animationend`, que es la verdad; el
 * temporizador solo está de red por si el navegador no llega a lanzarlo (un
 * elemento con `display: none` heredado nunca anima).
 */

import { useCallback, useEffect, useRef, useState } from "react";

/** Red de seguridad: si `animationend` no llega, se desmonta igual. */
const TOPE = 600;

export interface Salida {
  /** Si hay que renderizar el elemento (abierto o todavía saliendo). */
  montado: boolean;
  /** Va en el elemento: el CSS engancha aquí la animación de salida. */
  cerrando: boolean;
  /** Empieza el cierre. El desmontaje llega cuando acabe la animación. */
  cerrar: () => void;
  /** Para el `onAnimationEnd` del elemento. */
  alTerminar: (evento: { target: EventTarget | null; currentTarget: EventTarget }) => void;
}

export function useSalida(abierto: boolean, alCerrado: () => void): Salida {
  const [saliendo, setSaliendo] = useState(false);
  const reloj = useRef<number | null>(null);

  const limpiar = () => {
    if (reloj.current !== null) {
      window.clearTimeout(reloj.current);
      reloj.current = null;
    }
  };

  useEffect(() => limpiar, []);

  const cerrar = useCallback(() => {
    setSaliendo(true);
    limpiar();
    reloj.current = window.setTimeout(() => {
      setSaliendo(false);
      alCerrado();
    }, TOPE);
  }, [alCerrado]);

  const alTerminar = useCallback(
    (evento: { target: EventTarget | null; currentTarget: EventTarget }) => {
      // Solo la animación del propio elemento: las de sus hijos burbujean y
      // desmontarían el panel en cuanto acabara la primera de ellas.
      if (!saliendo || evento.target !== evento.currentTarget) {
        return;
      }
      limpiar();
      setSaliendo(false);
      alCerrado();
    },
    [saliendo, alCerrado],
  );

  return { montado: abierto || saliendo, cerrando: saliendo, cerrar, alTerminar };
}
