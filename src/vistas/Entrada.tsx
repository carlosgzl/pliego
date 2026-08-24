/**
 * La puerta. Lo primero que sale, siempre.
 *
 * La pantalla es media portada y medio formulario: la mitad izquierda cuenta
 * qué es esto —a un desconocido no le dice nada un campo de contraseña sobre
 * fondo gris— y la derecha pregunta. Sigue habiendo forma de mirar sin entrar,
 * porque las dos cosas caben: el botón está, es secundario, y deja claro que lo
 * que vas a ver es una muestra.
 *
 * LO QUE CAMBIÓ, porque «tenía apariencia pobre» y era verdad:
 *
 * · UNA CITA DISTINTA CADA VEZ. Donde había un lema fijo —que se lee una vez y
 *   a la tercera estorba— ahora hay una frase de un escritor, elegida al azar y
 *   sin repetir la anterior. Todas de dominio público; ver `datos/citas.ts`.
 * · LA CONTRASEÑA SE MIDE MIENTRAS SE ESCRIBE. Barra de cuatro tramos, nombre
 *   —«aceptable», «buena»— y, lo que de verdad sirve, QUÉ HACER para subirla.
 *   Una barra roja sin consejo solo produce frustración. Ver `nucleo/seguridad`.
 * · LOS REQUISITOS SE VEN CUMPLIRSE. Al crear cuenta, las dos condiciones del
 *   servidor están en pantalla y se marcan solas. Enterarse de que el usuario
 *   tenía que llevar tres letras DESPUÉS de enviar el formulario es la peor
 *   forma de contarlo.
 * · SE PUEDE VER LO QUE SE ESCRIBE, y avisa del bloqueo de mayúsculas — que es
 *   la causa número uno de «pero si la contraseña es esa».
 *
 * Lo que NO cambia: sin correo, sin verificación y sin terceros. La contraseña
 * no viaja más allá de la función de cuentas, que guarda un scrypt del que no
 * se puede volver atrás.
 */

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { citaDelDia } from "@/datos/citas";
import { medirClave, MINIMO } from "@/nucleo/seguridad";
import { entrar, registrar } from "@/datos/sesion";
import { avisar } from "@/ui/Avisos";
import { Icono } from "@/ui/Icono";

/** El mismo que valida la función de cuentas. Si cambia allí, cambia aquí. */
const USUARIO_VALIDO = /^[a-z0-9._-]{3,32}$/;

export function Entrada({
  onEntrado,
  onVisita,
}: {
  onEntrado: () => void;
  onVisita: () => void;
}) {
  const [modo, setModo] = useState<"entrar" | "crear">("entrar");
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [mayusculas, setMayusculas] = useState(false);
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const creando = modo === "crear";

  /* La cita se elige UNA vez por montaje: si se recalculara en cada render
     cambiaría al teclear cada letra de la contraseña, que es mareante. */
  const cita = useMemo(() => citaDelDia(), []);
  const fuerza = useMemo(() => medirClave(clave), [clave]);

  const usuarioLimpio = usuario.trim().toLowerCase();
  const usuarioVale = USUARIO_VALIDO.test(usuarioLimpio);
  const puedeEnviar =
    !entrando &&
    usuarioLimpio.length > 0 &&
    clave.length > 0 &&
    (!creando || (usuarioVale && fuerza.valida));

  /* Al cambiar de modo se borra el error: uno de «entrar» no dice nada de lo
     que estás haciendo ahora. */
  useEffect(() => setError(null), [modo]);

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!puedeEnviar) {
      return;
    }
    setEntrando(true);
    setError(null);
    const resultado = creando
      ? await registrar(usuarioLimpio, clave)
      : await entrar(usuarioLimpio, clave);
    setEntrando(false);
    if (resultado.ok) {
      avisar(creando ? "Cuenta creada. Bienvenido." : "Dentro.");
      onEntrado();
    } else {
      setError(resultado.motivo);
    }
  };

  return (
    <div className="puerta pantalla">
      <section className="puerta__cara">
        <div className="puerta__marca">
          <span className="marca__nombre">
            Pliego<span className="marca__punto">.</span>
          </span>
          <span className="eyebrow">un sitio para escribir libros</span>
        </div>

        <figure className="cita">
          <blockquote className="cita__texto">{cita.texto}</blockquote>
          <figcaption className="cita__firma">
            {/* La raya delante del autor es un carácter de verdad, no una caja
                de un píxel dibujada con CSS: así se firma una cita, y así se
                copia y se lee en voz alta si hace falta. */}
            <span aria-hidden="true">—</span>
            {cita.autor}
            {cita.obra && <span className="cita__obra">{cita.obra}</span>}
          </figcaption>
        </figure>

        <ul className="puerta__lista">
          <li>
            <Icono nombre="libro" tamano={15} />
            Cada libro es un solo archivo Markdown que se abre en cualquier editor.
          </li>
          <li>
            <Icono nombre="ajustes" tamano={15} />
            Tu tipografía, tus márgenes en milímetros y tu portada.
          </li>
          <li>
            <Icono nombre="imprimir" tamano={15} />
            Se exporta a un PDF con el tamaño de papel de verdad.
          </li>
        </ul>
      </section>

      <section className="puerta__cruz">
        <form className="puerta__forma" onSubmit={(evento) => void enviar(evento)} noValidate>
          <div className="segmentado puerta__modos">
            <button
              type="button"
              className={`segmentado__opcion${!creando ? " segmentado__opcion--aqui" : ""}`}
              onClick={() => setModo("entrar")}
            >
              Entrar
            </button>
            <button
              type="button"
              className={`segmentado__opcion${creando ? " segmentado__opcion--aqui" : ""}`}
              onClick={() => setModo("crear")}
            >
              Crear cuenta
            </button>
          </div>

          <p className="puerta__nota">
            {creando
              ? "Con una cuenta tus libros te siguen: entra con ella en otro ordenador y están todos ahí. Es gratis y no pide correo."
              : "Hace falta para abrir tus libros y para guardar. Mirar cómo funciona, no."}
          </p>

          <label className="campo">
            <span className="campo__etiqueta">Usuario</span>
            <input
              className={`entrada${creando && usuario && !usuarioVale ? " entrada--mal" : ""}`}
              value={usuario}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
              onChange={(evento) => setUsuario(evento.target.value)}
            />
            {creando && (
              <Requisito
                cumplido={usuarioVale}
                tocado={usuario.length > 0}
                texto="De 3 a 32 caracteres: letras sin tilde, números, puntos o guiones."
              />
            )}
          </label>

          <label className="campo">
            <span className="campo__etiqueta">
              Contraseña
              {/*
                * Ver lo que se escribe no es un lujo: en un teclado de móvil, o
                * con una contraseña larga de las buenas, escribir a ciegas es
                * el motivo por el que la gente acaba eligiendo una corta.
                */}
              <button
                type="button"
                className="campo__accion"
                onClick={() => setVerClave((previo) => !previo)}
                aria-pressed={verClave}
              >
                <Icono nombre="ojo" tamano={13} /> {verClave ? "Ocultar" : "Ver"}
              </button>
            </span>
            <input
              className="entrada"
              type={verClave ? "text" : "password"}
              value={clave}
              autoComplete={creando ? "new-password" : "current-password"}
              onChange={(evento) => setClave(evento.target.value)}
              onKeyUp={(evento) => setMayusculas(evento.getModifierState?.("CapsLock") ?? false)}
              onBlur={() => setMayusculas(false)}
            />

            {creando && clave.length > 0 && <Medidor fuerza={fuerza} />}

            {creando && clave.length === 0 && (
              <span className="campo__nota">
                Mínimo {MINIMO} caracteres. Tres palabras sueltas valen más que ocho signos
                raros, y se recuerdan.
              </span>
            )}

            {mayusculas && (
              <span className="puerta__mayusculas">
                <Icono nombre="aviso" tamano={13} /> Tienes el bloqueo de mayúsculas puesto.
              </span>
            )}
          </label>

          {error && (
            <p className="puerta__error" role="alert">
              <Icono nombre="aviso" tamano={14} /> {error}
            </p>
          )}

          <button type="submit" className="boton boton--principal puerta__boton" disabled={!puedeEnviar}>
            {entrando ? (creando ? "Creando…" : "Entrando…") : creando ? "Crear mi cuenta" : "Entrar"}
          </button>

          <button type="button" className="puerta__visita" onClick={onVisita}>
            Solo quiero verla por dentro
          </button>

          <p className="campo__nota puerta__legal">
            <Icono nombre="guardado" tamano={13} />
            Tu contraseña no se guarda en ningún sitio: el servidor solo tiene un resumen (scrypt)
            del que no se puede volver atrás. Sin correo, sin verificación y sin terceros.
          </p>
        </form>
      </section>
    </div>
  );
}

/**
 * La barra de fuerza: cuatro tramos, un nombre y un consejo.
 *
 * Los tramos se pintan todos y se ENCIENDEN los que toca, en vez de dibujar una
 * barra que crece. Así la longitud de la barra no cambia, y el ojo compara con
 * lo que ya ha visto en lugar de con nada.
 */
function Medidor({ fuerza }: { fuerza: ReturnType<typeof medirClave> }) {
  return (
    <div className="fuerza" aria-live="polite">
      <div className="fuerza__barra">
        {[1, 2, 3, 4].map((tramo) => (
          <span
            key={tramo}
            className={`fuerza__tramo${fuerza.nota >= tramo ? ` fuerza__tramo--n${fuerza.nota}` : ""}`}
          />
        ))}
      </div>
      <span className={`fuerza__nombre fuerza__nombre--n${fuerza.nota}`}>
        Contraseña {fuerza.nombre}
      </span>
      {fuerza.consejo && <span className="campo__nota">{fuerza.consejo}</span>}
    </div>
  );
}

/** Un requisito que se marca solo cuando se cumple. */
function Requisito({
  cumplido,
  tocado,
  texto,
}: {
  cumplido: boolean;
  /** Hasta que no se escribe algo no se pinta en rojo: nadie falla en blanco. */
  tocado: boolean;
  texto: string;
}) {
  const estado = !tocado ? "" : cumplido ? " requisito--si" : " requisito--no";
  return (
    <span className={`requisito${estado}`}>
      <Icono nombre={cumplido && tocado ? "guardado" : "escena"} tamano={12} />
      {texto}
    </span>
  );
}
