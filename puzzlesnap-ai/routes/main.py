"""
routes/main.py
---------------
All HTML page routes (no image or database logic lives here - that's
delegated to utils/ and routes/api.py).
"""

from flask import Blueprint, render_template

from utils import database as db
from utils.puzzle import GRID_SIZES

main_bp = Blueprint("main", __name__)


@main_bp.route("/")
def landing():
    return render_template("landing.html", grid_sizes=GRID_SIZES)


@main_bp.route("/capture")
def capture():
    return render_template("capture.html")


@main_bp.route("/play")
def play():
    return render_template("puzzle.html", grid_sizes=GRID_SIZES)


@main_bp.route("/leaderboard")
def leaderboard():
    boards = db.get_leaderboard(limit=20)
    return render_template("leaderboard.html", boards=boards)


@main_bp.route("/analytics")
def analytics():
    stats = db.get_analytics_summary()
    return render_template("analytics.html", stats=stats)


@main_bp.route("/about")
def about():
    return render_template("about.html")


@main_bp.route("/help")
def help_page():
    return render_template("help.html")


@main_bp.route("/settings")
def settings():
    current = db.get_settings()
    return render_template("settings.html", settings=current)


@main_bp.route("/admin")
def admin():
    stats = db.get_analytics_summary()
    boards = db.get_leaderboard(limit=50)
    return render_template("admin.html", stats=stats, boards=boards)