/**
 * The shelf: pick a work, or start one.
 *
 * The covers are the interface. A list of file names would be faster to build
 * and would make every book look the same; a shelf of covers is how a writer
 * recognises their own work across a year, and it is also the only place the
 * cover designer's output is ever seen at rest.
 *
 * The line under the heading always says where the books are coming from. That
 * is not a diagnostic for the developer: it is the difference between "my book
 * is safe on the PC" and "my book is in a browser tab on a school computer",
 * and the writer has a right to know which one they are looking at.
 */

import { useState } from "react";
import type { Catalogo, LibroResumen } from "@/datos/biblioteca";
import { minutosDeLectura } from "@/nucleo/bloques";
import { DialogoConfirmar, DialogoTexto } from "@/ui/Dialogo";
import { Icono } from "@/ui/Icono";
import { Portada } from "./Portada";

export function Estanteria({
  catalogo,
  cargando,
  onAbrir,
  onCrear,
  onDuplicar,
  onRenombrar,
  onBorrar,
  onAjustes,
  onRecargar,
}: {
  catalogo: Catalogo | null;
  cargando: boolean;
  onAbrir: (slug: string) => void;
  onCrear: (titulo: string) => void;
  onDuplicar: (slug: string) => void;
  onRenombrar: (slug: string, titulo: string) => void;
  onBorrar: (slug: string) => void;
  onAjustes: () => void;
  onRecargar: () => void;
}) {
  const [creando, setCreando] = useState(false);
  const [renombrando, setRenombrando] = useState<LibroResumen | null>(null);
  const [borrando, setBorrando] = useState<LibroResumen | null>(null);

  const libros = catalogo?.libros ?? [];
  const palabras = libros.reduce((suma, libro) => suma + libro.palabras, 0);

  return (
    <div className="estanteria">
      <div className="estanteria__dentro">
        <div className="marca">
          <span className="marca__nombre">
            Scriptorium<span className="marca__punto">.</span>
          </span>
          <span className="eyebrow">un sitio para escribir libros</span>
        </div>

        <div className="cabecera">
          <div className="cabecera__texto">
            <span className="cabecera__linea">
              {cargando
                ? "Buscando tus libros…"
                : libros.length === 0
                  ? "La estantería está vacía."
                  : `${libros.length} ${libros.length === 1 ? "obra" : "obras"} · ${palabras.toLocaleString(
                      "es-ES",
                    )} palabras · ${minutosDeLectura(palabras)} min de lectura`}
            </span>
          </div>

          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
            {catalogo && <Origen catalogo={catalogo} onRecargar={onRecargar} />}
            <button type="button" className="boton boton--desnudo" onClick={onAjustes} title="Ajustes">
              <Icono nombre="ajustes" />
            </button>
            <button type="button" className="boton boton--principal" onClick={() => setCreando(true)}>
              <Icono nombre="mas" /> Nuevo libro
            </button>
          </div>
        </div>

        {!cargando && libros.length === 0 && (
          <div className="vacio">
            <span style={{ color: "var(--tenue)" }}>
              <Icono nombre="libro" tamano={30} />
            </span>
            <h2 className="vacio__titulo">Aquí no hay nada escrito todavía</h2>
            <p className="vacio__texto">
              Cada libro es un solo archivo Markdown con su tipografía, sus márgenes y su portada
              guardados dentro. Se compone en páginas mientras escribes, y se puede abrir en
              Obsidian o en cualquier editor: nada de lo que escribas depende de esta web.
            </p>
            <button type="button" className="boton boton--principal" onClick={() => setCreando(true)}>
              <Icono nombre="mas" /> Empezar el primero
            </button>
          </div>
        )}

        {libros.length > 0 && (
          <div className="rejilla">
            {libros.map((libro) => (
              <Obra
                key={libro.slug}
                libro={libro}
                onAbrir={() => onAbrir(libro.slug)}
                onDuplicar={() => onDuplicar(libro.slug)}
                onRenombrar={() => setRenombrando(libro)}
                onBorrar={() => setBorrando(libro)}
              />
            ))}
          </div>
        )}
      </div>

      {creando && (
        <DialogoTexto
          titulo="Un libro nuevo"
          etiqueta="¿Cómo se titula?"
          valorInicial="Libro sin título"
          confirmar="Empezar"
          onAceptar={(titulo) => {
            setCreando(false);
            onCrear(titulo);
          }}
          onCancelar={() => setCreando(false)}
        />
      )}

      {renombrando && (
        <DialogoTexto
          titulo="Cambiar el nombre del archivo"
          texto="Cambia el nombre del fichero en el disco. El título que se imprime en la portada se edita en el panel de diseño."
          etiqueta="Nombre del archivo"
          valorInicial={renombrando.slug}
          confirmar="Cambiar"
          onAceptar={(nombre) => {
            const libro = renombrando;
            setRenombrando(null);
            onRenombrar(libro.slug, nombre);
          }}
          onCancelar={() => setRenombrando(null)}
        />
      )}

      {borrando && (
        <DialogoConfirmar
          titulo={`¿Borrar «${borrando.meta.titulo}»?`}
          texto={`Son ${borrando.palabras.toLocaleString("es-ES")} palabras. Se guarda una copia de rescate en este navegador, pero el archivo desaparece del disco y de la nube.`}
          confirmar="Borrar"
          peligro
          onAceptar={() => {
            const libro = borrando;
            setBorrando(null);
            onBorrar(libro.slug);
          }}
          onCancelar={() => setBorrando(null)}
        />
      )}
    </div>
  );
}

function Obra({
  libro,
  onAbrir,
  onDuplicar,
  onRenombrar,
  onBorrar,
}: {
  libro: LibroResumen;
  onAbrir: () => void;
  onDuplicar: () => void;
  onRenombrar: () => void;
  onBorrar: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const objetivo = libro.meta.meta ?? 0;
  const avance = objetivo > 0 ? Math.min(100, Math.round((libro.palabras / objetivo) * 100)) : 0;

  return (
    <div
      className="obra"
      onMouseLeave={() => setAbierto(false)}
    >
      <button
        type="button"
        className="obra__portada"
        onClick={onAbrir}
        title={`Abrir «${libro.meta.titulo}»`}
        style={{ display: "block", width: "100%" }}
      >
        <Portada meta={libro.meta} tamano="mini" />
      </button>

      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.25rem" }}>
        <button
          type="button"
          onClick={onAbrir}
          style={{ flex: 1, minWidth: 0, textAlign: "left" }}
        >
          <span className="obra__titulo">{libro.meta.titulo}</span>
          <span className="obra__pie" style={{ display: "block" }}>
            {libro.palabras.toLocaleString("es-ES")} palabras
            {objetivo > 0 && ` · ${avance}%`} ·{" "}
            {new Date(libro.actualizado).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "short",
            })}
          </span>
        </button>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="boton boton--desnudo"
            onClick={() => setAbierto((previo) => !previo)}
            aria-label={`Más opciones de ${libro.meta.titulo}`}
            style={{ padding: "0.2rem" }}
          >
            <Icono nombre="capitulos" tamano={14} />
          </button>
          {abierto && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "100%",
                zIndex: 5,
                background: "var(--panel)",
                border: "1px solid var(--linea)",
                borderRadius: "var(--radio)",
                boxShadow: "0 10px 30px -12px rgb(0 0 0 / 30%)",
                display: "flex",
                flexDirection: "column",
                padding: "0.2rem",
                minWidth: "9rem",
              }}
            >
              <button
                type="button"
                className="boton boton--desnudo"
                style={{ justifyContent: "flex-start" }}
                onClick={() => {
                  setAbierto(false);
                  onDuplicar();
                }}
              >
                <Icono nombre="copiar" tamano={14} /> Duplicar
              </button>
              <button
                type="button"
                className="boton boton--desnudo"
                style={{ justifyContent: "flex-start" }}
                onClick={() => {
                  setAbierto(false);
                  onRenombrar();
                }}
              >
                <Icono nombre="lapiz" tamano={14} /> Renombrar
              </button>
              <button
                type="button"
                className="boton boton--desnudo boton--peligro"
                style={{ justifyContent: "flex-start" }}
                onClick={() => {
                  setAbierto(false);
                  onBorrar();
                }}
              >
                <Icono nombre="papelera" tamano={14} /> Borrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const TEXTO_ORIGEN: Record<Catalogo["via"], string> = {
  servidor: "Guardando en tu ordenador",
  nube: "Guardando en la nube",
  local: "Solo en este navegador",
};

const EXPLICA_ORIGEN: Record<Catalogo["via"], string> = {
  servidor:
    "El ordenador está encendido y responde: los libros se escriben en los archivos de verdad, en Drive.",
  nube: "El ordenador no responde. Se escribe en la nube cifrada y el ordenador lo aplicará a los archivos cuando vuelva.",
  local:
    "Ni el ordenador ni la nube responden. Lo que escribas vive solo en este navegador hasta que haya conexión: no cierres la pestaña sin recuperarla.",
};

function Origen({ catalogo, onRecargar }: { catalogo: Catalogo; onRecargar: () => void }) {
  return (
    <button
      type="button"
      className="origen"
      onClick={onRecargar}
      title={`${EXPLICA_ORIGEN[catalogo.via]}\n\nPulsa para volver a intentarlo.`}
    >
      <span className={`origen__punto origen__punto--${catalogo.via}`} />
      {TEXTO_ORIGEN[catalogo.via]}
    </button>
  );
}
