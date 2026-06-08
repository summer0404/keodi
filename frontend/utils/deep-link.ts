const APP_DOMAIN = 'keodi.vohuka.id.vn';

export const buildShareLink = (shareCode: string): string =>
  `https://${APP_DOMAIN}/join/${shareCode}`;

/**
 * Converts any deep link URL (HTTPS universal link or legacy `frontend://` custom
 * scheme) into an Expo Router-compatible path string.
 *
 * Mapping rules:
 *   https://keodi.vohuka.id.vn/app/group/session/{id}/results → /(tabs)/group/{id}
 *   https://keodi.vohuka.id.vn/app/friends(/requests)?       → /(tabs)/setting/friends
 *   https://keodi.vohuka.id.vn/app/chat/{id}                 → /chat/{id}
 *   https://keodi.vohuka.id.vn/app/place/{id}                → /place/{id}
 *   https://keodi.vohuka.id.vn/app/group?shareCode=…         → /(tabs)/group  (shareCode handled separately)
 *   https://keodi.vohuka.id.vn/join/{shareCode}              → /(tabs)/group   (shareCode handled separately)
 *   frontend://{path}                                         → same mapping as above
 */
export const resolveDeepLinkPath = (url: string | null): string | null => {
  if (!url) return null;

  let logicalPath: string;
  let search = '';

  if (url.startsWith('https://') || url.startsWith('http://')) {
    try {
      const parsed = new URL(url);
      if (!parsed.hostname.endsWith(APP_DOMAIN)) {
        // External URL – not a route we can navigate to
        return null;
      }
      // Strip the /app prefix if present
      logicalPath = parsed.pathname.replace(/^\/app/, '');
      search = parsed.search ?? '';
    } catch {
      return null;
    }
  } else if (url.startsWith('frontend://')) {
    // Legacy custom scheme: frontend://path?query → /path?query
    const withoutScheme = url.replace('frontend://', '');
    const qIdx = withoutScheme.indexOf('?');
    if (qIdx !== -1) {
      logicalPath = withoutScheme.slice(0, qIdx);
      search = withoutScheme.slice(qIdx);
    } else {
      logicalPath = withoutScheme;
    }
    if (!logicalPath.startsWith('/')) logicalPath = '/' + logicalPath;
  } else {
    // Already a plain path
    return url.startsWith('/') ? url : '/' + url;
  }

  // Normalise: ensure leading slash
  if (!logicalPath.startsWith('/')) logicalPath = '/' + logicalPath;

  // group/session/{id}/results → /(tabs)/group/{id}
  const sessionResults = logicalPath.match(/^\/group\/session\/([^/]+)\/results/);
  if (sessionResults) {
    return `/(tabs)/group/${sessionResults[1]}`;
  }

  // friends or friends/requests → /(tabs)/setting/friends
  if (logicalPath === '/friends' || logicalPath.startsWith('/friends/')) {
    return '/(tabs)/setting/friends';
  }

  // chat/{id} → /chat/{id}
  const chatMatch = logicalPath.match(/^\/chat\/(.+)/);
  if (chatMatch) {
    return `/chat/${chatMatch[1]}`;
  }

  // place/{id} → /place/{id}
  const placeMatch = logicalPath.match(/^\/place\/(.+)/);
  if (placeMatch) {
    return `/place/${placeMatch[1]}`;
  }

  // group (possibly with shareCode query) → /(tabs)/group
  if (logicalPath === '/group' || logicalPath.startsWith('/group/') || logicalPath === '/join' || logicalPath.startsWith('/join/')) {
    return '/(tabs)/group';
  }

  return logicalPath + search;
};
