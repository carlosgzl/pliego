/**
 * El Taller: the screen you actually write on.
 *
 * A thin bar, the manuscript, and NOTHING ELSE by default. Everything optional
 * — the chapter list, the composed page, the design panel — is behind a control
 * you press when you want it, and is remembered for next time. The measure of
 * this screen is whether you forget it is there.
 *
 * The manuscript is a plain <textarea>. That is a decision, not a shortcut: a
 * contenteditable rich editor is where writing apps go to lose paragraphs to
 * clipboard bugs and IME races, and a textarea gives us the browser's own undo
 * stack, its own spellchecker and its own accessibility for free. Everything
 * that would need rich text — the marks, the drop caps, the page — happens in
 * the galley beside it, which is where a writer looks for it anyway.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  bloqueEnPosicion,
  capitulosDe,
  contarPalabras,
  minutosDeLectura,
  partirEnBloques,
} from "@/nucleo/bloques";
import {
  alternarTitulo,
  enterTrasTitulo,
  envolver,
  nuevaEscena,
  nuevoCapitulo,
  tipografia,
  type Edicion,
} from "@/nucleo/edicion";
import { pilaDe } from "@/nucleo/fuentes";
import { componer, descomponer, type Meta } from "@/nucleo/libro";
import { guardarLibro, leerLibro, type ResultadoGuardado } from "@/datos/biblioteca";
import { ficheroDeMuestra } from "@/datos/muestra";
import { marcarArranque, palabrasDeHoy, type Ajustes } from "@/datos/ajustes";
import { avisar } from "@/ui/Avisos";
import { Icono } from "@/ui/Icono";
import { Galera } from "./Galera";
import { ListaCapitulos } from "./ListaCapitulos";
import { Resaltado, TOPE_RESALTADO } from "./Manuscrito";
import { PanelDiseno } from "./PanelDiseno";
import { Lector } from "./Lector";
import { Exportar } from "./Exportar";

/** How long after the last keystroke the book is written. */
const ESPERA_GUARDADO = 1200;

type Estado = "abriendo" | "limpio" | "escribiendo" | "guardando" | "guardado" | "problema";

export function Taller({
  slug,
  demo,
  ajustes,
  onAjustes,
  onSalir,
  onEntrar,
}: {
  slug: string;
  /** Nobody has signed in: the sample book, and nothing is written anywhere. */
  demo: boolean;
  ajustes: Ajustes;
  onAjustes: (ajustes: Ajustes) => void;
  onSalir: () => void;
  onEntrar: () => void;
}) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [cuerpo, setCuerpo] = useState("");
  const [estado, setEstado] = useState<Estado>("abriendo");
  const [problema, setProblema] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [paginas, setPaginas] = useState(1);
  const [panel, setPanel] = useState<"ninguno" | "diseno" | "exportar">("ninguno");
  const [leyendo, setLeyendo] = useState(false);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);

  const area = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const temporizador = useRef<number | null>(null);
  const ultimoGuardado = useRef("");

  /* ── Opening ─────────────────────────────────────────────────────────────── */

  useEffect(() => {
    let vivo = true;
    void (async () => {
      // Nobody signed in: the sample book, straight from memory. No request is
      // made at all — a visitor's browser never reaches for his library.
      const fichero = demo ? ficheroDeMuestra() : await leerLibro(slug);
      if (!vivo) {
        return;
      }
      if (fichero === null) {
        avisar("No se ha podido abrir el libro.", "error");
        onSalir();
        return;
      }
      const partido = descomponer(fichero);
      setMeta(partido.meta);
      setCuerpo(partido.cuerpo);
      ultimoGuardado.current = fichero;
      setEstado("limpio");
      marcarArranque(slug, contarPalabras(partido.cuerpo));
    })();
    return () => {
      vivo = false;
    };
  }, [slug, demo, onSalir]);

  /* ── Derived ─────────────────────────────────────────────────────────────── */

  const bloques = useMemo(() => partirEnBloques(cuerpo), [cuerpo]);
  const capitulos = useMemo(() => capitulosDe(bloques), [bloques]);
  const palabras = useMemo(() => contarPalabras(cuerpo), [cuerpo]);
  const hoy = palabrasDeHoy(slug, palabras);

  const capituloActual = useMemo(() => {
    const indiceBloque = bloqueEnPosicion(bloques, cursor);
    let capitulo = -1;
    for (let i = 0; i <= indiceBloque && i < bloques.length; i += 1) {
      if (bloques[i]!.nivel === 1) {
        capitulo += 1;
      }
    }
    return capitulo;
  }, [bloques, cursor]);

  /* ── Saving ──────────────────────────────────────────────────────────────── */

  const guardar = useCallback(
    async (metaAhora: Meta, cuerpoAhora: string) => {
      const fichero = componer(metaAhora, cuerpoAhora);
      if (fichero === ultimoGuardado.current) {
        setEstado("limpio");
        return;
      }
      if (demo) {
        // The sample book is never written anywhere, and the bar says so rather
        // than showing a tick over text that will vanish with the tab.
        setEstado("problema");
        setProblema("Es el libro de muestra: no se guarda. Entra para escribir el tuyo.");
        return;
      }
      setEstado("guardando");
      let resultado: ResultadoGuardado;
      try {
        resultado = await guardarLibro(slug, fichero);
      } catch {
        resultado = { en: [], enDisco: false, problema: "Algo ha fallado al guardar." };
      }
      if (resultado.en.length === 0) {
        setEstado("problema");
        setProblema(resultado.problema ?? "No se ha podido guardar.");
        return;
      }
      ultimoGuardado.current = fichero;
      setProblema(resultado.problema ?? null);
      setEstado(resultado.problema ? "problema" : "guardado");
    },
    [slug, demo],
  );

  /* Debounced autosave. The timer is cleared on unmount AND the book is written
     one last time, because leaving the workshop is exactly when a writer
     assumes their work is safe. */
  useEffect(() => {
    if (!meta || estado === "abriendo") {
      return;
    }
    if (temporizador.current) {
      window.clearTimeout(temporizador.current);
    }
    temporizador.current = window.setTimeout(() => {
      void guardar(meta, cuerpo);
    }, ESPERA_GUARDADO);
    return () => {
      if (temporizador.current) {
        window.clearTimeout(temporizador.current);
      }
    };
  }, [meta, cuerpo, estado, guardar]);

  const salir = useCallback(() => {
    if (meta) {
      void guardar(meta, cuerpo);
    }
    onSalir();
  }, [meta, cuerpo, guardar, onSalir]);

  /* Closing the tab with text that has not landed anywhere durable. */
  useEffect(() => {
    if (!ajustes.avisarSalida) {
      return;
    }
    const alSalir = (evento: BeforeUnloadEvent) => {
      // Never for the sample book: warning somebody that they are about to lose
      // text that was never going to be saved is just noise.
      if (!demo && (estado === "escribiendo" || estado === "guardando" || estado === "problema")) {
        evento.preventDefault();
      }
    };
    window.addEventListener("beforeunload", alSalir);
    return () => window.removeEventListener("beforeunload", alSalir);
  }, [estado, demo, ajustes.avisarSalida]);

  /* ── Editing ─────────────────────────────────────────────────────────────── */

  const aplicar = useCallback((edicion: Edicion) => {
    setCuerpo(edicion.texto);
    setEstado("escribiendo");
    setCursor(edicion.desde);
    // The caret has to be restored AFTER React has written the new value, or
    // the browser puts it at the end and the writer loses their place.
    requestAnimationFrame(() => {
      const nodo = area.current;
      if (nodo) {
        nodo.focus();
        nodo.setSelectionRange(edicion.desde, edicion.hasta);
      }
    });
  }, []);

  const conSeleccion = useCallback(
    (accion: (texto: string, desde: number, hasta: number) => Edicion) => {
      const nodo = area.current;
      if (!nodo) {
        return;
      }
      aplicar(accion(cuerpo, nodo.selectionStart, nodo.selectionEnd));
    },
    [cuerpo, aplicar],
  );

  const alTeclear = (evento: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    const nodo = evento.currentTarget;
    const mando = evento.ctrlKey || evento.metaKey;

    if (mando) {
      const tecla = evento.key.toLowerCase();
      if (tecla === "b") {
        evento.preventDefault();
        conSeleccion((texto, desde, hasta) => envolver(texto, desde, hasta, "**"));
        return;
      }
      if (tecla === "i") {
        evento.preventDefault();
        conSeleccion((texto, desde, hasta) => envolver(texto, desde, hasta, "*"));
        return;
      }
      if (tecla === "1" || tecla === "2") {
        evento.preventDefault();
        aplicar(alternarTitulo(cuerpo, nodo.selectionStart, tecla === "1" ? 1 : 2));
        return;
      }
      if (tecla === "s") {
        evento.preventDefault();
        if (meta) {
          void guardar(meta, cuerpo);
        }
        return;
      }
      if (tecla === "enter") {
        evento.preventDefault();
        aplicar(nuevaEscena(cuerpo, nodo.selectionStart));
        return;
      }
    }

    if (evento.key === "Enter" && !evento.shiftKey) {
      const salto = enterTrasTitulo(cuerpo, nodo.selectionStart);
      if (salto) {
        evento.preventDefault();
        aplicar(salto);
      }
    }

    if (evento.key === "Escape" && pantallaCompleta) {
      setPantallaCompleta(false);
    }
  };

  const alEscribir = (valor: string, posicion: number) => {
    setEstado("escribiendo");
    if (ajustes.tipografia) {
      const arreglo = tipografia(valor, posicion);
      if (arreglo) {
        aplicar(arreglo);
        return;
      }
    }
    setCuerpo(valor);
    setCursor(posicion);
  };

  /* The textarea grows with its content: the container scrolls, not the field,
     so the caret never sits behind a second scrollbar. */
  useLayoutEffect(() => {
    const nodo = area.current;
    if (!nodo) {
      return;
    }
    nodo.style.height = "auto";
    nodo.style.height = `${nodo.scrollHeight}px`;
  }, [cuerpo, ajustes.tamanoEditor, ajustes.anchoEditor, ajustes.interlineadoEditor]);

  /* Typewriter scrolling: keep the caret line near the middle of the screen. */
  useEffect(() => {
    if (!ajustes.maquina) {
      return;
    }
    const nodo = area.current;
    const caja = scroller.current;
    if (!nodo || !caja) {
      return;
    }
    const lineas = cuerpo.slice(0, cursor).split("\n").length;
    const alturaLinea = ajustes.tamanoEditor * ajustes.interlineadoEditor;
    const objetivo = nodo.offsetTop + lineas * alturaLinea - caja.clientHeight / 2;
    caja.scrollTo({ top: Math.max(0, objetivo), behavior: "smooth" });
  }, [cursor, ajustes.maquina, ajustes.tamanoEditor, ajustes.interlineadoEditor, cuerpo]);

  /* ── Resizing the preview ────────────────────────────────────────────────── */

  const arrastrar = (evento: ReactPointerEvent) => {
    evento.preventDefault();
    const lado = ajustes.previa === "lado";
    const inicio = lado ? evento.clientX : evento.clientY;
    const desde = ajustes.previaTamano;
    const mover = (mueve: PointerEvent) => {
      const delta = lado ? inicio - mueve.clientX : inicio - mueve.clientY;
      onAjustes({ ...ajustes, previaTamano: Math.min(900, Math.max(120, desde + delta)) });
    };
    const soltar = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  };

  if (!meta) {
    return (
      <div className="taller">
        <div className="barra">
          <button type="button" className="boton boton--desnudo" onClick={onSalir}>
            <Icono nombre="atras" /> Estantería
          </button>
        </div>
        <p className="campo__nota" style={{ padding: "2rem", textAlign: "center" }}>
          Abriendo el libro…
        </p>
      </div>
    );
  }

  /* The mirror and the textarea must be given the SAME type, from one object,
     so no edit can ever set one and forget the other. */
  const tipoEditor = {
    fontFamily: pilaDe(ajustes.fuenteEditor),
    fontSize: `${ajustes.tamanoEditor}px`,
    lineHeight: ajustes.interlineadoEditor,
  };
  const resaltado = cuerpo.length <= TOPE_RESALTADO;

  const previaVisible = ajustes.previa !== "oculta" && !pantallaCompleta;
  const altoPagina =
    ajustes.previa === "lado" ? Math.min(720, ajustes.previaTamano * 1.35) : ajustes.previaTamano;

  return (
    <div className="taller">
      {!pantallaCompleta && (
        <div className="barra">
          <button
            type="button"
            className="boton boton--desnudo"
            onClick={salir}
            title="Volver a la estantería"
          >
            <Icono nombre="atras" />
          </button>

          <button
            type="button"
            className="boton boton--desnudo"
            aria-pressed={ajustes.capitulos}
            onClick={() => onAjustes({ ...ajustes, capitulos: !ajustes.capitulos })}
            title="Capítulos"
          >
            <Icono nombre="capitulos" />
          </button>

          <span className="barra__titulo">{meta.titulo}</span>

          <span className="barra__hueco" />

          <div style={{ display: "flex", gap: "0.15rem" }}>
            <button
              type="button"
              className="boton boton--desnudo"
              onClick={() => conSeleccion((t, d, h) => envolver(t, d, h, "**"))}
              title="Negrita (Ctrl+B)"
            >
              <Icono nombre="negrita" />
            </button>
            <button
              type="button"
              className="boton boton--desnudo"
              onClick={() => conSeleccion((t, d, h) => envolver(t, d, h, "*"))}
              title="Cursiva (Ctrl+I)"
            >
              <Icono nombre="cursiva" />
            </button>
            <button
              type="button"
              className="boton boton--desnudo"
              onClick={() => aplicar(alternarTitulo(cuerpo, area.current?.selectionStart ?? 0, 1))}
              title="Convertir en capítulo (Ctrl+1)"
            >
              <Icono nombre="capitulo" />
            </button>
            <button
              type="button"
              className="boton boton--desnudo"
              onClick={() => aplicar(nuevaEscena(cuerpo, area.current?.selectionStart ?? 0))}
              title="Separar escena (Ctrl+Intro)"
            >
              <Icono nombre="escena" />
            </button>
          </div>

          <span className="barra__cuenta" title={`${minutosDeLectura(palabras)} min de lectura`}>
            {palabras.toLocaleString("es-ES")} palabras
            {hoy !== 0 && (
              <>
                {" · "}
                <span style={{ color: hoy > 0 ? "var(--bien)" : "var(--tenue)" }}>
                  {hoy > 0 ? "+" : ""}
                  {hoy.toLocaleString("es-ES")} hoy
                </span>
              </>
            )}
          </span>

          {demo ? (
            <button type="button" className="boton boton--principal" onClick={onEntrar}>
              Entrar para escribir
            </button>
          ) : (
            <Guardado estado={estado} problema={problema} />
          )}

          <div style={{ display: "flex", gap: "0.15rem" }}>
            <button
              type="button"
              className="boton boton--desnudo"
              aria-pressed={ajustes.previa !== "oculta"}
              onClick={() =>
                onAjustes({
                  ...ajustes,
                  previa:
                    ajustes.previa === "oculta"
                      ? "abajo"
                      : ajustes.previa === "abajo"
                        ? "lado"
                        : "oculta",
                })
              }
              title={
                ajustes.previa === "oculta"
                  ? "Ver la página compuesta"
                  : ajustes.previa === "abajo"
                    ? "Ponerla al lado"
                    : "Esconderla"
              }
            >
              <Icono nombre="ojo" />
            </button>
            <button
              type="button"
              className="boton boton--desnudo"
              onClick={() => setLeyendo(true)}
              title="Leer el libro entero"
            >
              <Icono nombre="libro" />
            </button>
            <button
              type="button"
              className="boton boton--desnudo"
              aria-pressed={ajustes.foco}
              onClick={() => onAjustes({ ...ajustes, foco: !ajustes.foco })}
              title="Modo foco"
            >
              <Icono nombre="foco" />
            </button>
            <button
              type="button"
              className="boton boton--desnudo"
              aria-pressed={panel === "exportar"}
              onClick={() => setPanel(panel === "exportar" ? "ninguno" : "exportar")}
              title="Exportar"
            >
              <Icono nombre="descargar" />
            </button>
            <button
              type="button"
              className="boton boton--desnudo"
              aria-pressed={panel === "diseno"}
              onClick={() => setPanel(panel === "diseno" ? "ninguno" : "diseno")}
              title="Diseño del libro"
            >
              <Icono nombre="ajustes" />
            </button>
            <button
              type="button"
              className="boton boton--desnudo"
              onClick={() => setPantallaCompleta(true)}
              title="Solo el texto (Esc para salir)"
            >
              <Icono nombre="expandir" />
            </button>
          </div>
        </div>
      )}

      <div className={`cuerpo cuerpo--${ajustes.previa === "lado" ? "lado" : "abajo"}`}>
        {ajustes.capitulos && !pantallaCompleta && (
          <ListaCapitulos
            capitulos={capitulos}
            aqui={capituloActual}
            onIr={(capitulo) => {
              aplicar({ texto: cuerpo, desde: capitulo.desde, hasta: capitulo.desde });
            }}
            onNuevo={() => aplicar(nuevoCapitulo(cuerpo, area.current?.selectionStart ?? 0))}
            onCerrar={() => onAjustes({ ...ajustes, capitulos: false })}
          />
        )}

        <div
          ref={scroller}
          className={`manuscrito${resaltado ? " manuscrito--resaltado" : ""}`}
          onClick={() => area.current?.focus()}
        >
          <div className="manuscrito__caja" style={{ maxWidth: `${ajustes.anchoEditor}ch` }}>
            <div className="manuscrito__pila">
              {resaltado && (
                <Resaltado
                  valor={cuerpo}
                  cursor={cursor}
                  foco={ajustes.foco}
                  estilo={tipoEditor}
                />
              )}
              <textarea
                ref={area}
                className="manuscrito__area"
                value={cuerpo}
                spellCheck
                lang="es"
                placeholder="Empieza por la primera frase. Lo demás viene detrás."
                style={tipoEditor}
                onChange={(evento) =>
                  alEscribir(evento.target.value, evento.target.selectionStart)
                }
                onKeyDown={alTeclear}
                onSelect={(evento) => setCursor(evento.currentTarget.selectionStart)}
                onClick={(evento) => setCursor(evento.currentTarget.selectionStart)}
              />
            </div>
          </div>
        </div>

        {previaVisible && (
          <>
            <div
              className="tirador"
              onPointerDown={arrastrar}
              role="separator"
              aria-orientation={ajustes.previa === "lado" ? "vertical" : "horizontal"}
            />
            <div
              className="previa"
              style={
                ajustes.previa === "lado"
                  ? { width: ajustes.previaTamano }
                  : { height: ajustes.previaTamano }
              }
            >
              <div className="previa__barra">
                <span>
                  Página {pagina} de {paginas}
                </span>
                <span className="barra__hueco" />
                <span>{meta.diseno.pagina === "personalizada" ? "a medida" : meta.diseno.pagina}</span>
              </div>
              <div className="previa__lienzo">
                <Galera
                  meta={meta}
                  cuerpo={cuerpo}
                  alto={Math.max(120, altoPagina - 70)}
                  pagina={pagina}
                  onPaginas={setPaginas}
                  seguirA={cursor}
                  onPaginaDeCursor={setPagina}
                />
              </div>
            </div>
          </>
        )}

        {panel === "diseno" && (
          <PanelDiseno
            meta={meta}
            cuerpo={cuerpo}
            onCambiar={(siguiente) => {
              setMeta(siguiente);
              setEstado("escribiendo");
            }}
            onCerrar={() => setPanel("ninguno")}
          />
        )}

        {panel === "exportar" && (
          <Exportar
            meta={meta}
            cuerpo={cuerpo}
            slug={slug}
            onCerrar={() => setPanel("ninguno")}
          />
        )}
      </div>

      {pantallaCompleta && (
        <button
          type="button"
          className="boton boton--desnudo"
          onClick={() => setPantallaCompleta(false)}
          title="Salir de pantalla completa (Esc)"
          style={{ position: "fixed", top: "0.75rem", right: "0.75rem", zIndex: 30 }}
        >
          <Icono nombre="encoger" />
        </button>
      )}

      {leyendo && <Lector meta={meta} cuerpo={cuerpo} onCerrar={() => setLeyendo(false)} />}
    </div>
  );
}

function Guardado({ estado, problema }: { estado: Estado; problema: string | null }) {
  if (estado === "problema") {
    return (
      <span className="guardado guardado--aviso" title={problema ?? undefined}>
        <Icono nombre="aviso" tamano={13} /> sin guardar
      </span>
    );
  }
  if (estado === "guardando") {
    return <span className="guardado">guardando…</span>;
  }
  if (estado === "escribiendo") {
    return <span className="guardado">…</span>;
  }
  return (
    <span className="guardado">
      <Icono nombre="guardado" tamano={13} /> guardado
    </span>
  );
}
