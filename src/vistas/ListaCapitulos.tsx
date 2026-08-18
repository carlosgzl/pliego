/**
 * The chapter list.
 *
 * WHY IT EXISTS: a manuscript is one scrolling text box, and without a list of
 * its chapters the only way to reach chapter nine is to scroll for it. The word
 * counts come along because they are the question a writer actually asks of a
 * chapter list — "which one is thin?" — and seeing 400 next to 4,000 tells you
 * more about the shape of the book than any outline would.
 */

import type { Capitulo } from "@/nucleo/bloques";
import { Icono } from "@/ui/Icono";

export function ListaCapitulos({
  capitulos,
  aqui,
  onIr,
  onNuevo,
  onCerrar,
}: {
  capitulos: Capitulo[];
  /** Index of the chapter the caret is in, -1 when before the first. */
  aqui: number;
  onIr: (capitulo: Capitulo) => void;
  onNuevo: () => void;
  onCerrar: () => void;
}) {
  const total = capitulos.reduce((suma, capitulo) => suma + capitulo.palabras, 0);
  const media = capitulos.length > 0 ? Math.round(total / capitulos.length) : 0;

  return (
    <nav className="capitulos" aria-label="Capítulos">
      <div className="capitulos__cabeza">
        <span className="eyebrow">Capítulos</span>
        <div style={{ display: "flex", gap: "0.15rem" }}>
          <button
            type="button"
            className="boton boton--desnudo"
            onClick={onNuevo}
            title="Nuevo capítulo aquí"
          >
            <Icono nombre="mas" />
          </button>
          <button
            type="button"
            className="boton boton--desnudo"
            onClick={onCerrar}
            title="Cerrar la lista"
          >
            <Icono nombre="cerrar" />
          </button>
        </div>
      </div>

      {capitulos.length === 0 ? (
        <p className="campo__nota" style={{ padding: "1rem 0.85rem" }}>
          Todavía no hay capítulos. Empieza uno con Ctrl+1 o con el botón de arriba.
        </p>
      ) : (
        <div className="capitulos__lista">
          {capitulos.map((capitulo, indice) => (
            <button
              key={`${capitulo.desde}-${indice}`}
              type="button"
              className={`capitulo${indice === aqui ? " capitulo--aqui" : ""}`}
              onClick={() => onIr(capitulo)}
            >
              <span className="capitulo__n">{capitulo.numero}</span>
              <span className="capitulo__nombre">
                {capitulo.titulo || <em style={{ opacity: 0.6 }}>sin título</em>}
              </span>
              <span
                className="capitulo__palabras"
                title={
                  media > 0 && capitulo.palabras < media / 2
                    ? "Menos de la mitad que la media de tus capítulos"
                    : undefined
                }
              >
                {capitulo.palabras.toLocaleString("es-ES")}
              </span>
            </button>
          ))}
        </div>
      )}

      {capitulos.length > 0 && (
        <div className="capitulos__pie">
          {capitulos.length} {capitulos.length === 1 ? "capítulo" : "capítulos"} ·{" "}
          {media.toLocaleString("es-ES")} palabras de media
        </div>
      )}
    </nav>
  );
}
