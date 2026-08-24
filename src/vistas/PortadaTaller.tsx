/**
 * El taller de la portada: plantillas, material y cosas puestas a mano.
 *
 * LO QUE FALTABA. Se podía elegir un estilo, dos colores y una imagen de fondo,
 * y con eso una portada no llega a portada. Faltaban las tres cosas que hace
 * cualquiera que diseñe una: partir de algo que ya funciona, elegir el material
 * sobre el que va impresa, y poner encima lo que haga falta donde haga falta.
 *
 * SE ARRASTRA SOBRE LA PORTADA DE VERDAD, no sobre un esquema. La vista previa
 * grande es el mismo componente que pinta la miniatura de la estantería y el
 * PDF, así que lo que se coloca aquí está colocado ahí. Las posiciones van en
 * porcentaje justamente para eso.
 *
 * Y HAY UNA REJILLA DE NUEVE SITIOS. Arrastrar es preciso pero cansa, y nueve
 * de cada diez veces lo que se quiere es «en la esquina de abajo a la derecha»;
 * eso es un clic, no un pulso firme. El arrastre se queda para el otro caso.
 */

import { useRef, type ChangeEvent, type PointerEvent as ReactPointerEvent } from "react";
import { FUENTES } from "@/nucleo/fuentes";
import type { ElementoPortada, Meta, Portada as TipoPortada } from "@/nucleo/libro";
import {
  aplicarPlantilla,
  nuevoId,
  PLANTILLAS,
  sugerirPortada,
  TEXTURAS,
  type Plantilla,
} from "@/nucleo/portadas";
import { avisar } from "@/ui/Avisos";
import { Icono } from "@/ui/Icono";
import { Portada, prepararImagen } from "./Portada";

/* ── La portada grande, con lo suyo arrastrable ───────────────────────────── */

export function LienzoPortada({
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
    /* Capturar el puntero es lo que hace que el arrastre siga funcionando
       aunque el ratón se salga de la portada: sin esto, mover un sello hasta el
       borde lo suelta a medio camino. */
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
    // Se deja salir un poco por fuera: una faja que sangra por el canto es una
    // decisión de diseño, no un accidente.
    onMover(id, acotar(x, -10, 110), acotar(y, -10, 110));
  };

  const soltar = () => {
    arrastrando.current = null;
  };

  return (
    <div
      className="lienzo"
      ref={caja}
      onPointerDown={agarrar}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
    >
      <Portada meta={meta} tamano="grande" elegido={elegido} />
    </div>
  );
}

function acotar(valor: number, minimo: number, maximo: number): number {
  return Math.max(minimo, Math.min(maximo, Math.round(valor * 10) / 10));
}

/* ── Plantillas ───────────────────────────────────────────────────────────── */

export function Plantillas({
  meta,
  palabras,
  onAplicar,
}: {
  meta: Meta;
  palabras: number;
  onAplicar: (portada: TipoPortada) => void;
}) {
  const sugerida = sugerirPortada(meta, palabras);

  const usar = (plantilla: Plantilla) => {
    onAplicar(aplicarPlantilla(meta.portada, plantilla));
    avisar(`Portada «${plantilla.nombre}» puesta.`);
  };

  return (
    <div className="grupo">
      <span className="grupo__titulo">Empezar por una hecha</span>

      {/*
        * La recomendación va con el PORQUÉ escrito.
        *
        * Sin el motivo es un horóscopo: da igual lo que diga porque no se puede
        * comprobar. Con el motivo delante —«tiene subtítulo y letra de ensayo»—
        * quien lo lee puede estar de acuerdo o no, que es de lo que se trata.
        */}
      <button type="button" className="sugerida" onClick={() => usar(sugerida.plantilla)}>
        <span className="sugerida__muestra">
          <Portada
            meta={{ ...meta, portada: aplicarPlantilla(meta.portada, sugerida.plantilla) }}
            tamano="mini"
          />
        </span>
        <span className="sugerida__texto">
          <span className="eyebrow">Para este libro</span>
          <strong>{sugerida.plantilla.nombre}</strong>
          <span className="campo__nota">{sugerida.porque}</span>
        </span>
      </button>

      <p className="campo__nota">
        O cualquiera de estas. Ninguna toca el título ni el autor, y tu imagen y lo que hayas
        colocado a mano se quedan donde están.
      </p>

      <div className="plantillas">
        {PLANTILLAS.map((plantilla) => (
          <button
            key={plantilla.clave}
            type="button"
            className="plantilla"
            title={plantilla.para}
            onClick={() => usar(plantilla)}
          >
            <Portada
              meta={{ ...meta, portada: aplicarPlantilla(meta.portada, plantilla) }}
              tamano="mini"
            />
            <span className="plantilla__nombre">{plantilla.nombre}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Material ─────────────────────────────────────────────────────────────── */

export function Material({
  portada,
  onCambiar,
}: {
  portada: TipoPortada;
  onCambiar: (cambios: Partial<TipoPortada>) => void;
}) {
  const puesta = portada.textura ?? "ninguna";
  return (
    <div className="grupo">
      <span className="grupo__titulo">El material de la tapa</span>
      <p className="campo__nota">
        Un color plano se lee como una diapositiva. El papel tiene grano, la tela tiene trama y el
        cartón tiene fibra, y es eso lo que hace que una portada parezca un objeto y no una imagen.
        Están dibujadas con CSS: no pesan nada y no salen del archivo del libro.
      </p>
      <div className="materiales">
        {TEXTURAS.map((textura) => (
          <button
            key={textura.clave}
            type="button"
            className={`material${puesta === textura.clave ? " material--aqui" : ""}`}
            title={textura.que}
            onClick={() => onCambiar({ textura: textura.clave })}
          >
            <span
              className={`material__muestra${
                textura.clave === "ninguna" ? "" : ` textura--${textura.clave}`
              }`}
              style={{ background: portada.color }}
            />
            <span className="material__nombre">{textura.nombre}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Lo puesto a mano ─────────────────────────────────────────────────────── */

/** Los nueve sitios de la rejilla, en porcentaje. */
const SITIOS: [string, number, number][] = [
  ["Arriba a la izquierda", 18, 14],
  ["Arriba en el centro", 50, 14],
  ["Arriba a la derecha", 82, 14],
  ["A la izquierda", 18, 50],
  ["En el centro", 50, 50],
  ["A la derecha", 82, 50],
  ["Abajo a la izquierda", 18, 86],
  ["Abajo en el centro", 50, 86],
  ["Abajo a la derecha", 82, 86],
];

export function Elementos({
  portada,
  elegido,
  onElegir,
  onCambiar,
}: {
  portada: TipoPortada;
  elegido: string | null;
  onElegir: (id: string | null) => void;
  onCambiar: (elementos: ElementoPortada[]) => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const elementos = portada.elementos ?? [];
  const actual = elementos.find((elemento) => elemento.id === elegido) ?? null;

  const cambiar = (id: string, cambios: Partial<ElementoPortada>) =>
    onCambiar(elementos.map((e) => (e.id === id ? { ...e, ...cambios } : e)));

  const anadirTexto = () => {
    const nuevo: ElementoPortada = {
      id: nuevoId(),
      tipo: "texto",
      contenido: "Texto",
      x: 50,
      y: 72,
      ancho: 70,
      tamano: 0.9,
      alineacion: "centro",
      tracking: 0.08,
    };
    onCambiar([...elementos, nuevo]);
    onElegir(nuevo.id);
  };

  const anadirImagen = async (evento: ChangeEvent<HTMLInputElement>) => {
    const fichero = evento.target.files?.[0];
    evento.target.value = "";
    if (!fichero) {
      return;
    }
    try {
      const nuevo: ElementoPortada = {
        id: nuevoId(),
        tipo: "imagen",
        /* Más pequeña que la de fondo: un adorno no necesita 520 px, y todo
           esto viaja dentro del .md del libro. */
        contenido: await prepararImagen(fichero, 320),
        x: 50,
        y: 34,
        ancho: 44,
        opacidad: 1,
      };
      onCambiar([...elementos, nuevo]);
      onElegir(nuevo.id);
    } catch {
      avisar("No se ha podido leer esa imagen.", "error");
    }
  };

  return (
    <div className="grupo">
      <span className="grupo__titulo">Puesto a mano</span>
      <p className="campo__nota">
        Un sello, una firma, una franja lateral, una foto pequeña. Arrástralo por la portada de
        arriba, o mándalo a uno de los nueve sitios de la rejilla.
      </p>

      <div className="botonera">
        <button type="button" className="boton" onClick={anadirTexto}>
          <Icono nombre="mas" tamano={14} /> Texto
        </button>
        <button type="button" className="boton" onClick={() => entrada.current?.click()}>
          <Icono nombre="mas" tamano={14} /> Imagen
        </button>
        <input
          ref={entrada}
          type="file"
          accept="image/*"
          hidden
          onChange={(evento) => void anadirImagen(evento)}
        />
      </div>

      {elementos.length > 0 && (
        <div className="capas">
          {elementos.map((elemento, indice) => (
            <div
              key={elemento.id}
              className={`capa${elegido === elemento.id ? " capa--aqui" : ""}`}
            >
              <button type="button" className="capa__nombre" onClick={() => onElegir(elemento.id)}>
                <Icono nombre={elemento.tipo === "texto" ? "cursiva" : "ojo"} tamano={13} />
                <span>
                  {elemento.tipo === "texto"
                    ? elemento.contenido.slice(0, 22) || "(texto vacío)"
                    : "Imagen"}
                </span>
              </button>
              {/* Subir y bajar en la pila: dos cosas que se solapan y no hay
                  otra forma de decidir cuál va delante. */}
              <button
                type="button"
                className="boton boton--desnudo"
                title="Traer adelante"
                disabled={indice === elementos.length - 1}
                onClick={() => onCambiar(intercambiar(elementos, indice, indice + 1))}
              >
                <span style={{ display: "inline-flex", transform: "rotate(-90deg)" }}>
                  <Icono nombre="flecha" tamano={12} />
                </span>
              </button>
              <button
                type="button"
                className="boton boton--desnudo"
                title="Mandar atrás"
                disabled={indice === 0}
                onClick={() => onCambiar(intercambiar(elementos, indice, indice - 1))}
              >
                <span style={{ display: "inline-flex", transform: "rotate(90deg)" }}>
                  <Icono nombre="flecha" tamano={12} />
                </span>
              </button>
              <button
                type="button"
                className="boton boton--desnudo boton--peligro"
                title="Quitar"
                onClick={() => {
                  onCambiar(elementos.filter((otro) => otro.id !== elemento.id));
                  if (elegido === elemento.id) {
                    onElegir(null);
                  }
                }}
              >
                <Icono nombre="papelera" tamano={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {actual && (
        <div className="elegido">
          {actual.tipo === "texto" && (
            <label className="campo">
              <span className="campo__etiqueta">Qué dice</span>
              <textarea
                className="entrada entrada--area"
                value={actual.contenido}
                rows={2}
                onChange={(evento) => cambiar(actual.id, { contenido: evento.target.value })}
              />
            </label>
          )}

          <div className="campo">
            <span className="campo__etiqueta">Dónde</span>
            <div className="rejilla-sitios">
              {SITIOS.map(([nombre, x, y]) => (
                <button
                  key={nombre}
                  type="button"
                  className={`sitio${Math.abs(actual.x - x) < 4 && Math.abs(actual.y - y) < 4 ? " sitio--aqui" : ""}`}
                  title={nombre}
                  aria-label={nombre}
                  onClick={() => cambiar(actual.id, { x, y })}
                />
              ))}
            </div>
          </div>

          <Deslizador
            etiqueta="Tamaño"
            valor={actual.tipo === "texto" ? (actual.tamano ?? 1) : actual.ancho}
            minimo={actual.tipo === "texto" ? 0.4 : 5}
            maximo={actual.tipo === "texto" ? 4 : 100}
            paso={actual.tipo === "texto" ? 0.05 : 1}
            unidad={actual.tipo === "texto" ? "em" : "%"}
            onCambiar={(valor) =>
              cambiar(actual.id, actual.tipo === "texto" ? { tamano: valor } : { ancho: valor })
            }
          />

          <Deslizador
            etiqueta="Giro"
            valor={actual.giro ?? 0}
            minimo={-45}
            maximo={45}
            paso={1}
            unidad="°"
            onCambiar={(giro) => cambiar(actual.id, { giro })}
          />

          <Deslizador
            etiqueta="Opacidad"
            valor={Math.round((actual.opacidad ?? 1) * 100)}
            minimo={5}
            maximo={100}
            paso={5}
            unidad="%"
            onCambiar={(valor) => cambiar(actual.id, { opacidad: valor / 100 })}
          />

          {actual.tipo === "texto" ? (
            <>
              <Deslizador
                etiqueta="Espaciado entre letras"
                valor={Math.round((actual.tracking ?? 0) * 100)}
                minimo={-5}
                maximo={40}
                paso={1}
                unidad="/100 em"
                onCambiar={(valor) => cambiar(actual.id, { tracking: valor / 100 })}
              />

              <label className="campo">
                <span className="campo__etiqueta">Letra</span>
                <select
                  className="entrada"
                  value={actual.fuente ?? ""}
                  onChange={(evento) => cambiar(actual.id, { fuente: evento.target.value })}
                >
                  <option value="">La de la portada</option>
                  {FUENTES.map((fuente) => (
                    <option key={fuente.key} value={fuente.key}>
                      {fuente.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="campo">
                <span className="campo__etiqueta">
                  Color
                  <button
                    type="button"
                    className="campo__accion"
                    onClick={() => cambiar(actual.id, { color: "" })}
                  >
                    la de la portada
                  </button>
                </span>
                <input
                  className="entrada entrada--color"
                  type="color"
                  value={actual.color || "#ffffff"}
                  onChange={(evento) => cambiar(actual.id, { color: evento.target.value })}
                />
              </label>

              <div className="botonera">
                <button
                  type="button"
                  className="boton"
                  aria-pressed={(actual.peso ?? 400) >= 600}
                  onClick={() =>
                    cambiar(actual.id, { peso: (actual.peso ?? 400) >= 600 ? 400 : 700 })
                  }
                >
                  Negrita
                </button>
                <button
                  type="button"
                  className="boton"
                  aria-pressed={Boolean(actual.versalitas)}
                  onClick={() => cambiar(actual.id, { versalitas: !actual.versalitas })}
                >
                  Versalitas
                </button>
              </div>
            </>
          ) : (
            <Deslizador
              etiqueta="Esquinas"
              valor={actual.redondez ?? 0}
              minimo={0}
              maximo={50}
              paso={1}
              unidad="%"
              onCambiar={(redondez) => cambiar(actual.id, { redondez })}
            />
          )}
        </div>
      )}
    </div>
  );
}

function intercambiar<T>(lista: T[], a: number, b: number): T[] {
  const copia = [...lista];
  const guardado = copia[a]!;
  copia[a] = copia[b]!;
  copia[b] = guardado;
  return copia;
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
