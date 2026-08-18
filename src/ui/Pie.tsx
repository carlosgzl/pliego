/**
 * El pie de la casa y el selector de color, que van juntos abajo.
 *
 * EL SELECTOR ESTÁ ABAJO A LA DERECHA porque él lo pidió ahí y porque es donde
 * menos estorba: no ocupa sitio en la cabecera, no compite con nada, y quien no
 * lo busca no lo ve. Se abre en un ramillete de ocho puntos y se cierra al
 * elegir o al pinchar fuera.
 *
 * EL AVISO DE BETA no es un adorno: la aplicación guarda el trabajo de alguien
 * y todavía está creciendo. Decirlo por delante es lo honesto, y ahorra la
 * conversación incómoda si algo falla.
 */

import { useEffect, useRef, useState } from "react";
import { ACENTOS } from "./acento";
import { Icono } from "./Icono";
import { useSalida } from "./useSalida";

export function SelectorColor({
  valor,
  onCambiar,
}: {
  valor: string;
  onCambiar: (clave: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const salida = useSalida(abierto, () => setAbierto(false));

  useEffect(() => {
    if (!abierto) {
      return;
    }
    const fuera = (evento: PointerEvent) => {
      if (!caja.current?.contains(evento.target as Node)) {
        salida.cerrar();
      }
    };
    const escape = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        salida.cerrar();
      }
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto, salida]);

  return (
    <div className="paleta" ref={caja}>
      {salida.montado && (
        <div
          className={`paleta__ramo${salida.cerrando ? " menu__lista--cerrando" : ""}`}
          role="menu"
          onAnimationEnd={salida.alTerminar}
        >
          {ACENTOS.map((acento) => (
            <button
              key={acento.clave}
              type="button"
              role="menuitemradio"
              aria-checked={valor === acento.clave}
              title={acento.nombre}
              aria-label={`Color ${acento.nombre}`}
              className={`acento${valor === acento.clave ? " acento--aqui" : ""}`}
              style={{ background: acento.claro.acento }}
              onClick={() => {
                onCambiar(acento.clave);
                salida.cerrar();
              }}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        className="paleta__tirador"
        aria-expanded={abierto}
        aria-label="Cambiar el color de la aplicación"
        title="Cambiar el color de la aplicación"
        onClick={() => (abierto ? salida.cerrar() : setAbierto(true))}
      >
        <span className="paleta__punto" />
      </button>
    </div>
  );
}

export function Pie() {
  return (
    <footer className="pie">
      <div className="pie__dentro">
        <div className="pie__marca">
          <span className="pie__nombre">
            Pliego<span className="marca__punto">.</span>
          </span>
          <span className="pie__beta">Beta</span>
        </div>

        <p className="pie__que">
          Un sitio para escribir libros. Cada obra es un archivo Markdown que se abre en cualquier
          editor: nada de lo que escribas depende de esta web.
        </p>

        <p className="pie__firma">
          Diseñada y programada por <strong>Carlos González Alcalde</strong>
          <span className="pie__sep">·</span>
          <a href="https://portfoliocga.netlify.app" target="_blank" rel="noreferrer noopener">
            portfolio
          </a>
          <span className="pie__sep">·</span>
          <a
            href="https://www.linkedin.com/in/carlos-gonz%C3%A1lez-alcalde-392121308"
            target="_blank"
            rel="noreferrer noopener"
          >
            LinkedIn
          </a>
        </p>

        <p className="pie__aviso">
          <Icono nombre="aviso" tamano={13} />
          Esto es una <strong>beta</strong>: está en uso y en obras a la vez. Guarda una copia de lo
          que te importe — desde Exportar, en cualquier libro.
        </p>
      </div>
    </footer>
  );
}
