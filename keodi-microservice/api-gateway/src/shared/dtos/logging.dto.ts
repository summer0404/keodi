export interface RequestLogDto {
    type: 'REQUEST';
    requestId: string;
    method: string;
    url: string;
    ip: string;
    userAgent: string;
    userId: string | null;
    role: string | null;
    query?: Record<string, unknown>;
    params?: Record<string, unknown>;
    body?: unknown;
}

export interface ResponseLogDto {
    type: 'RESPONSE';
    requestId: string;
    method: string;
    url: string;
    statusCode: number;
    duration: string;
    userId: string | null;
    role: string | null;
    body: unknown;
}

export interface ErrorLogDto {
    type: 'RESPONSE_ERROR';
    requestId: string;
    method: string;
    url: string;
    duration: string;
    userId: string | null;
    role: string | null;
    error?: string;
    statusCode?: number;
}
