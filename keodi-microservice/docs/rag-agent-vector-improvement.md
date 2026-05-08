# Cải thiện Agent Search bằng Vector

## Vấn đề gốc

`embedding_full` bị "nhão" vì nó encode tất cả: tên, địa chỉ, danh mục, thuộc tính, review... vào một vector duy nhất. Khi user query dài, vector của query cũng bị phân tán, nên cosine similarity với `embedding_full` thấp và nhiễu.

---

## 3 hướng cải thiện vector mà vẫn giữ nguyên tool hiện tại

### 1. Agent chỉ truyền phần "vibe/intent" xuống `search_places`, không truyền raw query

Hiện tại agent đang truyền cả câu dài của user vào tool `search_places` để embed. Cải thiện: trong system prompt của agent, hướng dẫn nó **trích xuất phần semantic** trước khi gọi tool — ví dụ từ *"tìm quán cà phê yên tĩnh view đẹp gần Q1 không quá đắt để làm việc"* chỉ lấy *"quán cà phê yên tĩnh view đẹp làm việc"* để embed, còn phần khoảng cách/giá thì giao cho các tool khác xử lý. Tool không cần sửa, chỉ cần agent biết phân vai.

### 2. Thêm `embedding_purpose` riêng cho Place

Thay vì `embedding_full` ôm hết, tách ra một vector mới chỉ encode **mục đích sử dụng** của địa điểm: *"không gian làm việc, yên tĩnh, có wifi, ánh sáng tốt"* — loại thông tin này không nằm trong title và bị chìm trong full. Tool `search_places` có thể thêm option query theo vector này khi agent nhận ra user query thiên về "mục đích" thay vì "danh mục".

### 3. Vector làm re-ranking signal, không phải primary retrieval

Pattern mạnh nhất và phù hợp nhất với kiến trúc agent hiện tại: để các tool `search_by_category`, `search_by_text`, `search_by_attributes` làm primary retrieval (chúng đang làm tốt vì structured), sau đó dùng vector similarity giữa query và `embedding_full` của từng kết quả để **re-rank** — tool `search_places` lúc này đóng vai scoring/re-ranking thay vì discovery. Agent gọi các tool kia trước, rồi gọi `search_places` để sort lại pool kết quả.

---

## Khuyến nghị

**Hướng thực tế nhất: Hướng 1 + 3**

- Hướng 1 không tốn gì thêm, chỉ sửa system prompt của agent.
- Hướng 3 biến `search_places` thành re-ranker — phù hợp vì đã có `embedding_full` sẵn trong DB, không cần thay đổi schema.
