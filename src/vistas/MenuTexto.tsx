/**
 * El menú del botón derecho sobre el manuscrito.
 *
 * SU QUEJA, LITERAL: «si yo ahora me pongo a escribir es incómodo tener que
 * seleccionar Escribir y demás». Y tenía razón. Poner una palabra en cursiva
 * costaba subir a la barra, abrir el menú «Escribir» y bajar otra vez — tres
 * viajes con el ratón para una cosa que se hace veinte veces por página. Los
 * atajos existen, pero un programa no puede exigir que te los sepas.
 *
 * Ahora las marcas están donde la mano ya está: seleccionas y pulsas el botón
 * derecho encima.
 *
 * SOLO CON ALGO SELECCIONADO, y esa condición es deliberada. Sin selección, el
 * botón derecho sigue abriendo el menú DEL NAVEGADOR, que es donde vive el
 * corrector ortográfico: pinchas sobre una palabra subrayada en rojo y te
 * propone la corrección con el diccionario de español del sistema. Quedarse con
 * el botón derecho siempre habría cambiado un menú por otro y, de paso, roto el
 * corrector — que es de lo mejor que tiene escribir en un textarea.
 *
 * Cortar, copiar y pegar están aquí por lo mismo: al robarle el menú al
 * navegador hay que devolver lo que traía, o el menú propio se siente como una
 * pérdida por mucho que añada.
 */

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Icono, type NombreIcono } from "@/ui/Icono";

export interface AccionTexto {
  clave: string;
  nombre: string;
  icono: NombreIcono;
  atajo?: string;
  /** Una raya de separación ANTES de esta acción. */
  corte?: boolean;
  hacer: () => void;
}

export interface SitioMenu {
  x: number;
  y: number;
}

/** Cuánto se aparta el menú del borde de la ventana. */
const MARGEN = 8;

export function MenuTexto({
  sitio,
  cabecera,
  acciones,
  onCerrar,
}: {
  sitio: SitioMenu;
  /** Una línea de contexto arriba: cuántas palabras van seleccionadas. */
  cabecera?: ReactNode;
  acciones: AccionTexto[];
  onCerrar: () => void;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const [donde, setDonde] = useState(sitio);

  /*
   * Se coloca DESPUÉS de medirlo, no antes.
   *
   * Un menú abierto cerca del borde de abajo se sale de la pantalla, y en una
   * aplicación de escribir el borde de abajo es justo donde está el cursor la
   * mitad del tiempo. Medido el menú, si no cabe hacia abajo se vuelca hacia
   * arriba, y lo mismo con la derecha.
   */
  useLayoutEffect(() => {
    const nodo = caja.current;
    if (!nodo) {
      return;
    }
    const { width, height } = nodo.getBoundingClientRect();
    const x = Math.max(MARGEN, Math.min(sitio.x, window.innerWidth - width - MARGEN));
    const y =
      sitio.y + height + MARGEN > window.innerHeight
        ? Math.max(MARGEN, sitio.y - height)
        : sitio.y;
    setDonde({ x, y });
  }, [sitio]);

  useEffect(() => {
    const fuera = (evento: PointerEvent) => {
      if (!caja.current?.contains(evento.target as Node)) {
        onCerrar();
      }
    };
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        onCerrar();
      }
    };
    /* Al desplazar la vista, el menú se queda flotando sobre un texto que ya no
       es el suyo. Se cierra, que es lo que hacen todos. */
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    window.addEventListener("scroll", onCerrar, true);
    window.addEventListener("resize", onCerrar);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
      window.removeEventListener("scroll", onCerrar, true);
      window.removeEventListener("resize", onCerrar);
    };
  }, [onCerrar]);

  return (
    <div
      ref={caja}
      className="menu-texto"
      role="menu"
      style={{ left: donde.x, top: donde.y }}
      /* El botón derecho DENTRO del menú no abre otro menú encima. */
      onContextMenu={(evento) => evento.preventDefault()}
    >
      {cabecera && <div className="menu-texto__cabeza">{cabecera}</div>}
      {acciones.map((accion) => (
        <div key={accion.clave} className={accion.corte ? "menu-texto__corte" : undefined}>
          <button
            type="button"
            role="menuitem"
            className="menu__opcion"
            /* En `pointerdown` NO: ahí todavía no se ha cerrado nada y el campo
               perdería la selección antes de que la acción la lea. */
            onClick={() => {
              accion.hacer();
              onCerrar();
            }}
          >
            <Icono nombre={accion.icono} tamano={15} />
            <span className="menu__nombre">{accion.nombre}</span>
            {accion.atajo && <kbd className="menu__atajo">{accion.atajo}</kbd>}
          </button>
        </div>
      ))}
    </div>
  );
}
