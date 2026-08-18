/**
 * El libro de muestra: lo que ve quien no ha entrado.
 *
 * WHY A REAL BOOK AND NOT A LOCKED DOOR. A visitor who lands on Pliego and sees
 * only a password box learns nothing about it, and neither does the owner
 * showing it to somebody. With a sample manuscript on the shelf the whole app
 * works — the galley composes, the design panel changes it, the reader turns
 * pages — and the only two things that need entering are the ones that touch
 * his actual work: opening the real library, and saving.
 *
 * It lives in this browser's memory only. Nothing written to it is ever sent
 * anywhere, and the workshop says so instead of showing a green tick.
 */

import { componer, metaPorDefecto, type Meta } from "@/nucleo/libro";

export const SLUG_MUESTRA = "__muestra__";

const CUERPO = `# El copista

La biblioteca es un objeto que no termina nunca, y quien la ordena descubre pronto que ordenar es una forma de escribir. No había manera de saber cuántos volúmenes quedaban, porque cada estante escondía otro estante detrás, y detrás de aquel había siempre un pasillo que nadie recordaba haber construido.

Aquella mañana el aire olía a papel mojado y el patio estaba lleno de una luz que no venía de ninguna parte. El copista levantó la pluma, miró la página en blanco y comprendió que la primera línea decidiría todas las demás.

***

Escribió una frase. La leyó. La tachó.

Se dice que un libro empieza cuando alguien decide que empieza, y no antes; pero también se dice que empieza mucho antes de que nadie escriba nada, el día en que a alguien se le queda una idea atravesada y no se le pasa. Las dos cosas son verdad y no se contradicen.

# La página

Un libro no es un texto: es un texto **puesto en un sitio**. La misma frase cambia si la pones en una caja estrecha o en una ancha, si la aprietas o le das aire, si la letra tiene remates o no los tiene.

Prueba a abrir el diseño y a cambiar la receta. Esta misma página se recompone delante de ti, y el número de páginas de abajo es de verdad: lo calcula el navegador cortando los renglones, no una estimación.

Cuando quieras escribir lo tuyo, entra.
`;

export function libroDeMuestra(): { meta: Meta; cuerpo: string } {
  const meta = metaPorDefecto("Un libro de muestra");
  meta.subtitulo = "para ver cómo funciona Pliego";
  meta.autor = "Pliego";
  meta.portada.color = "#2f3e4f";
  return { meta, cuerpo: CUERPO };
}

export function ficheroDeMuestra(): string {
  const { meta, cuerpo } = libroDeMuestra();
  return componer(meta, cuerpo);
}
