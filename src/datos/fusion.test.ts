/**
 * Las pruebas de la fusión.
 *
 * Esto es lo que decide qué versión de un capítulo sobrevive cuando dos
 * dispositivos han escrito. Un botón roto se ve en un segundo; una fusión mal
 * hecha es un capítulo que desaparece y del que nadie se entera hasta una
 * semana después, cuando ya no hay copia. Por eso se prueba a conciencia y
 * por eso las propiedades que se comprueban son las de verdad: que no pierde
 * libros, que no resucita borrados, y que da igual el orden en que lleguen las
 * copias.
 */

import { describe, expect, it } from "vitest";
import { bibliotecaVacia, fundir, fundirTodas, loQueFalta, normalizar, type Biblioteca } from "./fusion";

function libro(contenido: string, at: number) {
  return { contenido, at };
}

function biblioteca(
  libros: Record<string, { contenido: string; at: number }>,
  borrados: Record<string, number> = {},
): Biblioteca {
  return { libros, borrados };
}

describe("fundir", () => {
  it("se queda con la unión, no con una de las dos listas", () => {
    // El fallo original: la lista del ordenador sustituía a la de la cuenta, y
    // lo escrito en el portátil desaparecía de la estantería.
    const enCasa = biblioteca({ novela: libro("en casa", 100) });
    const enClase = biblioteca({ apuntes: libro("en clase", 200) });
    const juntas = fundir(enCasa, enClase);
    expect(Object.keys(juntas.libros).sort()).toEqual(["apuntes", "novela"]);
  });

  it("de un mismo libro se queda con la copia más nueva", () => {
    const vieja = biblioteca({ novela: libro("capítulo uno", 100) });
    const nueva = biblioteca({ novela: libro("capítulo uno y dos", 200) });
    expect(fundir(vieja, nueva).libros.novela?.contenido).toBe("capítulo uno y dos");
    expect(fundir(nueva, vieja).libros.novela?.contenido).toBe("capítulo uno y dos");
  });

  it("da el mismo resultado en cualquier orden", () => {
    const a = biblioteca({ uno: libro("A", 10), dos: libro("A", 30) });
    const b = biblioteca({ uno: libro("B", 20), tres: libro("B", 5) });
    expect(fundir(a, b)).toEqual(fundir(b, a));
  });

  it("fundir dos veces no cambia nada", () => {
    const a = biblioteca({ uno: libro("A", 10) });
    const b = biblioteca({ uno: libro("B", 20), dos: libro("B", 1) });
    const una = fundir(a, b);
    expect(fundir(una, b)).toEqual(una);
  });

  it("una lápida se lleva por delante las copias anteriores a ella", () => {
    // El dispositivo dormido todavía tiene el libro; el que lo borró trae la
    // lápida. Sin esto, el libro volvería a la estantería solo.
    const dormido = biblioteca({ novela: libro("texto", 100) });
    const borro = biblioteca({}, { novela: 150 });
    expect(fundir(dormido, borro).libros.novela).toBeUndefined();
    expect(fundir(borro, dormido).libros.novela).toBeUndefined();
  });

  it("volver a escribir después de borrar resucita el libro", () => {
    // Recuperar un rescate y seguir escribiendo tiene que funcionar.
    const borro = biblioteca({}, { novela: 150 });
    const reescrito = biblioteca({ novela: libro("otra vez", 300) });
    const juntas = fundir(borro, reescrito);
    expect(juntas.libros.novela?.contenido).toBe("otra vez");
    expect(juntas.borrados.novela).toBeUndefined();
  });

  it("olvida las lápidas de hace más de noventa días", () => {
    const antigua = biblioteca({}, { viejo: Date.now() - 200 * 24 * 60 * 60 * 1000 });
    expect(fundir(antigua, bibliotecaVacia()).borrados.viejo).toBeUndefined();
  });

  it("conserva las lápidas recientes, que aún tienen trabajo que hacer", () => {
    const reciente = biblioteca({}, { borrado: Date.now() - 1000 });
    expect(fundir(reciente, bibliotecaVacia()).borrados.borrado).toBeDefined();
  });
});

describe("fundirTodas", () => {
  it("ignora las fuentes que no contestaron", () => {
    const juntas = fundirTodas(
      biblioteca({ uno: libro("A", 1) }),
      null,
      undefined,
      biblioteca({ dos: libro("B", 2) }),
    );
    expect(Object.keys(juntas.libros).sort()).toEqual(["dos", "uno"]);
  });
});

describe("normalizar", () => {
  it("acepta lo que guardó una versión anterior, sin lápidas", () => {
    const salida = normalizar({ libros: { uno: { contenido: "texto", at: 5 } } });
    expect(salida.libros.uno?.contenido).toBe("texto");
    expect(salida.borrados).toEqual({});
  });

  it("no se rompe con basura", () => {
    expect(normalizar(null)).toEqual(bibliotecaVacia());
    expect(normalizar("qué")).toEqual(bibliotecaVacia());
    expect(normalizar({ libros: { malo: { contenido: 7 } } }).libros.malo).toBeUndefined();
  });

  it("un libro sin fecha se queda el último, no el primero", () => {
    // `at: 0` es lo correcto: sin fecha no puede ganarle a nada fechado.
    const sinFecha = normalizar({ libros: { uno: { contenido: "viejo" } } });
    const conFecha = biblioteca({ uno: libro("nuevo", 1) });
    expect(fundir(sinFecha, conFecha).libros.uno?.contenido).toBe("nuevo");
  });
});

describe("loQueFalta", () => {
  it("nombra lo que el destino no tiene o tiene más viejo", () => {
    const aqui = biblioteca({ uno: libro("A", 10), dos: libro("A", 10), tres: libro("A", 10) });
    const alla = biblioteca({ uno: libro("B", 10), dos: libro("B", 5) });
    expect(loQueFalta(aqui, alla).sort()).toEqual(["dos", "tres"]);
  });
});
