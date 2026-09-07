# RCYC Auth0 Advanced Customization

This project is the ACUL implementation for the `login` and `signup` screens of:

```text
Application: RCYC Web Guest Login - Local
Client ID: 8wxI3w8yllBrMuv2OQbCuraVJI6gyf4g
Tenant: dev-t63fs8uohee0yl4k.us.auth0.com
Custom domain: auth-local.ritzcarltonyachtcollection.com
```

It exists separately from `Web/auth0/universal-login-template.html` because the Standard Universal Login widget cannot reproduce the Figma layout. This ACUL screen owns the form markup, field validation presentation, button layout, responsive behavior, and legal footer while the Auth0 ACUL SDK owns credential submission and transaction navigation.

## Project files

- `src/main.jsx`: minimal React bootstrap that is safe before Auth0 context exists.
- `src/App.jsx`: selects the Context Inspector or production screen manager.
- `src/DevScreenManager.jsx`: waits for local Context Inspector data before loading the login SDK.
- `src/ProdScreenManager.jsx`: waits for the Auth0 page context before loading the login screen.
- `src/components/RcycPageShell.jsx`: shared RCYC page shell, header, alert, and field primitives for login, signup, and reset screens.
- `src/screens/login/index.jsx`: Auth0 `login` screen and SDK-backed form behavior.
- `src/screens/signup/index.jsx`: Auth0 `signup` screen, client-side validation, marketing preferences, and SDK-backed account creation.
- `src/styles.css`: shared RCYC typography, form controls, buttons, footer, responsive, and accessibility styling.
- `public/manifest.json`: Universal Login Context Inspector screen map.
- `public/screens/login/login/default.json`: sanitized Local-app preview context.
- `public/screens/signup/signup/default.json`: sanitized Local-app signup preview context.
- `config/login-rendering.json`: deployable rendering configuration template with placeholders.
- `config/signup-rendering.json`: deployable signup rendering configuration template with placeholders.
- `config/custom-text-login-en.json`: desired English login copy for the Custom Text API.
- `scripts/generate-rendering-config.mjs`: generates SRI hashes after a production build.
- `scripts/validate-acul.mjs`: checks project structure, screen hooks, Local-app filter, and unsafe code.

## Local development

Requirements: Node.js 20 or later, npm, and the Auth0 CLI.

```sh
cd /home/laureano/Code/Rcyc/auth0-acul
npm install
npm run validate
npm run build
```

For the Auth0 Universal Login Context Inspector, use the Local tenant and run:

```sh
auth0 acul dev \
  --tenant dev-t63fs8uohee0yl4k.us.auth0.com \
  --dir /home/laureano/Code/Rcyc/auth0-acul \
  --port 55444 \
  --screens login
```

The active project directory is `/home/laureano/Code/Rcyc/auth0-acul`. Run the command from that directory, or use the project shortcut:

```sh
cd /home/laureano/Code/Rcyc/auth0-acul
npm run dev:login
```

Keep `--screens login` in the command. If the screen filter is omitted, the Auth0 CLI can open the default `login-id` screen from the global ACUL manifest instead of this project's `login / login` screen.

Use the inspector's local context source and select either the `login` or `signup` screen. The fixtures under `public/screens/login/login/default.json` and `public/screens/signup/signup/default.json` represent the Local application. The Auth0 tenant configuration remains authoritative for whether each flow is available.

For signup, use the `--screens signup` CLI option or the `npm run dev:signup` shortcut.

The entry point first loads the Context Inspector manager and only loads `@auth0/auth0-acul-react/login` after `window.universal_login_context` is available. This ordering is required by the ACUL SDK. If a browser tab from an earlier build is blank, close it and restart the command so the latest assets are served.

### Login behavior

The login screen calls the ACUL manager as an object (`loginManager.login(...)`). The method must remain bound to its manager because the SDK reads the active transaction from `this.transaction`.

The Remember Me checkbox is retained for the approved RCYC layout, but it is intentionally not sent in the login payload. ACUL 1.7.0 documents `rememberDevice` for MFA/device-challenge screens, not a login-level Remember Me option. The page does not store passwords, Auth0 tokens, or a remembered-email value; Auth0 controls the authentication-session lifetime. Do not add undocumented fields such as `ulp-remember-me` unless Auth0 provides and the team approves a supported login contract.

Auth0 owns navigation after login submission, browser refresh, back navigation, and transaction expiry. The page preserves Auth0-provided reset/signup links and displays a safe retry message for internal runtime errors. Expired transaction errors expose a Refresh action so the browser can request a fresh Auth0 context.

The local Context Inspector works without a tenant. The CLI connected-mode server uses `http://localhost:55444`, but the real Auth0 authorization page is HTTPS; browsers block those injected module scripts as mixed content. Therefore a white page in the real authorization flow is expected with direct connected mode in normal browsers. Use an HTTPS tunnel for live integration testing, or use the permanent public CDN flow below. Do not disable browser security as a workaround.

## Build and publish assets

ACUL assets must be served from a public HTTPS origin. Publish these build outputs to the same public path:

```text
dist/assets/rcyc-login.js
dist/assets/rcyc-login.css
```

The CDN must return `200`, preserve the JavaScript/CSS content types, enable CORS for the Auth0 custom domain, and serve immutable versioned content. Do not use `file://`, `localhost`, a VPN-only URL, or a private filesystem path.

After publishing, generate the rendering configurations for both screens:

```sh
ACUL_PUBLIC_BASE_URL='https://PUBLIC-CDN.example.com/rcyc-auth0-acul' \
AUTH0_CLIENT_ID='AUTH0_APPLICATION_CLIENT_ID' \
  npm run build:rendering
```

The command writes `config/login-rendering.generated.json` and `config/signup-rendering.generated.json`. Both are ignored because they contain environment-specific asset URLs, client filters, and generated hashes. Review them before deployment. The Auth0 configs use the selected application's client filter and `use_page_template: false` so this ACUL bundle owns the whole page instead of being wrapped by the Standard template.

### Environment-aware GitHub Actions update

`.github/workflows/deploy-pages.yml` can update a selected Auth0 tenant after a successful GitHub Pages deployment. It maps branches as follows:

- `local` → `auth0-local`
- `development` → `auth0-development`
- `staging` → `auth0-staging`
- `master` → `auth0-production`

The workflow can also be started manually with `workflow_dispatch` and an explicit target environment. Create the four GitHub Environments and configure these environment variables in each one:

- `AUTH0_TENANT_DOMAIN`
- `AUTH0_CLIENT_ID`
- `ACUL_PUBLIC_BASE_URL`

The Pages deployment job separately targets GitHub's required `github-pages` environment. The Auth0 configuration job then targets the selected `auth0-local`, `auth0-development`, `auth0-staging`, or `auth0-production` environment.

Create an Auth0 machine-to-machine application for each tenant, authorize it for that tenant's Auth0 Management API with `read:prompts` and `update:prompts`, then add these as **environment secrets** in the matching GitHub Environment:

- `AUTH0_MGMT_CLIENT_ID`
- `AUTH0_MGMT_CLIENT_SECRET`

No branch protection is required by this workflow. A push to `local`, `development`, `staging`, or `master` automatically deploys to the corresponding Auth0 environment. The `workflow_dispatch` input remains available when a deployment needs to be rerun or when an environment must be selected explicitly.

The workflow builds the shared bundle once, deploys Pages, generates environment-specific configurations for `login/login` and `signup/signup`, and only then patches the selected tenant. A missing environment variable or invalid secret causes the workflow to fail before changing Auth0.

Before publishing, the workflow also carries forward the previous commit's hashed assets. This keeps the currently configured Auth0 bundle available while the Pages deployment and Management API update are completing, and provides a one-version rollback buffer if the Auth0 update fails.

If the Auth0 update step returns `401`, the Pages site has still deployed successfully; only the Management API update was rejected. Check that the selected `auth0-*` environment secrets belong to an Auth0 Machine-to-Machine application authorized for that tenant's Auth0 Management API, that the grant includes `read:prompts` and `update:prompts`, and that the token audience and API request use the same default tenant domain. The workflow uses the documented form-encoded client-credentials request and prints Auth0's sanitized JSON error body on failure.

The generated JavaScript entry is `dist/assets/main.<hash>.js` and the generated stylesheet is `dist/assets/shared/style.<hash>.css`. Upload every file under `dist/assets`, including the shared chunks, `login/index.<hash>.js`, and `signup/index.<hash>.js`, preserving the directory structure. The checked-in rendering JSON files are placeholder templates; never apply them before replacing the public URL, filename hashes, client filter, and SRI values.

Each Auth0 environment must use an immutable public asset URL, such as an environment-specific CDN path or versioned release path. Do not let a development deployment delete assets still referenced by staging or production. GitHub Pages is suitable for a single shared development target; a CDN or separate immutable public paths are recommended before promoting this workflow to multiple tenants.

### GitHub Pages

This repository includes `.github/workflows/deploy-pages.yml`. It builds and publishes the complete `dist` directory when a mapped branch changes or when a deployment is started manually. To enable it in GitHub, open `Settings > Pages` and select `GitHub Actions` as the source. The site URL will be:

```text
https://TRCYC.github.io/Login_1.3/
```

Verify that the Actions deployment has completed before generating the Auth0 rendering configuration. Use the Pages URL as `ACUL_PUBLIC_BASE_URL` without a trailing slash for the single shared development target:

```sh
ACUL_PUBLIC_BASE_URL='https://TRCYC.github.io/Login_1.3' \
  npm run build:rendering
```

The GitHub Pages site is public HTTPS hosting for the ACUL assets. The GitHub Actions workflow can update Auth0 automatically after the Pages deployment; for a manual deployment, apply both generated rendering configurations as described below.

## Deploy to the Local tenant

Only use connected mode on the Local/development tenant. It changes live Auth0 rendering settings.

```sh
auth0 acul config set login \
  --tenant dev-t63fs8uohee0yl4k.us.auth0.com \
  --file config/login-rendering.generated.json

auth0 acul config set signup \
  --tenant dev-t63fs8uohee0yl4k.us.auth0.com \
  --file config/signup-rendering.generated.json
```

For temporary live integration testing against the development tenant, use the project shortcut instead of manually composing the command:

```sh
cd /home/laureano/Code/Rcyc/auth0-acul
npm run dev:connected
```

Direct connected mode is useful for checking that the CLI can patch the tenant, but its `http://localhost` asset URLs are blocked by normal browsers on the HTTPS Auth0 page. For browser testing, serve `dist` with CORS and expose that server through an HTTPS tunnel:

```sh
cd /home/laureano/Code/Rcyc/auth0-acul
npx serve dist -p 55444 --cors
```

In another terminal, start an HTTPS tunnel to port `55444`, for example with Cloudflare Tunnel:

```sh
cloudflared tunnel --url http://localhost:55444
```

Copy the generated `https://...trycloudflare.com` URL and generate a rendering config from it:

```sh
cd /home/laureano/Code/Rcyc/auth0-acul
ACUL_PUBLIC_BASE_URL='https://YOUR-TUNNEL.trycloudflare.com' npm run build:rendering
auth0 acul config set login \
  --tenant dev-t63fs8uohee0yl4k.us.auth0.com \
  --file config/login-rendering.generated.json

auth0 acul config set signup \
  --tenant dev-t63fs8uohee0yl4k.us.auth0.com \
  --file config/signup-rendering.generated.json
```

The generated configuration keeps the Local client filter and includes SRI hashes. Keep both the asset server and HTTPS tunnel running while testing. When either process stops, immediately restore Standard rendering so Auth0 does not point to a dead development URL:

```sh
auth0 acul config set login \
  --tenant dev-t63fs8uohee0yl4k.us.auth0.com \
  --file config/login-rendering.standard.json
```

The Management API equivalent is `PATCH /api/v2/prompts/login/screen/login/rendering`. The Management API token must have `read:prompts` and `update:prompts`. The Auth0 CLI session or token must target the exact tenant domain shown above.

Publish the Custom Text payload separately through the Auth0 Dashboard or Management API for the `login` prompt in English. The payload is in `config/custom-text-login-en.json`; it does not contain secrets.

## Auth0 settings required for the Local app

In **Applications > Applications > RCYC Web Guest Login - Local > Connections**:

- Enable `rcyc-reservation-staging`.
- Disable `rcyc-reservation-production`.
- Disable `Username-Password-Authentication`.
- Disable `google-oauth2`.

In **Branding > Universal Login > Customize authentication screens**:

- Select the `login` and `signup` screens.
- Select **Advanced mode** for both screens.
- Add the generated JavaScript and stylesheet head tags, including their SRI hashes, to each screen.
- Select the additional context values listed in the corresponding generated rendering configuration.
- Do not enable **Use custom page template** for either ACUL screen.
- Save and publish.

The existing Standard page template remains available as a fallback for screens not filtered to the Local client. It is not part of the ACUL rendering path.

## Verification

1. Start a fresh authorization request from the Local Web application, not the old Seaware POC client.
2. Confirm the Auth0 context identifies client `8wxI3w8yllBrMuv2OQbCuraVJI6gyf4g`.
3. Confirm the page uses `auth-local.ritzcarltonyachtcollection.com`.
4. Compare desktop and mobile screenshots against the Figma reference.
5. Verify empty email, invalid email, empty password, invalid credentials, loading, reset-password, and signup states.
6. Confirm the sign-in button calls the ACUL SDK and does not post credentials to a Web endpoint.
7. Confirm the browser does not show Google or another alternate connection.
8. Confirm no horizontal overflow, visible keyboard focus, readable error text, and reduced-motion behavior.

Keep the previous rendering configuration and asset version before each deployment. Roll back by restoring the previous rendering JSON and public asset URLs. Do not switch the Local tenant to a tenant-wide advanced configuration without a backup and review.

To immediately restore the login screen after a stopped connected-mode session, apply `config/login-rendering.standard.json`:

```sh
auth0 acul config set login \
  --tenant dev-t63fs8uohee0yl4k.us.auth0.com \
  --file config/login-rendering.standard.json
```
