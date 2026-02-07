import { PromptFunction } from '../types';

/**
 * Example Prompt Template 2
 * Description: A template for analyzing and summarizing text
 */

interface Prompt2Params {
  text: string;
  maxLength?: number;
  focusAreas?: string[];
}

export const examplePrompt2: PromptFunction = (params: Prompt2Params) => {
  const { text, maxLength = 200, focusAreas = [] } = params;

  const focusSection = focusAreas.length > 0
    ? `\nFocus particularly on these areas:\n${focusAreas.map((area) => `- ${area}`).join('\n')}`
    : '';

  return `
You are an expert at analyzing and summarizing text content.

Task: Analyze and summarize the following text.

Text to analyze:
"""
${text}
"""

Requirements:
- Maximum summary length: ${maxLength} words
- Extract key insights and main points
- Use clear and concise language${focusSection}

Please provide the summary now.
`.trim();
};

export default examplePrompt2;
