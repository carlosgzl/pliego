/**
 * El pie de la casa, y el selector de color.
 *
 * EL PIE ESTABA FLOTANDO. Cuatro párrafos apilados a la izquierda, todos del
 * mismo peso y sin nada que los sujetara al borde derecho: la mancha quedaba
 * colgando en medio de una franja ancha y vacía. Ahora son dos columnas — a la
 * izquierda qué es esto, a la derecha quién lo firma — y el bloque tiene los
 * dos extremos apoyados.
 *
 * Se arregla AQUÍ DENTRO y en ningún otro sitio. Llegó a haber también un pie
 * clavado al borde de abajo de la ventana, y eso apretaba la pantalla de inicio
 * entera contra el marco: un arreglo que nadie había pedido, para un problema
 * que estaba en esta caja.
 *
 * LA FIRMA, EN LUGAR DE «DISEÑADA Y PROGRAMADA POR». Es su firma de verdad,
 * vectorizada, y lleva al portfolio. Dice lo mismo que la línea de texto que
 * había y lo dice como se dice: firmando. Va en el color de la aplicación
 * porque hereda `currentColor`, así que cambia con la paleta.
 *
 * SE FUE EL AVISO DE BETA. Estaba repetido —la insignia de aquí al lado, la de
 * la cabecera, la de la puerta— y a la cuarta vez ya no avisa de nada: se lee
 * como desconfianza en el propio programa. Y se fue LinkedIn: la firma ya lleva
 * a donde está todo lo suyo, y dos enlaces donde basta uno son dos decisiones.
 */

import { useEffect, useRef, useState } from "react";
import { ACENTOS } from "./acento";
import { Firma } from "./Firma";
import { useSalida } from "./useSalida";

const PORTFOLIO = "https://portfoliocga.netlify.app";

export function SelectorColor({
  valor,
  oscuro,
  onCambiar,
}: {
  valor: string;
  /** El tema de ahora mismo. Ver abajo por qué hace falta saberlo. */
  oscuro: boolean;
  onCambiar: (clave: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const gracia = useRef<number | null>(null);
  const salida = useSalida(abierto, () => setAbierto(false));

  useEffect(() => {
    if (!abierto) {
      return;
    }
    const fuera = (evento: PointerEvent) => {
      if (!caja.current?.contains(evento.target as Node)) {
        salida.cerrar();
      }
    };
    const escape = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        salida.cerrar();
      }
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto, salida]);

  useEffect(() => {
    return () => {
      if (gracia.current !== null) {
        window.clearTimeout(gracia.current);
      }
    };
  }, []);

  const quedarse = () => {
    if (gracia.current !== null) {
      window.clearTimeout(gracia.current);
      gracia.current = null;
    }
  };

  /*
   * SE QUEDA ABIERTA MIENTRAS EL RATÓN ESTÉ ENCIMA, y se va sola al salir.
   *
   * Antes había que volver a pulsar el botón o pinchar fuera, que son dos
   * gestos para deshacer uno. Ahora la paleta vive mientras la estés mirando.
   *
   * Los 260 ms de gracia no son adorno: entre el botón y el ramillete de
   * colores el puntero cruza un par de píxeles de nada, y sin margen la paleta
   * se cerraría justo en ese salto — el clásico menú que se escapa cuando vas a
   * pulsarlo. Y si el ratón vuelve dentro de ese rato, se cancela el cierre.
   */
  const irse = () => {
    quedarse();
    gracia.current = window.setTimeout(() => {
      gracia.current = null;
      salida.cerrar();
    }, 260);
  };

  return (
    <div
      className="paleta"
      ref={caja}
      onPointerEnter={quedarse}
      onPointerLeave={abierto ? irse : undefined}
    >
      {salida.montado && (
        <div
          className={`paleta__ramo${salida.cerrando ? " paleta__ramo--cerrando" : ""}`}
          role="menu"
          onAnimationEnd={salida.alTerminar}
        >
          {ACENTOS.map((acento) => (
            <button
              key={acento.clave}
              type="button"
              role="menuitemradio"
              aria-checked={valor === acento.clave}
              title={acento.nombre}
              aria-label={`Color ${acento.nombre}`}
              className={`acento${valor === acento.clave ? " acento--aqui" : ""}`}
              /*
               * EL PUNTO ENSEÑA EL COLOR QUE VA A SALIR, no el de la paleta de
               * día. Cada acento lleva dos tonos —uno para papel y otro para
               * fondo oscuro, porque el mismo azul que se lee sobre crema
               * desaparece sobre carbón— y aquí se pintaba siempre el claro.
               * En tema oscuro, entonces, elegías un color y aparecía otro. Era
               * literalmente lo que él describió.
               */
              style={{ background: oscuro ? acento.oscuro.acento : acento.claro.acento }}
              onClick={() => {
                onCambiar(acento.clave);
                salida.cerrar();
              }}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        className="paleta__tirador"
        aria-expanded={abierto}
        aria-label="Cambiar el color de la aplicación"
        title="Cambiar el color de la aplicación"
        /* Se abre también al acercarse: es un cambio de color, no una acción
           con consecuencias, y pedir un clic para ENSEÑAR ocho puntos sobra. El
           clic sigue funcionando para quien va con el teclado o con el dedo. */
        onPointerEnter={(evento) => {
          if (evento.pointerType !== "touch") {
            quedarse();
            setAbierto(true);
          }
        }}
        onClick={() => (abierto ? salida.cerrar() : setAbierto(true))}
      >
        <span className="paleta__punto" />
      </button>
    </div>
  );
}

export function Pie() {
  return (
    <footer className="pie">
      <div className="pie__dentro">
        <div className="pie__columna">
          <div className="pie__marca">
            <span className="pie__nombre">
              Pliego<span className="marca__punto">.</span>
            </span>
            <span className="pie__beta">Beta</span>
          </div>

          <p className="pie__que">
            Un sitio para escribir libros. Cada obra es un archivo Markdown que se abre en cualquier
            editor: nada de lo que escribas depende de esta web.
          </p>
        </div>

        <div className="pie__autoria">
          <a
            className="pie__firmante"
            href={PORTFOLIO}
            target="_blank"
            rel="noreferrer noopener"
            title="Carlos González Alcalde — ver su portfolio"
          >
            <Firma alto={62} titulo="Carlos González Alcalde" />
          </a>
        </div>
      </div>
    </footer>
  );
}
