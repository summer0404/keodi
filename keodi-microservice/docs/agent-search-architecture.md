# Agent Search — Kiến trúc & Luồng hoạt động

> **Endpoint:** `POST /places/chat-search`  
> **Tính năng:** Tìm kiếm địa điểm bằng ngôn ngữ tự nhiên, hỗ trợ cả query trừu tượng/cảm xúc.

---

## 1. Tổng quan luồng end-to-end

```
Client
  │  POST /places/chat-search
  │  { message, latitude, longitude }
  ▼
API Gateway  ──(Kafka, 60s timeout)──▶  intelligence.agent-search
                                              │
                                       LangGraph Agent
                                       (xem mục 3)
                                              │
                                    { message, placeIds }
  ◀──(Kafka reply)──────────────────────────────
  │
  │  Kafka, 5s timeout
  ▼
place.get-by-ids-with-distance
  │  { ids, userId, latitude, longitude }
  ▼
Core Service  ──▶  DB query (1 lần)
                   - isFavorite
                   - openingHours
                   - categories
                   - distance (Haversine)
                   - featureImageUrl (signed)
  ◀──────────────────────────────────────────
  │
  ▼
Client nhận:
{
  "message": "Dựa trên sở thích của bạn...",
  "places": [ PlaceDistanceDto[] ]
}
```

---

## 2. Các thành phần tham gia

| Thành phần | File | Vai trò |
|---|---|---|
| API Gateway controller | `api-gateway/.../place.controller.ts` | Nhận HTTP request, trả HTTP response |
| API Gateway service | `api-gateway/.../place.service.ts` | Điều phối 2 Kafka call |
| Intelligence handler | `intelligence-service/app/kafka/handler.py` | Nhận Kafka message, gọi AgentService |
| **AgentService** | `app/services/agent/agent_service.py` | Khởi tạo LangGraph graph và chạy agent |
| **Tools** | `app/services/agent/tools.py` | 4 tool mà agent có thể gọi |
| Core Service | `core-service/.../place.service.ts` | Enrich place data + tính distance |

---

## 3. LangGraph Agent — Chi tiết

### 3.1 State

```python
class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]  # toàn bộ lịch sử hội thoại
    user_id: str
    latitude: float
    longitude: float
```

### 3.2 Graph structure

```
          ┌─────────────┐
 START ──▶│  agent node │
          └──────┬──────┘
                 │ có tool_calls?
         ┌───────┴────────┐
        YES               NO
         │                │
         ▼               END
  ┌─────────────┐
  │  tools node │  (ToolNode thực thi tool)
  └──────┬──────┘
         │ submit_answer được gọi?
   ┌─────┴──────┐
  YES           NO
   │             │
  END     quay lại agent node
```

**Agent node:** Gọi LLM (Groq — Qwen3-32b) với danh sách tool đã bind. LLM quyết định gọi tool nào dựa trên system prompt và conversation history.

**Tools node:** `ToolNode` của LangGraph tự động thực thi tất cả tool calls trong message cuối của agent, thêm `ToolMessage` vào state.

**Điều kiện dừng:** Khi `ToolMessage` có `name == "submit_answer"` xuất hiện trong state → graph kết thúc.

### 3.3 System prompt

```
You are an intelligent assistant that helps users find suitable places in Vietnam.

Instructions:
1. Call get_user_profile to understand the user's preferences.
2. Call search_places with a specific semantic query based on the user's intent
   (convert emotions/abstract concepts → concrete,
    e.g.: "sad, want to relax" → "upbeat bar with friends").
3. Call submit_answer with a list of placeIds and a warm message in Vietnamese.

You MUST always call submit_answer to end the conversation.
```

---

## 4. Bốn Tools

### `get_user_profile(user_id)`

**Mục đích:** Hiểu sở thích của người dùng trước khi search.

**Thực thi:**
- Query `user_attributes` → top 5 thuộc tính theo score (SERVICE_QUALITY, NOISE_INTENSITY, v.v.)
- Query `user_categories` → top 3 category tương tác gần nhất

**Output (text cho LLM):**
```
User profile:
Top attributes:
  - Attribute ID: abc123, Score: 0.8500
  - Attribute ID: def456, Score: 0.6200
Preferred categories:
  - Category ID: cat001
```

---

### `search_places(query, radius_km=5.0, limit=5)`

**Mục đích:** Tìm địa điểm phù hợp bằng pgvector similarity.

**Cách LLM dùng:** LLM dịch query cảm xúc/trừu tượng thành mô tả địa điểm cụ thể trước khi truyền vào tool.

Ví dụ:
- Input user: `"tôi đang buồn muốn giải khuây"`
- LLM gọi tool với: `query="quán bar nhộn nhịp vui vẻ bạn bè"`

**Thực thi:**
1. Embed `query` bằng `SentenceTransformer` (384 chiều, `paraphrase-multilingual-MiniLM-L12-v2`)
2. Chạy raw SQL với `pgvector` cosine similarity + Haversine distance filter:
   ```sql
   SELECT id, name, rating, full_address, feature_image_url,
          (6371 * acos(LEAST(1.0, cos(radians({lat})) * ...))) AS distance_km,
          1 - (embedding_full <=> '{vector}'::vector)          AS similarity
   FROM places
   WHERE embedding_full IS NOT NULL
     AND distance_km < {radius_km}
   ORDER BY similarity DESC
   LIMIT {limit}
   ```
3. Trả text cho LLM với danh sách `ID, Name, Rating, Address, Distance, Similarity`

**Output (text cho LLM):**
```
- ID: clx123, Name: Quán The Pub, Rating: 4.3, Address: 123 Nguyễn Huệ, Distance: 1.2 km, Similarity: 0.8741
- ID: clx456, Name: Bar Social, Rating: 4.1, Address: 45 Lê Lợi, Distance: 2.5 km, Similarity: 0.8512
```

---

### `get_place_details(place_id)`

**Mục đích:** Lấy thông tin chi tiết một địa điểm cụ thể khi LLM cần thêm context.

**Thực thi:** Query `places` với `include` categories + attributes.

**Output:** Tên, rating, địa chỉ, categories, attribute scores.

> Đây là tool tùy chọn — LLM chỉ gọi khi cần so sánh hoặc xác nhận thêm thông tin về một địa điểm cụ thể.

---

### `submit_answer(message, place_ids)`

**Mục đích:** Tool kết thúc — LLM gọi khi đã có đủ thông tin.

**Input:**
- `message`: Tin nhắn tiếng Việt giải thích lý do gợi ý
- `place_ids`: Danh sách ID địa điểm theo thứ tự ưu tiên

**Thực thi:**
```python
return json.dumps({"message": message, "placeIds": place_ids})
```

**Cơ chế detect:** Sau khi `ToolNode` thực thi, `after_tools()` scan các `ToolMessage` gần nhất, nếu thấy `msg.name == "submit_answer"` → graph route sang `END`.

---

## 5. Ví dụ một lần chạy đầy đủ

**Input:**
```json
{
  "message": "Tôi đang buồn muốn đi đâu đó giải khuây với bạn bè",
  "latitude": 10.7769,
  "longitude": 106.7009
}
```

**Conversation trace trong AgentState.messages:**

```
[HumanMessage]
  "Tôi đang buồn muốn đi đâu đó giải khuây với bạn bè"

[AIMessage — tool_calls]
  → get_user_profile("user_abc")

[ToolMessage — get_user_profile]
  "User profile:
   Top attributes: NOISE_INTENSITY: 0.7, DINE_IN: 0.6
   Preferred categories: Bar & Lounge, Cafe"

[AIMessage — tool_calls]
  → search_places("quán bar nhộn nhịp vui vẻ bạn bè âm nhạc", radius_km=5.0, limit=5)

[ToolMessage — search_places]
  "- ID: clx001, Name: The Pub, Rating: 4.5, Distance: 1.2 km, Similarity: 0.8892
   - ID: clx002, Name: Bar Social, Rating: 4.2, Distance: 2.1 km, Similarity: 0.8701
   ..."

[AIMessage — tool_calls]
  → submit_answer(
      message="Tôi tìm thấy vài địa điểm nhộn nhịp để bạn giải khuây cùng bạn bè!...",
      place_ids=["clx001", "clx002", "clx003"]
    )

[ToolMessage — submit_answer]           ← graph kết thúc tại đây
  '{"message": "...", "placeIds": ["clx001", "clx002", "clx003"]}'
```

**Handler extract kết quả:**
```python
# Scan ngược messages, tìm ToolMessage tên "submit_answer"
return json.loads(msg.content)
# → { "message": "...", "placeIds": ["clx001", "clx002", "clx003"] }
```

---

## 6. Sau khi agent trả placeIds

```
API Gateway nhận { message, placeIds }
        │
        ▼ Kafka: place.get-by-ids-with-distance
        │ payload: { ids, userId, latitude, longitude }
        ▼
Core Service: getByIdsWithDistance()
  - Prisma findMany với id IN placeIds, status = PUBLISHED
  - Giữ nguyên thứ tự ranking của agent (Map + ids.map)
  - Tính distance bằng PlaceHelper.calculateDistance() (Haversine)
  - isFavorite = favorites.length > 0
  - featureImageUrl = imageService.getImageViewUrl() (signed URL)
        │
        ▼
PlaceWithDistance[] → API Gateway → Client
```

---

## 7. Cấu hình & timeout

| Tham số | Giá trị | Nơi cấu hình |
|---|---|---|
| LLM model | `qwen/qwen3-32b` (Groq) | `.env` `GROQ_MODEL` |
| LLM temperature | `0.1` | `.env` `GROQ_TEMPERATURE` |
| Agent Kafka timeout | `60s` | `AGENT_KAFKA_TIMEOUT_MS = KAFKA_TIMEOUT_MS + 55_000` |
| GetByIds timeout | `5s` (default) | `KAFKA_TIMEOUT_MS` |
| search_places radius | `5.0 km` (default) | Tham số tool |
| search_places limit | `5` địa điểm | Tham số tool |

---

## 8. Hướng nâng cấp

### Thêm tool mới
Chỉ cần thêm function với `@tool` decorator vào `tools.py`, append vào list return của `create_tools()`. LangGraph và LLM tự biết khi nào dùng.

```python
@tool
async def get_nearby_events(place_id: str, date: str) -> str:
    """Get upcoming events at a specific place."""
    ...
```

### Điều chỉnh hành vi agent
Sửa `Prompts.AGENT_SYSTEM` trong `app/prompts/prompt.py`. Ví dụ: ưu tiên rating cao hơn, bắt buộc suggest ≥ 3 địa điểm, thêm context về giờ mở cửa.

### Tăng số địa điểm gợi ý
Thay đổi `limit` mặc định trong tool `search_places` (hiện tại = 5).

### Thêm memory hội thoại (multi-turn)
Hiện tại mỗi request là một graph mới, không có context từ request trước. Để hỗ trợ multi-turn: lưu `AgentState.messages` vào Redis theo `conversationId`, khôi phục khi có request tiếp theo.

### Phase 1+2 (Smart Intent + RAG)
Kết quả `search_places` có thể được cải thiện bằng cách:
- **Phase 1:** LLM viết lại query trước khi embed (hiện tại LLM đã làm điều này trong reasoning, nhưng chưa có explicit expansion step)
- **Phase 2:** RAG từ Category/Attribute knowledge base để LLM có context cụ thể hơn khi dịch query cảm xúc → semantic query
