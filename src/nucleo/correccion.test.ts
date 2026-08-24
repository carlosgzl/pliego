/**
 * Las pruebas del corrector automático.
 *
 * Lo que hay que demostrar no es que corrige —eso es fácil— sino que NO TOCA lo
 * que no debe. Un corrector que convierte «el cerro» en «el cerró» o que elige
 * por su cuenta entre «más» y «mas» estropea frases enteras sin avisar, y en un
 * programa de escribir libros eso es peor que no corregir nada.
 */

import { describe, expect, it } from "vitest";
import { arreglarMayusculaDoble, corregirAlTerminar, CUANTAS_CORRECCIONES } from "./correccion";

/** Escribe `frase` y devuelve la corrección al cerrar la última palabra. */
function alEscribir(frase: string) {
  return corregirAlTerminar(frase, frase.length);
}

describe("corregirAlTerminar", () => {
  it("pone la tilde a las que sin ella no son nada", () => {
    expect(alEscribir("Vino tambien ")?.texto).toBe("Vino también ");
    expect(alEscribir("Llegó despues ")?.texto).toBe("Llegó después ");
    expect(alEscribir("y ademas ")?.texto).toBe("y además ");
    expect(alEscribir("Un dia ")?.texto).toBe("Un día ");
  });

  it("respeta la mayúscula inicial de lo escrito", () => {
    expect(alEscribir("Tambien ")?.texto).toBe("También ");
    // Se llama justo al escribir la coma, que es cuando se cierra la palabra;
    // un carácter más tarde el cierre ya es el espacio y no hay palabra detrás.
    expect(alEscribir("Despues,")?.texto).toBe("Después,");
  });

  it("NO toca las palabras que existen con y sin tilde", () => {
    // Estas son las que estropearían una frase. Ninguna puede cambiar.
    for (const frase of [
      "no quiero mas ",
      "si vienes ",
      "es tu casa ",
      "el perro ",
      "esta mañana ",
      "se marchó ",
      "vino de Madrid ",
      "aun no ",
      "solo tú ",
      "como quieras ",
      "hacia el norte ",
      "el cerro ",
      "yo miro ",
      "cuando llego ",
      "lo dejo ",
      "me quedo ",
    ]) {
      expect(alEscribir(frase), frase).toBeNull();
    }
  });

  it("se corrige en el momento del cierre, no un carácter después", () => {
    // La aplicación lo llama en CADA pulsación, así que siempre pilla el
    // instante bueno. Escrito ya el espacio detrás de la coma, la palabra que
    // hay antes del cursor es la coma misma: ahí no hay nada que corregir, y
    // devolver null es lo correcto.
    expect(corregirAlTerminar("Despues, ", 9)).toBeNull();
  });

  it("solo actúa al cerrar la palabra, nunca mientras se escribe", () => {
    expect(corregirAlTerminar("Vino tambien", 12)).toBeNull();
    expect(corregirAlTerminar("Vino tambien ", 13)).not.toBeNull();
  });

  it("vale cualquier signo que cierre, no solo el espacio", () => {
    expect(alEscribir("¿Vienes tambien?")?.texto).toBe("¿Vienes también?");
    expect(alEscribir("Sí, tambien.")?.texto).toBe("Sí, también.");
    expect(alEscribir("tambien;")?.texto).toBe("también;");
  });

  it("deshace las abreviaturas de mensajería", () => {
    expect(alEscribir("dime q ")?.texto).toBe("dime que ");
    expect(alEscribir("xq ")?.texto).toBe("porque ");
    expect(alEscribir("tb ")?.texto).toBe("también ");
  });

  it("deja en paz una palabra ya bien escrita", () => {
    expect(alEscribir("Vino también ")).toBeNull();
    expect(alEscribir("Un día ")).toBeNull();
  });

  it("no se rompe en los bordes", () => {
    expect(corregirAlTerminar("", 0)).toBeNull();
    expect(corregirAlTerminar(" ", 1)).toBeNull();
    expect(corregirAlTerminar("hola", 99)).toBeNull();
    expect(corregirAlTerminar("   ", 3)).toBeNull();
  });

  it("el cursor queda donde tiene que quedar", () => {
    // «tambien» son 7 letras y «también» también, pero la tilde ocupa lo mismo:
    // lo que importa es que el cursor siga DESPUÉS del espacio recién escrito.
    const r = alEscribir("Vino tambien ")!;
    expect(r.texto[r.cursor - 1]).toBe(" ");
  });

  it("conoce un puñado razonable de palabras", () => {
    // Ni cuatro (inútil) ni veinte mil (sería un diccionario, y entonces habría
    // que resolver la ambigüedad de verdad).
    expect(CUANTAS_CORRECCIONES).toBeGreaterThan(80);
    expect(CUANTAS_CORRECCIONES).toBeLessThan(400);
  });
});

describe("arreglarMayusculaDoble", () => {
  it("arregla el Mayús soltado tarde", () => {
    expect(arreglarMayusculaDoble("HOla ", 5)?.texto).toBe("Hola ");
    expect(arreglarMayusculaDoble("Dijo: ESto ", 11)?.texto).toBe("Dijo: Esto ");
  });

  it("no toca las siglas", () => {
    expect(arreglarMayusculaDoble("la ONU ", 7)).toBeNull();
    expect(arreglarMayusculaDoble("en PDF ", 7)).toBeNull();
  });

  it("no toca una palabra normal", () => {
    expect(arreglarMayusculaDoble("Hola ", 5)).toBeNull();
    expect(arreglarMayusculaDoble("hola ", 5)).toBeNull();
  });

  it("hacen falta al menos tres letras", () => {
    // «EN» podría ser una sigla o el principio de algo; no hay suficiente para
    // decidir, así que no se toca.
    expect(arreglarMayusculaDoble("EN ", 3)).toBeNull();
  });
});
