"""Recompute RGB patch measurements without modifying the artwork.

Run from the repository root with Python and Pillow installed.
The website build uses the committed measurement file, not this script.
"""
from pathlib import Path
import json
from PIL import Image

path = Path("public/assets/chasing-roles.png")
image = Image.open(path)
assert image.mode == "RGB" and image.size == (2172, 724)
patches = []
for row in range(2):
    for column in range(6):
        box = (column * 362, row * 362, (column + 1) * 362, (row + 1) * 362)
        pixels = list(image.crop(box).getdata())
        mean = [sum(pixel[c] for pixel in pixels) / len(pixels) / 255 for c in range(3)]
        patches.append({"row": row, "column": column, "meanRGB": mean})
Path("public/patch-data.js").write_text(
    "export const PATCHES=" + json.dumps(patches, separators=(",", ":")) + ";\n",
    encoding="utf-8",
)
