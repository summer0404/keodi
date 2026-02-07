/**
 * Type definitions for AI prompt templates
 */

export interface PromptTemplate {
  name: string;
  description: string;
  template: string;
  variables: string[];
}

export interface PromptConfig {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export type PromptFunction = (params: Record<string, any>) => string;
