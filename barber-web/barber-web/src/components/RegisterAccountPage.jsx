import { useMemo, useState } from 'react';
import { registerPublicAccount } from '../services/api';
import styles from '../styles/RegisterAccountPage.module.css';

function buildPlansUrl(email) {
  const trimmedEmail = String(email || '').trim().toLowerCase();
  const target = new URL('/planes', window.location.origin);
  if (trimmedEmail) {
    target.searchParams.set('email', trimmedEmail);
  }
  return target.toString();
}

export default function RegisterAccountPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isFormValid = useMemo(
    () =>
      fullName.trim().length >= 3 &&
      email.trim().length > 0 &&
      password.length >= 8 &&
      confirmPassword.length >= 8,
    [confirmPassword.length, email, fullName, password.length],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    if (!isFormValid) {
      setError('Completá nombre, email y una contraseña de al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await registerPublicAccount({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      window.location.assign(buildPlansUrl(email));
    } catch (err) {
      setError(err.message || 'No pudimos crear la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.screen}>
      <section className={styles.hero}>
        <a href="/" className={styles.backHomeButton}>
          ← Volver al inicio
        </a>
        <p className={styles.eyebrow}>ALTA BARBERAPP</p>
        <h1 className={styles.title}>Creá tu cuenta y seguí con el plan</h1>
        <p className={styles.subtitle}>
          Primero registrás tu barbería. Después elegís el plan y completás el pago desde la web.
        </p>
      </section>

      <section className={styles.formCard}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span>Nombre de tu barbería</span>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Ej: Saiko Cuts"
              autoComplete="organization"
              required
            />
          </label>

          <label className={styles.field}>
            <span>Email de acceso</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@barberia.com"
              autoComplete="email"
              required
            />
          </label>

          <div className={styles.passwordGrid}>
            <label className={styles.field}>
              <span>Contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                required
              />
            </label>

            <label className={styles.field}>
              <span>Repetir contraseña</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repetí la contraseña"
                autoComplete="new-password"
                required
              />
            </label>
          </div>

          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta y seguir'}
          </button>
        </form>

        {error ? <div className={styles.errorBox}>{error}</div> : null}

        <div className={styles.helperCard}>
          <p className={styles.helperTitle}>Qué pasa después</p>
          <p className={styles.helperText}>
            Al terminar este paso te llevamos a la pantalla de planes con el email ya cargado para
            que sigas con la activación.
          </p>
        </div>
      </section>
    </main>
  );
}
