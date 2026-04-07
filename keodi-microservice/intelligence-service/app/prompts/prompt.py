from .base import BasePromptTemplate

class Prompts(BasePromptTemplate):
    EXTRACT_USER_INTENT = """
    [ROLE]
    You are a Search Query Parser.

    [RULES]
    1. Extract specific keywords (dish names, drinks, product names, brand names, place names).
    2. If no specific item mentioned, output empty string.
    3. Output ONLY the keyword string, no JSON, no explanation, no additional text.

    [EXAMPLES]
    Input: "Tìm quán cà phê yên tĩnh"
    Output: 

    Input: "Quán phở ngon gần đây có wifi"
    Output: phở

    Input: "Chỗ nào bán trà sữa Tiger Sugar"
    Output: trà sữa Tiger Sugar

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