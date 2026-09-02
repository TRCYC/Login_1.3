import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);
const baseUrl = process.env.ACUL_PUBLIC_BASE_URL || process.argv[2];
const clientId = '8wxI3w8yllBrMuv2OQbCuraVJI6gyf4g';

if (!baseUrl) {
  console.error('Set ACUL_PUBLIC_BASE_URL to the public HTTPS URL hosting the dist directory.');
  process.exit(1);
}

const parsedBaseUrl = new URL(baseUrl);
if (parsedBaseUrl.protocol !== 'https:') {
  console.error('ACUL_PUBLIC_BASE_URL must use HTTPS for a deployed Auth0 screen.');
  process.exit(1);
}

function findAsset(directory, prefix, extension) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      const nestedAsset = findAsset(entryPath, prefix, extension);

      if (nestedAsset) {
        return nestedAsset;
      }
    }

    if (entry.isFile() && entry.name.startsWith(prefix) && entry.name.endsWith(extension)) {
      return entryPath;
    }
  }

  return null;
}

const assetsDirectory = resolve(projectRoot, 'dist/assets');
const assetPaths = {
  script: findAsset(assetsDirectory, 'main.', '.js'),
  stylesheet: findAsset(assetsDirectory, 'style.', '.css'),
};

for (const [assetName, assetPath] of Object.entries(assetPaths)) {
  if (!assetPath || !existsSync(assetPath)) {
    console.error(`Missing ${assetName} build asset at ${assetPath}. Run npm run build first.`);
    process.exit(1);
  }
}

const sri = (assetPath) => `sha256-${createHash('sha256').update(readFileSync(assetPath)).digest('base64')}`;
const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
const assetUrl = (assetPath) => `${normalizedBaseUrl}/${assetPath.slice(resolve(projectRoot, 'dist').length + 1)}`;
const renderingConfig = {
  rendering_mode: 'advanced',
  head_tags: [
    {
      tag: 'script',
      attributes: {
        src: assetUrl(assetPaths.script),
        type: 'module',
        defer: true,
        crossorigin: 'anonymous',
        integrity: [sri(assetPaths.script)],
      },
    },
    {
      tag: 'link',
      attributes: {
        rel: 'stylesheet',
        href: assetUrl(assetPaths.stylesheet),
        crossorigin: 'anonymous',
        integrity: [sri(assetPaths.stylesheet)],
      },
    },
  ],
  default_head_tags_disabled: false,
  context_configuration: [
    'branding.settings',
    'branding.themes.default',
    'client.logo_uri',
    'client.metadata.privacy_url',
    'screen.texts',
    'tenant.friendly_name',
    'tenant.name',
    'transaction.custom_domain.domain',
    'untrusted_data.authorization_params.login_hint',
  ],
  use_page_template: false,
  filters: {
    match_type: 'includes_any',
    clients: [{ id: clientId }],
  },
};

const outputPath = resolve(projectRoot, 'config/login-rendering.generated.json');
writeFileSync(outputPath, `${JSON.stringify(renderingConfig, null, 2)}\n`);
console.log(`Generated ${outputPath}`);
console.log(`Script SRI: ${renderingConfig.head_tags[0].attributes.integrity}`);
console.log(`Stylesheet SRI: ${renderingConfig.head_tags[1].attributes.integrity}`);
