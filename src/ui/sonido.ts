/**
 * Cómo suena escribir.
 *
 * SIN UN SOLO ARCHIVO DE AUDIO. Un paquete de muestras de teclado decente pesa
 * más que toda la aplicación, y sonaría igual la tecla número mil que la
 * primera — que es exactamente lo que delata a un sonido falso. Aquí cada
 * pulsación se SINTETIZA en el momento con Web Audio: un golpe de ruido muy
 * corto pasado por un filtro, con la altura y el volumen movidos un poco al
 * azar. Dos teclas nunca suenan idénticas, que es lo que hace un teclado de
 * verdad, y no cuesta ni un kilobyte de descarga.
 *
 * TRES REGLAS que hacen que no moleste:
 *
 * 1. NADA SUENA HASTA QUE TOCAS UNA TECLA. Los navegadores no dejan arrancar
 *    el audio sin un gesto del usuario, y además sería de mala educación: el
 *    contexto se crea con la primera pulsación y no antes.
 * 2. TODO ES MUY CORTO. Entre veinte y sesenta milisegundos. Un sonido que dura
 *    más se solapa con la siguiente tecla y se convierte en un zumbido.
 * 3. HAY UN TOPE. Escribiendo rápido salen doce pulsaciones por segundo; por
 *    encima de ese ritmo se dejan caer, porque ni se distinguen ni merece la
 *    pena despertar al procesador por ellas.
 */

export type Sonido = "ninguno" | "maquina" | "teclado" | "gota" | "papel";

export const SONIDOS: { clave: Sonido; nombre: string; que: string }[] = [
  { clave: "ninguno", nombre: "En silencio", que: "Como hasta ahora" },
  { clave: "maquina", nombre: "Máquina de escribir", que: "Seco y metálico, con su golpe" },
  { clave: "teclado", nombre: "Teclado", que: "Discreto, el de un portátil bueno" },
  { clave: "gota", nombre: "Gota", que: "Muy suave y agudo, casi un tic" },
  { clave: "papel", nombre: "Papel", que: "Un roce, sin nota" },
];

/** Cada perfil, en los cuatro números que lo definen. */
const PERFILES: Record<
  Exclude<Sonido, "ninguno">,
  { corte: number; q: number; duracion: number; volumen: number; tipo: BiquadFilterType }
> = {
  // Grave, con cuerpo y un poco de resonancia: el golpe del tipo en el papel.
  maquina: { corte: 1800, q: 6, duracion: 0.055, volumen: 0.09, tipo: "bandpass" },
  // Más agudo y mucho más corto: el clic de una tecla de tijera.
  teclado: { corte: 3200, q: 3, duracion: 0.03, volumen: 0.05, tipo: "bandpass" },
  // Casi un tono puro y altísimo, apenas perceptible.
  gota: { corte: 5200, q: 14, duracion: 0.04, volumen: 0.035, tipo: "bandpass" },
  // Sin nota: ruido filtrado por arriba, como una hoja al rozarse.
  papel: { corte: 2600, q: 0.7, duracion: 0.045, volumen: 0.045, tipo: "highpass" },
};

/** Doce por segundo: más que eso ni se oye separado ni merece la pena. */
const MINIMO_ENTRE = 1000 / 12;

let contexto: AudioContext | null = null;
let ruido: AudioBuffer | null = null;
let ultima = 0;

/**
 * Un segundo de ruido blanco, generado una vez y reutilizado siempre.
 *
 * Crear el búfer en cada tecla sería asignar memoria cuarenta veces por
 * segundo mientras alguien escribe. Se hace uno y cada pulsación arranca a
 * leerlo por un punto distinto, que además ayuda a que no suenen iguales.
 */
function bufferDeRuido(ctx: AudioContext): AudioBuffer {
  if (ruido) {
    return ruido;
  }
  const muestras = ctx.sampleRate;
  ruido = ctx.createBuffer(1, muestras, ctx.sampleRate);
  const datos = ruido.getChannelData(0);
  for (let i = 0; i < muestras; i += 1) {
    datos[i] = Math.random() * 2 - 1;
  }
  return ruido;
}

function abrirContexto(): AudioContext | null {
  if (contexto) {
    // Una pestaña que vuelve del segundo plano trae el contexto suspendido.
    if (contexto.state === "suspended") {
      void contexto.resume();
    }
    return contexto;
  }
  const Constructor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Constructor) {
    return null;
  }
  try {
    contexto = new Constructor();
    return contexto;
  } catch {
    return null; // sin audio disponible: se escribe igual, y en silencio
  }
}

/**
 * Suena una tecla.
 *
 * `fuerza` sube un poco el volumen para las teclas que en una máquina de
 * verdad hacen más ruido: el retorno de carro y el espacio. Es un detalle
 * tonto y es justo lo que hace que parezca un teclado y no un metrónomo.
 */
export function sonarTecla(perfil: Sonido, volumen: number, fuerza = 1): void {
  if (perfil === "ninguno" || volumen <= 0) {
    return;
  }
  const ahora = performance.now();
  if (ahora - ultima < MINIMO_ENTRE) {
    return;
  }
  ultima = ahora;

  const ctx = abrirContexto();
  if (!ctx) {
    return;
  }

  const { corte, q, duracion, volumen: base, tipo } = PERFILES[perfil];
  const t = ctx.currentTime;

  const fuente = ctx.createBufferSource();
  const buffer = bufferDeRuido(ctx);
  fuente.buffer = buffer;
  // Un punto de arranque al azar dentro del segundo de ruido.
  const desde = Math.random() * (buffer.duration - duracion - 0.01);

  const filtro = ctx.createBiquadFilter();
  filtro.type = tipo;
  // ±12 % de altura por pulsación: sin esto suenan las mil teclas igual.
  filtro.frequency.value = corte * (0.88 + Math.random() * 0.24);
  filtro.Q.value = q;

  const ganancia = ctx.createGain();
  const pico = base * volumen * fuerza * (0.85 + Math.random() * 0.3);
  /* Ataque instantáneo y caída exponencial: así suena un golpe. Una rampa
     lineal se oye como un «fiu» en vez de como un clic. */
  ganancia.gain.setValueAtTime(0.0001, t);
  ganancia.gain.exponentialRampToValueAtTime(Math.max(0.0002, pico), t + 0.002);
  ganancia.gain.exponentialRampToValueAtTime(0.0001, t + duracion);

  fuente.connect(filtro).connect(ganancia).connect(ctx.destination);
  fuente.start(t, desde, duracion + 0.02);
  fuente.stop(t + duracion + 0.02);
  // Sin esto quedarían nodos colgando en el grafo por cada tecla pulsada.
  fuente.onended = () => {
    fuente.disconnect();
    filtro.disconnect();
    ganancia.disconnect();
  };
}

/** Una sola pulsación para oír cómo queda al elegir en los ajustes. */
export function probarSonido(perfil: Sonido, volumen: number): void {
  ultima = 0;
  sonarTecla(perfil, volumen, 1.2);
}
