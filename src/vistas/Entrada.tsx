/**
 * La puerta.
 *
 * A visitor can look around Pliego without entering: the shelf shows a sample
 * book, the design panel works on it, the reader reads it. What they cannot do
 * is open the real library or save anything — and this screen is where that
 * changes.
 *
 * It says plainly what each state means. A login box with no explanation makes
 * a stranger feel shut out and makes the owner wonder what he is logging into;
 * two sentences fix both.
 */

import { useState, type FormEvent } from "react";
import { entrar } from "@/datos/sesion";
import { avisar } from "@/ui/Avisos";
import { Icono } from "@/ui/Icono";

export function Entrada({
  onEntrado,
  onCerrar,
}: {
  onEntrado: () => void;
  onCerrar: () => void;
}) {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    setEntrando(true);
    setError(null);
    const resultado = await entrar(usuario, clave);
    setEntrando(false);
    if (resultado.ok) {
      avisar("Dentro.");
      onEntrado();
    } else {
      setError(resultado.motivo);
    }
  };

  return (
    <div className="velo" role="dialog" aria-label="Entrar en Pliego">
      <form className="dialogo dialogo--entrada" onSubmit={(evento) => void enviar(evento)}>
        <div className="entrada__marca">
          <span className="marca__nombre">
            Pliego<span className="marca__punto">.</span>
          </span>
        </div>

        <p className="dialogo__texto">
          Para <strong>escribir</strong> y para abrir tu biblioteca hay que entrar. Mirar la web y
          probar el diseño con el libro de muestra no necesita nada.
        </p>

        <label className="campo">
          <span className="campo__etiqueta">Usuario</span>
          <input
            className="entrada"
            value={usuario}
            autoComplete="username"
            autoFocus
            onChange={(evento) => setUsuario(evento.target.value)}
          />
        </label>

        <label className="campo">
          <span className="campo__etiqueta">Contraseña</span>
          <input
            className="entrada"
            type="password"
            value={clave}
            autoComplete="current-password"
            onChange={(evento) => setClave(evento.target.value)}
          />
        </label>

        {error && (
          <p className="dialogo__texto dialogo__texto--error">
            <Icono nombre="aviso" tamano={14} /> {error}
          </p>
        )}

        <div className="dialogo__botones">
          <button type="button" className="boton" onClick={onCerrar}>
            Solo mirar
          </button>
          <button
            type="submit"
            className="boton boton--principal"
            disabled={entrando || !usuario.trim() || !clave}
          >
            {entrando ? "Entrando…" : "Entrar"}
          </button>
        </div>

        <p className="campo__nota">
          Tu contraseña no se guarda en ningún sitio: el servidor solo tiene un resumen del que no se
          puede volver atrás. Y aunque alguien entrara, tus libros seguirían cifrados con la clave de
          la biblioteca, que nunca sale de este navegador.
        </p>
      </form>
    </div>
  );
}
