from __future__ import annotations

import argparse
import csv
import json
import os
import shutil
import sys
from pathlib import Path
from typing import Iterable

import numpy as np

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers


AUTOTUNE = tf.data.AUTOTUNE
IMAGE_SIZE = (224, 224)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train TomatoGuard model.")
    parser.add_argument("--data-dir", type=Path, default=Path("datasets/processed"))
    parser.add_argument("--epochs", type=int, default=12)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--learning-rate", type=float, default=1e-4)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--fine-tune-at", type=int, default=100)
    parser.add_argument("--model-dir", type=Path, default=Path("backend/models"))
    parser.add_argument("--log-dir", type=Path, default=Path("backend/logs/tensorboard"))
    parser.add_argument(
        "--export-h5",
        action="store_true",
        help="Export juga model .h5 (legacy). Default: nonaktif untuk menghindari warning HDF5.",
    )
    return parser.parse_args()


def read_manifest(csv_file: Path) -> tuple[list[str], list[int]]:
    paths: list[str] = []
    labels: list[int] = []
    with csv_file.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            paths.append(row["filepath"])
            labels.append(int(row["label_index"]))
    return paths, labels


def build_dataset(
    image_paths: Iterable[str],
    labels: Iterable[int],
    num_classes: int,
    batch_size: int,
    training: bool,
) -> tf.data.Dataset:
    image_paths_list = list(image_paths)
    labels_list = list(labels)
    paths_tensor = tf.constant(image_paths_list)
    labels_tensor = tf.constant(labels_list, dtype=tf.int32)
    ds = tf.data.Dataset.from_tensor_slices((paths_tensor, labels_tensor))

    if training:
        ds = ds.shuffle(buffer_size=len(image_paths_list), seed=42, reshuffle_each_iteration=True)

    def _load(path: tf.Tensor, label: tf.Tensor):
        image = tf.io.read_file(path)
        image = tf.io.decode_image(image, channels=3, expand_animations=False)
        image = tf.image.resize(image, IMAGE_SIZE)
        image = tf.cast(image, tf.float32) / 255.0
        label_onehot = tf.one_hot(label, depth=num_classes)
        return image, label_onehot

    ds = ds.map(_load, num_parallel_calls=AUTOTUNE)

    if training:
        augmenter = keras.Sequential(
            [
                layers.RandomFlip("horizontal"),
                layers.RandomRotation(0.08),
                layers.RandomZoom(0.12),
                layers.RandomContrast(0.1),
            ]
        )
        ds = ds.map(lambda x, y: (augmenter(x, training=True), y), num_parallel_calls=AUTOTUNE)

    ds = ds.batch(batch_size).prefetch(AUTOTUNE)
    return ds


def build_model(num_classes: int, learning_rate: float, fine_tune_at: int) -> keras.Model:
    base_model = keras.applications.MobileNetV2(
        input_shape=IMAGE_SIZE + (3,),
        include_top=False,
        weights="imagenet",
    )
    base_model.trainable = True
    for layer in base_model.layers[:fine_tune_at]:
        layer.trainable = False

    inputs = keras.Input(shape=IMAGE_SIZE + (3,))
    x = base_model(inputs, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)
    model = keras.Model(inputs, outputs)

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def compute_confusion_matrix(
    model: keras.Model, dataset: tf.data.Dataset, class_names: list[str]
) -> list[list[int]] | None:
    try:
        from sklearn.metrics import confusion_matrix
    except Exception:
        return None

    y_true = []
    y_pred = []
    for batch_x, batch_y in dataset:
        pred = model.predict(batch_x, verbose=0)
        y_pred.extend(np.argmax(pred, axis=1).tolist())
        y_true.extend(np.argmax(batch_y.numpy(), axis=1).tolist())

    cm = confusion_matrix(y_true, y_pred, labels=list(range(len(class_names))))
    return cm.tolist()


def configure_accelerator() -> dict:
    gpus = tf.config.list_physical_devices("GPU")
    accelerator = {"device": "CPU", "gpu_count": 0}
    if gpus:
        for gpu in gpus:
            try:
                tf.config.experimental.set_memory_growth(gpu, True)
            except Exception:
                pass
        accelerator["device"] = "GPU"
        accelerator["gpu_count"] = len(gpus)
        print(f"[Runtime] GPU terdeteksi: {len(gpus)} perangkat. Training akan memakai GPU.")
    else:
        print("[Runtime] GPU tidak terdeteksi oleh TensorFlow. Training berjalan di CPU.")
        if sys.platform.startswith("win"):
            print(
                "[Runtime] Catatan Windows: TensorFlow native Windows terbaru umumnya CPU-only. "
                "Untuk GPU, gunakan WSL2 Ubuntu + TensorFlow Linux (CUDA)."
            )
    return accelerator


def main() -> None:
    args = parse_args()
    tf.keras.utils.set_random_seed(args.seed)
    accelerator_info = configure_accelerator()

    class_names_file = args.data_dir / "class_names.json"
    with class_names_file.open("r", encoding="utf-8") as f:
        class_names = json.load(f)

    train_paths, train_labels = read_manifest(args.data_dir / "train.csv")
    val_paths, val_labels = read_manifest(args.data_dir / "val.csv")
    test_paths, test_labels = read_manifest(args.data_dir / "test.csv")
    num_classes = len(class_names)

    train_ds = build_dataset(train_paths, train_labels, num_classes, args.batch_size, training=True)
    val_ds = build_dataset(val_paths, val_labels, num_classes, args.batch_size, training=False)
    test_ds = build_dataset(test_paths, test_labels, num_classes, args.batch_size, training=False)

    model = build_model(num_classes, args.learning_rate, args.fine_tune_at)

    args.model_dir.mkdir(parents=True, exist_ok=True)
    args.log_dir.mkdir(parents=True, exist_ok=True)
    callbacks = [
        keras.callbacks.ModelCheckpoint(
            filepath=str(args.model_dir / "best_model.keras"),
            monitor="val_accuracy",
            save_best_only=True,
            mode="max",
        ),
        keras.callbacks.EarlyStopping(monitor="val_loss", patience=4, restore_best_weights=True),
        keras.callbacks.TensorBoard(log_dir=str(args.log_dir)),
    ]

    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=args.epochs,
        callbacks=callbacks,
        verbose=1,
    )

    test_loss, test_acc = model.evaluate(test_ds, verbose=1)

    keras_path = args.model_dir / "tomatoguard.keras"
    h5_path = args.model_dir / "tomatoguard.h5"
    saved_model_path = args.model_dir / "saved_model"
    class_names_path = args.model_dir / "class_names.json"

    model.save(keras_path)
    if args.export_h5:
        model.save(h5_path)
    if saved_model_path.exists():
        shutil.rmtree(saved_model_path, ignore_errors=True)
    try:
        model.export(saved_model_path)
    except Exception as export_err:
        print(f"Warning: model.export gagal ({export_err}). Mencoba fallback tf.saved_model.save ...")
        try:
            tf.saved_model.save(model, str(saved_model_path))
            print("Fallback SavedModel berhasil dibuat.")
        except Exception as fallback_err:
            print(f"Warning: fallback SavedModel juga gagal ({fallback_err}). Lanjut tanpa SavedModel.")

    with class_names_path.open("w", encoding="utf-8") as f:
        json.dump(class_names, f, indent=2)

    report = {
        "runtime_device": accelerator_info["device"],
        "runtime_gpu_count": accelerator_info["gpu_count"],
        "train_accuracy_last": float(history.history["accuracy"][-1]),
        "val_accuracy_last": float(history.history["val_accuracy"][-1]),
        "train_loss_last": float(history.history["loss"][-1]),
        "val_loss_last": float(history.history["val_loss"][-1]),
        "test_accuracy": float(test_acc),
        "test_loss": float(test_loss),
        "epochs_ran": len(history.history["loss"]),
        "class_names": class_names,
        "history": {
            "accuracy": [float(v) for v in history.history["accuracy"]],
            "val_accuracy": [float(v) for v in history.history["val_accuracy"]],
            "loss": [float(v) for v in history.history["loss"]],
            "val_loss": [float(v) for v in history.history["val_loss"]],
        },
    }
    cm = compute_confusion_matrix(model, test_ds, class_names)
    if cm is not None:
        report["confusion_matrix"] = cm

    with (args.model_dir / "training_report.json").open("w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("Training selesai.")
    print(f"- Test accuracy: {test_acc:.4f}")
    print(f"- Model Keras: {keras_path.resolve()}")
    if args.export_h5:
        print(f"- Model H5: {h5_path.resolve()}")
    print(f"- SavedModel: {saved_model_path.resolve()} (jika export berhasil)")
    print(f"- Report: {(args.model_dir / 'training_report.json').resolve()}")


if __name__ == "__main__":
    main()
