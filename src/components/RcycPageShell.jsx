import React from 'react';

export const FALLBACK_LOGO = 'https://www.ritzcarltonyachtcollection.com/assets/components/images/logo.svg';
export const FALLBACK_PRIVACY_URL = 'https://www.ritzcarltonyachtcollection.com/legal/privacy-policy';

export const RCYC_LEGAL_COPY = "Yacht OpCo Limited d/b/a The Ritz-Carlton Yacht Collection uses The Ritz-Carlton marks under license from The Ritz-Carlton Hotel Company, L.L.C. and is not an affiliate of The Ritz-Carlton Hotel Company, L.L.C. or Marriott International, Inc. Renderings are artistic concepts. Any specifications in this depiction may change at The Ritz-Carlton Yacht Collection's sole discretion without notice. The features, plans, itineraries, offerings and specifications described above are proposed only, and The Ritz-Carlton Yacht Collection reserves the right to modify, revise or withdraw any or all of the same in its sole discretion and without prior notice. Guest's and related travel will be governed by the terms and conditions of the Ticket Contract in effect at the time of booking. The terms of the Ticket Contract will supersede any other representations or statements whether oral or written. The Ritz-Carlton Yacht Collection recognizes the importance of ensuring that our website is accessible to those with disabilities. This website is currently in development. This website endeavors to achieve &ldquo;Level AA&rdquo; WCAG 2.0 compliance. A passport is required to board the Vessel, regardless of itinerary. Yacht's registry: Malta";

export function RcycPageShell({
  children,
  labelledBy,
  privacyUrl = FALLBACK_PRIVACY_URL,
  legalCopy = RCYC_LEGAL_COPY,
}) {
  return (
    <div className="rcyc-page-shell">
      <main className="rcyc-page-main" aria-labelledby={labelledBy}>
        {children}
      </main>

      <footer className="rcyc-footer">
        <div className="rcyc-footer-topline">
          <p>&copy; {new Date().getFullYear()} The Ritz-Carlton Yacht Collection. All Rights Reserved.</p>
          <a href={privacyUrl}>Your privacy rights</a>
        </div>
        <p>{legalCopy}</p>
      </footer>
    </div>
  );
}

export function RcycAuthHeader({
  logoUrl = FALLBACK_LOGO,
  logoAlt = 'The Ritz-Carlton Yacht Collection',
  title,
  titleId = 'rcyc-page-title',
}) {
  return (
    <header className="rcyc-auth-header">
      <img className="rcyc-logo" src={logoUrl} alt={logoAlt} />
      <h1 id={titleId}>{title}</h1>
    </header>
  );
}

export function RcycAlert({
  children,
  id = 'rcyc-page-alert',
  action,
}) {
  return (
    <div id={id} className="rcyc-alert" role="alert" aria-live="assertive" aria-atomic="true">
      <span>{children}</span>
      {action && <span className="rcyc-alert-action">{action}</span>}
    </div>
  );
}

export function RcycField({ id, label, error, children }) {
  const errorId = `${id}-error`;

  return (
    <div className={`rcyc-field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <span id={errorId} className="rcyc-field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
