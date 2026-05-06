TIME_DECAY = 0.05
MIN_OVERLAP_THRESHOLD = 0.2
FEATURE_COLS = ["cosine_sim", "max_match", "dealbreaker", "overlap_count"]
N_NEGATIVES = 19
N_BOOTSTRAP = 1000
K_FOLDS = 5
RANDOM_SEED = 42
POOL_SWEEP = [9, 19, 49, 99]

ABLATION_CONFIGS: dict[str, list[str]] = {
    "Full (4 features)":   ["cosine_sim", "max_match", "dealbreaker", "overlap_count"],
    "No dealbreaker":      ["cosine_sim", "max_match", "overlap_count"],
    "No overlap_count":    ["cosine_sim", "max_match", "dealbreaker"],
    "Cosine only":         ["cosine_sim"],
}
