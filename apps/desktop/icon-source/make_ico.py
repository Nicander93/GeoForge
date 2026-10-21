"""Rebuild src-tauri/icons/icon.ico from the two icon designs.

`npx tauri icon icon-source/geoforge-icon-1024.png` generates every icon from the
original C design. Sizes of 48 px and below must use the small variant
(c-terrain-layers-small.svg, exported as small-16/24/32/48.png), whose ridge
stays readable at those sizes. Run this after `tauri icon`:

    python apps/desktop/icon-source/make_ico.py

It copies small-32.png over icons/32x32.png and writes icon.ico with the small
PNGs as its 16, 24, 32 and 48 px layers and the generated 64 and 256 px layers.
"""
import struct
from pathlib import Path

HERE = Path(__file__).resolve().parent
ICONS = HERE.parent / "src-tauri" / "icons"


def read_ico(path: Path) -> dict[int, bytes]:
    data = path.read_bytes()
    count = struct.unpack("<H", data[4:6])[0]
    layers = {}
    for i in range(count):
        w, _h, _c, _r, _planes, _bpp, size, off = struct.unpack("<BBBBHHII", data[6 + 16 * i:22 + 16 * i])
        layers[w or 256] = data[off:off + size]
    return layers


def main() -> None:
    generated = read_ico(ICONS / "icon.ico")
    layers = [(n, (HERE / f"small-{n}.png").read_bytes()) for n in (16, 24, 32, 48)]
    layers += [(n, generated[n]) for n in (64, 256)]
    for n, png in layers:
        if png[:8] != b"\x89PNG\r\n\x1a\n":
            raise SystemExit(f"layer {n} is not a PNG")
    out = struct.pack("<HHH", 0, 1, len(layers))
    offset = 6 + 16 * len(layers)
    body = b""
    for n, png in layers:
        out += struct.pack("<BBBBHHII", n % 256, n % 256, 0, 0, 1, 32, len(png), offset + len(body))
        body += png
    (ICONS / "icon.ico").write_bytes(out + body)
    (ICONS / "32x32.png").write_bytes((HERE / "small-32.png").read_bytes())
    print("icon.ico layers:", ", ".join(str(n) for n, _ in layers))


if __name__ == "__main__":
    main()
