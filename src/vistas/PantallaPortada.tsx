/**
 * El taller de portada, a pantalla completa.
 *
 * ESTABA METIDO EN UN PANEL LATERAL DE 22 REM Y ERA HORRIBLE. Diseñar la
 * cubierta de un libro en una columna del ancho de un móvil, con la portada del
 * tamaño de un sello y quince controles apilados debajo, no es difícil: es
 * imposible. Se hacía a ciegas.
 *
 * Ahora ocupa la pantalla, como cualquier programa de diseño: el libro en
 * grande a la izquierda —en volumen o extendido— y los controles a la derecha,
 * agrupados por lo que hacen y no por el orden en que se programaron.
 *
 * TRES VISTAS, y cada una sirve para algo distinto:
 *   volumen    para decidir si el conjunto funciona. Es lo que verá alguien.
 *   extendida  para trabajar: las tres caras a la vez y sin perspectiva.
 *   portada    para colocar cosas al milímetro sobre la tapa de delante.
 *
 * LO QUE HAY QUE PODER HACER Y NO SE PODÍA: escribir la contraportada, escribir
 * el lomo, decidir cuánto abulta el libro y —la que más falta hacía— RECORTAR
 * la fotografía. Antes se subía una foto y salía como saliera.
 */

import { useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { Meta, Portada as TipoPortada } from "@/nucleo/libro";
import { contarPalabras } from "@/nucleo/bloques";
import { avisar } from "@/ui/Avisos";
import { Icono } from "@/ui/Icono";
import { Segmentado } from "@/ui/Segmentado";
import { useSalida } from "@/ui/useSalida";
import { CubiertaPlana, Libro3D } from "./Libro3D";
import { Elementos, Material, Plantillas } from "./PortadaTaller";
import { Portada, prepararImagen } from "./Portada";

type Vista = "volumen" | "extendida" | "portada";

export function PantallaPortada({
  meta,
  cuerpo,
  onCambiar,
  onCerrar,
}: {
  meta: Meta;
  cuerpo: string;
  onCambiar: (meta: Meta) => void;
  onCerrar: () => void;
}) {
  const salida = useSalida(true, onCerrar);
  const [vista, setVista] = useState<Vista>("volumen");
  const [elegido, setElegido] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  const cambiarPortada = (cambios: Partial<TipoPortada>) =>
    onCambiar({ ...meta, portada: { ...meta.portada, ...cambios } });

  const elegirImagen = async (evento: ChangeEvent<HTMLInputElement>) => {
    const fichero = evento.target.files?.[0];
    evento.target.value = "";
    if (!fichero) {
      return;
    }
    try {
      cambiarPortada({
        imagen: await prepararImagen(fichero),
        /* Una foto nueva entra siempre centrada y sin ampliar: heredar el
           encuadre de la anterior deja la nueva descolocada sin motivo. */
        encuadre: { x: 50, y: 50, zoom: 1 },
      });
    } catch {
      avisar("No se ha podido leer esa imagen.", "error");
    }
  };

  return (
    <div
      className={`taller-portada pantalla${salida.cerrando ? " pantalla--cerrando" : ""}`}
      onAnimationEnd={salida.alTerminar}
    >
      <header className="taller-portada__barra">
        <button type="button" className="boton boton--desnudo" onClick={salida.cerrar}>
          <Icono nombre="atras" /> <span className="boton__texto">Volver a escribir</span>
        </button>

        <div className="taller-portada__centro">
          <span className="barra__titulo">Portada de «{meta.titulo}»</span>
        </div>

        <Segmentado
          opciones={[
            { valor: "volumen", texto: "En volumen" },
            { valor: "extendida", texto: "Extendida" },
            { valor: "portada", texto: "Solo la tapa" },
          ]}
          valor={vista}
          onCambiar={(valor) => setVista(valor as Vista)}
        />
      </header>

      <div className="taller-portada__cuerpo">
        {/* ── El libro, en grande ─────────────────────────────────────────── */}
        <div className="taller-portada__lienzo">
          {vista === "volumen" && <Libro3D meta={meta} alto={420} elegido={elegido} />}
          {vista === "extendida" && <CubiertaPlana meta={meta} alto={300} elegido={elegido} />}
          {vista === "portada" && (
            <LienzoTapa
              meta={meta}
              elegido={elegido}
              onElegir={setElegido}
              onMover={(id, x, y) =>
                cambiarPortada({
                  elementos: (meta.portada.elementos ?? []).map((elemento) =>
                    elemento.id === id ? { ...elemento, x, y } : elemento,
                  ),
                })
              }
            />
          )}

          <p className="taller-portada__pista">
            {vista === "volumen" && "Arrastra el libro para girarlo y verle el lomo y la espalda."}
            {vista === "extendida" && "La cubierta como sale de la imprenta: contraportada, lomo y portada."}
            {vista === "portada" && "Arrastra lo que hayas puesto encima para colocarlo."}
          </p>
        </div>

        {/* ── Los controles ───────────────────────────────────────────────── */}
        <aside className="taller-portada__mandos">
          <Plantillas
            meta={meta}
            palabras={contarPalabras(cuerpo)}
            onAplicar={(portada) => onCambiar({ ...meta, portada })}
          />

          <div className="grupo">
            <span className="grupo__titulo">La fotografía</span>
            <div className="botonera">
              <button type="button" className="boton" onClick={() => entrada.current?.click()}>
                <Icono nombre="mas" /> {meta.portada.imagen ? "Cambiar" : "Poner una"}
              </button>
              {meta.portada.imagen && (
                <button
                  type="button"
                  className="boton boton--peligro"
                  onClick={() => cambiarPortada({ imagen: null })}
                >
                  <Icono nombre="papelera" /> Quitar
                </button>
              )}
              <input
                ref={entrada}
                type="file"
                accept="image/*"
                hidden
                onChange={(evento) => void elegirImagen(evento)}
              />
            </div>

            {meta.portada.imagen && (
              <Encuadre meta={meta} onCambiar={cambiarPortada} />
            )}
          </div>

          <div className="grupo">
            <span className="grupo__titulo">La contraportada</span>
            <p className="campo__nota">
              La sinopsis: las cinco líneas que deciden si alguien se lleva el libro. Se ve girando
              el libro o en la vista extendida.
            </p>
            <textarea
              className="entrada entrada--area"
              rows={6}
              value={meta.portada.contra ?? ""}
              placeholder="Una noche de agosto, un copista descubre que el libro que está copiando cuenta su propia vida…"
              onChange={(evento) => cambiarPortada({ contra: evento.target.value })}
            />
          </div>

          <div className="grupo">
            <span className="grupo__titulo">El lomo</span>
            <p className="campo__nota">
              Es lo <strong>único</strong> que se ve de un libro en una estantería. Vacío pone el
              título; si el título es largo, aquí va la versión corta.
            </p>
            <input
              className="entrada"
              value={meta.portada.lomo ?? ""}
              placeholder={meta.titulo}
              onChange={(evento) => cambiarPortada({ lomo: evento.target.value })}
            />
            <Deslizador
              etiqueta="Cuánto abulta"
              valor={meta.portada.grosor ?? 8}
              minimo={3}
              maximo={22}
              paso={1}
              unidad="%"
              onCambiar={(grosor) => cambiarPortada({ grosor })}
            />
            <span className="campo__nota">
              Un 3 % es una plaquette; un 8 %, una novela normal; un 20 %, un tocho de mil páginas.
            </span>
          </div>

          <Elementos
            portada={meta.portada}
            elegido={elegido}
            onElegir={setElegido}
            onCambiar={(elementos) => cambiarPortada({ elementos })}
          />

          <Material portada={meta.portada} onCambiar={cambiarPortada} />
        </aside>
      </div>
    </div>
  );
}

/**
 * Recortar la fotografía sin tocar el archivo.
 *
 * ERA LO QUE MÁS FALTA HACÍA: se subía una foto y salía como saliera, con la
 * cara del retrato cortada por la mitad si tocaba. Ahora se arrastra la imagen
 * para elegir qué parte se ve y se amplía con un mando.
 *
 * Y NO SE REESCRIBE LA IMAGEN: se guardan tres números —el punto que queda
 * centrado y el aumento— que el navegador aplica con `object-position` y
 * `scale`. Ocupan nada dentro del archivo del libro y, sobre todo, siempre se
 * puede volver atrás: recortar de verdad, tirando píxeles, es irreversible.
 */
function Encuadre({
  meta,
  onCambiar,
}: {
  meta: Meta;
  onCambiar: (cambios: Partial<TipoPortada>) => void;
}) {
  const encuadre = meta.portada.encuadre ?? { x: 50, y: 50, zoom: 1 };
  const caja = useRef<HTMLDivElement>(null);
  const arrastre = useRef<{ x: number; y: number; ex: number; ey: number } | null>(null);

  const agarrar = (evento: ReactPointerEvent<HTMLDivElement>) => {
    arrastre.current = { x: evento.clientX, y: evento.clientY, ex: encuadre.x, ey: encuadre.y };
    evento.currentTarget.setPointerCapture(evento.pointerId);
  };

  const mover = (evento: ReactPointerEvent<HTMLDivElement>) => {
    const desde = arrastre.current;
    const nodo = caja.current;
    if (!desde || !nodo) {
      return;
    }
    const marco = nodo.getBoundingClientRect();
    /* Invertido: arrastrar la imagen hacia la derecha enseña lo que hay a su
       IZQUIERDA, que es como se comporta una foto bajo el dedo. */
    const x = desde.ex - ((evento.clientX - desde.x) / marco.width) * 100;
    const y = desde.ey - ((evento.clientY - desde.y) / marco.height) * 100;
    onCambiar({
      encuadre: {
        x: Math.round(Math.max(0, Math.min(100, x))),
        y: Math.round(Math.max(0, Math.min(100, y))),
        zoom: encuadre.zoom,
      },
    });
  };

  const soltar = () => {
    arrastre.current = null;
  };

  return (
    <>
      <div className="campo">
        <span className="campo__etiqueta">
          Encuadre
          <button
            type="button"
            className="campo__accion"
            onClick={() => onCambiar({ encuadre: { x: 50, y: 50, zoom: 1 } })}
          >
            centrar
          </button>
        </span>
        <div
          className="encuadre"
          ref={caja}
          onPointerDown={agarrar}
          onPointerMove={mover}
          onPointerUp={soltar}
          onPointerCancel={soltar}
        >
          <Portada meta={meta} tamano="mini" />
          <span className="encuadre__pista">Arrastra para mover la foto</span>
        </div>
      </div>

      <Deslizador
        etiqueta="Ampliar"
        valor={encuadre.zoom}
        minimo={1}
        maximo={3}
        paso={0.05}
        unidad="×"
        onCambiar={(zoom) => onCambiar({ encuadre: { ...encuadre, zoom } })}
      />

      <div className="campo">
        <span className="campo__etiqueta">Dónde va la foto</span>
        <Segmentado
          opciones={[
            { valor: "completa", texto: "Toda" },
            { valor: "arriba", texto: "Arriba" },
            { valor: "abajo", texto: "Abajo" },
            { valor: "ventana", texto: "Ventana" },
          ]}
          valor={meta.portada.colocacion}
          onCambiar={(valor) =>
            onCambiar({ colocacion: valor as TipoPortada["colocacion"] })
          }
        />
      </div>
    </>
  );
}

/** La tapa sola, grande y con lo puesto a mano arrastrable. */
function LienzoTapa({
  meta,
  elegido,
  onElegir,
  onMover,
}: {
  meta: Meta;
  elegido: string | null;
  onElegir: (id: string | null) => void;
  onMover: (id: string, x: number, y: number) => void;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const arrastrando = useRef<string | null>(null);

  const agarrar = (evento: ReactPointerEvent<HTMLDivElement>) => {
    const nodo = (evento.target as HTMLElement).closest<HTMLElement>("[data-elemento]");
    const id = nodo?.dataset.elemento ?? null;
    onElegir(id);
    if (!id) {
      return;
    }
    evento.preventDefault();
    arrastrando.current = id;
    (evento.currentTarget as HTMLElement).setPointerCapture(evento.pointerId);
  };

  const mover = (evento: ReactPointerEvent<HTMLDivElement>) => {
    const id = arrastrando.current;
    const nodo = caja.current;
    if (!id || !nodo) {
      return;
    }
    const marco = nodo.getBoundingClientRect();
    const x = ((evento.clientX - marco.left) / marco.width) * 100;
    const y = ((evento.clientY - marco.top) / marco.height) * 100;
    onMover(id, acotar(x), acotar(y));
  };

  return (
    <div
      className="lienzo lienzo--grande"
      ref={caja}
      onPointerDown={agarrar}
      onPointerMove={mover}
      onPointerUp={() => (arrastrando.current = null)}
      onPointerCancel={() => (arrastrando.current = null)}
    >
      <Portada meta={meta} tamano="grande" elegido={elegido} />
    </div>
  );
}

function acotar(valor: number): number {
  return Math.max(-10, Math.min(110, Math.round(valor * 10) / 10));
}

function Deslizador({
  etiqueta,
  valor,
  minimo,
  maximo,
  paso,
  unidad,
  onCambiar,
}: {
  etiqueta: string;
  valor: number;
  minimo: number;
  maximo: number;
  paso: number;
  unidad: string;
  onCambiar: (valor: number) => void;
}) {
  return (
    <label className="campo">
      <span className="campo__etiqueta">
        {etiqueta}
        <span className="campo__valor">
          {Math.round(valor * 100) / 100} {unidad}
        </span>
      </span>
      <input
        className="deslizador"
        type="range"
        min={minimo}
        max={maximo}
        step={paso}
        value={valor}
        onChange={(evento) => onCambiar(Number.parseFloat(evento.target.value))}
      />
    </label>
  );
}
