from __future__ import annotations

import argparse
import csv
import json
import random
from collections import defaultdict
from pathlib import Path


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prepare TomatoGuard dataset manifest.")
    parser.add_argument(
        "--raw-dir",
        type=Path,
        default=Path("datasets/archive/PlantVillage"),
        help="Folder dataset mentah (per kelas).",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("datasets/processed"),
        help="Folder output manifest CSV.",
    )
    parser.add_argument("--train-ratio", type=float, default=0.7)
    parser.add_argument("--val-ratio", type=float, default=0.15)
    parser.add_argument("--test-ratio", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def list_image_files(class_dir: Path) -> list[Path]:
    return [p for p in class_dir.iterdir() if p.is_file() and p.suffix in IMAGE_EXTENSIONS]


def canonicalize_label(raw: str) -> str:
    return raw.replace("Tomato__", "Tomato_")


def stratified_split(
    class_to_files: dict[str, list[Path]],
    train_ratio: float,
    val_ratio: float,
    test_ratio: float,
    seed: int,
) -> dict[str, list[tuple[Path, str]]]:
    ratio_sum = train_ratio + val_ratio + test_ratio
    if abs(ratio_sum - 1.0) > 1e-6:
        raise ValueError(f"Jumlah rasio train+val+test harus 1.0, saat ini {ratio_sum:.4f}")

    rng = random.Random(seed)
    split = {"train": [], "val": [], "test": []}
    for label, files in class_to_files.items():
        files_copy = files[:]
        rng.shuffle(files_copy)
        n = len(files_copy)
        n_train = int(n * train_ratio)
        n_val = int(n * val_ratio)

        train_files = files_copy[:n_train]
        val_files = files_copy[n_train : n_train + n_val]
        test_files = files_copy[n_train + n_val :]

        split["train"].extend((f, label) for f in train_files)
        split["val"].extend((f, label) for f in val_files)
        split["test"].extend((f, label) for f in test_files)
    return split


def write_manifest(rows: list[tuple[Path, str]], label_to_idx: dict[str, int], output_file: Path) -> None:
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with output_file.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["filepath", "label", "label_index"])
        for filepath, label in rows:
            writer.writerow([str(filepath.resolve()), label, label_to_idx[label]])


def main() -> None:
    args = parse_args()
    raw_dir: Path = args.raw_dir
    output_dir: Path = args.output_dir

    if not raw_dir.exists():
        raise FileNotFoundError(f"Raw dataset folder tidak ditemukan: {raw_dir}")

    class_dirs = [
        d for d in raw_dir.iterdir()
        if d.is_dir() and (d.name.lower().startswith("tomato") or d.name == "Not_Tomato_Leaf")
    ]
    if not class_dirs:
        raise RuntimeError(f"Tidak ada folder kelas ditemukan di: {raw_dir}")

    class_to_files: dict[str, list[Path]] = {}
    for class_dir in sorted(class_dirs):
        label = canonicalize_label(class_dir.name)
        images = list_image_files(class_dir)
        if not images:
            continue
        class_to_files[label] = images

    if not class_to_files:
        raise RuntimeError("Tidak ditemukan file gambar valid di dataset.")

    class_names = sorted(class_to_files.keys())
    label_to_idx = {label: idx for idx, label in enumerate(class_names)}

    split = stratified_split(
        class_to_files=class_to_files,
        train_ratio=args.train_ratio,
        val_ratio=args.val_ratio,
        test_ratio=args.test_ratio,
        seed=args.seed,
    )

    write_manifest(split["train"], label_to_idx, output_dir / "train.csv")
    write_manifest(split["val"], label_to_idx, output_dir / "val.csv")
    write_manifest(split["test"], label_to_idx, output_dir / "test.csv")

    with (output_dir / "class_names.json").open("w", encoding="utf-8") as f:
        json.dump(class_names, f, indent=2)

    summary: dict[str, dict[str, int]] = defaultdict(dict)
    for split_name, rows in split.items():
        summary[split_name]["total"] = len(rows)
        by_class = defaultdict(int)
        for _, label in rows:
            by_class[label] += 1
        summary[split_name]["by_class"] = dict(sorted(by_class.items()))

    with (output_dir / "summary.json").open("w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print("Dataset manifest berhasil dibuat:")
    print(f"- Output folder: {output_dir.resolve()}")
    print(f"- Jumlah kelas: {len(class_names)}")
    print(f"- Train: {len(split['train'])} | Val: {len(split['val'])} | Test: {len(split['test'])}")


if __name__ == "__main__":
    main()
