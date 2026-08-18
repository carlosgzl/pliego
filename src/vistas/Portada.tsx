/**
 * The cover.
 *
 * ONE COMPONENT, TWO SIZES, scaled by font-size alone — everything inside is in
 * `em`. A cover that looked one way on the shelf and another in the designer
 * would make the designer useless.
 *
 * The image gets a BAND rather than the whole jacket by default. A photograph
 * across the full cover swallows the title, and the title is the one thing a
 * cover has to do; giving the picture the top and keeping the lettering on
 * clear paper is what a real cover does.
 */

import type { CSSProperties } from "react";
import { pilaDe } from "@/nucleo/fuentes";
import type { Meta } from "@/nucleo/libro";

export function Portada({ meta, tamano }: { meta: Meta; tamano: "mini" | "grande" }) {
  const { portada } = meta;
  const estilo = {
    "--portada-color": portada.color,
    "--portada-tinta": portada.tinta,
    "--portada-fuente": pilaDe(portada.fuente),
    "--portada-encaje": portada.encaje === "contener" ? "contain" : "cover",
  } as CSSProperties;

  const completa = portada.colocacion === "completa";

  return (
    <div className={`portada portada--${portada.diseno} portada--${tamano}`} style={estilo}>
      {portada.imagen && (
        <img
          className={`portada__imagen portada__imagen--${portada.colocacion}`}
          src={portada.imagen}
          alt=""
        />
      )}
      {portada.imagen && completa && <div className="portada__velo" />}
      <div
        className={`portada__letras${
          portada.colocacion === "abajo" ? " portada__letras--arriba" : ""
        }`}
      >
        <span className="portada__titulo">{meta.titulo}</span>
        {meta.subtitulo && <span className="portada__sub">{meta.subtitulo}</span>}
        {meta.autor && <span className="portada__autor">{meta.autor}</span>}
      </div>
    </div>
  );
}

/**
 * Shrink a chosen image down to something a book file can carry.
 *
 * The cover travels INSIDE the Markdown, as a data URI in the front matter, so
 * a book stays one self-contained file: it opens in Obsidian, it rides in the
 * cloud mirror with everything else, and a phone that has never seen the PC
 * still shows the right cover. That only works if the picture is small — a
 * cover is read at a few hundred pixels and never more.
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
