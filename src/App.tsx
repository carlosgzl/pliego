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
  borrarLibro,
  cargarCatalogo,
  crearLibro,
  duplicarLibro,
  renombrarLibro,
  type Catalogo,
} from "@/datos/biblioteca";
import { guardarAjustes, leerAjustes, type Ajustes } from "@/datos/ajustes";
import { contarPalabras } from "@/nucleo/bloques";
import { libroDeMuestra, SLUG_MUESTRA } from "@/datos/muestra";
import { alCambiarSesion, hayEntrado, revisarSesion, salir } from "@/datos/sesion";
import { aplicarAcento } from "@/ui/acento";
import { avisar, Avisos } from "@/ui/Avisos";
import { Entrada } from "@/vistas/Entrada";
import { Estanteria } from "@/vistas/Estanteria";
import { PanelAjustes } from "@/vistas/PanelAjustes";
import { Taller } from "@/vistas/Taller";

function libroDeLaUrl(): string | null {
  const hash = decodeURIComponent(window.location.hash.replace(/^#\/?/, ""));
  return hash.length > 0 ? hash : null;
}

export function App() {
  const [ajustes, setAjustes] = useState<Ajustes>(leerAjustes);
  const [abierto, setAbierto] = useState<string | null>(libroDeLaUrl);
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ajustando, setAjustando] = useState(false);
  const [dentro, setDentro] = useState(hayEntrado);
  const [pidiendoEntrada, setPidiendoEntrada] = useState(false);

  /* ── Theme and accent ────────────────────────────────────────────────────── */

  useEffect(() => {
    const raiz = document.documentElement;
    const aplicar = () => {
      const oscuroDelSistema = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const tema =
        ajustes.tema === "sistema" ? (oscuroDelSistema ? "oscuro" : "claro") : ajustes.tema;
      raiz.dataset.tema = tema;
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

  const recargar = useCallback(async () => {
    if (!hayEntrado()) {
      // Nothing is asked of the network for a visitor: no requests, no probing
      // of his machine, no half-second of spinner before an empty shelf.
      setCatalogo({ libros: [muestra], via: "local", servidorVivo: false, nubeViva: false });
      setCargando(false);
      return;
    }
    setCargando(true);
    try {
      setCatalogo(await cargarCatalogo());
    } catch {
      avisar("No se ha podido leer la estantería.", "error");
    } finally {
      setCargando(false);
    }
  }, [muestra]);

  useEffect(() => {
    void recargar();
  }, [recargar, dentro]);

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
    void recargar();
  }, [abrir, recargar]);

  /* ── Shelf actions. Every one of them needs a session. ───────────────────── */

  const conSesion = (accion: () => void) => {
    if (!dentro) {
      setPidiendoEntrada(true);
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
          onEntrar={() => setPidiendoEntrada(true)}
        />
      ) : (
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <Estanteria
            catalogo={catalogo}
            cargando={cargando}
            dentro={dentro}
            onAbrir={abrir}
            onCrear={(titulo) => conSesion(() => void crear(titulo))}
            onDuplicar={(slug) => conSesion(() => void duplicar(slug))}
            onRenombrar={(slug, nombre) => conSesion(() => void renombrar(slug, nombre))}
            onBorrar={(slug) => conSesion(() => void borrar(slug))}
            onAjustes={() => setAjustando(true)}
            onRecargar={() => void recargar()}
            onEntrar={() => setPidiendoEntrada(true)}
            onSalir={() => {
              salir();
              avisar("Sesión cerrada.");
            }}
          />
          {ajustando && (
            <PanelAjustes
              ajustes={ajustes}
              dentro={dentro}
              onAjustes={cambiarAjustes}
              onCerrar={() => setAjustando(false)}
              onRecargar={() => void recargar()}
            />
          )}
        </div>
      )}

      {pidiendoEntrada && (
        <Entrada
          onEntrado={() => {
            setPidiendoEntrada(false);
            setDentro(true);
          }}
          onCerrar={() => setPidiendoEntrada(false)}
        />
      )}

      <Avisos />
    </div>
  );
}
