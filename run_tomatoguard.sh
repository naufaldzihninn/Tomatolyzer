#!/bin/bash

# TomatoGuard Startup Script for Linux
# Translated from run_tomatoguard.ps1

set -e # Exit on error

# UI Helpers
write_step() {
    echo -e "\n\033[0;36m==> $1\033[0m"
}

require_path() {
    if [ ! -e "$1" ]; then
        echo -e "\033[0;31mPath tidak ditemukan: $1\033[0m"
        echo "Hint: $2"
        exit 1
    fi
}

root=$(pwd)
venv_dir="$root/.venv"
venv_python="$venv_dir/bin/python"
req_file="$root/backend/requirements.txt"
raw_dataset_dir="$root/datasets/archive/PlantVillage"
processed_train_csv="$root/datasets/processed/train.csv"
model_keras="$root/backend/models/tomatoguard.keras"
frontend_dir="$root/frontend"
node_modules_dir="$frontend_dir/node_modules"

write_step "Cek struktur project"
require_path "$req_file" "Pastikan file backend/requirements.txt ada."
require_path "$raw_dataset_dir" "Pastikan dataset ada di datasets/archive/PlantVillage."

# --- Python venv & backend deps ---
if [ ! -f "$venv_python" ] || ! "$venv_python" -c 'import sys; assert sys.version_info < (3, 12)' 2>/dev/null; then
    write_step "Membuat/memperbaiki virtual environment (.venv) dengan Python 3.11"
    # Hapus .venv jika isinya Windows atau versi Python tidak cocok
    if [ -d "$venv_dir" ]; then
        echo "Menghapus .venv lama..."
        rm -rf "$venv_dir"
    fi
    python3.11 -m venv .venv
fi

write_step "Install/update dependency Python"
"$venv_python" -m pip install --upgrade pip
"$venv_python" -m pip install -r "$req_file"

# --- Generate negative samples (Not_Tomato_Leaf) ---
neg_dir="$raw_dataset_dir/Not_Tomato_Leaf"
if [ ! -d "$neg_dir" ]; then
    write_step "Generating negative samples (Not_Tomato_Leaf)"
    "$venv_python" "backend/train/generate_negatives.py" --output-dir "$neg_dir" --count 2000
else
    write_step "Folder Not_Tomato_Leaf sudah ada, skip generate"
fi

# --- Dataset manifest ---
class_names_processed="$root/datasets/processed/class_names.json"
need_regen_manifest=false

if [ -f "$class_names_processed" ]; then
    if ! grep -q "Not_Tomato_Leaf" "$class_names_processed"; then
        write_step "Manifest lama tidak punya kelas Not_Tomato_Leaf, regenerate..."
        rm -rf "$root/datasets/processed"
        need_regen_manifest=true
    fi
fi

if [ "$need_regen_manifest" = true ] || [ ! -f "$processed_train_csv" ]; then
    write_step "Menyiapkan manifest dataset (train/val/test) - 11 kelas"
    "$venv_python" "backend/train/prepare_dataset.py" --raw-dir "datasets/archive/PlantVillage" --output-dir "datasets/processed"
else
    write_step "Manifest dataset sudah ada (11 kelas), skip prepare_dataset"
fi

# --- Training ---
model_class_names="$root/backend/models/class_names.json"
need_retrain=false

if [ -f "$model_keras" ] && [ -f "$model_class_names" ]; then
    if ! grep -q "Not_Tomato_Leaf" "$model_class_names"; then
        write_step "Model lama hanya 10 kelas, perlu retrain dengan 11 kelas"
        rm -f "$model_keras"
        need_retrain=true
    fi
fi

if [ "$need_retrain" = true ] || [ ! -f "$model_keras" ]; then
    write_step "Training model (11 kelas termasuk Not_Tomato_Leaf)"
    "$venv_python" "backend/train/train_model.py" --data-dir "datasets/processed" --epochs 12 --batch-size 16 --learning-rate 0.0001
else
    write_step "Model sudah ada (11 kelas), skip training"
fi

# --- Frontend: npm install ---
if [ ! -d "$node_modules_dir" ] || [ -d "$node_modules_dir/.bin/node.exe" ] || [ -f "$node_modules_dir/.bin/vite.cmd" ]; then
    write_step "Install dependency frontend (npm install)"
    # Cek jika node_modules dari Windows
    if [ -f "$node_modules_dir/.bin/vite.cmd" ]; then
        echo "Mendeteksi node_modules versi Windows, menghapus dan install ulang..."
        rm -rf "$node_modules_dir"
    fi
    cd "$frontend_dir"
    npm install
    cd "$root"
else
    write_step "node_modules sudah ada, skip npm install"
fi

# --- Launch Backend & Frontend ---
write_step "Menjalankan Backend & Frontend"

# Gunakan trap untuk kill background process saat script dihentikan
trap 'kill $BACKEND_PID $FRONTEND_PID' EXIT

"$venv_python" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8001 --reload &
BACKEND_PID=$!

cd "$frontend_dir"
npm run dev -- --port 5173 &
FRONTEND_PID=$!
cd "$root"

echo -e "\n\033[0;32mTomatoGuard aktif.\033[0m"
echo -e "Frontend : http://127.0.0.1:5173"
echo -e "Backend  : http://127.0.0.1:8001"
echo -e "Health   : http://127.0.0.1:8001/health"
echo -e "\nPID Backend : $BACKEND_PID"
echo -e "PID Frontend: $FRONTEND_PID"
echo -e "\nTekan Ctrl+C untuk menghentikan semua server."

wait
