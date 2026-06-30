"""
puzzle.py
---------
Single source of truth for difficulty -> grid size mapping. The actual
slicing of the image into draggable pieces happens client-side on a
<canvas> (static/js/puzzle.js) because that gives smooth 60fps drag
interaction without round-tripping every piece through Flask. This
module just keeps the backend's notion of "what counts as a valid
difficulty" in sync with the frontend.
"""

GRID_SIZES = {
    "easy": 3,
    "medium": 4,
    "hard": 5,
    "expert": 6,
}


def grid_for(difficulty: str) -> int:
    return GRID_SIZES.get(difficulty, 3)


def is_valid_difficulty(difficulty: str) -> bool:
    return difficulty in GRID_SIZES