/**
 * The design panel: everything about how the book LOOKS.
 *
 * Four tabs, and the order is the order you actually decide things in — the
 * whole page first (a recipe), then the type, then the page furniture, then the
 * cover. Nothing here is hidden behind an "advanced" toggle: a writer who wants
 * 17 mm margins should be able to type 17.
 *
 * Every control writes straight through to the book's front matter, so what you
 * see in the galley beside you is what is in the file.
 */

import { useRef, useState, type ChangeEvent } from "react";
import { FUENTES, GRUPOS_FUENTE, pilaDe } from "@/nucleo/fuentes";
import { FORMATOS, MARGENES, juzgarMedida, medidaEnCaracteres } from "@/nucleo/geometria";
import type { Diseno, Meta, Portada as TipoPortada } from "@/nucleo/libro";
import { RECETAS } from "@/nucleo/recetas";
import { avisar } from "@/ui/Avisos";
import { Icono } from "@/ui/Icono";
import { prepararImagen } from "./Portada";

type Pestana = "conjunto" | "letra" | "pagina" | "portada";

export function PanelDiseno({
  meta,
  onCambiar,
  onCerrar,
}: {
  meta: Meta;
  onCambiar: (meta: Meta) => void;
  onCerrar: () => void;
}) {
  const [pestana, setPestana] = useState<Pestana>("conjunto");

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
    <aside className="panel" aria-label="Diseño del libro">
      <div className="panel__cabeza">
        <span className="panel__titulo">Diseño</span>
        <button type="button" className="boton boton--desnudo" onClick={onCerrar} title="Cerrar">
          <Icono nombre="cerrar" />
        </button>
      </div>

      <div className="panel__pestanas" role="tablist">
        {(
          [
            ["conjunto", "Conjunto"],
            ["letra", "Letra"],
            ["pagina", "Página"],
            ["portada", "Portada"],
          ] as const
        ).map(([clave, texto]) => (
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

      {pestana === "conjunto" && <Conjunto meta={meta} onCambiar={onCambiar} />}
      {pestana === "letra" && <Letra diseno={meta.diseno} onCambiar={cambiarDiseno} />}
      {pestana === "pagina" && <Pagina diseno={meta.diseno} onCambiar={cambiarDiseno} />}
      {pestana === "portada" && (
        <PortadaAjustes meta={meta} onCambiar={onCambiar} onCambiarPortada={cambiarPortada} />
      )}
    </aside>
  );
}

/* ── Tab 1: the book as a whole ───────────────────────────────────────────── */

function Conjunto({ meta, onCambiar }: { meta: Meta; onCambiar: (meta: Meta) => void }) {
  return (
    <>
      <div className="grupo">
        <span className="grupo__titulo">Empieza por una receta</span>
        <p className="campo__nota">
          Cada una es una página entera y coherente. Elige la más cercana y ajusta después: los
          cambios que hagas se conservan.
        </p>
        <div className="recetas">
          {RECETAS.map((receta) => (
            <button
              key={receta.clave}
              type="button"
              className="receta"
              onClick={() => {
                onCambiar({
                  ...meta,
                  diseno: { ...receta.diseno, fuentePila: pilaDe(receta.diseno.fuente) },
                });
                avisar(`Diseño «${receta.nombre}» aplicado.`);
              }}
            >
              <span className="receta__nombre">{receta.nombre}</span>
              <span className="receta__que">{receta.que}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grupo">
        <span className="grupo__titulo">La obra</span>
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
        <label className="campo">
          <span className="campo__etiqueta">Estado</span>
          <select
            className="selector"
            value={meta.estado}
            onChange={(evento) => onCambiar({ ...meta, estado: evento.target.value })}
          >
            <option value="idea">Idea</option>
            <option value="borrador">Borrador</option>
            <option value="revisión">En revisión</option>
            <option value="terminado">Terminado</option>
          </select>
        </label>
        <Numero
          etiqueta="Objetivo de palabras"
          nota="0 para no marcarse ninguno."
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

/* ── Tab 2: type ──────────────────────────────────────────────────────────── */

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
        <span className="grupo__titulo">Tipografía</span>
        {GRUPOS_FUENTE.map((grupo) => {
          const fuentes = FUENTES.filter((fuente) => fuente.grupo === grupo.grupo);
          if (fuentes.length === 0) {
            return null;
          }
          return (
            <div key={grupo.grupo} className="campo">
              <span className="campo__etiqueta">{grupo.titulo}</span>
              <div className="fuentes">
                {fuentes.map((fuente) => (
                  <button
                    key={fuente.key}
                    type="button"
                    className={`fuente${diseno.fuente === fuente.key ? " fuente--aqui" : ""}`}
                    onClick={() => onCambiar({ fuente: fuente.key })}
                  >
                    <span className="fuente__muestra" style={{ fontFamily: fuente.stack }}>
                      {fuente.name} — el copista
                    </span>
                    <span className="fuente__nombre">{fuente.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grupo">
        <span className="grupo__titulo">Cuerpo y ritmo</span>
        <Rango
          etiqueta="Cuerpo"
          valor={diseno.tamano}
          unidad="pt"
          minimo={7}
          maximo={18}
          paso={0.5}
          onCambiar={(tamano) => onCambiar({ tamano })}
        />
        <Rango
          etiqueta="Interlineado"
          valor={diseno.interlineado}
          unidad="×"
          minimo={1}
          maximo={2.2}
          paso={0.02}
          onCambiar={(interlineado) => onCambiar({ interlineado })}
        />
        <Rango
          etiqueta="Espaciado entre letras"
          valor={diseno.tracking}
          unidad="em"
          minimo={-0.03}
          maximo={0.08}
          paso={0.005}
          onCambiar={(tracking) => onCambiar({ tracking })}
        />
        <p className={`campo__nota${juicio === "buena" ? "" : " campo__nota--aviso"}`}>
          {caracteres} caracteres por línea —{" "}
          {juicio === "buena"
            ? "dentro de lo cómodo (52–82)."
            : juicio === "corta"
              ? "línea corta: el ojo salta demasiado. Sube el ancho o baja el cuerpo."
              : "línea larga: cuesta encontrar el renglón siguiente. Baja el ancho o sube el cuerpo."}
        </p>
      </div>

      <div className="grupo">
        <span className="grupo__titulo">Párrafo</span>
        <Interruptor
          etiqueta="Justificado"
          valor={diseno.justificado}
          onCambiar={(justificado) => onCambiar({ justificado })}
        />
        <Interruptor
          etiqueta="Partir palabras con guion"
          valor={diseno.guiones}
          onCambiar={(guiones) => onCambiar({ guiones })}
        />
        <Interruptor
          etiqueta="Sangrar la primera línea"
          valor={diseno.sangria}
          onCambiar={(sangria) => onCambiar({ sangria })}
        />
        {diseno.sangria && (
          <Rango
            etiqueta="Sangría"
            valor={diseno.sangriaEm}
            unidad="em"
            minimo={0.5}
            maximo={3}
            paso={0.1}
            onCambiar={(sangriaEm) => onCambiar({ sangriaEm })}
          />
        )}
        <Rango
          etiqueta="Aire entre párrafos"
          valor={diseno.espacioParrafo}
          unidad="em"
          minimo={0}
          maximo={1.5}
          paso={0.05}
          onCambiar={(espacioParrafo) => onCambiar({ espacioParrafo })}
        />
        {diseno.sangria && diseno.espacioParrafo > 0.15 && (
          <p className="campo__nota campo__nota--aviso">
            Sangría y aire a la vez es doble señal: un libro usa una de las dos.
          </p>
        )}
      </div>

      <div className="grupo">
        <span className="grupo__titulo">Arranque de capítulo</span>
        <Interruptor
          etiqueta="Capitular (letra grande)"
          valor={diseno.capitular}
          onCambiar={(capitular) => onCambiar({ capitular })}
        />
        {diseno.capitular && (
          <Rango
            etiqueta="Altura de la capitular"
            valor={diseno.capitularLineas}
            unidad=" líneas"
            minimo={2}
            maximo={5}
            paso={1}
            onCambiar={(capitularLineas) => onCambiar({ capitularLineas })}
          />
        )}
        <Interruptor
          etiqueta="Primera línea en versalitas"
          valor={diseno.versalitas}
          onCambiar={(versalitas) => onCambiar({ versalitas })}
        />
      </div>
    </>
  );
}

/* ── Tab 3: the page ──────────────────────────────────────────────────────── */

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
        <span className="grupo__titulo">Formato</span>
        <div className="campo">
          <select
            className="selector"
            value={diseno.pagina}
            onChange={(evento) => onCambiar({ pagina: evento.target.value as Diseno["pagina"] })}
          >
            {FORMATOS.map((formato) => (
              <option key={formato.clave} value={formato.clave}>
                {formato.nombre} · {formato.hint}
              </option>
            ))}
          </select>
        </div>
        {diseno.pagina === "personalizada" && (
          <div className="campo">
            <span className="campo__etiqueta">Milímetros</span>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <Numero
                etiqueta="Ancho"
                valor={diseno.anchoMm}
                minimo={70}
                maximo={420}
                paso={1}
                onCambiar={(anchoMm) => onCambiar({ anchoMm })}
              />
              <Numero
                etiqueta="Alto"
                valor={diseno.altoMm}
                minimo={100}
                maximo={594}
                paso={1}
                onCambiar={(altoMm) => onCambiar({ altoMm })}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grupo">
        <span className="grupo__titulo">Márgenes</span>
        <Segmentado
          opciones={MARGENES.map((margen) => ({ valor: margen.clave, texto: margen.nombre }))}
          valor={diseno.margenes}
          onCambiar={(margenes) => onCambiar({ margenes: margenes as Diseno["margenes"] })}
        />
        {diseno.margenes === "personalizados" ? (
          <>
            <Rango
              etiqueta="Arriba"
              valor={diseno.margenArriba}
              unidad="mm"
              minimo={5}
              maximo={60}
              paso={1}
              onCambiar={(margenArriba) => onCambiar({ margenArriba })}
            />
            <Rango
              etiqueta="Abajo"
              valor={diseno.margenAbajo}
              unidad="mm"
              minimo={5}
              maximo={60}
              paso={1}
              onCambiar={(margenAbajo) => onCambiar({ margenAbajo })}
            />
            <Rango
              etiqueta="Lomo (interior)"
              valor={diseno.margenLomo}
              unidad="mm"
              minimo={5}
              maximo={60}
              paso={1}
              onCambiar={(margenLomo) => onCambiar({ margenLomo })}
            />
            <Rango
              etiqueta="Corte (exterior)"
              valor={diseno.margenCorte}
              unidad="mm"
              minimo={5}
              maximo={60}
              paso={1}
              onCambiar={(margenCorte) => onCambiar({ margenCorte })}
            />
            <p className="campo__nota">
              En un libro cosido el lomo se lleva unos milímetros de más: parte de ese margen
              desaparece dentro de la encuadernación.
            </p>
          </>
        ) : (
          <p className="campo__nota">
            {MARGENES.find((margen) => margen.clave === diseno.margenes)?.hint}
          </p>
        )}
      </div>

      <div className="grupo">
        <span className="grupo__titulo">Capítulos</span>
        <div className="campo">
          <span className="campo__etiqueta">Dónde empieza cada uno</span>
          <Segmentado
            opciones={[
              { valor: "pagina-nueva", texto: "Página nueva" },
              { valor: "pagina-impar", texto: "En impar" },
              { valor: "seguido", texto: "Seguido" },
            ]}
            valor={diseno.capituloEn}
            onCambiar={(capituloEn) =>
              onCambiar({ capituloEn: capituloEn as Diseno["capituloEn"] })
            }
          />
        </div>
        <div className="campo">
          <span className="campo__etiqueta">Cómo se compone el título</span>
          <Segmentado
            opciones={[
              { valor: "grande", texto: "Grande" },
              { valor: "discreto", texto: "Discreto" },
              { valor: "versalitas", texto: "Versalitas" },
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
          <span className="campo__etiqueta">Separador de escena</span>
          <Segmentado
            opciones={[
              { valor: "linea-en-blanco", texto: "Blanco" },
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
        <span className="grupo__titulo">Cornisa y folio</span>
        <div className="campo">
          <span className="campo__etiqueta">Qué va en la cabecera</span>
          <select
            className="selector"
            value={diseno.encabezado}
            onChange={(evento) =>
              onCambiar({ encabezado: evento.target.value as Diseno["encabezado"] })
            }
          >
            <option value="autor-titulo">Autor a la izquierda, título a la derecha</option>
            <option value="titulo">Solo el título</option>
            <option value="capitulo">Título y capítulo</option>
            <option value="ninguno">Nada</option>
          </select>
        </div>
        <div className="campo">
          <span className="campo__etiqueta">Numeración</span>
          <Segmentado
            opciones={[
              { valor: "arabigos", texto: "1, 2, 3" },
              { valor: "romanos", texto: "i, ii, iii" },
              { valor: "ninguna", texto: "Sin" },
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
                { valor: "pie-centro", texto: "Pie, centro" },
                { valor: "pie-fuera", texto: "Pie, fuera" },
                { valor: "cabeza-fuera", texto: "Cabeza" },
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

/* ── Tab 4: the cover ─────────────────────────────────────────────────────── */

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
        <Segmentado
          opciones={[
            { valor: "sello", texto: "Sello" },
            { valor: "franja", texto: "Franja" },
            { valor: "liso", texto: "Liso" },
          ]}
          valor={portada.diseno}
          onCambiar={(diseno) => onCambiarPortada({ diseno: diseno as TipoPortada["diseno"] })}
        />
        <Segmentado
          opciones={[
            { valor: "rejilla", texto: "Rejilla" },
            { valor: "medianoche", texto: "Medianoche" },
          ]}
          valor={portada.diseno}
          onCambiar={(diseno) => onCambiarPortada({ diseno: diseno as TipoPortada["diseno"] })}
        />
      </div>

      <div className="grupo">
        <span className="grupo__titulo">Color de fondo</span>
        <div className="colores">
          {TINTAS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={color}
              className={`color${portada.color === color ? " color--aqui" : ""}`}
              style={{ background: color }}
              onClick={() => onCambiarPortada({ color })}
            />
          ))}
        </div>
        <input
          type="color"
          className="entrada"
          value={portada.color}
          onChange={(evento) => onCambiarPortada({ color: evento.target.value })}
          aria-label="Color a medida"
        />

        <span className="grupo__titulo">Color de las letras</span>
        <div className="colores">
          {TINTAS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={color}
              className={`color${portada.tinta === color ? " color--aqui" : ""}`}
              style={{ background: color }}
              onClick={() => onCambiarPortada({ tinta: color })}
            />
          ))}
        </div>
      </div>

      <div className="grupo">
        <span className="grupo__titulo">Letra de la portada</span>
        <select
          className="selector"
          value={portada.fuente}
          onChange={(evento) => onCambiarPortada({ fuente: evento.target.value })}
        >
          {FUENTES.map((fuente) => (
            <option key={fuente.key} value={fuente.key}>
              {fuente.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grupo">
        <span className="grupo__titulo">Imagen</span>
        <input
          ref={entradaFichero}
          type="file"
          accept="image/*"
          hidden
          onChange={(evento) => void elegirImagen(evento)}
        />
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            type="button"
            className="boton"
            onClick={() => entradaFichero.current?.click()}
          >
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
                  { valor: "ventana", texto: "Ventana" },
                  { valor: "completa", texto: "Toda" },
                ]}
                valor={portada.colocacion}
                onCambiar={(colocacion) =>
                  onCambiarPortada({ colocacion: colocacion as TipoPortada["colocacion"] })
                }
              />
            </div>
            <div className="campo">
              <span className="campo__etiqueta">Encaje</span>
              <Segmentado
                opciones={[
                  { valor: "cubrir", texto: "Recortar" },
                  { valor: "contener", texto: "Entera" },
                ]}
                valor={portada.encaje}
                onCambiar={(encaje) =>
                  onCambiarPortada({ encaje: encaje as TipoPortada["encaje"] })
                }
              />
            </div>
            <p className="campo__nota">
              La imagen viaja dentro del propio archivo del libro, reducida a 520 px de ancho: así
              el libro sigue siendo un solo fichero y la portada se ve también en el móvil.
            </p>
          </>
        )}
      </div>

      <div className="grupo">
        <span className="grupo__titulo">Encuadernación</span>
        <select
          className="selector"
          value={meta.encuadernacion ?? ""}
          onChange={(evento) =>
            onCambiar({ ...meta, encuadernacion: evento.target.value || undefined })
          }
        >
          <option value="">Sin especificar</option>
          <option value="rústica">Rústica</option>
          <option value="tela">Tela</option>
          <option value="cartoné">Cartoné</option>
          <option value="bolsillo">Bolsillo</option>
        </select>
        <p className="campo__nota">
          No cambia nada en pantalla: es una nota tuya sobre cómo imaginas el libro impreso.
        </p>
      </div>
    </>
  );
}

/* ── Controls ─────────────────────────────────────────────────────────────── */

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

function Rango({
  etiqueta,
  valor,
  unidad,
  minimo,
  maximo,
  paso,
  onCambiar,
}: {
  etiqueta: string;
  valor: number;
  unidad: string;
  minimo: number;
  maximo: number;
  paso: number;
  onCambiar: (valor: number) => void;
}) {
  const decimales = paso < 0.1 ? 3 : paso < 1 ? 2 : 0;
  return (
    <label className="campo">
      <span className="campo__etiqueta">
        {etiqueta}
        <span className="campo__valor">
          {valor.toFixed(decimales).replace(/\.?0+$/, "")}
          {unidad}
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
  valor,
  onCambiar,
}: {
  etiqueta: string;
  valor: boolean;
  onCambiar: (valor: boolean) => void;
}) {
  return (
    <label className="interruptor">
      <span>{etiqueta}</span>
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
