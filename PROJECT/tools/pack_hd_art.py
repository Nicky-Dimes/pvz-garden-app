"""Pack the illustrated pose frames into the PVZ Garden sprite-sheet atlases (dev tool, never shipped).

Run from the folder that contains pvz-garden/ and tools/:   python3 tools/pack_hd_art.py

Reads  pvz-garden/art-source/hd/plants/sunflower/stage-N/<pose>.png  and  pvz-garden/art-source/hd/zombies/basic/<pose>.png
(each exactly 256 x 256, transparent, already illustrated and aligned: this script never resizes, distorts or invents poses)
and writes the atlases the game loads (art-hd-loader.js / art-hd-manifest.js):
  pvz-garden/img/hd/plants/sunflower/stage-0.png, -1.png, -2.png   1024 x 512 (idle blink walk0 walk1 / cheer attack hurt knocked)
  pvz-garden/img/hd/zombies/basic.png                               768 x 512 (idle walk0 walk1 / bite hurt / empty)

This is the packing script from the family's art brief. It uses Pillow when it is installed; otherwise the same steps run on a
small built-in PNG reader/writer (so nothing has to be downloaded).
"""
from pathlib import Path
import struct
import zlib

try:
    from PIL import Image  # optional
except ImportError:  # pragma: no cover - the built-in fallback below
    Image = None

ROOT = Path("pvz-garden")
SOURCE = ROOT / "art-source" / "hd"
OUTPUT = ROOT / "img" / "hd"

CELL = 256

PLANT_POSES = [
    "idle", "blink", "walk0", "walk1",
    "cheer", "attack", "hurt", "knocked"
]

ZOMBIE_POSES = [
    "idle", "walk0", "walk1",
    "bite", "hurt"
]


# ---------- a tiny RGBA PNG reader / writer (used only when Pillow is missing) ----------
class _Frame:
    def __init__(self, w, h, px):
        self.width, self.height, self.px = w, h, px

    @property
    def size(self):
        return (self.width, self.height)

    def getbbox(self):
        w, h, a = self.width, self.height, self.px
        for i in range(3, len(a), 4):
            if a[i]:
                return (0, 0, w, h)
        return None


def _read_png(path):
    d = Path(path).read_bytes()
    if d[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"{path}: not a PNG file")
    i, idat, w = 8, b"", 0
    while i < len(d):
        n, t = struct.unpack(">I", d[i:i + 4])[0], d[i + 4:i + 8]
        c = d[i + 8:i + 8 + n]
        if t == b"IHDR":
            w, h, depth, ct, _, _, il = struct.unpack(">IIBBBBB", c)
            if depth != 8 or ct not in (2, 6) or il:
                raise ValueError(f"{path}: expected an 8-bit RGB(A) PNG")
        elif t == b"IDAT":
            idat += c
        i += 12 + n
    bpp = 4 if ct == 6 else 3
    raw, st, prev, p = zlib.decompress(idat), w * bpp, bytearray(w * bpp), 0
    out = bytearray(w * h * 4)
    for y in range(h):
        f, line = raw[p], bytearray(raw[p + 1:p + 1 + st])
        p += 1 + st
        for x in range(st):
            a = line[x - bpp] if x >= bpp else 0
            b = prev[x]
            c = prev[x - bpp] if x >= bpp else 0
            if f == 1:
                line[x] = (line[x] + a) & 255
            elif f == 2:
                line[x] = (line[x] + b) & 255
            elif f == 3:
                line[x] = (line[x] + ((a + b) >> 1)) & 255
            elif f == 4:
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        prev = line
        if bpp == 4:
            out[y * w * 4:(y + 1) * w * 4] = line
        else:
            for x in range(w):
                out[(y * w + x) * 4:(y * w + x) * 4 + 4] = line[x * 3:x * 3 + 3] + b"\xff"
    return _Frame(w, h, out)


def _write_png(path, w, h, px):
    raw = b"".join(b"\x00" + bytes(px[y * w * 4:(y + 1) * w * 4]) for y in range(h))
    def chunk(t, c):
        return struct.pack(">I", len(c)) + t + c + struct.pack(">I", zlib.crc32(t + c) & 0xffffffff)
    Path(path).write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
                           + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def pack(source_dir, output_file, cols, rows, poses):
    if Image is not None:
        atlas = Image.new("RGBA", (cols * CELL, rows * CELL), (0, 0, 0, 0))
    else:
        W, H = cols * CELL, rows * CELL
        atlas_px = bytearray(W * H * 4)  # fully transparent

    for index, pose in enumerate(poses):
        filename = source_dir / f"{pose}.png"

        if not filename.is_file():
            raise FileNotFoundError(filename)

        if Image is not None:
            with Image.open(filename) as original:
                frame = original.convert("RGBA")
        else:
            frame = _read_png(filename)

        if frame.size != (CELL, CELL):
            raise ValueError(
                f"{filename}: expected 256x256, "
                f"received {frame.size}"
            )

        if frame.getbbox() is None:
            raise ValueError(f"Empty artwork: {filename}")

        x = (index % cols) * CELL
        y = (index // cols) * CELL

        if Image is not None:
            atlas.alpha_composite(frame, (x, y))
        else:  # the cells never overlap and the atlas starts transparent: compositing = copying the rows
            for row in range(CELL):
                o = ((y + row) * W + x) * 4
                atlas_px[o:o + CELL * 4] = frame.px[row * CELL * 4:(row + 1) * CELL * 4]

    output_file.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    if Image is not None:
        atlas.save(output_file, optimize=True)
        size = atlas.size
    else:
        _write_png(output_file, W, H, atlas_px)
        size = (W, H)

    if output_file.stat().st_size > 8 * 1024 * 1024:
        raise ValueError(
            f"Atlas exceeds 8 MB: {output_file}"
        )

    print(
        f"Created {output_file} "
        f"({size[0]}x{size[1]}, {output_file.stat().st_size // 1024} KB)"
    )


if __name__ == "__main__":
    for stage in range(3):
        pack(
            SOURCE / "plants" / "sunflower" / f"stage-{stage}",
            OUTPUT / "plants" / "sunflower" / f"stage-{stage}.png",
            4, 2, PLANT_POSES
        )

    pack(
        SOURCE / "zombies" / "basic",
        OUTPUT / "zombies" / "basic.png",
        3, 2, ZOMBIE_POSES
    )
