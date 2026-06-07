from __future__ import annotations

import io
import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

from .disease_catalog import DISEASE_CATALOG

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

try:
    import tensorflow as tf
except Exception:  # pragma: no cover
    tf = None


BASE_DIR = Path(__file__).resolve().parents[1]
MODELS_DIR = BASE_DIR / "models"
DEFAULT_MODEL_CANDIDATES = [
    MODELS_DIR / "tomatoguard.keras",
    MODELS_DIR / "tomatoguard.h5",
    MODELS_DIR / "best_model.keras",
]
CLASS_NAMES_PATH = MODELS_DIR / "class_names.json"
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
IMAGE_SIZE = (224, 224)
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png"}
MIN_GREEN_LEAF_RATIO = 0.025
MIN_MIXED_LEAF_GREEN_RATIO = 0.010
MIN_MIXED_LEAF_COLOR_RATIO = 0.040
MIN_STRONG_LEAF_GREEN_RATIO = 0.150
MIN_LEAF_TEXTURE_STD = 12.0
NON_PLANT_IMAGENET_REJECT_SCORE = 0.35
MIN_TOMATO_ACCEPT_CONFIDENCE = 0.70
MAX_NOT_TOMATO_COMPETING_CONFIDENCE = 0.35


app = FastAPI(
    title="TomatoGuard API",
    version="0.1.0",
    description="API inferensi penyakit daun tomat untuk MVP TomatoGuard.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _normalize_class_name(raw: str) -> str:
    cleaned = raw.replace("Tomato__", "Tomato_")
    cleaned = cleaned.replace("_Two_spotted_spider_mite", "")
    cleaned = cleaned.replace("_", " ").strip()
    return cleaned


@lru_cache(maxsize=1)
def get_class_names() -> list[str]:
    if CLASS_NAMES_PATH.exists():
        with CLASS_NAMES_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list) and data:
                return data
    fallback = [
        "Not_Tomato_Leaf",
        "Tomato_Bacterial_spot",
        "Tomato_Early_blight",
        "Tomato_Late_blight",
        "Tomato_Leaf_Mold",
        "Tomato_Septoria_leaf_spot",
        "Tomato_Spider_mites_Two_spotted_spider_mite",
        "Tomato__Target_Spot",
        "Tomato__Tomato_YellowLeaf__Curl_Virus",
        "Tomato__Tomato_mosaic_virus",
        "Tomato_healthy",
    ]
    return fallback


@lru_cache(maxsize=1)
def get_model() -> Any:
    try:
        model_path_env = os.getenv("MODEL_PATH")
        if model_path_env:
            model_path = Path(model_path_env)
        else:
            model_path = next((p for p in DEFAULT_MODEL_CANDIDATES if p.exists()), None)
        if model_path is None or not model_path.exists():
            return None
        if tf is None:
            return None
        
        # 1. Monkeypatch base Layer constructor to discard any unsupported args globally
        from tensorflow.keras.layers import Layer
        if not hasattr(Layer, "_patched"):
            original_layer_init = Layer.__init__
            def patched_layer_init(self, *args, **kwargs):
                kwargs.pop('quantization_config', None)
                kwargs.pop('renorm', None)
                kwargs.pop('renorm_clipping', None)
                kwargs.pop('renorm_momentum', None)
                original_layer_init(self, *args, **kwargs)
            Layer.__init__ = patched_layer_init
            Layer._patched = True
            
        try:
            import keras
            from keras.layers import Layer as KerasLayer
            if not hasattr(KerasLayer, "_patched"):
                original_keras_layer_init = KerasLayer.__init__
                def patched_keras_layer_init(self, *args, **kwargs):
                    kwargs.pop('quantization_config', None)
                    kwargs.pop('renorm', None)
                    kwargs.pop('renorm_clipping', None)
                    kwargs.pop('renorm_momentum', None)
                    original_keras_layer_init(self, *args, **kwargs)
                KerasLayer.__init__ = patched_keras_layer_init
                KerasLayer._patched = True
        except Exception:
            pass

        # 2. Monkeypatch BatchNormalization to safely discard legacy Keras 2 arguments
        from tensorflow.keras.layers import BatchNormalization
        if not hasattr(BatchNormalization, "_patched"):
            original_init = BatchNormalization.__init__
            def patched_init(self, *args, **kwargs):
                kwargs.pop('quantization_config', None)
                kwargs.pop('renorm', None)
                kwargs.pop('renorm_clipping', None)
                kwargs.pop('renorm_momentum', None)
                original_init(self, *args, **kwargs)
            BatchNormalization.__init__ = patched_init
            BatchNormalization._patched = True
            
        try:
            import keras
            from keras.layers import BatchNormalization as KerasBatchNormalization
            if not hasattr(KerasBatchNormalization, "_patched"):
                original_keras_init = KerasBatchNormalization.__init__
                def patched_keras_init(self, *args, **kwargs):
                    kwargs.pop('quantization_config', None)
                    kwargs.pop('renorm', None)
                    kwargs.pop('renorm_clipping', None)
                    kwargs.pop('renorm_momentum', None)
                    original_keras_init(self, *args, **kwargs)
                KerasBatchNormalization.__init__ = patched_keras_init
                KerasBatchNormalization._patched = True
        except Exception:
            pass
        
        # Load model tanpa kompilasi (compile=False) karena hanya digunakan untuk inferensi
        return tf.keras.models.load_model(model_path, compile=False)
    except Exception as e:
        import traceback
        print(f"FATAL MODEL LOAD ERROR: {e}")
        traceback.print_exc()
        return e


@lru_cache(maxsize=1)
def get_imagenet_model() -> Any:
    if tf is None:
        return None
    # Model MobileNetV2 dengan bobot ImageNet orisinil untuk zero-shot filter
    return tf.keras.applications.MobileNetV2(weights="imagenet")


def _leaf_image_metrics(contents: bytes) -> dict[str, float]:
    with Image.open(io.BytesIO(contents)) as img:
        img = img.convert("RGB")
        img = img.resize((64, 64))
        arr = np.asarray(img, dtype=np.float32)

    R, G, B = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

    green_mask = (G > R * 0.92) & (G > B * 1.02) & (G > 20)
    green_ratio = float(np.mean(green_mask))

    yellow_leaf_mask = (G > B * 1.05) & (R > B * 1.05) & (G > 35) & (R > 35)
    leaf_color_ratio = float(np.mean(green_mask | yellow_leaf_mask))
    texture_std = float(np.mean(arr, axis=2).std())

    return {
        "green_ratio": green_ratio,
        "leaf_color_ratio": leaf_color_ratio,
        "texture_std": texture_std,
    }


def _has_leaf_visual_signal(metrics: dict[str, float]) -> bool:
    has_leaf_color = (
        metrics["green_ratio"] >= MIN_GREEN_LEAF_RATIO
        or (
            metrics["green_ratio"] >= MIN_MIXED_LEAF_GREEN_RATIO
            and metrics["leaf_color_ratio"] >= MIN_MIXED_LEAF_COLOR_RATIO
        )
    )
    return has_leaf_color and metrics["texture_std"] >= MIN_LEAF_TEXTURE_STD


def _is_green_leaf(contents: bytes) -> bool:
    try:
        return _has_leaf_visual_signal(_leaf_image_metrics(contents))
    except Exception:
        # Jika terjadi error saat parsing gambar, kembalikan True agar tidak menghalangi request valid
        return True


def _is_plant_imagenet(contents: bytes) -> bool:
    try:
        model = get_imagenet_model()
        if model is None:
            return True

        with Image.open(io.BytesIO(contents)) as img:
            img = img.convert("RGB")
            img = img.resize((224, 224))
            x = np.asarray(img, dtype=np.float32)

        # Preprocessing khusus MobileNetV2: skala ke [-1, 1]
        x = (x / 127.5) - 1.0
        x = np.expand_dims(x, axis=0)

        preds = model.predict(x, verbose=0)[0]
        
        from tensorflow.keras.applications.mobilenet_v2 import decode_predictions
        decoded = decode_predictions(np.expand_dims(preds, axis=0), top=3)[0]

        # Kata kunci kelas ImageNet yang merepresentasikan daun/tanaman/sayuran/pot tanaman
        TRUE_PLANT_KEYWORDS = {
            'cabbage', 'leaf', 'artichoke', 'pepper', 'pumpkin', 'zucchini', 'cucumber', 
            'banana', 'fig', 'pineapple', 'acorn', 'hip', 'strawberry', 'lemon', 'lime', 
            'orange', 'pomegranate', 'daisy', 'cardoon', 'mushroom', 'buckeye', 'hay', 
            'corn', 'broccoli', 'cauliflower', 'clover', 'pot', 'greenhouse', 'flower'
        }

        # Cek apakah salah satu dari top 3 prediksi memiliki kata kunci tanaman
        for _, label, prob in decoded:
            if any(kw in label.lower() for kw in TRUE_PLANT_KEYWORDS):
                return True
        return False
    except Exception:
        # Fallback jika terjadi error
        return True


def _is_clear_non_plant_imagenet(contents: bytes) -> bool:
    try:
        model = get_imagenet_model()
        if model is None:
            return False

        with Image.open(io.BytesIO(contents)) as img:
            img = img.convert("RGB")
            img = img.resize((224, 224))
            x = np.asarray(img, dtype=np.float32)

        x = (x / 127.5) - 1.0
        x = np.expand_dims(x, axis=0)

        preds = model.predict(x, verbose=0)[0]

        from tensorflow.keras.applications.mobilenet_v2 import decode_predictions
        decoded = decode_predictions(np.expand_dims(preds, axis=0), top=5)[0]

        plant_keywords = {
            "leaf", "cabbage", "artichoke", "pepper", "pumpkin", "zucchini",
            "cucumber", "fig", "pineapple", "acorn", "strawberry", "lemon",
            "pomegranate", "daisy", "cardoon", "mushroom", "hay", "corn",
            "broccoli", "cauliflower", "clover", "greenhouse", "flower",
        }
        non_plant_keywords = {
            "person", "man", "woman", "groom", "suit", "jersey", "apron",
            "mask", "helmet", "crash_helmet", "hard_hat", "sunglass",
            "sunglasses", "gasmask", "oxygen_mask", "backpack", "coil",
            "electrician", "construction", "uniform", "lab_coat",
        }

        has_plant_signal = False
        non_plant_score = 0.0
        for _, label, prob in decoded:
            normalized = label.lower().replace("-", "_")
            if any(kw in normalized for kw in plant_keywords):
                has_plant_signal = True
            if any(kw in normalized for kw in non_plant_keywords):
                non_plant_score += float(prob)

        return non_plant_score >= NON_PLANT_IMAGENET_REJECT_SCORE and not has_plant_signal
    except Exception:
        return False


def _preprocess_image(contents: bytes) -> np.ndarray:
    with Image.open(io.BytesIO(contents)) as img:
        img = img.convert("RGB")
        img = img.resize(IMAGE_SIZE)
        arr = np.asarray(img, dtype=np.float32) / 255.0
    arr = np.expand_dims(arr, axis=0)
    return arr


def _top_k_predictions(probabilities: np.ndarray, class_names: list[str], k: int = 3) -> list[dict[str, Any]]:
    top_indices = np.argsort(probabilities)[::-1][:k]
    result = []
    for idx in top_indices:
        result.append(
            {
                "class_index": int(idx),
                "class_name": _normalize_class_name(class_names[idx]),
                "confidence": float(probabilities[idx]),
            }
        )
    return result


def _is_not_tomato_class(class_name: str) -> bool:
    normalized = class_name.lower()
    return any(kw in normalized for kw in ("not tomato", "not_tomato", "bukan"))


def _reject_not_tomato_leaf(
    file_name: str | None,
    reason: str,
    message: str,
    confidence: float = 0.0,
    top3: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return {
        "prediction": "Not_Tomato_Leaf",
        "confidence": confidence,
        "top3": top3 or [
            {"class_index": 0, "class_name": "Not Tomato Leaf", "confidence": confidence}
        ],
        "file_name": file_name,
        "is_tomato_leaf": False,
        "rejection_reason": reason,
        "message": message,
    }


@app.get("/health")
def health() -> dict[str, Any]:
    model_res = get_model()
    model_loaded = model_res is not None and not isinstance(model_res, Exception)
    error_msg = str(model_res) if isinstance(model_res, Exception) else None
    
    tf_version = tf.__version__ if tf is not None else None
    keras_version = None
    try:
        import keras
        keras_version = keras.__version__
    except Exception:
        pass
        
    return {
        "status": "ok",
        "tensorflow_version": tf_version,
        "keras_version": keras_version,
        "model_loaded": model_loaded,
        "class_count": len(get_class_names()),
        "error": error_msg,
    }


@app.get("/diseases")
def diseases() -> dict[str, Any]:
    return {"items": DISEASE_CATALOG}


@app.post("/predict")
async def predict(file: UploadFile = File(...)) -> dict[str, Any]:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Format file harus JPG/JPEG/PNG.")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Ukuran file maksimal 5MB.")

    # --- Strict gate: hanya foto daun/tumbuhan yang diberi kesempatan masuk CNN tomat. ---
    # Untuk mencegah barang/manusia dipaksa menjadi salah satu penyakit tomat, mode ini
    # lebih memilih menolak foto meragukan daripada memberi diagnosis palsu.
    try:
        leaf_metrics = _leaf_image_metrics(contents)
    except Exception:
        leaf_metrics = {
            "green_ratio": 0.0,
            "leaf_color_ratio": 0.0,
            "texture_std": 0.0,
        }

    if not _has_leaf_visual_signal(leaf_metrics):
        return _reject_not_tomato_leaf(
            file.filename,
            "low_leaf_color_signal",
            "Gambar tidak memiliki cukup sinyal warna daun. Unggah foto daun tomat yang jelas dan memenuhi sebagian besar frame.",
        )

    if _is_clear_non_plant_imagenet(contents):
        return _reject_not_tomato_leaf(
            file.filename,
            "clear_non_plant_object",
            "Gambar terdeteksi sebagai objek non-tanaman. Unggah foto daun tomat yang memenuhi sebagian besar frame.",
        )

    model = get_model()
    if model is None or isinstance(model, Exception):
        raise HTTPException(
            status_code=503,
            detail=(
                f"Model belum siap atau gagal dimuat: {str(model) if isinstance(model, Exception) else 'file model tidak ditemukan'}."
            ),
        )

    class_names = get_class_names()
    image_tensor = _preprocess_image(contents)
    preds = model.predict(image_tensor, verbose=0)[0]
    top3 = _top_k_predictions(preds, class_names, k=3)
    best = top3[0]

    is_tomato = not _is_not_tomato_class(best["class_name"])
    not_tomato_confidence = float(
        max(
            (
                item["confidence"]
                for item in top3
                if _is_not_tomato_class(item["class_name"])
            ),
            default=0.0,
        )
    )

    if not is_tomato:
        return _reject_not_tomato_leaf(
            file.filename,
            "model_not_tomato_leaf",
            "Model menilai gambar ini bukan daun tomat.",
            confidence=best["confidence"],
            top3=top3,
        )

    if best["confidence"] < MIN_TOMATO_ACCEPT_CONFIDENCE:
        return _reject_not_tomato_leaf(
            file.filename,
            "low_tomato_confidence",
            "Model belum cukup yakin bahwa gambar ini daun tomat. Coba foto ulang daun dari jarak lebih dekat.",
            confidence=best["confidence"],
            top3=top3,
        )

    if not_tomato_confidence >= MAX_NOT_TOMATO_COMPETING_CONFIDENCE:
        return _reject_not_tomato_leaf(
            file.filename,
            "not_tomato_competing_prediction",
            "Model masih melihat kemungkinan kuat bahwa gambar bukan daun tomat. Unggah foto daun tomat yang lebih jelas.",
            confidence=not_tomato_confidence,
            top3=top3,
        )

    is_plant_like = _is_plant_imagenet(contents)
    has_strong_leaf_visual = (
        leaf_metrics["green_ratio"] >= MIN_STRONG_LEAF_GREEN_RATIO
        and leaf_metrics["texture_std"] >= MIN_LEAF_TEXTURE_STD
    )
    if not is_plant_like and not has_strong_leaf_visual:
        return _reject_not_tomato_leaf(
            file.filename,
            "not_recognized_as_leaf_or_plant",
            "Gambar belum cukup kuat dikenali sebagai daun/tanaman. Unggah foto daun tomat yang lebih dekat, tajam, dan minim objek lain.",
            confidence=best["confidence"],
            top3=top3,
        )

    return {
        "prediction": best["class_name"],
        "confidence": best["confidence"],
        "top3": top3,
        "file_name": file.filename,
        "is_tomato_leaf": is_tomato,
        "low_confidence": False,
        "warning": None,
    }
