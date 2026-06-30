"""
analytics.py
------------
Aggregation and CSV export for the admin dashboard. Operates only on the
anonymous game_sessions table - never touches image data because no
image data ever exists in the database.
"""

import csv
import io

from . import database as db


def summary():
    return db.get_analytics_summary()


def export_csv() -> str:
    rows = db.get_all_sessions_for_export()
    buf = io.StringIO()
    fieldnames = [
        "session_id",
        "played_date",
        "played_time",
        "difficulty",
        "completion_time",
        "total_moves",
        "hints_used",
        "final_score",
    ]
    writer = csv.DictWriter(buf, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    return buf.getvalue()