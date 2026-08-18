/**
 * The library passphrase, as held by THIS browser.
 *
 * It is the same passphrase that opens Alexandria's published library
 * (`biblioteca.clave.txt` on the owner's PC). Scriptorium needs it for exactly
 * two things: to prove to the cloud store that it may read and write, and to
 * encrypt everything it puts there. It never leaves this device in the clear —
 * what travels is a one-way derivation that cannot decrypt anything.
 *
 * Kept in its own tiny module so the cloud client and the settings screen can
 * both read it without importing each other.
 */

const ALMACEN = "library.key";

const oyentes = new Set<() => void>();

export function leerClave(): string | null {
  try {
    const guardada = localStorage.getItem(ALMACEN);
    return guardada && guardada.trim().length > 0 ? guardada.trim() : null;
  } catch {
    return null;
  }
}

export function guardarClave(clave: string | null): void {
  try {
    if (clave && clave.trim().length > 0) {
      localStorage.setItem(ALMACEN, clave.trim());
    } else {
      localStorage.removeItem(ALMACEN);
    }
  } catch {
    // Private mode: the passphrase applies to this session only.
  }
  for (const oyente of oyentes) {
    oyente();
  }
}

export function alCambiarClave(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export function hayClave(): boolean {
  return leerClave() !== null;
}
