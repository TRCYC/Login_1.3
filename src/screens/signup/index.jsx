import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  useBranding,
  useClient,
  useCountryCodes,
  useErrors,
  useScreen,
  useSignup,
  useTenant,
  useTransaction,
} from '@auth0/auth0-acul-react/signup';
import {
  RcycAlert,
  RcycAuthHeader,
  RcycField,
  RcycPageShell,
  FALLBACK_LOGO,
  FALLBACK_PRIVACY_URL,
} from '../../components/RcycPageShell.jsx';

const copy = {
  title: 'CREATE YOUR ACCOUNT',
  firstNameLabel: 'First Name',
  firstNamePlaceholder: 'First Name',
  lastNameLabel: 'Last Name',
  lastNamePlaceholder: 'Last Name',
  countryLabel: 'Country of Residence',
  countryPlaceholder: 'Select Country of Residence',
  postalCodeLabel: 'ZIP / Postal Code',
  postalCodePlaceholder: 'ZIP / Postal Code',
  emailLabel: 'Email',
  emailPlaceholder: 'Email',
  confirmEmailLabel: 'Confirm Email',
  confirmEmailPlaceholder: 'Confirm Email',
  phoneLabel: 'Phone Number',
  phonePlaceholder: 'Phone Number',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Password',
  confirmPasswordLabel: 'Confirm Password',
  confirmPasswordPlaceholder: 'Confirm Password',
  phoneMarketing: 'Phone Number',
  emailMarketing: 'Email',
  postalMarketing: 'Postal Mail',
  marketingOptIn: 'Opt In',
  createAccount: 'CREATE ACCOUNT',
  signIn: 'Already have an account? SIGN IN',
  emailInvalid: 'Please enter a valid email address.',
  emailMismatch: 'The email addresses entered do not match.',
  firstNameInvalid: 'Please enter a first name.',
  lastNameInvalid: 'Please enter a last name.',
  countryRequired: 'Please select country of residence.',
  postalCodeInvalid: 'Please enter a valid ZIP / Postal Code.',
  phoneInvalid: 'Please enter a valid phone number.',
  passwordInvalid: 'Password must contain: 7-15 characters, 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.',
  passwordMismatch: 'The passwords entered do not match.',
  required: 'This field is required.',
  duplicate: 'An account with this email address already exists. Please sign in, or reset your password.',
  genericError: "We're unable to process your request. Please refresh and try again. If the issue persists, contact The Ritz-Carlton Yacht Collection or your travel professional.",
};

const FALLBACK_COUNTRIES = [
  { code: 'US', label: 'United States', dialCode: '+1' },
  { code: 'CA', label: 'Canada', dialCode: '+1' },
  { code: 'GB', label: 'United Kingdom', dialCode: '+44' },
  { code: 'AU', label: 'Australia', dialCode: '+61' },
];

const latinNamePattern = /^[\p{Script=Latin}]+(?:[ .'-][\p{Script=Latin}]+)*$/u;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneDigitsPattern = /\d/g;

function getText(texts, key, fallback) {
  return texts?.[key] || fallback;
}

function getErrorCode(error) {
  return typeof error === 'string'
    ? ''
    : String(error?.code || error?.error || '').toLowerCase();
}

function getErrorMessage(error) {
  return typeof error === 'string'
    ? error
    : String(error?.message || error?.description || '');
}

function isDuplicateError(error) {
  const value = `${getErrorCode(error)} ${getErrorMessage(error)}`.toLowerCase();
  return /already exists|user exists|user_exists|email exists|email_exists|username exists|username_exists|conflict/.test(value);
}

function isExpiredSessionError(error) {
  const value = `${getErrorCode(error)} ${getErrorMessage(error)}`.toLowerCase();
  return /expired|session.*timeout|timeout.*session|transaction.*expired/.test(value);
}

function normalizeCountries(countryCodes) {
  const source = Array.isArray(countryCodes?.available) && countryCodes.available.length
    ? countryCodes.available
    : FALLBACK_COUNTRIES;
  const seen = new Set();

  return source.map((country) => ({
    ...country,
    dialCode: country.dialCode || country.dial_code || '',
  })).filter((country) => {
    const key = `${country.code}-${country.dialCode}`;
    if (!country.code || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function validatePostalCode(value, countryCode) {
  const trimmedValue = value.trim();
  if (countryCode === 'US') return /^\d{5}(?:-\d{4})?$/.test(trimmedValue);
  if (countryCode === 'CA') return /^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/i.test(trimmedValue);
  return !trimmedValue || /^[A-Za-z0-9][A-Za-z0-9 -]{2,11}$/.test(trimmedValue);
}

function validatePhone(value, countryCode) {
  const digits = value.match(phoneDigitsPattern)?.length || 0;
  if (!digits || !/^[\d ()-]+$/.test(value.trim())) return false;
  if (countryCode === 'US' || countryCode === 'CA') return digits === 10;
  return digits >= 7 && digits <= 15;
}

function validatePasswordRequirements(value) {
  return value.length >= 7
    && value.length <= 15
    && /[A-Z]/.test(value)
    && /[a-z]/.test(value)
    && /\d/.test(value)
    && /[^A-Za-z0-9]/.test(value);
}

function SignupScreen() {
  // Keep the Auth0 manager instance intact. Its signup method uses the active
  // transaction stored on the instance, just like the login manager.
  const signupManager = useSignup();
  const screen = useScreen();
  const transaction = useTransaction();
  const client = useClient();
  const branding = useBranding();
  const tenant = useTenant();
  const countryCodes = useCountryCodes();
  const errorState = useErrors();
  const firstNameRef = useRef(null);
  const lastNameRef = useRef(null);
  const countryRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const texts = screen?.texts || {};
  const countries = useMemo(() => normalizeCountries(countryCodes), [countryCodes]);
  const recommendedCountry = countryCodes?.recommended || 'US';
  const defaultPhoneCountry = countries.some((country) => country.code === 'US')
    ? 'US'
    : recommendedCountry;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [countryOfResidence, setCountryOfResidence] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState(defaultPhoneCountry);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [marketing, setMarketing] = useState({ phone: false, email: false, postalMail: false });
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const logoUrl = client?.logoUrl || client?.logo_uri || branding?.settings?.logoUrl || branding?.settings?.logo_url || FALLBACK_LOGO;
  const privacyUrl = client?.metadata?.privacy_url || FALLBACK_PRIVACY_URL;
  const loginLink = screen?.loginLink || screen?.links?.login;
  const resetPasswordLink = screen?.links?.reset_password;
  const countryRequiresPostalCode = countryOfResidence === 'US' || countryOfResidence === 'CA';

  const values = {
    firstName,
    lastName,
    countryOfResidence,
    postalCode,
    email,
    confirmEmail,
    phone,
    password,
    confirmPassword,
  };

  const errors = {
    firstName: firstName.trim() && latinNamePattern.test(firstName.trim()) ? '' : (firstName.trim() ? copy.firstNameInvalid : copy.required),
    lastName: lastName.trim() && latinNamePattern.test(lastName.trim()) ? '' : (lastName.trim() ? copy.lastNameInvalid : copy.required),
    countryOfResidence: countryOfResidence ? '' : copy.countryRequired,
    postalCode: countryRequiresPostalCode && !validatePostalCode(postalCode, countryOfResidence)
      ? copy.postalCodeInvalid
      : '',
    email: emailPattern.test(email.trim()) ? '' : copy.emailInvalid,
    confirmEmail: emailPattern.test(confirmEmail.trim()) && confirmEmail.trim().toLowerCase() === email.trim().toLowerCase()
      ? ''
      : (confirmEmail.trim() && emailPattern.test(confirmEmail.trim()) ? copy.emailMismatch : copy.emailInvalid),
    phone: validatePhone(phone, phoneCountryCode) ? '' : copy.phoneInvalid,
    password: validatePasswordRequirements(password) ? '' : copy.passwordInvalid,
    confirmPassword: !confirmPassword
      ? copy.required
      : (confirmPassword === password ? '' : copy.passwordMismatch),
  };

  const sdkErrors = errorState?.errors || [];
  const transactionErrors = Array.isArray(transaction?.errors) ? transaction.errors : [];
  const allErrors = [...sdkErrors, ...transactionErrors];
  const duplicateError = allErrors.find(isDuplicateError) || (submitError && isDuplicateError(submitError) ? submitError : null);
  const hasExpiredSession = allErrors.some(isExpiredSessionError) || isExpiredSessionError(submitError);
  const authError = allErrors
    .filter((error) => !error?.field)
    .map(getErrorMessage)
    .find(Boolean);
  const visibleGeneralError = duplicateError
    ? getText(texts, 'user-exists', copy.duplicate)
    : submitError || authError || '';

  useEffect(() => {
    const pageTitle = getText(texts, 'pageTitle', 'Create account | ${clientName}');
    document.title = pageTitle.replace('${clientName}', client?.name || tenant?.friendlyName || '');
  }, [client?.name, tenant?.friendlyName, texts]);

  useEffect(() => {
    if (!countryOfResidence && countries.some((country) => country.code === defaultPhoneCountry)) {
      setPhoneCountryCode(defaultPhoneCountry);
    }
  }, [countries, countryOfResidence, defaultPhoneCountry]);

  const clearErrors = () => {
    setSubmitError('');
    if (errorState?.hasError) errorState.dismissAll();
  };

  const updateField = (field, setter, value) => {
    setter(value);
    setTouched((current) => ({ ...current, [field]: true }));
    clearErrors();
  };

  const handleCountryChange = (event) => {
    const nextCountry = event.target.value;
    setCountryOfResidence(nextCountry);
    const matchingPhoneCountry = countries.find((country) => country.code === nextCountry);
    if (matchingPhoneCountry) setPhoneCountryCode(matchingPhoneCountry.code);
    setTouched((current) => ({ ...current, countryOfResidence: true, postalCode: true }));
    clearErrors();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched(Object.keys(values).reduce((result, field) => ({ ...result, [field]: true }), {}));
    clearErrors();

    const firstInvalidField = Object.keys(values).find((field) => errors[field]);
    if (firstInvalidField) {
      const refs = {
        firstName: firstNameRef,
        lastName: lastNameRef,
        countryOfResidence: countryRef,
        postalCode: countryRef,
        email: emailRef,
        confirmEmail: emailRef,
        phone: emailRef,
        password: passwordRef,
        confirmPassword: passwordRef,
      };
      refs[firstInvalidField]?.current?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      await signupManager.signup({
        email: email.trim(),
        password,
        phoneNumber: phone.trim(),
        phoneCountryCode,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        countryOfResidence,
        postalCode: postalCode.trim(),
        marketingPhone: marketing.phone,
        marketingEmail: marketing.email,
        marketingPostalMail: marketing.postalMail,
      });
    } catch (error) {
      setSubmitError(isDuplicateError(error) ? copy.duplicate : getErrorMessage(error) || copy.genericError);
      setIsSubmitting(false);
    }
  };

  const visibleFieldError = (field) => touched[field] ? errors[field] : '';
  const formIsValid = Object.values(errors).every((error) => !error);

  return (
    <RcycPageShell labelledBy="rcyc-signup-title" privacyUrl={privacyUrl || FALLBACK_PRIVACY_URL} privacyTarget="_blank">
      <section className="rcyc-auth-stage rcyc-signup-stage">
        <div className="rcyc-form-column rcyc-signup-column">
          <RcycAuthHeader
            logoUrl={logoUrl || FALLBACK_LOGO}
            logoAlt={getText(texts, 'logoAltText', 'The Ritz-Carlton Yacht Collection')}
            title={copy.title}
            titleId="rcyc-signup-title"
          />

          {visibleGeneralError && (
            <RcycAlert
              id="rcyc-signup-error"
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
              {duplicateError && (
                <span className="rcyc-error-links">
                  {loginLink && <a href={loginLink}>sign in</a>}
                  {resetPasswordLink && <a href={resetPasswordLink}>reset your password</a>}
                </span>
              )}
            </RcycAlert>
          )}

          <form className="rcyc-form rcyc-signup-form" onSubmit={handleSubmit} noValidate>
            <div className="rcyc-signup-grid">
              <RcycField id="rcyc-signup-first-name" label={`${copy.firstNameLabel} *`} error={visibleFieldError('firstName')}>
                <input
                  ref={firstNameRef}
                  id="rcyc-signup-first-name"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  placeholder={copy.firstNamePlaceholder}
                  value={firstName}
                  onChange={(event) => updateField('firstName', setFirstName, event.target.value)}
                  onBlur={() => setTouched((current) => ({ ...current, firstName: true }))}
                  aria-invalid={Boolean(visibleFieldError('firstName'))}
                  aria-describedby={visibleFieldError('firstName') ? 'rcyc-signup-first-name-error' : undefined}
                />
              </RcycField>

              <RcycField id="rcyc-signup-last-name" label={`${copy.lastNameLabel} *`} error={visibleFieldError('lastName')}>
                <input
                  ref={lastNameRef}
                  id="rcyc-signup-last-name"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  placeholder={copy.lastNamePlaceholder}
                  value={lastName}
                  onChange={(event) => updateField('lastName', setLastName, event.target.value)}
                  onBlur={() => setTouched((current) => ({ ...current, lastName: true }))}
                  aria-invalid={Boolean(visibleFieldError('lastName'))}
                  aria-describedby={visibleFieldError('lastName') ? 'rcyc-signup-last-name-error' : undefined}
                />
              </RcycField>

              <RcycField id="rcyc-signup-country" label={`${copy.countryLabel} *`} error={visibleFieldError('countryOfResidence')}>
                <select
                  ref={countryRef}
                  id="rcyc-signup-country"
                  name="countryOfResidence"
                  value={countryOfResidence}
                  onChange={handleCountryChange}
                  onBlur={() => setTouched((current) => ({ ...current, countryOfResidence: true }))}
                  aria-invalid={Boolean(visibleFieldError('countryOfResidence'))}
                  aria-describedby={visibleFieldError('countryOfResidence') ? 'rcyc-signup-country-error' : undefined}
                >
                  <option value="">{copy.countryPlaceholder}</option>
                  {countries.map((country) => (
                    <option key={`${country.code}-${country.dialCode}`} value={country.code}>
                      {country.label}
                    </option>
                  ))}
                </select>
              </RcycField>

              <RcycField id="rcyc-signup-postal-code" label={`${copy.postalCodeLabel} *`} error={visibleFieldError('postalCode')}>
                <input
                  id="rcyc-signup-postal-code"
                  name="postalCode"
                  type="text"
                  autoComplete="postal-code"
                  placeholder={copy.postalCodePlaceholder}
                  value={postalCode}
                  onChange={(event) => updateField('postalCode', setPostalCode, event.target.value)}
                  onBlur={() => setTouched((current) => ({ ...current, postalCode: true }))}
                  aria-invalid={Boolean(visibleFieldError('postalCode'))}
                  aria-describedby={visibleFieldError('postalCode') ? 'rcyc-signup-postal-code-error' : undefined}
                />
              </RcycField>

              <RcycField id="rcyc-signup-email" label={`${copy.emailLabel} *`} error={visibleFieldError('email')}>
                <input
                  ref={emailRef}
                  id="rcyc-signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder={copy.emailPlaceholder}
                  value={email}
                  onChange={(event) => updateField('email', setEmail, event.target.value)}
                  onBlur={() => setTouched((current) => ({ ...current, email: true }))}
                  aria-invalid={Boolean(visibleFieldError('email'))}
                  aria-describedby={visibleFieldError('email') ? 'rcyc-signup-email-error' : undefined}
                />
              </RcycField>

              <RcycField id="rcyc-signup-confirm-email" label={`${copy.confirmEmailLabel} *`} error={visibleFieldError('confirmEmail')}>
                <input
                  id="rcyc-signup-confirm-email"
                  name="confirmEmail"
                  type="email"
                  autoComplete="email"
                  placeholder={copy.confirmEmailPlaceholder}
                  value={confirmEmail}
                  onChange={(event) => updateField('confirmEmail', setConfirmEmail, event.target.value)}
                  onBlur={() => setTouched((current) => ({ ...current, confirmEmail: true }))}
                  aria-invalid={Boolean(visibleFieldError('confirmEmail'))}
                  aria-describedby={visibleFieldError('confirmEmail') ? 'rcyc-signup-confirm-email-error' : undefined}
                />
              </RcycField>
            </div>

            <div className="rcyc-signup-grid rcyc-signup-phone-row">
              <RcycField id="rcyc-signup-phone" label={`${copy.phoneLabel} *`} error={visibleFieldError('phone')}>
                <div className="rcyc-phone-input">
                  <select
                    aria-label="Phone country code"
                    value={phoneCountryCode}
                    onChange={(event) => {
                      setPhoneCountryCode(event.target.value);
                      clearErrors();
                    }}
                  >
                    {countries.map((country) => (
                      <option key={`${country.code}-${country.dialCode}-phone`} value={country.code}>
                        {country.dialCode}
                      </option>
                    ))}
                  </select>
                  <input
                    id="rcyc-signup-phone"
                    name="phoneNumber"
                    type="tel"
                    autoComplete="tel-national"
                    placeholder={copy.phonePlaceholder}
                    value={phone}
                    onChange={(event) => updateField('phone', setPhone, event.target.value)}
                    onBlur={() => setTouched((current) => ({ ...current, phone: true }))}
                    aria-invalid={Boolean(visibleFieldError('phone'))}
                    aria-describedby={visibleFieldError('phone') ? 'rcyc-signup-phone-error' : undefined}
                  />
                </div>
              </RcycField>
            </div>

            <fieldset className="rcyc-marketing-preferences">
              <legend>Marketing Preferences</legend>
              {[
                ['phone', copy.phoneMarketing],
                ['email', copy.emailMarketing],
                ['postalMail', copy.postalMarketing],
              ].map(([key, label]) => (
                <label key={key} className="rcyc-checkbox-row">
                  <span className="rcyc-checkbox-label">{label}</span>
                  <input
                    type="checkbox"
                    checked={marketing[key]}
                    onChange={(event) => {
                      setMarketing((current) => ({ ...current, [key]: event.target.checked }));
                      clearErrors();
                    }}
                  />
                  <span>{copy.marketingOptIn}</span>
                </label>
              ))}
            </fieldset>

            <div className="rcyc-signup-grid">
              <RcycField id="rcyc-signup-password" label={`${copy.passwordLabel} *`} error={visibleFieldError('password')}>
                <input
                  ref={passwordRef}
                  id="rcyc-signup-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={copy.passwordPlaceholder}
                  value={password}
                  onChange={(event) => updateField('password', setPassword, event.target.value)}
                  onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                  aria-invalid={Boolean(visibleFieldError('password'))}
                  aria-describedby={visibleFieldError('password') ? 'rcyc-signup-password-error' : undefined}
                />
              </RcycField>

              <RcycField id="rcyc-signup-confirm-password" label={`${copy.confirmPasswordLabel} *`} error={visibleFieldError('confirmPassword')}>
                <input
                  id="rcyc-signup-confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder={copy.confirmPasswordPlaceholder}
                  value={confirmPassword}
                  onChange={(event) => updateField('confirmPassword', setConfirmPassword, event.target.value)}
                  onBlur={() => setTouched((current) => ({ ...current, confirmPassword: true }))}
                  aria-invalid={Boolean(visibleFieldError('confirmPassword'))}
                  aria-describedby={visibleFieldError('confirmPassword') ? 'rcyc-signup-confirm-password-error' : undefined}
                />
              </RcycField>
            </div>

            <p className="rcyc-signup-support">Need assistance? <a href="/portalassistance">Find answers here.</a></p>
            <p className="rcyc-signup-disclaimer">
              By providing your email, residential telephone and/or mobile telephone number and submitting this form, you are acknowledging that you are over 18+ years of age and have read and agreed to the{' '}
              <a href="/legal/terms-conditions" target="_blank" rel="noreferrer">Terms and Conditions</a>{' '}
              and{' '}
              <a href={privacyUrl || FALLBACK_PRIVACY_URL} target="_blank" rel="noreferrer">Privacy Policy</a>.
              {' '}By entering information on this form, you also acknowledge that you are providing it to The Ritz-Carlton Hotel Company, L.L.C. and Cruise Yacht OpCo Ltd and Next-Gen Cruises Ltd both doing business as The Ritz-Carlton Yacht Collection ("The Ritz-Carlton Yacht Collection") which uses The Ritz-Carlton marks under license from The Ritz-Carlton Hotel Company, L.L.C. RITZ® is a Registered Service Mark of The Ritz Hotel, Limited, Paris, and is used by The Ritz-Carlton Hotel Company under license. You also agree, to the extent you are or have been a Marriott International customer, that the Marriott Group may share any Personal Data, including Personal Preferences (as those terms are defined in the{' '}
              <a href="https://www.marriott.com/about/privacy.mi" target="_blank" rel="noreferrer">Marriott Group Global Privacy Statement</a>
              {' '}) it has previously collected about you with The Ritz-Carlton Yacht Collection for purposes of marketing. By clicking the “Submit” button below you agree to receive recurring special offers, promotions and marketing calls and texts from The Ritz-Carlton Yacht Collection marketing program. Calls may be made, and messages may be sent, using an automatic telephone dialing system. Consent is not required as a condition of purchase.
            </p>

            <div className="rcyc-form-actions rcyc-signup-actions">
              <button className="rcyc-button rcyc-button-primary" type="submit" disabled={isSubmitting || !formIsValid} aria-busy={isSubmitting}>
                {isSubmitting ? <span className="rcyc-spinner" aria-label="Creating account" /> : copy.createAccount}
              </button>
            </div>
          </form>
        </div>
      </section>
    </RcycPageShell>
  );
}

export default SignupScreen;
