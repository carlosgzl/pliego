/**
 * La portada.
 *
 * UN COMPONENTE, DOS TAMAÑOS, escalados solo con `font-size` — todo lo de
 * dentro va en `em`. Una portada que se viera de una forma en la estantería y
 * de otra en el panel de diseño dejaría el panel inservible.
 *
 * La imagen coge una BANDA y no la chaqueta entera por defecto. Una fotografía
 * de lado a lado se traga el título, y el título es lo único que una portada
 * tiene que hacer; darle a la foto la parte de arriba y dejar las letras sobre
 * papel limpio es lo que hace una portada de verdad.
 *
 * LO PUESTO A MANO VA ENCIMA DE TODO. Los textos y las imágenes que se colocan
 * libremente se pintan sobre las tres líneas de siempre, con sus coordenadas en
 * porcentaje: así el mismo objeto cae en el mismo sitio en la miniatura de la
 * estantería, en el panel y en el PDF. Ver `nucleo/portadas.ts`.
 */

import type { CSSProperties } from "react";
import { pilaDe } from "@/nucleo/fuentes";
import type { ElementoPortada, Meta } from "@/nucleo/libro";

export function Portada({
  meta,
  tamano,
  /** El elemento que se está editando, para pintarle un marco. */
  elegido,
}: {
  meta: Meta;
  tamano: "mini" | "grande";
  elegido?: string | null;
}) {
  const { portada } = meta;
  /* Cada línea con la suya, cayendo en la general cuando no se ha elegido. Así
     un libro de antes de que esto existiera se compone igual que siempre. */
  const estilo = {
    "--portada-color": portada.color,
    "--portada-tinta": portada.tinta,
    "--portada-fuente": pilaDe(portada.fuente),
    "--portada-fuente-titulo": pilaDe(portada.fuenteTitulo || portada.fuente),
    "--portada-fuente-sub": pilaDe(portada.fuenteSub || portada.fuente),
    "--portada-fuente-autor": pilaDe(portada.fuenteAutor || portada.fuente),
    "--portada-encaje": portada.encaje === "contener" ? "contain" : "cover",
  } as CSSProperties;

  const completa = portada.colocacion === "completa";
  const textura = portada.textura && portada.textura !== "ninguna" ? portada.textura : null;
  const elementos = portada.elementos ?? [];

  return (
    <div className={`portada portada--${portada.diseno} portada--${tamano}`} style={estilo}>
      {portada.imagen && (
        <img
          className={`portada__imagen portada__imagen--${portada.colocacion}`}
          src={portada.imagen}
          alt=""
          /*
           * El recorte, sin tocar el archivo.
           *
           * `object-position` elige qué punto de la foto queda centrado dentro
           * del hueco, y la escala la amplía. Entre los dos se encuadra una
           * imagen guardando TRES NÚMEROS en lugar de reescribir la fotografía:
           * pesa nada dentro del .md y, sobre todo, siempre se puede volver
           * atrás. Recortar de verdad, tirando píxeles, es irreversible.
           */
          style={
            portada.encuadre
              ? {
                  objectPosition: `${portada.encuadre.x}% ${portada.encuadre.y}%`,
                  transform: `scale(${portada.encuadre.zoom})`,
                }
              : undefined
          }
        />
      )}
      {portada.imagen && completa && <div className="portada__velo" />}
      {/* La textura va DEBAJO de las letras y ENCIMA del color, nunca sobre la
          fotografía: una foto con trama de lino encima parece un error de
          impresión, no una tapa. */}
      {textura && <div className={`portada__textura textura--${textura}`} aria-hidden="true" />}
      <div
        className={`portada__letras${
          portada.colocacion === "abajo" ? " portada__letras--arriba" : ""
        }`}
      >
        <span className="portada__titulo">{meta.titulo}</span>
        {meta.subtitulo && <span className="portada__sub">{meta.subtitulo}</span>}
        {meta.autor && <span className="portada__autor">{meta.autor}</span>}
      </div>

      {elementos.map((elemento) => (
        <Puesto key={elemento.id} elemento={elemento} elegido={elegido === elemento.id} />
      ))}
    </div>
  );
}

/** Del nombre en español al valor de CSS. Escrito para no equivocarse. */
const ALINEACION = { izquierda: "left", centro: "center", derecha: "right" } as const;

/** Un elemento colocado a mano. */
function Puesto({ elemento, elegido }: { elemento: ElementoPortada; elegido: boolean }) {
  const estilo: CSSProperties = {
    left: `${elemento.x}%`,
    top: `${elemento.y}%`,
    width: `${elemento.ancho}%`,
    transform: `translate(-50%, -50%) rotate(${elemento.giro ?? 0}deg)`,
    opacity: elemento.opacidad ?? 1,
  };

  if (elemento.tipo === "imagen") {
    return (
      <img
        className={`portada__puesto portada__puesto--imagen${elegido ? " portada__puesto--elegido" : ""}`}
        style={{ ...estilo, borderRadius: `${elemento.redondez ?? 0}%` }}
        src={elemento.contenido}
        alt=""
        draggable={false}
        data-elemento={elemento.id}
      />
    );
  }

  return (
    <span
      className={`portada__puesto portada__puesto--texto${elegido ? " portada__puesto--elegido" : ""}`}
      style={{
        ...estilo,
        /* En `em` y no en píxeles: la portada se dibuja a tres tamaños distintos
           y solo el `em` los sigue a los tres. */
        fontSize: `${elemento.tamano ?? 1}em`,
        fontFamily: elemento.fuente ? pilaDe(elemento.fuente) : "var(--portada-fuente)",
        color: elemento.color || "var(--portada-tinta)",
        fontWeight: elemento.peso ?? 400,
        fontVariant: elemento.versalitas ? "small-caps" : "normal",
        lineHeight: elemento.interlineado ?? 1.25,
        letterSpacing: `${elemento.tracking ?? 0}em`,
        textAlign: ALINEACION[elemento.alineacion ?? "centro"],
      }}
      data-elemento={elemento.id}
    >
      {elemento.contenido}
    </span>
  );
}

/**
 * Encoger una imagen elegida hasta algo que un archivo de libro pueda llevar.
 *
 * La portada viaja DENTRO del Markdown, como data URI en la cabecera, para que
 * un libro siga siendo un archivo que se basta a sí mismo: se abre en Obsidian,
 * viaja en el espejo de la nube con todo lo demás, y un móvil que no ha visto
 * nunca el ordenador enseña la portada correcta. Eso solo funciona si la imagen
 * es pequeña — una portada se mira a unos cientos de píxeles y nunca más.
 */
export async function prepararImagen(fichero: File, ancho = 520): Promise<string> {
  const bitmap = await createImageBitmap(fichero);
  const escala = Math.min(1, ancho / bitmap.width);
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(bitmap.width * escala);
  lienzo.height = Math.round(bitmap.height * escala);
  const pincel = lienzo.getContext("2d");
  if (!pincel) {
    throw new Error("No se ha podido preparar la imagen.");
  }
  pincel.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
  bitmap.close?.();
  return lienzo.toDataURL("image/webp", 0.72);
}
