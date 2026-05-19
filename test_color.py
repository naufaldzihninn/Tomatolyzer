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
    
    # Overall plant mask
    plant_ratio = green_ratio + yellow_ratio
    
    print(f"File: {img_path}")
    print(f"  Green: {green_ratio*100:.1f}%, Yellow/Brown: {yellow_ratio*100:.1f}% => Total Plant: {plant_ratio*100:.1f}%")

import glob
for f in glob.glob('datasets/archive/PlantVillage/Tomato_healthy/*.jpg')[:3]:
    analyze_image(f)
for f in glob.glob('datasets/archive/PlantVillage/Tomato_Early_blight/*.jpg')[:3]:
    analyze_image(f)
