/**
 * El Taller: la pantalla en la que se escribe.
 *
 * REHECHO tras su veredicto: la barra era «confusa y rara», la página compuesta
 * salía en una tira de 260 px debajo del texto donde no se leía nada, y el
 * conjunto se sentía «ortopédico». Tres cosas cambian de raíz:
 *
 * 1. LA PÁGINA VA AL LADO, no debajo. Una página es alta y estrecha; ponerla en
 *    una franja horizontal la obliga a medir cuatro dedos. A la derecha (o a la
 *    izquierda, para quien escribe con el índice de capítulos abierto) coge
 *    todo el alto de la pantalla y se lee de verdad.
 * 2. LA BARRA SON TRES ZONAS. Salir e índice a la izquierda, el libro en el
 *    centro, y a la derecha dos menús — «Escribir» y «Ver» — con el nombre de
 *    cada acción escrito y su atajo al lado. Dos botones en vez de nueve
 *    iconos que había que adivinar.
 * 3. GADGETS ELEGIBLES arriba o abajo: palabras, lo escrito hoy, la página, el
 *    cronómetro de la sesión. Los enciende quien quiera; a quien le estorbe una
 *    cuenta de palabras mientras escribe, los apaga todos.
 *
 * El manuscrito sigue siendo un <textarea>. Es una decisión, no un atajo: un
 * editor rico con contenteditable es donde las aplicaciones de escribir pierden
 * párrafos por culpa del portapapeles y del IME, y un textarea trae gratis el
 * deshacer del navegador, su corrector y su accesibilidad. Todo lo que pediría
 * texto rico —las marcas, las capitulares, la página— pasa en la galera de al
 * lado, que es donde un escritor lo busca.
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
import { medidaMm } from "@/nucleo/geometria";
import { componer, descomponer, type Meta } from "@/nucleo/libro";
import { guardarLibro, leerLibro, type ResultadoGuardado } from "@/datos/biblioteca";
import { ficheroDeMuestra } from "@/datos/muestra";
import { marcarArranque, palabrasDeHoy, type Ajustes, type SitioPrevia } from "@/datos/ajustes";
import { avisar } from "@/ui/Avisos";
import { Icono } from "@/ui/Icono";
import { BotonBarra, GrupoBarra, MenuBarra, type Accion } from "./BarraTaller";
import { BarraGadgets } from "./Gadgets";
import { Galera } from "./Galera";
import { ListaCapitulos } from "./ListaCapitulos";
import { Resaltado, TOPE_RESALTADO } from "./Manuscrito";
import { PanelDiseno } from "./PanelDiseno";
import { Lector } from "./Lector";
import { Exportar } from "./Exportar";

/** Cuánto se espera tras la última tecla antes de escribir el libro. */
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
  /** Nadie ha entrado: el libro de muestra, y no se escribe en ningún sitio. */
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
  /** Cuándo se abrió este libro: es el cronómetro de la sesión. */
  const desde = useRef(Date.now());

  /* ── Abrir ───────────────────────────────────────────────────────────────── */

  useEffect(() => {
    let vivo = true;
    void (async () => {
      // Sin sesión, el libro de muestra directo de memoria: el navegador de un
      // visitante no va a buscar su biblioteca ni una sola vez.
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

  /* ── Derivados ───────────────────────────────────────────────────────────── */

  const bloques = useMemo(() => partirEnBloques(cuerpo), [cuerpo]);
  const capitulos = useMemo(() => capitulosDe(bloques), [bloques]);
  const palabras = useMemo(() => contarPalabras(cuerpo), [cuerpo]);
  const hoy = palabrasDeHoy(slug, palabras);

  const indiceCapitulo = useMemo(() => {
    const indiceBloque = bloqueEnPosicion(bloques, cursor);
    let capitulo = -1;
    for (let i = 0; i <= indiceBloque && i < bloques.length; i += 1) {
      if (bloques[i]!.nivel === 1) {
        capitulo += 1;
      }
    }
    return capitulo;
  }, [bloques, cursor]);

  const capituloActual = capitulos[indiceCapitulo] ?? null;

  /* ── Guardar ─────────────────────────────────────────────────────────────── */

  const guardar = useCallback(
    async (metaAhora: Meta, cuerpoAhora: string) => {
      const fichero = componer(metaAhora, cuerpoAhora);
      if (fichero === ultimoGuardado.current) {
        setEstado("limpio");
        return;
      }
      if (demo) {
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

  useEffect(() => {
    if (!ajustes.avisarSalida) {
      return;
    }
    const alSalir = (evento: BeforeUnloadEvent) => {
      if (!demo && (estado === "escribiendo" || estado === "guardando" || estado === "problema")) {
        evento.preventDefault();
      }
    };
    window.addEventListener("beforeunload", alSalir);
    return () => window.removeEventListener("beforeunload", alSalir);
  }, [estado, demo, ajustes.avisarSalida]);

  /* ── Editar ──────────────────────────────────────────────────────────────── */

  const aplicar = useCallback((edicion: Edicion) => {
    setCuerpo(edicion.texto);
    setEstado("escribiendo");
    setCursor(edicion.desde);
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

  const negrita = () => conSeleccion((t, d, h) => envolver(t, d, h, "**"));
  const cursiva = () => conSeleccion((t, d, h) => envolver(t, d, h, "*"));
  const capitulo = () => aplicar(alternarTitulo(cuerpo, area.current?.selectionStart ?? 0, 1));
  const escena = () => aplicar(nuevaEscena(cuerpo, area.current?.selectionStart ?? 0));

  const alTeclear = (evento: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    const nodo = evento.currentTarget;
    const mando = evento.ctrlKey || evento.metaKey;

    if (mando) {
      const tecla = evento.key.toLowerCase();
      if (tecla === "b") {
        evento.preventDefault();
        negrita();
        return;
      }
      if (tecla === "i") {
        evento.preventDefault();
        cursiva();
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
        escena();
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

  useLayoutEffect(() => {
    const nodo = area.current;
    if (!nodo) {
      return;
    }
    nodo.style.height = "auto";
    nodo.style.height = `${nodo.scrollHeight}px`;
  }, [cuerpo, ajustes.tamanoEditor, ajustes.anchoEditor, ajustes.interlineadoEditor]);

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

  /* ── Mover el tirador de la previa ───────────────────────────────────────── */

  const arrastrar = (evento: ReactPointerEvent) => {
    evento.preventDefault();
    const lado = ajustes.previa === "derecha" || ajustes.previa === "izquierda";
    const inicio = lado ? evento.clientX : evento.clientY;
    const desdeTamano = ajustes.previaTamano;
    // A la izquierda el arrastre va al revés: alejarse del borde la agranda.
    const signo = ajustes.previa === "izquierda" ? -1 : 1;
    const mover = (mueve: PointerEvent) => {
      const delta = (lado ? inicio - mueve.clientX : inicio - mueve.clientY) * signo;
      onAjustes({ ...ajustes, previaTamano: Math.min(1000, Math.max(200, desdeTamano + delta)) });
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
            <Icono nombre="atras" /> <span className="boton__texto">Volver</span>
          </button>
        </div>
        <p className="campo__nota" style={{ padding: "2rem", textAlign: "center" }}>
          Abriendo el libro…
        </p>
      </div>
    );
  }

  const alLado = ajustes.previa === "derecha" || ajustes.previa === "izquierda";
  const previaVisible = ajustes.previa !== "oculta" && !pantallaCompleta;
  const altoPagina = alLado ? undefined : ajustes.previaTamano;

  const tipoEditor = {
    fontFamily: pilaDe(ajustes.fuenteEditor),
    fontSize: `${ajustes.tamanoEditor}px`,
    lineHeight: ajustes.interlineadoEditor,
  };
  const resaltado = cuerpo.length <= TOPE_RESALTADO;

  const ponerPrevia = (sitio: SitioPrevia) => onAjustes({ ...ajustes, previa: sitio });

  const accionesEscribir: Accion[] = [
    { clave: "b", nombre: "Negrita", icono: "negrita", atajo: "Ctrl+B", hacer: negrita },
    { clave: "i", nombre: "Cursiva", icono: "cursiva", atajo: "Ctrl+I", hacer: cursiva },
    { clave: "cap", nombre: "Convertir en capítulo", icono: "capitulo", atajo: "Ctrl+1", hacer: capitulo },
    { clave: "esc", nombre: "Separar escena", icono: "escena", atajo: "Ctrl+↵", hacer: escena },
    {
      clave: "foco",
      nombre: "Modo foco",
      icono: "foco",
      puesto: ajustes.foco,
      hacer: () => onAjustes({ ...ajustes, foco: !ajustes.foco }),
    },
    {
      clave: "maquina",
      nombre: "Scroll de máquina de escribir",
      icono: "flecha",
      puesto: ajustes.maquina,
      hacer: () => onAjustes({ ...ajustes, maquina: !ajustes.maquina }),
    },
  ];

  const accionesVer: Accion[] = [
    {
      clave: "derecha",
      nombre: "Página a la derecha",
      icono: "ojo",
      puesto: ajustes.previa === "derecha",
      hacer: () => ponerPrevia("derecha"),
    },
    {
      clave: "izquierda",
      nombre: "Página a la izquierda",
      icono: "ojo",
      puesto: ajustes.previa === "izquierda",
      hacer: () => ponerPrevia("izquierda"),
    },
    {
      clave: "abajo",
      nombre: "Página abajo",
      icono: "ojo",
      puesto: ajustes.previa === "abajo",
      hacer: () => ponerPrevia("abajo"),
    },
    {
      clave: "oculta",
      nombre: "Sin página",
      icono: "cerrar",
      puesto: ajustes.previa === "oculta",
      hacer: () => ponerPrevia("oculta"),
    },
    {
      clave: "gadgets",
      nombre:
        ajustes.sitioGadgets === "oculta"
          ? "Enseñar los gadgets"
          : ajustes.sitioGadgets === "abajo"
            ? "Gadgets arriba"
            : "Esconder los gadgets",
      icono: "panel",
      hacer: () =>
        onAjustes({
          ...ajustes,
          sitioGadgets:
            ajustes.sitioGadgets === "oculta"
              ? "abajo"
              : ajustes.sitioGadgets === "abajo"
                ? "arriba"
                : "oculta",
        }),
    },
    { clave: "leer", nombre: "Leer el libro entero", icono: "libro", hacer: () => setLeyendo(true) },
    {
      clave: "pantalla",
      nombre: "Solo el texto",
      icono: "expandir",
      atajo: "Esc para salir",
      hacer: () => setPantallaCompleta(true),
    },
  ];

  const datosGadgets = {
    palabras,
    hoy,
    meta: meta.meta ?? 0,
    pagina,
    paginas,
    capitulo: capituloActual?.titulo ?? null,
    palabrasCapitulo: capituloActual?.palabras ?? 0,
    desde: desde.current,
  };

  const gadgets =
    ajustes.sitioGadgets !== "oculta" && !pantallaCompleta ? (
      <BarraGadgets
        activos={ajustes.gadgets}
        datos={datosGadgets}
        sitio={ajustes.sitioGadgets}
      />
    ) : null;

  return (
    <div className="taller pantalla pantalla--taller">
      {!pantallaCompleta && (
        <div className="barra">
          <GrupoBarra>
            <BotonBarra nombre="Volver" icono="atras" onClick={salir} />
            <BotonBarra
              nombre="Índice"
              icono="capitulos"
              puesto={ajustes.capitulos}
              onClick={() => onAjustes({ ...ajustes, capitulos: !ajustes.capitulos })}
            />
          </GrupoBarra>

          <div className="barra__libro">
            <span className="barra__titulo">{meta.titulo}</span>
            {demo ? (
              <span className="barra__aviso">libro de muestra</span>
            ) : (
              <Guardado estado={estado} problema={problema} />
            )}
          </div>

          <GrupoBarra>
            {demo && (
              <button type="button" className="boton boton--principal" onClick={onEntrar}>
                Entrar para escribir
              </button>
            )}
            <MenuBarra etiqueta="Escribir" icono="lapiz" acciones={accionesEscribir} />
            <MenuBarra etiqueta="Ver" icono="ojo" acciones={accionesVer} />
            <BotonBarra
              nombre="Diseño"
              icono="ajustes"
              puesto={panel === "diseno"}
              onClick={() => setPanel(panel === "diseno" ? "ninguno" : "diseno")}
            />
            <BotonBarra
              nombre="Exportar"
              icono="descargar"
              soloIcono
              puesto={panel === "exportar"}
              onClick={() => setPanel(panel === "exportar" ? "ninguno" : "exportar")}
            />
          </GrupoBarra>
        </div>
      )}

      {ajustes.sitioGadgets === "arriba" && gadgets}

      <div className={`cuerpo cuerpo--${alLado ? "lado" : "abajo"}`}>
        {ajustes.capitulos && !pantallaCompleta && (
          <ListaCapitulos
            capitulos={capitulos}
            aqui={indiceCapitulo}
            onIr={(cap) => aplicar({ texto: cuerpo, desde: cap.desde, hasta: cap.desde })}
            onNuevo={() => aplicar(nuevoCapitulo(cuerpo, area.current?.selectionStart ?? 0))}
            onCerrar={() => onAjustes({ ...ajustes, capitulos: false })}
          />
        )}

        {previaVisible && ajustes.previa === "izquierda" && (
          <Previa
            meta={meta}
            cuerpo={cuerpo}
            ajustes={ajustes}
            pagina={pagina}
            paginas={paginas}
            cursor={cursor}
            alto={altoPagina}
            onPaginas={setPaginas}
            onPagina={setPagina}
            onArrastrar={arrastrar}
            lado="izquierda"
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
                <Resaltado valor={cuerpo} cursor={cursor} foco={ajustes.foco} estilo={tipoEditor} />
              )}
              <textarea
                ref={area}
                className="manuscrito__area"
                value={cuerpo}
                spellCheck
                lang="es"
                placeholder="Empieza por la primera frase. Lo demás viene detrás."
                style={tipoEditor}
                onChange={(evento) => alEscribir(evento.target.value, evento.target.selectionStart)}
                onKeyDown={alTeclear}
                onSelect={(evento) => setCursor(evento.currentTarget.selectionStart)}
                onClick={(evento) => setCursor(evento.currentTarget.selectionStart)}
              />
            </div>
          </div>
        </div>

        {previaVisible && ajustes.previa !== "izquierda" && (
          <Previa
            meta={meta}
            cuerpo={cuerpo}
            ajustes={ajustes}
            pagina={pagina}
            paginas={paginas}
            cursor={cursor}
            alto={altoPagina}
            onPaginas={setPaginas}
            onPagina={setPagina}
            onArrastrar={arrastrar}
            lado={ajustes.previa === "abajo" ? "abajo" : "derecha"}
          />
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
          <Exportar meta={meta} cuerpo={cuerpo} slug={slug} onCerrar={() => setPanel("ninguno")} />
        )}
      </div>

      {ajustes.sitioGadgets === "abajo" && gadgets}

      {pantallaCompleta && (
        <button
          type="button"
          className="boton boton--desnudo salir-pantalla"
          onClick={() => setPantallaCompleta(false)}
          title="Salir de pantalla completa (Esc)"
        >
          <Icono nombre="encoger" />
        </button>
      )}

      {leyendo && <Lector meta={meta} cuerpo={cuerpo} onCerrar={() => setLeyendo(false)} />}
    </div>
  );
}

/**
 * La página compuesta, al lado o debajo.
 *
 * Se saca a su propio componente porque va en dos sitios del árbol —antes o
 * después del manuscrito según de qué lado esté— y duplicarla habría sido
 * duplicar también el tirador y el cálculo del alto.
 */
function Previa({
  meta,
  cuerpo,
  ajustes,
  pagina,
  paginas,
  cursor,
  alto,
  onPaginas,
  onPagina,
  onArrastrar,
  lado,
}: {
  meta: Meta;
  cuerpo: string;
  ajustes: Ajustes;
  pagina: number;
  paginas: number;
  cursor: number;
  alto: number | undefined;
  onPaginas: (total: number) => void;
  onPagina: (pagina: number) => void;
  onArrastrar: (evento: ReactPointerEvent) => void;
  lado: "derecha" | "izquierda" | "abajo";
}) {
  const caja = useRef<HTMLDivElement>(null);
  const [hueco, setHueco] = useState({ ancho: 380, alto: 520 });

  /* Se mide el hueco en vez de calcularlo: la barra de gadgets aparece y
     desaparece bajo los pies, y el tirador cambia el ancho a voluntad. */
  useLayoutEffect(() => {
    const nodo = caja.current;
    if (!nodo) {
      return;
    }
    const medir = () =>
      setHueco({
        ancho: Math.max(160, nodo.clientWidth - 32),
        alto: Math.max(200, nodo.clientHeight - 32),
      });
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  /*
   * La página se limita por ALTO Y POR ANCHO, no solo por alto.
   *
   * Escalando solo por el alto disponible, un A5 en un panel de 420 px salía de
   * 449 px de ancho y se comía el borde. La proporción del papel dice cuánto
   * alto cabe en el ancho que hay, y se coge el menor de los dos.
   */
  const mm = medidaMm(meta.diseno);
  const altoQueCabeDeAncho = (hueco.ancho * mm.alto) / mm.ancho;
  const altoPagina =
    lado === "abajo"
      ? Math.min(Math.max(160, (alto ?? 300) - 74), altoQueCabeDeAncho)
      : Math.min(hueco.alto, altoQueCabeDeAncho);

  /* El tirador va SIEMPRE entre la página y el texto: a la derecha va delante
     de la página, a la izquierda detrás. Ponerlo siempre en el mismo sitio lo
     dejaba pegado al borde de la ventana, donde no separa nada. */
  const tirador = (
    <div
      className={`tirador${lado === "abajo" ? "" : " tirador--vertical"}`}
      onPointerDown={onArrastrar}
      role="separator"
      aria-orientation={lado === "abajo" ? "horizontal" : "vertical"}
      aria-label="Cambiar el tamaño de la página"
    />
  );

  return (
    <>
      {lado !== "izquierda" && tirador}
      <div
        className={`previa previa--${lado}`}
        style={
          lado === "abajo"
            ? { height: ajustes.previaTamano }
            : { width: ajustes.previaTamano }
        }
      >
        <div className="previa__barra">
          <span>
            Página {pagina} de {paginas}
          </span>
          <span className="barra__hueco" />
          <div className="previa__pasos">
            <button
              type="button"
              className="boton boton--desnudo"
              onClick={() => onPagina(Math.max(1, pagina - 1))}
              disabled={pagina <= 1}
              aria-label="Página anterior"
            >
              <span style={{ transform: "rotate(180deg)", display: "inline-flex" }}>
                <Icono nombre="flecha" tamano={13} />
              </span>
            </button>
            <button
              type="button"
              className="boton boton--desnudo"
              onClick={() => onPagina(Math.min(paginas, pagina + 1))}
              disabled={pagina >= paginas}
              aria-label="Página siguiente"
            >
              <Icono nombre="flecha" tamano={13} />
            </button>
          </div>
        </div>
        <div className="previa__lienzo" ref={caja}>
          <Galera
            meta={meta}
            cuerpo={cuerpo}
            alto={altoPagina}
            pagina={pagina}
            onPaginas={onPaginas}
            seguirA={cursor}
            onPaginaDeCursor={onPagina}
          />
        </div>
      </div>
      {lado === "izquierda" && tirador}
    </>
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
    return <span className="guardado guardado--latiendo">escribiendo</span>;
  }
  return (
    <span className="guardado">
      <Icono nombre="guardado" tamano={13} /> guardado
    </span>
  );
}
