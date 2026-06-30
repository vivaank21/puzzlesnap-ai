"""
camera.py
---------
Helpers for safely accepting a captured frame from the browser. The live
camera stream itself is never sent to the server (see gesture.py) - the
only camera-related payload this module ever handles is the single
base64 JPEG frame captured at the moment of the confirmed thumbs-up.
"""

import base64
import binascii

MAX_CAPTURE_BYTES = 12 * 1024 * 1024  # 12MB safety ceiling
ALLOWED_PREFIXES = ("data:image/jpeg;base64,", "data:image/png;base64,", "data:image/webp;base64,")


class InvalidCaptureError(ValueError):
    pass


def decode_data_url(data_url: str) -> bytes:
    if not isinstance(data_url, str) or "," not in data_url:
        raise InvalidCaptureError("Malformed image payload.")

    header, _, payload = data_url.partition(",")
    header_normalized = header + ","
    if not any(header_normalized.startswith(p) for p in ALLOWED_PREFIXES):
        raise InvalidCaptureError("Unsupported image format.")

    try:
        raw = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise InvalidCaptureError("Could not decode image data.") from exc

    if len(raw) == 0:
        raise InvalidCaptureError("Empty image payload.")
    if len(raw) > MAX_CAPTURE_BYTES:
        raise InvalidCaptureError("Captured image is too large.")

    return raw


def encode_data_url(jpeg_bytes: bytes) -> str:
    return "data:image/jpeg;base64," + base64.b64encode(jpeg_bytes).decode("ascii")