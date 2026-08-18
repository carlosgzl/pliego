/**
 * El panel de diseño: cómo se ve el libro.
 *
 * REWRITTEN after the owner's verdict — «no es entendible y además se ve
 * horrible». Three things were wrong and all three are fixed here:
 *
 * 1. NO PICTURE. Thirty controls and no page in sight, so you moved something
 *    called "interlineado" and had to go looking for the effect. On a phone the
 *    panel covered the galley completely, so you could not look at all. Now a
 *    real page sits at the top of the panel, pinned, and every control is next
 *    to the thing it changes.
 * 2. PICKING BLIND. Typefaces in a dropdown of names, and six design recipes
 *    described in words. Now every typeface is drawn in itself and every recipe
 *    is a stamp of your own book set that way — you choose by looking.
 * 3. NUMBERS INSTEAD OF WORDS. «1.42 ×» means nothing to a writer. Every slider
 *    now says what it IS at that value — «normal», «holgado», «de bolsillo».
 *
 * The order of the tabs is the order the decisions actually happen in: pick a
 * whole style, then the letter, then the paper, then the cover.
 */

import { useRef, useState, type ChangeEvent } from "react";
import { useSalida } from "@/ui/useSalida";
import { FUENTES, GRUPOS_FUENTE, pilaDe } from "@/nucleo/fuentes";
import { FORMATOS, MARGENES, juzgarMedida, medidaEnCaracteres } from "@/nucleo/geometria";
import type { Diseno, Meta, Portada as TipoPortada } from "@/nucleo/libro";
import { RECETAS } from "@/nucleo/recetas";
import { avisar } from "@/ui/Avisos";
import { Icono } from "@/ui/Icono";
import { MiniPagina } from "./MiniPagina";
import { Portada, prepararImagen } from "./Portada";

type Pestana = "estilo" | "letra" | "pagina" | "portada";

const PESTANAS: { clave: Pestana; texto: string }[] = [
  { clave: "estilo", texto: "Estilo" },
  { clave: "letra", texto: "Letra" },
  { clave: "pagina", texto: "Página" },
  { clave: "portada", texto: "Portada" },
];

export function PanelDiseno({
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
  const [pestana, setPestana] = useState<Pestana>("estilo");
  /* Cerrar tiene que verse tanto como abrir: el panel se queda montado
     mientras se desliza hacia fuera. Ver `ui/useSalida.ts`. */
  const salida = useSalida(true, onCerrar);

  const cambiarDiseno = (cambios: Partial<Diseno>) => {
    const diseno = { ...meta.diseno, ...cambios };
    if (cambios.fuente) {
      diseno.fuentePila = pilaDe(cambios.fuente);
    }
    onCambiar({ ...meta, diseno });
  };

  const cambiarPortada = (cambios: Partial<TipoPortada>) => {
    onCambiar({ ...meta, portada: { ...meta.portada, ...cambios } });
  };

  return (
    <>
      {/* On a phone the panel is the whole screen. It used to be 88 % of it,
          and the strip of app left showing down the left-hand side — half of
          the page preview, cut off — read as a frame that meant nothing. */}
      <div
        className={`panel-velo${salida.cerrando ? " panel-velo--cerrando" : ""}`}
        onClick={salida.cerrar}
        role="presentation"
      />

      <aside
        className={`panel${salida.cerrando ? " panel--cerrando" : ""}`}
        aria-label="Diseño del libro"
        onAnimationEnd={salida.alTerminar}
      >
        <div className="panel__cabeza">
          <span className="panel__titulo">Diseño del libro</span>
          <button
            type="button"
            className="boton boton--desnudo"
            onClick={salida.cerrar}
            aria-label="Cerrar el diseño"
          >
            <Icono nombre="cerrar" />
          </button>
        </div>

        {/* The page, pinned. Everything below changes THIS. */}
        <div className="panel__muestra">
          {pestana === "portada" ? (
            <div className="panel__portada">
              <Portada meta={meta} tamano="mini" />
            </div>
          ) : (
            <MiniPagina meta={meta} cuerpo={cuerpo} alto={168} />
          )}
        </div>

        <div className="panel__pestanas" role="tablist">
          {PESTANAS.map(({ clave, texto }) => (
            <button
              key={clave}
              type="button"
              role="tab"
              aria-selected={pestana === clave}
              className={`pestana${pestana === clave ? " pestana--aqui" : ""}`}
              onClick={() => setPestana(clave)}
            >
              {texto}
            </button>
          ))}
        </div>

        <div className="panel__cuerpo">
          {pestana === "estilo" && (
            <Estilo meta={meta} cuerpo={cuerpo} onCambiar={onCambiar} />
          )}
          {pestana === "letra" && <Letra diseno={meta.diseno} onCambiar={cambiarDiseno} />}
          {pestana === "pagina" && <Pagina diseno={meta.diseno} onCambiar={cambiarDiseno} />}
          {pestana === "portada" && (
            <PortadaAjustes meta={meta} onCambiar={onCambiar} onCambiarPortada={cambiarPortada} />
          )}
        </div>
      </aside>
    </>
  );
}

/* ── Estilo: whole designs, and the book's own details ────────────────────── */

function Estilo({
  meta,
  cuerpo,
  onCambiar,
}: {
  meta: Meta;
  cuerpo: string;
  onCambiar: (meta: Meta) => void;
}) {
  return (
    <>
      <div className="grupo">
        <span className="grupo__titulo">Elige cómo quieres que sea</span>
        <p className="campo__nota">
          Cada uno es una página entera y coherente, con su letra, sus márgenes y sus capítulos ya
          puestos de acuerdo. Elige el que más se parezca a tu libro; después puedes cambiar lo que
          quieras.
        </p>
        <div className="sellos">
          {RECETAS.map((receta) => {
            const suDiseno = { ...receta.diseno, fuentePila: pilaDe(receta.diseno.fuente) };
            const puesto = mismoDiseno(meta.diseno, suDiseno);
            return (
              <button
                key={receta.clave}
                type="button"
                className={`sello${puesto ? " sello--aqui" : ""}`}
                onClick={() => {
                  onCambiar({ ...meta, diseno: suDiseno });
                  avisar(`Estilo «${receta.nombre}».`);
                }}
                title={receta.que}
              >
                <span className="sello__hoja">
                  <MiniPagina meta={{ ...meta, diseno: suDiseno }} cuerpo={cuerpo} alto={112} />
                </span>
                <span className="sello__nombre">{receta.nombre}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grupo">
        <span className="grupo__titulo">De qué libro se trata</span>
        <Texto
          etiqueta="Título"
          valor={meta.titulo}
          onCambiar={(titulo) => onCambiar({ ...meta, titulo })}
        />
        <Texto
          etiqueta="Subtítulo"
          valor={meta.subtitulo}
          onCambiar={(subtitulo) => onCambiar({ ...meta, subtitulo })}
        />
        <Texto
          etiqueta="Autor"
          valor={meta.autor}
          onCambiar={(autor) => onCambiar({ ...meta, autor })}
        />
        <Texto
          etiqueta="Dedicatoria"
          valor={meta.dedicatoria}
          onCambiar={(dedicatoria) => onCambiar({ ...meta, dedicatoria })}
        />
        <div className="campo">
          <span className="campo__etiqueta">Por dónde va</span>
          <Segmentado
            opciones={[
              { valor: "idea", texto: "Idea" },
              { valor: "borrador", texto: "Borrador" },
              { valor: "revisión", texto: "Revisión" },
              { valor: "terminado", texto: "Hecho" },
            ]}
            valor={meta.estado}
            onCambiar={(estado) => onCambiar({ ...meta, estado })}
          />
        </div>
        <Numero
          etiqueta="Cuántas palabras quieres llegar a escribir"
          nota="Déjalo en 0 si no quieres marcarte ninguna meta."
          valor={meta.meta ?? 0}
          minimo={0}
          maximo={500000}
          paso={5000}
          onCambiar={(valor) => onCambiar({ ...meta, meta: valor })}
        />
      </div>
    </>
  );
}

/** Whether two designs would print the same page. */
function mismoDiseno(a: Diseno, b: Diseno): boolean {
  const claves = Object.keys(b) as (keyof Diseno)[];
  return claves.every((clave) => clave === "fuentePila" || a[clave] === b[clave]);
}

/* ── Letra ────────────────────────────────────────────────────────────────── */

const TAMANOS: [number, string][] = [
  [9, "muy pequeña"],
  [10, "pequeña"],
  [11, "normal"],
  [12, "cómoda"],
  [14, "grande"],
  [18, "muy grande"],
];

const INTERLINEADOS: [number, string][] = [
  [1.2, "apretado"],
  [1.35, "justo"],
  [1.5, "normal"],
  [1.75, "holgado"],
  [2.2, "a doble espacio"],
];

/** The word for a value: the last label whose threshold it has reached. */
function palabraDe(escala: [number, string][], valor: number): string {
  let texto = escala[0]![1];
  for (const [limite, nombre] of escala) {
    if (valor >= limite) {
      texto = nombre;
    }
  }
  return texto;
}

function Letra({
  diseno,
  onCambiar,
}: {
  diseno: Diseno;
  onCambiar: (cambios: Partial<Diseno>) => void;
}) {
  const caracteres = medidaEnCaracteres(diseno);
  const juicio = juzgarMedida(caracteres);

  return (
    <>
      <div className="grupo">
        <span className="grupo__titulo">La letra del libro</span>
        <p className="campo__nota">Cada nombre está escrito con su propia letra.</p>
        {GRUPOS_FUENTE.map((grupo) => {
          const fuentes = FUENTES.filter((fuente) => fuente.grupo === grupo.grupo);
          if (fuentes.length === 0) {
            return null;
          }
          return (
            <div key={grupo.grupo} className="campo">
              <span className="campo__etiqueta">{grupo.titulo}</span>
              <ListaFuentes
                valor={diseno.fuente}
                fuentes={fuentes}
                onCambiar={(fuente) => onCambiar({ fuente })}
              />
            </div>
          );
        })}
      </div>

      <div className="grupo">
        <span className="grupo__titulo">Tamaño y aire</span>
        <Rango
          etiqueta="Tamaño de la letra"
          valor={diseno.tamano}
          palabra={palabraDe(TAMANOS, diseno.tamano)}
          minimo={7}
          maximo={18}
          paso={0.5}
          onCambiar={(tamano) => onCambiar({ tamano })}
        />
        <Rango
          etiqueta="Espacio entre renglones"
          valor={diseno.interlineado}
          palabra={palabraDe(INTERLINEADOS, diseno.interlineado)}
          minimo={1}
          maximo={2.2}
          paso={0.02}
          onCambiar={(interlineado) => onCambiar({ interlineado })}
        />
        <p className={`aviso-medida${juicio === "buena" ? "" : " aviso-medida--mal"}`}>
          <strong>{caracteres} letras por renglón.</strong>{" "}
          {juicio === "buena"
            ? "Es la medida cómoda de leer."
            : juicio === "corta"
              ? "Renglón corto: el ojo salta mucho. Prueba a bajar el tamaño o a estrechar los márgenes."
              : "Renglón largo: cuesta encontrar el siguiente. Prueba a subir el tamaño o a ensanchar los márgenes."}
        </p>
      </div>

      <div className="grupo">
        <span className="grupo__titulo">Los párrafos</span>
        <Interruptor
          etiqueta="Alinear los dos lados"
          nota="Como un libro impreso: los renglones acaban todos en la misma vertical."
          valor={diseno.justificado}
          onCambiar={(justificado) => onCambiar({ justificado })}
        />
        <Interruptor
          etiqueta="Partir palabras con guion"
          nota="Evita los huecos grandes entre palabras al alinear."
          valor={diseno.guiones}
          onCambiar={(guiones) => onCambiar({ guiones })}
        />
        <Interruptor
          etiqueta="Empezar cada párrafo un poco a la derecha"
          nota="Lo que hace un libro. La otra forma es separarlos con un hueco."
          valor={diseno.sangria}
          onCambiar={(sangria) => onCambiar({ sangria })}
        />
        {diseno.sangria ? (
          <Rango
            etiqueta="Cuánto entra"
            valor={diseno.sangriaEm}
            palabra={diseno.sangriaEm < 1 ? "poco" : diseno.sangriaEm > 1.8 ? "mucho" : "normal"}
            minimo={0.5}
            maximo={3}
            paso={0.1}
            onCambiar={(sangriaEm) => onCambiar({ sangriaEm })}
          />
        ) : (
          <Rango
            etiqueta="Hueco entre párrafos"
            valor={diseno.espacioParrafo}
            palabra={
              diseno.espacioParrafo === 0
                ? "ninguno"
                : diseno.espacioParrafo < 0.6
                  ? "poco"
                  : "amplio"
            }
            minimo={0}
            maximo={1.5}
            paso={0.05}
            onCambiar={(espacioParrafo) => onCambiar({ espacioParrafo })}
          />
        )}
      </div>

      <div className="grupo">
        <span className="grupo__titulo">Cómo empieza cada capítulo</span>
        <Interruptor
          etiqueta="Letra grande al empezar"
          nota="La capitular: la primera letra ocupa varios renglones."
          valor={diseno.capitular}
          onCambiar={(capitular) => onCambiar({ capitular })}
        />
        {diseno.capitular && (
          <Rango
            etiqueta="Cuánto ocupa"
            valor={diseno.capitularLineas}
            palabra={`${diseno.capitularLineas} renglones`}
            minimo={2}
            maximo={5}
            paso={1}
            onCambiar={(capitularLineas) => onCambiar({ capitularLineas })}
          />
        )}
        <Interruptor
          etiqueta="Primer renglón en mayúsculas pequeñas"
          nota="Un recurso clásico que hace que el capítulo arranque con calma."
          valor={diseno.versalitas}
          onCambiar={(versalitas) => onCambiar({ versalitas })}
        />
      </div>
    </>
  );
}

function ListaFuentes({
  fuentes,
  valor,
  onCambiar,
}: {
  fuentes: typeof FUENTES;
  valor: string;
  onCambiar: (clave: string) => void;
}) {
  return (
    <div className="fuentes">
      {fuentes.map((fuente) => (
        <button
          key={fuente.key}
          type="button"
          className={`fuente${valor === fuente.key ? " fuente--aqui" : ""}`}
          onClick={() => onCambiar(fuente.key)}
        >
          <span className="fuente__muestra" style={{ fontFamily: fuente.stack }}>
            {fuente.name}
          </span>
          <span className="fuente__nombre">{fuente.hint}</span>
          {valor === fuente.key && (
            <span className="fuente__marca">
              <Icono nombre="guardado" tamano={13} />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ── Página ───────────────────────────────────────────────────────────────── */

function Pagina({
  diseno,
  onCambiar,
}: {
  diseno: Diseno;
  onCambiar: (cambios: Partial<Diseno>) => void;
}) {
  return (
    <>
      <div className="grupo">
        <span className="grupo__titulo">Tamaño del papel</span>
        <div className="opciones">
          {FORMATOS.map((formato) => (
            <button
              key={formato.clave}
              type="button"
              className={`opcion${diseno.pagina === formato.clave ? " opcion--aqui" : ""}`}
              onClick={() => onCambiar({ pagina: formato.clave })}
            >
              <span className="opcion__nombre">{formato.nombre}</span>
              <span className="opcion__que">{formato.hint}</span>
            </button>
          ))}
        </div>
        {diseno.pagina === "personalizada" && (
          <div className="pareja">
            <Numero
              etiqueta="Ancho (mm)"
              valor={diseno.anchoMm}
              minimo={70}
              maximo={420}
              paso={1}
              onCambiar={(anchoMm) => onCambiar({ anchoMm })}
            />
            <Numero
              etiqueta="Alto (mm)"
              valor={diseno.altoMm}
              minimo={100}
              maximo={594}
              paso={1}
              onCambiar={(altoMm) => onCambiar({ altoMm })}
            />
          </div>
        )}
      </div>

      <div className="grupo">
        <span className="grupo__titulo">Márgenes</span>
        <div className="opciones">
          {MARGENES.map((margen) => (
            <button
              key={margen.clave}
              type="button"
              className={`opcion${diseno.margenes === margen.clave ? " opcion--aqui" : ""}`}
              onClick={() => onCambiar({ margenes: margen.clave })}
            >
              <span className="opcion__nombre">{margen.nombre}</span>
              <span className="opcion__que">{margen.hint}</span>
            </button>
          ))}
        </div>
        {diseno.margenes === "personalizados" && (
          <>
            <div className="pareja">
              <Numero
                etiqueta="Arriba (mm)"
                valor={diseno.margenArriba}
                minimo={5}
                maximo={60}
                paso={1}
                onCambiar={(margenArriba) => onCambiar({ margenArriba })}
              />
              <Numero
                etiqueta="Abajo (mm)"
                valor={diseno.margenAbajo}
                minimo={5}
                maximo={60}
                paso={1}
                onCambiar={(margenAbajo) => onCambiar({ margenAbajo })}
              />
            </div>
            <div className="pareja">
              <Numero
                etiqueta="Interior (mm)"
                valor={diseno.margenLomo}
                minimo={5}
                maximo={60}
                paso={1}
                onCambiar={(margenLomo) => onCambiar({ margenLomo })}
              />
              <Numero
                etiqueta="Exterior (mm)"
                valor={diseno.margenCorte}
                minimo={5}
                maximo={60}
                paso={1}
                onCambiar={(margenCorte) => onCambiar({ margenCorte })}
              />
            </div>
            <p className="campo__nota">
              El margen interior es el del lomo: en un libro cosido, parte de él se pierde dentro de
              la encuadernación, así que suele hacerse un poco más ancho.
            </p>
          </>
        )}
      </div>

      <div className="grupo">
        <span className="grupo__titulo">Los capítulos</span>
        <div className="campo">
          <span className="campo__etiqueta">Dónde empieza cada uno</span>
          <Segmentado
            opciones={[
              { valor: "pagina-nueva", texto: "Página nueva" },
              { valor: "pagina-impar", texto: "A la derecha" },
              { valor: "seguido", texto: "Seguido" },
            ]}
            valor={diseno.capituloEn}
            onCambiar={(capituloEn) =>
              onCambiar({ capituloEn: capituloEn as Diseno["capituloEn"] })
            }
          />
        </div>
        <div className="campo">
          <span className="campo__etiqueta">Cómo se ve el título</span>
          <Segmentado
            opciones={[
              { valor: "grande", texto: "Grande" },
              { valor: "discreto", texto: "Discreto" },
              { valor: "versalitas", texto: "En mayúsculas" },
            ]}
            valor={diseno.tituloCapitulo}
            onCambiar={(tituloCapitulo) =>
              onCambiar({ tituloCapitulo: tituloCapitulo as Diseno["tituloCapitulo"] })
            }
          />
        </div>
        <div className="campo">
          <span className="campo__etiqueta">Número encima del título</span>
          <Segmentado
            opciones={[
              { valor: "ninguno", texto: "Sin" },
              { valor: "romano", texto: "IX" },
              { valor: "arabigo", texto: "9" },
              { valor: "palabra", texto: "Nueve" },
            ]}
            valor={diseno.numeroCapitulo}
            onCambiar={(numeroCapitulo) =>
              onCambiar({ numeroCapitulo: numeroCapitulo as Diseno["numeroCapitulo"] })
            }
          />
        </div>
        <div className="campo">
          <span className="campo__etiqueta">Marca entre escenas</span>
          <Segmentado
            opciones={[
              { valor: "linea-en-blanco", texto: "Un hueco" },
              { valor: "asteriscos", texto: "* * *" },
              { valor: "rombo", texto: "◆" },
              { valor: "regla", texto: "———" },
            ]}
            valor={diseno.dinkus}
            onCambiar={(dinkus) => onCambiar({ dinkus: dinkus as Diseno["dinkus"] })}
          />
        </div>
      </div>

      <div className="grupo">
        <span className="grupo__titulo">Cabecera y número de página</span>
        <div className="campo">
          <span className="campo__etiqueta">Qué se lee arriba de cada página</span>
          <div className="opciones">
            {(
              [
                ["autor-titulo", "Tu nombre y el título", "El nombre a la izquierda, el título a la derecha. Lo habitual."],
                ["titulo", "Solo el título", "Más discreto."],
                ["capitulo", "El título y el capítulo", "Útil en ensayo y manuales."],
                ["ninguno", "Nada", "La página limpia."],
              ] as const
            ).map(([valor, nombre, que]) => (
              <button
                key={valor}
                type="button"
                className={`opcion${diseno.encabezado === valor ? " opcion--aqui" : ""}`}
                onClick={() => onCambiar({ encabezado: valor })}
              >
                <span className="opcion__nombre">{nombre}</span>
                <span className="opcion__que">{que}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="campo">
          <span className="campo__etiqueta">Numerar las páginas</span>
          <Segmentado
            opciones={[
              { valor: "arabigos", texto: "1, 2, 3" },
              { valor: "romanos", texto: "i, ii, iii" },
              { valor: "ninguna", texto: "Sin número" },
            ]}
            valor={diseno.numeracion}
            onCambiar={(numeracion) =>
              onCambiar({ numeracion: numeracion as Diseno["numeracion"] })
            }
          />
        </div>
        {diseno.numeracion !== "ninguna" && (
          <div className="campo">
            <span className="campo__etiqueta">Dónde va el número</span>
            <Segmentado
              opciones={[
                { valor: "pie-centro", texto: "Abajo, centrado" },
                { valor: "pie-fuera", texto: "Abajo, al borde" },
                { valor: "cabeza-fuera", texto: "Arriba" },
              ]}
              valor={diseno.folio}
              onCambiar={(folio) => onCambiar({ folio: folio as Diseno["folio"] })}
            />
          </div>
        )}
      </div>
    </>
  );
}

/* ── Portada ──────────────────────────────────────────────────────────────── */

const TINTAS = [
  "#2f3e4f",
  "#1c1c1e",
  "#7a2e1e",
  "#3d5a80",
  "#4a5d3a",
  "#6b4a7a",
  "#8a6d3b",
  "#9c3b28",
  "#26453f",
  "#b0763a",
  "#f4f1ea",
  "#d9d3c7",
];

const ESTILOS_PORTADA: [TipoPortada["diseno"], string, string][] = [
  ["sello", "Sello", "Una raya sobre el título"],
  ["franja", "Franja", "Una banda más oscura detrás"],
  ["liso", "Liso", "Solo color y letras"],
  ["rejilla", "Rejilla", "Una cuadrícula muy tenue"],
  ["medianoche", "Medianoche", "Un halo de luz arriba"],
];

function PortadaAjustes({
  meta,
  onCambiar,
  onCambiarPortada,
}: {
  meta: Meta;
  onCambiar: (meta: Meta) => void;
  onCambiarPortada: (cambios: Partial<TipoPortada>) => void;
}) {
  const entradaFichero = useRef<HTMLInputElement>(null);
  const { portada } = meta;

  const elegirImagen = async (evento: ChangeEvent<HTMLInputElement>) => {
    const fichero = evento.target.files?.[0];
    evento.target.value = "";
    if (!fichero) {
      return;
    }
    try {
      onCambiarPortada({ imagen: await prepararImagen(fichero) });
    } catch {
      avisar("No se ha podido leer esa imagen.", "error");
    }
  };

  return (
    <>
      <div className="grupo">
        <span className="grupo__titulo">Estilo</span>
        <div className="opciones">
          {ESTILOS_PORTADA.map(([valor, nombre, que]) => (
            <button
              key={valor}
              type="button"
              className={`opcion${portada.diseno === valor ? " opcion--aqui" : ""}`}
              onClick={() => onCambiarPortada({ diseno: valor })}
            >
              <span className="opcion__nombre">{nombre}</span>
              <span className="opcion__que">{que}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grupo">
        <span className="grupo__titulo">Color del fondo</span>
        <Colores
          valor={portada.color}
          onCambiar={(color) => onCambiarPortada({ color })}
          etiqueta="Color del fondo a medida"
        />
        <span className="grupo__titulo">Color de las letras</span>
        <Colores
          valor={portada.tinta}
          onCambiar={(tinta) => onCambiarPortada({ tinta })}
          etiqueta="Color de las letras a medida"
        />
      </div>

      <div className="grupo">
        <span className="grupo__titulo">La letra de la portada</span>
        <ListaFuentes
          fuentes={FUENTES}
          valor={portada.fuente}
          onCambiar={(fuente) => onCambiarPortada({ fuente })}
        />
      </div>

      <div className="grupo">
        <span className="grupo__titulo">Una imagen</span>
        <input
          ref={entradaFichero}
          type="file"
          accept="image/*"
          hidden
          onChange={(evento) => void elegirImagen(evento)}
        />
        <div className="pareja">
          <button type="button" className="boton" onClick={() => entradaFichero.current?.click()}>
            <Icono nombre="mas" /> {portada.imagen ? "Cambiar" : "Poner una"}
          </button>
          {portada.imagen && (
            <button
              type="button"
              className="boton boton--peligro"
              onClick={() => onCambiarPortada({ imagen: null })}
            >
              <Icono nombre="papelera" /> Quitar
            </button>
          )}
        </div>
        {portada.imagen && (
          <>
            <div className="campo">
              <span className="campo__etiqueta">Dónde va</span>
              <Segmentado
                opciones={[
                  { valor: "arriba", texto: "Arriba" },
                  { valor: "abajo", texto: "Abajo" },
                  { valor: "ventana", texto: "En medio" },
                  { valor: "completa", texto: "Toda" },
                ]}
                valor={portada.colocacion}
                onCambiar={(colocacion) =>
                  onCambiarPortada({ colocacion: colocacion as TipoPortada["colocacion"] })
                }
              />
            </div>
            <div className="campo">
              <span className="campo__etiqueta">Si no encaja</span>
              <Segmentado
                opciones={[
                  { valor: "cubrir", texto: "Recortarla" },
                  { valor: "contener", texto: "Verla entera" },
                ]}
                valor={portada.encaje}
                onCambiar={(encaje) => onCambiarPortada({ encaje: encaje as TipoPortada["encaje"] })}
              />
            </div>
            <p className="campo__nota">
              La imagen viaja dentro del propio archivo del libro, reducida: así el libro sigue
              siendo un solo fichero y la portada se ve también en el móvil.
            </p>
          </>
        )}
      </div>

      <div className="grupo">
        <span className="grupo__titulo">Cómo lo imaginas encuadernado</span>
        <Segmentado
          opciones={[
            { valor: "", texto: "—" },
            { valor: "rústica", texto: "Rústica" },
            { valor: "tela", texto: "Tela" },
            { valor: "cartoné", texto: "Cartoné" },
          ]}
          valor={meta.encuadernacion ?? ""}
          onCambiar={(valor) => onCambiar({ ...meta, encuadernacion: valor || undefined })}
        />
        <p className="campo__nota">Es una nota tuya: no cambia nada en pantalla.</p>
      </div>
    </>
  );
}

function Colores({
  valor,
  onCambiar,
  etiqueta,
}: {
  valor: string;
  onCambiar: (color: string) => void;
  etiqueta: string;
}) {
  return (
    <div className="colores">
      {TINTAS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={color}
          className={`color${valor === color ? " color--aqui" : ""}`}
          style={{ background: color }}
          onClick={() => onCambiar(color)}
        />
      ))}
      <label className="color color--libre" title={etiqueta}>
        <input
          type="color"
          value={valor}
          onChange={(evento) => onCambiar(evento.target.value)}
          aria-label={etiqueta}
        />
        <Icono nombre="mas" tamano={13} />
      </label>
    </div>
  );
}

/* ── Controles ────────────────────────────────────────────────────────────── */

function Texto({
  etiqueta,
  valor,
  onCambiar,
}: {
  etiqueta: string;
  valor: string;
  onCambiar: (valor: string) => void;
}) {
  return (
    <label className="campo">
      <span className="campo__etiqueta">{etiqueta}</span>
      <input
        className="entrada"
        value={valor}
        onChange={(evento) => onCambiar(evento.target.value)}
      />
    </label>
  );
}

function Numero({
  etiqueta,
  nota,
  valor,
  minimo,
  maximo,
  paso,
  onCambiar,
}: {
  etiqueta: string;
  nota?: string;
  valor: number;
  minimo: number;
  maximo: number;
  paso: number;
  onCambiar: (valor: number) => void;
}) {
  return (
    <label className="campo" style={{ flex: 1 }}>
      <span className="campo__etiqueta">{etiqueta}</span>
      <input
        className="entrada"
        type="number"
        value={valor}
        min={minimo}
        max={maximo}
        step={paso}
        onChange={(evento) => {
          const siguiente = Number.parseFloat(evento.target.value);
          if (Number.isFinite(siguiente)) {
            onCambiar(Math.min(maximo, Math.max(minimo, siguiente)));
          }
        }}
      />
      {nota && <span className="campo__nota">{nota}</span>}
    </label>
  );
}

/**
 * A slider that says what it IS, not what it measures.
 *
 * «1,42 ×» is a number a typesetter reads and a writer does not. The word is
 * the label; the figure stays, small, for when you do want to match two books.
 */
function Rango({
  etiqueta,
  valor,
  palabra,
  minimo,
  maximo,
  paso,
  onCambiar,
}: {
  etiqueta: string;
  valor: number;
  palabra: string;
  minimo: number;
  maximo: number;
  paso: number;
  onCambiar: (valor: number) => void;
}) {
  return (
    <label className="campo">
      <span className="campo__etiqueta">
        {etiqueta}
        <span className="campo__valor">
          {palabra} <span className="campo__cifra">{valor.toString().replace(".", ",")}</span>
        </span>
      </span>
      <input
        className="deslizador"
        type="range"
        value={valor}
        min={minimo}
        max={maximo}
        step={paso}
        onChange={(evento) => onCambiar(Number.parseFloat(evento.target.value))}
      />
    </label>
  );
}

function Interruptor({
  etiqueta,
  nota,
  valor,
  onCambiar,
}: {
  etiqueta: string;
  nota?: string;
  valor: boolean;
  onCambiar: (valor: boolean) => void;
}) {
  return (
    <label className="interruptor">
      <span className="interruptor__texto">
        <span>{etiqueta}</span>
        {nota && <span className="campo__nota">{nota}</span>}
      </span>
      <input
        type="checkbox"
        checked={valor}
        onChange={(evento) => onCambiar(evento.target.checked)}
      />
    </label>
  );
}

function Segmentado({
  opciones,
  valor,
  onCambiar,
}: {
  opciones: { valor: string; texto: string }[];
  valor: string;
  onCambiar: (valor: string) => void;
}) {
  return (
    <div className="segmentado">
      {opciones.map((opcion) => (
        <button
          key={opcion.valor}
          type="button"
          className={`segmentado__opcion${
            valor === opcion.valor ? " segmentado__opcion--aqui" : ""
          }`}
          onClick={() => onCambiar(opcion.valor)}
        >
          {opcion.texto}
        </button>
      ))}
    </div>
  );
}
