/**
 * El borrador: lo último que se tecleó, aunque no haya llegado a guardarse.
 *
 * POR QUÉ HACE FALTA. El guardado espera 1,2 segundos desde la última tecla —y
 * está bien que espere, escribir no puede ir mandando una petición por letra—
 * pero en esos 1,2 segundos el texto no está en ninguna parte. Si en ese hueco
 * se cierra la pestaña, el móvil mata la aplicación de fondo o se va la luz, se
 * pierde la última frase. Una frase no es mucho; perderla es horrible.
 *
 * Así que en cada tecla, sin esperar a nadie y sin tocar la red, el archivo
 * entero cae en `localStorage`. Es síncrono y cuesta microsegundos, y en cuanto
 * el guardado de verdad confirma, el borrador se borra: si al abrir un libro
 * hay borrador, es exactamente la señal de que algo se quedó a medias.
 *
 * No sustituye al guardado ni pretende hacerlo. Es el cinturón de seguridad.
 */

const ALMACEN = "pliego.borrador";

interface Borrador {
  fichero: string;
  at: number;
}

function leerTodos(): Record<string, Borrador> {
  try {
    const crudo = JSON.parse(localStorage.getItem(ALMACEN) ?? "{}") as Record<string, Borrador>;
    return crudo && typeof crudo === "object" ? crudo : {};
  } catch {
    return {};
  }
}

function escribirTodos(todos: Record<string, Borrador>): void {
  try {
    localStorage.setItem(ALMACEN, JSON.stringify(todos));
  } catch {
    // Sin cuota no hay cinturón, pero el guardado normal sigue funcionando.
  }
}

export function guardarBorrador(slug: string, fichero: string): void {
  const todos = leerTodos();
  todos[slug] = { fichero, at: Date.now() };
  escribirTodos(todos);
}

export function leerBorrador(slug: string): Borrador | null {
  return leerTodos()[slug] ?? null;
}

export function olvidarBorrador(slug: string): void {
  const todos = leerTodos();
  if (todos[slug]) {
    delete todos[slug];
    escribirTodos(todos);
  }
}
