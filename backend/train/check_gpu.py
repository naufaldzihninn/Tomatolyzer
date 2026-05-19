from __future__ import annotations

import os
import platform
import sys

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
import tensorflow as tf


def main() -> None:
    print("=== Runtime Check ===")
    print(f"OS      : {platform.platform()}")
    print(f"Python  : {sys.version.split()[0]}")
    print(f"TF      : {tf.__version__}")
    print(f"CUDABuilt: {tf.test.is_built_with_cuda()}")
    gpus = tf.config.list_physical_devices("GPU")
    print(f"GPUs    : {gpus}")

    if gpus:
        print("Status  : TensorFlow bisa melihat GPU.")
    else:
        print("Status  : TensorFlow TIDAK melihat GPU (training akan CPU).")
        if sys.platform.startswith("win"):
            print(
                "Hint    : Di Windows native, TensorFlow terbaru sering CPU-only. "
                "Gunakan WSL2 Ubuntu + TensorFlow Linux CUDA untuk training GPU."
            )


if __name__ == "__main__":
    main()
