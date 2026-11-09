"""
Turns a photo (or a 3D render) into a background in the game's pixel style:
shrink to a low resolution, map every pixel onto one shared palette with ordered (Bayer) dithering,
then scale back up with hard pixel edges. Because every picture goes through the same palette,
photos from different places still look like one world.

  python3 scripts/photo-to-art.py photo.jpg out.png [--width 320] [--mood warm|cold|neutral]

The source photo must be our own, or carry a licence that allows commercial use (CC0 / CC BY);
record where it came from in art/SOURCES.md.
"""
import argparse

from PIL import Image, ImageEnhance, ImageFilter

# One palette for the whole game: dark earth, wood, stone, moss, sea, frost, fire and bone.
PALETTE = [
    '0b0907', '17110b', '241a12', '3a281a', '4f3a26', '6b4a2c', '8a6238', 'ad8248', 'd6a95c', 'f0cf6a',
    '2a2a20', '3b3a2c', '55533e', '737052', '97916a', 'c2b98c', 'e8dcc0',
    '1e2a16', '2f4220', '4a6a2c', '6f8f3a', '9ab45a',
    '0e1c24', '183140', '24495c', '3a6f80', '5c9aa6', '9fcfd4',
    '3a1610', '6e2a1a', 'a8461f', 'e2672a', 'ffb14a',
]

# 4x4 Bayer matrix for ordered dithering (values 0..15).
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def rgb(hex_color: str) -> tuple[int, int, int]:
    return tuple(int(hex_color[i:i + 2], 16) for i in (0, 2, 4))


def nearest(color, palette):
    r, g, b = color
    return min(palette, key=lambda p: (p[0] - r) ** 2 * 3 + (p[1] - g) ** 2 * 4 + (p[2] - b) ** 2 * 2)


def convert(src: str, out: str, width: int, mood: str, size: tuple[int, int]) -> None:
    im = Image.open(src).convert('RGB')
    # Crop to 16:9 around the centre.
    target = 16 / 9
    w, h = im.size
    if w / h > target:
        nw = int(h * target)
        im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = int(w / target)
        im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    height = round(width * 9 / 16)
    im = im.filter(ImageFilter.SMOOTH_MORE).resize((width, height), Image.LANCZOS)
    im = ImageEnhance.Contrast(im).enhance(1.25)
    im = ImageEnhance.Color(im).enhance(1.15)
    # Tint towards the mood of the place before the colours are snapped to the palette.
    tint = {'warm': (1.08, 0.98, 0.85), 'cold': (0.86, 0.97, 1.1), 'neutral': (1, 1, 1)}[mood]
    im = Image.eval(im, lambda v: v)  # copy
    px = im.load()
    palette = [rgb(c) for c in PALETTE]
    spread = 26  # how strongly the dither pattern nudges each pixel
    for y in range(height):
        for x in range(width):
            r, g, b = px[x, y]
            d = (BAYER[y % 4][x % 4] / 15 - 0.5) * spread
            c = (min(255, max(0, r * tint[0] + d)), min(255, max(0, g * tint[1] + d)), min(255, max(0, b * tint[2] + d)))
            px[x, y] = nearest(c, palette)
    # A soft dark edge, like the rest of the game's pictures.
    edge = Image.new('L', (width, height), 0)
    ep = edge.load()
    for y in range(height):
        for x in range(width):
            dx = abs(x / width - 0.5) * 2
            dy = abs(y / height - 0.5) * 2
            ep[x, y] = int(255 * max(0.0, min(1.0, (max(dx, dy) - 0.7) / 0.3)) * 0.8)
    dark = Image.new('RGB', (width, height), rgb(PALETTE[0]))
    im = Image.composite(dark, im, edge)
    im.resize(size, Image.NEAREST).save(out)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('out')
    ap.add_argument('--width', type=int, default=320, help='pixel width before scaling up (smaller = chunkier)')
    ap.add_argument('--mood', choices=['warm', 'cold', 'neutral'], default='neutral')
    args = ap.parse_args()
    convert(args.src, args.out, args.width, args.mood, (1280, 720))
