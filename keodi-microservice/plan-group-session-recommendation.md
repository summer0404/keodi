# Plan: AI-powered Group Session Recommendation

## Trạng thái hiện tại (vấn đề)

### Intelligence-service chưa handle group recommendation
- `api-gateway` gửi Kafka topic `recommendation.group-session.get-recommendations` nhưng intelligence-service **không có handler nào** cho topic này → request timeout âm thầm.
- `recommendation.group-session.invalidate-cache` tương tự — không có handler.
- `GROUP_SESSION_RECOMMENDATION_TTL_SECONDS = 30` và `cacheManager.del(key)` đang được gọi nhưng không có `cacheManager.get/set` tương ứng ở api-gateway → cache invalidation chạy một chiều, vô nghĩa.

### Ranking chỉ chạy per-user
- `RankingService.ranking()` dùng LightGBM để score place cho **một user** duy nhất.
- Không có logic gộp preference của nhiều người trong cùng session.
- Không có giải thích tại sao địa điểm được recommend.

### Cache invalidation thiếu trigger
Hiện tại chỉ invalidate khi:
- `updateRecommendationRadius`
- `updateRecommendationCategories`
- `refreshRecommendations` (manual)

Không invalidate khi:
- Member **join** → preference pool thay đổi, `MIN_MEMBERS = 2` có thể unlock
- Member **leave** → preference pool thu hẹp
- Candidate **add/delete** → có thể recommend lại place đã trong candidate pool

---

## Kiến trúc đề xuất

```
api-gateway
  GET /group-sessions/:id/recommendations
    → Kafka: recommendation.group-session.get-recommendations
        payload: { sessionId, userId?, guestId? }

intelligence-service
  Handler: group_recommendations
    1. Lấy session (members, searchRadius, categoryIds) từ DB
    2. Lấy UserAttribute vectors của tất cả authenticated members
    3. Build GROUP preference vector (aggregation)
    4. Fetch places từ DB (filter theo radius + category)
    5. Score từng place theo group vector (3 strategy)
    6. Re-rank bằng LightGBM per-member rồi aggregate
    7. Loại bỏ candidates đã có trong session
    8. LLM: sinh explanation cho top 5 places
    9. Reply qua Kafka

api-gateway
  ← Kafka reply
  → Cache vào Redis (TTL hợp lý)
  → Trả response
```

---

## 3 Lớp AI

### Lớp 1 — Group Preference Aggregation

Xây dựng GROUP attribute vector từ tất cả member vectors:

| Strategy | Công thức | Ý nghĩa |
|---|---|---|
| `average` | `mean(all member vectors)` | Trung bình tổng thể |
| `least_misery` | `min(score per member)` cho từng attribute | Không ai bị ghét cay |
| `most_pleasure` | `max(score per member)` | Tối đa hóa người hài lòng nhất |

**Score cuối cho mỗi place:**
```
group_score = 0.6 * cosine_sim(place, average_vector)
            + 0.4 * cosine_sim(place, least_misery_vector)
```
Balance giữa "số đông vui" và "không ai khó chịu".

### Lớp 2 — Per-member LightGBM Re-rank

Dùng model LightGBM hiện có (`ranking_service.ranking()`) để score từng place cho từng member:

```python
per_member_scores[place_id] = [score_member1, score_member2, ...]
aggregate_score[place_id] = mean(per_member_scores) * (1 - std_dev_penalty)
```

`std_dev_penalty`: place mà một người thích nhưng người khác ghét sẽ bị penalize. Ưu tiên nơi có sự đồng thuận cao.

### Lớp 3 — LLM Explanation

Với top 5 places sau ranking, gọi LLM sinh explanation ngắn cho mỗi place:

**Input prompt:**
```
Group có N thành viên với preferences sau: [summary of group vector]
Địa điểm: [place name, category, top attributes]
Giải thích ngắn gọn (1-2 câu) tại sao địa điểm này phù hợp với nhóm.
```

**Output mong muốn:**
```json
{
  "placeId": "...",
  "explanation": "Phù hợp vì 3/4 thành viên thích không gian yên tĩnh, đồ ăn được đánh giá cao bởi cả nhóm."
}
```

---

## Files cần thay đổi

### Intelligence-service (mới hoàn toàn)

| File | Mô tả |
|---|---|
| `app/kafka/topic.py` | Thêm `GROUP_SESSION_RECOMMENDATIONS`, `GROUP_SESSION_INVALIDATE_CACHE` topics + reply topic |
| `app/repositories/group_session_repository.py` | Lấy session info + members + candidates từ DB |
| `app/services/recommendation/group_recommendation_service.py` | Core algorithm: aggregation + scoring + re-rank |
| `app/prompts/prompt.py` | Thêm `group_recommendation_explanation` prompt template |
| `app/kafka/handler.py` | Thêm `group_recommendations` và `group_session_invalidate_cache` handlers |
| `app/main.py` | Register 2 handlers mới vào consumer |

### API Gateway (sửa)

| File | Thay đổi |
|---|---|
| `src/modules/group-session/group-session.service.ts` | Thêm cache read trong `getRecommendations`; thêm `invalidateRecommendationCache` vào `join`, `leaveSession`, `addCandidate`, `deleteCandidate` |
| `src/shared/constants/group-session.constant.ts` | Tăng TTL hoặc tách thành `RECOMMENDATION_CACHE_TTL_SECONDS` riêng (~5 phút) |

---

## Thứ tự implement

```
1. [intelligence-service] group_session_repository.py
   - get_session_with_members(session_id)
   - get_session_candidates(session_id)

2. [intelligence-service] group_recommendation_service.py
   - _build_group_vector(member_ids) → average + least_misery vectors
   - _score_places(places, group_vectors) → ranked list
   - _rerank_with_lightgbm(place_ids, member_ids) → per-member scores + aggregate
   - get_recommendations(session_id, excluded_place_ids) → final list

3. [intelligence-service] prompt.py + handler.py
   - Thêm group explanation prompt
   - Handler: group_recommendations (request-response)
   - Handler: group_session_invalidate_cache (event, xóa cache Redis)

4. [intelligence-service] topic.py + main.py
   - Register topics + handlers

5. [api-gateway] group-session.service.ts
   - Fix getRecommendations: thêm cacheManager.get/set
   - Thêm invalidateRecommendationCache vào join/leave/addCandidate/deleteCandidate

6. Tests
   - intelligence-service: tests/unit/services/test_group_recommendation_service.py
   - api-gateway: cập nhật group-session.service.spec.ts
```

---

## Lưu ý kỹ thuật

- **Members không có lịch sử**: Nếu member chưa có UserAttribute (người dùng mới), dùng category preference từ session settings thay thế. Nếu không có gì, bỏ qua member đó trong aggregation.
- **Session có < 2 members**: `GROUP_SESSION_RECOMMENDATION_MIN_MEMBERS = 2` — trả lỗi rõ ràng thay vì recommend rỗng.
- **LLM call**: Chỉ gọi cho top 5, không phải toàn bộ danh sách. Nếu LLM fail, vẫn trả recommendations không có explanation (graceful fallback).
- **Cache invalidation ở intelligence-service**: Handler `group_session_invalidate_cache` nhận event và xóa key tương ứng trong Redis nội bộ của intelligence-service (nếu có).
- **Reply topic**: `recommendation.group-session.get-recommendations.reply` — cần thêm vào cả `topic.py` của intelligence-service và `topic.constant.ts` của api-gateway.
