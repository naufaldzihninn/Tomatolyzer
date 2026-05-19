# 🍅 Tomatolyzer — Deteksi & Analisis Penyakit Daun Tomat Berbasis Deep Learning (CNN)

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.15-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white)](https://tensorflow.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4.0-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)

**Tomatolyzer** adalah sistem klasifikasi citra daun tomat cerdas berbasis kecerdasan buatan (AI) menggunakan arsitektur deep learning **CNN MobileNetV2**. Sistem ini dapat mengidentifikasi **10 kondisi daun** (9 patogen penyakit & 1 kondisi sehat) secara instan, lengkap dengan panduan penanganan biologis (organik), kimiawi, serta tips pencegahan lapangan.

---

## ✨ Fitur Unggulan

*   🛡️ **Sistem Klasifikasi Cerdas (CNN)**: Inferensi gambar berkecepatan tinggi menggunakan transfer learning model *MobileNetV2* yang dioptimalkan untuk pengenalan daun tomat.
*   🔬 **High-Tech Diagnostic Hub**: Dasbor analisis premium dengan akurasi model dinamis yang disesuaikan secara visual berdasarkan kategori patogen.
*   🚀 **Bagan Batang Akurasi Alternatif**: Presentasi statistik visual berbentuk progress bar yang mulus untuk menunjukkan probabilitas prediksi alternatif lainnya.
*   📖 **Ensiklopedia Terpadu (Split-Screen)**: Akses panduan medis terintegrasi yang membandingkan foto unggahan Anda dengan foto referensi laboratorium secara berdampingan.
*   🌱 **Dual Treatment Advisor**: Solusi cerdas yang merinci opsi **Penanganan Organik** (bebas pestisida) dan **Bahan Aktif Kimiawi** yang teruji ilmiah.
*   🛡️ **Privacy-First History**: Riwayat deteksi tersimpan aman di `localStorage` peramban Anda dengan fitur hapus per-item maupun hapus seluruh riwayat.
*   🔍 **Pure Image Lightbox Zoom**: Pemeriksa visual daun tomat secara mendalam dengan fitur zoom minimalis yang bebas dari gangguan teks.

---

## 📂 Struktur Repositori

```text
dauntomat/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI Web API (Endpoints: /predict, /health, /diseases)
│   │   └── disease_catalog.py   # Database 10 kondisi daun & tindakan penanganan
│   ├── train/
│   │   ├── prepare_dataset.py   # Pipeline manifest parsing dataset
│   │   ├── train_model.py       # Skrip pelatihan CNN MobileNetV2 Keras
│   │   └── check_gpu.py         # Skrip diagnosis akselerator GPU CUDA
│   ├── models/                  # Direktori penyimpanan model latih (*.keras)
│   └── requirements.txt         # File dependensi Python backend
├── frontend/
│   ├── public/
│   │   ├── favicon.svg          # Ikon tab browser kustom Tomatolyzer
│   │   └── assets/diseases/     # Gambar referensi 10 kondisi daun tomat
│   ├── src/
│   │   ├── App.jsx              # Komponen dasbor React utama (Clean UI)
│   │   ├── main.jsx             # Entrypoint React
│   │   └── index.css            # Desain kustom TailwindCSS
│   ├── package.json             # Dependensi Node.js frontend
│   └── vite.config.js           # Konfigurasi proxy server Vite
├── datasets/
│   └── archive/PlantVillage/    # Folder dataset mentah (PlantVillage Kaggle)
├── run_tomatoguard.sh           # Otomasi instalasi & startup untuk LINUX / macOS
└── run_tomatoguard.ps1          # Otomasi instalasi & startup untuk WINDOWS
```

---

## 🛠️ Prasyarat Sistem

*   **Python 3.10 atau lebih tinggi**
*   **Node.js 18 atau lebih tinggi**
*   **Dataset PlantVillage** (unduh dari Kaggle dan letakkan di `datasets/archive/PlantVillage/`)

---

## ⚡ Cara Menjalankan Aplikasi (Instan & Otomatis)

Kami menyediakan skrip otomasi yang akan mempersiapkan *Virtual Environment*, menginstal dependensi, memvalidasi dataset, melatih model (jika belum ada), dan menjalankan server frontend & backend secara bersamaan.

### **Untuk Pengguna Linux / macOS:**
```bash
# Berikan izin eksekusi jika perlu
chmod +x run_tomatoguard.sh

# Jalankan skrip otomatis
./run_tomatoguard.sh
```

### **Untuk Pengguna Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy Bypass -File .\run_tomatoguard.ps1
```

Setelah skrip berjalan sukses, Anda dapat mengakses:
*   **Aplikasi Web**: [http://localhost:5173](http://localhost:5173) (Vite Dev Server)
*   **Dokumentasi API**: [http://localhost:8001/docs](http://localhost:8001/docs) atau [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI)

---

## 🏗️ Pemasangan Manual

Jika Anda ingin menjalankan setiap komponen secara manual, ikuti langkah-langkah di bawah ini:

### **1. Konfigurasi Backend (Python)**
```bash
# Masuk ke direktori root proyek
python -m venv .venv

# Aktifkan virtual environment
source .venv/bin/activate  # Untuk Linux/macOS
# .venv\Scripts\activate   # Untuk Windows

# Instal paket dependensi
pip install -r backend/requirements.txt
```

### **2. Persiapan Dataset & Training Model CNN**
```bash
# 1. Generate Manifest Dataset (Train, Val, Test split)
python backend/train/prepare_dataset.py --raw-dir datasets/archive/PlantVillage --output-dir datasets/processed

# 2. Cek Akselerasi GPU CUDA (Opsional)
python backend/train/check_gpu.py

# 3. Jalankan Pelatihan Model
python backend/train/train_model.py --data-dir datasets/processed --epochs 12 --batch-size 32 --learning-rate 0.0001
```
*Model Keras yang terlatih akan disimpan di `backend/models/tomatoguard.keras`.*

### **3. Menjalankan Server API Backend**
```bash
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8001
```

### **4. Konfigurasi & Menjalankan Frontend (React)**
```bash
cd frontend

# Instal paket dependensi Node.js
npm install

# Jalankan server lokal
npm run dev
```

---

## 📊 Kategori Penyakit Terdeteksi (10 Kelas)

Sistem **Tomatolyzer** mampu membedakan kondisi daun tomat berikut ini:
1.  **Daun Sehat (Healthy)**
2.  **Bercak Bakteri (Bacterial Spot)**
3.  **Hawar Awal (Early Blight)**
4.  **Hawar Daun Late (Late Blight)**
5.  **Kapang Daun (Leaf Mold)**
6.  **Bercak Septoria (Septoria Leaf Spot)**
7.  **Tungau Laba-laba (Spider Mites)**
8.  **Bercak Sasaran (Target Spot)**
9.  **Daun Keriting Kuning (Yellow Leaf Curl Virus)**
10. **Mosaik Virus (Mosaic Virus)**

---

## 🔒 Privasi & Keamanan Data

Aplikasi ini mengutamakan privasi pengguna (*Privacy-First design*):
*   **Tanpa Database Cloud**: Riwayat deteksi Anda disimpan secara lokal di dalam memori peramban (`localStorage`). Gambar Anda tidak akan disimpan permanen oleh server luar.
*   **Offline Ready**: Model Keras dievaluasi secara privat pada server lokal backend Anda, tanpa mengirim data medis tanaman Anda ke pihak ketiga.
