"""
database.py
-----------
All persistence for PuzzleSnap AI lives here. By design this module can
NEVER receive image bytes - there is no function signature anywhere in
this file that accepts pixel data. Only anonymous gameplay statistics
(timings, move counts, difficulty, score) are written to disk.
"""

import sqlite3
import uuid
import threading
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "database" / "puzzlesnap.db"

# SQLite connections aren't thread-safe by default; Flask's dev server
# can field requests on multiple threads, so every write/read opens its
# own short-lived connection guarded by this lock.
_lock = threading.Lock()


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _lock, get_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS game_sessions (
                session_id      TEXT PRIMARY KEY,
                played_date     TEXT NOT NULL,
                played_time     TEXT NOT NULL,
                difficulty      TEXT NOT NULL,
                completion_time INTEGER NOT NULL,   -- seconds
                total_moves     INTEGER NOT NULL,
                hints_used      INTEGER NOT NULL DEFAULT 0,
                final_score     INTEGER NOT NULL,
                created_at      TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS analytics (
                id                      INTEGER PRIMARY KEY CHECK (id = 1),
                total_games_played      INTEGER NOT NULL DEFAULT 0,
                total_completion_time   INTEGER NOT NULL DEFAULT 0,
                total_moves             INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS settings (
                id                 INTEGER PRIMARY KEY CHECK (id = 1),
                theme              TEXT NOT NULL DEFAULT 'dark',
                sound_enabled      INTEGER NOT NULL DEFAULT 1,
                animation_enabled  INTEGER NOT NULL DEFAULT 1
            );
            """
        )
        conn.execute(
            "INSERT OR IGNORE INTO analytics (id, total_games_played, total_completion_time, total_moves) "
            "VALUES (1, 0, 0, 0)"
        )
        conn.execute(
            "INSERT OR IGNORE INTO settings (id, theme, sound_enabled, animation_enabled) "
            "VALUES (1, 'dark', 1, 1)"
        )
        conn.commit()


def new_session_id():
    return uuid.uuid4().hex


def record_game_session(difficulty, completion_time, total_moves, hints_used, final_score):
    now = datetime.now()
    sid = new_session_id()
    with _lock, get_connection() as conn:
        conn.execute(
            """INSERT INTO game_sessions
               (session_id, played_date, played_time, difficulty, completion_time,
                total_moves, hints_used, final_score, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                sid,
                now.strftime("%Y-%m-%d"),
                now.strftime("%H:%M:%S"),
                difficulty,
                completion_time,
                total_moves,
                hints_used,
                final_score,
                now.isoformat(),
            ),
        )
        conn.execute(
            """UPDATE analytics SET
               total_games_played = total_games_played + 1,
               total_completion_time = total_completion_time + ?,
               total_moves = total_moves + ?
               WHERE id = 1""",
            (completion_time, total_moves),
        )
        conn.commit()
    return sid


def get_leaderboard(limit=20, difficulty=None):
    with _lock, get_connection() as conn:
        if difficulty:
            rows = conn.execute(
                """SELECT session_id, played_date, difficulty, completion_time,
                          total_moves, hints_used, final_score
                   FROM game_sessions WHERE difficulty = ?
                   ORDER BY final_score DESC, completion_time ASC LIMIT ?""",
                (difficulty, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT session_id, played_date, difficulty, completion_time,
                          total_moves, hints_used, final_score
                   FROM game_sessions ORDER BY final_score DESC, completion_time ASC LIMIT ?""",
                (limit,),
            ).fetchall()
        return [dict(r) for r in rows]


def get_analytics_summary():
    with _lock, get_connection() as conn:
        totals = dict(conn.execute("SELECT * FROM analytics WHERE id = 1").fetchone())
        by_difficulty = [
            dict(r)
            for r in conn.execute(
                """SELECT difficulty, COUNT(*) AS games,
                          AVG(completion_time) AS avg_time,
                          AVG(total_moves) AS avg_moves,
                          AVG(final_score) AS avg_score
                   FROM game_sessions GROUP BY difficulty"""
            ).fetchall()
        ]
        daily = [
            dict(r)
            for r in conn.execute(
                """SELECT played_date, COUNT(*) AS games
                   FROM game_sessions GROUP BY played_date
                   ORDER BY played_date DESC LIMIT 14"""
            ).fetchall()
        ]
        monthly = [
            dict(r)
            for r in conn.execute(
                """SELECT substr(played_date, 1, 7) AS month, COUNT(*) AS games
                   FROM game_sessions GROUP BY month ORDER BY month DESC LIMIT 12"""
            ).fetchall()
        ]
        games_played = totals["total_games_played"] or 0
        avg_time = (totals["total_completion_time"] / games_played) if games_played else 0
        avg_moves = (totals["total_moves"] / games_played) if games_played else 0
        return {
            "total_games_played": games_played,
            "average_completion_time": round(avg_time, 1),
            "average_moves": round(avg_moves, 1),
            "by_difficulty": by_difficulty,
            "daily_plays": daily,
            "monthly_plays": monthly,
        }


def get_all_sessions_for_export():
    with _lock, get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM game_sessions ORDER BY created_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]


def get_settings():
    with _lock, get_connection() as conn:
        row = conn.execute("SELECT * FROM settings WHERE id = 1").fetchone()
        return dict(row)


def update_settings(theme=None, sound_enabled=None, animation_enabled=None):
    current = get_settings()
    theme = theme if theme is not None else current["theme"]
    sound_enabled = int(sound_enabled) if sound_enabled is not None else current["sound_enabled"]
    animation_enabled = (
        int(animation_enabled) if animation_enabled is not None else current["animation_enabled"]
    )
    with _lock, get_connection() as conn:
        conn.execute(
            "UPDATE settings SET theme = ?, sound_enabled = ?, animation_enabled = ? WHERE id = 1",
            (theme, sound_enabled, animation_enabled),
        )
        conn.commit()
    return get_settings()