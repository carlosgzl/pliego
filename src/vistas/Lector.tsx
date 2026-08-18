/**
 * The reader: the book at the size it would be printed.
 *
 * Same galley as the preview strip, given the whole screen — and on a wide
 * screen, TWO pages side by side, because a book is read as a spread and the
 * verso/recto conventions (author on the left, title on the right) only make
 * sense when you can see both.
 *
 * Arrow keys turn pages. That is the only interaction, on purpose.
 */

import { useEffect, useState } from "react";
import type { Meta } from "@/nucleo/libro";
import { Icono } from "@/ui/Icono";
import { Galera } from "./Galera";

export function Lector({
  meta,
  cuerpo,
  onCerrar,
}: {
  meta: Meta;
  cuerpo: string;
  onCerrar: () => void;
}) {
  const [pagina, setPagina] = useState(1);
  const [paginas, setPaginas] = useState(1);
  const [alto, setAlto] = useState(600);
  const [doble, setDoble] = useState(false);

  /* How tall a page can be here, and whether two fit side by side. Measured
     from the window rather than from a container so the first paint is already
     the right size — a page that resizes after appearing re-breaks every line
     in front of the reader. */
  useEffect(() => {
    const medir = () => {
      const disponible = window.innerHeight - 130;
      setAlto(Math.max(320, Math.min(disponible, 1000)));
      const anchoPagina = disponible * 0.72; // generous estimate of one page
      setDoble(window.innerWidth > anchoPagina * 2 + 120);
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      const salto = doble ? 2 : 1;
      if (evento.key === "ArrowRight" || evento.key === "PageDown" || evento.key === " ") {
        evento.preventDefault();
        setPagina((actual) => Math.min(paginas, actual + salto));
      } else if (evento.key === "ArrowLeft" || evento.key === "PageUp") {
        evento.preventDefault();
        setPagina((actual) => Math.max(1, actual - salto));
      } else if (evento.key === "Home") {
        setPagina(1);
      } else if (evento.key === "End") {
        setPagina(paginas);
      } else if (evento.key === "Escape") {
        onCerrar();
      }
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [paginas, doble, onCerrar]);

  /* On a spread, the left-hand page is always even — that is what makes the
     running heads land on the right sides. */
  const izquierda = doble ? (pagina % 2 === 0 ? pagina : Math.max(1, pagina - 1)) : pagina;
  const derecha = izquierda + 1;

  return (
    <div className="lector" role="dialog" aria-label={`Leyendo ${meta.titulo}`}>
      <div className="lector__barra">
        <button type="button" className="boton boton--desnudo" onClick={onCerrar} title="Cerrar">
          <Icono nombre="cerrar" />
        </button>
        <span className="barra__titulo">{meta.titulo}</span>
        <span className="barra__hueco" />
        <button
          type="button"
          className="boton boton--desnudo"
          onClick={() => setPagina((actual) => Math.max(1, actual - (doble ? 2 : 1)))}
          disabled={pagina <= 1}
          title="Página anterior"
        >
          <span style={{ transform: "rotate(180deg)", display: "inline-flex" }}>
            <Icono nombre="flecha" />
          </span>
        </button>
        <span className="barra__cuenta">
          {doble && derecha <= paginas ? `${izquierda}–${derecha}` : izquierda} de {paginas}
        </span>
        <button
          type="button"
          className="boton boton--desnudo"
          onClick={() => setPagina((actual) => Math.min(paginas, actual + (doble ? 2 : 1)))}
          disabled={izquierda >= paginas}
          title="Página siguiente"
        >
          <Icono nombre="flecha" />
        </button>
      </div>

      <div className="lector__hojas">
        <Galera
          meta={meta}
          cuerpo={cuerpo}
          alto={alto}
          pagina={izquierda}
          onPaginas={setPaginas}
        />
        {doble && derecha <= paginas && (
          <Galera meta={meta} cuerpo={cuerpo} alto={alto} pagina={derecha} />
        )}
      </div>
    </div>
  );
}
