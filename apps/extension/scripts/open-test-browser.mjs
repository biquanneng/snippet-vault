#!/usr/bin/env node
// SPDX-License-Identifier: MPL-2.0

import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const profilesRoot = resolve(appRoot, '.test-profiles');
const testBuildsRoot = resolve(appRoot, '.test-extension-builds');
const defaultProfileName = 'default';
const defaultFallbackUrl = 'chrome://extensions/';
const extensionPages = new Map([
  ['sidepanel', 'sidepanel.html'],
  ['extensions', defaultFallbackUrl],
]);

function parseArgs(argv) {
  const options = {
    page: 'extensions',
    loadExtension: false,
    fixedId: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const [key, inlineValue] = arg.split('=', 2);
    const nextValue = () => inlineValue ?? argv[++index];

    switch (key) {
      case '--':
        break;
      case '--name':
        options.name = nextValue();
        break;
      case '--browser':
        options.browser = nextValue();
        break;
      case '--extension-dir':
        options.extensionDir = nextValue();
        break;
      case '--url':
        options.url = nextValue();
        break;
      case '--page':
        options.page = nextValue();
        break;
      case '--load-extension':
        options.loadExtension = true;
        break;
      case '--fixed-id':
        options.fixedId = true;
        break;
      case '--no-extension':
        options.loadExtension = false;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        if (!arg.startsWith('--') && options.url === undefined) {
          options.url = arg;
        } else {
          throw new Error(`Unknown argument: ${arg}`);
        }
    }
  }

  return options;
}

function printHelp() {
  console.log(`Open a Chromium browser with an isolated SnippetVault test profile.

Usage:
  pnpm test:browser
  pnpm test:browser -- --name tooltip
  pnpm test:browser -- --load-extension
  pnpm test:browser -- --fixed-id --load-extension
  pnpm test:browser -- --page sidepanel --fixed-id --load-extension
  pnpm test:browser -- --url https://example.com --load-extension
  pnpm test:browser -- --browser "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  pnpm test:browser -- --extension-dir .output/chrome-mv3
  pnpm test:browser -- --no-extension

By default, the script reuses one profile:
  ${resolve(profilesRoot, defaultProfileName)}

Named profiles are stored under:
  ${profilesRoot}

Manual-load test extension copies are stored under:
  ${testBuildsRoot}

Opening a chrome-extension:// page requires a stable manifest key. Without one,
the script falls back to chrome://extensions/.
`);
}

function sanitizeProfileName(value) {
  return (
    value.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/^-+|-+$/g, '') ||
    defaultProfileName
  );
}

function which(command) {
  const result = spawnSync('which', [command], { encoding: 'utf8' });
  if (result.status !== 0) {
    return undefined;
  }
  return result.stdout.trim() || undefined;
}

function findBrowser() {
  const configured =
    process.env.SNIPPET_VAULT_BROWSER_PATH ||
    process.env.BROWSER_PATH ||
    process.env.CHROME_PATH;
  if (configured) {
    return configured;
  }

  const platformCandidates =
    process.platform === 'darwin'
      ? [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
          '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
          '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        ]
      : process.platform === 'win32'
        ? [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
          ]
        : [
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
            '/usr/bin/microsoft-edge',
          ];

  const existingPath = platformCandidates.find((candidate) => existsSync(candidate));
  if (existingPath) {
    return existingPath;
  }

  return (
    which('google-chrome') ||
    which('google-chrome-stable') ||
    which('chromium') ||
    which('chromium-browser') ||
    which('msedge')
  );
}

function findExtensionSourceDir(input) {
  if (input) {
    const candidate = resolve(appRoot, input);
    return existsSync(candidate) ? candidate : undefined;
  }

  return [
    resolve(appRoot, '.output/chrome-mv3-dev'),
    resolve(appRoot, '.output/chrome-mv3'),
  ].find((candidate) => existsSync(candidate));
}

function prepareKeylessTestExtension(sourceDir, profileName) {
  const targetDir = resolve(testBuildsRoot, profileName);
  rmSync(targetDir, { recursive: true, force: true });
  mkdirSync(testBuildsRoot, { recursive: true });
  cpSync(sourceDir, targetDir, { recursive: true });

  const manifestPath = resolve(targetDir, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  delete manifest.key;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return targetDir;
}

function resolveExtensionDir(input, profileName, fixedId) {
  const sourceDir = findExtensionSourceDir(input);
  if (!sourceDir || fixedId) {
    return sourceDir;
  }
  return prepareKeylessTestExtension(sourceDir, profileName);
}

function extensionIdFromKey(key) {
  const hash = createHash('sha256').update(Buffer.from(key, 'base64')).digest();
  return [...hash.subarray(0, 16)]
    .flatMap((byte) => [byte >> 4, byte & 0x0f])
    .map((value) => String.fromCharCode('a'.charCodeAt(0) + value))
    .join('');
}

function readExtensionId(extensionDir) {
  const manifestPath = resolve(extensionDir, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (!manifest.key || typeof manifest.key !== 'string') {
    return undefined;
  }
  return extensionIdFromKey(manifest.key);
}

function resolveStartUrl(options, extensionDir) {
  if (options.url) {
    return options.url;
  }

  const pagePath = extensionPages.get(options.page);
  if (!pagePath) {
    throw new Error(`Unknown page: ${options.page}. Use sidepanel or extensions.`);
  }
  if (pagePath === defaultFallbackUrl || !extensionDir) {
    const extensionId = extensionDir ? readExtensionId(extensionDir) : undefined;
    return extensionId
      ? `${defaultFallbackUrl}?id=${extensionId}`
      : defaultFallbackUrl;
  }

  const extensionId = readExtensionId(extensionDir);
  return extensionId
    ? `chrome-extension://${extensionId}/${pagePath}`
    : defaultFallbackUrl;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const browser = options.browser || findBrowser();
  if (!browser) {
    throw new Error(
      'No Chromium-compatible browser was found. Pass --browser or set SNIPPET_VAULT_BROWSER_PATH.',
    );
  }

  mkdirSync(profilesRoot, { recursive: true });
  const profileName = sanitizeProfileName(options.name || defaultProfileName);
  const profileDir = resolve(profilesRoot, profileName);
  mkdirSync(profileDir, { recursive: true });

  const extensionDir = resolveExtensionDir(
    options.extensionDir,
    profileName,
    options.fixedId,
  );
  const startUrl = resolveStartUrl(options, extensionDir);
  const args = [
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-dev-shm-usage',
  ];

  if (options.loadExtension) {
    if (extensionDir) {
      args.push(`--disable-extensions-except=${extensionDir}`);
      args.push(`--load-extension=${extensionDir}`);
    } else {
      console.warn(
        'No WXT output directory found. Run pnpm dev or pnpm build first, or pass --extension-dir.',
      );
    }
  }

  args.push(startUrl);

  const child = spawn(browser, args, {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  console.log(`Browser: ${browser}`);
  console.log(`Profile: ${profileDir}`);
  if (extensionDir) {
    console.log(`Manual load dir: ${extensionDir}`);
    console.log(
      `Extension ID: ${readExtensionId(extensionDir) || '(generated by Chrome)'}`,
    );
  }
  console.log(`URL: ${startUrl}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
