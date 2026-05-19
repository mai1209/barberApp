import { useMemo, useState } from 'react';
import { registerPublicAccount } from '../services/api';
import styles from '../styles/RegisterAccountPage.module.css';
import { DEFAULT_DOMAIN_BRANDING } from '../config/domainBranding';

function EyeIcon({ visible }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.passwordToggleIcon}>
      <path
        d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6S2 12 2 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      {!visible ? (
        <path
          d="M4 4l16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}

function buildPlansUrl(email, branding) {
  const trimmedEmail = String(email || '').trim().toLowerCase();
  const target = new URL(branding?.plansPath || '/planes', window.location.origin);
  target.searchParams.set('registered', '1');
  if (trimmedEmail) {
    target.searchParams.set('email', trimmedEmail);
  }
  return target.toString();
}

function StepState({ active, done }) {
  if (done) {
    return <span className={`${styles.stepState} ${styles.stepStateDone}`}>Listo</span>;
  }

  if (active) {
    return <span className={`${styles.stepState} ${styles.stepStateActive}`}>En curso</span>;
  }

  return <span className={`${styles.stepState} ${styles.stepStateIdle}`}>Siguiente</span>;
}

export default function RegisterAccountPage({
  branding = DEFAULT_DOMAIN_BRANDING,
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const step1Done = fullName.trim().length >= 3;
  const step2Done = step1Done && email.trim().length > 0;
  const step3Done = step2Done && password.length >= 8 && confirmPassword.length >= 8;

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
      window.location.assign(buildPlansUrl(email, branding));
    } catch (err) {
      setError(err.message || 'No pudimos crear la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.screen}>
      <div className={styles.orbTop} aria-hidden="true" />
      <div className={styles.orbBottom} aria-hidden="true" />
      <div className={styles.meshGrid} aria-hidden="true" />

      <header className={styles.topBar}>
        <a href="/" className={styles.backBtn}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M10 3L5 8l5 5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Volver al inicio
        </a>
        <div className={styles.topBarBrand}>
          <div className={styles.topBarMark}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="5" height="5" rx="1.5" fill="currentColor" fillOpacity="0.9" />
              <rect x="8" y="1" width="5" height="5" rx="1.5" fill="currentColor" fillOpacity="0.6" />
              <rect x="1" y="8" width="5" height="5" rx="1.5" fill="currentColor" fillOpacity="0.6" />
              <rect x="8" y="8" width="5" height="5" rx="1.5" fill="currentColor" fillOpacity="0.9" />
            </svg>
          </div>
          <span className={styles.topBarName}>{branding.register.topBarName}</span>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.leftPanel}>
          <div className={styles.leftPanelInner}>
            <p className={styles.eyebrow}>{branding.register.eyebrow}</p>
            <h1 className={styles.title}>
              {branding.register.title}
              <br />
              <span className={styles.titleAccent}>{branding.register.accent}</span>
            </h1>
            <p className={styles.subtitle}>
              {branding.register.subtitle}
            </p>

            <div className={styles.progressSteps}>
              <div className={styles.progressItem}>
                <div className={styles.progressLabel}>
                  <StepState active={!step1Done} done={step1Done} />
                  <span className={styles.progressTitle}>Tu barbería</span>
                  <span className={styles.progressDesc}>Nombre del negocio</span>
                </div>
              </div>
              <div className={styles.progressItem}>
                <div className={styles.progressLabel}>
                  <StepState active={step1Done && !step2Done} done={step2Done} />
                  <span className={styles.progressTitle}>Acceso</span>
                  <span className={styles.progressDesc}>Email de ingreso</span>
                </div>
              </div>
              <div className={styles.progressItem}>
                <div className={styles.progressLabel}>
                  <StepState active={step2Done && !step3Done} done={step3Done} />
                  <span className={styles.progressTitle}>Seguridad</span>
                  <span className={styles.progressDesc}>Tu contraseña</span>
                </div>
              </div>
            </div>

            <div className={styles.helperCard}>
              <div className={styles.helperIcon}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <path
                    d="M8 7v4M8 5v.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div>
                <p className={styles.helperTitle}>{branding.register.helperTitle}</p>
                <p className={styles.helperText}>
                  {branding.register.helperText}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section className={styles.formCard}>
          <div className={styles.formCardHeader}>
            <span className={styles.formCardTag}>Registro gratuito</span>
            <p className={styles.formCardCaption}>Completá los datos de tu barbería</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Nombre de tu barbería</span>
              <div className={styles.inputWrap}>
                <div className={styles.inputIcon}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="1" y="1" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Ej: Saiko Cuts"
                  autoComplete="organization"
                  required
                  className={fullName.trim().length >= 3 ? styles.inputValid : ''}
                />
                {fullName.trim().length >= 3 ? (
                  <div className={styles.inputCheck}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                ) : null}
              </div>
            </label>

            <div className={styles.fieldDivider}>
              <span>Datos de acceso</span>
            </div>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Email de acceso</span>
              <div className={styles.inputWrap}>
                <div className={styles.inputIcon}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M1 5l7 5 7-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tu@barberia.com"
                  autoComplete="email"
                  required
                  className={email.trim().length > 5 && email.includes('@') ? styles.inputValid : ''}
                />
                {email.trim().length > 5 && email.includes('@') ? (
                  <div className={styles.inputCheck}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                ) : null}
              </div>
            </label>

            <div className={styles.passwordGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Contraseña</span>
                <div className={styles.inputWrap}>
                  <div className={styles.inputIcon}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <rect x="3" y="7" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      <circle cx="8" cy="10.5" r="1" fill="currentColor" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    required
                    className={password.length >= 8 ? styles.inputValid : ''}
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    <EyeIcon visible={showPassword} />
                  </button>
                </div>
                {password.length > 0 ? (
                  <div className={styles.strengthBar}>
                    <div
                      className={styles.strengthFill}
                      style={{
                        width: password.length >= 12 ? '100%' : password.length >= 8 ? '65%' : '30%',
                        background:
                          password.length >= 12
                            ? '#21c063'
                            : password.length >= 8
                              ? '#ff1493'
                              : '#ff9b2f',
                      }}
                    />
                  </div>
                ) : null}
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Repetir contraseña</span>
                <div className={styles.inputWrap}>
                  <div className={styles.inputIcon}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <rect x="3" y="7" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      <path
                        d="M6.5 10.5l1 1 2-2"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repetí la contraseña"
                    autoComplete="new-password"
                    required
                    className={
                      confirmPassword.length >= 8 && confirmPassword === password
                        ? styles.inputValid
                        : confirmPassword.length > 0 && confirmPassword !== password
                          ? styles.inputError
                          : ''
                    }
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    aria-label={
                      showConfirmPassword ? 'Ocultar confirmación' : 'Mostrar confirmación'
                    }
                  >
                    <EyeIcon visible={showConfirmPassword} />
                  </button>
                </div>
                {confirmPassword.length > 0 && confirmPassword !== password ? (
                  <p className={styles.fieldHint}>Las contraseñas no coinciden</p>
                ) : null}
              </label>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading || !isFormValid}
            >
              {loading ? (
                <>
                  <span className={styles.spinner} />
                  Creando cuenta...
                </>
              ) : (
                <>
                  Crear cuenta y seguir
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M3 8h10M9 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </>
              )}
            </button>
          </form>

          {error ? (
            <div className={styles.errorBox} role="alert">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.errorIcon} aria-hidden="true">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 5v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
