"""
Makes painted textures tile without visible seams, and saves them for the dungeon renderer.

    python3 scripts/make-tiles.py <raw-dir> public/art/dungeon

Each <raw-dir>/<name>.jpg|png becomes public/art/dungeon/<name>.webp (512x512).
The image is blended with a copy shifted by half its size: the shifted copy's edges
are the original's middle, so they wrap around seamlessly. The original is kept in the
middle and the shifted copy takes over only near the edges.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

SIZE = 512


def make_tileable(img: Image.Image) -> Image.Image:
    a = np.asarray(img.convert("RGB"), dtype=np.float32)
    h, w, _ = a.shape
    shifted = np.roll(a, (h // 2, w // 2), axis=(0, 1))
    y, x = np.mgrid[0:h, 0:w]
    edge = np.maximum(np.abs(x / (w - 1) - 0.5), np.abs(y / (h - 1) - 0.5))  # 0 in the middle, 0.5 at the edge
    t = np.clip((edge - 0.32) / (0.5 - 0.32), 0, 1)
    keep = 1 - t * t * (3 - 2 * t)  # smoothstep: 1 in the middle, 0 at the edges
    out = a * keep[..., None] + shifted * (1 - keep[..., None])
    return Image.fromarray(out.clip(0, 255).astype(np.uint8))


def main() -> None:
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    dst.mkdir(parents=True, exist_ok=True)
    for path in sorted([*src.glob("*.jpg"), *src.glob("*.png")]):
        tile = make_tileable(Image.open(path)).resize((SIZE, SIZE), Image.LANCZOS)
        out = dst / f"{path.stem}.webp"
        tile.save(out, "WEBP", quality=82, method=6)
        print(f"{out}  {out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
