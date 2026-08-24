/**
 * La plaza: los libros que la gente ha decidido enseñar.
 *
 * QUÉ ES Y QUÉ NO ES. Es un escaparate, no una red social: hay portadas, se
 * pulsa una y se lee. No hay seguidores, ni «me gusta», ni comentarios, ni un
 * número al lado del nombre de nadie. Eso no es un olvido — en cuanto una
 * herramienta de escribir empieza a contar audiencia, se escribe para la
 * audiencia, y este programa existe para lo contrario.
 *
 * SE LEE SIN CUENTA. El escaparate y cada obra se sirven a quien llegue, y cada
 * una tiene su enlace propio: se puede mandar por mensaje a alguien que no ha
 * oído hablar de Pliego y funciona. La cuenta hace falta solo para PONER algo.
 *
 * LO PUBLICADO ES UNA COPIA CONGELADA, no el libro que se está escribiendo. Ver
 * el porqué en `datos/plaza.ts`.
 */

import { useEffect, useState } from "react";
import { leerEscaparate, leerObra, type FichaPlaza, type ObraPlaza } from "@/datos/plaza";
import { descomponer, metaPorDefecto, type Meta } from "@/nucleo/libro";
import { Icono } from "@/ui/Icono";
import { Pie } from "@/ui/Pie";
import { avisar } from "@/ui/Avisos";
import { Lector } from "./Lector";
import { Portada } from "./Portada";

/**
 * Dónde se publica de verdad, además de aquí.
 *
 * Está aquí y no escondido en un pie porque es honesto: esta plaza es un
 * escaparate pequeño de una aplicación pequeña, y alguien que acaba de terminar
 * un libro merece saber cuáles son los sitios donde se publica en serio. Una
 * herramienta que finge ser el final del camino le está haciendo un flaco favor
 * a quien la usa.
 */
const OTROS_SITIOS: { nombre: string; url: string; que: string }[] = [
  {
    nombre: "Wattpad",
    url: "https://www.wattpad.com/",
    que: "Publicar por capítulos y encontrar lectores. El más grande en español.",
  },
  {
    nombre: "Amazon KDP",
    url: "https://kdp.amazon.com/",
    que: "Autopublicar en papel y digital, con distribución y regalías.",
  },
  {
    nombre: "Lektu",
    url: "https://lektu.com/",
    que: "Tienda española de libro digital sin DRM, con «paga lo que quieras».",
  },
  {
    nombre: "Draft2Digital",
    url: "https://www.draft2digital.com/",
    que: "Un solo envío y tu libro entra en varias tiendas a la vez.",
  },
  {
    nombre: "Royal Road",
    url: "https://www.royalroad.com/",
    que: "Novela por entregas, sobre todo fantasía y ciencia ficción.",
  },
  {
    nombre: "Archive of Our Own",
    url: "https://archiveofourown.org/",
    que: "Sin ánimo de lucro, comunitario y sin publicidad.",
  },
  {
    nombre: "Standard Ebooks",
    url: "https://standardebooks.org/",
    que: "Clásicos de dominio público, cuidados hasta la última coma.",
  },
  {
    nombre: "Project Gutenberg",
    url: "https://www.gutenberg.org/",
    que: "Setenta mil libros libres. De donde salen las citas de la puerta.",
  },
];

export function Plaza({
  /** Qué obra hay abierta, si hay alguna. */
  obraAbierta,
  onAbrir,
  onVolver,
}: {
  obraAbierta: string | null;
  onAbrir: (id: string | null) => void;
  onVolver: () => void;
}) {
  const [obras, setObras] = useState<FichaPlaza[] | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [leyendo, setLeyendo] = useState<ObraPlaza | null>(null);

  useEffect(() => {
    let vivo = true;
    void leerEscaparate()
      .then((lista) => vivo && setObras(lista))
      .catch((error: Error) => vivo && setFallo(error.message));
    return () => {
      vivo = false;
    };
  }, []);

  /* La obra abierta viene del hash de la dirección, así que un enlace directo a
     una obra funciona aunque quien lo abra no haya pasado por el escaparate. */
  useEffect(() => {
    if (!obraAbierta) {
      setLeyendo(null);
      return;
    }
    let vivo = true;
    void leerObra(obraAbierta)
      .then((obra) => {
        if (!vivo) {
          return;
        }
        if (obra) {
          setLeyendo(obra);
        } else {
          avisar("Esa obra ya no está publicada.", "error");
          onAbrir(null);
        }
      })
      .catch((error: Error) => {
        if (vivo) {
          avisar(error.message, "error");
          onAbrir(null);
        }
      });
    return () => {
      vivo = false;
    };
  }, [obraAbierta, onAbrir]);

  return (
    <div className="inicio pantalla">
      <div className="inicio__dentro">
        <header className="inicio__cabecera">
          <div className="inicio__marca">
            <div className="marca">
              <span className="marca__nombre">
                La plaza<span className="marca__punto">.</span>
              </span>
            </div>
            <p className="inicio__saludo">
              Lo que otros han decidido enseñar. Se lee sin cuenta y sin instalar nada.
            </p>
          </div>

          <div className="inicio__acciones">
            <button type="button" className="boton" onClick={onVolver}>
              <Icono nombre="atras" /> <span className="boton__texto">Volver</span>
            </button>
          </div>
        </header>

        <section className="inicio__estante">
          {obras === null && !fallo && (
            <div className="rejilla esqueleto" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <div className="hueso" key={n} style={{ "--indice": n } as React.CSSProperties}>
                  <div className="hueso__portada" />
                  <div className="hueso__linea" />
                  <div className="hueso__linea hueso__linea--corta" />
                </div>
              ))}
            </div>
          )}

          {fallo && (
            <div className="vacio">
              <span style={{ color: "var(--tenue)" }}>
                <Icono nombre="aviso" tamano={28} />
              </span>
              <h3 className="vacio__titulo">La plaza no contesta</h3>
              <p className="vacio__texto">{fallo}</p>
            </div>
          )}

          {obras !== null && obras.length === 0 && (
            <div className="vacio">
              <span style={{ color: "var(--tenue)" }}>
                <Icono nombre="libro" tamano={28} />
              </span>
              <h3 className="vacio__titulo">Todavía no hay nada aquí</h3>
              <p className="vacio__texto">
                Cuando alguien publique un libro, aparecerá en esta pared. Puedes ser el primero:
                se hace desde Exportar, dentro de cualquier libro tuyo.
              </p>
            </div>
          )}

          {obras !== null && obras.length > 0 && (
            <div className="rejilla">
              {obras.map((obra, indice) => (
                <button
                  key={obra.id}
                  type="button"
                  className="obra"
                  style={{ "--indice": indice } as React.CSSProperties}
                  onClick={() => onAbrir(obra.id)}
                >
                  <span className="obra__portada">
                    <Portada meta={metaDeFicha(obra)} tamano="mini" />
                  </span>
                  <span className="obra__titulo">{obra.titulo}</span>
                  <span className="obra__pie">
                    {obra.autor || obra.usuario} · {obra.palabras.toLocaleString("es-ES")} palabras
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="inicio__estante">
          <h2 className="inicio__titulo">Dónde más se publica</h2>
          <p className="campo__nota" style={{ maxWidth: "42rem" }}>
            Esta plaza es un escaparate pequeño. Si acabas de terminar algo y quieres que lo lea
            gente de verdad, estos son los sitios donde se publica en serio. Ninguno tiene nada que
            ver con Pliego y no nos llevamos nada por mandarte allí.
          </p>
          <div className="sitios">
            {OTROS_SITIOS.map((sitio) => (
              <a
                key={sitio.nombre}
                className="sitio-externo"
                href={sitio.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                <span className="sitio-externo__nombre">
                  {sitio.nombre}
                  <Icono nombre="expandir" tamano={12} />
                </span>
                <span className="sitio-externo__que">{sitio.que}</span>
              </a>
            ))}
          </div>
        </section>
      </div>

      <Pie />

      {leyendo && (
        <Lector
          meta={metaDeObra(leyendo)}
          cuerpo={descomponer(leyendo.contenido).cuerpo}
          onCerrar={() => onAbrir(null)}
        />
      )}
    </div>
  );
}

/**
 * Una ficha del escaparate, vestida de libro para poder dibujar su portada.
 *
 * El componente de portada pide un `Meta` entero, y la ficha solo trae lo justo
 * — es todo lo que hace falta para pintarla y es la razón de que el escaparate
 * pese kilobytes y no megas. Aquí se le rellena el resto con lo de fábrica.
 */
function metaDeFicha(ficha: FichaPlaza): Meta {
  const base = metaPorDefecto(ficha.titulo);
  return {
    ...base,
    titulo: ficha.titulo,
    subtitulo: ficha.subtitulo,
    autor: ficha.autor || ficha.usuario,
    portada: { ...base.portada, ...((ficha.portada as object) ?? {}) },
  };
}

/** La obra publicada trae su archivo entero: de ahí sale el diseño de verdad. */
function metaDeObra(obra: ObraPlaza): Meta {
  const { meta } = descomponer(obra.contenido);
  return { ...meta, autor: meta.autor || obra.autor || obra.usuario };
}
