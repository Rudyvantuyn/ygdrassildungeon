"""
Turns generated monster art (a creature on a plain dark background) into game sprites:
the background is cut away, the creature is cropped and scaled, and saved as WebP.

    python3 scripts/process-art.py <raw-dir> public/art/monsters

Each <raw-dir>/<enemy-id>.png becomes public/art/monsters/<enemy-id>.webp.
Only the background connected to the image border is removed, so dark parts
inside the creature stay solid.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

MAX_SIZE = 560
# Colour distance from the background below which a pixel counts as background,
# and above which it is fully opaque (soft edge in between).
# The generated backdrops are very flat, so a narrow band keeps dark parts of the creature solid.
LOW, HIGH = 5.0, 16.0


def box_blur(a: np.ndarray, r: int) -> np.ndarray:
    """Separable box blur (three passes come close to a Gaussian)."""
    for axis in (0, 1):
        pad = [(0, 0)] * a.ndim
        pad[axis] = (r + 1, r)
        c = np.cumsum(np.pad(a, pad, mode="edge"), axis=axis)
        n = a.shape[axis]
        a = (np.take(c, range(2 * r + 1, 2 * r + 1 + n), axis=axis) - np.take(c, range(0, n), axis=axis)) / (2 * r + 1)
    return a


def background_mask(dist: np.ndarray) -> np.ndarray:
    """Pixels close to the backdrop that are connected to the image border."""
    h, w = dist.shape
    # (a copy: an image that shares memory with a numpy array cannot be flood-filled)
    candidate = Image.fromarray(np.where(dist < HIGH, 255, 0).astype(np.uint8)).copy()
    seeds = [(x, y) for x in range(0, w, 4) for y in (0, h - 1)] + [(x, y) for y in range(0, h, 4) for x in (0, w - 1)]
    for xy in seeds:
        if candidate.getpixel(xy) == 255:
            ImageDraw.floodfill(candidate, xy, 128)
    return np.asarray(candidate) == 128


def cut_out(img: Image.Image) -> Image.Image:
    rgb = np.asarray(img.convert("RGB"), dtype=np.float32)
    border = np.concatenate([rgb[:12].reshape(-1, 3), rgb[-12:].reshape(-1, 3), rgb[:, :12].reshape(-1, 3), rgb[:, -12:].reshape(-1, 3)])
    dist = np.linalg.norm(rgb - np.median(border, axis=0), axis=2)
    region = background_mask(dist)

    # Some backdrops have a soft glow or vignette. Estimate the backdrop colour everywhere from the
    # pixels already known to be background (normalised blur), and measure against that instead.
    weight = region.astype(np.float32)
    field = np.stack([box_blur(box_blur(rgb[..., c] * weight, 24), 24) for c in range(3)], axis=2)
    norm = box_blur(box_blur(weight, 24), 24)[..., None]
    field = np.where(norm > 0.02, field / np.maximum(norm, 1e-6), np.median(border, axis=0))
    dist = np.linalg.norm(rgb - field, axis=2)
    region = background_mask(dist)

    soft = np.clip((dist - LOW) / (HIGH - LOW), 0, 1)
    alpha = np.where(region, soft, 1.0)
    alpha_img = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.0))
    out = img.convert("RGBA")
    out.putalpha(alpha_img)
    return out


def main() -> None:
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    dst.mkdir(parents=True, exist_ok=True)
    for path in sorted(src.glob("*.png")):
        img = Image.open(path)
        img.thumbnail((MAX_SIZE + 64, MAX_SIZE + 64), Image.LANCZOS)
        sprite = cut_out(img)
        box = sprite.getchannel("A").point(lambda a: 255 if a > 24 else 0).getbbox()
        if box:
            pad = 12
            box = (max(0, box[0] - pad), max(0, box[1] - pad), min(sprite.width, box[2] + pad), min(sprite.height, box[3] + pad))
            sprite = sprite.crop(box)
        sprite.thumbnail((MAX_SIZE, MAX_SIZE), Image.LANCZOS)
        out = dst / f"{path.stem}.webp"
        sprite.save(out, "WEBP", quality=80, method=6)
        print(f"{out}  {sprite.width}x{sprite.height}  {out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
