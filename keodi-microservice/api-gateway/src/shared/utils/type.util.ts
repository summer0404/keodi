export function parseArray(value: any): any[] | undefined {
  if (!value || value === 'undefined' || value === 'null') return undefined;

  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    const normalized = value.trim().replace(/'/g, '"');
    try {
      const p = JSON.parse(normalized);
      return Array.isArray(p) ? p : [p];
    } catch {
      try {
        const p = JSON.parse(`[${normalized}]`);
        return Array.isArray(p) ? p : [p];
      } catch {
        return normalized.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
  }

  return [value];
}

export function parseStringArray(value: any): string[] | undefined {
  const arr = parseArray(value);
  return arr?.length ? arr.map(String) : undefined;
}
