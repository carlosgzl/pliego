/**
 * La barra de gadgets: lo que el escritor mira sin dejar de escribir.
 *
 * TODO LO QUE HAY AQUÍ SE LEE DE UN VISTAZO Y NINGUNO PIDE NADA. Un escritor
 * levanta los ojos medio segundo para ver cuánto lleva y vuelve; si algo obliga
 * a pensar, sobra. Por eso son cifras grandes con una palabra debajo y nada
 * más: ni gráficas, ni barras que se llenen, ni felicitaciones.
 *
 * SE ELIGEN. Ocho disponibles y el escritor enciende los que quiere, arriba o
 * abajo, o ninguno. Lo que a uno le motiva —la cuenta del día— a otro le
 * bloquea, y no hay una respuesta correcta que imponer.
 */

import { useEffect, useState } from "react";
import { GADGETS, type ClaveGadget } from "@/datos/ajustes";
import { minutosDeLectura } from "@/nucleo/bloques";

export interface DatosGadgets {
  palabras: number;
  hoy: number;
  meta: number;
  pagina: number;
  paginas: number;
  capitulo: string | null;
  palabrasCapitulo: number;
  /** When this writing session started, in ms. */
  desde: number;
}

export function BarraGadgets({
  activos,
  datos,
  sitio,
}: {
  activos: ClaveGadget[];
  datos: DatosGadgets;
  sitio: "arriba" | "abajo";
}) {
  if (activos.length === 0) {
    return null;
  }
  // El orden lo pone la lista maestra, no el orden en que los encendió: así la
  // barra no se reordena sola al apagar y encender uno.
  const orden = GADGETS.filter((gadget) => activos.includes(gadget.clave));

  return (
    <div className={`gadgets gadgets--${sitio}`} role="status" aria-live="off">
      {orden.map((gadget) => (
        <Gadget key={gadget.clave} clave={gadget.clave} datos={datos} />
      ))}
    </div>
  );
}

function Gadget({ clave, datos }: { clave: ClaveGadget; datos: DatosGadgets }) {
  const contenido = usarContenido(clave, datos);
  if (!contenido) {
    return null;
  }
  return (
    <div className="gadget" title={GADGETS.find((g) => g.clave === clave)?.que}>
      <span className="gadget__cifra">{contenido.cifra}</span>
      <span className="gadget__nombre">{contenido.nombre}</span>
    </div>
  );
}

function usarContenido(
  clave: ClaveGadget,
  datos: DatosGadgets,
): { cifra: string; nombre: string } | null {
  /* El reloj y el cronómetro son los dos únicos que cambian solos, así que son
     los dos únicos que necesitan un latido. Uno por barra, no uno por gadget. */
  const [ahora, setAhora] = useState(() => Date.now());
  const vivo = clave === "reloj" || clave === "sesion";

  useEffect(() => {
    if (!vivo) {
      return;
    }
    const latido = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(latido);
  }, [vivo]);

  const numero = (valor: number) => valor.toLocaleString("es-ES");

  switch (clave) {
    case "palabras":
      return { cifra: numero(datos.palabras), nombre: "palabras" };

    case "hoy":
      return {
        cifra: `${datos.hoy > 0 ? "+" : ""}${numero(datos.hoy)}`,
        nombre: "hoy",
      };

    case "meta": {
      if (datos.meta <= 0) {
        // Sin objetivo puesto no se enseña un cero: se enseña el porcentaje de
        // nada, que no significa nada. Mejor no ocupar sitio.
        return null;
      }
      const falta = Math.max(0, datos.meta - datos.palabras);
      return {
        cifra: falta === 0 ? "¡Hecho!" : numero(falta),
        nombre: falta === 0 ? "objetivo" : "para la meta",
      };
    }

    case "sesion": {
      const minutos = Math.floor((ahora - datos.desde) / 60000);
      const horas = Math.floor(minutos / 60);
      return {
        cifra: horas > 0 ? `${horas} h ${minutos % 60}′` : `${minutos}′`,
        nombre: "de sesión",
      };
    }

    case "paginas":
      return { cifra: `${datos.pagina} / ${datos.paginas}`, nombre: "página" };

    case "capitulo":
      return datos.capitulo
        ? { cifra: numero(datos.palabrasCapitulo), nombre: recortar(datos.capitulo) }
        : null;

    case "lectura":
      return { cifra: `${minutosDeLectura(datos.palabras)}′`, nombre: "de lectura" };

    case "reloj":
      return {
        cifra: new Date(ahora).toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        nombre: "ahora",
      };

    default:
      return null;
  }
}

/** El nombre del capítulo cabe o se corta: la barra no crece por un título. */
function recortar(texto: string): string {
  const limpio = texto.trim();
  return limpio.length > 22 ? `${limpio.slice(0, 21)}…` : limpio || "sin título";
}
