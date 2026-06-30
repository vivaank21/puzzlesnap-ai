"""
app.py
------
PuzzleSnap AI - Flask entry point.

Architecture note: hand-gesture recognition (MediaPipe Hands) and photo
capture run client-side in the browser. This server never receives a
live video stream - only a single captured frame, after a thumbs-up has
already been confirmed on-device. That frame is processed entirely in
memory (utils/image_processing.py) and is never written to disk or to
the database. Only anonymous gameplay statistics persist in SQLite.
"""

from flask import Flask, render_template

from routes.main import main_bp
from routes.api import api_bp
from utils.database import init_db


def create_app():
    app = Flask(__name__)
    app.config["JSON_SORT_KEYS"] = False
    # Captured images are only ever transient HTTP payloads, so keep the
    # accepted body size generous but bounded (12.5MB).
    app.config["MAX_CONTENT_LENGTH"] = 12 * 1024 * 1024 + 1024

    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp)

    @app.errorhandler(404)
    def not_found(_e):
        return render_template("404.html"), 404

    @app.errorhandler(413)
    def too_large(_e):
        return {"error": "Image too large."}, 413

    init_db()
    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)