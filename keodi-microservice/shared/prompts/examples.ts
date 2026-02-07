/**
 * Usage Examples for Prompt Templates
 * 
 * This file demonstrates how to use the prompt templates in your services.
 * You can delete this file if not needed - it's just for reference.
 */

import { examplePrompt1, examplePrompt2 } from './index';

// Example 1: Content Generation
console.log('=== Example 1: Content Generation ===\n');
const contentPrompt = examplePrompt1({
  topic: 'Best practices cho microservice architecture',
  tone: 'professional',
  language: 'Vietnamese'
});
console.log(contentPrompt);

console.log('\n\n=== Example 2: Text Analysis ===\n');
const analysisPrompt = examplePrompt2({
  text: 'Microservices là một kiến trúc phần mềm cho phép xây dựng ứng dụng dưới dạng tập hợp các dịch vụ nhỏ, độc lập. Mỗi service có thể được develop, deploy và scale riêng biệt.',
  maxLength: 50,
  focusAreas: ['benefits', 'key characteristics']
});
console.log(analysisPrompt);

// You can also use with custom parameters
console.log('\n\n=== Example 3: Custom Parameters ===\n');
const customPrompt = examplePrompt1({
  topic: 'TypeScript vs JavaScript',
  tone: 'casual',
  language: 'English'
});
console.log(customPrompt);
