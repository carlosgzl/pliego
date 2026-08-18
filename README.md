# Scriptorium

Un sitio para escribir libros. Escribes arriba y las páginas se componen debajo,
con tu tipografía, tus márgenes y tu portada — y lo que sale es un libro, no un
documento.

**En internet:** https://scriptorium-cga.netlify.app
**Comparte biblioteca con:** [Alexandria](https://github.com/carlosgzl/alexandria)

---

## Qué es y qué no es

Es una **superficie de escritura**, no un procesador de textos. Hay dos
pantallas: la estantería y el taller. En el taller hay una barra fina, el
manuscrito, y nada más — todo lo demás (el índice, la página compuesta, el
diseño) está detrás de un botón que pulsas cuando lo quieres, y se recuerda.

No hay carpetas, ni etiquetas, ni colaboración, ni comentarios, ni control de
versiones. Un libro es un archivo y tú eres una persona.

## El libro es un archivo

Cada obra es **un solo `.md`**: una cabecera YAML con el título, el autor y dos
objetos JSON en una línea (el diseño de la página y la portada), y después la
prosa. El JSON de una línea es YAML válido a propósito, así que **el archivo se
abre en Obsidian** como cualquier nota.

```markdown
---
titulo: La biblioteca inacabada
subtitulo: apuntes de un copista
autor: Carlos González Alcalde
estado: borrador
creado: 2026-08-06
dedicatoria: ""
meta: 90000
diseno: {"fuente":"garamond","tamano":11.5,"interlineado":1.42,...}
portada: {"diseno":"sello","color":"#2f3e4f","tinta":"#f4f1ea",...}
---
# Primero

La biblioteca es un objeto que no termina nunca…
```

**Nada de lo que escribas depende de esta web.** Ese es el punto entero.

Las marcas que entiende son dos: `**negrita**` y `*cursiva*`. Los capítulos son
`#`, las escenas `##`, y una línea con `***` separa escenas. No hay más
Markdown, y no lo va a haber: cada añadido es otra cosa que puede componerse mal
en medio de una novela.

## Dónde se guarda: la API compartida

Scriptorium no tiene servidor propio. Usa **la API de Alexandria**, que es lo
que hace que las dos aplicaciones miren la misma biblioteca en vez de dos copias.

| Dónde | Qué es | Cuándo responde |
| --- | --- | --- |
| **Tu ordenador** | La API de Alexandria (`/writing/*`, NestJS en el 4000). Escribe los `.md` de verdad, en Drive. | Con el PC encendido, en casa o por el túnel |
| **La nube** | La función de Netlify de Alexandria (`/api/nube/*`): un espejo cifrado de los libros + una cola de escrituras | Siempre |
| **Este navegador** | Una copia local, para abrir al instante y no perder nada si se cae la red | Siempre |

Con el ordenador encendido se escribe el archivo real. Con el ordenador apagado
el texto va **al espejo cifrado** (para que se vea al momento en el móvil o en
otro PC) **y a la cola** (para que el ordenador lo aplique al `.md` cuando
vuelva). Las dos cosas, no una: el espejo solo sería una copia que nunca llega a
ser el libro.

El cifrado se hace **aquí, en el navegador**, con la misma clave que abre la
biblioteca publicada de Alexandria (`biblioteca.clave.txt`). Netlify solo guarda
bytes que nadie de allí puede leer, y el testigo de acceso es una derivación de
un solo sentido que no sirve para descifrar nada.

> El protocolo exacto está documentado en `src/datos/nube.ts`. **Si cambia ahí,
> tiene que cambiar en `apps/web/src/lib/cloud-store.ts` de Alexandria y en
> `netlify/functions/nube.mjs`, o las dos aplicaciones dejan de verse.**

## Compatibilidad con Alexandria

Alexandria lee estos mismos archivos con su propia copia del intérprete, así que
el formato es un **contrato**:

- nunca se renombra un campo, solo se añaden;
- todo campo nuevo lleva un valor por defecto que reproduce el comportamiento
  anterior;
- un lector que no conoce un campo tiene que poder componer el libro igual.

Las claves de tipografía (`fuente`) son las mismas en las dos aplicaciones. Las
que Scriptorium añade de más caen en la fuente por defecto al abrirse en
Alexandria, que es degradar bien.

## Empezar

```bash
pnpm install
pnpm dev
```

Se abre en http://localhost:5175. En desarrollo, `/writing` se hace proxy a
`http://localhost:4000`, así que **arranca antes la API de Alexandria** si
quieres ver tus libros de verdad.

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Comprueba tipos y compila a `dist/` |
| `pnpm test` | Los tests del núcleo |
| `pnpm type-check` | Solo los tipos |

## Cómo está montado

```
src/
├── nucleo/      El motor. Puro, sin React, con tests.
│   ├── libro.ts        el formato del archivo (el contrato)
│   ├── fuentes.ts      el catálogo tipográfico
│   ├── geometria.ts    la página en píxeles
│   ├── bloques.ts      partir la prosa, capítulos, cuentas
│   ├── inline.ts       negrita y cursiva
│   ├── edicion.ts      los comandos que reescriben el manuscrito
│   ├── pagina.ts       folios, cornisas, ornamentos
│   └── recetas.ts      diseños completos de un botón
├── datos/       De dónde salen y adónde van los libros.
├── vistas/      Las pantallas.
├── ui/          Iconos, avisos, diálogos.
└── estilos/     base (tokens y temas), app (la sala), pagina (la hoja)
```

**El núcleo es lo que se prueba.** Un botón roto se ve en un segundo; un
`envolver` roto es un capítulo con asteriscos que descubres una semana después.

## Cómo se compone la página

El manuscrito se dispone como un **flujo multicolumna** cuya caja de columna es
exactamente la caja de texto de una página. El navegador reparte la prosa en
columnas — y una columna **es** una página. Por eso el número de páginas es real
y cambia en el instante en que tocas un margen: son los cortes de línea del
propio navegador, no una estimación.

Pasar página es un `translateX` de exactamente el ancho de una página: no se
recompone nada, así que los cortes no pueden moverse debajo de ti.

**La regla que sostiene todo:** página, márgenes y letra se multiplican por el
mismo factor. La galera bajo el editor es pequeña y la página del lector es
grande; si la letra no escalara con el papel, las dos cortarían las líneas de
forma distinta y no se pondrían de acuerdo en cuántas páginas tiene el libro.

## Licencia

Privado. Uso personal.
