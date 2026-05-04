# Kế hoạch nâng cấp Search với RAG + LLM Agent

> **Nhánh:** `KEODI-156-AI-RAG-in-Search`  
> **Mục tiêu:** Giải quyết bài toán tìm kiếm trừu tượng / cảm xúc mà hệ thống hiện tại không đáp ứng được, đồng thời tạo nền tảng cho tính năng thu phí sau này.

---

## 1. Vấn đề hiện tại

### Luồng search hiện tại

```
User query
  → LLM: extract keyword (e.g. "cà phê", "phở")
  → Embedding: tạo vector 384-dim
  → PostgreSQL: FTS hoặc pgvector similarity >= 0.5
  → Kết quả
```

### Tại sao thất bại với truy vấn trừu tượng?

| Query | LLM extract | Embedding similarity | Kết quả |
|---|---|---|---|
| "quán cà phê yên tĩnh" | `cà phê` | cao (place có embedding liên quan) | ✅ tốt |
| "quán nhậu bình dân gần đây" | `quán nhậu` | cao | ✅ tốt |
| **"tôi đang buồn, muốn giải khuây"** | `""` (empty) | thấp (không có nơi nào "giải khuây" trong embedding) | ❌ rỗng |
| **"chỗ nào phù hợp hẹn hò lãng mạn?"** | `""` | thấp | ❌ rỗng |
| **"nơi để suy nghĩ một mình"** | `""` | thấp | ❌ rỗng |

**Nguyên nhân cốt lõi:**
- LLM prompt hiện tại chỉ extract **danh từ cụ thể** (tên món ăn, tên địa điểm), không xử lý **ý định cảm xúc / trừu tượng**.
- Vector embedding của địa điểm được xây dựng từ tên + mô tả, không encode được "mood" hay "use-case".
- Không có bước nào kết nối "cảm xúc người dùng" → "loại địa điểm phù hợp".

---

## 2. Kiến trúc đề xuất

### 2 chiến lược song song

```
User query
  │
  ▼
[Query Classifier] ─── Specific query? ──→ Luồng cũ (nhanh, rẻ)
  │
  └─── Abstract / emotional query?
         │
         ▼
    [Contextual Expander] ← RAG từ Category + Attribute DB
         │
         ├─ Suggested categories (vd: BAR, CAFE, PARK)
         ├─ Suggested attributes (vd: "quiet", "social", "outdoor")
         └─ Expanded embedding query (chuỗi ngữ nghĩa phong phú hơn)
         │
         ▼
    [Personalization Injector] ← User preferences (attributes, categories)
         │
         ▼
    [Vector + Category Search] (PostgreSQL + pgvector)
         │
         ▼
    Kết quả + giải thích (vd: "Chúng tôi tìm thấy những nơi vui vẻ, náo nhiệt phù hợp để giải khuây")
```

> **Tính năng premium (Phase 3):** Thay Contextual Expander bằng LLM Agent có tool-calling — agent tự gọi tool lấy user profile, lịch sử, search địa điểm, rồi trả về câu trả lời hội thoại.

---

## 3. Các phase thực hiện

### Phase 1 — Smart Intent Extraction (Nền tảng)
**Mức độ khó:** Vừa phải | **Ưu tiên:** Cao nhất

Nâng cấp `ExtractUserIntent` trả về thêm `intent_type` và `expanded_query`:

```python
# Trước (hiện tại)
{ "keywords": "cà phê", "embedding": [...] }

# Sau (Phase 1)
{
  "keywords": "cà phê",          # vẫn giữ
  "embedding": [...],            # embedding của expanded_query (không phải raw query)
  "intent_type": "specific" | "abstract" | "emotional",
  "expanded_query": "yên tĩnh cafe để học bài làm việc tập trung"   # LLM viết lại
}
```

**Cách hoạt động:**
1. LLM nhận raw query.
2. Nếu query là cụ thể → trả về như cũ.
3. Nếu query trừu tượng → LLM **viết lại** thành mô tả địa điểm phù hợp bằng tiếng Việt.
4. Embedding được tạo từ `expanded_query`, không phải raw query nữa.
5. Ngưỡng similarity được hạ xuống (ví dụ 0.4) khi `intent_type = abstract`.

**Ưu điểm:**
- Không cần thêm infrastructure.
- Tận dụng hoàn toàn hệ thống pgvector sẵn có.
- Embedding của "nơi vui vẻ náo nhiệt để giải khuây bạn bè" sẽ khớp tốt hơn với embedding của bar, pub, karaoke.

**Files cần thay đổi:**

| File | Thay đổi |
|---|---|
| `intelligence-service/app/prompts/prompt.py` | Thêm prompt `SMART_INTENT_EXTRACTION` xử lý cả 2 loại query |
| `intelligence-service/app/services/llm/llm_service.py` | Thêm method `extract_smart_intent()` |
| `intelligence-service/app/kafka/handler.py` | Cập nhật handler `extract_user_intent` trả về thêm trường |
| `core-service/src/shared/types/search.type.ts` | Thêm `intent_type`, `expanded_query` vào `ExtractedIntent` |
| `core-service/src/modules/place/place.service.ts` | Hạ threshold khi `intent_type === 'abstract'` |
| `core-service/src/shared/constants/search.constant.ts` | Thêm `ABSTRACT_VECTOR_SIMILARITY_THRESHOLD = 0.4` |

---

### Phase 2 — RAG với Category & Attribute Knowledge Base
**Mức độ khó:** Vừa-cao | **Ưu tiên:** Cao

Xây dựng bước RAG thật sự: khi query trừu tượng, tra cứu các **Category** và **Attribute** phù hợp từ DB, inject vào context của LLM để nó expand query chính xác hơn.

#### 2a. Pre-processing: Embed categories và attributes

```
Lúc khởi động service (hoặc admin trigger):
  → Load tất cả Category (name + description) từ DB
  → Load tất cả Attribute (name + description) từ DB
  → Tạo embedding cho từng item
  → Lưu vào in-memory dict hoặc Redis
```

#### 2b. RAG Retrieval khi search

```
User query: "tôi đang buồn muốn giải khuây"
  │
  ▼
Embed query → vector
  │
  ▼
Similarity search trên Category embeddings
  → ["Entertainment", "Bar & Lounge", "Night Club", "Park"]
  │
  ▼
Similarity search trên Attribute embeddings
  → ["lively", "social", "fun", "outdoor", "music"]
  │
  ▼
LLM nhận: query + retrieved categories + retrieved attributes
  → Expand query: "địa điểm vui vẻ náo nhiệt nhộn nhịp để giải khuây bạn bè bar pub karaoke công viên"
  │
  ▼
Embed expanded_query → dùng cho pgvector search
```

#### 2c. Bổ sung filter trong SQL

Khi có `suggested_category_ids` từ RAG, thêm optional filter vào query:

```sql
-- Hiện tại: filter theo status PUBLISHED
-- Phase 2 thêm: BOOST nếu place thuộc suggested categories
-- (không FILTER cứng để không mất kết quả)
```

Thực hiện bằng cách thêm `categoryBoostScore` vào SELECT để dùng trong ORDER BY.

**Files cần thay đổi:**

| File | Thay đổi |
|---|---|
| `intelligence-service/app/services/rag/` | Tạo mới `rag_service.py` — load, embed, retrieve categories/attributes |
| `intelligence-service/app/repositories/category_repository.py` | Thêm method `get_all_with_description()` |
| `intelligence-service/app/repositories/attribute_repository.py` | Thêm method `get_all_with_description()` |
| `intelligence-service/app/kafka/handler.py` | Inject RAG context vào LLM call |
| `intelligence-service/app/main.py` | Warm up RAG service khi startup |
| `core-service` | Nhận thêm `suggested_category_ids` từ intent, truyền vào SQL |

---

### Phase 3 — LLM Agent với Tool Calling (Tính năng Premium)
**Mức độ khó:** Cao | **Ưu tiên:** Trung bình (sau 2 phase trên)

Đây là tính năng tạo ra sự khác biệt lớn nhất cho đồ án và tạo nền tảng thu phí.

#### Kiến trúc Agent

```
User: "Tôi vừa chia tay, muốn đi đâu đó để quên chuyện buồn, không muốn ở một mình"

LLM Agent
  ├── Tool: get_user_profile(user_id)
  │     → { preferred_categories: ["Cafe", "Bar"], attributes: ["social", "music"] }
  │
  ├── Tool: get_user_recent_history(user_id, limit=5)
  │     → [{ place: "The Coffee House", category: "Cafe" }, ...]
  │
  ├── Tool: search_places(query="địa điểm vui vẻ náo nhiệt bạn bè", lat, lng, radius)
  │     → [{ id, name, category, rating, distance, attributes }, ...]
  │
  └── LLM synthesizes → Final response
        {
          "places": [...],
          "message": "Tôi thấy bạn thích những nơi có không khí sôi động. Đây là vài gợi ý...",
          "reasoning": "Dựa trên sở thích của bạn và yêu cầu muốn có bạn bè xung quanh..."
        }
```

#### Tools cần implement (Groq / OpenAI tool-use format)

```python
tools = [
    {
        "name": "get_user_profile",
        "description": "Lấy sở thích và lịch sử của người dùng",
        "parameters": { "user_id": "string" }
    },
    {
        "name": "search_places", 
        "description": "Tìm địa điểm theo query ngữ nghĩa, category, attribute",
        "parameters": {
            "query": "string",
            "category_names": ["string"],  # optional
            "attribute_names": ["string"],  # optional
            "latitude": "float",
            "longitude": "float",
            "radius_km": "float"
        }
    },
    {
        "name": "get_place_details",
        "description": "Lấy thông tin chi tiết về một địa điểm cụ thể",
        "parameters": { "place_id": "string" }
    }
]
```

#### Kafka topic mới

```
intelligence.agent-search          (request)
intelligence.agent-search.reply    (response)
```

#### API endpoint mới (Premium)

```
POST /places/chat-search
Body: {
  "message": "Tôi đang buồn...",
  "latitude": 10.76,
  "longitude": 106.67,
  "conversationId": "uuid"  # optional, để maintain context
}

Response: {
  "places": [...],
  "message": "Dựa trên...",
  "intent": "emotional_comfort"
}
```

**Files cần thay đổi:**

| File | Thay đổi |
|---|---|
| `intelligence-service/app/services/agent/` | Tạo mới `agent_service.py` — LLM agent loop với tool execution |
| `intelligence-service/app/services/agent/tools.py` | Implement các tool functions |
| `intelligence-service/app/kafka/handler.py` | Thêm handler `agent_search` |
| `intelligence-service/app/kafka/topic.py` | Thêm topics mới |
| `api-gateway/src/modules/place/place.controller.ts` | Thêm `POST /places/chat-search` |
| `api-gateway/src/modules/place/place.service.ts` | Thêm `chatSearch()` method |
| `api-gateway/src/shared/dtos/place.dto.ts` | Thêm `ChatSearchDto`, `ChatSearchResponseDto` |
| `core-service/src/shared/constants/topic.constant.ts` | Thêm agent topics |

---

## 4. Schema & Data Model bổ sung

### Category phải có `description` (nếu chưa có)

Cần chắc chắn rằng bảng Category trong Prisma schema có trường `description` để RAG hoạt động tốt:

```prisma
model Category {
  id          String  @id @default(cuid())
  name        String
  description String?   // ← quan trọng cho RAG
  // ...
}
```

Tương tự với Attribute. Nếu chưa có → migration cần thiết.

### Embedding cho Category/Attribute (in-memory, không cần lưu DB)

Không cần thêm cột vector vào Category/Attribute. RAG service load lúc startup, embed vào memory:

```python
# rag_service.py
class RAGService:
    category_vectors: dict[str, list[float]]   # category_id → embedding
    attribute_vectors: dict[str, list[float]]  # attribute_id → embedding
    
    async def warm_up(self):
        categories = await self.category_repo.get_all_with_description()
        for cat in categories:
            text = f"{cat.name}: {cat.description or cat.name}"
            self.category_vectors[cat.id] = self.embedding_service.embed(text)
```

---

## 5. Thứ tự ưu tiên và timeline

```
Tuần 1-2: Phase 1 - Smart Intent Extraction
  ✓ Viết prompt mới
  ✓ Update handler
  ✓ Update core-service nhận thêm trường
  ✓ Test với các query cảm xúc

Tuần 3-4: Phase 2 - RAG với Category/Attribute
  ✓ Implement RAGService
  ✓ Warm-up khi startup
  ✓ Tích hợp vào intent extraction
  ✓ Kiểm tra kết quả với query trừu tượng

Tuần 5-6: Phase 3 - LLM Agent (Premium)
  ✓ Implement agent loop
  ✓ Implement tools
  ✓ Kafka handler mới
  ✓ API endpoint mới
  ✓ E2E test

Tuần 7: Hoàn thiện
  ✓ Đánh giá chất lượng kết quả (so sánh trước/sau)
  ✓ Viết unit test
  ✓ Tài liệu hóa API
```

---

## 6. So sánh cách tiếp cận

| Cách | Ưu điểm | Nhược điểm | Phù hợp |
|---|---|---|---|
| **Chỉ cải tiến prompt** (Phase 1) | Đơn giản, nhanh, không cần infra mới | Không "thật" là RAG, LLM vẫn hallucinate nếu không có context | Minimum viable |
| **Phase 1 + RAG** (Phase 1+2) | Grounded trong dữ liệu thật (categories/attributes), kết quả đáng tin cậy hơn | Phức tạp hơn một chút | **Khuyến nghị cho đồ án** |
| **Full Agent** (Phase 1+2+3) | Ấn tượng nhất, có thể monetize, tương tác tự nhiên | Latency cao hơn (~2-3s), cần quản lý tool errors | Điểm cộng cho đồ án, demo ấn tượng |

---

## 7. Đánh giá chất lượng

Để chứng minh cải tiến cho đồ án, cần bộ test queries:

```python
TEST_QUERIES = [
    # Cảm xúc
    "Tôi đang buồn chán muốn giải khuây",
    "Muốn tìm nơi để suy nghĩ một mình yên tĩnh",
    "Tìm chỗ hẹn hò lãng mạn cho 2 người",
    
    # Use-case
    "Chỗ nào để làm việc với laptop cả ngày?",
    "Nơi phù hợp để tụ tập sinh nhật nhóm bạn 10 người",
    "Muốn đi đâu đó thư giãn sau ngày làm việc mệt mỏi",
    
    # Đặc thù Việt Nam
    "Quán nào có không khí giống như trong phim Hàn?",
    "Chỗ nào bán đồ uống check-in đẹp cho Instagram?",
]

# Metrics:
# - Recall@5: có địa điểm phù hợp trong top 5 không?
# - Relevance score: đánh giá thủ công 1-5
# - So sánh trước/sau Phase 1, Phase 2
```

---

## 8. Rủi ro và cách giảm thiểu

| Rủi ro | Khả năng | Giải pháp |
|---|---|---|
| LLM expand query sai (hallucinate) | Trung bình | RAG grounding (Phase 2) giảm thiểu; fallback về empty query |
| RAG warm-up chậm khi startup | Thấp | Background task, không block startup |
| Latency tăng (agent có nhiều LLM calls) | Cao với Phase 3 | Streaming response; timeout 5s fallback về Phase 1 |
| Groq rate limit | Trung bình | Cache intent cho cùng query + user trong 5 phút |
| Kết quả agent không nhất quán | Trung bình | Few-shot examples trong system prompt; temperature thấp |

---

## 9. Tóm tắt kiến trúc cuối cùng

```
                    ┌─────────────────────────────────────┐
                    │           API Gateway                │
                    │  GET /places/search  (free)          │
                    │  POST /places/chat-search (premium)  │
                    └──────────────┬──────────────────────┘
                                   │ Kafka
                    ┌──────────────▼──────────────────────┐
                    │          Core Service                │
                    │  PlaceService.search()               │
                    │  PlaceService.chatSearch()           │
                    └──────────────┬──────────────────────┘
                                   │ Kafka
                    ┌──────────────▼──────────────────────┐
                    │       Intelligence Service           │
                    │                                      │
                    │  ┌─────────────────────────────┐    │
                    │  │     LLM Service (Groq)       │    │
                    │  │  Smart Intent Extraction     │    │
                    │  └──────────────┬──────────────┘    │
                    │                 │                    │
                    │  ┌──────────────▼──────────────┐    │
                    │  │       RAG Service            │    │
                    │  │  Category + Attribute KB     │    │
                    │  └──────────────┬──────────────┘    │
                    │                 │                    │
                    │  ┌──────────────▼──────────────┐    │
                    │  │  Embedding Service           │    │
                    │  │  (SentenceTransformer 384d)  │    │
                    │  └──────────────┬──────────────┘    │
                    │                 │                    │
                    │  ┌──────────────▼──────────────┐    │
                    │  │  Agent Service (Premium)     │    │
                    │  │  Tool: get_user_profile      │    │
                    │  │  Tool: search_places         │    │
                    │  │  Tool: get_place_details     │    │
                    │  └─────────────────────────────┘    │
                    └─────────────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │         PostgreSQL + pgvector        │
                    │  Places (embedding_title 384d)       │
                    │  Places (embedding_full 384d)        │
                    │  Places (fts_search_vector)          │
                    └─────────────────────────────────────┘
```
