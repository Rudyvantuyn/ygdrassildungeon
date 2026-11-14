"""
Builds the hero looks (public/art/heroes/<class>-<n>.webp) from Dungeon Crawl Stone Soup player doll parts (CC0).

    python3 scripts/make-looks.py "<path to 'Dungeon Crawl Stone Soup Full'>" [preview.png]

scripts/hero-looks.json lists, per class, 8 looks (4 men, then 4 women): which part goes on which layer, and how
dark the skin is (0-3), and optionally a small companion from the monster tiles ("companion": [tile, x, y, size]). Each 32x32 doll is scaled up 8x with hard pixel edges, like the monsters.
"""
import json
import sys
from pathlib import Path

from PIL import Image

# Drawing order of the doll layers, back to front.
ORDER = ["cloak", "base", "boots", "legs", "body", "gloves", "hair", "beard", "head", "hand_right", "hand_left"]
SCALE = 8
SKIN = {1: (0.88, 0.74, 0.62), 2: (0.66, 0.5, 0.4), 3: (0.5, 0.36, 0.28)}
ROOT = Path(__file__).resolve().parent


def find(player: Path, layer: str, name: str) -> Path:
    for sub in ("", "misc/"):
        p = player / layer / f"{sub}{name}.png"
        if p.exists():
            return p
    raise SystemExit(f"missing part: {layer}/{name}")


def darken_skin(img: Image.Image, tone: int) -> Image.Image:
    if not tone:
        return img
    k = SKIN[tone]
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a and r > g > b and r - b > 40 and r > 120:
                px[x, y] = (int(r * k[0]), int(g * k[1]), int(b * k[2]), a)
    return img


def doll(player: Path, look: dict) -> Image.Image:
    out = Image.new("RGBA", (32, 32))
    for layer in ORDER:
        if layer not in look:
            continue
        im = Image.open(find(player, layer, look[layer])).convert("RGBA")
        if layer == "base":
            im = darken_skin(im, look.get("skin", 0))
        out.alpha_composite(im)
    # A companion creature from the monster tiles, small, on the shoulder (the Ravenspeaker's raven).
    if "companion" in look:
        name, x, y, size = look["companion"]
        pet = Image.open(player.parent / "monster" / f"{name}.png").convert("RGBA").resize((size, size), Image.NEAREST)
        out.alpha_composite(pet, (x, y))
    return out


def main() -> None:
    player = Path(sys.argv[1]) / "player"
    looks = {k: v for k, v in json.loads((ROOT / "hero-looks.json").read_text()).items() if not k.startswith("_")}
    dst = ROOT.parent / "public/art/heroes"
    dst.mkdir(parents=True, exist_ok=True)
    tiles = []
    for cls, items in looks.items():
        assert len(items) == 8, f"{cls} needs 8 looks"
        for i, look in enumerate(items):
            img = doll(player, look).resize((32 * SCALE, 32 * SCALE), Image.NEAREST)
            img.save(dst / f"{cls}-{i}.webp", "WEBP", lossless=True)
            tiles.append(img)
    if len(sys.argv) > 2:
        cell = 32 * 4
        sheet = Image.new("RGBA", (8 * cell, len(looks) * cell), (30, 36, 54, 255))
        for n, img in enumerate(tiles):
            sheet.alpha_composite(img.resize((cell, cell), Image.NEAREST), ((n % 8) * cell, (n // 8) * cell))
        sheet.save(sys.argv[2])
    print(f"{len(tiles)} looks written to {dst}")


if __name__ == "__main__":
    main()
