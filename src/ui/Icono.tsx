/**
 * The icon set: hand-drawn paths, no icon library.
 *
 * A dependency for eighteen glyphs would be the largest thing in the bundle and
 * would drag its own look in with it. These are all one stroke weight on a
 * 24-grid, which is what makes them read as a family.
 */

export type NombreIcono =
  | "atras"
  | "libro"
  | "mas"
  | "lapiz"
  | "ojo"
  | "ajustes"
  | "capitulos"
  | "cerrar"
  | "negrita"
  | "cursiva"
  | "escena"
  | "capitulo"
  | "guardado"
  | "nube"
  | "aviso"
  | "expandir"
  | "encoger"
  | "imprimir"
  | "descargar"
  | "copiar"
  | "papelera"
  | "sol"
  | "luna"
  | "foco"
  | "flecha"
  | "panel";

const TRAZOS: Record<NombreIcono, string> = {
  atras: "M15 5l-7 7 7 7",
  libro: "M4 4h9a3 3 0 013 3v13a3 3 0 00-3-3H4zM20 4h-3a3 3 0 00-3 3v13a3 3 0 013-3h3z",
  mas: "M12 5v14M5 12h14",
  lapiz: "M4 20l4-1 10-10-3-3L5 16zM15 6l3 3",
  ojo: "M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z M12 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z",
  ajustes:
    "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 14a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1v.3a2 2 0 11-4 0v-.2a1.6 1.6 0 00-2.8-1.1l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.6 1.6 0 004 14H3.8a2 2 0 110-4H4a1.6 1.6 0 001.1-2.8l-.1-.1a2 2 0 112.8-2.8l.1.1A1.6 1.6 0 0010 4.6V4a2 2 0 114 0v.2a1.6 1.6 0 002.7 1.1l.1-.1a2 2 0 112.8 2.8l-.1.1A1.6 1.6 0 0020 10h.2a2 2 0 110 4H20a1.6 1.6 0 00-.6.1z",
  capitulos: "M4 6h16M4 12h11M4 18h16",
  cerrar: "M6 6l12 12M18 6L6 18",
  negrita: "M7 5h6a3.5 3.5 0 010 7H7zM7 12h7a3.5 3.5 0 010 7H7z",
  cursiva: "M10 5h7M7 19h7M14 5l-4 14",
  escena: "M5 12h3M11 12h2M16 12h3",
  capitulo: "M5 5h14M5 10h9M5 15h14M5 20h6",
  guardado: "M5 12.5l4.5 4.5L19 7",
  nube: "M7 18a4 4 0 010-8 5.5 5.5 0 0110.5 1.5A3.5 3.5 0 0117 18z",
  aviso: "M12 4l9 16H3zM12 10v4M12 17.2v.1",
  expandir: "M9 4H4v5M15 20h5v-5M20 9V4h-5M4 15v5h5",
  encoger: "M9 4v5H4M15 20v-5h5M20 9h-5V4M4 15h5v5",
  imprimir: "M7 9V4h10v5M7 18H5a2 2 0 01-2-2v-4a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2h-2M7 15h10v5H7z",
  descargar: "M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14",
  copiar: "M9 9h10v10a2 2 0 01-2 2H9a2 2 0 01-2-2zM5 15V5a2 2 0 012-2h10",
  papelera: "M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6",
  sol: "M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M2 12h2M20 12h2M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5",
  luna: "M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z",
  foco: "M12 4v3M12 17v3M4 12h3M17 12h3M12 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z",
  flecha: "M5 12h14M13 6l6 6-6 6",
  panel: "M3 5h18v14H3zM3 15h18",
};

export function Icono({
  nombre,
  tamano = 16,
}: {
  nombre: NombreIcono;
  tamano?: number;
}) {
  return (
    <svg
      className="icono"
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}
