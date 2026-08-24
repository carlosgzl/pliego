/**
 * El corrector, con tres modos y una regla de oro.
 *
 * LOS TRES MODOS:
 *
 *   ninguno    Nadie toca nada. Ni subrayados ni cambios. Escribe la persona y
 *              punto. Es el modo de quien trabaja en dos idiomas a la vez, o de
 *              quien el subrayado rojo le corta el hilo.
 *   sugerir    El corrector DEL NAVEGADOR: subraya en rojo y propone la
 *              corrección con el botón derecho. Se usa el del sistema y no uno
 *              propio a propósito — trae el diccionario de español del usuario,
 *              sus palabras añadidas y su menú de siempre. Uno escrito aquí
 *              sería peor y pesaría megas.
 *   corregir   Lo anterior y además ARREGLA SOLO lo de la lista de abajo al
 *              terminar la palabra, igual que la tipografía automática
 *              convierte `...` en puntos suspensivos.
 *
 * LA REGLA DE ORO DEL MODO «CORREGIR»: SOLO SE CAMBIA LO QUE NO TIENE DOS
 * LECTURAS.
 *
 * Aquí no está `mas`, ni `si`, ni `tu`, ni `el`, ni `esta`, ni `se`, ni `de`,
 * ni `te`, ni `aun`, ni `solo`, ni `como`, ni `cuando`, ni `donde`, ni `mi`, ni
 * `hacia`, ni `quedo`, ni `dejo`, ni `cerro`, ni `miro`, ni `llego`. Y no es un
 * olvido: **todas ellas son dos palabras distintas** según lleven tilde o no.
 * Un corrector que elige por su cuenta entre «más» y «mas», o que convierte «el
 * cerro» en «el cerró», no está arreglando una falta: está cambiando lo que
 * dice la frase. En un procesador de textos eso es molesto; en un programa para
 * escribir libros es inaceptable.
 *
 * Lo que sí entra es lo que en español NO EXISTE sin su tilde: «también» no es
 * nada escrito «tambien», «después» no es nada escrito «despues». Cambiarlas no
 * puede equivocarse porque no hay nada con lo que confundirse.
 *
 * Todo esto es puro —texto entra, texto sale— y por eso se prueba: es la clase
 * de función que puede estropear una frase sin que nadie se entere.
 */

export type ModoCorrector = "ninguno" | "sugerir" | "corregir";

export interface Correccion {
  texto: string;
  /** Dónde queda el cursor después. */
  cursor: number;
  /** Qué se cambió y por qué se pueda decir. */
  de: string;
  a: string;
}

/**
 * Palabras que en español no existen sin su tilde.
 *
 * Todas en minúscula. La mayúscula inicial de lo escrito se respeta al
 * sustituir, así que «Tambien» al empezar una frase sale «También».
 */
const SIN_TILDE_NO_EXISTEN: Record<string, string> = {
  /* Adverbios y conectores: los que más se escriben y más tilde pierden. */
  tambien: "también",
  despues: "después",
  ademas: "además",
  asi: "así",
  aqui: "aquí",
  alli: "allí",
  ahi: "ahí",
  segun: "según",
  quiza: "quizá",
  jamas: "jamás",
  detras: "detrás",
  atras: "atrás",
  demas: "demás",
  algun: "algún",
  ningun: "ningún",
  comun: "común",

  /* Adjetivos esdrújulos, y llanos acabados en consonante. */
  ultimo: "último",
  ultima: "última",
  ultimos: "últimos",
  ultimas: "últimas",
  proximo: "próximo",
  proxima: "próxima",
  rapido: "rápido",
  rapida: "rápida",
  facil: "fácil",
  faciles: "fáciles",
  dificil: "difícil",
  dificiles: "difíciles",
  debil: "débil",
  util: "útil",
  inutil: "inútil",
  ingles: "inglés",
  frances: "francés",
  aleman: "alemán",
  jovenes: "jóvenes",

  /* Plurales que cambian de acentuación y casi nadie escribe bien. */
  examenes: "exámenes",
  imagenes: "imágenes",
  margenes: "márgenes",
  origenes: "orígenes",
  resumenes: "resúmenes",
  volumenes: "volúmenes",
  arboles: "árboles",
  jardines: "jardines",

  /* Sustantivos de todos los días. */
  dia: "día",
  dias: "días",
  adios: "adiós",
  corazon: "corazón",
  razon: "razón",
  cancion: "canción",
  accion: "acción",
  atencion: "atención",
  cancer: "cáncer",
  caracter: "carácter",
  telefono: "teléfono",
  camara: "cámara",
  camion: "camión",
  avion: "avión",
  television: "televisión",
  cafe: "café",
  pais: "país",
  paises: "países",
  jardin: "jardín",
  album: "álbum",
  musica: "música",
  medico: "médico",
  numero: "número",
  numeros: "números",
  pagina: "página",
  paginas: "páginas",
  capitulo: "capítulo",
  capitulos: "capítulos",
  parrafo: "párrafo",
  parrafos: "párrafos",
  linea: "línea",
  lineas: "líneas",
  indice: "índice",
  arbol: "árbol",
  angel: "ángel",
  espiritu: "espíritu",
  poesia: "poesía",
  fotografia: "fotografía",
  bibliografia: "bibliografía",
  compania: "compañía",
  energia: "energía",
  melancolia: "melancolía",

  /* Formas verbales que sin tilde no son ninguna palabra. */
  seria: "sería",
  serian: "serían",
  habia: "había",
  habian: "habían",
  tenia: "tenía",
  tenian: "tenían",
  podia: "podía",
  podian: "podían",
  queria: "quería",
  querian: "querían",
  sabia: "sabía",
  sabian: "sabían",
  decia: "decía",
  decian: "decían",
  seguia: "seguía",
  volvia: "volvía",
  volvio: "volvió",
  salio: "salió",
  penso: "pensó",
  escribio: "escribió",
  murio: "murió",
  nacio: "nació",
  abrio: "abrió",
  sintio: "sintió",
  vivio: "vivió",
  leyo: "leyó",
  oyo: "oyó",
};

/**
 * Abreviaturas de mensajería, que en un libro no pintan nada.
 *
 * Van aparte porque el motivo es otro: no es que falte una tilde, es que eso no
 * es una palabra. Y por eso son las únicas de una o dos letras que se tocan —
 * en cualquier otro caso, cambiar una palabra tan corta sería temerario.
 */
const DE_MOVIL: Record<string, string> = {
  q: "que",
  xq: "porque",
  pq: "porque",
  tb: "también",
  tbn: "también",
  aki: "aquí",
  kiero: "quiero",
  kieres: "quieres",
  weno: "bueno",
  salu2: "saludos",
  xfa: "por favor",
  tmb: "también",
  dsp: "después",
  bn: "bien",
};

/** Todo junto, ya resuelto. */
const TABLA: Record<string, string> = { ...SIN_TILDE_NO_EXISTEN, ...DE_MOVIL };

/** Cuántas conoce. Sale en Ajustes, para no prometer magia. */
export const CUANTAS_CORRECCIONES = Object.keys(TABLA).length;

/** Un carácter que cierra una palabra. */
function cierraPalabra(caracter: string): boolean {
  return /[\s.,;:!?)"»'—–…]/.test(caracter);
}

/** La palabra corregida, con la mayúscula inicial que traía la original. */
function comoEstaba(original: string, corregida: string): string {
  const primera = original[0];
  if (primera && primera === primera.toUpperCase() && primera !== primera.toLowerCase()) {
    return corregida.charAt(0).toUpperCase() + corregida.slice(1);
  }
  return corregida;
}

/** Dónde empieza la palabra que termina en `fin`. */
function principioDePalabra(texto: string, fin: number): number {
  let inicio = fin;
  while (inicio > 0 && /[\p{L}\p{N}]/u.test(texto[inicio - 1]!)) {
    inicio -= 1;
  }
  return inicio;
}

/**
 * Corregir la palabra que se acaba de terminar.
 *
 * Se llama cuando el último carácter escrito cierra una palabra —un espacio, un
 * punto, una coma—, igual que hace la tipografía automática. NUNCA repasa el
 * texto entero: una pasada por el manuscrito acabaría cambiando algo dentro de
 * una cita que el autor quería tal cual.
 *
 * Devuelve `null` cuando no hay nada que hacer, que es casi siempre.
 */
export function corregirAlTerminar(texto: string, posicion: number): Correccion | null {
  if (posicion <= 1 || posicion > texto.length) {
    return null;
  }
  if (!cierraPalabra(texto[posicion - 1]!)) {
    return null;
  }

  const fin = posicion - 1;
  const inicio = principioDePalabra(texto, fin);
  if (inicio === fin) {
    return null;
  }

  const palabra = texto.slice(inicio, fin);
  const corregida = TABLA[palabra.toLowerCase()];
  if (!corregida) {
    return null;
  }

  const puesta = comoEstaba(palabra, corregida);
  if (puesta === palabra) {
    return null;
  }
  return {
    texto: texto.slice(0, inicio) + puesta + texto.slice(fin),
    cursor: posicion + (puesta.length - palabra.length),
    de: palabra,
    a: puesta,
  };
}

/**
 * Dos mayúsculas seguidas al empezar una palabra: «HOla» → «Hola».
 *
 * Es el desliz de mecanografía más común que existe —soltar el Mayús un pelín
 * tarde— y no tiene ninguna lectura alternativa, así que se arregla sin miedo.
 * Las siglas se respetan: «ONU» y «PDF» van enteras en mayúscula, y eso no es
 * un desliz; por eso solo se toca cuando el resto de la palabra va en minúscula.
 */
export function arreglarMayusculaDoble(texto: string, posicion: number): Correccion | null {
  if (posicion <= 1 || posicion > texto.length) {
    return null;
  }
  if (!cierraPalabra(texto[posicion - 1]!)) {
    return null;
  }

  const fin = posicion - 1;
  const inicio = principioDePalabra(texto, fin);
  const palabra = texto.slice(inicio, fin);
  if (palabra.length < 3) {
    return null;
  }

  const letras = [...palabra];
  const [a, b] = letras;
  const resto = letras.slice(2).join("");
  const esMayuscula = (c?: string) => Boolean(c) && c === c!.toUpperCase() && c !== c!.toLowerCase();
  if (!esMayuscula(a) || !esMayuscula(b) || resto.length === 0 || resto !== resto.toLowerCase()) {
    return null;
  }

  const puesta = a! + b!.toLowerCase() + resto;
  return {
    texto: texto.slice(0, inicio) + puesta + texto.slice(fin),
    cursor: posicion,
    de: palabra,
    a: puesta,
  };
}
