/**
 * Tests for the parts that can silently eat a paragraph.
 *
 * Deliberately concentrated on the pure core: the file format (which Alexandria
 * also reads), the block splitter (which decides what a page contains) and the
 * editing commands (which rewrite the manuscript under the caret). The React
 * layer is not tested here — a broken button is visible in a second, a broken
 * `envolver` is a chapter with stars in it that you find a week later.
 */

import { describe, expect, it } from "vitest";
import {
  aRomano,
  capitulosDe,
  contarPalabras,
  enPalabras,
  partirEnBloques,
} from "./bloques";
import {
  alternarTitulo,
  enterTrasTitulo,
  envolver,
  nuevaEscena,
  nuevoCapitulo,
  tipografia,
} from "./edicion";
import { fuenteDe, pilaDe } from "./fuentes";
import { geometria, juzgarMedida, margenesMm, medidaEnCaracteres, medidaMm } from "./geometria";
import { sinMarcas, trozos } from "./inline";
import { componer, descomponer, DISENO_POR_DEFECTO, metaPorDefecto } from "./libro";
import { cornisaDe, dinkusDe, folioDe, ladoFolio, numeroCapituloDe } from "./pagina";

describe("el archivo del libro", () => {
  it("sobrevive a ir al disco y volver", () => {
    const meta = metaPorDefecto("La biblioteca inacabada");
    meta.autor = "Carlos González Alcalde";
    meta.subtitulo = "apuntes de un copista";
    meta.diseno.tamano = 9.5;
    meta.portada.color = "#7a2e1e";
    const cuerpo = "# Primero\n\nUna frase.\n";

    const { meta: vuelta, cuerpo: prosa } = descomponer(componer(meta, cuerpo));

    expect(prosa).toBe(cuerpo);
    expect(vuelta.titulo).toBe(meta.titulo);
    expect(vuelta.autor).toBe(meta.autor);
    expect(vuelta.subtitulo).toBe(meta.subtitulo);
    expect(vuelta.diseno.tamano).toBe(9.5);
    expect(vuelta.portada.color).toBe("#7a2e1e");
  });

  it("no rompe el YAML con títulos que empiezan por dos puntos o comillas", () => {
    const meta = metaPorDefecto(': "Nada", dijo — y se fue');
    const { meta: vuelta } = descomponer(componer(meta, ""));
    expect(vuelta.titulo).toBe(': "Nada", dijo — y se fue');
  });

  it("abre un libro escrito por una versión anterior, sin los campos nuevos", () => {
    const viejo = [
      "---",
      "titulo: Fortaleza en la Soledad",
      "autor: Carlos",
      'diseno: {"fuente":"garamond","tamano":11,"pagina":"a5","margenes":"normal"}',
      'portada: {"diseno":"sello","color":"#7a2e1e"}',
      "---",
      "",
      "# Uno",
      "",
      "Texto.",
    ].join("\n");

    const { meta, cuerpo } = descomponer(viejo);

    expect(meta.titulo).toBe("Fortaleza en la Soledad");
    expect(meta.diseno.tamano).toBe(11);
    // Fields the old file never had take today's defaults rather than undefined.
    expect(meta.diseno.dinkus).toBe(DISENO_POR_DEFECTO.dinkus);
    expect(meta.diseno.margenLomo).toBe(DISENO_POR_DEFECTO.margenLomo);
    expect(meta.portada.tinta).toBeTruthy();
    expect(cuerpo).toContain("# Uno");
  });

  it("acepta un archivo sin cabecera en vez de negarse a abrirlo", () => {
    const { meta, cuerpo } = descomponer("Solo prosa, sin nada delante.");
    expect(meta.titulo).toBe("Sin título");
    expect(cuerpo).toBe("Solo prosa, sin nada delante.");
  });

  it("guarda las tres letras de la portada y las recupera", () => {
    const meta = metaPorDefecto("Combinada");
    meta.portada.fuente = "garamond";
    meta.portada.fuenteTitulo = "elegante";
    meta.portada.fuenteSub = "moderna";
    meta.portada.fuenteAutor = "grotesca";

    const vuelta = descomponer(componer(meta, "")).meta.portada;

    expect(vuelta.fuenteTitulo).toBe("elegante");
    expect(vuelta.fuenteSub).toBe("moderna");
    expect(vuelta.fuenteAutor).toBe("grotesca");
  });

  it("un libro sin las tres letras cae en la general, no en blanco", () => {
    // Una portada escrita antes de que existieran los tres campos.
    const viejo = [
      "---",
      "titulo: De antes",
      'portada: {"diseno":"sello","color":"#111","fuente":"caslon"}',
      "---",
      "",
      "Texto.",
    ].join("\n");

    const { portada } = descomponer(viejo).meta;

    expect(portada.fuente).toBe("caslon");
    expect(portada.fuenteTitulo).toBeUndefined();
    expect(portada.fuenteSub).toBeUndefined();
  });

  it("la textura y lo puesto a mano sobreviven al viaje al disco", () => {
    // Es EL contrato: si esto no vuelve igual, una portada trabajada durante
    // media hora se pierde al cerrar el libro.
    const meta = metaPorDefecto("Con adornos");
    meta.portada.textura = "lino";
    meta.portada.elementos = [
      {
        id: "e1",
        tipo: "texto",
        contenido: "PRIMERA\nEDICIÓN",
        x: 82.5,
        y: 14,
        ancho: 40,
        tamano: 0.7,
        giro: -6,
        tracking: 0.18,
        versalitas: true,
        alineacion: "derecha",
      },
      { id: "e2", tipo: "imagen", contenido: "data:image/webp;base64,AAAA", x: 20, y: 80, ancho: 25, opacidad: 0.4, redondez: 50 },
    ];

    const escrito = componer(meta, "Prosa.");
    const vuelta = descomponer(escrito).meta.portada;

    // Una sola línea: el JSON de la portada tiene que seguir siendo YAML válido
    // o el archivo deja de abrirse en Obsidian.
    const linea = escrito.split("\n").find((l) => l.startsWith("portada:"));
    expect(linea).toBeDefined();
    expect(linea).toContain("PRIMERA");

    expect(vuelta.textura).toBe("lino");
    expect(vuelta.elementos).toHaveLength(2);
    expect(vuelta.elementos?.[0]?.contenido).toBe("PRIMERA\nEDICIÓN");
    expect(vuelta.elementos?.[0]?.giro).toBe(-6);
    expect(vuelta.elementos?.[0]?.versalitas).toBe(true);
    expect(vuelta.elementos?.[1]?.redondez).toBe(50);
  });

  it("una portada de antes de las texturas se abre sin ellas y sin romperse", () => {
    const viejo = [
      "---",
      "titulo: De antes",
      'portada: {"diseno":"sello","color":"#111","tinta":"#eee","fuente":"garamond"}',
      "---",
      "",
      "Texto.",
    ].join("\n");

    const { portada } = descomponer(viejo).meta;

    expect(portada.textura).toBeUndefined();
    expect(portada.elementos).toBeUndefined();
    expect(portada.color).toBe("#111");
  });

  it("no escribe la pila de fuentes en el disco (es derivada)", () => {
    const salida = componer(metaPorDefecto("X"), "");
    expect(salida).not.toContain("fuentePila");
    expect(descomponer(salida).meta.diseno.fuentePila).toBe(pilaDe("garamond"));
  });
});

describe("partir la prosa", () => {
  const cuerpo = [
    "# Primero",
    "",
    "Un párrafo",
    "en dos líneas.",
    "",
    "Otro párrafo.",
    "",
    "***",
    "",
    "Tras la escena.",
    "",
    "# Segundo",
    "",
    "Final.",
  ].join("\n");

  it("junta las líneas de un párrafo y separa los títulos", () => {
    const bloques = partirEnBloques(cuerpo);
    expect(bloques[0]).toMatchObject({ nivel: 1, texto: "Primero" });
    expect(bloques[1]).toMatchObject({ nivel: 0, texto: "Un párrafo en dos líneas.", primero: true });
    expect(bloques[2]).toMatchObject({ nivel: 0, primero: false });
  });

  it("reconoce el separador de escena", () => {
    const bloques = partirEnBloques(cuerpo);
    expect(bloques.some((bloque) => bloque.nivel === -1)).toBe(true);
    // The paragraph after a break opens like a first paragraph.
    const tras = bloques[bloques.findIndex((bloque) => bloque.nivel === -1) + 1];
    expect(tras?.primero).toBe(true);
  });

  it("cuenta capítulos con sus palabras y sus escenas", () => {
    const capitulos = capitulosDe(partirEnBloques(cuerpo));
    expect(capitulos).toHaveLength(2);
    expect(capitulos[0]?.titulo).toBe("Primero");
    expect(capitulos[0]?.escenas).toBe(2);
    expect(capitulos[1]?.palabras).toBe(1);
  });

  it("quita las marcas del título en la lista de capítulos", () => {
    const capitulos = capitulosDe(partirEnBloques("# La **tormenta**\n\nTexto."));
    expect(capitulos[0]?.titulo).toBe("La tormenta");
  });

  it("no cuenta las almohadillas ni los separadores como palabras", () => {
    expect(contarPalabras("# Uno\n\ndos tres\n\n***\n\ncuatro")).toBe(4);
    expect(contarPalabras("   ")).toBe(0);
  });
});

describe("marcas en línea", () => {
  it("distingue negrita, cursiva y las dos juntas", () => {
    expect(trozos("un **fuerte** y un *suave*")).toEqual([
      { texto: "un ", fuerte: false, cursiva: false },
      { texto: "fuerte", fuerte: true, cursiva: false },
      { texto: " y un ", fuerte: false, cursiva: false },
      { texto: "suave", fuerte: false, cursiva: true },
    ]);
    expect(trozos("***ambas***")[0]).toEqual({ texto: "ambas", fuerte: true, cursiva: true });
  });

  it("deja en paz un asterisco suelto", () => {
    expect(sinMarcas("dos * tres")).toBe("dos * tres");
  });
});

describe("comandos de edición", () => {
  it("envuelve y desenvuelve la selección", () => {
    const puesto = envolver("una palabra aquí", 4, 11, "**");
    expect(puesto.texto).toBe("una **palabra** aquí");
    expect(puesto.texto.slice(puesto.desde, puesto.hasta)).toBe("palabra");

    const quitado = envolver(puesto.texto, puesto.desde, puesto.hasta, "**");
    expect(quitado.texto).toBe("una palabra aquí");
    expect(quitado.texto.slice(quitado.desde, quitado.hasta)).toBe("palabra");
  });

  it("pone cursiva SOBRE la negrita en vez de comerse una estrella", () => {
    const texto = "**negrita**";
    const resultado = envolver(texto, 0, texto.length, "*");
    expect(resultado.texto).toBe("***negrita***");
  });

  it("quita la marca aunque esté justo fuera de la selección", () => {
    const texto = "una **palabra** aquí";
    const resultado = envolver(texto, 6, 13, "**");
    expect(resultado.texto).toBe("una palabra aquí");
    expect(resultado.hasta).toBeLessThanOrEqual(resultado.texto.length);
  });

  it("convierte una línea en capítulo y la devuelve a prosa", () => {
    const puesto = alternarTitulo("Primero", 3, 1);
    expect(puesto.texto).toBe("# Primero");
    expect(alternarTitulo(puesto.texto, puesto.desde, 1).texto).toBe("Primero");
  });

  it("abre el capítulo nuevo donde estás, no al final del libro", () => {
    const libro = "# Uno\n\nTexto de uno.\n\n# Tres\n\nTexto de tres.";
    const resultado = nuevoCapitulo(libro, 8);
    expect(resultado.texto).toBe("# Uno\n\nTexto de uno.\n\n# \n\n# Tres\n\nTexto de tres.");
    expect(resultado.desde).toBe(resultado.texto.indexOf("# \n\n# Tres") + 2);
  });

  it("no deja líneas en blanco colgando al final", () => {
    expect(nuevoCapitulo("# Uno\n\nTexto.", 12).texto).toBe("# Uno\n\nTexto.\n\n# ");
  });

  it("sale del título al pulsar Intro", () => {
    const salto = enterTrasTitulo("# Uno", 5);
    expect(salto?.texto).toBe("# Uno\n\n");
    expect(enterTrasTitulo("prosa normal", 12)).toBeNull();
  });

  it("mete la escena después de la línea actual", () => {
    const resultado = nuevaEscena("Uno.\nDos.", 4);
    expect(resultado.texto).toBe("Uno.\n\n***\n\nDos.");
  });

  it("arregla la tipografía según se escribe", () => {
    expect(tipografia("Eso...", 6)?.texto).toBe("Eso…");
    expect(tipografia("Ella--", 6)?.texto).toBe("Ella—");
    expect(tipografia("<<", 2)?.texto).toBe("«");
    expect(tipografia("nada raro", 9)).toBeNull();
  });
});

describe("la página", () => {
  it("escala papel, márgenes y letra con el mismo factor", () => {
    const entera = geometria(DISENO_POR_DEFECTO);
    const mitad = geometria(DISENO_POR_DEFECTO, entera.paginaAlto / 2);
    expect(mitad.escala).toBeCloseTo(0.5, 2);
    // Pixel values are rounded to whole pixels, so half of an odd number is
    // half a pixel out. Anything more than that would be a real scaling bug.
    expect(Math.abs(mitad.paginaAncho - entera.paginaAncho / 2)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(mitad.margenLomo - entera.margenLomo / 2)).toBeLessThanOrEqual(0.5);
    expect(mitad.cuerpo).toBeCloseTo(entera.cuerpo / 2, 1);
  });

  it("respeta un tamaño a medida y lo acota", () => {
    const medida = medidaMm({ ...DISENO_POR_DEFECTO, pagina: "personalizada", anchoMm: 9000, altoMm: 250 });
    expect(medida.ancho).toBe(420);
    expect(medida.alto).toBe(250);
  });

  it("da los cuatro márgenes por separado cuando son a medida", () => {
    const margen = margenesMm({
      ...DISENO_POR_DEFECTO,
      margenes: "personalizados",
      margenArriba: 15,
      margenAbajo: 25,
      margenLomo: 30,
      margenCorte: 18,
    });
    expect(margen).toEqual({ arriba: 15, abajo: 25, lomo: 30, corte: 18 });
  });

  it("juzga la medida de la línea", () => {
    expect(juzgarMedida(medidaEnCaracteres(DISENO_POR_DEFECTO))).toBe("buena");
    expect(juzgarMedida(30)).toBe("corta");
    expect(juzgarMedida(95)).toBe("larga");
  });

  it("pone el autor en el verso y el título en el recto", () => {
    const meta = metaPorDefecto("El título");
    meta.autor = "El autor";
    expect(cornisaDe(2, meta)).toBe("El autor");
    expect(cornisaDe(3, meta)).toBe("El título");
  });

  it("sin autor, la cornisa no deja media página en blanco", () => {
    const meta = metaPorDefecto("El título");
    expect(cornisaDe(2, meta)).toBe("El título");
  });

  it("numera en romanos cuando se le pide", () => {
    expect(folioDe(24, { ...DISENO_POR_DEFECTO, numeracion: "romanos" })).toBe("xxiv");
    expect(folioDe(24, { ...DISENO_POR_DEFECTO, numeracion: "ninguna" })).toBe("");
    expect(aRomano(1994)).toBe("mcmxciv");
  });

  it("pone el folio en el borde exterior", () => {
    const diseno = { ...DISENO_POR_DEFECTO, folio: "pie-fuera" as const };
    expect(ladoFolio(2, diseno)).toBe("izquierda");
    expect(ladoFolio(3, diseno)).toBe("derecha");
    expect(ladoFolio(3, DISENO_POR_DEFECTO)).toBe("centro");
  });

  it("escribe el número del capítulo como se le pida", () => {
    expect(numeroCapituloDe(9, { ...DISENO_POR_DEFECTO, numeroCapitulo: "romano" })).toBe("IX");
    expect(numeroCapituloDe(9, { ...DISENO_POR_DEFECTO, numeroCapitulo: "palabra" })).toBe(
      "Capítulo nueve",
    );
    expect(numeroCapituloDe(9, DISENO_POR_DEFECTO)).toBe("");
    expect(enPalabras(47)).toBe("47");
  });

  it("el separador de escena por defecto es aire, no un símbolo", () => {
    expect(dinkusDe(DISENO_POR_DEFECTO)).toBe("");
    expect(dinkusDe({ ...DISENO_POR_DEFECTO, dinkus: "asteriscos" })).toBe("* * *");
  });
});

describe("tipografías", () => {
  it("una fuente desconocida cae en la de por defecto en vez de romper el libro", () => {
    expect(fuenteDe("no-existe").key).toBe("garamond");
    expect(pilaDe(null)).toContain("Garamond");
  });
});
