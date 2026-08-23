/**
 * Un valor que solo se pone al día cuando se deja de teclear.
 *
 * POR QUÉ NO BASTA `useDeferredValue`. Es lo primero que se prueba, y mejora
 * mucho: la tecla se pinta primero y las cuentas van detrás. Pero «detrás»
 * para React significa «en cuanto haya un hueco», y entre dos teclas de alguien
 * que escribe normal hay ciento y pico milisegundos, que es hueco de sobra. Así
 * que con un manuscrito largo se colaba una recomposición de la novela entera
 * cada pocas pulsaciones — medida: tareas de hasta 160 ms en mitad de una
 * frase, que son diez fotogramas perdidos y se sienten como un tropiezo.
 *
 * Con reposo de verdad, la cuenta de palabras y la página compuesta se ponen al
 * día cuando quien escribe levanta la vista, que es exactamente cuando se
 * miran. Y no se quedan congeladas mientras se escribe seguido: el `techo`
 * obliga a una actualización de vez en cuando aunque no haya pausa.
 */

import { useEffect, useRef, useState } from "react";

export function useReposo<T>(valor: T, quieto = 250, techo = 1500): T {
  const [tranquilo, setTranquilo] = useState(valor);
  const desdeElUltimo = useRef(Date.now());

  useEffect(() => {
    if (Object.is(valor, tranquilo)) {
      desdeElUltimo.current = Date.now();
      return;
    }
    /* Lo que queda del techo: si se lleva mucho rato escribiendo sin pausa, la
       espera se acorta hasta cero y la cifra se mueve igualmente. */
    const espera = Math.max(0, Math.min(quieto, techo - (Date.now() - desdeElUltimo.current)));
    const reloj = window.setTimeout(() => {
      desdeElUltimo.current = Date.now();
      setTranquilo(valor);
    }, espera);
    return () => window.clearTimeout(reloj);
  }, [valor, tranquilo, quieto, techo]);

  return tranquilo;
}
