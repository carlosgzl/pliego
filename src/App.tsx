/**
 * Dos pantallas y el cableado entre ellas: la estantería y el taller.
 *
 * There is no router. A writing app has one place you are and one place you
 * came from, and a URL bar is one more thing between the writer and the page —
 * but the open book DOES go in the address hash, so a reload puts you back
 * where you were and a link to a manuscript is possible.
 *
 * Two levels of access, decided here and nowhere else: without a session the
 * app runs on a sample book and cannot reach his library or save; with one,
 * everything is unlocked. See `datos/sesion.ts` for what that does and does not
 * protect.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  alCambiarBiblioteca,
  borrarLibro,
  cargarCatalogo,
  catalogoDeCache,
  crearLibro,
  duplicarLibro,
  renombrarLibro,
  type Catalogo,
} from "@/datos/biblioteca";
import { guardarAjustes, leerAjustes, type Ajustes } from "@/datos/ajustes";
import { contarPalabras } from "@/nucleo/bloques";
import { libroDeMuestra, SLUG_MUESTRA } from "@/datos/muestra";
import { arrancarLatido, sincronizarYa } from "@/datos/latido";
import { alCambiarSesion, hayEntrado, revisarSesion, salir } from "@/datos/sesion";
import { aplicarAcento } from "@/ui/acento";
import { avisar, Avisos } from "@/ui/Avisos";
import { SelectorColor } from "@/ui/Pie";
import { Entrada } from "@/vistas/Entrada";
import { Inicio } from "@/vistas/Inicio";
import { PanelAjustes } from "@/vistas/PanelAjustes";
import { Taller } from "@/vistas/Taller";

function libroDeLaUrl(): string | null {
  const hash = decodeURIComponent(window.location.hash.replace(/^#\/?/, ""));
  return hash.length > 0 ? hash : null;
}

export function App() {
  const [ajustes, setAjustes] = useState<Ajustes>(leerAjustes);
  const [abierto, setAbierto] = useState<string | null>(libroDeLaUrl);
  /** El título del libro abierto, para la pestaña. Lo dice el taller. */
  const [tituloPestana, setTituloPestana] = useState<string | null>(null);
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ajustando, setAjustando] = useState(false);
  const [dentro, setDentro] = useState(hayEntrado);
  /* La puerta es lo PRIMERO que se ve. Quien pulsa «solo mirar» pasa como
     visita y se le da el libro de muestra; quien recarga la página vuelve a
     ver la puerta, que es lo que debe hacer una puerta. */
  const [visita, setVisita] = useState(false);

  /* ── Theme and accent ────────────────────────────────────────────────────── */

  /*
   * Qué tema hay puesto AHORA MISMO, resuelto.
   *
   * «sistema» no es un tema, es una pregunta, y hasta que no se le pregunta al
   * navegador no se sabe la respuesta. Hace falta guardarla porque el selector
   * de color tiene que enseñar el tono que va a salir de verdad: cada acento
   * lleva uno para papel y otro para fondo oscuro, y pintar siempre el claro
   * era exactamente lo que hacía que el círculo elegido y el color que aparecía
   * luego no coincidieran.
   */
  const [oscuro, setOscuro] = useState(false);

  useEffect(() => {
    const raiz = document.documentElement;
    const aplicar = () => {
      const oscuroDelSistema = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const tema =
        ajustes.tema === "sistema" ? (oscuroDelSistema ? "oscuro" : "claro") : ajustes.tema;
      raiz.dataset.tema = tema;
      setOscuro(tema === "oscuro");
      // The accent is repainted with the theme, not only when it changes: the
      // same blue that reads on paper disappears on charcoal, so each accent
      // carries a light pair and a dark one.
      aplicarAcento(ajustes.acento, tema === "oscuro");
    };
    aplicar();
    if (ajustes.tema !== "sistema") {
      return;
    }
    const consulta = window.matchMedia("(prefers-color-scheme: dark)");
    consulta.addEventListener("change", aplicar);
    return () => consulta.removeEventListener("change", aplicar);
  }, [ajustes.tema, ajustes.acento]);

  const cambiarAjustes = useCallback((siguiente: Ajustes) => {
    setAjustes(siguiente);
    guardarAjustes(siguiente);
  }, []);

  /*
   * EL NOMBRE DE LA PESTAÑA ES EL DEL LIBRO ABIERTO.
   *
   * Decía «Pliego — escribir libros» siempre, que es un eslogan: se lee una vez
   * y luego es ruido en una pestaña de dos centímetros. Con seis pestañas
   * abiertas, lo único que hace falta saber es CUÁL de ellas es la novela — así
   * que en la estantería pone «Pliego» y dentro de un libro pone el libro.
   */
  useEffect(() => {
    document.title = tituloPestana ?? "Pliego";
  }, [tituloPestana]);

  /* ── Session ─────────────────────────────────────────────────────────────── */

  useEffect(() => alCambiarSesion(() => setDentro(hayEntrado())), []);

  useEffect(() => {
    // A session signed with a secret that has since been rotated looks valid
    // here and is not; ask the server once on load.
    void revisarSesion().then((vale) => setDentro(vale));
  }, []);

  /* ── The shelf ───────────────────────────────────────────────────────────── */

  const muestra = useMemo(() => {
    const { meta, cuerpo } = libroDeMuestra();
    return {
      slug: SLUG_MUESTRA,
      meta,
      palabras: contarPalabras(cuerpo),
      actualizado: new Date().toISOString(),
    };
  }, []);

  const recargar = useCallback(async (callado = false) => {
    if (!hayEntrado()) {
      // Nothing is asked of the network for a visitor: no requests, no probing
      // of his machine, no half-second of spinner before an empty shelf.
      setCatalogo({
        libros: [muestra],
        via: "local",
        servidorVivo: false,
        nubeViva: false,
        cuentaViva: false,
      });
      setCargando(false);
      return;
    }
    /* Un refresco de fondo NO enciende el esqueleto: la estantería que ya
       está en pantalla es correcta, y hacerla parpadear cada tres minutos
       sería peor que no refrescar. */
    if (!callado) {
      setCargando(true);
    }
    try {
      setCatalogo(await cargarCatalogo());
    } catch {
      if (!callado) {
        avisar("No se ha podido leer la estantería.", "error");
      }
    } finally {
      setCargando(false);
    }
  }, [muestra]);

  useEffect(() => {
    void recargar();
  }, [recargar, dentro]);

  /*
   * El latido y su escucha.
   *
   * `arrancarLatido` es quien va a la red —al volver a la pestaña, al recuperar
   * la conexión y cada pocos minutos—; esto solo repinta cuando la biblioteca
   * de este navegador ha cambiado de verdad. Separarlo así evita el error
   * clásico: un `useEffect` que sincroniza y repinta y por tanto se vuelve a
   * disparar a sí mismo.
   */
  useEffect(() => {
    if (!dentro) {
      return;
    }
    const parar = arrancarLatido(setCatalogo);
    /* Repintar con lo que ya hay en este navegador, SIN volver a la red: quien
       ha ido a la red es el latido, y responderle con otra sincronización sería
       morderse la cola. */
    const dejar = alCambiarBiblioteca(() =>
      setCatalogo((previo) => (hayEntrado() ? catalogoDeCache(previo) : previo)),
    );
    return () => {
      parar();
      dejar();
    };
  }, [dentro]);

  /* ── Navigation ──────────────────────────────────────────────────────────── */

  const abrir = useCallback((slug: string | null) => {
    setAbierto(slug);
    const hash = slug ? `#/${encodeURIComponent(slug)}` : "#";
    if (window.location.hash !== hash) {
      window.history.pushState(null, "", hash);
    }
  }, []);

  useEffect(() => {
    const alVolver = () => setAbierto(libroDeLaUrl());
    window.addEventListener("popstate", alVolver);
    return () => window.removeEventListener("popstate", alVolver);
  }, []);

  const salirDelTaller = useCallback(() => {
    abrir(null);
    setTituloPestana(null);
    void recargar();
  }, [abrir, recargar]);

  /* ── Shelf actions. Every one of them needs a session. ───────────────────── */

  const conSesion = (accion: () => void) => {
    if (!dentro) {
      setVisita(false); // devuelve a la puerta: lo que iba a hacer necesita cuenta
      return;
    }
    accion();
  };

  const crear = async (titulo: string) => {
    try {
      abrir(await crearLibro(titulo));
    } catch {
      avisar("No se ha podido crear el libro.", "error");
    }
  };

  const duplicar = async (slug: string) => {
    const copia = await duplicarLibro(slug);
    if (copia) {
      avisar("Copia hecha.");
      void recargar();
    } else {
      avisar("No se ha podido duplicar.", "error");
    }
  };

  const renombrar = async (slug: string, nombre: string) => {
    if (await renombrarLibro(slug, nombre)) {
      avisar("Nombre cambiado.");
      void recargar();
    } else {
      avisar("No se ha podido cambiar el nombre.", "error");
    }
  };

  const borrar = async (slug: string) => {
    await borrarLibro(slug);
    avisar("Libro borrado. Queda una copia de rescate en Ajustes.");
    void recargar();
  };

  const enMuestra = abierto === SLUG_MUESTRA || (!dentro && abierto !== null);

  /* Sin sesión y sin haber pedido pasar de visita, lo único que hay es la
     puerta. Ni estantería, ni libro, ni una petición a la red. */
  if (!dentro && !visita) {
    return (
      <div className="app">
        <Entrada onEntrado={() => setDentro(true)} onVisita={() => setVisita(true)} />
        <Avisos />
      </div>
    );
  }

  return (
    <div className="app">
      {abierto ? (
        <Taller
          key={abierto}
          slug={abierto}
          demo={enMuestra}
          ajustes={ajustes}
          onAjustes={cambiarAjustes}
          onSalir={salirDelTaller}
          onTitulo={setTituloPestana}
          onEntrar={() => {
            abrir(null);
            setTituloPestana(null);
            setVisita(false);
          }}
        />
      ) : (
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <Inicio
            catalogo={catalogo}
            cargando={cargando}
            dentro={dentro}
            onAbrir={abrir}
            onCrear={(titulo) => conSesion(() => void crear(titulo))}
            onDuplicar={(slug) => conSesion(() => void duplicar(slug))}
            onRenombrar={(slug, nombre) => conSesion(() => void renombrar(slug, nombre))}
            onBorrar={(slug) => conSesion(() => void borrar(slug))}
            onAjustes={() => setAjustando(true)}
            onRecargar={() => void sincronizarYa(true).then(() => recargar(true))}
            onEntrar={() => setVisita(false)}
            onSalir={() => {
              salir();
              setVisita(false);
              avisar("Sesión cerrada.");
            }}
          />
          {ajustando && (
            <PanelAjustes
              ajustes={ajustes}
              dentro={dentro}
              onAjustes={cambiarAjustes}
              onCerrar={() => setAjustando(false)}
              onRecargar={() => void sincronizarYa(true).then(() => recargar(true))}
            />
          )}
          {/*
            * EL SELECTOR DE COLOR VIVE AQUÍ Y EN NINGÚN OTRO SITIO.
            *
            * Estaba colgado de la aplicación entera, así que aparecía también
            * en la puerta y encima del manuscrito. Elegir el color de la casa
            * es algo que se hace una vez y desde la estantería; tenerlo flotando
            * sobre el texto mientras se escribe es una cosa de colores en la
            * esquina de la vista, que es justo lo que el taller quita.
            */}
          <SelectorColor
            valor={ajustes.acento}
            oscuro={oscuro}
            onCambiar={(acento) => cambiarAjustes({ ...ajustes, acento })}
          />
        </div>
      )}
      <Avisos />
    </div>
  );
}
