/**
 * The manuscript: a textarea you cannot tell is a textarea.
 *
 * THE PROBLEM. The file is Markdown and must stay Markdown, but a writer
 * staring at `# Capítulo primero` and `la **tormenta**` is reading the file
 * format instead of their book. Buttons that insert the marks for you are only
 * half the fix: the marks are still the loudest thing on the page.
 *
 * THE FIX, and why it is done this way. Behind a transparent textarea sits a
 * mirror of the same text, laid out with exactly the same metrics, where the
 * syntax characters are painted at 15% opacity and the words at full ink. You
 * see prose; the marks are still there, still selectable, still deletable with
 * one backspace, but they have stopped shouting.
 *
 * THE ONE RULE THIS DEPENDS ON: the mirror and the textarea must wrap
 * identically, or the caret drifts away from the letters. That is why the
 * highlighting only ever changes COLOUR — never size, never weight, never
 * letter-spacing. A bold run that actually rendered bold would be wider than
 * the text under it and every line after it would be wrong. Bold and italic
 * belong in the composed page beside you, which is where a writer looks for
 * them anyway.
 *
 * Focus mode rides on the same mirror: the paragraph holding the caret keeps
 * full ink and everything else drops back, which a plain textarea simply
 * cannot do.
 */

import { useMemo, type CSSProperties, type ReactNode } from "react";

/**
 * Past this many characters the mirror is dropped and the textarea shows its
 * own text. Re-painting a novel's worth of spans on every keystroke would cost
 * more than the marks do — and at that length the writer has long since stopped
 * noticing them.
 */
export const TOPE_RESALTADO = 200_000;

export interface ManuscritoProps {
  valor: string;
  /** Caret position, for focus mode. */
  cursor: number;
  foco: boolean;
  estilo: CSSProperties;
}

export function Resaltado({ valor, cursor, foco, estilo }: ManuscritoProps) {
  const partes = useMemo(() => pintar(valor, cursor, foco), [valor, cursor, foco]);
  if (valor.length > TOPE_RESALTADO) {
    return null;
  }
  return (
    <pre className="manuscrito__espejo" style={estilo} aria-hidden="true">
      {partes}
      {/* A <pre> swallows a single trailing newline; without this the mirror is
          one line shorter than the textarea the moment you press Enter at the
          end, and everything below the caret slides up by a line. */}
      {"\n"}
    </pre>
  );
}

/** Where the paragraph under the caret starts and ends. */
function parrafoDe(texto: string, cursor: number): [number, number] {
  const limite = Math.max(0, Math.min(cursor, texto.length));
  const antes = texto.lastIndexOf("\n\n", Math.max(0, limite - 1));
  const despues = texto.indexOf("\n\n", limite);
  return [antes === -1 ? 0 : antes + 2, despues === -1 ? texto.length : despues];
}

/**
 * The text, split into runs of "words" and "syntax".
 *
 * Kept deliberately simple: heading hashes at the start of a line, the emphasis
 * stars, and the scene-break line. Those are the only marks this app writes, so
 * they are the only ones worth dimming — and a highlighter that tried to be a
 * full Markdown parser would eventually disagree with the composer about what
 * something means, which is worse than not highlighting at all.
 */
function pintar(texto: string, cursor: number, foco: boolean): ReactNode[] {
  const [desdeFoco, hastaFoco] = foco ? parrafoDe(texto, cursor) : [0, texto.length];
  const salida: ReactNode[] = [];
  let posicion = 0;
  let clave = 0;

  const empujar = (contenido: string, tipo: "texto" | "marca") => {
    if (contenido.length === 0) {
      return;
    }
    const inicio = posicion;
    posicion += contenido.length;
    const apagado = foco && (posicion <= desdeFoco || inicio >= hastaFoco);
    /* "sintaxis", not "marca": the shelf's wordmark already owns `.marca` and
       it is a flex container, so reusing the name turned every `# ` into a
       block and pushed the chapter title onto a line of its own. */
    const clases = [tipo === "marca" ? "sintaxis" : null, apagado ? "apagado" : null]
      .filter(Boolean)
      .join(" ");
    salida.push(
      clases ? (
        <span key={clave++} className={clases}>
          {contenido}
        </span>
      ) : (
        contenido
      ),
    );
  };

  const lineas = texto.split("\n");
  for (const [indice, linea] of lineas.entries()) {
    const titulo = /^(#{1,6}\s)(.*)$/.exec(linea);
    if (titulo) {
      empujar(titulo[1]!, "marca");
      pintarLinea(titulo[2]!, empujar);
    } else if (/^\s*(\*\s*\*\s*\*|---+|~~~+)\s*$/.test(linea)) {
      empujar(linea, "marca");
    } else {
      pintarLinea(linea, empujar);
    }
    if (indice < lineas.length - 1) {
      empujar("\n", "texto");
    }
  }
  return salida;
}

/** The emphasis stars inside one line. */
function pintarLinea(
  linea: string,
  empujar: (contenido: string, tipo: "texto" | "marca") => void,
): void {
  const patron = /(\*{1,3})(.+?)\1/g;
  let ultimo = 0;
  for (let hallazgo = patron.exec(linea); hallazgo; hallazgo = patron.exec(linea)) {
    empujar(linea.slice(ultimo, hallazgo.index), "texto");
    empujar(hallazgo[1]!, "marca");
    empujar(hallazgo[2]!, "texto");
    empujar(hallazgo[1]!, "marca");
    ultimo = patron.lastIndex;
  }
  empujar(linea.slice(ultimo), "texto");
}
