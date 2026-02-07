import { PromptFunction } from '../types';

/**
 * Example Prompt Template 1
 * Description: A template for generating text based on user input
 */

interface Prompt1Params {
  topic: string;
  tone?: 'formal' | 'casual' | 'professional';
  language?: string;
}

export const examplePrompt1: PromptFunction = (params: Prompt1Params) => {
  const { topic, tone = 'professional', language = 'Vietnamese' } = params;

  return `
You are a helpful assistant that generates content in ${language}.

Task: Create content about the following topic with a ${tone} tone.

Topic: ${topic}

Instructions:
- Use clear and concise language
- Maintain a ${tone} tone throughout
- Ensure the content is informative and engaging
- Format the response in a structured manner

Please generate the content now.
`.trim();
};

export default examplePrompt1;
