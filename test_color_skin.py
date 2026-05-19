import sys
import numpy as np
from PIL import Image

def analyze_image(img_path):
    img = Image.open(img_path).convert('RGB')
    arr = np.asarray(img, dtype=np.float32)
    R, G, B = arr[:,:,0], arr[:,:,1], arr[:,:,2]
    
    # Healthy Green: G > R and G > B
    green_mask = (G > R * 0.95) & (G > B)
    green_ratio = np.mean(green_mask)
    
    # Yellow/Brown (Diseased): R and G are somewhat close, but B is low
    yellow_brown_mask = (R > B * 1.2) & (G > B * 1.2) & (R < G * 1.6) & (G < R * 1.6)
    yellow_ratio = np.mean(yellow_brown_mask)
    
    # Check if skin is falsely flagged as yellow/brown.
    # True skin often has very high R relative to G.
    # Let's refine plant mask to EXCLUDE high-red (R >> G)
    refined_mask = (green_mask | yellow_brown_mask) & (R < G * 1.3)
    refined_ratio = np.mean(refined_mask)
    
    print(f"File: {img_path}")
    print(f"  Refined Plant pixels: {refined_ratio*100:.1f}%")

# Let's test a synthetic skin image
import glob
for f in glob.glob('datasets/archive/PlantVillage/Not_Tomato_Leaf/neg_skin_tone_patches_*.jpg')[:3]:
    analyze_image(f)
