import React, { useState } from 'react';
import {
  useBranding,
  useClient,
  useErrors,
  useLogin,
  useScreen,
  useTransaction,
} from '@auth0/auth0-acul-react/login';

const FALLBACK_LOGO = 'https://www.ritzcarltonyachtcollection.com/assets/components/images/logo.svg';
const FALLBACK_PRIVACY_URL = 'https://www.ritzcarltonyachtcollection.com/legal/privacy-policy';

const copy = {
  title: 'SIGN IN TO YOUR ACCOUNT',
  emailLabel: 'Login email',
  emailPlaceholder: 'Login email',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Password',
  forgotPassword: 'FORGOT PASSWORD?',
  signIn: 'SIGN IN',
  createAccount: 'CREATE AN ACCOUNT',
  emailRequired: 'Please enter a valid email address.',
  passwordRequired: 'Please enter a password.',
  loginFailed: 'Login Failed. Please check username/password or create an account.',
  legalIntro: "Yacht OpCo Limited d/b/a The Ritz-Carlton Yacht Collection uses The Ritz-Carlton marks under license from The Ritz-Carlton Hotel Company, L.L.C. and is not an affiliate of The Ritz-Carlton Hotel Company, L.L.C. or Marriott International, Inc. Renderings are artistic concepts. Any specifications in this depiction may change at The Ritz-Carlton Yacht Collection's sole discretion without notice. The features, plans, itineraries, offerings and specifications described above are proposed only, and The Ritz-Carlton Yacht Collection reserves the right to modify, revise or withdraw any or all of the same in its sole discretion and without prior notice. Guest's and related travel will be governed by the terms and conditions of the Ticket Contract in effect at the time of booking. The terms of the Ticket Contract will supersede any other representations or statements whether oral or written. The Ritz-Carlton Yacht Collection recognizes the importance of ensuring that our website is accessible to those with disabilities. This website is currently in development. This website endeavors to achieve &ldquo;Level AA&rdquo; WCAG 2.0 compliance. A passport is required to board the Vessel, regardless of itinerary. Yacht's registry: Malta",
};

function getText(texts, key, fallback) {
  return texts?.[key] || fallback;
}

function getErrorMessage(error) {
  if (!error) {
    return '';
  }

  return error.message || error.description || '';
}

function LoginScreen() {
  const { login } = useLogin();
  const screen = useScreen();
  const transaction = useTransaction();
  const client = useClient();
  const branding = useBranding();
  const errorState = useErrors();
  const [email, setEmail] = useState(screen?.data?.username || '');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const texts = screen?.texts || {};
  const logoUrl = client?.logoUrl || client?.logo_uri || branding?.settings?.logoUrl || branding?.settings?.logo_url || FALLBACK_LOGO;
  const privacyUrl = client?.metadata?.privacy_url || FALLBACK_PRIVACY_URL;
  const resetPasswordLink = screen?.resetPasswordLink || screen?.links?.reset_password;
  const signupLink = screen?.signupLink || screen?.links?.signup;
  const isSignupEnabled = Boolean(signupLink && transaction?.isSignupEnabled !== false);
  const emailIsValid = email.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordIsValid = password.length > 0;
  const emailError = touched.email && !emailIsValid ? getText(texts, 'invalid-email-username', copy.emailRequired) : '';
  const passwordError = touched.password && !passwordIsValid ? getText(texts, 'no-password', copy.passwordRequired) : '';
  const sdkErrors = errorState?.errors;
  const usernameSdkError = sdkErrors?.byField?.('username')?.[0];
  const passwordSdkError = sdkErrors?.byField?.('password')?.[0];
  const generalSdkErrors = sdkErrors?.byType?.('auth0')?.filter((error) => !error.field) || [];
  const transactionErrors = Array.isArray(transaction?.errors) ? transaction.errors : [];
  const generalErrors = [...generalSdkErrors, ...transactionErrors]
    .map(getErrorMessage)
    .filter(Boolean)
    .filter((message, index, messages) => messages.indexOf(message) === index);
  const visibleGeneralError = submitError || generalErrors[0] || '';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    setSubmitError('');

    if (!emailIsValid || !passwordIsValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      await login({
        username: email.trim(),
        password,
        ...(screen?.isCaptchaAvailable ? { captcha } : {}),
      });
    } catch (error) {
      setSubmitError(getErrorMessage(error) || getText(texts, 'wrong-email-credentials', copy.loginFailed));
      setIsSubmitting(false);
    }
  };

  const handleBlur = (field) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  return (
    <div className="rcyc-page-shell">
      <main className="rcyc-login-stage" aria-labelledby="rcyc-login-title">
        <section className="rcyc-login-column">
          <header className="rcyc-header">
            <img className="rcyc-logo" src={logoUrl} alt={getText(texts, 'logoAltText', 'The Ritz-Carlton Yacht Collection')} />
            <h1 id="rcyc-login-title">{getText(texts, 'title', copy.title)}</h1>
          </header>

          {visibleGeneralError && (
            <div className="rcyc-alert" role="alert" aria-live="assertive">
              {visibleGeneralError}
            </div>
          )}

          <form className="rcyc-login-form" onSubmit={handleSubmit} noValidate>
            <div className={`rcyc-field ${emailError || usernameSdkError ? 'has-error' : ''}`}>
              <label htmlFor="rcyc-login-email">{getText(texts, 'emailPlaceholder', copy.emailLabel)}</label>
              <input
                id="rcyc-login-email"
                name="username"
                type="email"
                autoComplete="username"
                placeholder={getText(texts, 'emailPlaceholder', copy.emailPlaceholder)}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => handleBlur('email')}
                aria-invalid={Boolean(emailError || usernameSdkError)}
                aria-describedby={emailError || usernameSdkError ? 'rcyc-email-error' : undefined}
                autoFocus
              />
              {(emailError || usernameSdkError) && (
                <span id="rcyc-email-error" className="rcyc-field-error" role="alert">
                  {emailError || getErrorMessage(usernameSdkError)}
                </span>
              )}
            </div>

            <div className={`rcyc-field ${passwordError || passwordSdkError ? 'has-error' : ''}`}>
              <label htmlFor="rcyc-login-password">{getText(texts, 'passwordPlaceholder', copy.passwordLabel)}</label>
              <input
                id="rcyc-login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder={getText(texts, 'passwordPlaceholder', copy.passwordPlaceholder)}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onBlur={() => handleBlur('password')}
                aria-invalid={Boolean(passwordError || passwordSdkError)}
                aria-describedby={passwordError || passwordSdkError ? 'rcyc-password-error' : undefined}
              />
              {(passwordError || passwordSdkError) && (
                <span id="rcyc-password-error" className="rcyc-field-error" role="alert">
                  {passwordError || getErrorMessage(passwordSdkError)}
                </span>
              )}
            </div>

            {screen?.isCaptchaAvailable && (
              <div className="rcyc-captcha-field">
                {screen.captchaImage && <img src={screen.captchaImage} alt="Security challenge" />}
                <label htmlFor="rcyc-login-captcha">Security challenge</label>
                <input
                  id="rcyc-login-captcha"
                  name="captcha"
                  type="text"
                  value={captcha}
                  onChange={(event) => setCaptcha(event.target.value)}
                  autoComplete="off"
                />
              </div>
            )}

            <div className="rcyc-login-meta">
              <label className="rcyc-remember-me" htmlFor="rcyc-remember-me">
                <input
                  id="rcyc-remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                <span>Remember Me</span>
              </label>
              {resetPasswordLink && (
                <a className="rcyc-forgot-password" href={resetPasswordLink}>
                  {getText(texts, 'forgotPasswordText', copy.forgotPassword)}
                </a>
              )}
            </div>

            <div className="rcyc-actions">
              <button className="rcyc-button rcyc-button-primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? <span className="rcyc-spinner" aria-label="Signing in" /> : getText(texts, 'buttonText', copy.signIn)}
              </button>
              {isSignupEnabled && (
                <a className="rcyc-button rcyc-button-secondary" href={signupLink}>
                  {getText(texts, 'signupActionLinkText', copy.createAccount)}
                </a>
              )}
            </div>
          </form>
        </section>
      </main>

      <footer className="rcyc-footer">
        <div className="rcyc-footer-topline">
          <p>&copy; 2026 The Ritz-Carlton Yacht Collection. All Rights Reserved.</p>
          <a href={privacyUrl}>Your privacy rights</a>
        </div>
        <p>{copy.legalIntro}</p>
      </footer>
    </div>
  );
}

export default LoginScreen;
