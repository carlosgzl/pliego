/**
 * The one-line messages the app says out loud.
 *
 * Deliberately not a notification centre: a writing app should interrupt you as
 * little as possible, so these appear at the foot, say one thing, and go. The
 * only messages worth showing here are the ones that change what the writer
 * would do next — "no se ha guardado" is one, "guardado" is not (the status
 * line in the bar already says that, quietly and permanently).
 */

import { useEffect, useState } from "react";

export interface Aviso {
  id: number;
  texto: string;
  tono: "normal" | "error";
}

let siguienteId = 1;
let publicar: ((aviso: Aviso) => void) | null = null;

export function avisar(texto: string, tono: Aviso["tono"] = "normal"): void {
  publicar?.({ id: siguienteId++, texto, tono });
}

export function Avisos() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  useEffect(() => {
    publicar = (aviso) => {
      setAvisos((previos) => [...previos, aviso]);
      // An error stays longer: it usually needs a decision, and four seconds is
      // not enough to read a sentence and understand it.
      const vida = aviso.tono === "error" ? 6500 : 2800;
      setTimeout(() => {
        setAvisos((previos) => previos.filter((otro) => otro.id !== aviso.id));
      }, vida);
    };
    return () => {
      publicar = null;
    };
  }, []);

  if (avisos.length === 0) {
    return null;
  }

  return (
    <div className="avisos" role="status" aria-live="polite">
      {avisos.map((aviso) => (
        <div key={aviso.id} className={`aviso${aviso.tono === "error" ? " aviso--error" : ""}`}>
          {aviso.texto}
        </div>
      ))}
    </div>
  );
}
