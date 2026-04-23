export function parseArray(value: any): any[] | undefined {
  if (!value || value === 'undefined' || value === 'null') return undefined;
  
  if (Array.isArray(value)) return value;

  try {
    const p = JSON.parse(typeof value === 'string' ? value.replace(/'/g, '"') : value);
    return Array.isArray(p) ? p : [p];
  } catch {
    if (typeof value === 'string') {
      return value.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [value];
  }
}

export function parseStringArray(value: any): string[] | undefined {
  const arr = parseArray(value);
  return arr?.length ? arr.map(String) : undefined;
}
