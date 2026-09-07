import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);
const requiredFiles = [
  'package.json',
  'index.html',
  'vite.config.js',
  'src/main.jsx',
  'src/App.jsx',
  'src/DevScreenManager.jsx',
  'src/ProdScreenManager.jsx',
  'src/components/RcycPageShell.jsx',
  'src/screens/login/index.jsx',
  'src/screens/signup/index.jsx',
  'src/styles.css',
  'public/manifest.json',
  'public/screens/login/login/default.json',
  'public/screens/signup/signup/default.json',
  'config/login-rendering.json',
  'config/signup-rendering.json',
  'config/custom-text-login-en.json',
];
const failures = [];

for (const relativePath of requiredFiles) {
  const filePath = resolve(projectRoot, relativePath);
  try {
    statSync(filePath);
  } catch {
    failures.push(`missing required file: ${relativePath}`);
  }
}

const read = (relativePath) => readFileSync(resolve(projectRoot, relativePath), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const manifest = JSON.parse(read('public/manifest.json'));
const renderingConfig = JSON.parse(read('config/login-rendering.json'));
const customText = JSON.parse(read('config/custom-text-login-en.json'));
const source = read('src/screens/login/index.jsx');
const signupSource = read('src/screens/signup/index.jsx');
const bootstrapSource = read('src/main.jsx');
const managerSource = `${read('src/App.jsx')}\n${read('src/DevScreenManager.jsx')}\n${read('src/ProdScreenManager.jsx')}`;
const styles = read('src/styles.css');
const generatedRenderingPath = resolve(projectRoot, 'config/login-rendering.generated.json');
const validContextPaths = new Set([
  'branding.settings',
  'branding.themes.default',
  'client.logo_uri',
  'client.metadata.privacy_url',
  'screen.texts',
  'tenant.friendly_name',
  'tenant.name',
  'transaction.custom_domain.domain',
  'country_codes',
  'untrusted_data.authorization_params.login_hint',
]);

if (packageJson.dependencies?.['@auth0/auth0-acul-react'] !== '1.7.0') {
  failures.push('ACUL React SDK must remain pinned to 1.7.0 until the screen is revalidated');
}

if (!packageJson.scripts?.['dev:login'] || !packageJson.scripts?.['dev:connected']) {
  failures.push('package scripts must provide explicit login and connected-mode commands');
}

if (!source.includes('useLogin') || !source.includes('await loginManager.login(')) {
  failures.push('login screen must submit through the bound Auth0 ACUL login manager');
}

if (source.includes('const { login } = useLogin()')) {
  failures.push('login manager methods must not be destructured because ACUL methods use their instance context');
}

if (!source.includes('resetPasswordLink') || !source.includes('signupLink')) {
  failures.push('login screen must use Auth0-provided reset and signup links');
}

if (!managerSource.includes('useUniversalLoginContextSubscription') || !managerSource.includes('window.universal_login_context')) {
  failures.push('screen managers must wait for Auth0 context before loading SDK-backed screens');
}

if (bootstrapSource.includes('@auth0/auth0-acul-react')) {
  failures.push('ACUL SDK imports must remain behind the context-aware screen boundary');
}

if (/fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|\/api\/login/i.test(source)) {
  failures.push('screen must not implement direct credential handling or browser token storage');
}

if (source.includes('ulp-remember-me')) {
  failures.push('login payload must not send the undocumented ulp-remember-me field');
}

if (!signupSource.includes('useSignup') || !signupSource.includes('await signupManager.signup(')) {
  failures.push('signup screen must submit through the bound Auth0 signup manager');
}

if (signupSource.includes('const { signup } = useSignup()')) {
  failures.push('signup manager methods must not be destructured because ACUL methods use their instance context');
}

if (/fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage/i.test(signupSource)) {
  failures.push('signup screen must not implement direct backend calls or browser storage');
}

for (const token of [
  '--rcyc-ink',
  '--rcyc-display-font',
  'Libre Caslon Text',
  'Mulish',
  '.rcyc-page-shell',
  '.rcyc-field',
  '.rcyc-button',
  '.rcyc-alert',
  '.rcyc-footer',
  '.rcyc-signup-grid',
  '.rcyc-signup-disclaimer',
  '.rcyc-marketing-preferences',
  '@media (max-width: 600px)',
  'prefers-reduced-motion',
]) {
  if (!styles.includes(token)) {
    failures.push(`missing visual/accessibility CSS token or rule: ${token}`);
  }
}

if (manifest.screens?.[0]?.login?.login?.path !== '/screens/login/login') {
  failures.push('manifest must expose the login/login context fixture');
}

if (manifest.screens?.[0]?.signup?.signup?.path !== '/screens/signup/signup') {
  failures.push('manifest must expose the signup/signup context fixture');
}

if (renderingConfig.rendering_mode !== 'advanced') {
  failures.push('rendering config must use advanced mode for ACUL');
}

if (renderingConfig.use_page_template !== false) {
  failures.push('ACUL must own the full page layout so the Standard template does not wrap it');
}

const signupRenderingConfig = JSON.parse(read('config/signup-rendering.json'));
if (signupRenderingConfig.rendering_mode !== 'advanced') {
  failures.push('signup rendering config must use advanced mode for ACUL');
}

if (signupRenderingConfig.use_page_template !== false) {
  failures.push('signup ACUL must own the full page layout so the Standard template does not wrap it');
}

if (renderingConfig.head_tags?.some((headTag) => headTag.attributes?.src?.startsWith('http://') || headTag.attributes?.href?.startsWith('http://'))) {
  failures.push('checked-in ACUL rendering template must not use HTTP asset URLs; use HTTPS CDN or tunnel URLs');
}

if (renderingConfig.filters?.clients?.[0]?.id !== 'REPLACE_WITH_AUTH0_CLIENT_ID') {
  failures.push('rendering config template must require an environment-specific Auth0 client ID');
}

if (signupRenderingConfig.filters?.clients?.[0]?.id !== 'REPLACE_WITH_AUTH0_CLIENT_ID') {
  failures.push('signup rendering config template must require an environment-specific Auth0 client ID');
}

for (const contextPath of renderingConfig.context_configuration || []) {
  if (!validContextPaths.has(contextPath)) {
    failures.push(`invalid Auth0 context_configuration path: ${contextPath}`);
  }
}

if (existsSync(generatedRenderingPath)) {
  for (const generatedPath of [
    generatedRenderingPath,
    resolve(projectRoot, 'config/signup-rendering.generated.json'),
  ]) {
    if (!existsSync(generatedPath)) continue;
    const generatedRenderingConfig = JSON.parse(readFileSync(generatedPath, 'utf8'));
    for (const contextPath of generatedRenderingConfig.context_configuration || []) {
      if (!validContextPaths.has(contextPath)) {
        failures.push(`invalid generated Auth0 context_configuration path: ${contextPath}`);
      }
    }
    for (const headTag of generatedRenderingConfig.head_tags || []) {
      const integrity = headTag.attributes?.integrity;
      if (!Array.isArray(integrity) || integrity.length === 0 || integrity.some((hash) => !/^sha(256|384|512)-\S+$/.test(hash))) {
        failures.push('generated rendering config must contain SRI hashes as an array');
      }
    }
  }
}

if (customText.login?.title !== 'SIGN IN TO YOUR ACCOUNT' || customText.login?.buttonText !== 'SIGN IN') {
  failures.push('custom text must contain the RCYC login copy');
}

if (statSync(resolve(projectRoot, 'src/styles.css')).size > 100 * 1024) {
  failures.push('screen stylesheet exceeds the 100 KB Auth0 asset limit');
}

if (failures.length) {
  console.error('ACUL validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('ACUL project structure and safety checks passed');
}
