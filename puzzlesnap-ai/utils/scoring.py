"""
scoring.py
----------
Deterministic score formula shared by the API so the frontend's live
"estimated score" preview and the backend's authoritative final score
never disagree.
"""

DIFFICULTY_BASE = {
    "easy": 1000,
    "medium": 2000,
    "hard": 3500,
    "expert": 5500,
}

DIFFICULTY_PAR_SECONDS = {
    "easy": 60,
    "medium": 150,
    "hard": 300,
    "expert": 540,
}

DIFFICULTY_PAR_MOVES = {
    "easy": 20,
    "medium": 45,
    "hard": 90,
    "expert": 160,
}


def calculate_score(difficulty: str, completion_time: int, total_moves: int, hints_used: int) -> int:
    difficulty = difficulty if difficulty in DIFFICULTY_BASE else "easy"
    base = DIFFICULTY_BASE[difficulty]
    par_time = DIFFICULTY_PAR_SECONDS[difficulty]
    par_moves = DIFFICULTY_PAR_MOVES[difficulty]

    time_ratio = par_time / max(completion_time, 1)
    time_bonus = base * 0.5 * min(time_ratio, 2.0)

    moves_ratio = par_moves / max(total_moves, 1)
    moves_bonus = base * 0.3 * min(moves_ratio, 2.0)

    hint_penalty = hints_used * (base * 0.05)

    score = base * 0.2 + time_bonus + moves_bonus - hint_penalty
    return max(int(round(score)), 0)