# Pliego

Un sitio para escribir libros. Escribes arriba y las páginas se componen debajo,
con tu tipografía, tus márgenes y tu portada — y lo que sale es un libro, no un
documento.

**En internet:** https://pliego-cga.netlify.app
**Comparte biblioteca con:** Alexandria (repositorio privado)

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

## Dónde se guarda: cuatro sitios y una regla

Pliego no tiene servidor propio. Los libros viven en cuatro sitios a la vez y
**la regla es que nunca se sustituye una copia por otra: se funden**, libro a
libro y por fecha (`src/datos/fusion.ts`, con pruebas).

| Dónde | Qué es | Cuándo responde |
| --- | --- | --- |
| **Tu ordenador** | La API de Alexandria (`/writing/*`, NestJS en el 4000). Escribe los `.md` de verdad, en Drive. | Con el PC encendido, en casa o por el túnel |
| **Tu cuenta** | La función de Netlify de Pliego (`/api/auth/datos`) sobre Netlify Blobs. No necesita la clave de la biblioteca: basta con haber entrado. | Siempre |
| **La nube** | La función de Alexandria (`/api/nube/*`): un espejo cifrado + una cola de escrituras | Siempre, con la clave |
| **Este navegador** | Una copia local, para abrir al instante y no perder nada si se cae la red | Siempre |

Al abrir la estantería se pregunta a los cuatro **en paralelo**, se funde lo que
conteste y **se le devuelve la fusión a todos**. Eso es lo que hace que un
capítulo escrito en el ordenador de clase aparezca en casa, y que acabe siendo
un `.md` en Drive en cuanto el ordenador se enciende, sin hacer nada.

> **El fallo que esto arregló.** Antes cada fuente se creía la lista entera: si
> el ordenador respondía, su catálogo *sustituía* al de la cuenta, así que lo
> escrito en el portátil desaparecía de la estantería nada más abrir Pliego en
> casa — y, en el otro sentido, los libros del ordenador no subían nunca a la
> cuenta, de modo que el portátil no llegaba a verlos jamás. Los dos síntomas
> eran el mismo error: sustituir en vez de fundir.

Borrar deja una **lápida** (el slug y cuándo se borró) que viaja como un libro
más y gana a cualquier copia anterior a ella. Sin eso, el primer dispositivo que
llevara una semana apagado resucitaría lo borrado al volver.

La fusión se vuelve a mirar al volver a la pestaña, al recuperar la conexión y
cada tres minutos con la pestaña delante (`src/datos/latido.ts`). Y el guardado
sale a los tres destinos **a la vez**, no en fila: encadenados costaban la espera
del túnel más la de la nube más la de la cuenta, y eso se nota escribiendo.

El cifrado de la nube se hace **aquí, en el navegador**, con la misma clave que
abre la biblioteca publicada de Alexandria (`biblioteca.clave.txt`). Netlify solo
guarda bytes que nadie de allí puede leer, y el testigo de acceso es una
derivación de un solo sentido que no sirve para descifrar nada.

> El protocolo exacto está documentado en `src/datos/nube.ts`. **Si cambia ahí,
> tiene que cambiar en `apps/web/src/lib/cloud-store.ts` de Alexandria y en
> `netlify/functions/nube.mjs`, o las dos aplicaciones dejan de verse.**
>
> La aritmética de la fusión está DUPLICADA a propósito en
> `netlify/functions/auth.mjs`, para que el almacén de la cuenta converja aunque
> dos dispositivos escriban a la vez. Si cambia `fusion.ts`, cambia allí.

## Escribir a gusto

Lo que hace que apetezca escribir aquí, y por qué cada cosa está como está:

- **Ctrl+Z funciona.** Toda edición que hace el programa —negrita, cursiva,
  capítulo, y sobre todo la tipografía automática— se aplica con
  `execCommand("insertText")` sobre el trozo que cambia, no poniendo el texto
  entero por estado (`src/ui/area.ts`). Poner el valor entero hace que el
  navegador **tire su pila de deshacer**: bastaba con escribir `...` para perder
  todo lo deshacible del último rato.
- **Las marcas están donde está la mano.** Seleccionas, botón derecho, y ahí
  tienes negrita, cursiva, capítulo y escena — sin subir a la barra. Sin nada
  seleccionado el botón derecho sigue siendo el del navegador, que es donde vive
  el corrector ortográfico.
- **La línea que escribes no se pega al borde de abajo.** Se mide la posición
  real del cursor en píxeles y se mantiene por encima del último cuarto de la
  pantalla; con «escribir en el centro», clavada a media altura.
- **Pantalla completa de verdad.** El modo escritura esconde la aplicación *y*
  el navegador (F11, Esc para salir). Y Pliego es instalable: como aplicación
  abre sin barra de direcciones ni pestañas, que es la única forma de conseguir
  eso en un iPhone.
- **Funciona sin conexión.** Un trabajador de servicio guarda la aplicación
  (`public/sw.js`): documento a red primero, `assets` con hash desde la caché, y
  la API nunca se toca.
- **Nada se pierde entre pulsación y guardado.** El archivo entero cae en este
  navegador cada 700 ms y al esconder la pestaña (`src/datos/borrador.ts`); si
  al abrir un libro hay borrador, es que algo se quedó a medias, y se recupera.

## Compatibilidad con Alexandria

Alexandria lee estos mismos archivos con su propia copia del intérprete, así que
el formato es un **contrato**:

- nunca se renombra un campo, solo se añaden;
- todo campo nuevo lleva un valor por defecto que reproduce el comportamiento
  anterior;
- un lector que no conoce un campo tiene que poder componer el libro igual.

Las claves de tipografía (`fuente`) son las mismas en las dos aplicaciones. Las
que Pliego añade de más caen en la fuente por defecto al abrirse en
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
| `pnpm test` | Los tests del núcleo y de la fusión |
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
│   ├── fusion.ts       cómo se juntan dos copias sin perder nada (probado)
│   ├── biblioteca.ts   preguntar a los cuatro sitios, fundir, repartir
│   ├── latido.ts       cuándo se vuelve a mirar
│   └── borrador.ts     el cinturón de seguridad
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
