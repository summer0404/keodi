"""
Offline evaluation of LightGBM Learning-to-Rank model.

Protocol : Leave-One-Out (LOO) – 1 positive + K negatives per user
Metrics  : NDCG@5, NDCG@10, Hit@5, Hit@10, MRR
Extras   : Bootstrap 95% CI | 5-fold CV | Feature ablation | Pool-size sensitivity
Data     : Real DB (if available) + Synthetic (500 users × 2 000 places × 12 attrs)

Run from intelligence-service/:
    python evaluation/evaluate_ranking.py
"""

import sys, os

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_SVC_DIR  = os.path.dirname(_THIS_DIR)
sys.path.insert(0, _SVC_DIR)
os.chdir(_SVC_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(_SVC_DIR, ".env"))

import asyncio, json, math, random
from collections import defaultdict
from datetime import datetime, timezone

import lightgbm as lgb
import numpy as np
import pandas as pd

# ── Constants ─────────────────────────────────────────────────────────────────
TIME_DECAY            = 0.05
MIN_OVERLAP_THRESHOLD = 0.2
FEATURE_COLS          = ["cosine_sim", "max_match", "dealbreaker", "overlap_count"]
N_NEGATIVES           = 19
N_BOOTSTRAP           = 1000
K_FOLDS               = 5
RANDOM_SEED           = 42

# Pool sizes swept in sensitivity analysis (n_neg → pool = n_neg + 1)
POOL_SWEEP = [9, 19, 49, 99]

# Feature subsets for ablation study
ABLATION_CONFIGS: dict[str, list[str]] = {
    "Đầy đủ (4 đặc trưng)": ["cosine_sim", "max_match", "dealbreaker", "overlap_count"],
    "Không dealbreaker":     ["cosine_sim", "max_match", "overlap_count"],
    "Không overlap_count":   ["cosine_sim", "max_match", "dealbreaker"],
    "Chỉ cosine_sim":        ["cosine_sim"],
}


# ── Feature engineering (mirrors ranking_service._extract_features) ───────────

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


# ── Ranking metrics ────────────────────────────────────────────────────────────

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


def bootstrap_ci(
    ranks: list[int],
    ks: tuple = (5, 10),
    n_boot: int = N_BOOTSTRAP,
    alpha: float = 0.05,
    seed: int = RANDOM_SEED,
) -> dict[str, tuple[float, float]]:
    """Bootstrap 95% CI for each metric. Returns {metric: (lo, hi)}."""
    rng = random.Random(seed)
    n   = len(ranks)
    boot: dict[str, list] = defaultdict(list)
    for _ in range(n_boot):
        sample = [rng.choice(ranks) for _ in range(n)]
        for met, val in summarise(sample, ks).items():
            boot[met].append(val)
    ci: dict[str, tuple[float, float]] = {}
    for met, vals in boot.items():
        vals.sort()
        lo_i = int(n_boot * alpha / 2)
        hi_i = min(int(n_boot * (1 - alpha / 2)), len(vals) - 1)
        ci[met] = (vals[lo_i], vals[hi_i])
    return ci


# ── Real data loading ──────────────────────────────────────────────────────────

def _parse_dt(val) -> datetime:
    if isinstance(val, datetime):
        return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
    return datetime.fromisoformat(str(val)).replace(tzinfo=timezone.utc)


async def load_from_db():
    from app.database.prisma_service import get_prisma_client, close_prisma_client

    print("[DB] Connecting …")
    db = await get_prisma_client()

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
    users_count     = await db.query_raw("SELECT COUNT(*)::int AS n FROM users")

    await close_prisma_client()

    LABEL = {
        "GET_DIRECTION": 5, "RATE_5": 5,
        "RATE_4": 4, "FAVORITE": 4,
        "RATE_3": 2, "READ_REVIEWS": 2, "CLICK": 2,
        "RATE_2": 0, "RATE_1": 0,
    }

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

    place_ratings     = {r["id"]: (r["rating"] or 0.0) for r in places_raw}
    places_with_attrs = set(place_attr_dict)

    n_total_places   = len(place_ratings)
    n_places_w_attr  = len(places_with_attrs)
    n_total_users    = users_count[0]["n"] if users_count else 0

    print(
        f"[DB] {len(user_actions)} users with ≥1 positive action  "
        f"| {n_places_w_attr}/{n_total_places} places with attributes "
        f"({100*n_places_w_attr/max(n_total_places, 1):.1f}%)"
    )
    db_stats = {
        "n_total_users":      n_total_users,
        "n_total_places":     n_total_places,
        "n_places_with_attrs": n_places_w_attr,
        "n_users_with_actions": len(user_actions),
    }
    return user_actions, user_attr_dict, place_attr_dict, place_ratings, places_with_attrs, db_stats


# ── LOO evaluation loop ────────────────────────────────────────────────────────

def loo_eval(
    model,
    user_actions: dict,
    user_attr_dict: dict,
    place_attr_dict: dict,
    place_ratings: dict,
    places_with_attrs: set,
    feature_cols: list[str] = FEATURE_COLS,
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
        latest: dict[str, dict] = {}
        for a in actions:
            pid = a["place_id"]
            if pid not in latest or a["created_at"] > latest[pid]["created_at"]:
                latest[pid] = a

        unique_pids = sorted(latest, key=lambda p: latest[p]["created_at"])
        if len(unique_pids) < 2:
            skipped += 1
            continue

        test_pid   = unique_pids[-1]
        interacted = set(unique_pids)

        neg_pool = [p for p in all_places if p not in interacted]
        if len(neg_pool) < n_neg:
            skipped += 1
            continue

        negatives  = random.sample(neg_pool, n_neg)
        candidates = [test_pid] + negatives

        u_attrs = user_attr_dict.get(uid, {})
        feats   = [extract_features(u_attrs, place_attr_dict.get(p, {})) for p in candidates]
        pop_sc  = [place_ratings.get(p, 0.0) for p in candidates]

        df     = pd.DataFrame(feats, columns=FEATURE_COLS)[feature_cols]
        lgb_sc = model.predict(df).tolist() if model else [0.0] * len(candidates)

        rnd_sc = list(range(len(candidates)))
        random.shuffle(rnd_sc)

        lgb_ranks.append(_rank(lgb_sc, 0))
        pop_ranks.append(_rank(pop_sc, 0))
        rnd_ranks.append(_rank(rnd_sc, 0))
        eligible += 1

    return {
        "LightGBM (đề xuất)": lgb_ranks,
        "Popularity":         pop_ranks,
        "Random":             rnd_ranks,
    }, eligible


# ── Synthetic data generation ──────────────────────────────────────────────────

def build_synthetic(n_users=500, n_places=2000, n_attrs=12, seed=RANDOM_SEED):
    """
    Generate a controlled synthetic dataset that mirrors production conditions:
    - Users have mixed preferences (some strong, some neutral)
    - Places have non-negative attribute scores (like production placeattribute)
    - Interactions are generated based on genuine cosine similarity match
    """
    rng   = random.Random(seed)
    attrs = [f"A{i}" for i in range(n_attrs)]

    user_prefs = {
        f"U{u}": {a: rng.uniform(-1.0, 1.0) for a in attrs}
        for u in range(n_users)
    }
    place_attrs = {
        f"P{p}": {a: rng.uniform(-1.0, 1.0) for a in attrs}
        for p in range(n_places)
    }
    place_rats = {f"P{p}": rng.uniform(2.5, 5.0) for p in range(n_places)}

    user_actions: dict[str, list] = defaultdict(list)
    for uid, prefs in user_prefs.items():
        scores = sorted(
            ((pid, extract_features(prefs, pa)[0]) for pid, pa in place_attrs.items()),
            key=lambda x: x[1], reverse=True,
        )
        top_n = rng.randint(5, 15)
        liked = [pid for pid, cs in scores if cs > 0.15][:top_n]
        if len(liked) < 3:
            liked = [pid for pid, _ in scores[:max(3, top_n)]]
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
    feature_cols: list[str] = FEATURE_COLS,
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

        if not unique:
            continue

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
    X, y   = df[feature_cols], df["label"]
    groups = df.groupby("user_id", sort=False).size().tolist()

    params = dict(
        objective="lambdarank", metric="ndcg", boosting_type="gbdt",
        num_leaves=31, learning_rate=0.05, feature_fraction=0.9,
        min_data_in_leaf=1, min_data_in_bin=1, verbose=-1,
    )
    return lgb.train(params, lgb.Dataset(X, label=y, group=groups), num_boost_round=100)


# ── K-fold cross-validation ────────────────────────────────────────────────────

def kfold_eval_synthetic(
    syn_act, syn_u, syn_p, syn_r, syn_pw,
    k: int = K_FOLDS,
    seed: int = RANDOM_SEED,
    feature_cols: list[str] = FEATURE_COLS,
    n_neg: int = N_NEGATIVES,
) -> tuple[dict, list]:
    """K-fold CV on pre-built synthetic data. Returns aggregated ranks + per-fold metrics."""
    users = list(syn_act.keys())
    rng   = random.Random(seed)
    rng.shuffle(users)

    agg_ranks: dict[str, list] = defaultdict(list)
    fold_metrics: list[dict]   = []
    fold_size = max(1, len(users) // k)

    for fold_i in range(k):
        start   = fold_i * fold_size
        end     = (fold_i + 1) * fold_size if fold_i < k - 1 else len(users)
        test_u  = set(users[start:end])
        train_u = set(users) - test_u

        model    = train_lgb_on_synthetic(syn_act, syn_u, syn_p, train_u, feature_cols)
        test_act = {u: syn_act[u] for u in test_u if u in syn_act}
        res, n_eligible = loo_eval(
            model, test_act, syn_u, syn_p, syn_r, syn_pw,
            feature_cols=feature_cols, n_neg=n_neg, seed=seed + fold_i,
        )

        for method, ranks in res.items():
            agg_ranks[method].extend(ranks)
        fold_metrics.append({m: summarise(r) for m, r in res.items()})

        lgb_m = summarise(res["LightGBM (đề xuất)"])
        print(
            f"    Fold {fold_i+1}/{k} | N={n_eligible:3d} "
            f"| LGB NDCG@5={lgb_m.get('ndcg@5', 0):.4f} "
            f"MRR={lgb_m.get('mrr', 0):.4f}"
        )

    return dict(agg_ranks), fold_metrics


# ── Ablation study ─────────────────────────────────────────────────────────────

def ablation_study(
    syn_act, syn_u, syn_p, syn_r, syn_pw,
    seed: int = RANDOM_SEED,
) -> dict:
    """Run 5-fold CV for each feature configuration and compare NDCG@5 / MRR."""
    results = {}
    for config_name, feat_cols in ABLATION_CONFIGS.items():
        print(f"  [{config_name}] …")
        agg_ranks, _ = kfold_eval_synthetic(
            syn_act, syn_u, syn_p, syn_r, syn_pw,
            feature_cols=feat_cols, seed=seed,
        )
        results[config_name] = summarise(agg_ranks["LightGBM (đề xuất)"])
    return results


# ── Pool-size sensitivity ──────────────────────────────────────────────────────

def pool_sensitivity(
    syn_act, syn_u, syn_p, syn_r, syn_pw,
    seed: int = RANDOM_SEED,
) -> dict:
    """Evaluate model across pool sizes using a fixed 80/20 split."""
    users = list(syn_act.keys())
    random.seed(seed)
    random.shuffle(users)
    n_train  = int(len(users) * 0.8)
    tr_users = set(users[:n_train])
    te_users = set(users[n_train:])

    model    = train_lgb_on_synthetic(syn_act, syn_u, syn_p, tr_users)
    test_act = {u: syn_act[u] for u in te_users if u in syn_act}

    results = {}
    for n_neg in POOL_SWEEP:
        pool_size = n_neg + 1
        res, n_e  = loo_eval(model, test_act, syn_u, syn_p, syn_r, syn_pw,
                             n_neg=n_neg, seed=seed)
        results[pool_size] = {m: summarise(r) for m, r in res.items()}
        m_lgb = results[pool_size].get("LightGBM (đề xuất)", {})
        m_rnd = results[pool_size].get("Random", {})
        print(
            f"  Pool={pool_size:4d} | N={n_e:3d} "
            f"| LGB NDCG@5={m_lgb.get('ndcg@5', 0):.4f} "
            f"Rnd NDCG@5={m_rnd.get('ndcg@5', 0):.4f}"
        )
    return results


# ── Print helpers ──────────────────────────────────────────────────────────────

def print_table(
    results: dict,
    n: int,
    title: str,
    ci_map: dict | None = None,
) -> None:
    W = 86
    print(f"\n{'='*W}")
    print(f"  {title}  (N = {n} người dùng)")
    print(f"{'='*W}")
    hdr = f"  {'Phương pháp':<24} {'NDCG@5':>8} {'NDCG@10':>9} {'Hit@5':>7} {'Hit@10':>8} {'MRR':>7}"
    if ci_map:
        hdr += "   95% CI (NDCG@5)"
    print(hdr)
    print(f"  {'-'*(W-4)}")

    for method in ("LightGBM (đề xuất)", "Popularity", "Random"):
        ranks = results.get(method, [])
        m     = summarise(ranks)
        if not m:
            continue
        line = (
            f"  {method:<24} {m['ndcg@5']:>8.4f} {m['ndcg@10']:>9.4f} "
            f"{m['hit@5']:>7.4f} {m['hit@10']:>8.4f} {m['mrr']:>7.4f}"
        )
        if ci_map and method in ci_map:
            lo, hi = ci_map[method].get("ndcg@5", (0.0, 0.0))
            line += f"   [{lo:.4f} – {hi:.4f}]"
        print(line)
    print(f"{'='*W}\n")


_POOL_WORDS = {10: "Ten", 20: "Twenty", 50: "Fifty", 100: "Hundred"}


def _metric_to_cmd(metric: str) -> str:
    """Convert metric name to a LaTeX-safe command suffix (letters only, no digits)."""
    return (metric
            .replace("ndcg@5",  "NDCGFive")
            .replace("ndcg@10", "NDCGTen")
            .replace("hit@5",   "HitFive")
            .replace("hit@10",  "HitTen")
            .replace("mrr",     "MRR"))


# ── LaTeX export ───────────────────────────────────────────────────────────────

def write_latex_metrics(all_results: dict, out_dir: str) -> None:
    lines = [
        "% Auto-generated by evaluate_ranking.py — do not edit manually",
        "% Re-run the script to refresh these values",
        "% Uses \\renewcommand so it overrides defaults in evaluation_report.tex",
        "",
    ]

    def fmt(v):
        if isinstance(v, float):
            return f"{v:.4f}"
        return str(v) if v is not None else "--"

    # ── Main metrics: real + synthetic (5-fold CV aggregate) ─────────────────
    for dataset_key, tex_key in [("real", "Real"), ("synthetic_cv", "Syn")]:
        data = all_results.get(dataset_key, {})
        for method, mkey in [
            ("LightGBM (đề xuất)", "LGB"),
            ("Popularity",         "Pop"),
            ("Random",             "Rnd"),
        ]:
            m = data.get(method, {})
            for metric in ("ndcg@5", "ndcg@10", "hit@5", "hit@10", "mrr"):
                cmd = f"\\Rank{tex_key}{mkey}{_metric_to_cmd(metric)}"
                lines.append(f"\\renewcommand{{{cmd}}}{{{fmt(m.get(metric, '??'))}}}")
            # Bootstrap CI for LGB only
            if mkey == "LGB":
                ci = data.get("LightGBM (đề xuất)_ci", {})
                for metric in ("ndcg@5", "mrr"):
                    pair = ci.get(metric, ("??", "??"))
                    lo, hi = (pair[0], pair[1]) if isinstance(pair, (list, tuple)) else ("??", "??")
                    cmd_lo = f"\\Rank{tex_key}{mkey}{_metric_to_cmd(metric)}Lo"
                    cmd_hi = f"\\Rank{tex_key}{mkey}{_metric_to_cmd(metric)}Hi"
                    lines.append(f"\\renewcommand{{{cmd_lo}}}{{{fmt(lo)}}}")
                    lines.append(f"\\renewcommand{{{cmd_hi}}}{{{fmt(hi)}}}")

        lines.append(f"\\renewcommand{{\\Rank{tex_key}NUsers}}{{{data.get('n_users', '??')}}}")
        lines.append("")

    # ── Ablation metrics ──────────────────────────────────────────────────────
    abl = all_results.get("ablation", {})
    abl_cmd_map = {
        "Đầy đủ (4 đặc trưng)": "AblFull",
        "Không dealbreaker":     "AblNoDeal",
        "Không overlap_count":   "AblNoOver",
        "Chỉ cosine_sim":        "AblCosOnly",
    }
    for config_name, cmd_key in abl_cmd_map.items():
        m = abl.get(config_name, {})
        for metric in ("ndcg@5", "hit@5", "mrr"):
            cmd = f"\\{cmd_key}{_metric_to_cmd(metric)}"
            lines.append(f"\\renewcommand{{{cmd}}}{{{fmt(m.get(metric, '??'))}}}")
    lines.append("")

    # ── Pool sensitivity metrics ──────────────────────────────────────────────
    pool_data = all_results.get("pool_sensitivity", {})
    for pool_size in [10, 20, 50, 100]:
        pool_word = _POOL_WORDS[pool_size]
        for method, mkey in [("LightGBM (đề xuất)", "LGB"), ("Random", "Rnd")]:
            m = pool_data.get(pool_size, {}).get(method, {})
            for metric in ("ndcg@5", "mrr"):
                cmd = f"\\Pool{pool_word}{mkey}{_metric_to_cmd(metric)}"
                lines.append(f"\\renewcommand{{{cmd}}}{{{fmt(m.get(metric, '??'))}}}")
    lines.append("")

    # ── Dataset / protocol info ───────────────────────────────────────────────
    lines += [
        f"\\renewcommand{{\\SynNFolds}}{{{K_FOLDS}}}",
        f"\\renewcommand{{\\SynNUsers}}{{500}}",
        f"\\renewcommand{{\\SynNPlaces}}{{2000}}",
        f"\\renewcommand{{\\SynNAttrs}}{{12}}",
        "",
    ]

    # ── DB coverage stats ─────────────────────────────────────────────────────
    real_data  = all_results.get("real", {})
    db_stats   = real_data.get("db_stats", {})
    lines += [
        f"\\renewcommand{{\\DBTotalPlaces}}{{{db_stats.get('n_total_places', '??')}}}",
        f"\\renewcommand{{\\DBPlacesWithAttrs}}{{{db_stats.get('n_places_with_attrs', '??')}}}",
        f"\\renewcommand{{\\DBTotalUsers}}{{{db_stats.get('n_total_users', '??')}}}",
        "",
    ]

    path = os.path.join(out_dir, "ranking_metrics.tex")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"[TEX] LaTeX metrics → {path}")


# ── Main ───────────────────────────────────────────────────────────────────────

async def main() -> None:
    print("\n" + "=" * 86)
    print("  LightGBM Learning-to-Rank — Comprehensive Offline Evaluation")
    print("=" * 86)

    model_path     = os.path.join(_SVC_DIR, "models_artifacts", "lightgbm_ranking_model.txt")
    deployed_model = None
    try:
        deployed_model = lgb.Booster(model_file=model_path)
        print(f"[MODEL] Loaded deployed LightGBM from {model_path}")
    except Exception as e:
        print(f"[MODEL] Could not load deployed model: {e}")

    all_results: dict = {}

    # ── 1. Real-data evaluation ───────────────────────────────────────────────
    print("\n[1/4] Real-data evaluation (LOO, deployed model) …")
    print("      Note: deployed model was trained on full history; LOO here is")
    print("      for reference only — synthetic CV (step 2) is the primary benchmark.")
    try:
        u_act, u_attr, p_attr, p_rat, p_wa, db_stats = await load_from_db()
        res_real, n_real = loo_eval(deployed_model, u_act, u_attr, p_attr, p_rat, p_wa)
        if n_real > 0:
            print_table(res_real, n_real, "Xếp hạng — Dữ liệu thực (LOO, tham khảo)")
            all_results["real"] = {
                "n_users": n_real,
                "db_stats": db_stats,
                **{m: summarise(r) for m, r in res_real.items()},
            }
        else:
            print("[INFO] Không đủ người dùng đủ điều kiện — bỏ qua real-data metrics.")
            all_results["real"] = {"n_users": 0, "db_stats": db_stats}
    except Exception as exc:
        print(f"[DB] Không thể kết nối: {exc}")
        all_results["real"] = {"n_users": 0, "db_stats": {}}

    # ── 2. Synthetic — 5-fold CV ──────────────────────────────────────────────
    print(f"\n[2/4] Synthetic {K_FOLDS}-fold CV "
          f"(500 users × 2 000 places × 12 attrs) …")
    syn_act, syn_u, syn_p, syn_r, syn_pw = build_synthetic(500, 2000, 12)

    agg_ranks, fold_metrics = kfold_eval_synthetic(
        syn_act, syn_u, syn_p, syn_r, syn_pw
    )
    n_syn = len(agg_ranks["LightGBM (đề xuất)"])

    # Bootstrap CI on aggregated ranks
    ci_map: dict = {}
    for method, ranks in agg_ranks.items():
        ci_map[method] = bootstrap_ci(ranks)

    print_table(
        agg_ranks, n_syn,
        f"Xếp hạng — Dữ liệu tổng hợp ({K_FOLDS}-fold CV, 95% CI)",
        ci_map=ci_map,
    )

    # Per-fold std
    print("  Per-fold NDCG@5 (LightGBM):", end=" ")
    fold_ndcg = [fm["LightGBM (đề xuất)"].get("ndcg@5", 0) for fm in fold_metrics]
    print("  ".join(f"{v:.4f}" for v in fold_ndcg))
    mean_ndcg = sum(fold_ndcg) / len(fold_ndcg)
    std_ndcg  = (sum((v - mean_ndcg) ** 2 for v in fold_ndcg) / len(fold_ndcg)) ** 0.5
    print(f"  Mean={mean_ndcg:.4f}  Std={std_ndcg:.4f}")

    all_results["synthetic_cv"] = {
        "n_users": n_syn,
        **{m: summarise(r) for m, r in agg_ranks.items()},
        "LightGBM (đề xuất)_ci": ci_map.get("LightGBM (đề xuất)", {}),
        "fold_ndcg5_mean": mean_ndcg,
        "fold_ndcg5_std":  std_ndcg,
    }
    all_results["synthetic"] = all_results["synthetic_cv"]  # backward compat

    # ── 3. Ablation study ─────────────────────────────────────────────────────
    print(f"\n[3/4] Feature ablation study ({K_FOLDS}-fold CV per config) …")
    abl = ablation_study(syn_act, syn_u, syn_p, syn_r, syn_pw)
    all_results["ablation"] = abl

    W = 62
    print(f"\n  {'='*W}")
    print(f"  Ablation — Đóng góp của từng đặc trưng")
    print(f"  {'='*W}")
    print(f"  {'Cấu hình':<32} {'NDCG@5':>8} {'Hit@5':>7} {'MRR':>8}")
    print(f"  {'-'*58}")
    for cfg_name, m in abl.items():
        print(f"  {cfg_name:<32} {m.get('ndcg@5', 0):>8.4f} "
              f"{m.get('hit@5', 0):>7.4f} {m.get('mrr', 0):>8.4f}")
    print(f"  {'='*W}\n")

    # ── 4. Pool-size sensitivity ──────────────────────────────────────────────
    print("\n[4/4] Pool-size sensitivity …")
    pool_res = pool_sensitivity(syn_act, syn_u, syn_p, syn_r, syn_pw)
    all_results["pool_sensitivity"] = pool_res

    # ── Export ────────────────────────────────────────────────────────────────
    json_path = os.path.join(_THIS_DIR, "ranking_results.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False, default=str)
    print(f"\n[OUT] JSON  → {json_path}")

    write_latex_metrics(all_results, _THIS_DIR)


if __name__ == "__main__":
    asyncio.run(main())
