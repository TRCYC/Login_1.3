import React, { useEffect, useRef, useState } from 'react';
import {
  useBranding,
  useClient,
  useErrors,
  useLogin,
  useScreen,
  useTransaction,
} from '@auth0/auth0-acul-react/login';
import {
  RcycAlert,
  RcycAuthHeader,
  RcycField,
  RcycPageShell,
  FALLBACK_LOGO,
  FALLBACK_PRIVACY_URL,
} from '../../components/RcycPageShell.jsx';

const copy = {
  title: 'SIGN IN TO YOUR ACCOUNT',
  emailLabel: 'Login email',
  emailPlaceholder: 'Login email',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Password',
  forgotPassword: 'FORGOT PASSWORD?',
  signIn: 'SIGN IN',
  createAccount: 'CREATE AN ACCOUNT',
  emailRequired: 'Please enter a valid email address',
  passwordRequired: 'This field is required',
  loginFailed: 'Login Failed. Please check username/password or create an account. This login does not accept Marriott Bonvoy credentials; it is unique to The Ritz-Carlton Yacht Collection. Forgot password?',
  genericError: 'Something went wrong, please try again later.',
};

function getText(texts, key, fallback) {
  return texts?.[key] || fallback;
}

function getErrorCode(error) {
  return typeof error === 'string'
    ? ''
    : String(error?.code || error?.error || '').toLowerCase();
}

function isAuthenticationFailureError(error) {
  const code = getErrorCode(error);
  const message = typeof error === 'string'
    ? error.toLowerCase()
    : String(error?.message || error?.description || '').toLowerCase();
  const authenticationFailureCodes = [
    'invalid_credentials',
    'invalid_grant',
    'invalid_user_password',
    'authentication-failure',
    'wrong-email-credentials',
    'wrong-password',
    'invalid-password',
    'invalid-user-password',
    'user-not-found',
    'user_not_found',
  ];

  return authenticationFailureCodes.includes(code)
    || /(?:invalid|wrong|incorrect).*(?:credential|password)|(?:credential|password).*(?:invalid|wrong|incorrect)/.test(code)
    || /login failed|username\/password|invalid credentials/.test(message);
}

function getErrorMessage(error, texts, fallback = '') {
  if (!error) {
    return fallback;
  }

  const code = getErrorCode(error);
  const message = typeof error === 'string'
    ? error
    : String(error?.message || error?.description || '');
  const isInternalError = /can't access property|cannot read propert(?:y|ies)|is undefined|is not defined/i.test(message);

  if (isAuthenticationFailureError(error)) {
    // Keep this copy stable even when the Auth0 tenant still has an older
    // custom-text value. The Figma/Jira error state requires the full RCYC
    // guidance, and the JSON payload is maintained separately for Auth0.
    return copy.loginFailed;
  }

  if (code.startsWith('custom_script') || isInternalError) {
    return getText(texts, 'custom-script-error-code', copy.genericError);
  }

  return message || fallback;
}

function isExpiredSessionError(error) {
  const code = String(error?.code || error?.error || '').toLowerCase();
  const message = String(error?.message || error?.description || '').toLowerCase();

  return /expired|session.*timeout|timeout.*session|transaction.*expired/.test(`${code} ${message}`);
}

function LoginScreen() {
  // useLogin returns the manager instance. Keep the method call on that instance
  // because the ACUL SDK login method reads this.transaction internally.
  const loginManager = useLogin();
  const screen = useScreen();
  const transaction = useTransaction();
  const client = useClient();
  const branding = useBranding();
  const errorState = useErrors();
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const [email, setEmail] = useState(screen?.data?.username || '');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  // Layout-only until Auth0 exposes a supported login-level Remember Me option.
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
  const sdkErrors = errorState?.errors;
  const usernameSdkError = sdkErrors?.byField?.('username')?.[0];
  const passwordSdkError = sdkErrors?.byField?.('password')?.[0];
  const authSdkErrors = sdkErrors?.byType?.('auth0') || [];
  const transactionErrors = Array.isArray(transaction?.errors) ? transaction.errors : [];
  const usernameTransactionError = transactionErrors.find((error) => ['username', 'email', 'identifier'].includes(error?.field));
  const passwordTransactionError = transactionErrors.find((error) => error?.field === 'password');
  const usernameError = usernameSdkError || usernameTransactionError;
  const passwordErrorFromAuth0 = passwordSdkError || passwordTransactionError;
  const allErrors = [...authSdkErrors, ...transactionErrors];
  const generalErrors = allErrors
    .filter((error) => !error?.field)
    .map((error) => getErrorMessage(error, texts))
    .filter(Boolean)
    .filter((message, index, messages) => messages.indexOf(message) === index);
  const hasAuthenticationFailure = allErrors.some(isAuthenticationFailureError)
    || (submitError && isAuthenticationFailureError(submitError));
  // An authentication failure is a form-level error. Do not combine it with
  // client-side field validation after Auth0 re-renders the screen with empty
  // field values. Keep client-side validation active for blank or malformed
  // input submissions so those messages remain under the relevant fields.
  const emailError = !hasAuthenticationFailure && touched.email && !emailIsValid
    ? getText(texts, 'invalid-email-username', copy.emailRequired)
    : '';
  const passwordError = !hasAuthenticationFailure && touched.password && !passwordIsValid
    ? getText(texts, 'no-password', copy.passwordRequired)
    : '';
  const usernameFieldError = usernameError && !isAuthenticationFailureError(usernameError)
    ? getErrorMessage(usernameError, texts)
    : '';
  const passwordFieldError = passwordErrorFromAuth0 && !isAuthenticationFailureError(passwordErrorFromAuth0)
    ? getErrorMessage(passwordErrorFromAuth0, texts)
    : '';
  // Auth0 may return invalid credentials as a field-level transaction error.
  // Keep that error under the field, but also surface it at the top so a failed
  // server round-trip never looks like a silent page reload.
  const firstAuth0Error = allErrors
    .map((error) => getErrorMessage(error, texts, getText(texts, 'wrong-email-credentials', copy.loginFailed)))
    .find(Boolean);
  const visibleGeneralError = submitError || generalErrors[0] || firstAuth0Error || '';
  const hasExpiredSession = allErrors.some(isExpiredSessionError);

  useEffect(() => {
    const pageTitle = getText(texts, 'pageTitle', '');
    if (pageTitle) {
      document.title = pageTitle.replace('${clientName}', client?.name || '');
    }
  }, [client?.name, texts]);

  const clearFormErrors = () => {
    setSubmitError('');
    if (errorState?.hasError) {
      errorState.dismissAll();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    setSubmitError('');

    if (!emailIsValid || !passwordIsValid) {
      if (!emailIsValid) {
        emailInputRef.current?.focus();
      } else {
        passwordInputRef.current?.focus();
      }
      return;
    }

    setIsSubmitting(true);

    try {
      await loginManager.login({
        username: email.trim(),
        password,
        ...(screen?.isCaptchaAvailable ? { captcha } : {}),
      });
    } catch (error) {
      setSubmitError(getErrorMessage(
        error,
        texts,
        getText(texts, 'wrong-email-credentials', copy.loginFailed),
      ));
      setIsSubmitting(false);
    }
  };

  const handleBlur = (field) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  return (
    <RcycPageShell
      labelledBy="rcyc-login-title"
      privacyUrl={privacyUrl || FALLBACK_PRIVACY_URL}
    >
      <section className="rcyc-auth-stage">
        <div className="rcyc-form-column">
          <RcycAuthHeader
            logoUrl={logoUrl || FALLBACK_LOGO}
            logoAlt={getText(texts, 'logoAltText', 'The Ritz-Carlton Yacht Collection')}
            title={getText(texts, 'title', copy.title)}
            titleId="rcyc-login-title"
          />

          {visibleGeneralError && (
            <RcycAlert
              id="rcyc-login-error"
              action={hasExpiredSession ? (
                <button
                  className="rcyc-alert-refresh"
                  type="button"
                  onClick={() => window.location.reload()}
                >
                  REFRESH
                </button>
              ) : null}
            >
              {visibleGeneralError}
            </RcycAlert>
          )}

          <form className="rcyc-form" onSubmit={handleSubmit} noValidate>
            <RcycField
              id="rcyc-login-email"
              label={getText(texts, 'emailPlaceholder', copy.emailLabel)}
              error={emailError || usernameFieldError}
            >
              <input
                ref={emailInputRef}
                id="rcyc-login-email"
                name="username"
                type="email"
                autoComplete="username"
                placeholder={getText(texts, 'emailPlaceholder', copy.emailPlaceholder)}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  clearFormErrors();
                }}
                onBlur={() => handleBlur('email')}
                aria-invalid={Boolean(emailError || usernameFieldError)}
                aria-describedby={emailError || usernameFieldError ? 'rcyc-login-email-error' : undefined}
                autoFocus
              />
            </RcycField>

            <RcycField
              id="rcyc-login-password"
              label={getText(texts, 'passwordPlaceholder', copy.passwordLabel)}
              error={passwordError || passwordFieldError}
            >
              <input
                ref={passwordInputRef}
                id="rcyc-login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder={getText(texts, 'passwordPlaceholder', copy.passwordPlaceholder)}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  clearFormErrors();
                }}
                onBlur={() => handleBlur('password')}
                aria-invalid={Boolean(passwordError || passwordFieldError)}
                aria-describedby={passwordError || passwordFieldError ? 'rcyc-login-password-error' : undefined}
              />
            </RcycField>

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

            <div className="rcyc-form-meta">
              <label className="rcyc-remember-me" htmlFor="rcyc-remember-me">
                <input
                  id="rcyc-remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  aria-describedby="rcyc-remember-me-help"
                />
                <span>Remember Me</span>
              </label>
              <span id="rcyc-remember-me-help" className="rcyc-visually-hidden">
                Auth0 controls session duration. This option never stores your password in this browser.
              </span>
              {resetPasswordLink && (
                <a className="rcyc-forgot-password" href={resetPasswordLink}>
                  {getText(texts, 'forgotPasswordText', copy.forgotPassword)}
                </a>
              )}
            </div>

            <div className="rcyc-form-actions">
              <button
                className="rcyc-button rcyc-button-primary"
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? <span className="rcyc-spinner" aria-label="Signing in" /> : getText(texts, 'buttonText', copy.signIn)}
              </button>
              {isSignupEnabled && (
                <a className="rcyc-button rcyc-button-secondary" href={signupLink}>
                  {getText(texts, 'signupActionLinkText', copy.createAccount)}
                </a>
              )}
            </div>
          </form>
        </div>
      </section>
    </RcycPageShell>
  );
}

export default LoginScreen;
