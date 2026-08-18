/**
 * El color de la casa — y el icono de la pestaña, que va con él.
 *
 * WHY THE FAVICON IS DRAWN AND NOT A FILE. The owner asked for the tab icon to
 * follow the colour he picks, and a static .ico cannot do that. An SVG built in
 * memory and handed to the browser as a data URI can: change the colour, the
 * tab changes, with no request and no file to keep in sync with the palette.
 *
 * Each accent ships THREE values, not one. A single hue cannot be both the fill
 * behind white text and the text on a pale panel — one of the two always fails
 * contrast. So every colour carries its own darker ink and its own tint, chosen
 * by hand rather than derived, and the dark theme gets a lighter pair because
 * the same blue that reads well on paper disappears on charcoal.
 */

export interface Acento {
  clave: string;
  nombre: string;
  /** Light theme: fill, ink for text on pale ground, and that pale ground. */
  claro: { acento: string; ink: string; tenue: string };
  oscuro: { acento: string; ink: string; tenue: string };
}

export const ACENTOS: Acento[] = [
  {
    clave: "pizarra",
    nombre: "Pizarra",
    claro: { acento: "#3d5a80", ink: "#2b425e", tenue: "#eaeff5" },
    oscuro: { acento: "#7fa8d6", ink: "#a8c6e6", tenue: "#1b2530" },
  },
  {
    clave: "tinta",
    nombre: "Tinta",
    claro: { acento: "#2f3437", ink: "#1c2022", tenue: "#eceded" },
    oscuro: { acento: "#c8cbcd", ink: "#e2e4e5", tenue: "#25282a" },
  },
  {
    clave: "granate",
    nombre: "Granate",
    claro: { acento: "#8e2f3f", ink: "#6d2331", tenue: "#f6eaec" },
    oscuro: { acento: "#d98b98", ink: "#e9b3bc", tenue: "#2c1a1e" },
  },
  {
    clave: "bosque",
    nombre: "Bosque",
    claro: { acento: "#3a6b4d", ink: "#2b513a", tenue: "#e9f1eb" },
    oscuro: { acento: "#86bf9e", ink: "#a8d4bb", tenue: "#182620" },
  },
  {
    clave: "tierra",
    nombre: "Tierra",
    claro: { acento: "#8a5a2b", ink: "#6b4520", tenue: "#f5eee4" },
    oscuro: { acento: "#d3a06a", ink: "#e4bd90", tenue: "#2a2018" },
  },
  {
    clave: "ciruela",
    nombre: "Ciruela",
    claro: { acento: "#6b4a7a", ink: "#523860", tenue: "#f1ebf5" },
    oscuro: { acento: "#bfa0cd", ink: "#d4bee0", tenue: "#241c2a" },
  },
  {
    clave: "cobre",
    nombre: "Cobre",
    claro: { acento: "#a8542f", ink: "#833f22", tenue: "#f8ece6" },
    oscuro: { acento: "#e0946f", ink: "#eeb495", tenue: "#2c1d16" },
  },
  {
    clave: "mar",
    nombre: "Mar",
    claro: { acento: "#1f6f77", ink: "#16545a", tenue: "#e6f1f2" },
    oscuro: { acento: "#79bfc6", ink: "#a2d5da", tenue: "#152628" },
  },
];

const POR_CLAVE = new Map(ACENTOS.map((acento) => [acento.clave, acento]));

export function acentoDe(clave: string | null | undefined): Acento {
  return (clave ? POR_CLAVE.get(clave) : undefined) ?? ACENTOS[0]!;
}

/** Paint the chosen accent onto the document, for the current theme. */
export function aplicarAcento(clave: string, oscuro: boolean): void {
  const acento = acentoDe(clave);
  const tono = oscuro ? acento.oscuro : acento.claro;
  const raiz = document.documentElement;
  raiz.style.setProperty("--acento", tono.acento);
  raiz.style.setProperty("--acento-ink", tono.ink);
  raiz.style.setProperty("--acento-tenue", tono.tenue);
  pintarFavicon(tono.acento);
  // The browser chrome on Android takes its colour from here.
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((etiqueta) => etiqueta.setAttribute("content", oscuro ? "#101113" : "#f2f1ee"));
}

/**
 * The tab icon: a sheet with three ruled lines, in the accent colour.
 *
 * Written as a data URI rather than a file so it can change the instant the
 * colour does. The `#` in a hex colour has to be escaped inside a data URI or
 * the browser reads it as a fragment and the whole icon disappears.
 */
export function pintarFavicon(color: string): void {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<rect width="32" height="32" rx="6" fill="${color}"/>
<path d="M9 9h14M9 14h14M9 19h9" stroke="#fdfcf9" stroke-width="2" stroke-linecap="round"/>
<path d="M9 24h6" stroke="#fdfcf9" stroke-width="2" stroke-linecap="round" opacity=".5"/>
</svg>`;
  const uri = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  let enlace = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!enlace) {
    enlace = document.createElement("link");
    enlace.rel = "icon";
    document.head.append(enlace);
  }
  enlace.type = "image/svg+xml";
  enlace.href = uri;
}
