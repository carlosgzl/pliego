/**
 * La barra del taller, rehecha.
 *
 * LO QUE ESTABA MAL. Once controles en fila, todos iconos del mismo tamaño y
 * del mismo gris, sin una separación que dijera cuáles hacen cosas parecidas.
 * Su palabra fue «confuso y raro», y lo era: para saber qué hacía cada uno
 * había que pasar el ratón por encima de los once, uno a uno.
 *
 * LO QUE SE HACE AHORA. Tres zonas y nada más:
 *
 *   izquierda   salir e índice: navegar, lo que te saca de aquí
 *   centro      el título del libro y si está guardado
 *   derecha     UN botón de escribir (negrita, cursiva, capítulo, escena) y UN
 *               botón de «Ver», y detrás de cada uno un menú con su nombre
 *               escrito al lado del icono y su atajo de teclado
 *
 * Dos botones en vez de nueve. Lo que se usa cada dos frases —negrita y
 * cursiva— sigue teniendo su atajo de siempre y no necesita el menú; el resto
 * se usa cada media hora y puede permitirse un clic más a cambio de que se
 * entienda.
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Ayuda } from "@/ui/Ayuda";
import { useSalida } from "@/ui/useSalida";
import { Icono, type NombreIcono } from "@/ui/Icono";

export interface Accion {
  clave: string;
  nombre: string;
  icono: NombreIcono;
  /** Una frase para quien no sepa qué es. Sale al quedarse encima. */
  ayuda?: string;
  atajo?: string;
  /** Un interruptor pintado como activo cuando lo está. */
  puesto?: boolean;
  /** Una raya de separación ANTES de esta acción, para agrupar por familias. */
  corte?: boolean;
  /**
   * Estilo para el nombre de la acción.
   *
   * Existe por una sola cosa, y es buena: que cada tipografía del menú «Letra»
   * se lea CON SU PROPIA LETRA. Una lista de nombres de fuentes todos escritos
   * en la misma es una lista de palabras; escrito cada uno con la suya, es una
   * muestra — se elige mirando, no leyendo.
   */
  estilo?: CSSProperties;
  hacer: () => void;
}

export function MenuBarra({
  etiqueta,
  icono,
  acciones,
}: {
  etiqueta: string;
  icono: NombreIcono;
  acciones: Accion[];
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  /* El menú se queda montado mientras se recoge, o se cerraría en un fotograma
     después de haberse abierto con calma — que es la mitad brusca que se
     recuerda. Ver `ui/useSalida.ts`. */
  const salida = useSalida(abierto, () => setAbierto(false));

  /* Cerrar al pinchar fuera y al pulsar Escape. Sin esto un menú abierto se
     queda abierto mientras escribes, tapando la primera línea. */
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

  return (
    <div className="menu" ref={caja}>
      <button
        type="button"
        className="boton boton--desnudo menu__tirador"
        aria-expanded={abierto}
        aria-haspopup="menu"
        onClick={() => (abierto ? salida.cerrar() : setAbierto(true))}
      >
        <Icono nombre={icono} />
        <span className="menu__etiqueta">{etiqueta}</span>
        <span className={`menu__punta${abierto ? " menu__punta--abierta" : ""}`}>
          <Icono nombre="flecha" tamano={12} />
        </span>
      </button>

      {salida.montado && (
        <div
          className={`menu__lista${salida.cerrando ? " menu__lista--cerrando" : ""}`}
          role="menu"
          onAnimationEnd={salida.alTerminar}
        >
          {acciones.map((accion) => {
            const boton = (
              <button
                type="button"
                role="menuitem"
                className={`menu__opcion${accion.puesto ? " menu__opcion--puesta" : ""}`}
                onClick={() => {
                  accion.hacer();
                  salida.cerrar();
                }}
              >
                <Icono nombre={accion.icono} tamano={15} />
                <span className="menu__nombre" style={accion.estilo}>
                  {accion.nombre}
                </span>
                {accion.atajo && <kbd className="menu__atajo">{accion.atajo}</kbd>}
                {accion.puesto && (
                  <span className="menu__marca">
                    <Icono nombre="guardado" tamano={13} />
                  </span>
                )}
              </button>
            );
            const fila = accion.ayuda ? (
              <Ayuda texto={accion.ayuda}>{boton}</Ayuda>
            ) : (
              <span className="menu__fila">{boton}</span>
            );
            return (
              <div key={accion.clave} className={accion.corte ? "menu__corte" : undefined}>
                {fila}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Un botón suelto de la barra, con su nombre escrito cuando hay sitio. */
export function BotonBarra({
  nombre,
  icono,
  puesto,
  soloIcono,
  onClick,
}: {
  nombre: string;
  icono: NombreIcono;
  puesto?: boolean;
  soloIcono?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="boton boton--desnudo"
      aria-pressed={puesto}
      title={nombre}
      onClick={onClick}
    >
      <Icono nombre={icono} />
      {!soloIcono && <span className="boton__texto">{nombre}</span>}
    </button>
  );
}

export function GrupoBarra({ children }: { children: ReactNode }) {
  return <div className="barra__grupo">{children}</div>;
}
