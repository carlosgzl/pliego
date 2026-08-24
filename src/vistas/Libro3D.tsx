/**
 * El libro como objeto: cuatro caras y volumen.
 *
 * POR QUÉ ESTO EXISTE. Diseñar una portada mirando un rectángulo plano es
 * diseñar una miniatura, no preparar una edición. Un libro tiene delante,
 * detrás, lomo y canto, y las cuatro se ven a la vez en cuanto lo coges: el
 * lomo es lo ÚNICO que se ve de un libro en una estantería, y hasta ahora no
 * se podía ni escribir.
 *
 * ESTÁ HECHO CON CSS EN TRES DIMENSIONES, no con una biblioteca ni con un
 * lienzo. Cuatro caras, cada una girada y desplazada a su sitio dentro de un
 * contenedor con `preserve-3d`. La de delante es EL MISMO COMPONENTE que pinta
 * la portada en la estantería y en el PDF — no una imitación —, así que lo que
 * se ve girando es exactamente lo que se va a imprimir.
 *
 * SE GIRA ARRASTRANDO. Un libro que no se puede girar es una fotografía de un
 * libro; poder darle la vuelta es la mitad de para qué sirve verlo en volumen.
 */

import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { pilaDe } from "@/nucleo/fuentes";
import type { Meta } from "@/nucleo/libro";
import { Portada } from "./Portada";

/** El giro de partida: de tres cuartos, que es como se enseña un libro. */
const GIRO_INICIAL = -32;

export function Libro3D({
  meta,
  /** Alto de la tapa en píxeles. Todo lo demás se calcula de aquí. */
  alto = 380,
  elegido,
}: {
  meta: Meta;
  alto?: number;
  elegido?: string | null;
}) {
  const [giro, setGiro] = useState(GIRO_INICIAL);
  const [inclinacion, setInclinacion] = useState(-6);
  const arrastre = useRef<{ x: number; y: number; giro: number; inc: number } | null>(null);

  /* Proporción 2:3, la misma que usa la portada en todas partes. */
  const ancho = Math.round((alto * 2) / 3);
  const grosor = Math.max(6, Math.round((ancho * (meta.portada.grosor ?? 8)) / 100));

  const agarrar = (evento: ReactPointerEvent<HTMLDivElement>) => {
    arrastre.current = { x: evento.clientX, y: evento.clientY, giro, inc: inclinacion };
    evento.currentTarget.setPointerCapture(evento.pointerId);
  };

  const mover = (evento: ReactPointerEvent<HTMLDivElement>) => {
    const desde = arrastre.current;
    if (!desde) {
      return;
    }
    /* Un grado por cada dos píxeles: más rápido y el libro se va de las manos,
       más lento y hay que arrastrar media pantalla para verle la espalda. */
    setGiro(acotar(desde.giro + (evento.clientX - desde.x) / 2, -180, 180));
    setInclinacion(acotar(desde.inc - (evento.clientY - desde.y) / 4, -30, 30));
  };

  const soltar = () => {
    arrastre.current = null;
  };

  const escena = {
    "--alto": `${alto}px`,
    "--ancho": `${ancho}px`,
    "--grosor": `${grosor}px`,
    "--giro": `${giro}deg`,
    "--inclinacion": `${inclinacion}deg`,
    "--portada-color": meta.portada.color,
    "--portada-tinta": meta.portada.tinta,
    "--portada-fuente": pilaDe(meta.portada.fuente),
  } as CSSProperties;

  const textura =
    meta.portada.textura && meta.portada.textura !== "ninguna" ? meta.portada.textura : null;

  return (
    <div className="escena3d">
      <div
        className="libro3d"
        style={escena}
        onPointerDown={agarrar}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        role="img"
        aria-label={`${meta.titulo}, vista en tres dimensiones. Arrastra para girarlo.`}
      >
        <div className="libro3d__caja">
          {/* Delante: el componente de verdad, no una imitación. */}
          <div className="libro3d__cara libro3d__cara--frente">
            <Portada meta={meta} tamano="grande" elegido={elegido} />
          </div>

          <div className="libro3d__cara libro3d__cara--contra">
            {textura && <div className={`portada__textura textura--${textura}`} aria-hidden="true" />}
            <div className="contra">
              {meta.portada.contra ? (
                <p className="contra__texto">{meta.portada.contra}</p>
              ) : (
                <p className="contra__vacia">
                  La contraportada está en blanco. Es donde va la sinopsis: las cinco líneas que
                  deciden si alguien se lleva el libro.
                </p>
              )}
              {meta.autor && <span className="contra__autor">{meta.autor}</span>}
            </div>
          </div>

          <div className="libro3d__cara libro3d__cara--lomo">
            {textura && <div className={`portada__textura textura--${textura}`} aria-hidden="true" />}
            <span className="lomo__texto">{meta.portada.lomo || meta.titulo}</span>
          </div>

          {/*
            * El canto: el borde de las hojas.
            *
            * Son rayas finísimas de dos cremas alternos. Sin él, el libro se ve
            * como una caja de color plano y se le nota lo falso al instante:
            * es lo que dice «esto es papel apilado» sin decir nada.
            */}
          <div className="libro3d__cara libro3d__cara--canto" aria-hidden="true" />
          <div className="libro3d__cara libro3d__cara--cabeza" aria-hidden="true" />
          <div className="libro3d__cara libro3d__cara--pie" aria-hidden="true" />
        </div>
      </div>

      <div className="escena3d__mandos">
        <input
          className="deslizador"
          type="range"
          min={-180}
          max={180}
          step={1}
          value={giro}
          aria-label="Girar el libro"
          onChange={(evento) => setGiro(Number.parseInt(evento.target.value, 10))}
        />
        <button
          type="button"
          className="boton boton--desnudo"
          onClick={() => {
            setGiro(GIRO_INICIAL);
            setInclinacion(-6);
          }}
        >
          Enderezar
        </button>
      </div>
    </div>
  );
}

function acotar(valor: number, minimo: number, maximo: number): number {
  return Math.max(minimo, Math.min(maximo, valor));
}

/**
 * Las cuatro caras extendidas, como llega una cubierta a la imprenta.
 *
 * Es la otra forma de mirarlo, y para trabajar es mejor que la de volumen: en
 * plano se ve todo a la vez y a tamaño real, sin perspectiva que deforme las
 * letras. El orden es el de la hoja impresa —contraportada, lomo y portada, de
 * izquierda a derecha— porque desplegada así es como sale de la máquina.
 */
export function CubiertaPlana({
  meta,
  alto = 260,
  elegido,
}: {
  meta: Meta;
  alto?: number;
  elegido?: string | null;
}) {
  const ancho = Math.round((alto * 2) / 3);
  const grosor = Math.max(10, Math.round((ancho * (meta.portada.grosor ?? 8)) / 100));
  const textura =
    meta.portada.textura && meta.portada.textura !== "ninguna" ? meta.portada.textura : null;

  const fondo = {
    "--portada-color": meta.portada.color,
    "--portada-tinta": meta.portada.tinta,
    "--portada-fuente": pilaDe(meta.portada.fuente),
  } as CSSProperties;

  return (
    <div className="cubierta" style={{ ...fondo, height: alto }}>
      <div className="cubierta__cara cubierta__cara--contra" style={{ width: ancho }}>
        {textura && <div className={`portada__textura textura--${textura}`} aria-hidden="true" />}
        <div className="contra">
          {meta.portada.contra ? (
            <p className="contra__texto">{meta.portada.contra}</p>
          ) : (
            <p className="contra__vacia">Contraportada en blanco</p>
          )}
          {meta.autor && <span className="contra__autor">{meta.autor}</span>}
        </div>
        <span className="cubierta__rotulo">Contraportada</span>
      </div>

      <div className="cubierta__cara cubierta__cara--lomo" style={{ width: grosor }}>
        {textura && <div className={`portada__textura textura--${textura}`} aria-hidden="true" />}
        <span className="lomo__texto">{meta.portada.lomo || meta.titulo}</span>
        <span className="cubierta__rotulo">Lomo</span>
      </div>

      <div className="cubierta__cara cubierta__cara--frente" style={{ width: ancho }}>
        <Portada meta={meta} tamano="grande" elegido={elegido} />
        <span className="cubierta__rotulo">Portada</span>
      </div>
    </div>
  );
}
