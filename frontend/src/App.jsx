import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Leaf, UploadCloud, AlertTriangle, CheckCircle2, Clock,
  ChevronRight, X, Activity, ShieldCheck, Thermometer,
  Info, Bug, Droplets, Wind, Image as ImageIcon, ZoomIn,
  Ban, Camera, Search, BookOpen, Heart, Sparkles, ShieldAlert,
  ChevronDown, Trash2
} from 'lucide-react';

// --- CONSTANTS ---
const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const HISTORY_KEY = 'tomatolyzer_history_v4';
const MAX_HISTORY = 30;

// --- DISEASE CATALOG (fallback + UI enrichment) ---
const DISEASE_CATALOG = [
  { 
    id: 'healthy', 
    key: 'tomato_healthy', 
    name: 'Daun Sehat (Healthy)', 
    type: 'Normal', 
    image: '/assets/diseases/healthy.jpg', 
    desc: 'Daun tomat dalam kondisi sehat, hijau segar, tanpa tanda-tanda infeksi atau hama.', 
    cause: 'Perawatan yang baik dan nutrisi seimbang.', 
    treatment: 'Lanjutkan penyiraman, pemupukan rutin, dan pantau kelembaban.', 
    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', gradient: 'from-emerald-400 to-green-500',
    prevention: [
      "Jaga keseimbangan nutrisi makro (NPK) dan mikro tanah secara teratur.",
      "Lakukan perempelan daun-daun tua di bagian bawah untuk sirkulasi optimal.",
      "Pantau kelembapan dan keasaman (pH) tanah secara berkala."
    ]
  },
  { 
    id: 'bacterial_spot', 
    key: 'tomato_bacterial_spot', 
    name: 'Bacterial Spot', 
    type: 'Bakteri', 
    image: '/assets/diseases/bacterial_spot.jpg', 
    desc: 'Bercak air kecil yang berubah menjadi coklat gelap/hitam dengan halo kuning.', 
    cause: 'Bakteri Xanthomonas campestris pv. vesicatoria.', 
    treatment: 'Gunakan bakterisida berbahan dasar tembaga. Hindari penyiraman dari atas (overhead irrigation).', 
    color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', gradient: 'from-amber-400 to-orange-500',
    prevention: [
      "Gunakan benih atau bibit tomat yang bersertifikat bebas bakteri.",
      "Hindari penanaman tomat di lahan bekas komoditas Solanaceae secara berturut-turut.",
      "Semprotkan bakterisida berbahan aktif tembaga secara preventif menjelang musim hujan."
    ]
  },
  { 
    id: 'early_blight', 
    key: 'tomato_early_blight', 
    name: 'Early Blight', 
    type: 'Jamur', 
    image: '/assets/diseases/early_blight.jpg', 
    desc: 'Bercak coklat dengan cincin konsentris (seperti papan target) pada daun bagian bawah.', 
    cause: 'Jamur Alternaria solani.', 
    treatment: 'Buang daun yang terinfeksi. Gunakan fungisida yang mengandung klorotalonil atau mankozeb.', 
    color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', gradient: 'from-orange-400 to-red-500',
    prevention: [
      "Lakukan rotasi tanaman minimal 2 tahun dengan tanaman non-Solanaceae.",
      "Gunakan mulsa plastik untuk mencegah percikan spora jamur dari tanah ke daun bawah.",
      "Pangkas daun-daun bagian bawah hingga setinggi 30 cm dari permukaan tanah."
    ]
  },
  { 
    id: 'late_blight', 
    key: 'tomato_late_blight', 
    name: 'Late Blight', 
    type: 'Jamur/Oomycete', 
    image: '/assets/diseases/late_blight.jpg', 
    desc: 'Bercak basah besar tidak beraturan yang cepat mengering, sering muncul embun putih di bawah daun.', 
    cause: 'Phytophthora infestans.', 
    treatment: 'Sangat menular. Segera cabut dan musnahkan tanaman yang parah. Gunakan fungisida spesifik.', 
    color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', gradient: 'from-red-500 to-rose-600',
    prevention: [
      "Pilih varietas benih tomat unggul yang memiliki ketahanan terhadap Late Blight.",
      "Jaga jarak tanam agar daun tanaman tidak saling tumpang tindih dan cepat kering.",
      "Bersihkan kebun dari tanaman inang liar seperti terung-terungan di sekitar kebun."
    ]
  },
  { 
    id: 'leaf_mold', 
    key: 'tomato_leaf_mold', 
    name: 'Leaf Mold', 
    type: 'Jamur', 
    image: '/assets/diseases/leaf_mold.jpg', 
    desc: 'Bercak kuning pucat di permukaan atas, spora berbulu berwarna zaitun/coklat di bawah daun.', 
    cause: 'Fulvia fulva (Passalora fulva).', 
    treatment: 'Tingkatkan sirkulasi udara di rumah kaca. Kurangi kelembaban tinggi. Gunakan fungisida yang sesuai.', 
    color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', gradient: 'from-yellow-400 to-amber-500',
    prevention: [
      "Maksimalkan ventilasi dan sirkulasi udara di dalam rumah kaca (greenhouse).",
      "Jaga kelembapan relatif (RH) lingkungan rumah kaca agar selalu di bawah 85%.",
      "Lakukan sterilisasi struktur greenhouse menggunakan disinfektan sebelum siklus tanam baru."
    ]
  },
  { 
    id: 'septoria', 
    key: 'tomato_septoria_leaf_spot', 
    name: 'Septoria Leaf Spot', 
    type: 'Jamur', 
    image: '/assets/diseases/septoria_leaf_spot.jpg', 
    desc: 'Bercak kecil melingkar dengan pusat abu-abu/putih dan tepi gelap, sering memiliki bintik hitam di tengah.', 
    cause: 'Jamur Septoria lycopersici.', 
    treatment: 'Singkirkan daun yang sakit. Lakukan rotasi tanaman dan gunakan fungisida berbahan aktif tembaga.', 
    color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200', gradient: 'from-teal-400 to-cyan-500',
    prevention: [
      "Kendalikan gulma inang liar seperti kecubung atau terung liar di batas kebun.",
      "Gunakan sistem irigasi tetes (drip) untuk menghindari pembasahan daun yang memicu spora.",
      "Lakukan pembersihan menyeluruh terhadap sisa mulsa dan daun tomat pasca panen selesai."
    ]
  },
  { 
    id: 'spider_mites', 
    key: 'tomato_spider_mites', 
    name: 'Spider Mites', 
    type: 'Hama (Tungau)', 
    image: '/assets/diseases/spider_mites.jpg', 
    desc: 'Bintik-bintik kuning kecil pada daun, sering disertai jaring laba-laba halus di bawah daun.', 
    cause: 'Tetranychus urticae (Tungau laba-laba dua bintik).', 
    treatment: 'Gunakan akarisida. Semprot daun dengan air bertekanan untuk merusak sarang. Jaga kelembaban.', 
    color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', gradient: 'from-rose-400 to-pink-500',
    prevention: [
      "Pasang insect net (jaring serangga) dengan kerapatan tinggi di sekeliling area semai.",
      "Lakukan penyemprotan air dingin bertekanan ke bawah permukaan daun secara berkala.",
      "Semprotkan pestisida nabati seperti minyak mimba (neem oil) untuk membasmi telur tungau."
    ]
  },
  { 
    id: 'target_spot', 
    key: 'tomato_target_spot', 
    name: 'Target Spot', 
    type: 'Jamur', 
    image: '/assets/diseases/target_spot.jpg', 
    desc: 'Bercak coklat tua melingkar dengan lingkaran konsentris, mirip Early Blight tetapi lebih kecil.', 
    cause: 'Jamur Corynespora cassiicola.', 
    treatment: 'Tingkatkan aliran udara, hindari naungan berlebih, dan aplikasikan fungisida sistemik.', 
    color: 'text-fuchsia-700', bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', gradient: 'from-fuchsia-400 to-purple-500',
    prevention: [
      "Atur jarak tanam yang longgar agar sinar matahari dapat menjangkau sela-sela batang bawah.",
      "Siram tanaman pada pagi hari saja agar sisa air di permukaan daun menguap sebelum malam.",
      "Gunakan fungisida kontak berbahan aktif mankozeb sebelum gejala penyakit muncul."
    ]
  },
  { 
    id: 'tylcv', 
    key: 'tomato_yellow_leaf_curl_virus', 
    name: 'Tomato Yellow Leaf Curl', 
    type: 'Virus', 
    image: '/assets/diseases/yellow_leaf_curl_virus.jpg', 
    desc: 'Daun menguning di tepi, mengerut, dan melengkung ke atas. Tanaman menjadi kerdil.', 
    cause: 'Virus yang ditularkan oleh hama Kutu Kebul (Whitefly).', 
    treatment: 'Kendalikan populasi kutu kebul dengan insektisida. Cabut dan bakar tanaman yang terinfeksi.', 
    color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', gradient: 'from-indigo-500 to-violet-500',
    prevention: [
      "Gunakan kelambu semai halus bermesh 50 untuk pembibitan agar steril dari kutu.",
      "Pasang perangkap perekat warna kuning (yellow sticky trap) secara merata di area kebun.",
      "Bersihkan tanaman inang liar dari keluarga Solanaceae di sekitar pagar pembatas lahan."
    ]
  },
  { 
    id: 'mosaic_virus', 
    key: 'tomato_mosaic_virus', 
    name: 'Tomato Mosaic Virus', 
    type: 'Virus', 
    image: '/assets/diseases/mosaic_virus.jpg', 
    desc: 'Pola mosaik belang-belang hijau muda dan kuning pada daun. Daun bisa melengkung seperti tali.', 
    cause: 'Tomato mosaic virus (ToMV). Menular lewat sentuhan.', 
    treatment: 'Tidak ada obat kimia. Sanitasi alat potong, cuci tangan, dan segera musnahkan tanaman yang sakit.', 
    color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', gradient: 'from-blue-400 to-cyan-500',
    prevention: [
      "Sterilkan gunting stek dan perkakas kebun menggunakan deterjen atau larutan trisodium fosfat.",
      "Selalu gunakan varietas benih bersertifikat bebas virus (F1 certified seed).",
      "Segera isolasi, cabut, dan bakar tanaman muda yang menunjukkan gejala daun mosaik."
    ]
  }
];

// --- HELPER: Normalize class name for matching ---
function normalizeToken(text) {
  return (text || '')
    .toLowerCase()
    .replace(/tomato/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findCatalogByPrediction(prediction) {
  const pred = normalizeToken(prediction);
  if (!pred) return null;

  let hit = DISEASE_CATALOG.find(
    (c) => normalizeToken(c.name) === pred || normalizeToken(c.key) === pred
  );
  if (hit) return hit;

  hit = DISEASE_CATALOG.find(
    (c) => pred.includes(normalizeToken(c.name)) || normalizeToken(c.name).includes(pred)
  );
  if (hit) return hit;

  let best = null;
  let bestScore = 0;
  const predWords = pred.split(' ').filter(Boolean);
  DISEASE_CATALOG.forEach((c) => {
    const words = new Set(normalizeToken(c.name).split(' ').filter(Boolean));
    const score = predWords.reduce((sum, w) => sum + (words.has(w) ? 1 : 0), 0);
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  });
  return bestScore >= 1 ? best : null;
}

function prettyName(text) {
  return normalizeToken(text)
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

// --- LOCAL STORAGE ---
function readHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(items) {
  try {
    // Don't store large image data in localStorage — store only thumbnails
    const slim = items.slice(0, MAX_HISTORY).map((item) => ({
      ...item,
      image: item.image ? item.image.substring(0, 200) + '...' : null, // truncate for storage
    }));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(slim));
  } catch {
    // Storage may be full, silently fail
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function Tomatolyzer() {
  const [activeTab, setActiveTab] = useState('detect');

  // Detection State
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal Image State
  const [selectedImage, setSelectedImage] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [modalTab, setModalTab] = useState('symptoms');

  // Catalog Search and Category Filter States
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('Semua');

  // History State
  const [history, setHistory] = useState(() => readHistory());
  const fileInputRef = useRef(null);

  // --- HISTORY HANDLERS ---
  const loadHistoryResult = (item) => {
    setImagePreview(item.image);
    setImageFile(null); // Clear active file ref
    setResult(item);
    setActiveTab('detect');
    // Scroll to scanner zone smoothly
    setTimeout(() => {
      document.getElementById('scanner-zone')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const deleteHistoryItem = (id, e) => {
    e.stopPropagation(); // Avoid triggering card click
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      saveHistory(updated);
      return updated;
    });
  };

  const clearAllHistory = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus seluruh riwayat diagnosis? Tindakan ini permanen.')) {
      setHistory([]);
      saveHistory([]);
    }
  };

  // --- HANDLERS ---
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file) => {
    setErrorMsg('');
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran file maksimal 5MB.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      setErrorMsg('Format file harus JPG atau PNG.');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
    setResult(null);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- REAL API CALL with fallback to mock ---
  const startAnalysis = useCallback(async () => {
    if (!imageFile) return;
    setIsAnalyzing(true);
    setErrorMsg('');

    try {
      const fd = new FormData();
      fd.append('file', imageFile);
      const response = await fetch(`${API_BASE}/predict`, { method: 'POST', body: fd });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.detail || 'Prediksi gagal.');
      }

      // --- Rejection: NOT a tomato leaf ---
      if (payload.is_tomato_leaf === false) {
        const rejectionResult = {
          id: Date.now(),
          image: imagePreview,
          timestamp: new Date().toLocaleString('id-ID'),
          rejected: true,
          primary: {
            id: 'not_tomato_leaf',
            name: 'Bukan Daun Tomat',
            type: 'Ditolak',
            confidence: (payload.confidence * 100).toFixed(2),
            desc: 'Gambar yang diunggah tidak terdeteksi sebagai daun tomat. Sistem AI hanya dapat menganalisis foto daun tomat.',
            treatment: 'Pastikan foto yang diunggah adalah daun tomat dengan pencahayaan yang baik dan latar belakang yang jelas.',
            gradient: 'from-slate-500 to-slate-700',
            color: 'text-slate-700',
            bg: 'bg-slate-100',
            border: 'border-slate-300',
          },
          alternatives: [],
        };
        setResult(rejectionResult);
        setHistory((prev) => {
          const updated = [rejectionResult, ...prev].slice(0, MAX_HISTORY);
          saveHistory(updated);
          return updated;
        });
        return;
      }

      // Map API response to UI result
      const catalogMatch = findCatalogByPrediction(payload.prediction);
      const primaryName = catalogMatch ? catalogMatch.name : prettyName(payload.prediction);
      const primaryType = catalogMatch ? catalogMatch.type : 'Deteksi Model';
      const primaryDesc = catalogMatch ? catalogMatch.desc : 'Prediksi utama hasil inferensi model CNN.';
      const primaryTreatment = catalogMatch ? catalogMatch.treatment : 'Bandingkan hasil dengan katalog penyakit dan lakukan inspeksi lapangan.';
      const primaryGradient = catalogMatch ? catalogMatch.gradient : 'from-slate-400 to-slate-600';
      const primaryColor = catalogMatch ? catalogMatch.color : 'text-slate-700';
      const primaryBg = catalogMatch ? catalogMatch.bg : 'bg-slate-50';
      const primaryBorder = catalogMatch ? catalogMatch.border : 'border-slate-200';
      const primaryId = catalogMatch ? catalogMatch.id : 'unknown';

      const alternatives = (payload.top3 || [])
        .filter((x) => normalizeToken(x.class_name) !== normalizeToken(payload.prediction))
        .slice(0, 2)
        .map((x) => ({
          name: findCatalogByPrediction(x.class_name)?.name || prettyName(x.class_name),
          confidence: (x.confidence * 100).toFixed(2),
        }));

      const newResult = {
        id: Date.now(),
        image: imagePreview,
        timestamp: new Date().toLocaleString('id-ID'),
        primary: {
          id: primaryId,
          name: primaryName,
          type: primaryType,
          confidence: (payload.confidence * 100).toFixed(2),
          desc: primaryDesc,
          treatment: primaryTreatment,
          gradient: primaryGradient,
          color: primaryColor,
          bg: primaryBg,
          border: primaryBorder,
          prevention: catalogMatch ? catalogMatch.prevention : null,
        },
        alternatives,
      };

      setResult(newResult);
      setHistory((prev) => {
        const updated = [newResult, ...prev].slice(0, MAX_HISTORY);
        saveHistory(updated);
        return updated;
      });
    } catch (err) {
      // If backend is not available, show user-friendly error
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setErrorMsg('Backend tidak tersedia. Pastikan server API berjalan di port 8001.');
      } else {
        setErrorMsg(err.message || 'Terjadi kesalahan saat prediksi.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [imageFile, imagePreview]);

  // --- UI COMPONENTS ---
  const renderHeader = () => (
    <header className="bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-800 sticky top-0 z-20 shadow-lg text-white border-b-4 border-emerald-500">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-white p-1.5 rounded-lg shadow-sm">
            <Leaf className="w-6 h-6 text-emerald-600" />
          </div>
          <h1 className="font-extrabold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-emerald-200">
            Tomatolyzer
          </h1>
        </div>
        <nav className="flex gap-2 bg-black/10 p-1.5 rounded-xl backdrop-blur-sm">
          {['detect', 'catalog', 'history'].map((tab) => (
            <button
              key={tab}
              id={`tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 capitalize cursor-pointer ${
                activeTab === tab
                  ? 'bg-white text-emerald-800 shadow-md transform scale-105'
                  : 'text-emerald-50 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab === 'detect' ? 'Deteksi' : tab === 'catalog' ? 'Katalog' : 'Riwayat'}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );

  const renderDetectionTab = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      {/* Premium Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-12 px-4">
        <h2 className="text-4xl md:text-5xl font-black text-slate-800 mb-5 tracking-tight leading-tight">
          Tomatolyzer: Pindai & Lindungi Kebun Anda
        </h2>
        <p className="text-slate-500 text-lg leading-relaxed max-w-2xl mx-auto mb-8">
          Sistem diagnosis kesehatan tanaman berbasis Deep Learning. Deteksi dini 9 patogen penyakit & kondisi normal daun tomat secara instan untuk hasil panen yang sehat.
        </p>
        <button
          onClick={() => document.getElementById('scanner-zone')?.scrollIntoView({ behavior: 'smooth' })}
          className="inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold rounded-2xl shadow-xl shadow-emerald-700/25 hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 cursor-pointer text-sm"
        >
          <Camera className="w-5 h-5 animate-pulse" /> Pindai Daun Tomat Sekarang
        </button>
      </div>

      {/* Tech Stack & Core Pillars Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-14 px-2">
        {/* Card 1 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg shadow-slate-100/40 hover:shadow-xl transition-all duration-300">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md mb-5">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-lg text-slate-800 mb-2">Model CNN MobileNetV2</h3>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            Arsitektur neural network modern yang dilatih pada 10,000+ data citra PlantVillage untuk akurasi klasifikasi tingkat seluler.
          </p>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg shadow-slate-100/40 hover:shadow-xl transition-all duration-300">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md mb-5">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-lg text-slate-800 mb-2">Pertahanan Dual-Filter</h3>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            Dilengkapi filter klorofil instan dan model OOD ImageNet untuk menolak otomatis unggahan foto acak non-tumbuhan (wajah/benda).
          </p>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg shadow-slate-100/40 hover:shadow-xl transition-all duration-300">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-md mb-5">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-lg text-slate-800 mb-2">Solusi & Tindakan</h3>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            Menyediakan langkah penanganan agrikultur organik & kimia teruji secara langsung demi melokalisasi penyebaran patogen.
          </p>
        </div>
      </div>

      {/* Interactive Scroll Discovery Divider */}
      <div className="mb-10 flex flex-col items-center justify-center text-center">
        <button
          onClick={() => document.getElementById('scanner-zone')?.scrollIntoView({ behavior: 'smooth' })}
          className="group flex flex-col items-center justify-center cursor-pointer transition-transform duration-300 hover:scale-105"
        >
          <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-100 shadow-sm px-4 py-2 rounded-full uppercase tracking-widest flex items-center gap-1.5 transition-all duration-300 mb-2.5">
            <Camera className="w-3.5 h-3.5 text-emerald-600" />
            Ke Area Unggah
          </span>
          <ChevronDown className="w-6 h-6 text-emerald-600 animate-bounce transition-colors" />
        </button>
      </div>

      {/* Main Scanner Card */}
      <div id="scanner-zone" className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden relative scroll-mt-24">

        {!imagePreview ? (
          <div className="p-8 md:p-12">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-3 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 group
                ${isDragging
                  ? 'border-emerald-500 bg-emerald-50/50 shadow-inner'
                  : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'}`}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileInput} accept=".jpg,.jpeg,.png" className="hidden" />

              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3
                ${isDragging ? 'bg-emerald-500 text-white' : 'bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-600'}`}>
                <UploadCloud className="w-10 h-10" />
              </div>

              <h3 className="text-slate-800 font-bold text-xl mb-2">Drag & Drop foto di sini</h3>
              <p className="text-slate-500">atau klik untuk menelusuri file Anda</p>

              <div className="mt-6 flex justify-center gap-4 text-xs font-medium text-slate-400">
                <span className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-full"><ImageIcon className="w-4 h-4"/> JPG, PNG</span>
                <span className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-full"><AlertTriangle className="w-4 h-4"/> Maks 5MB</span>
              </div>
            </div>

            {errorMsg && (
              <div className="mt-6 p-4 bg-red-50/80 border border-red-200 text-red-600 rounded-xl flex items-center justify-center gap-3 font-medium animate-in zoom-in-95">
                <AlertTriangle className="w-5 h-5" /> {errorMsg}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 md:p-8">
            <div
              className="relative rounded-2xl overflow-hidden bg-slate-900 shadow-inner aspect-video flex items-center justify-center group cursor-zoom-in"
              onClick={() => {
                if (!isAnalyzing) {
                  setZoomedImage(imagePreview);
                }
              }}
            >
              <img src={imagePreview} alt="Preview" className="max-w-full max-h-[400px] object-contain transition-transform duration-700 group-hover:scale-105" />
              
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                <div className="bg-white/20 backdrop-blur-md p-3.5 rounded-full opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 border border-white/30 shadow-lg">
                  <ZoomIn className="text-white w-6 h-6 animate-pulse" />
                </div>
              </div>

              {!isAnalyzing && !result && (
                <button
                  onClick={(e) => { e.stopPropagation(); clearImage(); }}
                  className="absolute top-4 right-4 z-20 bg-white/20 hover:bg-red-500 backdrop-blur-md text-white p-2.5 rounded-full shadow-lg transition-all duration-300 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              {/* Scanning Overlay */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-emerald-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                  <div className="relative w-24 h-24 flex items-center justify-center mb-6">
                    <Activity className="w-10 h-10 animate-pulse text-emerald-300 relative z-10" />
                    <div className="absolute inset-0 border-4 border-emerald-500/30 rounded-full animate-ping"></div>
                    <div className="absolute inset-0 border-4 border-t-emerald-400 rounded-full animate-spin"></div>
                  </div>
                  <h3 className="text-2xl font-bold tracking-wider mb-2">MENGANALISIS...</h3>
                  <p className="text-emerald-200 font-mono text-sm bg-black/30 px-4 py-1.5 rounded-full">MobileNetV2 Processing</p>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="mt-6 p-4 bg-red-50/80 border border-red-200 text-red-600 rounded-xl flex items-center justify-center gap-3 font-medium animate-in zoom-in-95">
                <AlertTriangle className="w-5 h-5" /> {errorMsg}
              </div>
            )}

            {!result && !isAnalyzing && (
              <div className="mt-8 flex justify-center">
                <button onClick={startAnalysis} className="px-8 py-3.5 rounded-full font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-1 flex items-center gap-3 text-lg cursor-pointer">
                  <Activity className="w-6 h-6" /> Mulai Deteksi Penyakit
                </button>
              </div>
            )}
          </div>
        )}

        {/* Rejection Card — NOT a tomato leaf */}
        {result && result.rejected && (
          <div className="border-t-4 border-red-200 bg-red-50/50 p-8 animate-in slide-in-from-bottom-8 fade-in duration-500">
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-orange-50 flex items-center justify-center mx-auto mb-6 shadow-md">
                <Ban className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-3xl font-black text-red-700 mb-3">Bukan Daun Tomat</h3>
              <p className="text-slate-600 text-lg mb-6 leading-relaxed">
                Model AI mendeteksi bahwa gambar ini <strong>bukan daun tomat</strong> dengan keyakinan <span className="font-bold text-red-600">{result.primary.confidence}%</span>.
              </p>
              <div className="bg-white rounded-2xl p-6 border border-amber-200 shadow-sm mb-8 text-left">
                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-amber-500" /> Tips Foto yang Benar
                </h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Ambil foto <strong>daun tomat</strong> dengan jelas, bukan objek lain</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Pastikan pencahayaan cukup dan daun terlihat jelas</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Usahakan daun mengisi sebagian besar frame foto</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Gunakan format JPG atau PNG, maksimal 5MB</li>
                </ul>
              </div>
              <button onClick={clearImage} className="px-8 py-3.5 rounded-full font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-1 flex items-center gap-3 text-lg cursor-pointer mx-auto">
                <UploadCloud className="w-6 h-6" /> Coba Gambar Lain
              </button>
            </div>
          </div>
        )}

        {/* Results Card — Tomato leaf detected */}
        {result && !result.rejected && (
          <div className="border-t border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100 p-6 md:p-10 animate-in slide-in-from-bottom-12 fade-in duration-700">
            
            {/* Modern Glow Subheader */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/60 pb-6 mb-8 gap-4">
              <div className="flex items-center gap-3.5">
                <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20 text-emerald-600 shadow-sm shadow-emerald-500/5 animate-pulse">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">TomatoGuard Diagnostic Hub</span>
                  <h3 className="text-slate-800 font-extrabold text-xl leading-none mt-1">Laporan Diagnosis Kesehatan Daun</h3>
                </div>
              </div>
              <span className="self-start sm:self-center text-xs font-black text-emerald-800 bg-emerald-50/80 border border-emerald-100 shadow-sm px-4 py-2 rounded-full uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Deteksi Selesai
              </span>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              
              {/* Primary Prediction: Futuristic Glow Card */}
              <div className={`lg:col-span-2 rounded-3xl p-0.5 relative overflow-hidden bg-gradient-to-br ${result.primary.gradient} shadow-xl shadow-slate-200/50 group/resultCard hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500`}>
                {/* Decorative background glows */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none group-hover/resultCard:scale-125 transition-transform duration-700"></div>
                
                <div className="bg-white rounded-[22px] p-6 sm:p-8 h-full flex flex-col relative z-10">
                  <div className="flex flex-wrap justify-between items-start mb-6 gap-6">
                    <div>
                      <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black mb-3 uppercase tracking-wider border shadow-sm ${result.primary.bg} ${result.primary.color} ${result.primary.border}`}>
                        {result.primary.id === 'healthy' ? <Leaf className="w-4 h-4 shrink-0 animate-bounce-slow"/> : <Bug className="w-4 h-4 shrink-0 animate-pulse"/>}
                        {result.primary.type}
                      </span>
                      <h3 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight leading-none mt-1">
                        {result.primary.name}
                      </h3>
                    </div>

                    {/* High-Tech Clean Confidence Badge */}
                    <div className={`flex flex-col items-center justify-center border ${result.primary.border} ${result.primary.bg} px-6 py-3 rounded-2xl shadow-sm min-w-[130px]`}>
                      <div className={`text-3xl font-black ${result.primary.color} font-mono leading-none`}>
                        {result.primary.confidence}%
                      </div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2 whitespace-nowrap">Akurasi Model</span>
                    </div>
                  </div>

                  <p className="text-slate-600 text-[15px] sm:text-base mb-8 leading-relaxed flex-1 font-medium pl-4 border-l-3 border-slate-200">
                    {result.primary.desc}
                  </p>

                  {/* Diagnostic Action Console */}
                  <div className={`rounded-2xl p-6 border ${result.primary.border} bg-gradient-to-br from-slate-50 to-white/30 shadow-sm relative overflow-hidden group/console`}>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-slate-100 rounded-full blur-xl pointer-events-none"></div>
                    <div className="font-black text-slate-800 text-sm mb-3.5 flex items-center gap-2">
                      <Thermometer className={`w-5 h-5 ${result.primary.color} shrink-0`}/> 
                      Tindakan Penanganan Awal
                    </div>
                    <p className="text-slate-600 text-sm font-semibold leading-relaxed mb-5">
                      {result.primary.treatment}
                    </p>
                    
                    {/* Direct Link to Detailed Agricultural Guidelines */}
                    <button
                      onClick={() => {
                        // Find full item in catalog to trigger detailed popup
                        const fullCatalogItem = DISEASE_CATALOG.find(c => c.id === result.primary.id) || result.primary;
                        setSelectedImage({
                          ...fullCatalogItem,
                          image: result.image // Ensure they see their own leaf photo on the left!
                        });
                      }}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4" />
                      Buka Panduan Medis Lengkap
                    </button>
                  </div>
                </div>
              </div>

              {/* Alternatives Panel & Action Column */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-100/50 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-400 mb-6 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-3">
                    <Info className="w-4 h-4 text-slate-400 shrink-0" /> Kemungkinan Prediksi Lain
                  </h4>
                  
                  {result.alternatives.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm font-semibold">
                      Tidak ada prediksi alternatif terdeteksi.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {result.alternatives.map((alt, idx) => {
                        // Find matching color styles for a premium touch
                        const matchedCatalog = DISEASE_CATALOG.find(c => c.name.toLowerCase().includes(alt.name.toLowerCase()) || alt.name.toLowerCase().includes(c.name.toLowerCase()));
                        const barColor = matchedCatalog?.id === 'healthy' ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-orange-500';
                        return (
                          <div key={idx} className="space-y-2">
                            <div className="flex justify-between items-center text-xs font-extrabold text-slate-700">
                              <span className="truncate pr-2">{alt.name}</span>
                              <span className="font-mono bg-slate-100 border border-slate-200/50 px-2 py-0.5 rounded-lg text-slate-600 text-[10px]">
                                {alt.confidence}%
                              </span>
                            </div>
                            {/* High-Performance Progress Bar */}
                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/30 shadow-inner relative">
                              <div 
                                className={`h-full ${barColor} rounded-full transition-all duration-1000 ease-out shadow-sm`}
                                style={{ width: `${alt.confidence}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-6 border-t border-slate-100 pt-5">
                  <button 
                    onClick={clearImage} 
                    className="w-full py-3 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 font-extrabold transition-all duration-300 text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4 shrink-0"/> 
                    Pindai Daun Tomat Lain
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderCatalogTab = () => {
    const filtered = DISEASE_CATALOG.filter((item) => {
      const matchesSearch = 
        item.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        item.desc.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        item.cause.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        item.treatment.toLowerCase().includes(catalogSearch.toLowerCase());

      if (catalogCategory === 'Semua') return matchesSearch;
      if (catalogCategory === 'Normal') return item.type === 'Normal' && matchesSearch;
      if (catalogCategory === 'Jamur') return (item.type.includes('Jamur') || item.type.includes('Oomycete')) && matchesSearch;
      if (catalogCategory === 'Bakteri') return item.type === 'Bakteri' && matchesSearch;
      if (catalogCategory === 'Virus') return item.type === 'Virus' && matchesSearch;
      if (catalogCategory === 'Hama') return item.type.includes('Hama') && matchesSearch;
      return matchesSearch;
    });

    const categories = [
      { name: 'Semua', count: DISEASE_CATALOG.length },
      { name: 'Normal', count: DISEASE_CATALOG.filter(c => c.type === 'Normal').length },
      { name: 'Jamur', count: DISEASE_CATALOG.filter(c => c.type.includes('Jamur') || c.type.includes('Oomycete')).length },
      { name: 'Bakteri', count: DISEASE_CATALOG.filter(c => c.type === 'Bakteri').length },
      { name: 'Virus', count: DISEASE_CATALOG.filter(c => c.type === 'Virus').length },
      { name: 'Hama', count: DISEASE_CATALOG.filter(c => c.type.includes('Hama')).length }
    ];

    const getCategoryIcon = (type) => {
      if (type === 'Normal') return <CheckCircle2 className="w-3.5 h-3.5 mr-1" />;
      if (type.includes('Jamur')) return <Activity className="w-3.5 h-3.5 mr-1" />;
      if (type === 'Bakteri') return <ShieldAlert className="w-3.5 h-3.5 mr-1" />;
      if (type === 'Virus') return <Ban className="w-3.5 h-3.5 mr-1" />;
      return <Bug className="w-3.5 h-3.5 mr-1" />;
    };

    const getBadgeStyle = (type) => {
      if (type === 'Normal') return 'bg-emerald-600 border-emerald-500 text-white';
      if (type.includes('Jamur') || type.includes('Oomycete')) return 'bg-orange-600 border-orange-500 text-white';
      if (type === 'Bakteri') return 'bg-amber-600 border-amber-500 text-white';
      if (type === 'Virus') return 'bg-indigo-600 border-indigo-500 text-white';
      return 'bg-rose-600 border-rose-500 text-white';
    };

    return (
      <div className="animate-in fade-in duration-500 max-w-6xl mx-auto px-2">
        {/* Header Section */}
        <div className="mb-12 text-center max-w-3xl mx-auto">
          <span className="bg-emerald-50 text-emerald-800 text-xs font-extrabold uppercase tracking-widest px-4 py-1.5 rounded-full border border-emerald-100 shadow-sm inline-block mb-3">
            Ensiklopedia Tanaman
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-slate-800 mb-4 tracking-tight">Katalog Penyakit Tomat</h2>
          <p className="text-slate-500 text-lg leading-relaxed">
            Panduan lengkap untuk mendiagnosis 10 kondisi daun tomat yang dikenali oleh kecerdasan AI Tomatolyzer. Lengkap dengan penyebab biologis dan solusi praktis lapangan.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-slate-200/60 shadow-xl shadow-slate-100/40 mb-10">
          <div className="flex flex-col lg:flex-row gap-6 justify-between items-center">
            {/* Search Input */}
            <div className="relative w-full lg:w-96 group">
              <input
                type="text"
                placeholder="Cari nama penyakit, gejala, atau penanganan..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border-2 border-slate-200 focus:border-emerald-500 text-slate-800 px-5 py-3.5 pl-12 rounded-2xl transition-all duration-300 outline-none text-sm font-semibold shadow-inner"
              />
              <Search className="w-5 h-5 text-slate-400 group-focus-within:text-emerald-600 absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300" />
              {catalogSearch && (
                <button
                  onClick={() => setCatalogSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-start lg:justify-end overflow-x-auto pb-1 lg:pb-0 scrollbar-thin">
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setCatalogCategory(cat.name)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center shrink-0 cursor-pointer border ${
                    catalogCategory === cat.name
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-500 shadow-md transform -translate-y-0.5'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {cat.name}
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-extrabold ${
                    catalogCategory === cat.name ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="mb-6 flex justify-between items-center px-2">
          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
            Menampilkan {filtered.length} dari 10 Penyakit
          </span>
          {catalogSearch && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 shadow-sm animate-pulse">
              Hasil Pencarian: "{catalogSearch}"
            </span>
          )}
        </div>

        {/* Grid Section */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-slate-200 border-dashed max-w-lg mx-auto">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Search className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">Penyakit Tidak Ditemukan</h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-6">
              Tidak ada hasil yang cocok dengan kata kunci "{catalogSearch}" di kategori "{catalogCategory}".
            </p>
            <button
              onClick={() => { setCatalogSearch(''); setCatalogCategory('Semua'); }}
              className="px-6 py-2.5 bg-emerald-100 text-emerald-800 rounded-xl font-bold hover:bg-emerald-200 hover:scale-105 transition-all cursor-pointer"
            >
              Reset Semua Filter
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filtered.map((disease) => (
              <div 
                key={disease.id} 
                className="bg-white rounded-3xl overflow-hidden border border-slate-200/70 shadow-lg shadow-slate-100/50 hover:shadow-2xl hover:shadow-emerald-950/5 transition-all duration-500 hover:-translate-y-2 group flex flex-col relative"
              >
                {/* Decorative Top Line */}
                <div className={`h-2.5 w-full bg-gradient-to-r ${disease.gradient}`}></div>

                {/* Cover Image */}
                <div
                  className="h-56 w-full bg-slate-100 overflow-hidden relative cursor-pointer group/img border-b border-slate-100"
                  onClick={() => { setModalTab('symptoms'); setSelectedImage(disease); }}
                >
                  <img
                    src={disease.image}
                    alt={disease.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110"
                  />
                  {/* Glassmorphic Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/25 transition-colors duration-500 flex items-center justify-center">
                    <div className="bg-white/20 backdrop-blur-md p-3 rounded-full opacity-0 group-hover/img:opacity-100 transform translate-y-4 group-hover/img:translate-y-0 transition-all duration-500 border border-white/30 shadow-lg">
                      <ZoomIn className="text-white w-6 h-6" />
                    </div>
                  </div>
                  {/* Category Type Badge inside image */}
                  <span className={`absolute top-4 left-4 inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg border ${getBadgeStyle(disease.type)}`}>
                    {getCategoryIcon(disease.type)}
                    {disease.type}
                  </span>
                </div>

                {/* Content Section */}
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="font-extrabold text-2xl text-slate-800 leading-tight mb-3 group-hover:text-emerald-700 transition-colors">
                    {disease.name}
                  </h3>
                  
                  <p className="text-sm text-slate-500 mb-6 leading-relaxed flex-1 font-medium font-medium">
                    {disease.desc}
                  </p>

                  {/* Highlights Grid */}
                  <div className="space-y-4 pt-4 border-t border-slate-100/70 mt-auto bg-gradient-to-b from-slate-50/50 to-white -mx-6 px-6 -mb-6 pb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                          <Droplets className="w-3.5 h-3.5 text-emerald-600 shrink-0"/> Penyebab
                        </div>
                        <p className="text-xs text-slate-700 font-bold line-clamp-2 leading-relaxed">{disease.cause}</p>
                      </div>
                      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                          <Thermometer className="w-3.5 h-3.5 text-amber-600 shrink-0"/> Solusi
                        </div>
                        <p className="text-xs text-slate-700 font-bold line-clamp-2 leading-relaxed">{disease.treatment}</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => { setModalTab('symptoms'); setSelectedImage(disease); }}
                      className={`w-full py-3.5 rounded-2xl bg-gradient-to-r ${disease.gradient} text-white font-extrabold shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-sm flex items-center justify-center gap-2 cursor-pointer`}
                    >
                      <BookOpen className="w-4 h-4"/> Detail Diagnosis & Solusi
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderHistoryTab = () => (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto px-2">
      {/* History Header */}
      <div className="mb-10 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 pb-6 border-b border-slate-200/60">
        <div>
          <span className="bg-emerald-50 text-emerald-800 text-[10px] font-extrabold uppercase tracking-widest px-4 py-1.5 rounded-full border border-emerald-100 shadow-sm inline-block mb-3">
            Pusat Riwayat
          </span>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight mb-2">Riwayat Diagnosa</h2>
          <p className="text-slate-500 text-sm font-semibold">
            Hasil analisis Anda selama sesi ini. Data disimpan aman secara lokal di browser Anda (Privacy-First).
          </p>
        </div>
        {history.length > 0 && (
          <button
            onClick={clearAllHistory}
            className="px-5 py-3.5 bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl border border-rose-100 hover:border-rose-300 shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto hover:-translate-y-0.5 active:translate-y-0"
          >
            <Trash2 className="w-4 h-4" /> Hapus Semua Riwayat
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-slate-200 border-dashed max-w-xl mx-auto">
          <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Clock className="w-10 h-10 text-slate-300 animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">Riwayat Masih Kosong</h3>
          <p className="text-slate-500 max-w-sm mx-auto mb-8 font-semibold text-sm">
            Anda belum melakukan diagnosis daun tomat. Unggah foto daun tomat Anda di menu Deteksi untuk memulai.
          </p>
          <button
            onClick={() => setActiveTab('detect')}
            className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            Mulai Analisis Pertama
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {history.map((item) => (
            <div
              key={item.id}
              onClick={() => loadHistoryResult(item)}
              className="bg-white rounded-3xl p-5 flex flex-col sm:flex-row gap-6 items-center shadow-lg shadow-slate-100/40 hover:shadow-2xl hover:shadow-emerald-950/5 border border-slate-200/80 hover:border-emerald-200/60 transition-all duration-500 hover:-translate-y-1 cursor-pointer relative group/card overflow-hidden"
            >
              {/* Left Accent Color bar based on diagnosis */}
              <div className={`absolute top-0 left-0 w-2 h-full bg-gradient-to-b ${item.primary.gradient}`}></div>

              {/* Photo Thumbnail */}
              <div className="w-full sm:w-32 h-44 sm:h-32 rounded-2xl overflow-hidden shrink-0 border border-slate-200 shadow-inner relative group bg-slate-100">
                {item.image && !item.image.endsWith('...') ? (
                  <img
                    src={item.image}
                    alt="Thumbnail"
                    className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                {/* Visual click overlay indicator inside photo */}
                <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/10 transition-colors duration-500"></div>
              </div>

              {/* Detail Text Column */}
              <div className="flex-1 w-full text-center sm:text-left pr-0 sm:pr-4">
                <div className="flex flex-col sm:flex-row sm:justify-between items-center sm:items-start mb-3 gap-3">
                  <div>
                    <h4 className="font-extrabold text-2xl text-slate-800 flex items-center justify-center sm:justify-start gap-2 group-hover/card:text-emerald-700 transition-colors leading-tight">
                      {item.primary.name}
                      {item.rejected ? (
                        <Ban className="w-5 h-5 text-rose-500 shrink-0" />
                      ) : item.primary.id === 'healthy' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                      )}
                    </h4>
                    {/* Tiny subtitle indicator */}
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-1 block">
                      Klik untuk melihat detail diagnosis
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-400 bg-slate-50 border border-slate-200/50 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm whitespace-nowrap">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" /> {item.timestamp}
                  </span>
                </div>

                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 mt-4 sm:mt-2">
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border shadow-sm ${item.rejected ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-800'}`}>
                    Akurasi: {item.primary.confidence}%
                  </span>
                  {item.alternatives.length > 0 && (
                    <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                      <Info className="w-4 h-4 text-slate-300"/> Alt: {item.alternatives.map(a => a.name).join(', ')}
                    </span>
                  )}
                </div>
              </div>

              {/* Trash/Delete Individual Button */}
              <button
                onClick={(e) => deleteHistoryItem(item.id, e)}
                className="p-3 bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white rounded-2xl transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md hover:scale-105 active:scale-95 sm:self-center shrink-0 border border-rose-100/50"
                title="Hapus dari riwayat"
              >
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100 font-sans text-slate-900 selection:bg-emerald-200 selection:text-emerald-900">
      {renderHeader()}
      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {activeTab === 'detect' && renderDetectionTab()}
        {activeTab === 'catalog' && renderCatalogTab()}
        {activeTab === 'history' && renderHistoryTab()}
      </main>

      {/* Footer */}
      <footer className="border-t border-emerald-100 mt-auto py-10 bg-white text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="bg-emerald-100 p-1.5 rounded-full">
            <Leaf className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="font-black text-slate-700 tracking-wide">Tomatolyzer <span className="font-medium text-slate-400">v1.0</span></span>
        </div>
        <p className="text-slate-500 text-sm max-w-md mx-auto mb-2">Sistem Deteksi Penyakit Daun Tomat Berbasis Deep Learning.</p>
        <div className="flex items-center justify-center gap-4 text-xs font-semibold text-slate-400 uppercase tracking-widest mt-6">
          <span>Kaggle Dataset</span> • <span>CNN Model</span> • <span>Offline Ready</span>
        </div>
      </footer>

      {/* Detail Encyclopedia Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[92vh] lg:max-h-[85vh] flex flex-col bg-white rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`px-6 py-5 flex justify-between items-center bg-gradient-to-r ${selectedImage.gradient} text-white`}>
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl border border-white/25">
                  <Leaf className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xl leading-tight">{selectedImage.name}</h3>
                  <p className="text-xs text-white/80 font-bold uppercase tracking-wider mt-0.5">Tomatolyzer Diagnosis Encyclopedia</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/25 p-2 rounded-xl transition-all duration-300 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Screen Content */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-5">
              {/* Left Column: Media Presentation */}
              <div className="lg:col-span-2 bg-slate-50 border-r border-slate-100 flex flex-col p-6 items-center justify-center relative">
                <div className="w-full aspect-square max-h-[300px] lg:max-h-none lg:h-full rounded-2xl overflow-hidden border-2 border-slate-200/60 shadow-inner group/zoom relative">
                  <img
                    src={selectedImage.image}
                    alt={selectedImage.name}
                    className="w-full h-full object-contain bg-slate-950 transition-transform duration-700 group-hover/zoom:scale-[1.03]"
                    onClick={() => setZoomedImage(selectedImage.image)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent flex items-end p-4">
                    <span className={`text-[10px] font-black text-white/95 uppercase tracking-widest backdrop-blur-md px-3 py-1.5 rounded-lg border ${selectedImage.id === 'preview' || selectedImage.type === 'Foto Unggahan' ? 'bg-indigo-600/95 border-indigo-500/30 shadow-md' : 'bg-emerald-600/95 border-emerald-500/30 shadow-md'}`}>
                      {selectedImage.id === 'preview' || selectedImage.type === 'Foto Unggahan' ? 'Foto Anda (Perbesar/Zoom)' : 'Referensi Laboratorium'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Deep Tabbed Data */}
              <div className="lg:col-span-3 p-6 md:p-8 flex flex-col bg-white">
                {/* Tab Controller */}
                <div className="flex gap-2 p-1.5 bg-slate-50 border border-slate-200/60 rounded-2xl mb-6 self-start">
                  <button
                    onClick={() => setModalTab('symptoms')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                      modalTab === 'symptoms'
                        ? 'bg-white text-slate-800 shadow-md border border-slate-200/50'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Gejala & Penyebab
                  </button>
                  <button
                    onClick={() => setModalTab('solutions')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                      modalTab === 'solutions'
                        ? 'bg-white text-slate-800 shadow-md border border-slate-200/50'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Penanganan & Pencegahan
                  </button>
                </div>

                {/* Tab Contents */}
                <div className="flex-1 space-y-6">
                  {modalTab === 'symptoms' ? (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      {/* Description */}
                      <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                          <Info className="w-4 h-4 text-emerald-600"/> Deskripsi Klinis
                        </h4>
                        <p className="text-slate-600 text-sm leading-relaxed font-semibold">
                          {selectedImage.desc}
                        </p>
                      </div>

                      {/* Biological Cause */}
                      <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                          <Bug className="w-4 h-4 text-rose-500" /> Patogen / Agen Penyebab
                        </h4>
                        <p className="text-slate-800 text-sm font-extrabold leading-relaxed">
                          {selectedImage.cause}
                        </p>
                      </div>

                      {/* Extra Warning Warning Badge */}
                      {selectedImage.id !== 'healthy' && (
                        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <h5 className="text-xs font-black text-amber-800 uppercase tracking-wider mb-0.5">Tingkat Penularan Tinggi</h5>
                            <p className="text-xs text-amber-700 font-semibold leading-relaxed">
                              Segera lakukan isolasi atau pemotongan daun yang sakit agar patogen tidak menyebar ke tanaman tomat sehat di sekitarnya melalui cipratan air atau serangga pembawa.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      {/* Primary Treatment */}
                      <div className="bg-emerald-50/30 p-5 rounded-2xl border border-emerald-100/50">
                        <h4 className="text-xs font-black text-emerald-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                          <Thermometer className="w-4 h-4 text-emerald-600"/> Tindakan Penanganan Utama
                        </h4>
                        <p className="text-slate-700 text-sm font-extrabold leading-relaxed">
                          {selectedImage.treatment}
                        </p>
                      </div>

                      {/* Preventive Garden Tips */}
                      <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-teal-600"/> Tindakan Pencegahan Rutin
                        </h4>
                        <ul className="text-xs text-slate-600 font-bold space-y-2.5 leading-relaxed">
                          {(selectedImage.prevention || [
                            "Jaga sirkulasi udara di kebun atau rumah kaca tetap optimal.",
                            "Hindari penyiraman overhead (siram ke tanah, bukan ke daun).",
                            "Selalu bersihkan alat pertanian (gunting stek) setelah memotong tanaman sakit."
                          ]).map((prevText, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                              {prevText}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer Action */}
                <div className="mt-8 pt-5 border-t border-slate-100 flex justify-between items-center gap-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    Bahan Aktif Teruji
                  </div>
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all duration-300"
                  >
                    Tutup Dialog
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pure Lightbox Zoom Modal for Uploaded Leaf */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-300 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all duration-300 cursor-pointer border border-white/10 shadow-lg"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div 
            className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={zoomedImage}
              alt="Zoomed View"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-white/10 shadow-inner"
            />
          </div>
        </div>
      )}
    </div>
  );
}
