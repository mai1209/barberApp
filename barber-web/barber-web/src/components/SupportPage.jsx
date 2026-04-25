import styles from '../styles/PrivacyPolicyPage.module.css';

export default function SupportPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>BarberAppByCodex</p>
        <h1>Soporte y contacto</h1>
        <p className={styles.updated}>Última actualización: 25 de abril de 2026</p>

        <p>
          Si necesitás ayuda con BarberAppByCodex, podés comunicarte con nuestro
          soporte por los siguientes medios.
        </p>

        <h2>Contacto principal</h2>
        <p>
          Email de soporte:{' '}
          <a href="mailto:barberappbycodex@gmail.com">barberappbycodex@gmail.com</a>
        </p>
        <p>
          WhatsApp:{' '}
          <a
            href="https://wa.me/543425543308?text=Hola%20necesito%20ayuda%20con%20BarberAppByCodex"
            target="_blank"
            rel="noreferrer"
          >
            +54 9 3425 54-3308
          </a>
        </p>
        <p>Sitio web: BarberAppByCodex</p>

        <h2>Para qué podés escribirnos</h2>
        <ul>
          <li>Problemas para iniciar sesión o usar tu cuenta.</li>
          <li>Consultas sobre activación, renovación o estado del plan.</li>
          <li>Ayuda con reservas, cobros o configuración de la barbería.</li>
          <li>Solicitudes de privacidad o eliminación de cuenta.</li>
        </ul>

        <h2>Qué incluir en tu mensaje</h2>
        <ul>
          <li>Nombre de la barbería o cuenta.</li>
          <li>Email de acceso registrado.</li>
          <li>Descripción corta del problema.</li>
          <li>Si corresponde, captura de pantalla o detalle del error.</li>
        </ul>

        <h2>Enlaces útiles</h2>
        <p>
          Política de privacidad:{' '}
          <a href="/politica-de-privacidad">barberappbycodex.com/politica-de-privacidad</a>
        </p>
        <p>
          Eliminación de cuenta:{' '}
          <a href="/eliminacion-de-cuenta">barberappbycodex.com/eliminacion-de-cuenta</a>
        </p>
      </section>
    </main>
  );
}
