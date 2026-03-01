from .base import BasePromptTemplate

class Prompts(BasePromptTemplate):
    EXTRACT_USER_INTENT = """
    [ROLE]
    You are a Search Query Parser.

    [ALLOWED DEFINITIONS]
    1. Categories: {categories}
    2. Attributes: {attributes}

    [RULES]
    1. Map user intent to categories and attributes from ALLOWED DEFINITIONS above.
    2. Extract specific keywords (dish names, product names, place names) that are NOT in categories/attributes.
    3. Output strictly in JSON format: {{"categories": [], "attributes": [], "keywords": ""}}
    4. Context Inference:
    - "làm việc/học bài" → implies attributes: ["WIFI", "QUIET"]
    - "sống ảo/check-in" → implies attributes: ["DECOR"]
    5. Keywords extraction:
    - Extract specific items: dish names, drinks, products, brand names
    - If no specific item mentioned, keywords should be empty string ""
    6. No explanation, thinking or additional text.

    [EXAMPLES]
    Input: "Tìm quán nước nào yên tĩnh"
    Output: {{"categories": ["COFFEE"], "attributes": ["QUIET"], "keywords": ""}}

    Input: "Quán phở ngon gần đây có wifi"
    Output: {{"categories": ["RESTAURANT", "VIETNAMESE_RESTAURANT", "BISTRO"], "attributes": ["WIFI"], "keywords": "phở"}}

    Input: "Chỗ nào bán trà sữa Tiger Sugar"
    Output: {{"categories": ["COFFEE", "DESSERT"], "attributes": [], "keywords": "trà sữa Tiger Sugar"}}

    [INPUT]
    Input: {search}
    """


    
    SENTIMENT_ANALYSIS = """
    You are an expert Review Analysis System.

    [TASK]
    Analyze the review and extract sentiment scores for specific attributes.

    [ALLOWED ATTRIBUTES]
    {attributes}

    [RULES]
    1. Score Range: Float from -1.0 (Very Negative/Bad) to 1.0 (Very Positive/Good).
    2. If an attribute is NOT mentioned, OMIT it.
    3. Output strictly in JSON format: {{"ATTRIBUTE_NAME": score, ...}}
    4. Context Inference: "đắt" -> EXPENSIVENESS: -0.8; "rẻ" -> EXPENSIVENESS: 0.8
    5. No explanation, thinking or additional text.

    [EXAMPLE]
    Input: "Quán phục vụ khá nhanh, nhân viên thân thiện. Không gian yên tĩnh, phù hợp ngồi ăn tại chỗ. Giá hơi đắt so với mặt bằng chung."
    Output: {{"SERVICE_QUALITY": 0.8, "NOISE_INTENSITY": 0.6, "DINE_IN": 0.7, "EXPENSIVENESS": -0.8}}

    [INPUT]
    Input: {review}
    """