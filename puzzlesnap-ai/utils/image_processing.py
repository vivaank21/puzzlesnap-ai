"""
image_processing.py
--------------------
Pure in-memory image enhancement. Every function here takes bytes in and
returns bytes out - nothing in this module ever touches the filesystem
or the database. Once the Flask response is sent, the only copy of the
captured photo is whatever the browser is holding in memory for the
current puzzle session.
"""

import io
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps


def _decode(image_bytes: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(image_bytes))
    img = ImageOps.exif_transpose(img)  # respect phone camera orientation
    return img.convert("RGB")


def _encode(img: Image.Image, quality: int = 90) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    return buf.getvalue()


def estimate_blur(img: Image.Image) -> float:
    """Variance of the Laplacian-ish edge response. Lower = blurrier."""
    gray = np.asarray(img.convert("L"), dtype=np.float64)
    # simple discrete Laplacian kernel applied via numpy diff convolution
    lap = (
        -4 * gray
        + np.roll(gray, 1, axis=0)
        + np.roll(gray, -1, axis=0)
        + np.roll(gray, 1, axis=1)
        + np.roll(gray, -1, axis=1)
    )
    return float(lap.var())


def estimate_brightness(img: Image.Image) -> float:
    gray = np.asarray(img.convert("L"), dtype=np.float64)
    return float(gray.mean())


def auto_center_square_crop(img: Image.Image) -> Image.Image:
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return img.crop((left, top, left + side, top + side))


def enhance(img: Image.Image) -> Image.Image:
    """Gentle, automatic brightness/contrast/sharpness lift."""
    brightness = estimate_brightness(img)
    target = 128.0
    factor = max(0.85, min(1.35, target / max(brightness, 1.0)))
    img = ImageEnhance.Brightness(img).enhance(factor)
    img = ImageEnhance.Contrast(img).enhance(1.08)
    img = ImageEnhance.Color(img).enhance(1.05)
    img = ImageEnhance.Sharpness(img).enhance(1.4)
    img = img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
    return img


def process_capture(image_bytes: bytes, output_size: int = 900) -> dict:
    """
    Full pipeline run on a freshly captured photo:
    center-crop to square -> enhance -> resize -> re-encode as JPEG bytes.
    Returns a dict with the processed bytes plus quality diagnostics so
    the frontend can warn about low light / blur before the user commits
    to a capture.
    """
    img = _decode(image_bytes)
    blur_score = estimate_blur(img)
    brightness_score = estimate_brightness(img)

    img = auto_center_square_crop(img)
    img = enhance(img)
    img = img.resize((output_size, output_size), Image.LANCZOS)

    return {
        "bytes": _encode(img),
        "blur_score": blur_score,
        "brightness_score": brightness_score,
        "is_blurry": blur_score < 80,
        "is_low_light": brightness_score < 60,
        "size": output_size,
    }