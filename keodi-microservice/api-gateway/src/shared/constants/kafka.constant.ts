export const KAFKA_TIMEOUT_MS = 5000;

// LLM agent endpoints are slow (multi-step reasoning + tool calls)
export const AGENT_KAFKA_TIMEOUT_MS = KAFKA_TIMEOUT_MS + 55_000; // 60s total
