/**
 * La puerta. Lo primero que sale, siempre.
 *
 * ANTES ESTABA MAL Y ÉL TENÍA RAZÓN. El login era un diálogo que aparecía
 * encima de la aplicación cuando intentabas guardar: es decir, entrabas
 * directo a la estantería y la puerta te salía al paso más tarde. Lo que pidió
 * —y lo que tiene sentido— es al revés: la puerta primero, y detrás la casa.
 *
 * Sigue habiendo forma de mirar sin entrar, porque eso también lo pidió antes y
 * las dos cosas caben: el botón está, es secundario, y deja claro que lo que
 * vas a ver es una muestra.
 *
 * La pantalla es media portada y medio formulario. La mitad de la izquierda
 * cuenta qué es esto en tres líneas —a un desconocido no le dice nada un campo
 * de contraseña sobre fondo gris—, y la de la derecha pregunta.
 */

import { useState, type FormEvent } from "react";
import { entrar, registrar } from "@/datos/sesion";
import { avisar } from "@/ui/Avisos";
import { Icono } from "@/ui/Icono";

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
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const creando = modo === "crear";

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    setEntrando(true);
    setError(null);
    const resultado = creando ? await registrar(usuario, clave) : await entrar(usuario, clave);
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

        <h1 className="puerta__lema">
          Escribes arriba
          <br />y las páginas se componen
          <br />
          <em>debajo</em>.
        </h1>

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
        <form className="puerta__forma" onSubmit={(evento) => void enviar(evento)}>
          <div className="segmentado puerta__modos">
            <button
              type="button"
              className={`segmentado__opcion${!creando ? " segmentado__opcion--aqui" : ""}`}
              onClick={() => {
                setModo("entrar");
                setError(null);
              }}
            >
              Entrar
            </button>
            <button
              type="button"
              className={`segmentado__opcion${creando ? " segmentado__opcion--aqui" : ""}`}
              onClick={() => {
                setModo("crear");
                setError(null);
              }}
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
              className="entrada"
              value={usuario}
              autoComplete="username"
              autoFocus
              placeholder={creando ? "de 3 a 32 letras, números o guiones" : ""}
              onChange={(evento) => setUsuario(evento.target.value)}
            />
          </label>

          <label className="campo">
            <span className="campo__etiqueta">Contraseña</span>
            <input
              className="entrada"
              type="password"
              value={clave}
              autoComplete={creando ? "new-password" : "current-password"}
              placeholder={creando ? "ocho caracteres como mínimo" : ""}
              onChange={(evento) => setClave(evento.target.value)}
            />
          </label>

          {error && (
            <p className="puerta__error">
              <Icono nombre="aviso" tamano={14} /> {error}
            </p>
          )}

          <button
            type="submit"
            className="boton boton--principal puerta__boton"
            disabled={entrando || !usuario.trim() || !clave}
          >
            {entrando ? (creando ? "Creando…" : "Entrando…") : creando ? "Crear mi cuenta" : "Entrar"}
          </button>

          <button type="button" className="puerta__visita" onClick={onVisita}>
            Solo quiero verla por dentro
          </button>

          <p className="campo__nota">
            Tu contraseña no se guarda en ningún sitio: el servidor solo tiene un resumen (scrypt)
            del que no se puede volver atrás. Sin correo, sin verificación y sin terceros.
          </p>
        </form>
      </section>
    </div>
  );
}
