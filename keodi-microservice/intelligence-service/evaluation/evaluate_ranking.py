"""
Offline evaluation of LightGBM Learning-to-Rank model.

Protocol : Leave-One-Out (LOO) – 1 positive + 19 negatives per user
Metrics  : NDCG@5, NDCG@10, Hit@5, Hit@10, MRR
Baselines: Random  |  Popularity (Google rating)
Data     : Tries real DB first → falls back to synthetic when too sparse

Run from intelligence-service/ :
    python evaluation/evaluate_ranking.py
"""

import sys, os

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_SVC_DIR  = os.path.dirname(_THIS_DIR)
sys.path.insert(0, _SVC_DIR)
os.chdir(_SVC_DIR)                    # so .env / model path resolve correctly

from dotenv import load_dotenv
load_dotenv(os.path.join(_SVC_DIR, ".env"))

import asyncio, json, math, random
from collections import defaultdict
from datetime import datetime, timezone

import lightgbm as lgb
import numpy as np
import pandas as pd

# ─── Constants (same as app/common/constant.py) ───────────────────────────────
TIME_DECAY            = 0.05
MIN_OVERLAP_THRESHOLD = 0.2
FEATURE_COLS          = ["cosine_sim", "max_match", "dealbreaker", "overlap_count"]
N_NEGATIVES           = 19
RANDOM_SEED           = 42

# ─── Feature engineering (mirrors ranking_service._extract_features) ─────────

def _decay(score: float, now: datetime, updated: datetime) -> float:
    days = (now - updated).total_seconds() / 86400.0
    return score * math.exp(-TIME_DECAY * days)


def extract_features(user_attrs: dict, place_attrs: dict) -> tuple:
    cosine_sim = max_match = dealbreaker = 0.0
    overlap_count = 0
    if user_attrs and place_attrs:
        dot = u_sq = p_sq = 0.0
        prods: list[float] = []
        for attr in set(user_attrs) | set(place_attrs):
            u = user_attrs.get(attr, 0.0)
            p = place_attrs.get(attr, 0.0)
            u_sq += u * u
            p_sq += p * p
            if u != 0.0 and p != 0.0:
                prod = u * p
                dot  += prod
                prods.append(prod)
                if u > MIN_OVERLAP_THRESHOLD and p > MIN_OVERLAP_THRESHOLD:
                    overlap_count += 1
        if u_sq > 0 and p_sq > 0:
            cosine_sim = dot / (math.sqrt(u_sq) * math.sqrt(p_sq))
        if prods:
            max_match   = max(prods)
            dealbreaker = min(prods)
    return cosine_sim, max_match, dealbreaker, overlap_count


# ─── Ranking metrics ──────────────────────────────────────────────────────────

def _rank(scores: list[float], pos_idx: int) -> int:
    """1-based rank of pos_idx after sorting scores descending."""
    order = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
    return order.index(pos_idx) + 1


def ndcg_at(rank: int, k: int) -> float:
    return 1.0 / math.log2(rank + 1) if rank <= k else 0.0


def hit_at(rank: int, k: int) -> float:
    return 1.0 if rank <= k else 0.0


def summarise(ranks: list[int], ks=(5, 10)) -> dict:
    n = len(ranks)
    if n == 0:
        return {}
    out: dict = {}
    for k in ks:
        out[f"ndcg@{k}"] = sum(ndcg_at(r, k) for r in ranks) / n
        out[f"hit@{k}"]  = sum(hit_at(r, k)  for r in ranks) / n
    out["mrr"] = sum(1.0 / r for r in ranks) / n
    return out


# ─── Real data loading ────────────────────────────────────────────────────────

def _parse_dt(val) -> datetime:
    if isinstance(val, datetime):
        return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
    return datetime.fromisoformat(str(val)).replace(tzinfo=timezone.utc)


async def load_from_db():
    from app.database.prisma_service import get_prisma_client, close_prisma_client

    print("[DB] Connecting …")
    db = await get_prisma_client()

    # Use raw SQL to cast enum → text (same pattern as ranking_service.py)
    actions_raw = await db.query_raw(
        """
        SELECT user_id, place_id, action::text AS action,
               created_at AT TIME ZONE 'UTC' AS created_at
        FROM   user_actions
        ORDER  BY created_at ASC
        """
    )

    user_attrs_raw  = await db.userattribute.find_many()
    place_attrs_raw = await db.placeattribute.find_many()
    places_raw      = await db.query_raw("SELECT id, rating FROM places")

    await close_prisma_client()

    # Action → relevance label mapping (same as ranking_service)
    LABEL = {
        "GET_DIRECTION": 5, "RATE_5": 5,
        "RATE_4": 4, "FAVORITE": 4,
        "RATE_3": 2, "READ_REVIEWS": 2, "CLICK": 2,
        "RATE_2": 0, "RATE_1": 0,
    }

    # Only keep positive interactions (label >= 2) as potential test items
    user_actions: dict[str, list] = defaultdict(list)
    for r in actions_raw:
        if LABEL.get(r["action"], 1) >= 2:
            user_actions[r["user_id"]].append({
                "place_id":   r["place_id"],
                "created_at": _parse_dt(r["created_at"]),
            })

    now = datetime.now(timezone.utc)

    user_attr_dict: dict[str, dict] = defaultdict(dict)
    for ua in user_attrs_raw:
        user_attr_dict[ua.userId][ua.attributeId] = _decay(ua.score, now, ua.updatedAt)

    place_attr_dict: dict[str, dict] = defaultdict(dict)
    for pa in place_attrs_raw:
        place_attr_dict[pa.placeId][pa.attributeId] = pa.score

    place_ratings = {r["id"]: (r["rating"] or 0.0) for r in places_raw}
    places_with_attrs = set(place_attr_dict)

    print(
        f"[DB] {len(user_actions)} users with ≥1 positive action  "
        f"| {len(places_with_attrs)} places with attributes"
    )
    return user_actions, user_attr_dict, place_attr_dict, place_ratings, places_with_attrs


# ─── LOO evaluation loop ──────────────────────────────────────────────────────

def loo_eval(
    model: lgb.Booster | None,
    user_actions: dict,
    user_attr_dict: dict,
    place_attr_dict: dict,
    place_ratings: dict,
    places_with_attrs: set,
    n_neg: int = N_NEGATIVES,
    seed: int = RANDOM_SEED,
) -> tuple[dict, int]:
    random.seed(seed)
    all_places = list(places_with_attrs)
    n_neg = min(n_neg, len(all_places) - 1)

    lgb_ranks: list[int] = []
    pop_ranks: list[int] = []
    rnd_ranks: list[int] = []
    eligible = skipped = 0

    for uid, actions in user_actions.items():
        # Deduplicate: keep most recent action per place
        latest: dict[str, dict] = {}
        for a in actions:
            pid = a["place_id"]
            if pid not in latest or a["created_at"] > latest[pid]["created_at"]:
                latest[pid] = a

        unique_pids = sorted(latest, key=lambda p: latest[p]["created_at"])
        if len(unique_pids) < 2:
            skipped += 1
            continue

        test_pid   = unique_pids[-1]          # hold out the most recent
        interacted = set(unique_pids)

        neg_pool = [p for p in all_places if p not in interacted]
        if len(neg_pool) < n_neg:
            skipped += 1
            continue

        negatives  = random.sample(neg_pool, n_neg)
        candidates = [test_pid] + negatives   # index 0 = positive item

        u_attrs = user_attr_dict.get(uid, {})
        feats   = [extract_features(u_attrs, place_attr_dict.get(p, {})) for p in candidates]
        pop_sc  = [place_ratings.get(p, 0.0) for p in candidates]

        # LightGBM scores
        df = pd.DataFrame(feats, columns=FEATURE_COLS)
        lgb_sc = model.predict(df).tolist() if model else [0.0] * len(candidates)

        # Random scores (just a shuffled index)
        rnd_sc = list(range(len(candidates)))
        random.shuffle(rnd_sc)

        lgb_ranks.append(_rank(lgb_sc, 0))
        pop_ranks.append(_rank(pop_sc, 0))
        rnd_ranks.append(_rank(rnd_sc, 0))
        eligible += 1

    print(f"[LOO] eligible={eligible}  skipped={skipped}")
    return {
        "LightGBM (đề xuất)": lgb_ranks,
        "Popularity": pop_ranks,
        "Random":     rnd_ranks,
    }, eligible


# ─── Synthetic data generation ────────────────────────────────────────────────

def build_synthetic(n_users=80, n_places=400, n_attrs=8, seed=RANDOM_SEED):
    rng   = random.Random(seed)
    attrs = [f"A{i}" for i in range(n_attrs)]

    user_prefs  = {
        f"U{u}": {a: rng.uniform(-1.0, 1.0) for a in attrs}
        for u in range(n_users)
    }
    place_attrs = {
        f"P{p}": {a: max(0.0, rng.uniform(-0.2, 1.0)) for a in attrs}
        for p in range(n_places)
    }
    place_rats  = {f"P{p}": rng.uniform(2.5, 5.0) for p in range(n_places)}

    user_actions: dict[str, list] = defaultdict(list)
    for uid, prefs in user_prefs.items():
        scores = sorted(
            ((pid, extract_features(prefs, pa)[0]) for pid, pa in place_attrs.items()),
            key=lambda x: x[1], reverse=True,
        )
        liked = [pid for pid, cs in scores if cs > 0.30][: rng.randint(3, 10)]
        if len(liked) < 2:
            continue
        for i, pid in enumerate(liked):
            user_actions[uid].append({
                "place_id":   pid,
                "created_at": datetime(2024, 1, min(28, i + 1), tzinfo=timezone.utc),
            })

    return user_actions, user_prefs, place_attrs, place_rats, set(place_attrs)


def train_lgb_on_synthetic(
    user_actions: dict,
    user_prefs:   dict,
    place_attrs:  dict,
    train_users:  set,
) -> lgb.Booster | None:
    rows = []
    rng  = random.Random(RANDOM_SEED)
    all_places = list(place_attrs)

    for uid in train_users:
        actions = user_actions.get(uid, [])
        unique: dict[str, dict] = {}
        for a in actions:
            pid = a["place_id"]
            if pid not in unique:
                unique[pid] = a

        u_attrs = user_prefs.get(uid, {})
        for pid in unique:
            cs, mm, db, oc = extract_features(u_attrs, place_attrs.get(pid, {}))
            rows.append(dict(user_id=uid, label=4,
                             cosine_sim=cs, max_match=mm, dealbreaker=db, overlap_count=oc))

        neg_pool = [p for p in all_places if p not in unique]
        for p in rng.sample(neg_pool, min(5, len(neg_pool))):
            cs, mm, db, oc = extract_features(u_attrs, place_attrs.get(p, {}))
            rows.append(dict(user_id=uid, label=0,
                             cosine_sim=cs, max_match=mm, dealbreaker=db, overlap_count=oc))

    if not rows:
        return None

    df     = pd.DataFrame(rows).sort_values("user_id").reset_index(drop=True)
    X, y   = df[FEATURE_COLS], df["label"]
    groups = df.groupby("user_id", sort=False).size().tolist()

    params = dict(
        objective="lambdarank", metric="ndcg", boosting_type="gbdt",
        num_leaves=31, learning_rate=0.05, feature_fraction=0.9,
        min_data_in_leaf=1, min_data_in_bin=1, verbose=-1,
    )
    return lgb.train(params, lgb.Dataset(X, label=y, group=groups), num_boost_round=100)


# ─── Print + export ───────────────────────────────────────────────────────────

def print_table(results: dict, n: int, title: str) -> None:
    W = 76
    print(f"\n{'='*W}")
    print(f"  {title}  (N = {n} người dùng)")
    print(f"{'='*W}")
    print(f"  {'Phương pháp':<22} {'NDCG@5':>8} {'NDCG@10':>9} "
          f"{'Hit@5':>7} {'Hit@10':>8} {'MRR':>7}")
    print(f"  {'-'*70}")
    for method in ("LightGBM (đề xuất)", "Popularity", "Random"):
        ranks = results.get(method, [])
        m     = summarise(ranks)
        if not m:
            continue
        print(
            f"  {method:<22} {m['ndcg@5']:>8.4f} {m['ndcg@10']:>9.4f} "
            f"{m['hit@5']:>7.4f} {m['hit@10']:>8.4f} {m['mrr']:>7.4f}"
        )
    print(f"{'='*W}\n")


def _metric_to_cmd(metric: str) -> str:
    """'ndcg@5' → 'NDCG5',  'hit@10' → 'Hit10',  'mrr' → 'MRR'"""
    return (metric
            .replace("@", "")
            .replace("ndcg", "NDCG")
            .replace("hit", "Hit")
            .replace("mrr", "MRR"))


def write_latex_metrics(all_results: dict, out_dir: str) -> None:
    """Write \\newcommand definitions so evaluation_report.tex can use actual values."""
    lines = [
        "% Auto-generated by evaluate_ranking.py — do not edit manually",
        "% Re-run the script to refresh these values",
        "",
    ]

    def fmt(v):
        return f"{v:.4f}" if isinstance(v, float) else str(v)

    for dataset, key in [("real", "Real"), ("synthetic", "Syn")]:
        data = all_results.get(dataset, {})
        for method, mkey in [
            ("LightGBM (đề xuất)", "LGB"),
            ("Popularity",         "Pop"),
            ("Random",             "Rnd"),
        ]:
            m = data.get(method, {})
            for metric in ("ndcg@5", "ndcg@10", "hit@5", "hit@10", "mrr"):
                cmd = f"\\Rank{key}{mkey}{_metric_to_cmd(metric)}"
                val = m.get(metric, "??")
                lines.append(f"\\newcommand{{{cmd}}}{{{fmt(val)}}}")
        n_users = data.get("n_users", "??")
        lines.append(f"\\newcommand{{\\Rank{key}NUsers}}{{{n_users}}}")
        lines.append("")

    path = os.path.join(out_dir, "ranking_metrics.tex")
    with open(path, "w") as f:
        f.write("\n".join(lines))
    print(f"[TEX] LaTeX metrics → {path}")


# ─── Main ─────────────────────────────────────────────────────────────────────

async def main() -> None:
    print("\n" + "=" * 76)
    print("  LightGBM Learning-to-Rank — Offline Evaluation")
    print("=" * 76)

    # Load the deployed model
    model_path     = os.path.join(_SVC_DIR, "models_artifacts", "lightgbm_ranking_model.txt")
    deployed_model = None
    try:
        deployed_model = lgb.Booster(model_file=model_path)
        print(f"[MODEL] Loaded deployed LightGBM from {model_path}")
    except Exception as e:
        print(f"[MODEL] Could not load deployed model: {e}")

    all_results: dict = {}

    # ── Part 1: Real data ─────────────────────────────────────────────────────
    print("\n[1/2] Real-data evaluation (Leave-One-Out protocol) …")
    try:
        u_act, u_attr, p_attr, p_rat, p_wa = await load_from_db()
        res_real, n_real = loo_eval(deployed_model, u_act, u_attr, p_attr, p_rat, p_wa)
        if n_real > 0:
            print_table(res_real, n_real, "Xếp hạng — Dữ liệu thực (LOO)")
            all_results["real"] = {
                "n_users": n_real,
                **{m: summarise(r) for m, r in res_real.items()},
            }
        else:
            print("[INFO] Không đủ người dùng có ≥2 tương tác — bỏ qua real-data metrics.")
    except Exception as exc:
        print(f"[DB] Không thể kết nối: {exc}")
        print("[INFO] Chuyển sang đánh giá synthetic only.")

    # ── Part 2: Synthetic data ────────────────────────────────────────────────
    print("\n[2/2] Synthetic-data evaluation (80/20 train–test split) …")
    syn_act, syn_u, syn_p, syn_r, syn_pw = build_synthetic(
        n_users=80, n_places=400, n_attrs=8
    )

    users_all = list(syn_act)
    random.seed(RANDOM_SEED)
    random.shuffle(users_all)
    n_train     = int(len(users_all) * 0.8)
    train_users = set(users_all[:n_train])
    test_users  = set(users_all[n_train:])

    syn_model   = train_lgb_on_synthetic(syn_act, syn_u, syn_p, train_users)
    test_act    = {u: syn_act[u] for u in test_users if u in syn_act}

    res_syn, n_syn = loo_eval(syn_model, test_act, syn_u, syn_p, syn_r, syn_pw)
    print_table(res_syn, n_syn, "Xếp hạng — Dữ liệu tổng hợp (80/20 train–test)")

    all_results["synthetic"] = {
        "n_users": n_syn,
        **{m: summarise(r) for m, r in res_syn.items()},
    }

    # ── Export ────────────────────────────────────────────────────────────────
    json_path = os.path.join(_THIS_DIR, "ranking_results.json")
    with open(json_path, "w") as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    print(f"[OUT] JSON  → {json_path}")

    write_latex_metrics(all_results, _THIS_DIR)


if __name__ == "__main__":
    asyncio.run(main())
