import sys
import numpy as np
import tensorflow as tf
from PIL import Image

model = tf.keras.models.load_model('backend/models/tomatoguard.keras')

def test_image(img_path):
    try:
        img = Image.open(img_path).convert('RGB').resize((224, 224))
        arr = np.expand_dims(np.asarray(img, dtype=np.float32) / 255.0, axis=0)
        preds = model.predict(arr, verbose=0)[0]
        top = np.argmax(preds)
        print(f"File: {img_path} | Pred: index {top} ({preds[top]:.4f})")
    except Exception as e:
        print(f"Error reading {img_path}: {e}")

# test a skin tone synthetic image
import os, glob
neg_dir = 'datasets/archive/PlantVillage/Not_Tomato_Leaf'
skin_files = [f for f in glob.glob(os.path.join(neg_dir, 'neg_skin_tone_patches_*.jpg'))]
if skin_files:
    test_image(skin_files[0])
else:
    print('No skin tone images found.')
