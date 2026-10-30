"""Turn a scanned engraving into a transparent ink layer for the app.

The paper becomes transparent and the ink becomes white with alpha equal to
its darkness, so the app can tint it per variant (blue hunter, red enemy,
purple shadow) and make it glow.

usage: python3 scripts/process-engraving.py SRC OUT [--crop x0,y0,x1,y1] [--flip]
       crop values are fractions of the image (0..1).
"""
import argparse

from PIL import Image, ImageFilter, ImageOps

MAX_HEIGHT = 640


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('out')
    ap.add_argument('--crop', help='x0,y0,x1,y1 as fractions of the image')
    ap.add_argument('--flip', action='store_true', help='mirror horizontally')
    ap.add_argument('--paper', type=int, default=200, help='luminance treated as blank paper (0-255)')
    args = ap.parse_args()

    img = Image.open(args.src).convert('L')
    if args.crop:
        x0, y0, x1, y1 = (float(v) for v in args.crop.split(','))
        w, h = img.size
        img = img.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))
    if args.flip:
        img = ImageOps.mirror(img)

    # Normalise contrast so faint scans and dark scans end up alike.
    img = ImageOps.autocontrast(img, cutoff=1)
    img = img.filter(ImageFilter.MedianFilter(3))

    # Ink darkness -> alpha. Anything lighter than the paper level vanishes.
    paper = args.paper
    alpha = img.point(lambda v: 0 if v >= paper else min(255, int((paper - v) * 255 / paper * 1.4)))

    bbox = alpha.getbbox()
    if bbox:
        alpha = alpha.crop(bbox)
    if alpha.height > MAX_HEIGHT:
        alpha = alpha.resize((round(alpha.width * MAX_HEIGHT / alpha.height), MAX_HEIGHT), Image.LANCZOS)

    out = Image.new('RGBA', alpha.size, (255, 255, 255, 0))
    out.putalpha(alpha)
    out.save(args.out, optimize=True)
    print(f'{args.out}: {out.width}x{out.height}')


if __name__ == '__main__':
    main()
