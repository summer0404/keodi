export function parseStringArray(value: unknown): string[] | undefined {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) {
            return undefined;
        }

        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        } catch {
            return trimmed
                .split(',')
                .map((item) => item.trim())
                .filter((item) => !!item);
        }
    }

    return undefined;
}

export function parseArray(value: unknown): unknown[] | undefined {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) {
            return undefined;
        }

        try {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed) ? parsed : (value as unknown[]);
        } catch {
            return value as unknown[];
        }
    }

    return undefined;
}