/**
 * Las pruebas del medidor de contraseñas.
 *
 * Lo que se comprueba no es «da un número», sino que el número dice la verdad:
 * que una contraseña de diccionario nunca aprueba por mucho que sea larga, que
 * una frase larga de solo minúsculas puntúa alto —porque es cierto: la longitud
 * es lo que de verdad cuesta— y que el consejo cambia con lo que le falta.
 */

import { describe, expect, it } from "vitest";
import { medirClave, MINIMO, variedadDe } from "./seguridad";

describe("medirClave", () => {
  it("una vacía no vale ni dice nada", () => {
    const f = medirClave("");
    expect(f.nota).toBe(0);
    expect(f.valida).toBe(false);
    expect(f.consejo).toBe("");
  });

  it("por debajo del mínimo del servidor no es válida, y lo dice", () => {
    const f = medirClave("abc12");
    expect(f.valida).toBe(false);
    expect(f.consejo).toContain("3");
  });

  it("las de diccionario no aprueban por larga que sea", () => {
    for (const mala of ["password", "12345678", "contrasena123456", "qwertyuiop"]) {
      expect(medirClave(mala).nota).toBeLessThanOrEqual(1);
    }
  });

  it("una tirada de teclas seguidas cuenta como floja", () => {
    expect(medirClave("miasdfghjkl").nota).toBeLessThanOrEqual(1);
  });

  it("repetir un carácter no la alarga de verdad", () => {
    expect(medirClave("aaaaaaaaaaaa").nota).toBeLessThanOrEqual(1);
  });

  it("una frase larga de solo minúsculas puntúa alto", () => {
    // Es el argumento entero a favor de las frases de contraseña: son mucho más
    // caras de adivinar que ocho caracteres con símbolos, y se recuerdan.
    const f = medirClave("cuandolalluviacaesobreelpliego");
    expect(f.nota).toBeGreaterThanOrEqual(3);
    expect(f.valida).toBe(true);
  });

  it("mezclar familias mejora la nota", () => {
    expect(medirClave("Mirlo7Nube!x").nota).toBeGreaterThan(medirClave("mirlonubexy").nota);
  });

  it("la excelente no tiene nada que aconsejar", () => {
    expect(medirClave("Mirlo7-Nube-Cantera!").consejo).toBe("");
  });

  it("el nombre acompaña siempre a la nota", () => {
    for (const clave of ["a", "abcdefgh", "Mirlo7Nube!x", "Mirlo7-Nube-Cantera!"]) {
      const f = medirClave(clave);
      expect(f.nombre.length).toBeGreaterThan(0);
      expect(f.nota).toBeGreaterThanOrEqual(0);
      expect(f.nota).toBeLessThanOrEqual(4);
    }
  });

  it("el mínimo es el mismo que exige la función de cuentas", () => {
    expect(MINIMO).toBe(8);
  });
});

describe("variedadDe", () => {
  it("cuenta las cuatro familias", () => {
    expect(variedadDe("abc")).toBe(1);
    expect(variedadDe("Abc")).toBe(2);
    expect(variedadDe("Abc1")).toBe(3);
    expect(variedadDe("Abc1!")).toBe(4);
  });

  it("las vocales con tilde y la eñe son letras, no signos", () => {
    // Si contaran como «otro», una contraseña en español sacaría un punto de
    // regalo que no le corresponde.
    expect(variedadDe("camión")).toBe(1);
    expect(variedadDe("ÑOÑO")).toBe(1);
  });
});
