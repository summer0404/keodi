# Prompt Templates

Thư mục này chứa các mẫu prompt (AI prompt templates) được sử dụng trong dự án Keodi.

## Cấu trúc thư mục

```
shared/prompts/
├── README.md                           # Tài liệu hướng dẫn
├── index.ts                            # Export tất cả templates
├── types.ts                            # TypeScript type definitions
├── examples.ts                         # Ví dụ sử dụng (optional, có thể xóa)
└── templates/                          # Thư mục chứa các prompt templates
    ├── example-prompt-1.template.ts    # Mẫu prompt 1
    └── example-prompt-2.template.ts    # Mẫu prompt 2
```

## Best Practices

### 1. Vị trí lưu trữ
Prompt templates được lưu trong `keodi-microservice/shared/prompts/` vì:
- ✅ Có thể tái sử dụng across nhiều microservices
- ✅ Dễ dàng maintain và update
- ✅ Tuân theo clean code principles
- ✅ Tách biệt concerns rõ ràng

### 2. Naming Convention
- Tên file: `<purpose>.template.ts`
- Ví dụ: `user-story.template.ts`, `code-review.template.ts`
- Export function: camelCase (e.g., `examplePrompt1`)

### 3. Structure của một Prompt Template

```typescript
import { PromptFunction } from '../types';

interface YourPromptParams {
  // Define parameters cần thiết
  param1: string;
  param2?: number; // Optional parameters
}

export const yourPromptName: PromptFunction = (params: YourPromptParams) => {
  const { param1, param2 = defaultValue } = params;

  return `
Your prompt template here with ${param1} interpolation.
`.trim();
};

export default yourPromptName;
```

## Cách sử dụng

### Import trong một service

```typescript
// Import một prompt cụ thể
import { examplePrompt1 } from '@shared/prompts';

// Hoặc import tất cả
import * as prompts from '@shared/prompts';

// Sử dụng
const prompt = examplePrompt1({
  topic: 'Clean Code Principles',
  tone: 'professional',
  language: 'Vietnamese'
});

console.log(prompt);
```

### Tạo prompt template mới

1. Tạo file mới trong `templates/` folder:
   ```bash
   touch templates/your-prompt.template.ts
   ```

2. Implement theo structure chuẩn (xem ví dụ ở trên)

3. Export trong `index.ts`:
   ```typescript
   export { default as yourPrompt } from './templates/your-prompt.template';
   ```

## Ví dụ Prompt Templates

### Example 1: Content Generation
Dùng để generate nội dung dựa trên topic và tone.

```typescript
const prompt = examplePrompt1({
  topic: 'TypeScript Best Practices',
  tone: 'casual',
  language: 'English'
});
```

### Example 2: Text Analysis
Dùng để phân tích và tóm tắt text.

```typescript
const prompt = examplePrompt2({
  text: 'Your long text here...',
  maxLength: 150,
  focusAreas: ['key insights', 'action items']
});
```

**Xem file `examples.ts` để có thêm ví dụ chi tiết về cách sử dụng.**

## Types

### PromptFunction
```typescript
type PromptFunction = (params: Record<string, any>) => string;
```

### PromptTemplate
```typescript
interface PromptTemplate {
  name: string;
  description: string;
  template: string;
  variables: string[];
}
```

### PromptConfig
```typescript
interface PromptConfig {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}
```

## Tips

1. **Parametrize everything**: Đừng hardcode values, dùng parameters
2. **Add descriptions**: Thêm JSDoc comments để giải thích purpose
3. **Validate inputs**: Consider adding validation trong function
4. **Keep it DRY**: Tái sử dụng common patterns
5. **Version control**: Khi thay đổi prompt, consider creating new version thay vì modify existing

## Tích hợp với services

Để sử dụng prompts từ các microservices khác nhau, bạn có thể:

1. **Option 1**: Copy prompts vào service cụ thể (nếu chỉ dùng 1 service)
2. **Option 2**: Tạo shared package và import (recommended cho production)
3. **Option 3**: Sử dụng path alias trong tsconfig.json

### Cấu hình Path Alias (Recommended)

Trong `tsconfig.json` của service:
```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["../../shared/*"]
    }
  }
}
```

## Contribution Guidelines

Khi thêm prompt template mới:
1. Ensure code quality và consistency
2. Add proper TypeScript types
3. Include examples trong comments
4. Update README với usage example
5. Test thoroughly trước khi commit

## License

This is part of the Keodi project.
