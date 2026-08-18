/**
 * Two screens and the wiring between them: the shelf, and the workshop.
 *
 * There is no router. A writing app has one place you are and one place you
 * came from, and a URL bar is one more thing between the writer and the page —
 * but the open book DOES go in the address hash, so a reload puts you back
 * where you were and a link to a manuscript is possible.
 */

import { useCallback, useEffect, useState } from "react";
import {
  borrarLibro,
  cargarCatalogo,
  crearLibro,
  duplicarLibro,
  renombrarLibro,
  type Catalogo,
} from "@/datos/biblioteca";
import { guardarAjustes, leerAjustes, type Ajustes } from "@/datos/ajustes";
import { avisar, Avisos } from "@/ui/Avisos";
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

  /* ── Theme ───────────────────────────────────────────────────────────────── */

  useEffect(() => {
    const raiz = document.documentElement;
    const aplicar = () => {
      const oscuroDelSistema = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const tema = ajustes.tema === "sistema" ? (oscuroDelSistema ? "oscuro" : "claro") : ajustes.tema;
      raiz.dataset.tema = tema;
    };
    aplicar();
    if (ajustes.tema !== "sistema") {
      return;
    }
    const consulta = window.matchMedia("(prefers-color-scheme: dark)");
    consulta.addEventListener("change", aplicar);
    return () => consulta.removeEventListener("change", aplicar);
  }, [ajustes.tema]);

  const cambiarAjustes = useCallback((siguiente: Ajustes) => {
    setAjustes(siguiente);
    guardarAjustes(siguiente);
  }, []);

  /* ── The shelf ───────────────────────────────────────────────────────────── */

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      setCatalogo(await cargarCatalogo());
    } catch {
      avisar("No se ha podido leer la estantería.", "error");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

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

  /* ── Shelf actions ───────────────────────────────────────────────────────── */

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

  return (
    <div className="app">
      {abierto ? (
        <Taller
          key={abierto}
          slug={abierto}
          ajustes={ajustes}
          onAjustes={cambiarAjustes}
          onSalir={salirDelTaller}
        />
      ) : (
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <Estanteria
            catalogo={catalogo}
            cargando={cargando}
            onAbrir={abrir}
            onCrear={(titulo) => void crear(titulo)}
            onDuplicar={(slug) => void duplicar(slug)}
            onRenombrar={(slug, nombre) => void renombrar(slug, nombre)}
            onBorrar={(slug) => void borrar(slug)}
            onAjustes={() => setAjustando(true)}
            onRecargar={() => void recargar()}
          />
          {ajustando && (
            <PanelAjustes
              ajustes={ajustes}
              onAjustes={cambiarAjustes}
              onCerrar={() => setAjustando(false)}
              onRecargar={() => void recargar()}
            />
          )}
        </div>
      )}
      <Avisos />
    </div>
  );
}
