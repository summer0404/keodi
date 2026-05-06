"""
Offline evaluation of LLM-based sentiment analysis.

Golden set with 30-review manually defined ground truth.
Metrics: Attribute Detection (Precision / Recall / F1)
         Score Regression (MAE / RMSE)

Score convention (same as production system):
  All attributes: score proportional to the attribute's literal meaning.
  Examples:
    NOISE_INTENSITY  : +1.0 = very noisy       -1.0 = very quiet
    EXPENSIVENESS    : +1.0 = very expensive    -1.0 = very cheap
    SERVICE_QUALITY  : +1.0 = excellent service -1.0 = terrible service
    DELICIOUSNESS    : +1.0 = very delicious    -1.0 = not delicious at all
    RESTROOM_HYGIENE : +1.0 = very clean        -1.0 = very dirty

Run from intelligence-service/ :
    python evaluation/evaluate_sentiment.py
"""

import sys, os

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_SVC_DIR  = os.path.dirname(_THIS_DIR)
sys.path.insert(0, _SVC_DIR)
os.chdir(_SVC_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(_SVC_DIR, ".env"))

import asyncio, json, math, re
from collections import defaultdict

from app.prompts.prompt import Prompts

_PROMPTS = Prompts()

# ─── Golden-set (30 Vietnamese reviews with ground-truth attribute scores) ────
#
# All attributes are drawn from the production system attribute list.
# Score convention: proportional to the attribute's literal meaning (see module
# docstring). NOISE_INTENSITY = +1 means very noisy; -1 means very quiet.
#
GOLDEN_SET = [
    # ── SERVICE_QUALITY ──────────────────────────────────────────────────────
    ("Nhân viên phục vụ rất nhiệt tình, nhanh nhẹn và thân thiện.",
     {"SERVICE_QUALITY": 0.9}),
    ("Staff chuyên nghiệp, giải đáp mọi thắc mắc rất tận tình.",
     {"SERVICE_QUALITY": 0.8}),
    ("Phục vụ nhanh, không phải đợi lâu.",
     {"SERVICE_QUALITY": 0.7}),
    ("Nhân viên thái độ rất kém, phục vụ chậm và thiếu nhiệt tình.",
     {"SERVICE_QUALITY": -0.9}),
    ("Gọi mãi mà không có ai ra, thái độ phục vụ tệ.",
     {"SERVICE_QUALITY": -0.8}),

    # ── EXPENSIVENESS ─────────────────────────────────────────────────────────
    # +1 = very expensive, -1 = very cheap
    ("Giá cả rất hợp lý, đáng đồng tiền bỏ ra.",
     {"EXPENSIVENESS": -0.5}),
    ("Rẻ bất ngờ mà chất lượng vẫn tốt, chắc chắn sẽ quay lại.",
     {"EXPENSIVENESS": -0.9}),
    ("Giá bình dân, phù hợp cho học sinh sinh viên.",
     {"EXPENSIVENESS": -0.7}),
    ("Giá hơi đắt so với chất lượng nhận được.",
     {"EXPENSIVENESS": 0.7}),
    ("Đắt quá, không xứng đáng với số tiền bỏ ra.",
     {"EXPENSIVENESS": 0.9}),

    # ── NOISE_INTENSITY ──────────────────────────────────────────────────────
    # +1 = very noisy, -1 = very quiet
    ("Không gian yên tĩnh, phù hợp để làm việc hoặc đọc sách.",
     {"NOISE_INTENSITY": -0.8}),
    ("Quán rất ít người, yên ả, rất thoải mái.",
     {"NOISE_INTENSITY": -0.7}),
    ("Quán ồn ào, nhạc mở to quá, rất khó nói chuyện.",
     {"NOISE_INTENSITY": 0.8}),
    ("Đông đúc và ồn ĩ, không thể tập trung làm việc được.",
     {"NOISE_INTENSITY": 0.7}),

    # ── DINE_IN ──────────────────────────────────────────────────────────────
    ("Không gian ngồi rất thoải mái, chỗ ngồi rộng rãi, view đẹp.",
     {"DINE_IN": 0.8}),
    ("Chỗ ngồi chật chội, không thoải mái để ngồi lâu.",
     {"DINE_IN": -0.7}),

    # ── DELICIOUSNESS ─────────────────────────────────────────────────────────
    ("Đồ ăn ngon, hương vị đậm đà, rất ấn tượng.",
     {"DELICIOUSNESS": 0.9}),
    ("Thức uống rất ngon, sẽ quay lại lần sau.",
     {"DELICIOUSNESS": 0.8}),
    ("Đồ ăn nhạt nhẽo, không có gì đặc biệt.",
     {"DELICIOUSNESS": -0.6}),
    ("Uống vào không thấy ngon, hoàn toàn thất vọng.",
     {"DELICIOUSNESS": -0.7}),

    # ── RESTROOM_HYGIENE ─────────────────────────────────────────────────────
    ("Quán sạch sẽ, thoáng mát, nhà vệ sinh cũng sạch.",
     {"RESTROOM_HYGIENE": 0.8}),
    ("Vệ sinh kém, nhà vệ sinh bẩn và có mùi khó chịu.",
     {"RESTROOM_HYGIENE": -0.8}),

    # ── Multi-attribute ──────────────────────────────────────────────────────
    ("Phục vụ tốt, giá hơi cao nhưng đồ ăn khá ngon.",
     {"SERVICE_QUALITY": 0.7, "EXPENSIVENESS": 0.5, "DELICIOUSNESS": 0.7}),
    ("Yên tĩnh, sạch sẽ, thích hợp làm việc nhóm.",
     {"NOISE_INTENSITY": -0.7, "RESTROOM_HYGIENE": 0.7}),
    ("Giá rẻ nhưng chất lượng phục vụ kém, thái độ không tốt.",
     {"EXPENSIVENESS": -0.7, "SERVICE_QUALITY": -0.6}),
    ("Đồ ăn ngon, không gian đẹp nhưng hơi đắt.",
     {"DELICIOUSNESS": 0.8, "EXPENSIVENESS": 0.6}),
    ("Nhân viên thân thiện, quán sạch sẽ, giá phải chăng.",
     {"SERVICE_QUALITY": 0.7, "RESTROOM_HYGIENE": 0.7, "EXPENSIVENESS": -0.5}),
    ("Ồn ào quá, phục vụ cũng không được tốt.",
     {"NOISE_INTENSITY": 0.7, "SERVICE_QUALITY": -0.5}),
    ("Không gian ấm cúng, trang trí đẹp, thích hợp cho các buổi hẹn.",
     {"DINE_IN": 0.8}),
    ("Quán sạch, nhân viên niềm nở, nhưng giá đắt và đồ ăn bình thường.",
     {"RESTROOM_HYGIENE": 0.7, "SERVICE_QUALITY": 0.6, "EXPENSIVENESS": 0.7, "DELICIOUSNESS": -0.3}),
]

# ─── LLM helpers ──────────────────────────────────────────────────────────────

def _strip_think(text: str) -> str:
    """Remove <think>…</think> blocks emitted by reasoning models."""
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


def _parse_json(raw: str) -> dict:
    raw = _strip_think(raw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    m = re.search(r"\{[^{}]+\}", raw, re.DOTALL)
    if m:
        try:
            return json.loads(m.group())
        except json.JSONDecodeError:
            pass
    return {}


async def call_groq(review: str, attributes: list[str]) -> dict:
    from groq import AsyncGroq
    import httpx

    # Bypass SSL verification for environments with self-signed certificates
    http_client = httpx.AsyncClient(verify=False)
    client = AsyncGroq(
        api_key=os.environ.get("GROQ_API_KEY", ""),
        http_client=http_client,
        base_url=os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1").removesuffix("/openai/v1"),
    )
    model  = os.environ.get("GROQ_MODEL", "qwen/qwen3-32b")
    temp   = float(os.environ.get("GROQ_TEMPERATURE", "0.1"))
    max_t  = int(os.environ.get("GROQ_MAX_TOKENS", "1024"))

    prompt = _PROMPTS.SENTIMENT_ANALYSIS.format(
        attributes=json.dumps(attributes),
        review=review,
    )
    resp = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=temp,
        max_tokens=max_t,
    )
    raw = resp.choices[0].message.content
    return _parse_json(raw)


# ─── Evaluation metrics ───────────────────────────────────────────────────────

def compute_metrics(
    preds:  list[dict],
    truths: list[dict],
) -> tuple[dict, dict]:
    """
    Returns:
      overall  – {precision, recall, f1, mae, rmse, tp, fp, fn, n_reviews}
      per_attr – {attr: {tp, fp, fn, errors: [float]}}
    """
    tp = fp = fn = 0
    abs_errors: list[float] = []
    per_attr: dict = defaultdict(lambda: dict(tp=0, fp=0, fn=0, errors=[]))

    for pred, truth in zip(preds, truths):
        pred_a  = set(pred)
        truth_a = set(truth)

        for a in truth_a & pred_a:
            tp += 1
            per_attr[a]["tp"] += 1
            err = abs(pred[a] - truth[a])
            abs_errors.append(err)
            per_attr[a]["errors"].append(err)

        for a in pred_a - truth_a:
            fp += 1
            per_attr[a]["fp"] += 1

        for a in truth_a - pred_a:
            fn += 1
            per_attr[a]["fn"] += 1

    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall    = tp / (tp + fn) if (tp + fn) else 0.0
    f1        = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    mae       = sum(abs_errors) / len(abs_errors) if abs_errors else 0.0
    rmse      = math.sqrt(sum(e ** 2 for e in abs_errors) / len(abs_errors)) if abs_errors else 0.0

    overall = dict(
        precision=precision, recall=recall, f1=f1,
        mae=mae, rmse=rmse,
        tp=tp, fp=fp, fn=fn,
        n_reviews=len(preds),
    )
    return overall, dict(per_attr)


# ─── LaTeX export ─────────────────────────────────────────────────────────────

def write_latex_metrics(
    overall:  dict,
    per_attr: dict,
    out_dir:  str,
) -> None:
    lines = [
        "% Auto-generated by evaluate_sentiment.py — do not edit manually",
        "% Re-run the script to refresh these values",
        "",
        f"\\newcommand{{\\SentNReviews}}{{{overall['n_reviews']}}}",
        f"\\newcommand{{\\SentPrecision}}{{{overall['precision']:.4f}}}",
        f"\\newcommand{{\\SentRecall}}{{{overall['recall']:.4f}}}",
        f"\\newcommand{{\\SentFOne}}{{{overall['f1']:.4f}}}",
        f"\\newcommand{{\\SentMAE}}{{{overall['mae']:.4f}}}",
        f"\\newcommand{{\\SentRMSE}}{{{overall['rmse']:.4f}}}",
        f"\\newcommand{{\\SentTP}}{{{overall['tp']}}}",
        f"\\newcommand{{\\SentFP}}{{{overall['fp']}}}",
        f"\\newcommand{{\\SentFN}}{{{overall['fn']}}}",
        "",
        "% Per-attribute table rows",
    ]

    for a, d in sorted(per_attr.items()):
        tp, fp, fn = d["tp"], d["fp"], d["fn"]
        p  = tp / (tp + fp) if (tp + fp) else 0.0
        r  = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = 2 * p * r / (p + r) if (p + r) else 0.0
        mae = sum(d["errors"]) / len(d["errors"]) if d["errors"] else float("nan")
        mae_s = f"{mae:.4f}" if not math.isnan(mae) else "--"
        safe = a.replace("_", "")
        lines += [
            f"\\newcommand{{\\Sent{safe}P}}{{{p:.4f}}}",
            f"\\newcommand{{\\Sent{safe}R}}{{{r:.4f}}}",
            f"\\newcommand{{\\Sent{safe}FOne}}{{{f1:.4f}}}",
            f"\\newcommand{{\\Sent{safe}MAE}}{{{mae_s}}}",
        ]

    path = os.path.join(out_dir, "sentiment_metrics.tex")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"[TEX] LaTeX metrics → {path}")


# ─── Main ─────────────────────────────────────────────────────────────────────

async def main() -> None:
    print("\n" + "=" * 62)
    print("  LLM Sentiment Analysis — Offline Evaluation")
    print("=" * 62)

    # Get attribute list from DB (or fallback)
    attributes: list[str] = []
    try:
        from app.database.prisma_service import get_prisma_client, close_prisma_client

        db    = await get_prisma_client()
        attrs = await db.attribute.find_many()
        await close_prisma_client()
        attributes = [a.name for a in attrs]
        print(f"[DB] {len(attributes)} thuộc tính: {attributes}")
    except Exception as exc:
        attributes = [
            "TAKEAWAY", "DELIVERY", "INTERNET_CONNECTIVITY", "PET_FRIENDLINESS",
            "VEGETARIAN_VARIETY", "SMOKING_ALLOWANCE", "RESTROOM_HYGIENE",
            "WHEELCHAIR_ACCESSIBILITY", "LATE_NIGHT_AVAILABILITY", "RESERVATION_NECESSITY",
            "DINE_IN", "NOISE_INTENSITY", "GROUP_SUITABILITY", "WORK_STUDY",
            "ROMANTIC", "PHOTOGENIC", "SEATING_CAPACITY", "POWER_OUTLET_AVAILABILITY",
            "EVENT_SUITABILITY", "ENTERTAINMENT_VARIETY", "MUSIC_ATMOSPHERE",
            "EXPENSIVENESS", "CHILD_FRIENDLINESS", "PARKING_ACCESSIBILITY",
            "PAYMENT_CONVENIENCE", "ALCOHOL_VARIETY", "DRESS_CODE_STRICTNESS",
            "CUISINE_AUTHENTICITY", "DRIVE_THROUGH_EFFICIENCY", "HAPPY_HOUR_VALUE",
            "PRIVACY", "SERVICE_QUALITY", "SPORTS_BROADCASTING", "SCENIC_VIEW",
            "SAFETY", "LOYALTY_PROGRAM", "DIETARY_ACCOMMODATION", "SPACIOUSNESS",
            "OUTDOOR_SPACE", "CROWD_DENSITY", "BOARD_GAME", "FREE_PARKING_LOT",
            "DELICIOUSNESS",
        ]
        print(f"[DB] Không thể kết nối ({exc}) — dùng danh sách dự phòng ({len(attributes)} thuộc tính)")

    valid_attrs = set(attributes)

    # Filter golden set: only keep ground-truth attributes that exist in DB
    filtered: list[tuple[str, dict]] = []
    for review, truth in GOLDEN_SET:
        t = {a: s for a, s in truth.items() if a in valid_attrs}
        if t:
            filtered.append((review, t))

    print(
        f"[GOLDEN] {len(filtered)}/{len(GOLDEN_SET)} reviews sẽ được đánh giá "
        f"(sau khi lọc theo thuộc tính của DB)"
    )

    # ── Part A: Golden-set evaluation ─────────────────────────────────────────
    print("\n[A] Chạy đánh giá golden set qua Groq …")
    preds:  list[dict] = []
    truths: list[dict] = []

    for i, (review, truth) in enumerate(filtered):
        try:
            pred = await call_groq(review, attributes)
            print(f"  [{i+1:02d}/{len(filtered)}]  truth={truth}")
            print(f"           pred ={pred}")
        except Exception as exc:
            print(f"  [{i+1:02d}/{len(filtered)}]  LỖI: {exc}")
            pred = {}
        preds.append(pred)
        truths.append(truth)

    overall, per_attr = compute_metrics(preds, truths)
    print_overall(overall)
    print_per_attr(per_attr)

    # ── Export JSON ────────────────────────────────────────────────────────────
    export = {
        "overall":    overall,
        "per_attribute": {
            a: {
                "precision": d["tp"] / (d["tp"] + d["fp"]) if (d["tp"] + d["fp"]) else 0.0,
                "recall":    d["tp"] / (d["tp"] + d["fn"]) if (d["tp"] + d["fn"]) else 0.0,
                "f1": (lambda p_, r_: 2*p_*r_/(p_+r_) if (p_+r_) else 0.0)(
                    d["tp"] / (d["tp"] + d["fp"]) if (d["tp"] + d["fp"]) else 0.0,
                    d["tp"] / (d["tp"] + d["fn"]) if (d["tp"] + d["fn"]) else 0.0,
                ),
                "mae": sum(d["errors"]) / len(d["errors"]) if d["errors"] else None,
            }
            for a, d in per_attr.items()
        },
    }

    json_path = os.path.join(_THIS_DIR, "sentiment_results.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(export, f, indent=2, ensure_ascii=False)
    print(f"[OUT] JSON  → {json_path}")

    write_latex_metrics(overall, per_attr, _THIS_DIR)


if __name__ == "__main__":
    asyncio.run(main())
