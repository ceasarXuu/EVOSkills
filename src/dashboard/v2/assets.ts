import { existsSync, readFileSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

interface DashboardV2DocumentResponse {
  body: string;
  hasBuild: boolean;
}

interface DashboardV2StaticAsset {
  body: Buffer;
  contentType: string;
  cacheControl: string;
}

function getDashboardV2DistRoot(): string {
  if (typeof process.env.ORNNSKILLS_DASHBOARD_V2_DIST_DIR === 'string') {
    const customRoot = process.env.ORNNSKILLS_DASHBOARD_V2_DIST_DIR.trim();
    if (customRoot.length > 0) {
      return resolve(customRoot);
    }
  }

  return resolve(fileURLToPath(new URL('../../dashboard-v2/', import.meta.url)));
}

function getContentType(filePath: string): string {
  const extension = extname(filePath).toLowerCase();
  switch (extension) {
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.html':
      return 'text/html; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.ico':
      return 'image/x-icon';
    default:
      return 'application/octet-stream';
  }
}

function getFallbackHtml(): string {
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="UTF-8"/>',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0"/>',
    '<title>OrnnSkills Dashboard V2</title>',
    '<style>',
    'body{margin:0;min-height:100vh;display:grid;place-items:center;background:#08111a;color:#ecf4ff;font-family:system-ui,sans-serif;}',
    '.panel{max-width:720px;border:1px solid rgba(255,255,255,.1);border-radius:24px;background:rgba(255,255,255,.05);padding:32px;box-shadow:0 24px 80px rgba(0,0,0,.32);}',
    '.eyebrow{font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#7dd3fc;}',
    'h1{margin:12px 0 10px;font-size:32px;line-height:1.1;}',
    'p{margin:0 0 10px;color:rgba(236,244,255,.76);line-height:1.7;}',
    'code{padding:3px 8px;border-radius:999px;background:rgba(125,211,252,.12);}',
    'a{color:#7dd3fc;text-decoration:none;}',
    '</style>',
    '</head>',
    '<body>',
    '<div class="panel">',
    '<div class="eyebrow">Dashboard V2</div>',
    '<h1>Preview build is not available yet.</h1>',
    '<p>The isolated V2 frontend has been wired, but the static bundle is missing.</p>',
    '<p>Run <code>npm run build:dashboard-v2</code> or <code>npm run build</code> in this package root, then refresh <a href="/v2">/v2</a>.</p>',
    '</div>',
    '</body>',
    '</html>',
  ].join('');
}

export function getDashboardV2DocumentResponse(): DashboardV2DocumentResponse {
  const distRoot = getDashboardV2DistRoot();
  const indexPath = resolve(distRoot, 'index.html');
  if (!existsSync(indexPath)) {
    return {
      body: getFallbackHtml(),
      hasBuild: false,
    };
  }

  return {
    body: readFileSync(indexPath, 'utf-8'),
    hasBuild: true,
  };
}

export function resolveDashboardV2StaticAsset(
  requestPath: string,
): DashboardV2StaticAsset | null {
  if (!requestPath.startsWith('/v2/')) {
    return null;
  }

  const relativePath = requestPath.slice('/v2/'.length);
  if (relativePath.length === 0) {
    return null;
  }

  const distRoot = getDashboardV2DistRoot();
  const assetPath = resolve(distRoot, relativePath);
  const normalizedRoot = `${distRoot}${sep}`;
  if (assetPath !== distRoot && !assetPath.startsWith(normalizedRoot)) {
    return null;
  }

  if (!existsSync(assetPath)) {
    return null;
  }

  return {
    body: readFileSync(assetPath),
    contentType: getContentType(assetPath),
    cacheControl: relativePath.startsWith('assets/')
      ? 'public, max-age=31536000, immutable'
      : 'no-store, no-cache, must-revalidate, max-age=0',
  };
}
