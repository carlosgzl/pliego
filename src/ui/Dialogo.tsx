/**
 * Asking for a word, and asking whether you are sure.
 *
 * `window.prompt` and `window.confirm` are the browser's dialogs, not the
 * app's: they arrive in the system font, in the system language, at the top of
 * the screen, and they block everything. In an app whose whole subject is
 * typography that is not a detail.
 */

import { useEffect, useRef, useState, type FormEvent } from "react";

export function DialogoTexto({
  titulo,
  texto,
  etiqueta,
  valorInicial = "",
  confirmar = "Aceptar",
  onAceptar,
  onCancelar,
}: {
  titulo: string;
  texto?: string;
  etiqueta: string;
  valorInicial?: string;
  confirmar?: string;
  onAceptar: (valor: string) => void;
  onCancelar: () => void;
}) {
  const [valor, setValor] = useState(valorInicial);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    campo.current?.focus();
    campo.current?.select();
  }, []);

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    const limpio = valor.trim();
    if (limpio.length > 0) {
      onAceptar(limpio);
    }
  };

  return (
    <Velo onCancelar={onCancelar}>
      <form className="dialogo" onSubmit={enviar}>
        <h2 className="dialogo__titulo">{titulo}</h2>
        {texto && <p className="dialogo__texto">{texto}</p>}
        <label className="campo">
          <span className="campo__etiqueta">{etiqueta}</span>
          <input
            ref={campo}
            className="entrada"
            value={valor}
            onChange={(evento) => setValor(evento.target.value)}
          />
        </label>
        <div className="dialogo__botones">
          <button type="button" className="boton" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="submit" className="boton boton--principal" disabled={!valor.trim()}>
            {confirmar}
          </button>
        </div>
      </form>
    </Velo>
  );
}

export function DialogoConfirmar({
  titulo,
  texto,
  confirmar = "Aceptar",
  peligro = false,
  onAceptar,
  onCancelar,
}: {
  titulo: string;
  texto: string;
  confirmar?: string;
  peligro?: boolean;
  onAceptar: () => void;
  onCancelar: () => void;
}) {
  return (
    <Velo onCancelar={onCancelar}>
      <div className="dialogo" role="alertdialog" aria-label={titulo}>
        <h2 className="dialogo__titulo">{titulo}</h2>
        <p className="dialogo__texto">{texto}</p>
        <div className="dialogo__botones">
          <button type="button" className="boton" onClick={onCancelar}>
            Cancelar
          </button>
          <button
            type="button"
            className={`boton ${peligro ? "boton--peligro" : "boton--principal"}`}
            onClick={onAceptar}
            autoFocus
          >
            {confirmar}
          </button>
        </div>
      </div>
    </Velo>
  );
}

function Velo({ children, onCancelar }: { children: React.ReactNode; onCancelar: () => void }) {
  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        onCancelar();
      }
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [onCancelar]);

  return (
    <div
      className="velo"
      onPointerDown={(evento) => {
        if (evento.target === evento.currentTarget) {
          onCancelar();
        }
      }}
    >
      {children}
    </div>
  );
}
