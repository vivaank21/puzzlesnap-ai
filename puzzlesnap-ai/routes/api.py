"""
routes/api.py
--------------
JSON endpoints used by the frontend JS. The most important contract in
this whole file: process_capture() NEVER writes the decoded image to
disk or to SQLite. It is decoded into memory, enhanced, re-encoded, sent
back in the HTTP response, and then garbage collected. Once this request
finishes, the server holds no copy of the user's photo whatsoever.
"""

from flask import Blueprint, jsonify, request, Response

from utils import database as db
from utils import analytics as analytics_util
from utils.camera import decode_data_url, encode_data_url, InvalidCaptureError
from utils.image_processing import process_capture
from utils.gesture import is_thumbs_up
from utils.puzzle import is_valid_difficulty
from utils.scoring import calculate_score

api_bp = Blueprint("api", __name__, url_prefix="/api")


@api_bp.post("/verify-gesture")
def verify_gesture():
    """Optional server-side re-check of the thumbs-up landmark geometry."""
    payload = request.get_json(silent=True) or {}
    landmarks = payload.get("landmarks")
    confirmed = is_thumbs_up(landmarks)
    return jsonify({"confirmed": confirmed})


@api_bp.post("/process-image")
def process_image():
    """
    Accepts one base64 data URL captured the instant a thumbs-up was
    confirmed, enhances it in memory, and returns a new base64 data URL.
    Nothing here ever reaches a database table or the filesystem.
    """
    payload = request.get_json(silent=True) or {}
    data_url = payload.get("image")

    try:
        raw = decode_data_url(data_url)
    except InvalidCaptureError as exc:
        return jsonify({"error": str(exc)}), 400

    try:
        result = process_capture(raw)
    except Exception:
        return jsonify({"error": "Could not process this image. Try recapturing in better light."}), 422

    response = {
        "image": encode_data_url(result["bytes"]),
        "is_blurry": result["is_blurry"],
        "is_low_light": result["is_low_light"],
        "size": result["size"],
    }
    return jsonify(response)


@api_bp.post("/session/complete")
def session_complete():
    payload = request.get_json(silent=True) or {}
    difficulty = payload.get("difficulty", "easy")
    completion_time = int(payload.get("completion_time", 0))
    total_moves = int(payload.get("total_moves", 0))
    hints_used = int(payload.get("hints_used", 0))

    if not is_valid_difficulty(difficulty):
        return jsonify({"error": "Invalid difficulty."}), 400
    if completion_time < 0 or total_moves < 0 or hints_used < 0:
        return jsonify({"error": "Invalid game stats."}), 400

    score = calculate_score(difficulty, completion_time, total_moves, hints_used)
    session_id = db.record_game_session(difficulty, completion_time, total_moves, hints_used, score)

    return jsonify({"session_id": session_id, "score": score})


@api_bp.get("/leaderboard")
def leaderboard():
    difficulty = request.args.get("difficulty")
    limit = min(int(request.args.get("limit", 20)), 100)
    return jsonify(db.get_leaderboard(limit=limit, difficulty=difficulty))


@api_bp.get("/analytics")
def analytics_summary():
    return jsonify(analytics_util.summary())


@api_bp.get("/admin/export-csv")
def export_csv():
    csv_text = analytics_util.export_csv()
    return Response(
        csv_text,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=puzzlesnap_analytics.csv"},
    )


@api_bp.post("/settings")
def update_settings():
    payload = request.get_json(silent=True) or {}
    updated = db.update_settings(
        theme=payload.get("theme"),
        sound_enabled=payload.get("sound_enabled"),
        animation_enabled=payload.get("animation_enabled"),
    )
    return jsonify(updated)