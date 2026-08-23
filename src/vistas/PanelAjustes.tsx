/**
 * Ajustes: the room, and the wiring.
 *
 * Two very different things share this panel because they are what "settings"
 * means to the person using it. The room (theme, editor type, focus) is taste.
 * The wiring (the library passphrase, the server address) is the part that
 * decides whether a book is saved at all — so it says, in plain Spanish, what
 * each piece does and what happens without it, and it TESTS the connection
 * instead of leaving the writer to guess.
 */

import { useEffect, useState } from "react";
import {
  AJUSTES_POR_DEFECTO,
  GADGETS,
  type Ajustes,
  type SitioGadgets,
  type Tema,
} from "@/datos/ajustes";
import { guardarClave, leerClave } from "@/datos/clave";
import { comprobarNube, olvidarToken, SITIO_NUBE, type EstadoNube } from "@/datos/nube";
import { direccionGuardada, guardarDireccion, listarEnServidor, olvidarTunel } from "@/datos/servidor";
import { FUENTES } from "@/nucleo/fuentes";
import { leerRescates, olvidarRescate } from "@/datos/biblioteca";
import { avisar } from "@/ui/Avisos";
import { ACENTOS } from "@/ui/acento";
import { comoAplicacion } from "@/ui/pantalla";
import { Icono } from "@/ui/Icono";
import { probarSonido, SONIDOS, type Sonido } from "@/ui/sonido";
import { useSalida } from "@/ui/useSalida";

export function PanelAjustes({
  ajustes,
  dentro,
  onAjustes,
  onCerrar,
  onRecargar,
}: {
  ajustes: Ajustes;
  /** Somebody has signed in. The wiring section is theirs alone. */
  dentro: boolean;
  onAjustes: (ajustes: Ajustes) => void;
  onCerrar: () => void;
  onRecargar: () => void;
}) {
  /* El panel se queda montado mientras se desliza hacia fuera. */
  const salida = useSalida(true, onCerrar);

  const [clave, setClave] = useState(leerClave() ?? "");
  const [direccion, setDireccion] = useState(direccionGuardada() ?? "");
  const [nube, setNube] = useState<EstadoNube | "probando" | null>(null);
  const [servidor, setServidor] = useState<"si" | "no" | "probando" | null>(null);
  const rescates = leerRescates();

  useEffect(() => {
    void probarTodo();
    // Only on open: probing costs a PBKDF2 derivation and two requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const probarTodo = async () => {
    setNube("probando");
    setServidor("probando");
    setNube(await comprobarNube());
    setServidor((await listarEnServidor()) ? "si" : "no");
  };

  return (
    <aside
      className={`panel${salida.cerrando ? " panel--cerrando" : ""}`}
      aria-label="Ajustes"
      onAnimationEnd={salida.alTerminar}
    >
      <div className="panel__cabeza">
        <span className="panel__titulo">Ajustes</span>
        <button type="button" className="boton boton--desnudo" onClick={salida.cerrar} title="Cerrar">
          <Icono nombre="cerrar" />
        </button>
      </div>

      {/* ── Wiring. Only for whoever has entered: a visitor has no library to
             point anywhere, and showing them a passphrase box is an invitation
             to try one. ─────────────────────────────────────────────────────── */}

      {!dentro && (
        <div className="grupo">
          <span className="grupo__titulo">Estás de visita</span>
          <p className="campo__nota">
            Puedes cambiar el ambiente y el color, y probar el diseño con el libro de muestra. Para
            abrir una biblioteca de verdad y guardar hay que entrar.
          </p>
        </div>
      )}

      {dentro && (
      <div className="grupo">
        <span className="grupo__titulo">Dónde se guardan tus libros</span>

        <div className="campo">
          <span className="campo__etiqueta">
            Tu ordenador
            <span className="campo__valor">
              {servidor === "probando" ? "probando…" : servidor === "si" ? "responde" : "no responde"}
            </span>
          </span>
          <p className="campo__nota">
            Cuando está encendido, Pliego escribe directamente los archivos .md de Drive — los
            mismos que abre Alexandria. Es la única forma de que el libro sea de verdad un archivo.
          </p>
        </div>

        <div className="campo">
          <span className="campo__etiqueta">
            La nube
            <span className="campo__valor">
              {nube === "probando"
                ? "probando…"
                : nube === "lista"
                  ? "conectada"
                  : nube === "sin-clave"
                    ? "falta la clave"
                    : nube === "rechazada"
                      ? "clave incorrecta"
                      : "no responde"}
            </span>
          </span>
          <p className="campo__nota">
            Con el ordenador apagado, los libros viajan cifrados por la nube de Alexandria
            ({SITIO_NUBE.replace("https://", "")}) y el ordenador los aplica al volver. Nadie más
            que tú puede leerlos: se cifran aquí, en este navegador.
          </p>
        </div>

        <label className="campo">
          <span className="campo__etiqueta">Clave de la biblioteca</span>
          <input
            className="entrada"
            type="password"
            value={clave}
            autoComplete="off"
            placeholder="la misma que abre Alexandria"
            onChange={(evento) => setClave(evento.target.value)}
          />
          <span className="campo__nota">
            Está en <code>biblioteca.clave.txt</code>, en la carpeta de Alexandria de tu ordenador.
            Sin ella esta web solo puede guardar en este navegador.
          </span>
        </label>

        <label className="campo">
          <span className="campo__etiqueta">Dirección del servidor</span>
          <input
            className="entrada"
            value={direccion}
            placeholder="se busca sola — déjalo vacío"
            onChange={(evento) => setDireccion(evento.target.value)}
          />
          <span className="campo__nota">
            Solo si quieres forzar una: por ejemplo <code>192.168.1.40:4000</code> desde el móvil en
            tu wifi. Vacío significa «búscalo tú».
          </span>
        </label>

        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            type="button"
            className="boton boton--principal"
            onClick={() => {
              guardarClave(clave || null);
              guardarDireccion(direccion || null);
              olvidarToken();
              olvidarTunel();
              void probarTodo().then(onRecargar);
              avisar("Guardado. Volviendo a conectar…");
            }}
          >
            Guardar y reconectar
          </button>
          <button type="button" className="boton" onClick={() => void probarTodo()}>
            Probar
          </button>
        </div>
      </div>
      )}

      {/* ── Room ───────────────────────────────────────────────────────────── */}

      <div className="grupo">
        <span className="grupo__titulo">Ambiente</span>
        <div className="campo">
          <span className="campo__etiqueta">Tema</span>
          <div className="segmentado">
            {(
              [
                ["sistema", "Sistema"],
                ["claro", "Claro"],
                ["sepia", "Sepia"],
                ["oscuro", "Oscuro"],
              ] as [Tema, string][]
            ).map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                className={`segmentado__opcion${
                  ajustes.tema === valor ? " segmentado__opcion--aqui" : ""
                }`}
                onClick={() => onAjustes({ ...ajustes, tema: valor })}
              >
                {texto}
              </button>
            ))}
          </div>
          <span className="campo__nota">
            La hoja compuesta no cambia: un libro se imprime en papel, y una página que se vuelve
            gris de noche es una pantalla fingiendo ser una página.
          </span>
        </div>

        <div className="campo">
          <span className="campo__etiqueta">Color de la aplicación</span>
          <div className="acentos">
            {ACENTOS.map((acento) => (
              <button
                key={acento.clave}
                type="button"
                title={acento.nombre}
                aria-label={acento.nombre}
                aria-pressed={ajustes.acento === acento.clave}
                className={`acento${ajustes.acento === acento.clave ? " acento--aqui" : ""}`}
                style={{ background: acento.claro.acento }}
                onClick={() => onAjustes({ ...ajustes, acento: acento.clave })}
              />
            ))}
          </div>
          <span className="campo__nota">
            El icono de la pestaña se dibuja con este color, así que Pliego se distingue de un
            vistazo entre veinte pestañas abiertas.
          </span>
        </div>
      </div>

      <div className="grupo">
        <span className="grupo__titulo">Cómo se ve mientras escribes</span>
        <div className="campo">
          <span className="campo__etiqueta">Letra del editor</span>
          <span className="campo__nota">
            Cada nombre está escrito con su propia letra, para que sepas cómo es antes de elegirla.
            Solo afecta a escribir: la letra del libro se elige en el panel de diseño.
          </span>
          <div className="fuentes fuentes--corta">
            {FUENTES.map((fuente) => (
              <button
                key={fuente.key}
                type="button"
                className={`fuente${ajustes.fuenteEditor === fuente.key ? " fuente--aqui" : ""}`}
                onClick={() => onAjustes({ ...ajustes, fuenteEditor: fuente.key })}
              >
                <span className="fuente__muestra" style={{ fontFamily: fuente.stack }}>
                  {fuente.name}
                </span>
                <span className="fuente__nombre">{fuente.hint}</span>
                {ajustes.fuenteEditor === fuente.key && (
                  <span className="fuente__marca">
                    <Icono nombre="guardado" tamano={13} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <Rango
          etiqueta="Tamaño"
          valor={ajustes.tamanoEditor}
          unidad="px"
          minimo={13}
          maximo={30}
          paso={1}
          onCambiar={(tamanoEditor) => onAjustes({ ...ajustes, tamanoEditor })}
        />
        <Rango
          etiqueta="Ancho de la columna"
          valor={ajustes.anchoEditor}
          unidad=" caracteres"
          minimo={40}
          maximo={110}
          paso={1}
          onCambiar={(anchoEditor) => onAjustes({ ...ajustes, anchoEditor })}
        />
        <Rango
          etiqueta="Interlineado"
          valor={ajustes.interlineadoEditor}
          unidad="×"
          minimo={1.2}
          maximo={2.4}
          paso={0.05}
          onCambiar={(interlineadoEditor) => onAjustes({ ...ajustes, interlineadoEditor })}
        />

        <label className="interruptor">
          <span>Scroll de máquina de escribir</span>
          <input
            type="checkbox"
            checked={ajustes.maquina}
            onChange={(evento) => onAjustes({ ...ajustes, maquina: evento.target.checked })}
          />
        </label>
        <span className="campo__nota">
          La línea que escribes se queda en el centro de la pantalla en vez de bajar hasta el borde.
        </span>

        <label className="interruptor">
          <span>Tipografía automática</span>
          <input
            type="checkbox"
            checked={ajustes.tipografia}
            onChange={(evento) => onAjustes({ ...ajustes, tipografia: evento.target.checked })}
          />
        </label>
        <span className="campo__nota">
          Escribe <code>...</code> y sale «…»; <code>--</code> sale «—»; <code>&lt;&lt;</code> y{" "}
          <code>&gt;&gt;</code> salen «» .
        </span>

        <label className="interruptor">
          <span className="interruptor__texto">
            <span>Modo escritura</span>
            <span className="campo__nota">
              Esconde la barra, la página compuesta, los gadgets y el índice: queda tu texto y nada
              más. La barra vuelve al acercar el ratón al borde de arriba, y Esc lo deshace. Se
              enciende y se apaga con F11.
            </span>
          </span>
          <input
            type="checkbox"
            checked={ajustes.escritura}
            onChange={(evento) => onAjustes({ ...ajustes, escritura: evento.target.checked })}
          />
        </label>

        <label className="interruptor">
          <span className="interruptor__texto">
            <span>…y también a pantalla completa</span>
            <span className="campo__nota">
              Que el modo escritura se lleve por delante el navegador entero: sin barra de
              direcciones, sin pestañas y sin marcadores. Queda tu texto sobre el fondo y nada más.
            </span>
          </span>
          <input
            type="checkbox"
            checked={ajustes.pantallaCompleta}
            onChange={(evento) =>
              onAjustes({ ...ajustes, pantallaCompleta: evento.target.checked })
            }
          />
        </label>

        {!comoAplicacion() && (
          <p className="campo__nota">
            <strong>Para que abra siempre así:</strong> instala Pliego como aplicación. En Chrome o
            Edge, el icono de instalar que sale a la derecha de la barra de direcciones; en el iPhone,
            Compartir → «Añadir a pantalla de inicio». Entonces abre sin nada del navegador, tiene su
            propio icono y funciona sin conexión.
          </p>
        )}

        <label className="interruptor">
          <span>Avisar si cierro con algo sin guardar</span>
          <input
            type="checkbox"
            checked={ajustes.avisarSalida}
            onChange={(evento) => onAjustes({ ...ajustes, avisarSalida: evento.target.checked })}
          />
        </label>
      </div>

      <div className="grupo">
        <span className="grupo__titulo">Cómo suena al escribir</span>
        <p className="campo__nota">
          Cada tecla se sintetiza en el momento, así que no suenan dos iguales y no descarga ni un
          archivo. Elige uno y pruébalo escribiendo.
        </p>
        <div className="opciones">
          {SONIDOS.map((son) => (
            <button
              key={son.clave}
              type="button"
              className={`opcion${ajustes.sonido === son.clave ? " opcion--aqui" : ""}`}
              onClick={() => {
                onAjustes({ ...ajustes, sonido: son.clave as Sonido });
                probarSonido(son.clave as Sonido, ajustes.volumenSonido);
              }}
            >
              <span className="opcion__nombre">{son.nombre}</span>
              <span className="opcion__que">{son.que}</span>
            </button>
          ))}
        </div>
        {ajustes.sonido !== "ninguno" && (
          <label className="campo">
            <span className="campo__etiqueta">
              Volumen
              <span className="campo__valor">{Math.round(ajustes.volumenSonido * 100)}%</span>
            </span>
            <input
              className="deslizador"
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={ajustes.volumenSonido}
              onChange={(evento) => {
                const volumenSonido = Number.parseFloat(evento.target.value);
                onAjustes({ ...ajustes, volumenSonido });
                probarSonido(ajustes.sonido, volumenSonido);
              }}
            />
          </label>
        )}
      </div>

      <div className="grupo">
        <span className="grupo__titulo">Gadgets del taller</span>
        <p className="campo__nota">
          Lo que se ve en la franja de arriba o de abajo mientras escribes. Enciende los que te
          sirvan y apaga los que te distraigan: no hay una respuesta buena para todo el mundo.
        </p>
        <div className="campo">
          <span className="campo__etiqueta">Dónde va la franja</span>
          <div className="segmentado">
            {(
              [
                ["abajo", "Abajo"],
                ["arriba", "Arriba"],
                ["oculta", "Sin franja"],
              ] as [SitioGadgets, string][]
            ).map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                className={`segmentado__opcion${
                  ajustes.sitioGadgets === valor ? " segmentado__opcion--aqui" : ""
                }`}
                onClick={() => onAjustes({ ...ajustes, sitioGadgets: valor })}
              >
                {texto}
              </button>
            ))}
          </div>
        </div>

        {ajustes.sitioGadgets !== "oculta" &&
          GADGETS.map((gadget) => (
            <label key={gadget.clave} className="interruptor">
              <span className="interruptor__texto">
                <span>{gadget.nombre}</span>
                <span className="campo__nota">{gadget.que}</span>
              </span>
              <input
                type="checkbox"
                checked={ajustes.gadgets.includes(gadget.clave)}
                onChange={(evento) =>
                  onAjustes({
                    ...ajustes,
                    gadgets: evento.target.checked
                      ? [...ajustes.gadgets, gadget.clave]
                      : ajustes.gadgets.filter((clave) => clave !== gadget.clave),
                  })
                }
              />
            </label>
          ))}
      </div>

      {rescates.length > 0 && (
        <div className="grupo">
          <span className="grupo__titulo">Copias de rescate</span>
          <p className="campo__nota">
            Texto de libros borrados, guardado por si acaso. Vive solo en este navegador.
          </p>
          {rescates.map((rescate) => (
            <div key={rescate.slug} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
              <span style={{ flex: 1, fontSize: "0.78rem" }}>{rescate.slug}</span>
              <button
                type="button"
                className="boton"
                onClick={() => {
                  const enlace = document.createElement("a");
                  const url = URL.createObjectURL(
                    new Blob([rescate.contenido], { type: "text/markdown;charset=utf-8" }),
                  );
                  enlace.href = url;
                  enlace.download = `${rescate.slug}.md`;
                  enlace.click();
                  setTimeout(() => URL.revokeObjectURL(url), 2000);
                }}
              >
                <Icono nombre="descargar" tamano={13} />
              </button>
              <button
                type="button"
                className="boton boton--peligro"
                onClick={() => {
                  olvidarRescate(rescate.slug);
                  avisar("Copia de rescate borrada.");
                  onRecargar();
                }}
              >
                <Icono nombre="papelera" tamano={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grupo">
        <button
          type="button"
          className="boton"
          onClick={() => {
            onAjustes({ ...AJUSTES_POR_DEFECTO });
            avisar("Ambiente restablecido.");
          }}
        >
          Volver al ambiente por defecto
        </button>
        <p className="campo__nota">
          No toca tus libros ni la clave: solo el tema, la letra del editor y las opciones de esta
          sección.
        </p>
      </div>
    </aside>
  );
}

function Rango({
  etiqueta,
  valor,
  unidad,
  minimo,
  maximo,
  paso,
  onCambiar,
}: {
  etiqueta: string;
  valor: number;
  unidad: string;
  minimo: number;
  maximo: number;
  paso: number;
  onCambiar: (valor: number) => void;
}) {
  const decimales = paso < 1 ? 2 : 0;
  return (
    <label className="campo">
      <span className="campo__etiqueta">
        {etiqueta}
        <span className="campo__valor">
          {valor.toFixed(decimales).replace(/\.?0+$/, "")}
          {unidad}
        </span>
      </span>
      <input
        className="deslizador"
        type="range"
        value={valor}
        min={minimo}
        max={maximo}
        step={paso}
        onChange={(evento) => onCambiar(Number.parseFloat(evento.target.value))}
      />
    </label>
  );
}
