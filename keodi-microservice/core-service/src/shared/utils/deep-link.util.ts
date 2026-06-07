/**
 * Generates deep/universal links using the configured APP_DOMAIN.
 * These links support both universal links (iOS) and app links (Android),
 * allowing the mobile app to handle them directly when installed.
 */

function getAppDomain(): string {
  const domain = process.env.APP_DOMAIN;
  if (!domain) {
    throw new Error('APP_DOMAIN is not configured in environment variables');
  }
  return domain.replace(/\/$/, '');
}

export function buildDeepLink(path: string): string {
  const base = getAppDomain();
  return `${base}/app/${path.replace(/^\//, '')}`;
}

export function buildShareLink(shareCode: string): string {
  const base = getAppDomain();
  return `${base}/join/${shareCode}`;
}
