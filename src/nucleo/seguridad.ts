/**
 * Qué tan buena es una contraseña, y qué le falta para serlo.
 *
 * POR QUÉ NO UN «MÍNIMO OCHO CARACTERES» Y YA. Porque `12345678` cumple y
 * `sol` no, y de las dos la segunda es mejor de lo que parece y la primera es
 * de las diez más usadas del mundo. Una barrita que solo mide longitud enseña a
 * la gente a escribir `Password1!`, que es exactamente la contraseña que un
 * atacante prueba primero.
 *
 * LO QUE SE MIDE AQUÍ es lo que de verdad cuesta adivinar:
 *
 *   · la LONGITUD, que es con diferencia lo que más pesa — cada carácter
 *     multiplica las combinaciones, mientras que añadir un símbolo solo las
 *     suma una vez;
 *   · la VARIEDAD de tipos de carácter, que amplía el alfabeto a probar;
 *   · y se DESCUENTA lo que un diccionario de ataque tiene en la primera
 *     página: las contraseñas famosas, las secuencias de teclado, las series de
 *     números y una misma letra repetida.
 *
 * Con eso sale una nota de 0 a 4, que es la escala que usa todo el mundo y que
 * la gente ya sabe leer. Y algo más útil que la nota: QUÉ HACER PARA SUBIRLA,
 * en una frase, porque una barra roja sin consejo solo produce frustración.
 *
 * ESTO NO PROTEGE NADA POR SÍ SOLO. Quien guarda la contraseña a salvo es el
 * scrypt del servidor (`netlify/functions/auth.mjs`), que está hecho para ser
 * caro a propósito. Esto es un consejo honesto en el momento de elegirla, que
 * es cuando sirve de algo.
 */

export interface Fuerza {
  /** De 0 a 4. */
  nota: number;
  /** Cómo se llama esa nota, para poder decirla. */
  nombre: "muy débil" | "débil" | "aceptable" | "buena" | "excelente";
  /** Qué haría falta para subirla. Vacío cuando ya no hace falta nada. */
  consejo: string;
  /** Cumple el mínimo que exige el servidor. */
  valida: boolean;
}

/** Lo que pide la función de cuentas. Si cambia allí, cambia aquí. */
export const MINIMO = 8;

const NOMBRES = ["muy débil", "débil", "aceptable", "buena", "excelente"] as const;

/**
 * Las que están en la primera página de cualquier diccionario de ataque.
 *
 * No es una lista exhaustiva ni pretende serlo —eso son megabytes— sino las que
 * de verdad aparecen una y otra vez, incluidas las españolas, que las listas
 * inglesas no traen.
 */
const CONOCIDAS = [
  "123456",
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "contrasena",
  "contraseña",
  "qwerty",
  "qwertyui",
  "abc123",
  "111111",
  "000000",
  "iloveyou",
  "admin",
  "letmein",
  "welcome",
  "monkey",
  "dragon",
  "football",
  "princesa",
  "estrella",
  "carlos",
  "pliego",
  "barcelona",
  "madrid",
  "realmadrid",
  "sevilla",
  "hola",
  "holahola",
  "tequiero",
  "asdfghjk",
];

/** Filas del teclado, para pillar `qwerty`, `asdfgh` y sus trozos. */
const FILAS = ["qwertyuiop", "asdfghjklñ", "zxcvbnm", "1234567890"];

function tieneSecuencia(clave: string): boolean {
  const bajo = clave.toLowerCase();
  for (const fila of FILAS) {
    for (let i = 0; i + 4 <= fila.length; i += 1) {
      const trozo = fila.slice(i, i + 4);
      const alReves = [...trozo].reverse().join("");
      if (bajo.includes(trozo) || bajo.includes(alReves)) {
        return true;
      }
    }
  }
  return false;
}

/** `aaaa`, `1111`: cuatro veces el mismo carácter seguido. */
function tieneRepeticion(clave: string): boolean {
  return /(.)\1{3,}/.test(clave);
}

/**
 * Si la contraseña ES una de las conocidas, no si la CONTIENE.
 *
 * La primera versión buscaba con `includes` y castigaba de más: la prueba pilló
 * que «cuandolalluviacaesobreelpliego» —treinta caracteres, buenísima— bajaba a
 * la nota mínima solo porque dentro había «pliego». Encontrar una palabra
 * común dentro de una frase larga no dice nada, porque el atacante tendría que
 * adivinar además las otras veinticuatro letras.
 *
 * Así que se marca cuando la palabra conocida ES la contraseña, cuando lo es
 * quitándole los adornos —`Password123!` es `password`, y todo el mundo hace
 * eso mismo— o cuando ocupa la mayor parte de lo escrito.
 */
function esConocida(clave: string): boolean {
  const bajo = clave.toLowerCase();
  const desnuda = bajo.replace(/[^\p{L}]/gu, "");
  return CONOCIDAS.some(
    (mala) =>
      bajo === mala ||
      desnuda === mala ||
      (bajo.includes(mala) && mala.length / bajo.length >= 0.6),
  );
}

/** Cuántas familias de carácter distintas usa: minúscula, mayúscula, cifra, otro. */
export function variedadDe(clave: string): number {
  let familias = 0;
  if (/[a-záéíóúüñ]/.test(clave)) {
    familias += 1;
  }
  if (/[A-ZÁÉÍÓÚÜÑ]/.test(clave)) {
    familias += 1;
  }
  if (/\d/.test(clave)) {
    familias += 1;
  }
  if (/[^\p{L}\d]/u.test(clave)) {
    familias += 1;
  }
  return familias;
}

export function medirClave(clave: string): Fuerza {
  const largo = clave.length;
  const valida = largo >= MINIMO;

  if (largo === 0) {
    return { nota: 0, nombre: "muy débil", consejo: "", valida: false };
  }

  const variedad = variedadDe(clave);

  /*
   * La longitud manda. Los saltos están donde de verdad cambian las cosas: por
   * debajo de ocho no hay contraseña que valga por muchos símbolos que lleve, y
   * a partir de dieciséis la longitud sola ya la hace muy cara de adivinar,
   * aunque sean todo minúsculas — que es el argumento entero a favor de las
   * frases de contraseña.
   */
  let nota = 0;
  if (largo >= 8) {
    nota += 1;
  }
  if (largo >= 12) {
    nota += 1;
  }
  if (largo >= 16) {
    nota += 1;
  }
  if (variedad >= 3) {
    nota += 1;
  }
  if (variedad >= 2 && largo >= 10) {
    nota += 1;
  }

  const floja = esConocida(clave) || tieneSecuencia(clave) || tieneRepeticion(clave);
  if (floja) {
    // Una contraseña de diccionario no es «media buena»: es de las primeras que
    // se prueban, y da igual que sea larga.
    nota = Math.min(nota, 1);
  }
  nota = Math.max(0, Math.min(4, nota));

  return {
    nota,
    nombre: NOMBRES[nota]!,
    consejo: aconsejar(clave, { largo, variedad, floja, nota }),
    valida,
  };
}

function aconsejar(
  clave: string,
  datos: { largo: number; variedad: number; floja: boolean; nota: number },
): string {
  if (datos.floja) {
    if (esConocida(clave)) {
      return "Esa es de las primeras que prueba cualquiera. Cámbiala entera.";
    }
    if (tieneSecuencia(clave)) {
      return "Lleva una tirada de teclas seguidas, y eso se adivina en segundos.";
    }
    return "Repetir el mismo carácter no la hace más larga para quien la ataca.";
  }
  if (datos.largo < MINIMO) {
    return `Le faltan ${MINIMO - datos.largo} caracteres para el mínimo.`;
  }
  if (datos.nota >= 4) {
    return "";
  }
  if (datos.largo < 12) {
    return "Alargarla es lo que más la mejora: tres palabras sueltas ya son mucho.";
  }
  if (datos.variedad < 3) {
    return "Mezcla mayúsculas, números o algún signo y sube de golpe.";
  }
  return "Un par de caracteres más y estaría en lo más alto.";
}
