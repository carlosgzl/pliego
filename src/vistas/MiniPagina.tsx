/**
 * A page, small, for looking at rather than reading.
 *
 * WHY IT EXISTS. The design panel used to be thirty controls and no picture:
 * you moved a slider called "interlineado" and then had to go and find out
 * what had happened somewhere else on the screen — and on a phone, where the
 * panel covers the galley completely, you could not find out at all. Choosing a
 * typeface from a dropdown of names is the same problem: you are picking blind.
 *
 * So every choice in the panel is made NEXT TO a real page set that way. Same
 * `Galera` as the editor and the reader — not a mock-up — just small and inert.
 */

import { useMemo } from "react";
import type { Meta } from "@/nucleo/libro";
import { Galera } from "./Galera";

/**
 * Enough prose to show what a design does, when the book itself is still empty.
 *
 * A thumbnail of a blank page teaches nothing, and a new book is blank exactly
 * when the writer is most likely to be choosing how it should look.
 */
const MUESTRA = `# Primero

La biblioteca es un objeto que no termina nunca, y quien la ordena descubre pronto que ordenar es una forma de escribir. No había manera de saber cuántos volúmenes quedaban, porque cada estante escondía otro estante detrás.

Aquella mañana el aire olía a papel mojado y el patio estaba lleno de una luz que no venía de ninguna parte. El copista levantó la pluma, miró la página y comprendió que la primera línea decidiría todas las demás.

Se dice que un libro empieza cuando alguien decide que empieza, y no antes.
`;

export function MiniPagina({
  meta,
  cuerpo,
  alto,
}: {
  meta: Meta;
  /** The real book. Falls back to a sample when there is nothing written yet. */
  cuerpo: string;
  alto: number;
}) {
  /* Only the head of the book: a thumbnail shows page one, and laying out a
     90,000-word novel seven times over to draw seven stamps would cost a
     second of main thread for pixels nobody sees. */
  const texto = useMemo(() => {
    const limpio = cuerpo.trim();
    return limpio.length < 40 ? MUESTRA : limpio.slice(0, 1400);
  }, [cuerpo]);

  return <Galera meta={meta} cuerpo={texto} alto={alto} pagina={1} estatico />;
}
