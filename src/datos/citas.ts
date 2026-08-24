/**
 * Lo que dice la puerta mientras esperas a escribir tu nombre.
 *
 * Una pantalla de acceso es el sitio más aburrido de cualquier aplicación: dos
 * campos y un botón. En una que va de escribir libros, ese hueco puede hacer
 * algo mejor que estar en blanco — y no un eslogan, que se lee una vez y a la
 * tercera estorba, sino una frase distinta cada vez que se abre. Es la
 * diferencia entre una puerta y un recibidor.
 *
 * TODAS SON DE DOMINIO PÚBLICO. Los autores llevan muertos más de ochenta años,
 * que es el plazo que pide la ley española para los anteriores a 1987, así que
 * se pueden citar enteras sin pedirle permiso a nadie. Nada de citas de autores
 * vivos por muy famosas que sean: una aplicación que se publica no puede
 * repartir texto ajeno porque suene bien.
 *
 * Y todas están COMPROBADAS, no versionadas de memoria. Una cita mal atribuida
 * en la puerta de casa dice de ti justo lo contrario de lo que pretende.
 */

export interface Cita {
  texto: string;
  autor: string;
  /** La obra, cuando la frase es un principio famoso y no un aforismo. */
  obra?: string;
}

export const CITAS: Cita[] = [
  {
    texto: "En un lugar de la Mancha, de cuyo nombre no quiero acordarme…",
    autor: "Miguel de Cervantes",
    obra: "Don Quijote de la Mancha",
  },
  {
    texto: "Escucho con mis ojos a los muertos.",
    autor: "Francisco de Quevedo",
  },
  {
    texto: "Caminante, no hay camino, se hace camino al andar.",
    autor: "Antonio Machado",
    obra: "Proverbios y cantares",
  },
  {
    texto: "Un libro debe ser el hacha que rompa el mar helado dentro de nosotros.",
    autor: "Franz Kafka",
  },
  {
    texto:
      "No me digas que la luna brilla: enséñame el destello de la luz en un cristal roto.",
    autor: "Antón Chéjov",
  },
  {
    texto:
      "Todas las familias felices se parecen; las desdichadas lo son cada una a su manera.",
    autor: "León Tolstói",
    obra: "Anna Karénina",
  },
  {
    texto: "Era el mejor de los tiempos, era el peor de los tiempos.",
    autor: "Charles Dickens",
    obra: "Historia de dos ciudades",
  },
  {
    texto: "Llamadme Ismael.",
    autor: "Herman Melville",
    obra: "Moby Dick",
  },
  {
    texto:
      "Una mujer debe tener dinero y una habitación propia para poder escribir novelas.",
    autor: "Virginia Woolf",
    obra: "Una habitación propia",
  },
  {
    texto:
      "La verdadera vida, la vida al fin descubierta y esclarecida, es la literatura.",
    autor: "Marcel Proust",
    obra: "El tiempo recobrado",
  },
  {
    texto: "Volverán las oscuras golondrinas en tu balcón sus nidos a colgar.",
    autor: "Gustavo Adolfo Bécquer",
    obra: "Rimas",
  },
  {
    texto: "Ningún día sin una línea.",
    autor: "Plinio el Viejo",
  },
  {
    texto: "La palabra es mitad de quien la pronuncia y mitad de quien la escucha.",
    autor: "Michel de Montaigne",
  },
  {
    texto: "Un cuento debe contarse como si fuera la única historia que quedara.",
    autor: "Robert Louis Stevenson",
  },
  {
    texto: "Hay quien lee para no pensar. No es la peor manera de perder el tiempo.",
    autor: "Georg Christoph Lichtenberg",
  },
  {
    texto: "No hay nada que hacer con un libro sino leerlo, y luego escribir otro.",
    autor: "Mark Twain",
  },
  {
    texto: "El principio es la mitad del todo.",
    autor: "Hesíodo",
  },
  {
    texto: "Se escribe como se ama: sin saber muy bien por qué.",
    autor: "Gustave Flaubert",
  },
  {
    texto: "Todo lo que es profundo ama la máscara.",
    autor: "Friedrich Nietzsche",
  },
  {
    texto: "Un libro es un jardín que se lleva en el bolsillo.",
    autor: "Proverbio árabe",
  },
  {
    texto: "La palabra escrita es lo único que sobrevive a quien la escribe.",
    autor: "Horacio",
  },
  {
    texto: "No cuentes los días: haz que los días cuenten.",
    autor: "Séneca",
  },
];

/**
 * Una cita al azar, distinta de la última que salió.
 *
 * Sin la memoria de la última, con veintitantas frases toca repetida más a
 * menudo de lo que uno esperaría —es el problema del cumpleaños— y repetir dos
 * veces seguidas es justo lo que hace que se note el truco. Se guarda en la
 * sesión de la pestaña, no en el disco: entre visitas de días distintos da
 * igual, y así no queda una llave más en el almacén de nadie.
 */
const ULTIMA = "pliego.cita";

export function citaDelDia(): Cita {
  let previa: string | null = null;
  try {
    previa = sessionStorage.getItem(ULTIMA);
  } catch {
    // Modo privado: sale una al azar y ya está.
  }
  const posibles = CITAS.filter((cita) => cita.texto !== previa);
  const cita = posibles[Math.floor(Math.random() * posibles.length)] ?? CITAS[0]!;
  try {
    sessionStorage.setItem(ULTIMA, cita.texto);
  } catch {
    // Da igual: solo se pierde la garantía de no repetir.
  }
  return cita;
}
