/**
 * Un grupo de botones donde solo uno está puesto.
 *
 * Vivía dentro del panel de diseño, que es donde nació, y desde ahí no lo podía
 * usar nadie más: Ajustes acabó necesitando el mismo control para el corrector
 * y la alternativa era copiarlo. Un control copiado son dos controles que se
 * separan a la tercera vez que alguien toca uno de los dos.
 *
 * Para dos o tres opciones cortas y excluyentes es mejor que un desplegable:
 * se ven todas a la vez, se compara sin abrir nada y se elige de un clic.
 * Pasadas las cuatro deja de valer y toca una lista.
 */

export function Segmentado({
  opciones,
  valor,
  onCambiar,
}: {
  opciones: { valor: string; texto: string }[];
  valor: string;
  onCambiar: (valor: string) => void;
}) {
  return (
    <div className="segmentado" role="group">
      {opciones.map((opcion) => (
        <button
          key={opcion.valor}
          type="button"
          aria-pressed={valor === opcion.valor}
          className={`segmentado__opcion${
            valor === opcion.valor ? " segmentado__opcion--aqui" : ""
          }`}
          onClick={() => onCambiar(opcion.valor)}
        >
          {opcion.texto}
        </button>
      ))}
    </div>
  );
}
