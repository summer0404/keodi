import sys, os

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_SVC_DIR  = os.path.dirname(_THIS_DIR)
sys.path.insert(0, _THIS_DIR)
sys.path.insert(0, _SVC_DIR)
os.chdir(_SVC_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(_SVC_DIR, ".env"))

import asyncio, json, math, random
from collections import defaultdict
from datetime import datetime, timezone

import lightgbm as lgb
import pandas as pd

from config import (
    TIME_DECAY, MIN_OVERLAP_THRESHOLD, FEATURE_COLS,
    N_NEGATIVES, N_BOOTSTRAP, K_FOLDS, RANDOM_SEED,
    POOL_SWEEP, ABLATION_CONFIGS,
)


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
                dot += prod
                prods.append(prod)
                if u > MIN_OVERLAP_THRESHOLD and p > MIN_OVERLAP_THRESHOLD:
                    overlap_count += 1
        if u_sq > 0 and p_sq > 0:
            cosine_sim = dot / (math.sqrt(u_sq) * math.sqrt(p_sq))
        if prods:
            max_match   = max(prods)
            dealbreaker = min(prods)
    return cosine_sim, max_match, dealbreaker, overlap_count


def _rank(scores: list[float], pos_idx: int) -> int:
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
    rng  = random.Random(seed)
    n    = len(ranks)
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


def _parse_dt(val) -> datetime:
    if isinstance(val, datetime):
        return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
    return datetime.fromisoformat(str(val)).replace(tzinfo=timezone.utc)


async def load_from_db():
    from app.database.prisma_service import get_prisma_client, close_prisma_client

    print("[DB] Connecting ...")
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

    n_total_places  = len(place_ratings)
    n_places_w_attr = len(places_with_attrs)
    n_total_users   = users_count[0]["n"] if users_count else 0

    print(
        f"[DB] {len(user_actions)} users with >=1 positive action "
        f"| {n_places_w_attr}/{n_total_places} places with attributes "
        f"({100*n_places_w_attr/max(n_total_places, 1):.1f}%)"
    )
    db_stats = {
        "n_total_users":        n_total_users,
        "n_total_places":       n_total_places,
        "n_places_with_attrs":  n_places_w_attr,
        "n_users_with_actions": len(user_actions),
    }
    return user_actions, user_attr_dict, place_attr_dict, place_ratings, places_with_attrs, db_stats


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
        "LightGBM": lgb_ranks,
        "Popularity": pop_ranks,
        "Random":    rnd_ranks,
    }, eligible


def build_synthetic(n_users=500, n_places=2000, n_attrs=12, seed=RANDOM_SEED):
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


def kfold_eval_synthetic(
    syn_act, syn_u, syn_p, syn_r, syn_pw,
    k: int = K_FOLDS,
    seed: int = RANDOM_SEED,
    feature_cols: list[str] = FEATURE_COLS,
    n_neg: int = N_NEGATIVES,
) -> tuple[dict, list]:
    users     = list(syn_act.keys())
    rng       = random.Random(seed)
    rng.shuffle(users)
    fold_size = max(1, len(users) // k)

    agg_ranks: dict[str, list] = defaultdict(list)
    fold_metrics: list[dict]   = []

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

        lgb_m = summarise(res["LightGBM"])
        print(
            f"  Fold {fold_i+1}/{k} | N={n_eligible:3d} "
            f"| NDCG@5={lgb_m.get('ndcg@5', 0):.4f} "
            f"MRR={lgb_m.get('mrr', 0):.4f}"
        )

    return dict(agg_ranks), fold_metrics


def ablation_study(syn_act, syn_u, syn_p, syn_r, syn_pw, seed: int = RANDOM_SEED) -> dict:
    results = {}
    for config_name, feat_cols in ABLATION_CONFIGS.items():
        print(f"  [{config_name}]")
        agg_ranks, _ = kfold_eval_synthetic(
            syn_act, syn_u, syn_p, syn_r, syn_pw,
            feature_cols=feat_cols, seed=seed,
        )
        results[config_name] = summarise(agg_ranks["LightGBM"])
    return results


def pool_sensitivity(syn_act, syn_u, syn_p, syn_r, syn_pw, seed: int = RANDOM_SEED) -> dict:
    users    = list(syn_act.keys())
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
        m_lgb = results[pool_size].get("LightGBM", {})
        m_rnd = results[pool_size].get("Random", {})
        print(
            f"  Pool={pool_size:4d} | N={n_e:3d} "
            f"| LGB NDCG@5={m_lgb.get('ndcg@5', 0):.4f} "
            f"Rnd NDCG@5={m_rnd.get('ndcg@5', 0):.4f}"
        )
    return results


def print_table(results: dict, n: int, title: str, ci_map: dict | None = None) -> None:
    W = 86
    print(f"\n{'='*W}")
    print(f"  {title}  (N = {n} users)")
    print(f"{'='*W}")
    hdr = f"  {'Method':<24} {'NDCG@5':>8} {'NDCG@10':>9} {'Hit@5':>7} {'Hit@10':>8} {'MRR':>7}"
    if ci_map:
        hdr += "   95% CI (NDCG@5)"
    print(hdr)
    print(f"  {'-'*(W-4)}")

    for method in ("LightGBM", "Popularity", "Random"):
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
            line += f"   [{lo:.4f} - {hi:.4f}]"
        print(line)
    print(f"{'='*W}\n")


async def main() -> None:
    print("\n" + "=" * 86)
    print("  LightGBM Learning-to-Rank — Offline Evaluation")
    print("=" * 86)

    model_path     = os.path.join(_SVC_DIR, "models_artifacts", "lightgbm_ranking_model.txt")
    deployed_model = None
    try:
        deployed_model = lgb.Booster(model_file=model_path)
        print(f"[MODEL] Loaded {model_path}")
    except Exception as e:
        print(f"[MODEL] Could not load deployed model: {e}")

    all_results: dict = {}

    print("\n[1/4] Real-data evaluation ...")
    try:
        u_act, u_attr, p_attr, p_rat, p_wa, db_stats = await load_from_db()
        res_real, n_real = loo_eval(deployed_model, u_act, u_attr, p_attr, p_rat, p_wa)
        if n_real > 0:
            print_table(res_real, n_real, "Ranking — Real data (LOO)")
            all_results["real"] = {
                "n_users": n_real,
                "db_stats": db_stats,
                **{m: summarise(r) for m, r in res_real.items()},
            }
        else:
            print("[INFO] Not enough eligible users.")
            all_results["real"] = {"n_users": 0, "db_stats": db_stats}
    except Exception as exc:
        print(f"[DB] Cannot connect: {exc}")
        all_results["real"] = {"n_users": 0, "db_stats": {}}

    print(f"\n[2/4] Synthetic {K_FOLDS}-fold CV (500 users x 2000 places x 12 attrs) ...")
    syn_act, syn_u, syn_p, syn_r, syn_pw = build_synthetic(500, 2000, 12)

    agg_ranks, fold_metrics = kfold_eval_synthetic(syn_act, syn_u, syn_p, syn_r, syn_pw)
    n_syn = len(agg_ranks["LightGBM"])

    ci_map: dict = {m: bootstrap_ci(r) for m, r in agg_ranks.items()}
    print_table(agg_ranks, n_syn, f"Ranking — Synthetic ({K_FOLDS}-fold CV)", ci_map=ci_map)

    fold_ndcg = [fm["LightGBM"].get("ndcg@5", 0) for fm in fold_metrics]
    mean_ndcg = sum(fold_ndcg) / len(fold_ndcg)
    std_ndcg  = (sum((v - mean_ndcg) ** 2 for v in fold_ndcg) / len(fold_ndcg)) ** 0.5
    print(f"  Per-fold NDCG@5: {'  '.join(f'{v:.4f}' for v in fold_ndcg)}")
    print(f"  Mean={mean_ndcg:.4f}  Std={std_ndcg:.4f}")

    all_results["synthetic_cv"] = {
        "n_users": n_syn,
        **{m: summarise(r) for m, r in agg_ranks.items()},
        "LightGBM_ci": ci_map.get("LightGBM", {}),
        "fold_ndcg5_mean": mean_ndcg,
        "fold_ndcg5_std":  std_ndcg,
    }

    print(f"\n[3/4] Feature ablation ({K_FOLDS}-fold CV per config) ...")
    abl = ablation_study(syn_act, syn_u, syn_p, syn_r, syn_pw)
    all_results["ablation"] = abl

    W = 62
    print(f"\n  {'='*W}")
    print(f"  {'Config':<32} {'NDCG@5':>8} {'Hit@5':>7} {'MRR':>8}")
    print(f"  {'-'*58}")
    for cfg_name, m in abl.items():
        print(f"  {cfg_name:<32} {m.get('ndcg@5', 0):>8.4f} "
              f"{m.get('hit@5', 0):>7.4f} {m.get('mrr', 0):>8.4f}")
    print(f"  {'='*W}\n")

    print("\n[4/4] Pool-size sensitivity ...")
    pool_res = pool_sensitivity(syn_act, syn_u, syn_p, syn_r, syn_pw)
    all_results["pool_sensitivity"] = pool_res

    json_path = os.path.join(_THIS_DIR, "ranking_results.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False, default=str)
    print(f"\n[OUT] {json_path}")


if __name__ == "__main__":
    asyncio.run(main())
