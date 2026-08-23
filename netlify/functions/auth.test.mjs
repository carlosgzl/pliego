/**
 * Que el almacén de la cuenta funda igual que el cliente.
 *
 * La aritmética está duplicada a propósito —aquí en la función y en
 * `src/datos/fusion.ts`— porque el servidor tiene que converger aunque dos
 * dispositivos escriban a la vez, y una función de Netlify no puede importar
 * del `src` de la aplicación. Duplicar código sin pruebas es cómo dos copias se
 * separan sin que nadie se entere: estas pruebas son el pegamento.
 *
 * Se comprueban las mismas propiedades que en `fusion.test.ts`, sobre la
 * implementación de este lado.
 */

import { describe, expect, it } from "vitest";
import { fundir } from "./auth.mjs";

const libro = (contenido, at) => ({ contenido, at });

describe("fundir, en la función de cuentas", () => {
  it("se queda con la unión de las dos bibliotecas", () => {
    const salida = fundir(
      { libros: { novela: libro("en casa", 100) } },
      { libros: { apuntes: libro("en clase", 200) } },
    );
    expect(Object.keys(salida.libros).sort()).toEqual(["apuntes", "novela"]);
  });

  it("de un mismo libro gana la copia más nueva, venga de donde venga", () => {
    const vieja = { libros: { novela: libro("uno", 100) } };
    const nueva = { libros: { novela: libro("uno y dos", 200) } };
    expect(fundir(vieja, nueva).libros.novela.contenido).toBe("uno y dos");
    expect(fundir(nueva, vieja).libros.novela.contenido).toBe("uno y dos");
  });

  it("una lápida mata las copias anteriores a ella", () => {
    const dormido = { libros: { novela: libro("texto", 100) } };
    const borro = { libros: {}, borrados: { novela: 150 } };
    expect(fundir(dormido, borro).libros.novela).toBeUndefined();
    expect(fundir(borro, dormido).libros.novela).toBeUndefined();
  });

  it("volver a escribir después de borrar resucita el libro", () => {
    const salida = fundir(
      { libros: {}, borrados: { novela: 150 } },
      { libros: { novela: libro("otra vez", 300) } },
    );
    expect(salida.libros.novela.contenido).toBe("otra vez");
    expect(salida.borrados.novela).toBeUndefined();
  });

  it("acepta lo que guardó la versión anterior, que no tenía lápidas", () => {
    const salida = fundir({ libros: { uno: libro("texto", 5) }, ajustes: null, at: 5 }, {});
    expect(salida.libros.uno.contenido).toBe("texto");
    expect(salida.borrados).toEqual({});
  });

  it("no se rompe con un almacén vacío ni con basura", () => {
    expect(fundir(null, undefined)).toEqual({ libros: {}, borrados: {} });
    expect(fundir({ libros: { malo: { contenido: 7 } } }, {}).libros.malo).toBeUndefined();
  });

  it("da el mismo resultado en cualquier orden", () => {
    const a = { libros: { uno: libro("A", 10), dos: libro("A", 30) } };
    const b = { libros: { uno: libro("B", 20), tres: libro("B", 5) } };
    expect(fundir(a, b)).toEqual(fundir(b, a));
  });
});
