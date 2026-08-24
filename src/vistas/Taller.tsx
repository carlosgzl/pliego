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
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  bloqueEnPosicion,
  capitulosDe,
  contarCaracteres,
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
import {
  arreglarMayusculaDoble,
  corregirAlTerminar,
  type ModoCorrector,
} from "@/nucleo/correccion";
import { FUENTES, pilaDe } from "@/nucleo/fuentes";
import { medidaMm } from "@/nucleo/geometria";
import { componer, descomponer, type Meta } from "@/nucleo/libro";
import {
  alCambiarBiblioteca,
  guardarLibro,
  leerLibro,
  leerLibroDeCache,
  type ResultadoGuardado,
} from "@/datos/biblioteca";
import { ficheroDeMuestra } from "@/datos/muestra";
import { marcarArranque, palabrasDeHoy, type Ajustes, type SitioPrevia } from "@/datos/ajustes";
import { guardarBorrador, leerBorrador, olvidarBorrador } from "@/datos/borrador";
import { aplicarConDeshacer, altoDelCursor } from "@/ui/area";
import { useReposo } from "@/ui/useReposo";
import {
  alCambiarPantalla,
  enPantallaCompleta,
  pedirPantallaCompleta,
  salirDePantallaCompleta,
  sePuedePantallaCompleta,
} from "@/ui/pantalla";
import { avisar } from "@/ui/Avisos";
import { sonarTecla } from "@/ui/sonido";
import { Icono } from "@/ui/Icono";
import { BotonBarra, GrupoBarra, MenuBarra, type Accion } from "./BarraTaller";
import { BarraGadgets } from "./Gadgets";
import { Galera } from "./Galera";
import { ListaCapitulos } from "./ListaCapitulos";
import { MenuTexto, type AccionTexto, type SitioMenu } from "./MenuTexto";
import { Resaltado, TOPE_RESALTADO } from "./Manuscrito";
import { PanelDiseno } from "./PanelDiseno";
import { Lector } from "./Lector";
import { Exportar } from "./Exportar";

/** Cuánto se espera tras la última tecla antes de escribir el libro. */
const ESPERA_GUARDADO = 1200;

/** Cómo se llama cada modo del corrector, para decirlo en el menú. */
const NOMBRE_CORRECTOR: Record<ModoCorrector, string> = {
  ninguno: "nada",
  sugerir: "sugerir",
  corregir: "corregir solo",
};

/** El botón del menú recorre los tres en orden. */
const SIGUIENTE_CORRECTOR: Record<ModoCorrector, ModoCorrector> = {
  ninguno: "sugerir",
  sugerir: "corregir",
  corregir: "ninguno",
};

type Estado = "abriendo" | "limpio" | "escribiendo" | "guardando" | "guardado" | "problema";

export function Taller({
  slug,
  demo,
  ajustes,
  onAjustes,
  onSalir,
  onTitulo,
  onEntrar,
}: {
  slug: string;
  /** Nadie ha entrado: el libro de muestra, y no se escribe en ningún sitio. */
  demo: boolean;
  ajustes: Ajustes;
  onAjustes: (ajustes: Ajustes) => void;
  onSalir: () => void;
  /** Cómo se llama esto, para que la pestaña del navegador lo diga. */
  onTitulo: (titulo: string | null) => void;
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
  /*
   * El modo escritura se guarda en los ajustes, no en un estado local: quien
   * escribe así lo quiere SIEMPRE, y volver a pulsarlo cada vez que abre un
   * libro es exactamente el tipo de fricción que este modo viene a quitar.
   */
  const escribiendoSolo = ajustes.escritura;
  const [barraAsomada, setBarraAsomada] = useState(false);
  const [aPantalla, setAPantalla] = useState(enPantallaCompleta);
  /** Dónde se ha pedido el menú del botón derecho, o null si no hay ninguno. */
  const [menuTexto, setMenuTexto] = useState<SitioMenu | null>(null);

  const area = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const temporizador = useRef<number | null>(null);
  const ultimoGuardado = useRef("");
  /** Cuándo se abrió este libro: es el cronómetro de la sesión. */
  const desde = useRef(Date.now());
  /** Estamos dentro de una edición nuestra: no reentrar en la tipografía. */
  const aplicando = useRef(false);
  /** El texto del fotograma anterior, para saber si esto ha sido teclear. */
  const cuerpoPrevio = useRef("");
  /** El reloj del borrador, que escribe como mucho una vez cada tanto. */
  const relojBorrador = useRef<number | null>(null);

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
      /*
       * El cinturón de seguridad, si se usó.
       *
       * Un borrador solo existe cuando la pestaña se cerró (o el móvil mató la
       * aplicación) antes de que el guardado confirmara. Si lo hay y no coincide
       * con lo que se acaba de abrir, gana el borrador: es literalmente lo
       * último que escribió esta persona, y perderlo por no preguntar sería
       * exactamente el fallo que el borrador viene a evitar.
       */
      const borrador = demo ? null : leerBorrador(slug);
      const recuperado = borrador && borrador.fichero !== fichero ? borrador.fichero : null;
      const partido = descomponer(recuperado ?? fichero);
      setMeta(partido.meta);
      setCuerpo(partido.cuerpo);
      ultimoGuardado.current = fichero;
      setEstado(recuperado ? "escribiendo" : "limpio");
      if (recuperado) {
        avisar("Recuperado lo último que escribiste: no había llegado a guardarse.");
      }
      marcarArranque(slug, contarPalabras(partido.cuerpo));
      onTitulo(partido.meta.titulo);
    })();
    return () => {
      vivo = false;
    };
  }, [slug, demo, onSalir, onTitulo]);

  /* ── Derivados ───────────────────────────────────────────────────────────── */

  /*
   * TODO LO CARO VA CON EL TEXTO DIFERIDO, Y ESTO ES LO QUE QUITA EL TIRÓN.
   *
   * En cada tecla se estaba volviendo a partir la novela en bloques, a contar
   * sus palabras y sus caracteres, a recalcular los capítulos y a recomponer la
   * página de al lado. Con un libro de verdad eso son varios milisegundos por
   * pulsación y se nota en los dedos: escribes rápido y la letra llega tarde.
   *
   * `useDeferredValue` deja que la tecla se pinte primero, y `useReposo` espera
   * además a que se levante la vista del teclado — porque «cuando React tenga
   * un hueco» incluye el hueco que hay entre dos teclas, y ahí se colaba una
   * recomposición de la novela entera cada pocas pulsaciones. La página
   * compuesta y los gadgets van una fracción de segundo por detrás, que es
   * exactamente donde deben ir: son cosas que se miran de reojo, no mientras se
   * teclea.
   *
   * El espejo del manuscrito NO va aquí: ese tiene que ser exacto o el cursor
   * se despega de las letras. De su coste se encarga él, línea a línea.
   */
  /* La espera crece con el libro: en un cuento de dos mil palabras las cuentas
     pueden ir casi pegadas a la tecla, y en una novela de ciento cuarenta mil
     letras recomponer la página cuesta un cuarto de segundo y hay que hacerlo
     cuando de verdad se ha parado. El techo evita que se queden congeladas. */
  const largo = cuerpo.length > 60_000;
  const cuerpoTranquilo = useReposo(
    useDeferredValue(cuerpo),
    largo ? 600 : 220,
    largo ? 4000 : 1500,
  );
  const bloques = useMemo(() => partirEnBloques(cuerpoTranquilo), [cuerpoTranquilo]);
  const capitulos = useMemo(() => capitulosDe(bloques), [bloques]);
  const palabras = useMemo(() => contarPalabras(cuerpoTranquilo), [cuerpoTranquilo]);
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
      /* Confirmado en algún sitio duradero: el cinturón ya no hace falta, y
         dejarlo puesto haría que la próxima apertura creyera que se perdió
         algo. */
      olvidarBorrador(slug);
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
    void salirDePantallaCompleta();
    onSalir();
  }, [meta, cuerpo, guardar, onSalir]);

  /* ── Modo escritura, ahora con pantalla completa de verdad ───────────────── */

  /**
   * Entrar y salir del modo escritura.
   *
   * Lo que faltaba: además de esconder la aplicación, esconder el navegador.
   * Su encargo era literal —«solo saldrá la web, nada del navegador»— y el modo
   * anterior dejaba arriba la barra de direcciones, las pestañas y los
   * marcadores, que es la mitad del ruido.
   *
   * Pedir pantalla completa SOLO se puede dentro de un gesto de la persona, así
   * que esto se llama desde el botón y desde la tecla, nunca desde un efecto. Si
   * el navegador dice que no —iOS, una política de la máquina de clase— el modo
   * escritura entra igual: se pierde el marco escondido, no el modo.
   */
  const ponerEscritura = useCallback(
    (quiero: boolean) => {
      onAjustes({ ...ajustes, escritura: quiero });
      if (quiero) {
        if (ajustes.pantallaCompleta) {
          void pedirPantallaCompleta();
        }
      } else {
        void salirDePantallaCompleta();
      }
    },
    [ajustes, onAjustes],
  );

  /*
   * Que salirse de pantalla completa por su cuenta —Esc, F11, el botón del
   * navegador— apague también el modo escritura. Si no, se queda uno con la
   * aplicación escondida y el marco del navegador de vuelta, sin entender qué
   * ha pasado ni cómo se deshace.
   */
  useEffect(
    () =>
      alCambiarPantalla(() => {
        const ahora = enPantallaCompleta();
        setAPantalla(ahora);
        if (!ahora && ajustes.escritura && ajustes.pantallaCompleta) {
          onAjustes({ ...ajustes, escritura: false });
        }
      }),
    [ajustes, onAjustes],
  );

  /*
   * Al abrir un libro con el modo escritura ya guardado, se intenta la pantalla
   * completa una vez. Normalmente funciona: el clic que abrió el libro sigue
   * contando como gesto durante unos segundos. Si no cuela, no pasa nada — el
   * botón de expandir sigue ahí.
   */
  useEffect(() => {
    if (ajustes.escritura && ajustes.pantallaCompleta && !enPantallaCompleta()) {
      void pedirPantallaCompleta().then(setAPantalla);
    }
    // Solo al abrir: si se repitiera, cada cambio de ajuste pediría pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* F11 en cualquier parte del taller: entrar y salir del modo escritura. */
  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === "F11" && !evento.ctrlKey && !evento.altKey) {
        evento.preventDefault();
        ponerEscritura(!ajustes.escritura);
      }
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [ajustes.escritura, ponerEscritura]);

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

  /*
   * Guardar al esconder la pestaña, sin esperar al temporizador.
   *
   * En el móvil esto no es un detalle: cambiar de aplicación puede matar la
   * pestaña, y `beforeunload` allí no se dispara. `visibilitychange` es el
   * único aviso fiable que da un teléfono, así que es donde hay que soltar el
   * texto —al borrador de inmediato, que es síncrono, y al guardado de verdad,
   * que puede que llegue.
   */
  useEffect(() => {
    if (demo) {
      return;
    }
    const alEsconder = () => {
      if (document.visibilityState !== "hidden" || !meta) {
        return;
      }
      guardarBorrador(slug, componer(meta, cuerpo));
      void guardar(meta, cuerpo);
    };
    document.addEventListener("visibilitychange", alEsconder);
    window.addEventListener("pagehide", alEsconder);
    return () => {
      document.removeEventListener("visibilitychange", alEsconder);
      window.removeEventListener("pagehide", alEsconder);
    };
  }, [meta, cuerpo, slug, demo, guardar]);

  /*
   * Lo que otro dispositivo haya escrito en este mismo libro.
   *
   * La sincronización de fondo (`datos/latido.ts`) funde y avisa; aquí se
   * recoge SOLO si no hay nada sin guardar en pantalla. Con el manuscrito
   * tocado no se toca una letra: se avisa y se deja decidir. Machacar el
   * párrafo que alguien está escribiendo porque llegó una versión de hace un
   * minuto sería exactamente la clase de cosa que hace desconfiar de un
   * programa de escribir.
   */
  useEffect(() => {
    if (demo) {
      return;
    }
    return alCambiarBiblioteca(() => {
      const fuera = leerLibroDeCache(slug);
      if (!fuera || fuera.contenido === ultimoGuardado.current) {
        return;
      }
      const limpio = estado === "limpio" || estado === "guardado";
      if (!limpio) {
        avisar("Hay una versión más nueva de este libro en otro dispositivo.", "error");
        return;
      }
      const partido = descomponer(fuera.contenido);
      setMeta(partido.meta);
      setCuerpo(partido.cuerpo);
      ultimoGuardado.current = fuera.contenido;
      setEstado("limpio");
      avisar("Actualizado con lo escrito en otro dispositivo.");
    });
  }, [slug, demo, estado]);

  /* ── Editar ──────────────────────────────────────────────────────────────── */

  /**
   * Aplicar una edición de la aplicación al manuscrito.
   *
   * SIEMPRE se intenta primero por la vía del navegador (`aplicarConDeshacer`),
   * porque es la única que conserva Ctrl+Z. Poner el texto por estado de React
   * es sustituir el contenido entero, y ante eso el navegador tira su pila de
   * deshacer: bastaba con que la tipografía automática convirtiera unos puntos
   * suspensivos para que se perdiera todo lo deshacible del último rato. Ver
   * `ui/area.ts`.
   *
   * El camino por estado sigue estando de reserva, para el navegador que un día
   * retire `execCommand`. Entonces se pierde el deshacer de ese paso; nunca el
   * texto.
   */
  const aplicar = useCallback((edicion: Edicion) => {
    const nodo = area.current;
    /* La inserción dispara un `input`, que vuelve a entrar por `alEscribir`.
       Esta marca es la que impide que la tipografía automática se dispare
       encima de una edición que ya es nuestra. */
    aplicando.current = true;
    const hecho = nodo ? aplicarConDeshacer(nodo, edicion) : false;
    aplicando.current = false;
    if (hecho) {
      // El evento `input` que dispara la inserción ya ha pasado por `alEscribir`
      // con el texto puesto; aquí solo queda dejar el cursor donde toca.
      setCursor(edicion.desde);
      return;
    }
    setCuerpo(edicion.texto);
    setEstado("escribiendo");
    setCursor(edicion.desde);
    requestAnimationFrame(() => {
      const suelto = area.current;
      if (suelto) {
        suelto.focus();
        suelto.setSelectionRange(edicion.desde, edicion.hasta);
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
  const subtitulo = () => aplicar(alternarTitulo(cuerpo, area.current?.selectionStart ?? 0, 2));
  const escena = () => aplicar(nuevaEscena(cuerpo, area.current?.selectionStart ?? 0));

  /* ── El menú del botón derecho ───────────────────────────────────────────── */

  /**
   * Cortar y copiar por la vía del navegador.
   *
   * `execCommand` sigue siendo lo único que copia sin pedir permisos ni abrir
   * un aviso, y exige que el campo tenga el foco con su selección puesta — que
   * la tiene, porque pulsar en el menú no se la quita a un textarea.
   */
  const alPortapapeles = (cortando: boolean) => {
    const nodo = area.current;
    if (!nodo) {
      return;
    }
    nodo.focus();
    try {
      if (!document.execCommand(cortando ? "cut" : "copy")) {
        throw new Error("no");
      }
    } catch {
      avisar(`Usa Ctrl+${cortando ? "X" : "C"}: el navegador no deja hacerlo desde aquí.`, "error");
    }
  };

  const pegar = async () => {
    const nodo = area.current;
    if (!nodo) {
      return;
    }
    try {
      const texto = await navigator.clipboard.readText();
      if (!texto) {
        return;
      }
      const valor = nodo.value;
      const desde = nodo.selectionStart;
      const caret = desde + texto.length;
      aplicar({
        texto: valor.slice(0, desde) + texto + valor.slice(nodo.selectionEnd),
        desde: caret,
        hasta: caret,
      });
    } catch {
      /* Leer el portapapeles necesita un permiso que el navegador puede negar
         —y en Firefox sencillamente no existe—. Se dice cómo hacerlo a mano en
         lugar de dejar un botón que no hace nada. */
      avisar("Usa Ctrl+V: el navegador no deja leer el portapapeles desde aquí.", "error");
    }
  };

  const accionesTexto: AccionTexto[] = [
    { clave: "b", nombre: "Negrita", icono: "negrita", atajo: "Ctrl+B", hacer: negrita },
    { clave: "i", nombre: "Cursiva", icono: "cursiva", atajo: "Ctrl+I", hacer: cursiva },
    {
      clave: "cap",
      nombre: "Convertir en capítulo",
      icono: "capitulo",
      atajo: "Ctrl+1",
      corte: true,
      hacer: capitulo,
    },
    {
      clave: "sub",
      nombre: "Convertir en escena",
      icono: "capitulos",
      atajo: "Ctrl+2",
      hacer: subtitulo,
    },
    {
      clave: "esc",
      nombre: "Separar escena aquí",
      icono: "escena",
      atajo: "Ctrl+↵",
      hacer: escena,
    },
    {
      clave: "cortar",
      nombre: "Cortar",
      icono: "papelera",
      atajo: "Ctrl+X",
      corte: true,
      hacer: () => alPortapapeles(true),
    },
    {
      clave: "copiar",
      nombre: "Copiar",
      icono: "copiar",
      atajo: "Ctrl+C",
      hacer: () => alPortapapeles(false),
    },
    {
      clave: "pegar",
      nombre: "Pegar",
      icono: "descargar",
      atajo: "Ctrl+V",
      hacer: () => void pegar(),
    },
  ];

  /**
   * Abrir el menú propio, PERO SOLO CON ALGO SELECCIONADO.
   *
   * Sin selección se deja pasar el del navegador, que es donde vive el
   * corrector: pinchar una palabra subrayada en rojo y que te proponga la
   * corrección con el diccionario del sistema vale más que cualquier menú que
   * se pueda escribir aquí.
   */
  const alBotonDerecho = (evento: ReactMouseEvent<HTMLTextAreaElement>) => {
    const nodo = evento.currentTarget;
    if (nodo.selectionStart === nodo.selectionEnd) {
      return;
    }
    evento.preventDefault();
    setMenuTexto({ x: evento.clientX, y: evento.clientY });
  };

  const alTeclear = (evento: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    const nodo = evento.currentTarget;
    const mando = evento.ctrlKey || evento.metaKey;

    /*
     * El golpe de la tecla.
     *
     * Va en `keydown` y no en el cambio de texto porque aquí se sabe QUÉ tecla
     * es: el retorno y el espacio suenan más fuerte, como en una máquina de
     * verdad. Se descartan las teclas que no escriben nada —Shift, las flechas,
     * Alt— porque un teclado tampoco suena cuando mueves el cursor.
     */
    if (ajustes.sonido !== "ninguno" && !mando && !evento.altKey) {
      const escribe = evento.key.length === 1;
      const especial = evento.key === "Enter" || evento.key === "Backspace" || evento.key === "Tab";
      if (escribe || especial) {
        sonarTecla(
          ajustes.sonido,
          ajustes.volumenSonido,
          evento.key === "Enter" ? 1.5 : evento.key === " " ? 1.2 : 1,
        );
      }
    }

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
      /* El cuerpo de la letra con Ctrl y +/−, que es el atajo que todo el mundo
         prueba primero. Se le quita al navegador su zoom, que aquí hace lo
         mismo pero peor: agranda TODA la aplicación, barra incluida. */
      if (tecla === "+" || tecla === "=" || tecla === "-" || tecla === "_") {
        evento.preventDefault();
        cuerpoLetra(tecla === "-" || tecla === "_" ? -1 : 1);
        return;
      }
      /* La medida, con las flechas. Con Shift para no pisar el salto de palabra
         de Ctrl+← y Ctrl+→, que en un editor de texto es sagrado. */
      if (evento.shiftKey && (evento.key === "ArrowRight" || evento.key === "ArrowLeft")) {
        evento.preventDefault();
        medida(evento.key === "ArrowRight" ? 1 : -1);
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

    if (evento.key === "Escape" && escribiendoSolo) {
      ponerEscritura(false);
    }
  };

  /**
   * Ha cambiado el texto.
   *
   * `tipo` es el `inputType` del evento, y decide si toca mirar la tipografía.
   * Solo se mira cuando se acaba de TECLEAR: si se mirara siempre, deshacer
   * unos puntos suspensivos los volvería a convertir en el acto —Ctrl+Z y el
   * texto vuelve solo, que es de las cosas que peor sientan— y pegar un texto
   * de fuera lo reescribiría sin que nadie lo haya pedido.
   */
  const alEscribir = (valor: string, posicion: number, tipo?: string) => {
    setEstado("escribiendo");
    setCuerpo(valor);
    setCursor(posicion);
    const tecleado = tipo === undefined || tipo === "insertText";
    if (!tecleado || aplicando.current) {
      return;
    }
    if (ajustes.tipografia) {
      const arreglo = tipografia(valor, posicion);
      if (arreglo) {
        aplicar(arreglo);
        return;
      }
    }
    /*
     * El corrector automático, por el mismo camino que la tipografía: al cerrar
     * la palabra y solo sobre lo que se acaba de escribir. Va DESPUÉS de la
     * tipografía porque las dos pueden dispararse con el mismo espacio y solo
     * puede aplicarse una edición por pulsación — y las comillas mandan, que
     * cambian un carácter que se acaba de teclear.
     */
    if (ajustes.corrector === "corregir") {
      const arreglo = corregirAlTerminar(valor, posicion) ?? arreglarMayusculaDoble(valor, posicion);
      if (arreglo) {
        aplicar({ texto: arreglo.texto, desde: arreglo.cursor, hasta: arreglo.cursor });
      }
    }
  };

  /*
   * El alto del campo, SOLO para el manuscrito que ya no tiene espejo.
   *
   * Con espejo no hay nada que hacer: va en el flujo y él da la altura a la
   * pila (ver `app.css`). Sin él hay que medir a mano —`height:auto`, leer
   * `scrollHeight`, devolver la altura—, que son dos recálculos de diseño
   * forzados por pulsación. Es caro, y por eso solo pasa arriba de doscientas
   * mil letras; medido, sigue siendo más barato que montar un segundo bloque
   * de ese tamaño solo para medirlo.
   */
  useLayoutEffect(() => {
    const nodo = area.current;
    if (!nodo || cuerpo.length <= TOPE_RESALTADO) {
      return;
    }
    nodo.style.height = "auto";
    nodo.style.height = `${nodo.scrollHeight}px`;
  }, [cuerpo, ajustes.tamanoEditor, ajustes.anchoEditor, ajustes.interlineadoEditor]);

  /*
   * QUE LA LÍNEA QUE ESCRIBES ESTÉ SIEMPRE DONDE SE LEE.
   *
   * Dos comportamientos con la misma medida, que es la posición real del cursor
   * en píxeles (`altoDelCursor`). La cuenta de antes contaba saltos de línea, o
   * sea párrafos: con una medida de sesenta y ocho caracteres un párrafo son
   * ocho o diez líneas en pantalla, así que el «centro» se equivocaba por media
   * pantalla y el texto pegaba tirones.
   *
   *   · con «escribir en el centro», el cursor se queda clavado a media altura,
   *     como el rodillo de una máquina de escribir;
   *   · sin él basta con que no se acerque a los bordes: se corrige solo cuando
   *     cae en el quinto de arriba o en el cuarto de abajo, y entonces se
   *     recoloca sin animación. El desplazamiento suave, aquí, era justo lo que
   *     hacía que el texto pareciese flotar mientras se teclea.
   *
   * Solo se mueve la vista cuando ha cambiado el TEXTO. Si se moviera también
   * al mover el cursor, hacer clic cerca de un borde daría un salto que nadie
   * ha pedido.
   */
  useLayoutEffect(() => {
    const nodo = area.current;
    const caja = scroller.current;
    const tecleado = cuerpo !== cuerpoPrevio.current;
    cuerpoPrevio.current = cuerpo;
    if (!nodo || !caja || document.activeElement !== nodo) {
      return;
    }
    if (!ajustes.maquina && !tecleado) {
      return;
    }

    const colocar = () => {
      const { arriba, alto } = altoDelCursor(nodo);
      const donde = nodo.getBoundingClientRect().top - caja.getBoundingClientRect().top + arriba;
      const ventana = caja.clientHeight;

      let mover = 0;
      if (ajustes.maquina) {
        mover = donde - (ventana - alto) / 2;
      } else {
        const techo = ventana * 0.2;
        const suelo = ventana * 0.75;
        if (donde + alto > suelo) {
          mover = donde + alto - suelo;
        } else if (donde < techo) {
          mover = donde - techo;
        }
      }
      if (Math.abs(mover) > 1) {
        caja.scrollTop = Math.max(0, caja.scrollTop + mover);
      }
    };

    /*
     * Se coloca DOS VECES, y la segunda es la que cuenta.
     *
     * El navegador tiene su propia idea de dónde debe quedar el cursor: lo
     * arrastra al borde de abajo, lo justo para que se vea, y lo hace DESPUÉS
     * de este efecto. Colocando solo aquí, lo nuestro se perdía y la línea que
     * se escribe seguía pegada al canto inferior de la pantalla, que era
     * exactamente la incomodidad que esto viene a quitar.
     *
     * La primera pasada evita el parpadeo en los casos en que el navegador no
     * toca nada; la del fotograma siguiente corrige cuando sí lo ha tocado.
     */
    colocar();
    const cuadro = requestAnimationFrame(colocar);
    return () => cancelAnimationFrame(cuadro);
  }, [cursor, cuerpo, ajustes.maquina, ajustes.tamanoEditor, ajustes.interlineadoEditor]);

  /*
   * El cinturón de seguridad: el archivo entero en este navegador, sin red.
   *
   * Como mucho una vez cada 700 ms —escribir no puede pagar un `JSON.stringify`
   * de la novela por letra— y siempre al esconder la pestaña, que es cuando el
   * móvil se lleva la aplicación por delante sin avisar. Ver `datos/borrador.ts`.
   */
  useEffect(() => {
    if (demo || !meta || estado === "abriendo" || relojBorrador.current !== null) {
      return;
    }
    relojBorrador.current = window.setTimeout(() => {
      relojBorrador.current = null;
      guardarBorrador(slug, componer(meta, cuerpo));
    }, 700);
  }, [cuerpo, meta, slug, demo, estado]);

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
  const previaVisible = ajustes.previa !== "oculta" && !escribiendoSolo;
  const altoPagina = alLado ? undefined : ajustes.previaTamano;

  const tipoEditor = {
    fontFamily: pilaDe(ajustes.fuenteEditor),
    fontSize: `${ajustes.tamanoEditor}px`,
    lineHeight: ajustes.interlineadoEditor,
  };
  const resaltado = cuerpo.length <= TOPE_RESALTADO;

  const ponerPrevia = (sitio: SitioPrevia) => onAjustes({ ...ajustes, previa: sitio });

  /**
   * LA MEDIDA, sin salir a Ajustes.
   *
   * «Medida» es como se llama en tipografía al ancho de la columna de texto, y
   * se cuenta en caracteres porque es lo que de verdad importa: lo cómodo de
   * leer está entre 45 y 75, y ahí es donde el ojo encuentra el principio de la
   * línea siguiente sin buscarlo. Pero eso es una media — depende de la letra,
   * del tamaño y de la pantalla, así que es de las cosas que se ajustan
   * escribiendo, probando, no en un panel de ajustes al que hay que ir.
   *
   * De cuatro en cuatro: de uno en uno no se nota y no acabas nunca.
   */
  /** El cuerpo de la letra del editor, de punto en punto. */
  const cuerpoLetra = (pasos: number) =>
    onAjustes({
      ...ajustes,
      tamanoEditor: Math.min(34, Math.max(12, ajustes.tamanoEditor + pasos)),
    });

  const medida = (pasos: number) =>
    onAjustes({
      ...ajustes,
      anchoEditor: Math.min(110, Math.max(34, ajustes.anchoEditor + pasos * 4)),
    });

  const accionesEscribir: Accion[] = [
    { clave: "b", nombre: "Negrita", icono: "negrita", atajo: "Ctrl+B", hacer: negrita },
    { clave: "i", nombre: "Cursiva", icono: "cursiva", atajo: "Ctrl+I", hacer: cursiva },
    { clave: "cap", nombre: "Convertir en capítulo", icono: "capitulo", atajo: "Ctrl+1", hacer: capitulo },
    { clave: "esc", nombre: "Separar escena", icono: "escena", atajo: "Ctrl+↵", hacer: escena },
    {
      clave: "foco",
      nombre: "Modo foco",
      icono: "foco",
      ayuda:
        "Apaga todo el texto menos el párrafo en el que estás escribiendo. Lo demás sigue ahí, solo que en gris, para que la vista no se te vaya a lo que ya has escrito.",
      puesto: ajustes.foco,
      hacer: () => onAjustes({ ...ajustes, foco: !ajustes.foco }),
    },
    {
      clave: "maquina",
      nombre: "Escribir en el centro",
      icono: "flecha",
      ayuda:
        "La línea que escribes se queda siempre a media pantalla en lugar de bajar hasta el borde, como el rodillo de una máquina de escribir.",
      puesto: ajustes.maquina,
      hacer: () => onAjustes({ ...ajustes, maquina: !ajustes.maquina }),
    },
    {
      clave: "corrector",
      nombre: `Corrector: ${NOMBRE_CORRECTOR[ajustes.corrector]}`,
      icono: "guardado",
      ayuda:
        "Tres modos, y el botón los recorre: SUGERIR subraya en rojo y propone la corrección con el botón derecho, usando el diccionario de tu navegador. CORREGIR además arregla solo las faltas que no tienen dos lecturas —«tambien» por «también»— al terminar la palabra; nunca toca «mas», «si» ni «tu», que son dos palabras distintas según lleven tilde. NADA es nada: escribes tú y ya.",
      puesto: ajustes.corrector !== "ninguno",
      hacer: () => onAjustes({ ...ajustes, corrector: SIGUIENTE_CORRECTOR[ajustes.corrector] }),
    },
    {
      clave: "tipografia",
      nombre: "Comillas y rayas automáticas",
      icono: "cursiva",
      ayuda:
        "Escribe tres puntos y salen puntos suspensivos de verdad; dos guiones, una raya de diálogo; << y >>, comillas españolas.",
      puesto: ajustes.tipografia,
      hacer: () => onAjustes({ ...ajustes, tipografia: !ajustes.tipografia }),
    },
  ];

  /**
   * LA LETRA CON LA QUE ESCRIBES, aquí y no en Ajustes.
   *
   * Estaba en Ajustes desde siempre, en la estantería — o sea, en la pantalla
   * de la que sales para escribir. Su frase fue «no veo cómo hacerlo», y con
   * razón: elegir con qué letra te sientes cómodo escribiendo es algo que se
   * decide ESCRIBIENDO, mirando tu propio párrafo, no dos pantallas atrás.
   *
   * Ojo con lo que NO es: esta es la letra del EDITOR, la de la pantalla. La
   * del libro impreso se elige en Diseño y viaja dentro del archivo. Son dos
   * decisiones distintas a propósito — se puede escribir en una sans cómoda de
   * pantalla un libro que se imprime en Garamond.
   */
  const accionesLetra: Accion[] = [
    ...FUENTES.map((fuente) => ({
      clave: `f-${fuente.key}`,
      nombre: fuente.name,
      icono: "cursiva" as const,
      ayuda: fuente.hint,
      /* Cada nombre, escrito con su propia letra: así se elige mirando en vez
         de leyendo, igual que en Diseño › Letra. */
      estilo: { fontFamily: fuente.stack, fontSize: "0.95rem" },
      puesto: ajustes.fuenteEditor === fuente.key,
      hacer: () => onAjustes({ ...ajustes, fuenteEditor: fuente.key }),
    })),
    {
      clave: "mas-grande",
      nombre: "Más grande",
      icono: "mas",
      atajo: "Ctrl++",
      corte: true,
      hacer: () => cuerpoLetra(1),
    },
    {
      clave: "mas-pequena",
      nombre: "Más pequeña",
      icono: "escena",
      atajo: "Ctrl+−",
      hacer: () => cuerpoLetra(-1),
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
      ayuda:
        "La franja con las cuentas —palabras, lo escrito hoy, la página, el cronómetro—. Se elige cuáles salen en Ajustes.",
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
    {
      clave: "ancho-mas",
      nombre: "Texto más ancho",
      icono: "expandir",
      atajo: "Ctrl+⇧+→",
      corte: true,
      ayuda:
        "Ensancha la columna de texto. Se mide en caracteres por línea, que es lo que decide si el ojo encuentra la línea siguiente sin buscarla: lo cómodo suele estar entre 45 y 75.",
      hacer: () => medida(1),
    },
    {
      clave: "ancho-menos",
      nombre: "Texto más estrecho",
      icono: "encoger",
      atajo: "Ctrl+⇧+←",
      hacer: () => medida(-1),
    },
    { clave: "leer", nombre: "Leer el libro entero", icono: "libro", hacer: () => setLeyendo(true) },
    {
      clave: "escritura",
      nombre: "Modo escritura",
      icono: "expandir",
      atajo: "F11 · Esc para salir",
      ayuda:
        "Se va todo: la barra, la página compuesta, los gadgets, el índice — y el propio navegador, que pasa a pantalla completa. Queda tu texto y nada más. La barra vuelve sola si acercas el ratón al borde de arriba, y Esc lo deshace.",
      hacer: () => ponerEscritura(true),
    },
  ];

  const datosGadgets = {
    palabras,
    caracteres: contarCaracteres(cuerpo),
    parrafos: bloques.filter((bloque) => bloque.nivel === 0).length,
    capitulos: capitulos.length,
    escenas: bloques.filter((bloque) => bloque.nivel === -1).length,
    hoy,
    meta: meta.meta ?? 0,
    pagina,
    paginas,
    capitulo: capituloActual?.titulo ?? null,
    palabrasCapitulo: capituloActual?.palabras ?? 0,
    desde: desde.current,
  };

  const gadgets =
    ajustes.sitioGadgets !== "oculta" && !escribiendoSolo ? (
      <BarraGadgets
        activos={ajustes.gadgets}
        datos={datosGadgets}
        sitio={ajustes.sitioGadgets}
      />
    ) : null;

  return (
    <div className={`taller pantalla pantalla--taller${escribiendoSolo ? " taller--escritura" : ""}`}>
      {(!escribiendoSolo || barraAsomada) && (
        <div className={`barra${escribiendoSolo ? " barra--asomada" : ""}`}>
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
            <MenuBarra etiqueta="Letra" icono="cursiva" acciones={accionesLetra} />
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
            {/* Suelto y no dentro del menú: es el botón que más se pulsa de
                todos, y esconderlo detrás de «Ver» sería enterrarlo. */}
            <BotonBarra
              nombre={
                ajustes.pantallaCompleta
                  ? "Modo escritura a pantalla completa (F11)"
                  : "Modo escritura (F11)"
              }
              icono="expandir"
              soloIcono
              onClick={() => ponerEscritura(true)}
            />
          </GrupoBarra>
        </div>
      )}

      {ajustes.sitioGadgets === "arriba" && gadgets}

      <div className={`cuerpo cuerpo--${alLado ? "lado" : "abajo"}`}>
        {ajustes.capitulos && !escribiendoSolo && (
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
            cuerpo={cuerpoTranquilo}
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
            {/* Con espejo, el espejo va en el flujo y es él quien da el alto a
                la pila; el campo se estira encima y no hace falta medir nada.
                Sin espejo la pila es normal y el alto lo pone el efecto de
                arriba, que es el camino caro y por eso el excepcional. */}
            <div className={`manuscrito__pila${resaltado ? " manuscrito__pila--espejo" : ""}`}>
              {resaltado && (
                <Resaltado valor={cuerpo} cursor={cursor} foco={ajustes.foco} estilo={tipoEditor} />
              )}
              <textarea
                ref={area}
                className="manuscrito__area"
                value={cuerpo}
                spellCheck={ajustes.corrector !== "ninguno"}
                lang="es"
                placeholder="Empieza por la primera frase. Lo demás viene detrás."
                style={tipoEditor}
                onChange={(evento) =>
                  alEscribir(
                    evento.target.value,
                    evento.target.selectionStart,
                    (evento.nativeEvent as InputEvent).inputType,
                  )
                }
                onKeyDown={alTeclear}
                onContextMenu={alBotonDerecho}
                onSelect={(evento) => setCursor(evento.currentTarget.selectionStart)}
                onClick={(evento) => setCursor(evento.currentTarget.selectionStart)}
              />
            </div>
          </div>
        </div>

        {previaVisible && ajustes.previa !== "izquierda" && (
          <Previa
            meta={meta}
            cuerpo={cuerpoTranquilo}
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
              onTitulo(siguiente.titulo);
            }}
            onCerrar={() => setPanel("ninguno")}
          />
        )}

        {panel === "exportar" && (
          <Exportar meta={meta} cuerpo={cuerpo} slug={slug} onCerrar={() => setPanel("ninguno")} />
        )}
      </div>

      {ajustes.sitioGadgets === "abajo" && gadgets}

      {escribiendoSolo && (
        <>
          {/*
            * Una franja invisible pegada al techo.
            *
            * Es lo que hace que la barra vuelva: acercas el ratón arriba y
            * aparece; la apartas y se va. Sin esto, el modo escritura sería una
            * trampa — no habría forma de volver salvo adivinando que Esc sirve.
            */}
          <div
            className="asomadero"
            onPointerEnter={() => setBarraAsomada(true)}
            aria-hidden="true"
          />
          {barraAsomada && (
            <div
              className="asomadero asomadero--fuera"
              onPointerEnter={() => setBarraAsomada(false)}
              aria-hidden="true"
            />
          )}
          {/*
            * Si la pantalla completa no llegó a concederse —al abrir un libro
            * con el modo ya guardado, o en un navegador que la niega— se ofrece
            * aquí, que es donde se está mirando. Sin esto el ajuste diría una
            * cosa y la pantalla otra.
            */}
          {!aPantalla && ajustes.pantallaCompleta && sePuedePantallaCompleta() && (
            <button
              type="button"
              className="boton boton--desnudo salir-pantalla salir-pantalla--ganar"
              onClick={() => void pedirPantallaCompleta().then(setAPantalla)}
              title="Pantalla completa (F11)"
              aria-label="Pantalla completa"
            >
              <Icono nombre="expandir" />
            </button>
          )}
          <button
            type="button"
            className="boton boton--desnudo salir-pantalla"
            onClick={() => ponerEscritura(false)}
            title="Salir del modo escritura (Esc)"
            aria-label="Salir del modo escritura"
          >
            <Icono nombre="encoger" />
          </button>
        </>
      )}

      {menuTexto && (
        <MenuTexto
          sitio={menuTexto}
          cabecera={<PalabrasSeleccionadas area={area.current} />}
          acciones={accionesTexto}
          onCerrar={() => setMenuTexto(null)}
        />
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

/**
 * Cuánto hay seleccionado, arriba del menú.
 *
 * Es la pregunta que uno se hace justo cuando acaba de seleccionar un trozo —«¿y
 * esto cuánto es?»— y aquí sale gratis, porque la selección ya está a mano.
 */
function PalabrasSeleccionadas({ area }: { area: HTMLTextAreaElement | null }) {
  if (!area) {
    return null;
  }
  const trozo = area.value.slice(area.selectionStart, area.selectionEnd);
  const palabras = contarPalabras(trozo);
  return (
    <>
      {palabras.toLocaleString("es-ES")} {palabras === 1 ? "palabra" : "palabras"} seleccionadas
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
