"""
Draws the props seen in the corridors (stairs, chests, the spring, the root gate, gathering spots) as small
pixel-art sprites in the game's palette, then scales them up with hard pixel edges so they sit in the same
retro look as the photo textures. No image generator is involved: every shape is placed here, in code.

  python3 scripts/draw-props.py            # writes public/art/props/*.webp
"""
import random

from PIL import Image, ImageDraw

SCALE = 8
OUT = 'public/art/props/'
INK = (23, 17, 11, 255)

C = {k: tuple(int(v[i:i + 2], 16) for i in (0, 2, 4)) + (255,) for k, v in {
    'dark': '241a12', 'wood0': '3a281a', 'wood1': '4f3a26', 'wood2': '6b4a2c', 'wood3': '8a6238', 'wood4': 'ad8248',
    'gold0': 'ad8248', 'gold1': 'd6a95c', 'gold2': 'f0cf6a',
    'st0': '2a2a20', 'st1': '3b3a2c', 'st2': '55533e', 'st3': '737052', 'st4': '97916a', 'st5': 'c2b98c', 'bone': 'e8dcc0',
    'moss0': '1e2a16', 'moss1': '2f4220', 'moss2': '4a6a2c', 'moss3': '6f8f3a', 'moss4': '9ab45a',
    'w0': '0e1c24', 'w1': '183140', 'w2': '24495c', 'w3': '3a6f80', 'w4': '5c9aa6', 'w5': '9fcfd4',
    'f0': '3a1610', 'f1': '6e2a1a', 'f2': 'a8461f', 'f3': 'e2672a', 'f4': 'ffb14a', 'red': '9a2a1f',
}.items()}


def canvas(w, h):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def shade(im, box, color, every=2):
    """Checkerboard dither of `color` over the opaque pixels in box (a cheap retro shadow)."""
    px = im.load()
    x0, y0, x1, y1 = box
    for y in range(y0, y1):
        for x in range(x0, x1):
            if 0 <= x < im.width and 0 <= y < im.height and px[x, y][3] and (x + y) % every == 0 and px[x, y] != INK:
                px[x, y] = color


def outline(im):
    """A one-pixel ink outline around every shape, like hand-made sprites."""
    src = im.copy().load()
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            if src[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < im.width and 0 <= ny < im.height and src[nx, ny][3] and src[nx, ny] != INK:
                    px[x, y] = INK
                    break


def save(im, name):
    im.resize((im.width * SCALE, im.height * SCALE), Image.NEAREST).save(OUT + name + '.webp', 'WEBP', lossless=True, quality=100)


def chest(opened):
    im, d = canvas(64, 54 if opened else 46)
    base = im.height - 2
    # Body: horizontal planks.
    d.rectangle((6, base - 24, 57, base), fill=C['wood2'])
    for y in range(base - 24, base, 6):
        d.line((6, y, 57, y), fill=C['wood1'])
    shade(im, (6, base - 10, 58, base + 1), C['wood1'])
    if opened:
        # Lid thrown back, gold glowing inside.
        d.rectangle((6, base - 46, 57, base - 26), fill=C['wood3'])
        for y in range(base - 46, base - 26, 6):
            d.line((6, y, 57, y), fill=C['wood2'])
        d.rectangle((9, base - 28, 54, base - 22), fill=C['dark'])
        for x in range(11, 53, 4):
            d.ellipse((x, base - 30, x + 4, base - 25), fill=C['gold2'] if x % 8 else C['gold1'])
        d.rectangle((14, base - 46, 17, base - 26), fill=C['gold1'])
        d.rectangle((46, base - 46, 49, base - 26), fill=C['gold1'])
    else:
        # Rounded lid.
        d.rectangle((6, base - 34, 57, base - 24), fill=C['wood3'])
        d.ellipse((6, base - 44, 57, base - 26), fill=C['wood3'])
        d.rectangle((6, base - 35, 57, base - 26), fill=C['wood3'])
        shade(im, (6, base - 44, 32, base - 26), C['wood2'], 3)
        d.line((6, base - 25, 57, base - 25), fill=C['wood0'], width=2)
        d.rectangle((14, base - 43, 17, base), fill=C['gold1'])
        d.rectangle((46, base - 43, 49, base), fill=C['gold1'])
        # Lock.
        d.rectangle((27, base - 30, 36, base - 19), fill=C['gold2'])
        d.rectangle((31, base - 26, 32, base - 22), fill=INK)
    if opened:
        d.rectangle((14, base - 24, 17, base), fill=C['gold1'])
        d.rectangle((46, base - 24, 49, base), fill=C['gold1'])
    outline(im)
    return im


def stairs_down():
    im, d = canvas(64, 40)
    # Stone rim around a dark stairwell; warm light rises from below.
    d.polygon([(2, 38), (12, 6), (51, 6), (61, 38)], fill=C['st2'])
    shade(im, (2, 6, 20, 39), C['st1'])
    d.polygon([(10, 34), (17, 10), (46, 10), (53, 34)], fill=C['dark'])
    for i, y in enumerate((14, 19, 24, 29)):
        inset = 18 - i * 2
        d.line((inset, y, 63 - inset, y), fill=C['f2'] if i < 2 else C['f3'], width=2)
    for x in range(4, 60, 9):
        d.point((x, 37), fill=C['st4'])
    outline(im)
    return im


def stairs_up():
    im, d = canvas(64, 58)
    # Stone steps climbing away towards a pale opening above.
    d.rectangle((22, 0, 41, 14), fill=C['bone'])
    d.rectangle((25, 2, 38, 14), fill=C['w5'])
    base = 57
    for i in range(5):
        x0, x1 = 4 + i * 4, 59 - i * 4
        y1 = base - i * 9
        d.rectangle((x0, y1 - 8, x1, y1), fill=C['st3'] if i % 2 == 0 else C['st2'])
        d.line((x0, y1 - 8, x1, y1 - 8), fill=C['st5'])
    shade(im, (4, 14, 22, 58), C['st1'])
    for x, y in ((6, 52), (56, 50), (12, 34), (50, 32)):
        d.line((x, y, x + random.choice((-3, 3)), y - 6), fill=C['moss3'], width=2)
    outline(im)
    return im


def spring():
    im, d = canvas(64, 44)
    # A round stone basin with clear water and a few bright glints.
    d.ellipse((2, 12, 61, 42), fill=C['st2'])
    shade(im, (2, 26, 62, 43), C['st1'])
    for x in range(6, 58, 8):
        d.line((x, 30, x + 1, 40), fill=C['st1'])
    d.ellipse((8, 14, 55, 30), fill=C['w3'])
    d.ellipse((14, 16, 49, 26), fill=C['w4'])
    for x, y in ((20, 19), (34, 22), (42, 18), (27, 24)):
        d.point((x, y), fill=C['w5'])
        d.point((x + 1, y), fill=C['w5'])
    d.line((30, 2, 30, 10), fill=C['w5'], width=2)
    d.line((26, 6, 34, 6), fill=C['w5'])
    outline(im)
    return im


def gate():
    im, d = canvas(48, 64)
    # Roots grown into bars across the passage.
    for x in (6, 15, 24, 33, 42):
        pts = [(x + random.randint(-2, 2), y) for y in range(0, 64, 8)]
        d.line(pts, fill=C['wood2'], width=5)
        d.line([(px + 1, py) for px, py in pts], fill=C['wood3'], width=1)
    for y in (14, 38):
        d.line([(0, y), (12, y + 3), (24, y - 2), (36, y + 3), (47, y)], fill=C['wood1'], width=4)
    for x, y in ((10, 22), (30, 48), (38, 12)):
        d.ellipse((x, y, x + 5, y + 4), fill=C['moss3'])
    outline(im)
    return im


def forage():
    im, d = canvas(64, 52)
    # A low bush of herbs with a few red berries and pale mushrooms.
    for cx, cy, r in ((20, 30, 15), (40, 28, 16), (31, 20, 14), (12, 40, 10), (50, 40, 11)):
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=C['moss2'])
    shade(im, (0, 30, 64, 52), C['moss1'])
    for _ in range(40):
        x, y = random.randint(6, 58), random.randint(8, 44)
        if im.getpixel((x, y))[3]:
            d.point((x, y), fill=C['moss4'])
    for x, y in ((22, 22), (38, 18), (45, 32), (17, 34)):
        d.rectangle((x, y, x + 2, y + 2), fill=C['red'])
    for x in (8, 54):
        d.rectangle((x + 1, 44, x + 3, 50), fill=C['bone'])
        d.ellipse((x - 2, 40, x + 6, 46), fill=C['st5'])
    outline(im)
    return im


def mine():
    im, d = canvas(64, 56)
    # A rock outcrop with a vein of ore and a few crystals.
    d.polygon([(2, 55), (8, 28), (20, 12), (36, 6), (50, 16), (60, 34), (62, 55)], fill=C['st2'])
    shade(im, (2, 30, 30, 56), C['st1'])
    d.line([(10, 44), (22, 34), (30, 38), (42, 26), (54, 30)], fill=C['gold1'], width=3)
    d.line([(14, 46), (24, 38)], fill=C['gold2'], width=1)
    for x, y in ((40, 14), (46, 18), (28, 18)):
        d.polygon([(x, y), (x + 3, y - 7), (x + 6, y)], fill=C['w5'])
    d.line([(20, 20), (16, 30)], fill=C['st4'])
    outline(im)
    return im


def fell():
    im, d = canvas(64, 54)
    # A tree stump with an axe left in it, and a couple of cut logs.
    d.rectangle((20, 18, 44, 50), fill=C['wood2'])
    d.ellipse((20, 12, 44, 24), fill=C['wood4'])
    d.ellipse((26, 15, 38, 21), fill=C['wood3'])
    shade(im, (20, 26, 30, 51), C['wood1'])
    d.polygon([(14, 52), (20, 44), (44, 44), (52, 52)], fill=C['wood1'])
    d.line((40, 4, 30, 16), fill=C['wood0'], width=3)
    d.polygon([(26, 12), (34, 8), (36, 18)], fill=C['st4'])
    for x in (2, 48):
        d.ellipse((x, 42, x + 14, 52), fill=C['wood3'])
        d.ellipse((x + 9, 43, x + 14, 51), fill=C['wood4'])
    outline(im)
    return im


def fish():
    im, d = canvas(64, 40)
    # A dark pool with rings on the water and a fin breaking the surface.
    d.ellipse((2, 8, 61, 38), fill=C['st2'])
    d.ellipse((6, 10, 57, 34), fill=C['w1'])
    d.ellipse((12, 13, 51, 30), fill=C['w2'])
    for r in (6, 11):
        d.ellipse((32 - r * 2, 21 - r, 32 + r * 2, 21 + r), outline=C['w4'])
    d.polygon([(30, 20), (36, 12), (37, 20)], fill=C['st4'])
    outline(im)
    return im


if __name__ == '__main__':
    random.seed(4)
    save(chest(False), 'chest')
    save(chest(True), 'chest-open')
    save(stairs_down(), 'stairs-down')
    save(stairs_up(), 'stairs-up')
    save(spring(), 'spring')
    save(gate(), 'gate')
    save(forage(), 'gather-forage')
    save(mine(), 'gather-mine')
    save(fell(), 'gather-fell')
    save(fish(), 'gather-fish')
    print('props written')
