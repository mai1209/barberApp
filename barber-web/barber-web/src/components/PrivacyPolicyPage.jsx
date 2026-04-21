import styles from '../styles/PrivacyPolicyPage.module.css';

export default function PrivacyPolicyPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>BarberAppByCodex</p>
        <h1>Política de Privacidad</h1>
        <p className={styles.updated}>Última actualización: 21 de abril de 2026</p>

        <p>
          Esta Política de Privacidad explica cómo BarberAppByCodex recopila,
          usa, protege y comparte información cuando una barbería utiliza la app,
          el panel web o la página pública de reservas.
        </p>

        <h2>Responsable y contacto</h2>
        <p>
          El responsable del tratamiento es BarberAppByCodex. Para consultas de
          privacidad, soporte o eliminación de cuenta, escribinos a{' '}
          <a href="mailto:barberappbycodex@gmail.com">
            barberappbycodex@gmail.com
          </a>.
        </p>

        <h2>Datos que recopilamos</h2>
        <ul>
          <li>Datos de cuenta: nombre, email, contraseña protegida y estado del plan.</li>
          <li>Datos de la barbería: nombre comercial, slug público, logo, portada, colores, servicios, precios, horarios y barberos.</li>
          <li>Datos de turnos: nombre del cliente, WhatsApp, email, servicio, fecha, hora, barbero elegido, método de pago y estado del turno.</li>
          <li>Datos técnicos: token de notificaciones push, fecha de acceso, errores necesarios para operar y mejorar el servicio.</li>
          <li>Datos de cobro: estado de conexión con Mercado Pago y datos técnicos necesarios para operar pagos. No almacenamos datos completos de tarjetas.</li>
        </ul>

        <h2>Para qué usamos los datos</h2>
        <ul>
          <li>Crear y administrar cuentas de barberías.</li>
          <li>Mostrar la página pública de reservas de cada negocio.</li>
          <li>Registrar, confirmar, modificar o cancelar turnos.</li>
          <li>Enviar confirmaciones por email y notificaciones push relacionadas con turnos.</li>
          <li>Permitir cobros online cuando la barbería conecta un proveedor de pago compatible.</li>
          <li>Brindar soporte, seguridad, control de abuso y mejoras del servicio.</li>
        </ul>

        <h2>Con quién compartimos información</h2>
        <p>
          No vendemos datos personales. Podemos compartir información solo con
          proveedores necesarios para prestar el servicio, como hosting, base de
          datos, email, notificaciones push y procesadores de pago como Mercado
          Pago cuando la barbería decide usar cobros online.
        </p>

        <h2>Pagos</h2>
        <p>
          Los pagos online se procesan mediante proveedores externos. BarberAppByCodex
          no almacena números completos de tarjeta ni credenciales bancarias de los
          clientes finales. Cada proveedor de pago procesa la información según sus
          propias políticas de privacidad y seguridad.
        </p>

        <h2>Seguridad</h2>
        <p>
          Aplicamos medidas razonables para proteger la información, incluyendo
          uso de HTTPS, contraseñas protegidas mediante hash y acceso restringido
          a datos operativos. Ningún sistema es completamente infalible, pero
          trabajamos para reducir riesgos de acceso no autorizado.
        </p>

        <h2>Retención y eliminación</h2>
        <p>
          Conservamos los datos mientras la cuenta esté activa o mientras sean
          necesarios para prestar el servicio, resolver soporte, cumplir obligaciones
          legales o prevenir fraude. La barbería puede solicitar la eliminación de
          su cuenta y datos escribiendo a{' '}
          <a href="mailto:barberappbycodex@gmail.com">
            barberappbycodex@gmail.com
          </a>. Procesaremos la solicitud y eliminaremos o anonimizaremos los datos
          salvo aquellos que deban conservarse por motivos legales o de seguridad.
        </p>

        <h2>Menores de edad</h2>
        <p>
          BarberAppByCodex no está dirigida a menores de edad. Si detectamos que
          se registró información de un menor sin autorización, se puede solicitar
          su eliminación por email.
        </p>

        <h2>Cambios en esta política</h2>
        <p>
          Podemos actualizar esta política para reflejar cambios legales, técnicos
          o funcionales. La versión vigente estará siempre publicada en esta página.
        </p>
      </section>
    </main>
  );
}
