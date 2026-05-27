from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image
import imquality.brisque as brisque_module

import skimage.transform

# Патчим старый API skimage для совместимости с imquality
_orig_rescale = skimage.transform.rescale
def _patched_rescale(*args, **kwargs):
    if 'multichannel' in kwargs:
        kwargs['channel_axis'] = -1 if kwargs.pop('multichannel') else None
    return _orig_rescale(*args, **kwargs)
skimage.transform.rescale = _patched_rescale


def describe(name: str, arr: np.ndarray) -> None:
    arr = np.asarray(arr, dtype=np.float64)
    print(
        f"{name}: shape={arr.shape}, mean={arr.mean():.6f}, std={arr.std():.6f}, min={arr.min():.6f}, max={arr.max():.6f}"
    )


def print_scale_features(label: str, features: np.ndarray) -> None:
    if features.shape[0] != 18:
        raise ValueError(f"Expected 18 features per scale, got {features.shape[0]}")

    print(f"\n{label}")
    print("  MSCN:")
    print(f"    alpha = {features[0]:.6f}")
    print(f"    variance = {features[1]:.6f}")

    directions = ["Horizontal", "Vertical", "Diagonal 1", "Diagonal 2"]
    for i, direction in enumerate(directions, start=0):
        base = 2 + i * 4
        print(f"  {direction}:")
        print(f"    alpha = {features[base + 0]:.6f}")
        print(f"    mean  = {features[base + 1]:.6f}")
        print(f"    sigma^2_L = {features[base + 2]:.6f}")
        print(f"    sigma^2_R = {features[base + 3]:.6f}")


def extract_and_print(image_path: Path) -> None:
    image = Image.open(image_path).convert("RGB")
    gray_image = image.convert("L")
    arr = np.asarray(image, dtype=np.float32) / 255.0

    print(f"Image: {image_path}")
    print(f"  size = {arr.shape[1]}x{arr.shape[0]}")

    # Scale 1: original image
    brisque1 = brisque_module.Brisque(arr)
    print("\n=== Scale 1 (100%) ===")
    describe("MSCN", brisque1.mscn)
    describe("Horizontal products", brisque1.mscn_horizontal)
    describe("Vertical products", brisque1.mscn_vertical)
    describe("Diagonal products", brisque1.mscn_diagonal)
    describe("Secondary diagonal products", brisque1.mscn_secondary_diagonal)
    print_scale_features("Scale 1 features", brisque1.features)

    # Scale 2: half-size image as the library does internally
    with np.errstate(all="ignore"):
        downscaled = brisque_module.skimage.transform.rescale(
            arr,
            0.5,
            order=2,
            mode="constant",
            anti_aliasing=False,
            channel_axis=-1,
        )

    brisque2 = brisque_module.Brisque(downscaled)
    print("\n=== Scale 2 (50%) ===")
    describe("MSCN", brisque2.mscn)
    describe("Horizontal products", brisque2.mscn_horizontal)
    describe("Vertical products", brisque2.mscn_vertical)
    describe("Diagonal products", brisque2.mscn_diagonal)
    describe("Secondary diagonal products", brisque2.mscn_secondary_diagonal)
    print_scale_features("Scale 2 features", brisque2.features)

    combined = np.concatenate([brisque1.features, brisque2.features])
    assert combined.shape == (36,)
    print("\n=== Combined 36 features ===")
    print(np.array2string(combined, precision=6, separator=", "))
    # Сохраним эталонный вектор признаков в файл для внешнего сравнения
    try:
        from pathlib import Path
        Path('tests/ref_features.json').write_text(json.dumps(combined.tolist()))
        print("Reference features saved to tests/ref_features.json")
    except Exception as e:
        print('Failed to save reference features:', e)
    print("\n=== Scaled final BRISQUE vector (18 features) ===")

    Path('tests/ref_features.json').write_text(json.dumps(combined.tolist()))

def main() -> None:
    parser = argparse.ArgumentParser(description="Compare BRISQUE intermediate values using imquality.brisque")
    parser.add_argument("image", type=Path, help="Path to an image file")
    args = parser.parse_args()
    extract_and_print(args.image)


if __name__ == "__main__":
    main()
