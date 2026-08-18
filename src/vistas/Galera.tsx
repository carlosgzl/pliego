/**
 * The galley: the manuscript, set in pages.
 *
 * ONE COMPONENT FOR BOTH PLACES — the strip under the editor and the reader's
 * full-size page are the same markup at two scales, because if they were two
 * components they would eventually break lines differently and the app would
 * be telling you two different page counts for one book.
 *
 * The trick is a multi-column flow whose column box is exactly one page's text
 * box. The browser breaks the prose into columns; a column IS a page. Turning a
 * page is then a `translateX` of exactly one page width — nothing re-flows, so
 * the break points cannot move under you.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { partirEnBloques, type Bloque } from "@/nucleo/bloques";
import { geometria, paginaDe, type Geometria } from "@/nucleo/geometria";
import { trozos } from "@/nucleo/inline";
import type { Meta } from "@/nucleo/libro";
import { cornisaDe, dinkusDe, folioArriba, folioDe, ladoFolio, numeroCapituloDe } from "@/nucleo/pagina";

export interface GaleraProps {
  meta: Meta;
  cuerpo: string;
  /** How tall to draw one page, in px. Everything scales from this. */
  alto: number;
  /** 1-based page to show. */
  pagina: number;
  /** Called when the real page count is known (it depends on layout). */
  onPaginas?: (total: number) => void;
  /** Called with the page a character offset falls on, for "follow the caret". */
  seguirA?: number | null;
  onPaginaDeCursor?: (pagina: number) => void;
}

export function Galera({
  meta,
  cuerpo,
  alto,
  pagina,
  onPaginas,
  seguirA,
  onPaginaDeCursor,
}: GaleraProps) {
  const geo = useMemo(() => geometria(meta.diseno, alto), [meta.diseno, alto]);
  const bloques = useMemo(() => partirEnBloques(cuerpo), [cuerpo]);
  const flujo = useRef<HTMLDivElement>(null);
  const [total, setTotal] = useState(1);

  /* Measuring has to happen after layout and before paint, or the first frame
     of a page turn shows the old page. */
  useLayoutEffect(() => {
    const nodo = flujo.current;
    if (!nodo) {
      return;
    }
    const medir = () => {
      const ancho = nodo.scrollWidth;
      const paginas = Math.max(1, Math.round(ancho / Math.max(1, geo.paginaAncho)));
      setTotal(paginas);
      onPaginas?.(paginas);
    };
    medir();
    // Fonts arrive late on a cold load and change every line break with them.
    void document.fonts?.ready.then(medir).catch(() => undefined);
    const observador = new ResizeObserver(medir);
    observador.observe(nodo);
    return () => observador.disconnect();
  }, [geo.paginaAncho, cuerpo, meta.diseno, onPaginas]);

  /* Where the caret is, in pages. Read from the DOM because only the browser
     knows where its own line breaks fell. */
  useEffect(() => {
    if (seguirA == null || !onPaginaDeCursor) {
      return;
    }
    const nodo = flujo.current;
    if (!nodo) {
      return;
    }
    const indice = bloques.findIndex(
      (bloque) => seguirA >= bloque.desde && seguirA <= bloque.hasta,
    );
    const elemento = nodo.querySelector<HTMLElement>(`[data-bloque="${Math.max(0, indice)}"]`);
    if (elemento) {
      onPaginaDeCursor(paginaDe(elemento.offsetLeft, geo));
    }
  }, [seguirA, bloques, geo, onPaginaDeCursor, cuerpo, alto]);

  const actual = Math.min(Math.max(1, pagina), total);
  const cornisa = cornisaDe(actual, meta, capituloDe(bloques, actual, geo, flujo.current));
  const folio = folioDe(actual, meta.diseno);
  const lado = ladoFolio(actual, meta.diseno);

  return (
    <div
      className={`hoja${actual % 2 === 0 ? " hoja--verso" : ""}`}
      style={variables(geo, meta)}
      aria-label={`Página ${actual} de ${total}`}
    >
      {cornisa && <div className="cornisa">{cornisa}</div>}
      {folio && (
        <div
          className={`folio folio--${lado === "centro" ? "centro" : lado}${
            folioArriba(meta.diseno) ? " folio--arriba" : ""
          }`}
        >
          {folio}
        </div>
      )}
      <div
        ref={flujo}
        className={clasesFlujo(meta)}
        style={{ "--desplazamiento": `${-(actual - 1) * geo.paginaAncho}px` } as CSSProperties}
      >
        <Contenido bloques={bloques} meta={meta} />
      </div>
    </div>
  );
}

/**
 * Which chapter the visible page belongs to, for a running head that names it.
 *
 * Read from the laid-out DOM rather than computed, because "which chapter is on
 * page 41" is a question only the finished layout can answer.
 */
function capituloDe(
  bloques: Bloque[],
  pagina: number,
  geo: Geometria,
  nodo: HTMLDivElement | null,
): string | undefined {
  if (!nodo) {
    return undefined;
  }
  let ultimo: string | undefined;
  for (const [indice, bloque] of bloques.entries()) {
    if (bloque.nivel !== 1) {
      continue;
    }
    const elemento = nodo.querySelector<HTMLElement>(`[data-bloque="${indice}"]`);
    if (!elemento) {
      continue;
    }
    if (paginaDe(elemento.offsetLeft, geo) > pagina) {
      break;
    }
    ultimo = bloque.texto;
  }
  return ultimo;
}

function clasesFlujo(meta: Meta): string {
  const { diseno } = meta;
  return [
    "flujo",
    "flujo--pagina",
    diseno.justificado && "flujo--justificado",
    diseno.guiones && "flujo--guiones",
    diseno.capituloEn === "seguido" && "flujo--seguido",
  ]
    .filter(Boolean)
    .join(" ");
}

function variables(geo: Geometria, meta: Meta): CSSProperties {
  const { diseno } = meta;
  return {
    "--pagina-ancho": `${geo.paginaAncho}px`,
    "--pagina-alto": `${geo.paginaAlto}px`,
    "--texto-ancho": `${geo.textoAncho}px`,
    "--margen-arriba": `${geo.margenArriba}px`,
    "--margen-abajo": `${geo.margenAbajo}px`,
    "--margen-lomo": `${geo.margenLomo}px`,
    "--margen-corte": `${geo.margenCorte}px`,
    "--cuerpo": `${geo.cuerpo}px`,
    "--interlineado": diseno.interlineado,
    "--tracking": `${diseno.tracking}em`,
    "--sangria": `${diseno.sangriaEm}em`,
    "--espacio-parrafo": `${diseno.espacioParrafo}em`,
    "--capitular-lineas": diseno.capitularLineas,
    "--libro-fuente": diseno.fuentePila,
  } as CSSProperties;
}

/** The blocks, as the page prints them. */
function Contenido({ bloques, meta }: { bloques: Bloque[]; meta: Meta }) {
  const { diseno } = meta;
  const dinkus = dinkusDe(diseno);
  let capitulo = 0;
  let primerParrafoDelCapitulo = true;

  return (
    <>
      {bloques.map((bloque, indice) => {
        if (bloque.nivel === -1) {
          primerParrafoDelCapitulo = false;
          return (
            <p
              key={indice}
              data-bloque={indice}
              className={`dinkus${dinkus ? "" : " dinkus--blanco"}`}
              aria-hidden={!dinkus}
            >
              {dinkus}
            </p>
          );
        }

        if (bloque.nivel === 1) {
          capitulo += 1;
          primerParrafoDelCapitulo = true;
          const numero = numeroCapituloDe(capitulo, diseno);
          return (
            <h2
              key={indice}
              data-bloque={indice}
              className={`titulo titulo--${diseno.tituloCapitulo}`}
            >
              {numero && <span className="numero-capitulo">{numero}</span>}
              <Marcas texto={bloque.texto} />
            </h2>
          );
        }

        if (bloque.nivel >= 2) {
          primerParrafoDelCapitulo = true;
          return (
            <p key={indice} data-bloque={indice} className="epigrafe">
              <Marcas texto={bloque.texto} />
            </p>
          );
        }

        const abre = bloque.primero;
        const conCapitular = abre && primerParrafoDelCapitulo && diseno.capitular;
        const conVersalitas = abre && primerParrafoDelCapitulo && diseno.versalitas;
        if (abre) {
          primerParrafoDelCapitulo = false;
        }
        const clases = [
          "parrafo",
          !abre && diseno.sangria && "parrafo--sangrado",
          conCapitular && "capitular",
          conVersalitas && "versalitas-inicio",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <p key={indice} data-bloque={indice} className={clases}>
            <Marcas texto={bloque.texto} />
          </p>
        );
      })}
    </>
  );
}

/** A line with its bold and italic runs, and no asterisks left showing. */
export function Marcas({ texto }: { texto: string }) {
  return (
    <>
      {trozos(texto).map((trozo, indice) => {
        if (!trozo.fuerte && !trozo.cursiva) {
          return <span key={indice}>{trozo.texto}</span>;
        }
        const clases = [trozo.fuerte && "marca-fuerte", trozo.cursiva && "marca-cursiva"]
          .filter(Boolean)
          .join(" ");
        return (
          <span key={indice} className={clases}>
            {trozo.texto}
          </span>
        );
      })}
    </>
  );
}
