/**
 * Getting the book out of the app.
 *
 * Three ways out, and each is a real one:
 *
 *   Markdown  the file exactly as it is on disk, front matter and all. It opens
 *             in Obsidian, in any editor, in the next app he writes. This is the
 *             one that means the book is not trapped here.
 *   HTML      one self-contained page with the book set as it looks on screen,
 *             carrying its own @page rules so the browser's own "print to PDF"
 *             produces the right trim size with the right margins.
 *   Texto     the prose alone, no marks, no headings syntax — for pasting into
 *             a form, a submission, an email.
 *
 * No EPUB yet. A bad EPUB is worse than none: readers silently reflow anything
 * they do not like, and half the design on this screen would not survive.
 */

import { useEffect, useState } from "react";
import { contarPalabras, partirEnBloques } from "@/nucleo/bloques";
import { medidaMm, margenesMm } from "@/nucleo/geometria";
import { sinMarcas, trozos } from "@/nucleo/inline";
import { componer, type Meta } from "@/nucleo/libro";
import { numeroCapituloDe } from "@/nucleo/pagina";
import { idPrevisto, leerObra, publicar as publicarObra, retirar } from "@/datos/plaza";
import { leerSesion } from "@/datos/sesion";
import { avisar } from "@/ui/Avisos";
import { Icono } from "@/ui/Icono";
import { useSalida } from "@/ui/useSalida";

/**
 * Publicar en la plaza, o retirarlo.
 *
 * VIVE EN «EXPORTAR» Y NO EN UN BOTÓN DE LA BARRA, y es una decisión. Publicar
 * es sacar el libro de aquí, igual que descargarlo o imprimirlo: pertenece al
 * mismo cajón mental. Un botón propio en la barra del taller lo pondría a la
 * misma altura que negrita o cursiva, y sería mentira — esto no se hace
 * mientras se escribe, se hace cuando ya se ha escrito.
 *
 * SE DICE CLARAMENTE QUÉ SIGNIFICA antes de pulsar. Lo que sale de aquí lo
 * puede leer cualquiera con el enlace, sin cuenta y sin permiso; eso no puede
 * ir en letra pequeña debajo. Y se puede retirar en cualquier momento, que es
 * lo otro que hay que saber antes de decidirse.
 */
function Publicar({ meta, cuerpo, slug }: { meta: Meta; cuerpo: string; slug: string }) {
  const sesion = leerSesion();
  const [estado, setEstado] = useState<"quieto" | "yendo">("quieto");
  const [publicada, setPublicada] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  /* Si esta obra ya está en la plaza se sabe sin preguntar a nadie: el
     identificador se calcula igual aquí y en el servidor. */
  const id = sesion ? idPrevisto(sesion.usuario, slug) : null;
  const yaEsta = publicada ?? null;

  useEffect(() => {
    if (!id) {
      return;
    }
    let vivo = true;
    void leerObra(id)
      .then((obra) => vivo && setPublicada(obra ? id : null))
      .catch(() => {
        /* Sin red no se sabe, y no saberlo no es un error que merezca un
           cartel rojo: el botón dirá «Publicar» y publicar dos veces la misma
           obra la sustituye, que es justo lo que se querría. */
      });
    return () => {
      vivo = false;
    };
  }, [id]);

  if (!sesion) {
    return (
      <div className="grupo">
        <span className="grupo__titulo">La plaza</span>
        <p className="campo__nota">
          Entra con tu cuenta y podrás publicar este libro para que lo lea cualquiera.
        </p>
      </div>
    );
  }

  const mandar = async () => {
    setEstado("yendo");
    try {
      const nuevo = await publicarObra({
        slug,
        titulo: meta.titulo,
        subtitulo: meta.subtitulo,
        autor: meta.autor,
        palabras: contarPalabras(cuerpo),
        portada: meta.portada,
        contenido: componer(meta, cuerpo),
      });
      setPublicada(nuevo);
      setConfirmando(false);
      avisar("Publicado en la plaza.");
    } catch (error) {
      avisar((error as Error).message, "error");
    } finally {
      setEstado("quieto");
    }
  };

  const quitar = async () => {
    if (!yaEsta) {
      return;
    }
    setEstado("yendo");
    try {
      await retirar(yaEsta);
      setPublicada(null);
      avisar("Retirado de la plaza.");
    } catch (error) {
      avisar((error as Error).message, "error");
    } finally {
      setEstado("quieto");
    }
  };

  return (
    <div className="grupo">
      <span className="grupo__titulo">La plaza</span>

      {yaEsta ? (
        <>
          <div className="salvo">
            <span className="salvo__punto" />
            <div className="salvo__texto">
              <strong>Está publicado</strong>
              <p className="campo__nota">
                Cualquiera puede leerlo con este enlace, sin cuenta. Vuelve a publicar cuando
                quieras y se actualiza con lo que hayas escrito desde entonces.
              </p>
            </div>
          </div>
          <label className="campo">
            <span className="campo__etiqueta">Enlace</span>
            <input
              className="entrada"
              readOnly
              value={`${window.location.origin}/#/plaza/${yaEsta}`}
              onFocus={(evento) => evento.currentTarget.select()}
            />
          </label>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="boton boton--principal"
              disabled={estado === "yendo"}
              onClick={() => void mandar()}
            >
              <Icono nombre="descargar" /> Actualizar
            </button>
            <button
              type="button"
              className="boton boton--peligro"
              disabled={estado === "yendo"}
              onClick={() => void quitar()}
            >
              <Icono nombre="papelera" /> Retirar
            </button>
          </div>
        </>
      ) : confirmando ? (
        <>
          <p className="campo__nota">
            <strong>Lo que va a pasar:</strong> se sube una copia de este libro tal y como está
            ahora —con su portada y su diseño— y aparece en la plaza. Lo podrá leer{" "}
            <strong>cualquiera con el enlace</strong>, sin cuenta y sin permiso. No se sube nada de
            lo que escribas después salvo que vuelvas a publicar, y puedes retirarlo cuando quieras.
          </p>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button
              type="button"
              className="boton boton--principal"
              disabled={estado === "yendo"}
              onClick={() => void mandar()}
            >
              {estado === "yendo" ? "Publicando…" : "Sí, publicarlo"}
            </button>
            <button type="button" className="boton" onClick={() => setConfirmando(false)}>
              Ahora no
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="campo__nota">
            Enseñarlo en la plaza, para que lo lea quien quiera. Se sube una copia; lo que escribas
            después no cambia lo que otros leen hasta que vuelvas a publicar.
          </p>
          <button type="button" className="boton" onClick={() => setConfirmando(true)}>
            <Icono nombre="libro" /> Publicar en la plaza
          </button>
        </>
      )}
    </div>
  );
}

export function Exportar({
  meta,
  cuerpo,
  slug,
  onCerrar,
}: {
  meta: Meta;
  cuerpo: string;
  slug: string;
  onCerrar: () => void;
}) {
  /* El panel se queda montado mientras se desliza hacia fuera. */
  const salida = useSalida(true, onCerrar);

  const [copiando, setCopiando] = useState(false);

  const bajar = (contenido: string, nombre: string, tipo: string) => {
    const enlace = document.createElement("a");
    const url = URL.createObjectURL(new Blob([contenido], { type: `${tipo};charset=utf-8` }));
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    // Revoking immediately can cancel the download in Firefox; a tick is enough.
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    avisar(`${nombre} descargado.`);
  };

  const copiar = async (contenido: string, que: string) => {
    setCopiando(true);
    try {
      await navigator.clipboard.writeText(contenido);
      avisar(`${que} copiado al portapapeles.`);
    } catch {
      avisar("El navegador no ha dejado copiar.", "error");
    } finally {
      setCopiando(false);
    }
  };

  const plano = textoPlano(cuerpo);

  return (
    <aside
      className={`panel${salida.cerrando ? " panel--cerrando" : ""}`}
      aria-label="Exportar"
      onAnimationEnd={salida.alTerminar}
    >
      <div className="panel__cabeza">
        <span className="panel__titulo">Exportar</span>
        <button type="button" className="boton boton--desnudo" onClick={salida.cerrar} title="Cerrar">
          <Icono nombre="cerrar" />
        </button>
      </div>

      <Publicar meta={meta} cuerpo={cuerpo} slug={slug} />

      <div className="grupo">
        <span className="grupo__titulo">Markdown</span>
        <p className="campo__nota">
          El archivo tal cual está en el disco, con su portada y su diseño en la cabecera. Se abre
          en Obsidian y en cualquier editor. Es el que garantiza que el libro no depende de esta
          aplicación.
        </p>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            type="button"
            className="boton"
            onClick={() => bajar(componer(meta, cuerpo), `${slug}.md`, "text/markdown")}
          >
            <Icono nombre="descargar" /> Descargar
          </button>
          <button
            type="button"
            className="boton"
            disabled={copiando}
            onClick={() => void copiar(componer(meta, cuerpo), "El Markdown")}
          >
            <Icono nombre="copiar" /> Copiar
          </button>
        </div>
      </div>

      <div className="grupo">
        <span className="grupo__titulo">Para imprimir o hacer un PDF</span>
        <p className="campo__nota">
          Una página HTML que se lleva dentro el tamaño de papel ({Math.round(medidaMm(meta.diseno).ancho)}
          {" × "}
          {Math.round(medidaMm(meta.diseno).alto)} mm), los márgenes y la tipografía. Ábrela e
          imprime: elige «Guardar como PDF» y marca «Márgenes: ninguno» para que salga a tamaño
          real.
        </p>
        <button
          type="button"
          className="boton boton--principal"
          onClick={() => bajar(aHtml(meta, cuerpo), `${slug}.html`, "text/html")}
        >
          <Icono nombre="imprimir" /> Descargar el HTML
        </button>
      </div>

      <div className="grupo">
        <span className="grupo__titulo">Texto limpio</span>
        <p className="campo__nota">
          Solo la prosa: sin asteriscos, sin almohadillas, con los capítulos como líneas sueltas.{" "}
          {plano.length.toLocaleString("es-ES")} caracteres.
        </p>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            type="button"
            className="boton"
            onClick={() => bajar(plano, `${slug}.txt`, "text/plain")}
          >
            <Icono nombre="descargar" /> Descargar
          </button>
          <button
            type="button"
            className="boton"
            disabled={copiando}
            onClick={() => void copiar(plano, "El texto")}
          >
            <Icono nombre="copiar" /> Copiar
          </button>
        </div>
      </div>
    </aside>
  );
}

/** The prose with every mark removed, chapters left as their own lines. */
function textoPlano(cuerpo: string): string {
  return partirEnBloques(cuerpo)
    .map((bloque) => {
      if (bloque.nivel === -1) {
        return "* * *";
      }
      return sinMarcas(bloque.texto);
    })
    .join("\n\n");
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

function escapar(texto: string): string {
  return texto.replace(/[&<>"]/g, (caracter) => ESCAPES[caracter] ?? caracter);
}

function conMarcas(texto: string): string {
  return trozos(texto)
    .map((trozo) => {
      const limpio = escapar(trozo.texto);
      if (trozo.fuerte && trozo.cursiva) {
        return `<strong><em>${limpio}</em></strong>`;
      }
      if (trozo.fuerte) {
        return `<strong>${limpio}</strong>`;
      }
      return trozo.cursiva ? `<em>${limpio}</em>` : limpio;
    })
    .join("");
}

/**
 * One self-contained page carrying its own print rules.
 *
 * `@page` with the real trim size is what makes the browser's PDF export come
 * out at 148 × 210 instead of A4 with the book floating in the middle. The
 * margins go on `@page` too, not on the body, so the running heads could later
 * live in the page margin boxes if a browser ever supports them properly.
 */
function aHtml(meta: Meta, cuerpo: string): string {
  const { diseno } = meta;
  const mm = medidaMm(diseno);
  const margen = margenesMm(diseno);
  const bloques = partirEnBloques(cuerpo);
  let capitulo = 0;
  let primero = true;

  const partes: string[] = [];
  for (const bloque of bloques) {
    if (bloque.nivel === -1) {
      partes.push(`<p class="dinkus">* * *</p>`);
      primero = true;
      continue;
    }
    if (bloque.nivel === 1) {
      capitulo += 1;
      primero = true;
      const numero = numeroCapituloDe(capitulo, diseno);
      partes.push(
        `<h2${capitulo === 1 ? ' class="primero"' : ""}>${
          numero ? `<span class="n">${escapar(numero)}</span>` : ""
        }${conMarcas(bloque.texto)}</h2>`,
      );
      continue;
    }
    if (bloque.nivel >= 2) {
      primero = true;
      partes.push(`<h3>${conMarcas(bloque.texto)}</h3>`);
      continue;
    }
    const clases = [
      bloque.primero && primero && diseno.capitular && "capitular",
      !bloque.primero && diseno.sangria && "sangrado",
    ]
      .filter(Boolean)
      .join(" ");
    if (bloque.primero) {
      primero = false;
    }
    partes.push(`<p${clases ? ` class="${clases}"` : ""}>${conMarcas(bloque.texto)}</p>`);
  }

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escapar(meta.titulo)}</title>
<style>
  @page {
    size: ${mm.ancho}mm ${mm.alto}mm;
    margin: ${margen.arriba}mm ${margen.corte}mm ${margen.abajo}mm ${margen.lomo}mm;
  }
  html { background: #d8d7d2; }
  body {
    margin: 0 auto;
    padding: ${margen.arriba}mm ${margen.corte}mm ${margen.abajo}mm ${margen.lomo}mm;
    max-width: ${mm.ancho}mm;
    background: #fdfcf9;
    color: #16171a;
    font-family: ${diseno.fuentePila};
    font-size: ${diseno.tamano}pt;
    line-height: ${diseno.interlineado};
    letter-spacing: ${diseno.tracking}em;
    text-align: ${diseno.justificado ? "justify" : "left"};
    hyphens: ${diseno.guiones ? "auto" : "manual"};
    font-variant-numeric: oldstyle-nums;
    orphans: 2;
    widows: 2;
  }
  p { margin: 0 0 ${diseno.espacioParrafo}em; }
  p.sangrado { text-indent: ${diseno.sangriaEm}em; }
  p.capitular::first-letter {
    float: left;
    /* Em box = lines × leading, and its own line-height is 1 — see pagina.css. */
    font-size: ${(diseno.capitularLineas * diseno.interlineado).toFixed(2)}em;
    line-height: 1;
    margin-top: -0.08em;
    padding-right: 0.06em;
  }
  h2 {
    ${diseno.capituloEn === "seguido" ? "" : "break-before: page; page-break-before: always;"}
    break-after: avoid;
    margin: ${diseno.capituloEn === "seguido" ? "2em 0 1em" : "0 0 1.6em"};
    font-size: ${diseno.tituloCapitulo === "grande" ? "1.7em" : "1.05em"};
    font-weight: 600;
    text-align: ${diseno.tituloCapitulo === "discreto" ? "left" : "center"};
    ${diseno.tituloCapitulo === "versalitas" ? "text-transform: uppercase; letter-spacing: .22em; font-size: 1em;" : ""}
  }
  h2.primero { break-before: auto; page-break-before: auto; }
  h2 .n {
    display: block;
    font-size: .5em;
    font-weight: 400;
    letter-spacing: .28em;
    text-transform: uppercase;
    opacity: .55;
    margin-bottom: 1.2em;
  }
  h3 { font-size: 1.05em; margin: 1.4em 0 .6em; break-after: avoid; }
  .dinkus { text-align: center; letter-spacing: .5em; text-indent: .5em; margin: 1.4em 0; opacity: .55; }
  @media print { html, body { background: #fff; } body { padding: 0; max-width: none; } }
</style>
</head>
<body>
${partes.join("\n")}
</body>
</html>`;
}
