/**
 * La pantalla de inicio: lo primero que hay detrás de la puerta.
 *
 * POR QUÉ NO SE ENTRA DIRECTO A LA ESTANTERÍA. Una rejilla de portadas contesta
 * «qué tienes», y esa no es la primera pregunta de quien abre esto. La primera
 * es «¿dónde lo dejé?». Así que lo primero y más grande es **seguir con lo
 * último**, con su portada, sus palabras y cuándo fue; la estantería viene
 * debajo, y empezar un libro nuevo es un botón, no la acción principal, porque
 * se hace tres veces al año.
 *
 * ARRIBA HUBO CUATRO CIFRAS EN CAJAS y ya no están. Un panel de control es lo
 * que pone una aplicación cuando no sabe qué decirte, y un escritor no abre
 * esto para consultar métricas: abre para seguir escribiendo. Queda una línea
 * al lado del saludo, con lo mismo dicho como lo diría una persona.
 */

import { useState, type CSSProperties } from "react";
import type { Catalogo, LibroResumen } from "@/datos/biblioteca";
import { palabrasDeHoy } from "@/datos/ajustes";
import { DialogoConfirmar, DialogoTexto } from "@/ui/Dialogo";
import { Icono } from "@/ui/Icono";
import { Pie } from "@/ui/Pie";
import { leerSesion } from "@/datos/sesion";
import { Portada } from "./Portada";

export function Inicio({
  catalogo,
  cargando,
  dentro,
  onAbrir,
  onCrear,
  onDuplicar,
  onRenombrar,
  onBorrar,
  onAjustes,
  onRecargar,
  onEntrar,
  onSalir,
}: {
  catalogo: Catalogo | null;
  cargando: boolean;
  dentro: boolean;
  onAbrir: (slug: string) => void;
  onCrear: (titulo: string) => void;
  onDuplicar: (slug: string) => void;
  onRenombrar: (slug: string, titulo: string) => void;
  onBorrar: (slug: string) => void;
  onAjustes: () => void;
  onRecargar: () => void;
  onEntrar: () => void;
  onSalir: () => void;
}) {
  const [creando, setCreando] = useState(false);
  const [renombrando, setRenombrando] = useState<LibroResumen | null>(null);
  const [borrando, setBorrando] = useState<LibroResumen | null>(null);

  const libros = catalogo?.libros ?? [];
  const palabras = libros.reduce((suma, libro) => suma + libro.palabras, 0);
  const hoy = libros.reduce((suma, libro) => suma + palabrasDeHoy(libro.slug, libro.palabras), 0);
  const ultimo = libros[0] ?? null;
  const resto = libros.slice(1);
  const resumen = () => frase(libros.length, palabras, hoy);

  return (
    <div className="inicio pantalla">
      <div className="inicio__dentro">
        <header className="inicio__cabecera">
          <div className="inicio__marca">
            <div className="marca">
              <span className="marca__nombre">
                Pliego<span className="marca__punto">.</span>
              </span>
              <span className="marca__beta">beta</span>
            </div>
            {/*
              * El saludo va en su propia línea y en minúscula: pegado a la
              * insignia de «beta» y en versalitas como ella, las dos se leían de
              * corrido —«BETA DE MADRUGADA»— y no lo entendía nadie.
              *
              * EL RESUMEN, EN UNA FRASE Y NO EN CUATRO CAJAS.
              *
              * Había cuatro recuadros con cifras grandes —palabras, hoy, libros,
              * tiempo de lectura— y no convencían: un panel de control es lo que
              * pone una aplicación cuando no sabe qué decirte. Un escritor no
              * abre esto para consultar métricas; abre para seguir escribiendo.
              *
              * Así que queda UNA línea, en el tono en que lo diría una persona,
              * y solo cuando hay algo que contar. Lo de hoy únicamente si has
              * escrito hoy: un «+0» todos los días desanima, y no informa.
              */}
            <p className="inicio__saludo">
              {saludo()}
              {dentro && libros.length > 0 && <span className="inicio__dato">{resumen()}</span>}
            </p>
          </div>

          <div className="inicio__acciones">
            {dentro && catalogo && <Origen catalogo={catalogo} onRecargar={onRecargar} />}
            <button type="button" className="boton boton--desnudo" onClick={onAjustes}>
              <Icono nombre="ajustes" />
              <span className="boton__texto">Ajustes</span>
            </button>
            {dentro ? (
              <button type="button" className="boton" onClick={onSalir}>
                Salir
              </button>
            ) : (
              <button type="button" className="boton boton--principal" onClick={onEntrar}>
                Entrar
              </button>
            )}
          </div>
        </header>

        {!dentro && (
          <p className="inicio__visita">
            Estás de visita: esto es un libro de muestra y no se guarda nada.{" "}
            <button type="button" className="inicio__enlace" onClick={onEntrar}>
              Entra
            </button>{" "}
            para abrir el tuyo.
          </p>
        )}

        {/* Seguir donde lo dejaste: lo más grande de la pantalla. */}
        {ultimo && (
          <section className="seguir">
            <h2 className="inicio__titulo">
              {dentro ? "Sigue donde lo dejaste" : "Échale un vistazo"}
            </h2>
            <button type="button" className="seguir__tarjeta" onClick={() => onAbrir(ultimo.slug)}>
              <span className="seguir__portada">
                <Portada meta={ultimo.meta} tamano="mini" />
              </span>
              <span className="seguir__texto">
                <span className="seguir__titulo">{ultimo.meta.titulo}</span>
                {ultimo.meta.subtitulo && (
                  <span className="seguir__sub">{ultimo.meta.subtitulo}</span>
                )}
                <span className="seguir__datos">
                  {ultimo.palabras.toLocaleString("es-ES")} palabras
                  {ultimo.meta.meta && ultimo.meta.meta > 0
                    ? ` · ${Math.min(100, Math.round((ultimo.palabras / ultimo.meta.meta) * 100))}% del objetivo`
                    : ""}{" "}
                  · {cuando(ultimo.actualizado)}
                </span>
                <span className="seguir__accion">
                  <Icono nombre="lapiz" tamano={15} /> Seguir escribiendo
                </span>
              </span>
            </button>
          </section>
        )}

        <section className="inicio__estante">
          <div className="inicio__fila">
            <h2 className="inicio__titulo">
              {resto.length > 0 ? "Lo demás en la estantería" : "Tu estantería"}
            </h2>
            {dentro && (
              <button
                type="button"
                className="boton boton--principal"
                onClick={() => setCreando(true)}
              >
                <Icono nombre="mas" /> Nuevo libro
              </button>
            )}
          </div>

          {/*
            * MIENTRAS SE BUSCA, LA FORMA DE LO QUE VA A LLEGAR.
            *
            * Había una línea de texto —«Buscando tus libros…»— que aparecía y
            * desaparecía de golpe, y al desaparecer la estantería daba un salto
            * porque lo que entraba medía otra cosa. Un esqueleto ocupa
            * exactamente el sitio de las portadas que vienen: la página no se
            * mueve, solo se rellena. Y late despacio, que es la diferencia
            * entre «está cargando» y «se ha quedado colgado».
            */}
          {cargando && libros.length === 0 && (
            <div className="rejilla esqueleto" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <div className="hueso" key={n} style={{ "--indice": n } as CSSProperties}>
                  <div className="hueso__portada" />
                  <div className="hueso__linea" />
                  <div className="hueso__linea hueso__linea--corta" />
                </div>
              ))}
            </div>
          )}

          {!cargando && dentro && libros.length === 0 && (
            <div className="vacio">
              <span style={{ color: "var(--tenue)" }}>
                <Icono nombre="libro" tamano={30} />
              </span>
              <h3 className="vacio__titulo">Aquí no hay nada escrito todavía</h3>
              <p className="vacio__texto">
                Cada libro es un solo archivo Markdown con su tipografía, sus márgenes y su portada
                guardados dentro. Se compone en páginas mientras escribes, y se abre en Obsidian o en
                cualquier editor: nada de lo que escribas depende de esta web.
              </p>
              <button
                type="button"
                className="boton boton--principal"
                onClick={() => setCreando(true)}
              >
                <Icono nombre="mas" /> Empezar el primero
              </button>
            </div>
          )}

          {resto.length > 0 && (
            <div className="rejilla">
              {resto.map((libro, indice) => (
                <Obra
                  key={libro.slug}
                  libro={libro}
                  indice={indice}
                  conMenu={dentro}
                  onAbrir={() => onAbrir(libro.slug)}
                  onDuplicar={() => onDuplicar(libro.slug)}
                  onRenombrar={() => setRenombrando(libro)}
                  onBorrar={() => setBorrando(libro)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <Pie />

      {creando && (
        <DialogoTexto
          titulo="Un libro nuevo"
          etiqueta="¿Cómo se titula?"
          valorInicial="Libro sin título"
          confirmar="Empezar"
          onAceptar={(titulo) => {
            setCreando(false);
            onCrear(titulo);
          }}
          onCancelar={() => setCreando(false)}
        />
      )}

      {renombrando && (
        <DialogoTexto
          titulo="Cambiar el nombre del archivo"
          texto="Cambia el nombre del fichero en el disco. El título que se imprime en la portada se edita en el panel de diseño."
          etiqueta="Nombre del archivo"
          valorInicial={renombrando.slug}
          confirmar="Cambiar"
          onAceptar={(nombre) => {
            const libro = renombrando;
            setRenombrando(null);
            onRenombrar(libro.slug, nombre);
          }}
          onCancelar={() => setRenombrando(null)}
        />
      )}

      {borrando && (
        <DialogoConfirmar
          titulo={`¿Borrar «${borrando.meta.titulo}»?`}
          texto={`Son ${borrando.palabras.toLocaleString("es-ES")} palabras. Se guarda una copia de rescate en este navegador, pero el archivo desaparece del disco y de la nube.`}
          confirmar="Borrar"
          peligro
          onAceptar={() => {
            const libro = borrando;
            setBorrando(null);
            onBorrar(libro.slug);
          }}
          onCancelar={() => setBorrando(null)}
        />
      )}
    </div>
  );
}

/**
 * El saludo de la hora, y a quién.
 *
 * Antes devolvía «de madrugada», que no es un saludo sino un complemento de
 * tiempo colgando de una frase que no estaba. En español, a las tres de la
 * mañana se dice «buenas noches» igual que a las once, y ya está.
 */
function saludo(): string {
  const hora = new Date().getHours();
  const momento =
    hora < 6 ? "Buenas noches" : hora < 13 ? "Buenos días" : hora < 21 ? "Buenas tardes" : "Buenas noches";
  const quien = leerSesion()?.usuario;
  return quien ? `${momento}, ${quien.charAt(0).toUpperCase()}${quien.slice(1)}.` : `${momento}.`;
}

/**
 * El resumen de la biblioteca, dicho como lo diría alguien.
 *
 * Nada de «4 obras · 24.310 palabras · 1 h 37 min de lectura», que es una ficha
 * técnica. Una frase, con lo de hoy solo si hoy hay algo — y sin adjetivos de
 * ánimo, que a la tercera vez suenan a palmadita en la espalda.
 */
function frase(libros: number, palabras: number, hoy: number): string {
  const obra = libros === 1 ? "un libro" : `${libros} libros`;
  const total = palabras.toLocaleString("es-ES");
  const base =
    palabras === 0
      ? `Tienes ${obra} empezado${libros === 1 ? "" : "s"}.`
      : `Llevas ${total} palabras en ${obra}.`;
  if (hoy > 0) {
    return `${base} Hoy, ${hoy.toLocaleString("es-ES")}.`;
  }
  return base;
}

/** «hoy», «ayer» o la fecha: lo que diría una persona. */
function cuando(iso: string): string {
  const fecha = new Date(iso);
  const dias = Math.floor((Date.now() - fecha.getTime()) / 86_400_000);
  if (dias <= 0) {
    return "hoy";
  }
  if (dias === 1) {
    return "ayer";
  }
  if (dias < 7) {
    return `hace ${dias} días`;
  }
  return fecha.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
}

function Obra({
  libro,
  indice,
  conMenu,
  onAbrir,
  onDuplicar,
  onRenombrar,
  onBorrar,
}: {
  libro: LibroResumen;
  indice: number;
  conMenu: boolean;
  onAbrir: () => void;
  onDuplicar: () => void;
  onRenombrar: () => void;
  onBorrar: () => void;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div
      className="obra"
      style={{ "--indice": indice } as React.CSSProperties}
      onMouseLeave={() => setAbierto(false)}
    >
      <button type="button" className="obra__portada" onClick={onAbrir} title={libro.meta.titulo}>
        <Portada meta={libro.meta} tamano="mini" />
      </button>

      <div className="obra__pie-fila">
        <button type="button" className="obra__enlace" onClick={onAbrir}>
          <span className="obra__titulo">{libro.meta.titulo}</span>
          <span className="obra__pie">
            {libro.palabras.toLocaleString("es-ES")} palabras · {cuando(libro.actualizado)}
          </span>
        </button>

        {conMenu && (
          <div className="obra__menu">
            <button
              type="button"
              className="boton boton--desnudo"
              onClick={() => setAbierto((previo) => !previo)}
              aria-label={`Más opciones de ${libro.meta.titulo}`}
            >
              <Icono nombre="capitulos" tamano={14} />
            </button>
            {abierto && (
              <div className="menu__lista menu__lista--obra">
                <button
                  type="button"
                  className="menu__opcion"
                  onClick={() => {
                    setAbierto(false);
                    onDuplicar();
                  }}
                >
                  <Icono nombre="copiar" tamano={14} />
                  <span className="menu__nombre">Duplicar</span>
                </button>
                <button
                  type="button"
                  className="menu__opcion"
                  onClick={() => {
                    setAbierto(false);
                    onRenombrar();
                  }}
                >
                  <Icono nombre="lapiz" tamano={14} />
                  <span className="menu__nombre">Renombrar</span>
                </button>
                <button
                  type="button"
                  className="menu__opcion menu__opcion--peligro"
                  onClick={() => {
                    setAbierto(false);
                    onBorrar();
                  }}
                >
                  <Icono nombre="papelera" tamano={14} />
                  <span className="menu__nombre">Borrar</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const TEXTO_ORIGEN: Record<Catalogo["via"], string> = {
  servidor: "En tu ordenador y en tu cuenta",
  cuenta: "En tu cuenta",
  nube: "En la nube",
  local: "Solo en este navegador",
};

/**
 * Qué está contestando, en una frase por sitio.
 *
 * Ya no es «de dónde salen los libros»: salen de los cuatro sitios a la vez y
 * se funden. Lo que importa saber de un vistazo es OTRA COSA — si lo que estás
 * escribiendo va a aparecer en tus otros navegadores, y si va a acabar siendo
 * un archivo de verdad. Eso es lo que se cuenta aquí.
 */
function explicar(catalogo: Catalogo): string {
  const lineas = [
    catalogo.servidorVivo
      ? "· Tu ordenador responde: los libros se están escribiendo en los .md de Drive."
      : "· Tu ordenador no responde. Lo que escribas queda en cola y él lo aplicará al archivo cuando vuelva.",
    catalogo.cuentaViva
      ? "· Tu cuenta responde: esto mismo se ve entrando en cualquier otro navegador."
      : "· Tu cuenta no responde, así que de momento esto no viaja a tus otros navegadores.",
    catalogo.nubeViva
      ? "· La nube cifrada responde."
      : "· La nube cifrada no responde (o falta la clave de la biblioteca).",
  ];
  return `${lineas.join("\n")}\n\nPulsa para sincronizar ahora.`;
}

function Origen({ catalogo, onRecargar }: { catalogo: Catalogo; onRecargar: () => void }) {
  /* El punto va por lo que de verdad preocupa: que los libros lleguen a algún
     sitio que no sea esta pestaña. Con la cuenta o el ordenador vivos, está
     resuelto. */
  const via = catalogo.servidorVivo
    ? "servidor"
    : catalogo.cuentaViva
      ? "cuenta"
      : catalogo.nubeViva
        ? "nube"
        : "local";
  const texto = catalogo.servidorVivo && !catalogo.cuentaViva ? "En tu ordenador" : TEXTO_ORIGEN[via];
  return (
    <button type="button" className="origen" onClick={onRecargar} title={explicar(catalogo)}>
      <span className={`origen__punto origen__punto--${via}`} />
      {texto}
    </button>
  );
}
