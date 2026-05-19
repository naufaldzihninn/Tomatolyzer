"""Generate synthetic negative (non-tomato-leaf) images for the 'Not_Tomato_Leaf' class.

Creates diverse synthetic images (noise, gradients, skin tones, patterns, etc.)
to teach the model to reject inputs that are NOT tomato leaves.

Usage:
    python backend/train/generate_negatives.py --output-dir datasets/archive/PlantVillage/Not_Tomato_Leaf --count 2000
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate negative sample images for Not_Tomato_Leaf class.")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("datasets/archive/PlantVillage/Not_Tomato_Leaf"),
    )
    parser.add_argument("--count", type=int, default=2000)
    parser.add_argument("--size", type=int, default=256)
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


# =====================================================================
# IMAGE GENERATORS — each takes (size, rng) and returns PIL Image
# =====================================================================

def random_noise(size: int, rng: np.random.Generator) -> Image.Image:
    """Pure random RGB noise."""
    arr = rng.integers(0, 256, (size, size, 3), dtype=np.uint8)
    return Image.fromarray(arr)


def gaussian_noise(size: int, rng: np.random.Generator) -> Image.Image:
    """Gaussian noise with random mean and std."""
    mean = rng.integers(60, 200)
    std = rng.integers(20, 80)
    arr = rng.normal(mean, std, (size, size, 3))
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)


def solid_color(size: int, rng: np.random.Generator) -> Image.Image:
    """Random solid color fill."""
    color = tuple(int(x) for x in rng.integers(0, 256, 3))
    return Image.new("RGB", (size, size), color)


def gradient_image(size: int, rng: np.random.Generator) -> Image.Image:
    """Smooth gradient between two random colors."""
    arr = np.zeros((size, size, 3), dtype=np.float64)
    c1 = rng.integers(0, 256, 3).astype(np.float64)
    c2 = rng.integers(0, 256, 3).astype(np.float64)
    direction = rng.choice(["horizontal", "vertical", "diagonal"])
    for i in range(size):
        t = i / max(size - 1, 1)
        color = c1 * (1 - t) + c2 * t
        if direction == "horizontal":
            arr[:, i] = color
        elif direction == "vertical":
            arr[i, :] = color
        else:
            for j in range(size):
                t2 = (i + j) / max(2 * size - 2, 1)
                arr[i, j] = c1 * (1 - t2) + c2 * t2
    return Image.fromarray(arr.astype(np.uint8))


def skin_tone_patches(size: int, rng: np.random.Generator) -> Image.Image:
    """Skin-tone colored patches — mimics hands/body shots."""
    skin_tones = [
        (255, 224, 189), (255, 205, 148), (234, 192, 134),
        (255, 173, 96), (205, 133, 63), (141, 85, 36),
        (198, 134, 66), (224, 172, 105), (255, 218, 185),
        (241, 194, 125), (188, 143, 84), (255, 195, 160),
        (87, 57, 28), (45, 34, 22), (168, 118, 72),
    ]
    base = skin_tones[int(rng.integers(0, len(skin_tones)))]
    img = Image.new("RGB", (size, size), base)
    draw = ImageDraw.Draw(img)
    for _ in range(int(rng.integers(5, 25))):
        x1, y1 = int(rng.integers(0, size)), int(rng.integers(0, size))
        x2 = x1 + int(rng.integers(20, size // 2))
        y2 = y1 + int(rng.integers(20, size // 2))
        variation = tuple(max(0, min(255, c + int(rng.integers(-40, 40)))) for c in base)
        draw.ellipse([x1, y1, x2, y2], fill=variation)
    blur_r = int(rng.integers(2, 8))
    return img.filter(ImageFilter.GaussianBlur(radius=blur_r))


def geometric_shapes(size: int, rng: np.random.Generator) -> Image.Image:
    """Random geometric shapes on a colored background."""
    bg = tuple(int(x) for x in rng.integers(0, 256, 3))
    img = Image.new("RGB", (size, size), bg)
    draw = ImageDraw.Draw(img)
    for _ in range(int(rng.integers(3, 20))):
        shape = rng.choice(["rect", "ellipse", "line", "polygon"])
        color = tuple(int(x) for x in rng.integers(0, 256, 3))
        x1, y1 = int(rng.integers(0, size)), int(rng.integers(0, size))
        x2, y2 = int(rng.integers(0, size)), int(rng.integers(0, size))
        if x1 > x2:
            x1, x2 = x2, x1
        if y1 > y2:
            y1, y2 = y2, y1
        if shape == "rect":
            draw.rectangle([x1, y1, x2, y2], fill=color)
        elif shape == "ellipse":
            draw.ellipse([x1, y1, x2, y2], fill=color)
        elif shape == "line":
            draw.line([x1, y1, x2, y2], fill=color, width=int(rng.integers(1, 10)))
        else:
            pts = [(int(rng.integers(0, size)), int(rng.integers(0, size))) for _ in range(int(rng.integers(3, 6)))]
            draw.polygon(pts, fill=color)
    return img


def striped_pattern(size: int, rng: np.random.Generator) -> Image.Image:
    """Horizontal or vertical stripes."""
    bg = tuple(int(x) for x in rng.integers(0, 256, 3))
    fg = tuple(int(x) for x in rng.integers(0, 256, 3))
    img = Image.new("RGB", (size, size), bg)
    draw = ImageDraw.Draw(img)
    stripe_w = int(rng.integers(4, 32))
    horizontal = bool(rng.choice([True, False]))
    for i in range(0, size, stripe_w * 2):
        if horizontal:
            draw.rectangle([0, i, size, i + stripe_w], fill=fg)
        else:
            draw.rectangle([i, 0, i + stripe_w, size], fill=fg)
    return img


def blurred_noise(size: int, rng: np.random.Generator) -> Image.Image:
    """Heavily blurred noise — mimics out-of-focus photos."""
    arr = rng.integers(0, 256, (size, size, 3), dtype=np.uint8)
    img = Image.fromarray(arr)
    blur_r = int(rng.integers(8, 30))
    return img.filter(ImageFilter.GaussianBlur(radius=blur_r))


def warm_neutrals(size: int, rng: np.random.Generator) -> Image.Image:
    """Warm neutral tones — furniture, indoor, food-like textures."""
    warm_colors = [
        (139, 90, 43), (160, 82, 45), (210, 180, 140),
        (222, 184, 135), (245, 222, 179), (128, 0, 0),
        (255, 69, 0), (255, 140, 0), (200, 162, 114),
        (180, 130, 70), (150, 100, 50), (120, 80, 30),
    ]
    base = warm_colors[int(rng.integers(0, len(warm_colors)))]
    arr = np.full((size, size, 3), base, dtype=np.int32)
    noise = rng.integers(-30, 30, (size, size, 3))
    arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr)
    return img.filter(ImageFilter.GaussianBlur(radius=int(rng.integers(1, 5))))


def cool_tones(size: int, rng: np.random.Generator) -> Image.Image:
    """Cool tones — sky, water, metal surfaces."""
    cool_colors = [
        (135, 206, 235), (70, 130, 180), (0, 0, 128),
        (176, 196, 222), (119, 136, 153), (112, 128, 144),
        (0, 191, 255), (100, 149, 237), (65, 105, 225),
    ]
    base = cool_colors[int(rng.integers(0, len(cool_colors)))]
    arr = np.full((size, size, 3), base, dtype=np.int32)
    noise = rng.integers(-25, 25, (size, size, 3))
    arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr)
    return img.filter(ImageFilter.GaussianBlur(radius=int(rng.integers(0, 4))))


def gray_black_white(size: int, rng: np.random.Generator) -> Image.Image:
    """Very light, very dark, or gray images."""
    mode = rng.choice(["white", "black", "gray"])
    if mode == "white":
        val = int(rng.integers(220, 256))
    elif mode == "black":
        val = int(rng.integers(0, 35))
    else:
        val = int(rng.integers(80, 180))
    arr = np.full((size, size, 3), val, dtype=np.int32)
    noise = rng.integers(-15, 15, (size, size, 3))
    arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)


def mosaic_blocks(size: int, rng: np.random.Generator) -> Image.Image:
    """Random color blocks — pixelated mosaic."""
    block_size = int(rng.integers(16, 64))
    arr = np.zeros((size, size, 3), dtype=np.uint8)
    for y in range(0, size, block_size):
        for x in range(0, size, block_size):
            color = rng.integers(0, 256, 3).astype(np.uint8)
            arr[y : y + block_size, x : x + block_size] = color
    return Image.fromarray(arr)


def non_green_natural(size: int, rng: np.random.Generator) -> Image.Image:
    """Non-green dominant — ensures model learns green=leaf."""
    r = int(rng.integers(100, 256))
    g = int(rng.integers(0, min(max(r - 40, 1), 130)))
    b = int(rng.integers(0, 120))
    arr = np.full((size, size, 3), (r, g, b), dtype=np.int32)
    noise = rng.integers(-40, 40, (size, size, 3))
    arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr)
    return img.filter(ImageFilter.GaussianBlur(radius=int(rng.integers(2, 10))))


def concentric_circles(size: int, rng: np.random.Generator) -> Image.Image:
    """Concentric circles pattern."""
    bg = tuple(int(x) for x in rng.integers(0, 256, 3))
    fg = tuple(int(x) for x in rng.integers(0, 256, 3))
    img = Image.new("RGB", (size, size), bg)
    draw = ImageDraw.Draw(img)
    cx, cy = size // 2, size // 2
    step = int(rng.integers(8, 24))
    for r in range(step, size, step * 2):
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=fg, width=int(rng.integers(2, 6)))
    return img


def checkerboard(size: int, rng: np.random.Generator) -> Image.Image:
    """Checkerboard pattern."""
    c1 = tuple(int(x) for x in rng.integers(0, 256, 3))
    c2 = tuple(int(x) for x in rng.integers(0, 256, 3))
    cell = int(rng.integers(8, 40))
    img = Image.new("RGB", (size, size), c1)
    draw = ImageDraw.Draw(img)
    for y in range(0, size, cell):
        for x in range(0, size, cell):
            if ((x // cell) + (y // cell)) % 2 == 0:
                draw.rectangle([x, y, x + cell, y + cell], fill=c2)
    return img


# Distribution: (generator_func, weight)
GENERATORS = [
    (random_noise, 150),
    (gaussian_noise, 100),
    (solid_color, 100),
    (gradient_image, 150),
    (skin_tone_patches, 300),  # Heavy weight — user's main concern
    (geometric_shapes, 150),
    (striped_pattern, 80),
    (blurred_noise, 150),
    (warm_neutrals, 150),
    (cool_tones, 100),
    (gray_black_white, 100),
    (mosaic_blocks, 80),
    (non_green_natural, 200),
    (concentric_circles, 50),
    (checkerboard, 40),
]


def main() -> None:
    args = parse_args()
    rng = np.random.default_rng(args.seed)

    output_dir: Path = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    # Skip if already generated
    existing = list(output_dir.glob("*.jpg")) + list(output_dir.glob("*.png"))
    if len(existing) >= args.count:
        print(f"Sudah ada {len(existing)} gambar negatif di {output_dir}. Skip generate.")
        return

    total_weight = sum(w for _, w in GENERATORS)
    generated = 0
    idx = 0

    for gen_func, weight in GENERATORS:
        count = max(1, round(args.count * weight / total_weight))
        for i in range(count):
            try:
                img = gen_func(args.size, rng)
                filename = f"neg_{gen_func.__name__}_{idx:05d}.jpg"
                img.save(output_dir / filename, "JPEG", quality=85)
                generated += 1
                idx += 1
            except Exception as e:
                print(f"Warning: {gen_func.__name__} gagal: {e}")
                idx += 1
                continue

    print(f"Berhasil generate {generated} gambar negatif ke: {output_dir.resolve()}")
    print(f"Tip: Anda juga bisa menambahkan foto non-daun sendiri ke folder ini untuk hasil lebih akurat.")


if __name__ == "__main__":
    main()
