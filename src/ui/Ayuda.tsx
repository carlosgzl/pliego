/**
 * La explicación que aparece si te quedas quieto encima.
 *
 * POR QUÉ NO VALE `title`. El atributo nativo tarda un segundo largo, sale con
 * la letra del sistema en una caja gris que ignora el tema de la aplicación, no
 * aparece nunca al navegar con teclado y en el móvil no existe. Para «modo
 * foco» —que él, con razón, no entendía— hace falta una frase legible, no un
 * bocadillo del sistema operativo.
 *
 * CUÁNDO SALE: a los 450 ms de dejar el ratón encima. No al instante, porque
 * entonces salta cada vez que el cursor cruza la pantalla y se vuelve ruido; y
 * no al segundo y medio, porque para entonces ya te has ido. Al recibir el foco
 * con el teclado sale sin esperar: quien navega tabulando ya ha dicho que
 * quiere estar ahí.
 */

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

const ESPERA = 450;

export function Ayuda({
  texto,
  children,
  lado = "abajo",
}: {
  /** Una frase. Si necesita dos, la opción está mal nombrada. */
  texto: string;
  children: ReactNode;
  lado?: "arriba" | "abajo";
}) {
  const [visible, setVisible] = useState(false);
  const reloj = useRef<number | null>(null);
  const id = useId();

  const parar = () => {
    if (reloj.current !== null) {
      window.clearTimeout(reloj.current);
      reloj.current = null;
    }
  };

  useEffect(() => parar, []);

  const abrir = (alInstante = false) => {
    parar();
    if (alInstante) {
      setVisible(true);
      return;
    }
    reloj.current = window.setTimeout(() => setVisible(true), ESPERA);
  };

  const cerrar = () => {
    parar();
    setVisible(false);
  };

  return (
    <span
      className="ayuda"
      onPointerEnter={() => abrir()}
      onPointerLeave={cerrar}
      onFocusCapture={() => abrir(true)}
      onBlurCapture={cerrar}
      /* Escape cierra la explicación sin cerrar lo que hay debajo: es lo que
         espera quien navega con teclado y se le ha quedado el globo puesto. */
      onKeyDown={(evento) => {
        if (evento.key === "Escape" && visible) {
          evento.stopPropagation();
          cerrar();
        }
      }}
      aria-describedby={visible ? id : undefined}
    >
      {children}
      {visible && (
        <span className={`ayuda__globo ayuda__globo--${lado}`} role="tooltip" id={id}>
          {texto}
        </span>
      )}
    </span>
  );
}
