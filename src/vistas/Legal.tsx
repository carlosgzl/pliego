/**
 * Los papeles: aviso legal, privacidad, condiciones y cookies.
 *
 * POR QUÉ ESTÁN Y POR QUÉ ASÍ. Pliego deja crear cuentas, guarda lo que la
 * gente escribe y permite publicarlo. En España eso son tres leyes distintas:
 * la LSSI-CE (Ley 34/2002), que obliga a decir QUIÉN presta el servicio y cómo
 * contactarlo; el RGPD junto con la LOPDGDD, que obliga a decir QUÉ datos se
 * tratan, para qué, con qué base legal y qué derechos tiene quien los cede; y
 * el artículo 22.2 de la LSSI, que regula lo que se guarda en el dispositivo de
 * quien visita.
 *
 * ESCRITOS EN CASTELLANO NORMAL, y eso es una decisión. La mitad de las
 * políticas de privacidad que hay por ahí son un copia y pega ilegible cuyo
 * único propósito es poder decir que existen. Un documento que nadie entiende
 * no informa a nadie, y el RGPD pide expresamente lenguaje «claro y sencillo»
 * (artículo 12). Así que aquí se dice lo que pasa de verdad, con frases cortas.
 *
 * LO QUE NO SE HACE, que es la parte más honrada de todo esto: no hay analítica,
 * no hay publicidad, no hay rastreadores, no hay terceros y no se pide el
 * correo. Por eso no hay banner de cookies — no porque se haya olvidado, sino
 * porque no hay nada que consentir.
 *
 * ⚠ ESTO NO ES ASESORAMIENTO JURÍDICO. Está redactado con cuidado y describe
 * fielmente lo que hace la aplicación, pero quien publica un servicio es quien
 * responde de él: conviene revisarlo, y rellenar los datos de contacto.
 */

import { useEffect } from "react";
import { Icono } from "@/ui/Icono";

/**
 * A quién se escribe.
 *
 * Vacío a propósito: la ley pide una dirección de contacto electrónica directa,
 * y publicar el correo personal de alguien es una decisión suya y no mía. Si se
 * deja vacío, los documentos remiten al portfolio, que ya es público. Con algo
 * escrito aquí, aparece como dirección de contacto en los cuatro.
 */
const CORREO_CONTACTO = "";

const TITULAR = "Carlos González Alcalde";
const PORTFOLIO = "https://portfoliocga.netlify.app";
const SITIO = "pliego-cga.netlify.app";

export type Documento = "aviso" | "privacidad" | "condiciones" | "cookies";

export const DOCUMENTOS: { clave: Documento; titulo: string; resumen: string }[] = [
  { clave: "condiciones", titulo: "Condiciones de uso", resumen: "Qué es esto y qué se espera de cada parte." },
  { clave: "privacidad", titulo: "Privacidad", resumen: "Qué datos hay, para qué, y cómo borrarlos." },
  { clave: "aviso", titulo: "Aviso legal", resumen: "Quién responde de este sitio." },
  { clave: "cookies", titulo: "Cookies", resumen: "No hay. Aquí está el porqué." },
];

export function Legal({ documento, onCerrar }: { documento: Documento; onCerrar: () => void }) {
  /* Cambiar de documento devuelve al principio: seguir a media página del
     anterior es el fallo clásico de un lector dentro de una sola pantalla. */
  useEffect(() => {
    document.querySelector(".legal__texto")?.scrollTo({ top: 0 });
  }, [documento]);

  return (
    <div className="legal pantalla">
      <div className="legal__dentro">
        <header className="legal__cabeza">
          <button type="button" className="boton" onClick={onCerrar}>
            <Icono nombre="atras" /> <span className="boton__texto">Volver</span>
          </button>
          <nav className="legal__pestanas">
            {DOCUMENTOS.map((doc) => (
              <a
                key={doc.clave}
                href={`#/legal/${doc.clave}`}
                className={`pestana${documento === doc.clave ? " pestana--aqui" : ""}`}
              >
                {doc.titulo}
              </a>
            ))}
          </nav>
        </header>

        <article className="legal__texto">
          {documento === "condiciones" && <Condiciones />}
          {documento === "privacidad" && <Privacidad />}
          {documento === "aviso" && <Aviso />}
          {documento === "cookies" && <Cookies />}

          <p className="legal__fecha">
            Última actualización: {new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long" })}.
          </p>
        </article>
      </div>
    </div>
  );
}

/** A dónde se escribe, según haya correo puesto o no. */
function Contacto() {
  if (CORREO_CONTACTO) {
    return <a href={`mailto:${CORREO_CONTACTO}`}>{CORREO_CONTACTO}</a>;
  }
  return (
    <a href={PORTFOLIO} target="_blank" rel="noreferrer noopener">
      el formulario de contacto del portfolio
    </a>
  );
}

/* ── Condiciones ──────────────────────────────────────────────────────────── */

function Condiciones() {
  return (
    <>
      <h1>Condiciones de uso</h1>
      <p className="legal__entradilla">
        Lo que puedes esperar de Pliego y lo que Pliego espera de ti. En corto: escribe lo que
        quieras, es tuyo, guarda copias, y no uses esto para hacer daño.
      </p>

      <h2>1. Qué es este servicio</h2>
      <p>
        Pliego es una aplicación web gratuita para escribir libros. Permite redactar, componer la
        página, diseñar una portada, exportar el resultado y —opcionalmente— publicar una obra en la
        plaza para que la lea cualquiera.
      </p>
      <p>
        <strong>Está en beta.</strong> Eso no es una fórmula: significa que hay funciones que
        cambian, que puede haber errores y que el servicio podría interrumpirse. Por eso todo lo que
        escribes se puede descargar en cualquier momento como un archivo Markdown, y por eso se
        recomienda hacerlo con lo que te importe.
      </p>

      <h2>2. La cuenta</h2>
      <ul>
        <li>Crear una cuenta es gratuito y solo pide un nombre de usuario y una contraseña.</li>
        <li>
          <strong>No se pide correo electrónico, y eso tiene una consecuencia importante: si
          olvidas la contraseña no hay forma de recuperarla.</strong> No existe un «he olvidado mi
          contraseña» porque no hay a dónde enviarlo. Guárdala en un gestor de contraseñas.
        </li>
        <li>Eres responsable de lo que ocurra con tu cuenta. No la compartas.</li>
        <li>Puedes borrarla cuando quieras desde Ajustes, y con ella se va todo lo tuyo.</li>
      </ul>

      <h2>3. Lo que escribes es tuyo</h2>
      <p>
        Conservas <strong>todos los derechos</strong> sobre tus textos, tus portadas y tus imágenes.
        Pliego no adquiere ninguna licencia sobre tu obra, no la usa para nada, no la cede a nadie y
        no la emplea para entrenar ningún sistema.
      </p>
      <p>
        La única excepción es la estrictamente técnica y la pides tú: para poder guardar tu libro y
        enseñártelo en otro dispositivo, hay que almacenarlo y transmitirlo. Nada más.
      </p>

      <h2>4. Publicar en la plaza</h2>
      <p>
        Publicar es voluntario y se hace obra a obra. Al hacerlo aceptas que:
      </p>
      <ul>
        <li>
          <strong>Cualquiera podrá leerla</strong>, sin cuenta y sin permiso, a través de su enlace
          público. Piénsalo antes, sobre todo si el texto contiene datos personales tuyos o de otras
          personas.
        </li>
        <li>
          Lo publicado es una copia congelada: lo que escribas después no cambia lo que otros leen
          hasta que vuelvas a publicar.
        </li>
        <li>
          Sigues siendo el autor y conservas tus derechos. Puedes retirarla cuando quieras, aunque
          no se puede garantizar que nadie la haya copiado mientras estuvo publicada.
        </li>
        <li>
          Solo publicas obra propia, o sobre la que tienes derechos. No se puede publicar contenido
          ajeno sin permiso.
        </li>
      </ul>

      <h2>5. Lo que no se puede publicar</h2>
      <p>
        En la plaza no cabe contenido ilícito. En concreto y sin ánimo exhaustivo: material que
        infrinja derechos de autor, contenido sexual con menores, incitación al odio o a la
        violencia, amenazas, acoso, datos personales de terceros sin su consentimiento, o cualquier
        cosa que vulnere la legislación española o europea.
      </p>
      <p>
        Se puede retirar cualquier obra que incumpla esto, y suspender la cuenta que la publicó, sin
        aviso previo. Si ves algo que no debería estar ahí, avisa por <Contacto />.
      </p>

      <h2>6. Sin garantías</h2>
      <p>
        El servicio se presta «tal cual», gratuitamente y sin garantía de disponibilidad, de
        ausencia de errores ni de conservación de los datos. En la medida en que lo permita la ley,
        no se asume responsabilidad por pérdidas de información, lucro cesante o daños indirectos
        derivados del uso del servicio.
      </p>
      <p>
        Esto no limita los derechos que la normativa de consumo te reconozca de forma imperativa, ni
        la responsabilidad por dolo o culpa grave.
      </p>

      <h2>7. Cambios y ley aplicable</h2>
      <p>
        Estas condiciones pueden cambiar; la fecha de la última versión está al final de la página.
        Se rigen por la legislación española. Para cualquier controversia, y cuando la ley lo
        permita, serán competentes los juzgados del domicilio del usuario si es consumidor.
      </p>
    </>
  );
}

/* ── Privacidad ───────────────────────────────────────────────────────────── */

function Privacidad() {
  return (
    <>
      <h1>Política de privacidad</h1>
      <p className="legal__entradilla">
        Resumen honrado: no hay analítica, no hay publicidad, no hay rastreadores y no se pide el
        correo. Lo único que se guarda es lo mínimo para que puedas entrar y para que tus libros
        estén donde los dejaste.
      </p>

      <h2>Responsable del tratamiento</h2>
      <p>
        {TITULAR}, titular de {SITIO}. Para cualquier asunto relacionado con tus datos, escribe a{" "}
        <Contacto />.
      </p>

      <h2>Qué datos se tratan, y por qué</h2>
      <table className="legal__tabla">
        <thead>
          <tr>
            <th>Dato</th>
            <th>Para qué</th>
            <th>Base legal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Nombre de usuario</td>
            <td>Identificarte al entrar y saber de quién es cada libro.</td>
            <td>Ejecución del servicio que solicitas (art. 6.1.b RGPD)</td>
          </tr>
          <tr>
            <td>Contraseña</td>
            <td>
              Comprobar que eres tú. <strong>No se guarda la contraseña</strong>, sino un resumen
              criptográfico irreversible (scrypt con sal propia).
            </td>
            <td>Ejecución del servicio (art. 6.1.b)</td>
          </tr>
          <tr>
            <td>Tus libros</td>
            <td>Guardarlos y enseñártelos en cualquier dispositivo donde entres.</td>
            <td>Ejecución del servicio (art. 6.1.b)</td>
          </tr>
          <tr>
            <td>Obras publicadas</td>
            <td>Enseñarlas en la plaza. Solo las que tú decidas publicar.</td>
            <td>Tu consentimiento, revocable en cualquier momento (art. 6.1.a)</td>
          </tr>
        </tbody>
      </table>

      <h2>Lo que NO se hace</h2>
      <ul>
        <li>No se pide ni se guarda tu correo electrónico.</li>
        <li>No hay Google Analytics ni ninguna otra herramienta de medición.</li>
        <li>No hay publicidad ni perfilado.</li>
        <li>No se venden ni se ceden datos a nadie.</li>
        <li>No se usan tus textos para entrenar sistemas de inteligencia artificial.</li>
        <li>No se toman decisiones automatizadas sobre ti.</li>
      </ul>

      <h2>Dónde están los datos</h2>
      <p>
        El alojamiento y el almacenamiento los presta <strong>Netlify</strong>, que actúa como
        encargado del tratamiento. Netlify puede almacenar datos en servidores situados fuera del
        Espacio Económico Europeo; en ese caso las transferencias se amparan en las Cláusulas
        Contractuales Tipo aprobadas por la Comisión Europea. Puedes consultar su política en{" "}
        <a href="https://www.netlify.com/privacy/" target="_blank" rel="noreferrer noopener">
          netlify.com/privacy
        </a>
        .
      </p>
      <p>
        Como cualquier servidor web, el proveedor registra datos técnicos de conexión (dirección IP,
        momento de la petición) por seguridad y para que el servicio funcione. No se usan para
        identificarte ni se cruzan con tu cuenta.
      </p>

      <h2>Cuánto tiempo</h2>
      <p>
        Mientras tengas la cuenta. Si la borras, se elimina tu ficha de usuario y todo lo que
        hubieras guardado. Las obras que hayas publicado se retiran de la plaza. Ten en cuenta que
        una copia de tus libros puede seguir en el almacenamiento local de los navegadores donde los
        hayas abierto: eso está en tu dispositivo y lo borras vaciando los datos del sitio.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Puedes ejercer los derechos de <strong>acceso, rectificación, supresión, oposición,
        limitación y portabilidad</strong>. Dos de ellos los tienes resueltos sin pedirle permiso a
        nadie y de forma inmediata:
      </p>
      <ul>
        <li>
          <strong>Portabilidad y acceso:</strong> cada libro se descarga como un archivo Markdown
          estándar desde Exportar. Es el mismo archivo que hay en el servidor, sin formatos
          propietarios.
        </li>
        <li>
          <strong>Supresión:</strong> «Borrar mi cuenta», en Ajustes. Es inmediato y no hay periodo
          de gracia.
        </li>
      </ul>
      <p>
        Para el resto, o si algo no funciona, escribe a <Contacto />. También puedes reclamar ante
        la{" "}
        <a href="https://www.aepd.es/" target="_blank" rel="noreferrer noopener">
          Agencia Española de Protección de Datos
        </a>
        .
      </p>

      <h2>Menores</h2>
      <p>
        El servicio no está dirigido a menores de 14 años. Si tienes menos, necesitas el permiso de
        tu madre, padre o tutor para crear una cuenta.
      </p>
    </>
  );
}

/* ── Aviso legal ──────────────────────────────────────────────────────────── */

function Aviso() {
  return (
    <>
      <h1>Aviso legal</h1>
      <p className="legal__entradilla">
        Quién está detrás de este sitio, según exige el artículo 10 de la Ley 34/2002 de servicios
        de la sociedad de la información y de comercio electrónico.
      </p>

      <h2>Titular</h2>
      <ul>
        <li>
          <strong>Responsable:</strong> {TITULAR}
        </li>
        <li>
          <strong>Sitio:</strong> {SITIO}
        </li>
        <li>
          <strong>Contacto:</strong> <Contacto />
        </li>
        <li>
          <strong>Actividad:</strong> aplicación web gratuita para escribir y componer libros. No se
          realiza actividad comercial ni se procesan pagos.
        </li>
      </ul>

      <h2>Propiedad intelectual</h2>
      <p>
        El diseño, el código y los textos de la aplicación pertenecen a su autor. Los textos, las
        imágenes y las portadas que crean las personas usuarias son de ellas: ver el punto 3 de las{" "}
        <a href="#/legal/condiciones">condiciones de uso</a>.
      </p>
      <p>
        Las citas literarias que aparecen en la pantalla de entrada pertenecen a obras en dominio
        público —autores fallecidos hace más de ochenta años— y se reproducen con su atribución.
      </p>

      <h2>Enlaces a otros sitios</h2>
      <p>
        En la plaza hay enlaces a plataformas de publicación ajenas. Se ofrecen únicamente como
        información útil: no hay relación comercial con ninguna, no se percibe comisión y no se
        responde de sus contenidos ni de sus condiciones.
      </p>

      <h2>Responsabilidad sobre los contenidos de terceros</h2>
      <p>
        Las obras publicadas en la plaza son responsabilidad exclusiva de quien las publica. Como
        prestador de un servicio de alojamiento, se actúa conforme al artículo 16 de la LSSI:
        retirando con diligencia cualquier contenido ilícito en cuanto se tiene conocimiento
        efectivo de él. Para comunicarlo, <Contacto />.
      </p>
    </>
  );
}

/* ── Cookies ──────────────────────────────────────────────────────────────── */

function Cookies() {
  return (
    <>
      <h1>Cookies</h1>
      <p className="legal__entradilla">
        Este sitio <strong>no usa cookies</strong>, ni propias ni de terceros. Tampoco hay
        rastreadores, ni píxeles, ni huella digital del navegador. Por eso no verás un banner
        pidiéndote permiso: no hay nada que consentir.
      </p>

      <h2>Entonces, ¿cómo recuerda mi sesión?</h2>
      <p>
        Con el <strong>almacenamiento local</strong> del navegador (<code>localStorage</code>), que
        es una zona de tu propio dispositivo a la que solo puede acceder esta web. A diferencia de
        una cookie, no viaja en cada petición al servidor ni permite seguirte por otros sitios.
      </p>

      <h2>Qué se guarda ahí</h2>
      <ul>
        <li>
          <strong>Tu sesión:</strong> un testigo firmado que caduca a los treinta días. Es lo que
          evita tener que escribir la contraseña cada vez.
        </li>
        <li>
          <strong>Tus preferencias:</strong> el tema, el color, la tipografía del editor, dónde va
          la página compuesta. Nunca salen de tu dispositivo.
        </li>
        <li>
          <strong>Una copia de tus libros:</strong> para que la aplicación abra al instante y siga
          funcionando sin conexión.
        </li>
        <li>
          <strong>Un borrador de seguridad:</strong> lo último que escribiste, por si se cierra la
          pestaña antes de que se guarde.
        </li>
      </ul>

      <h2>La ley, para quien quiera comprobarlo</h2>
      <p>
        El artículo 22.2 de la LSSI-CE exige consentimiento para almacenar información en el equipo
        del usuario, <em>salvo</em> cuando sea estrictamente necesaria para prestar el servicio que
        la persona ha solicitado expresamente. Todo lo de la lista de arriba entra en esa excepción:
        sin ello no habría sesión, ni ajustes, ni acceso sin conexión. No hay ninguna finalidad
        analítica ni publicitaria, que es lo que sí requeriría pedirte permiso.
      </p>

      <h2>Cómo borrarlo</h2>
      <p>
        Vaciando los datos del sitio desde tu navegador, o cerrando sesión (eso borra el testigo).
        Si vacías el almacenamiento con libros sin sincronizar, se pierden: descárgalos antes desde
        Exportar.
      </p>
    </>
  );
}
