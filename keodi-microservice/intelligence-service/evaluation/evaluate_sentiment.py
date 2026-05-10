import sys, os

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_SVC_DIR  = os.path.dirname(_THIS_DIR)
sys.path.insert(0, _THIS_DIR)
sys.path.insert(0, _SVC_DIR)
os.chdir(_SVC_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(_SVC_DIR, ".env"))

import asyncio, json, math, re
from collections import defaultdict

from app.prompts.prompt import Prompts
from data import GOLDEN_SET, ATTRIBUTES

_PROMPTS = Prompts()


def _strip_think(text: str) -> str:
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

    http_client = httpx.AsyncClient(verify=False)
    client = AsyncGroq(
        api_key=os.environ.get("GROQ_API_KEY", ""),
        http_client=http_client,
        base_url=os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1").removesuffix("/openai/v1"),
    )
    model = os.environ.get("GROQ_MODEL", "qwen/qwen3-32b")
    temp  = float(os.environ.get("GROQ_TEMPERATURE", "0.1"))
    max_t = int(os.environ.get("GROQ_MAX_TOKENS", "1024"))

    prompt = _PROMPTS.SENTIMENT_ANALYSIS.format(
        attributes=json.dumps(attributes),
        review=review,
    )
    resp = await client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=temp,
        max_tokens=max_t,
    )
    return _parse_json(resp.choices[0].message.content)


def compute_metrics(preds: list[dict], truths: list[dict]) -> tuple[dict, dict]:
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


def _print_overall(overall: dict) -> None:
    W = 62
    print(f"\n{'='*W}")
    print(f"  Overall  (N = {overall['n_reviews']} reviews)")
    print(f"{'='*W}")
    print(f"  Precision : {overall['precision']:.4f}")
    print(f"  Recall    : {overall['recall']:.4f}")
    print(f"  F1        : {overall['f1']:.4f}")
    print(f"  MAE       : {overall['mae']:.4f}   RMSE: {overall['rmse']:.4f}")
    print(f"  TP={overall['tp']}  FP={overall['fp']}  FN={overall['fn']}")
    print(f"{'='*W}\n")


def _print_per_attr(per_attr: dict) -> None:
    print(f"  {'Attribute':<30} {'P':>6} {'R':>6} {'F1':>6} {'MAE':>7}")
    print(f"  {'-'*55}")
    for attr, d in sorted(per_attr.items()):
        tp_a, fp_a, fn_a = d["tp"], d["fp"], d["fn"]
        p  = tp_a / (tp_a + fp_a) if (tp_a + fp_a) else 0.0
        r  = tp_a / (tp_a + fn_a) if (tp_a + fn_a) else 0.0
        f1 = 2 * p * r / (p + r) if (p + r) else 0.0
        mae   = sum(d["errors"]) / len(d["errors"]) if d["errors"] else float("nan")
        mae_s = f"{mae:.4f}" if not math.isnan(mae) else "--"
        print(f"  {attr:<30} {p:>6.4f} {r:>6.4f} {f1:>6.4f} {mae_s:>7}")


async def main() -> None:
    print("\n" + "=" * 62)
    print("  LLM Sentiment Analysis — Offline Evaluation")
    print("=" * 62)

    attributes: list[str] = []
    try:
        from app.database.prisma_service import get_prisma_client, close_prisma_client
        db    = await get_prisma_client()
        attrs = await db.attribute.find_many()
        await close_prisma_client()
        attributes = [a.name for a in attrs]
        print(f"[DB] {len(attributes)} attributes loaded")
    except Exception as exc:
        attributes = ATTRIBUTES
        print(f"[DB] Cannot connect ({exc}) — using fallback list ({len(attributes)} attributes)")

    valid_attrs = set(attributes)
    filtered = [
        (rev, {a: s for a, s in truth.items() if a in valid_attrs})
        for rev, truth in GOLDEN_SET
    ]
    filtered = [(rev, t) for rev, t in filtered if t]
    print(f"[GOLDEN] {len(filtered)}/{len(GOLDEN_SET)} reviews after attribute filtering")

    preds:  list[dict] = []
    truths: list[dict] = []

    print("\n[A] Running golden-set evaluation via Groq ...")
    for i, (review, truth) in enumerate(filtered):
        try:
            pred = await call_groq(review, attributes)
            print(f"  [{i+1:02d}/{len(filtered)}] truth={truth}")
            print(f"           pred ={pred}")
        except Exception as exc:
            print(f"  [{i+1:02d}/{len(filtered)}] ERROR: {exc}")
            pred = {}
        preds.append(pred)
        truths.append(truth)

    overall, per_attr = compute_metrics(preds, truths)
    _print_overall(overall)
    _print_per_attr(per_attr)

    export = {
        "overall": overall,
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
    print(f"\n[OUT] {json_path}")


if __name__ == "__main__":
    asyncio.run(main())
