"""
gesture.py
----------
Hand gesture recognition for PuzzleSnap AI runs primarily in the browser
using MediaPipe Hands (Tasks Vision, loaded from CDN in
static/js/gesture.js). Running it client-side means raw camera frames
never have to leave the user's device just to check for a thumbs-up -
that's a meaningful privacy win, since it means the camera feed itself
is never transmitted to this server at all, only the final captured
photo (after the gesture has already been confirmed) is ever sent here.

This module provides a lightweight, optional server-side sanity check:
the frontend may send the 21 MediaPipe hand landmarks alongside the
capture request, and we re-validate the thumbs-up geometry here so a
tampered client can't skip the gesture step entirely.
"""

import math


def _dist(a, b):
    return math.dist((a["x"], a["y"]), (b["x"], b["y"]))


def is_thumbs_up(landmarks) -> bool:
    """
    landmarks: list of 21 dicts with x, y (normalized 0-1), matching the
    MediaPipe Hands landmark index order.
    """
    if not landmarks or len(landmarks) != 21:
        return False

    wrist = landmarks[0]
    thumb_tip = landmarks[4]
    thumb_ip = landmarks[3]
    index_tip = landmarks[8]
    index_mcp = landmarks[5]
    middle_tip = landmarks[12]
    middle_mcp = landmarks[9]
    ring_tip = landmarks[16]
    ring_mcp = landmarks[13]
    pinky_tip = landmarks[20]
    pinky_mcp = landmarks[17]

    # Thumb should be the extended digit: its tip sits well above (lower y)
    # the other knuckles, and noticeably farther from the wrist than the
    # thumb's own IP joint.
    thumb_extended = (_dist(wrist, thumb_tip) > _dist(wrist, thumb_ip) * 1.15)

    # Other four fingers should be curled: tip closer to the wrist than
    # their own knuckle (mcp), i.e. folded into the palm.
    fingers_curled = all(
        _dist(wrist, tip) < _dist(wrist, mcp) * 1.05
        for tip, mcp in (
            (index_tip, index_mcp),
            (middle_tip, middle_mcp),
            (ring_tip, ring_mcp),
            (pinky_tip, pinky_mcp),
        )
    )

    thumb_is_highest = thumb_tip["y"] < min(
        index_tip["y"], middle_tip["y"], ring_tip["y"], pinky_tip["y"]
    )

    return thumb_extended and fingers_curled and thumb_is_highest