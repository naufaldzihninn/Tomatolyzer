Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Require-Path([string]$PathValue, [string]$Hint) {
  if (-not (Test-Path -LiteralPath $PathValue)) {
    throw "Path tidak ditemukan: $PathValue`nHint: $Hint"
  }
}

try {
  $root = Split-Path -Parent $MyInvocation.MyCommand.Path
  Set-Location -LiteralPath $root

  $venvDir = Join-Path $root ".venv"
  $venvPython = Join-Path $venvDir "Scripts\python.exe"
  $reqFile = Join-Path $root "backend\requirements.txt"
  $rawDatasetDir = Join-Path $root "datasets\archive\PlantVillage"
  $processedTrainCsv = Join-Path $root "datasets\processed\train.csv"
  $modelKeras = Join-Path $root "backend\models\tomatoguard.keras"
  $frontendDir = Join-Path $root "frontend"
  $nodeModulesDir = Join-Path $frontendDir "node_modules"

  Write-Step "Cek struktur project"
  Require-Path -PathValue $reqFile -Hint "Pastikan file backend/requirements.txt ada."
  Require-Path -PathValue $rawDatasetDir -Hint "Pastikan dataset ada di datasets/archive/PlantVillage."

  # --- Python venv & backend deps ---
  if (-not (Test-Path -LiteralPath $venvPython)) {
    Write-Step "Membuat virtual environment (.venv)"
    python -m venv .venv
  }

  Write-Step "Install/update dependency Python"
  & $venvPython -m pip install --upgrade pip
  & $venvPython -m pip install -r $reqFile

  # --- Generate negative samples (Not_Tomato_Leaf) ---
  $negDir = Join-Path $root "datasets\archive\PlantVillage\Not_Tomato_Leaf"
  if (-not (Test-Path -LiteralPath $negDir)) {
    Write-Step "Generating negative samples (Not_Tomato_Leaf)"
    & $venvPython "backend\train\generate_negatives.py" --output-dir $negDir --count 2000
  } else {
    Write-Step "Folder Not_Tomato_Leaf sudah ada, skip generate"
  }

  # --- Dataset manifest ---
  $classNamesProcessed = Join-Path $root "datasets\processed\class_names.json"
  $needRegenManifest = $false

  if (Test-Path -LiteralPath $classNamesProcessed) {
    $classNames = Get-Content $classNamesProcessed -Raw | ConvertFrom-Json
    if ($classNames -notcontains "Not_Tomato_Leaf") {
      Write-Step "Manifest lama tidak punya kelas Not_Tomato_Leaf, regenerate..."
      Remove-Item -Path (Join-Path $root "datasets\processed") -Recurse -Force
      $needRegenManifest = $true
    }
  }

  if ($needRegenManifest -or -not (Test-Path -LiteralPath $processedTrainCsv)) {
    Write-Step "Menyiapkan manifest dataset (train/val/test) - 11 kelas"
    & $venvPython "backend\train\prepare_dataset.py" --raw-dir "datasets\archive\PlantVillage" --output-dir "datasets\processed"
  } else {
    Write-Step "Manifest dataset sudah ada (11 kelas), skip prepare_dataset"
  }

  # --- Training ---
  $modelClassNames = Join-Path $root "backend\models\class_names.json"
  $needRetrain = $false

  if ((Test-Path -LiteralPath $modelKeras) -and (Test-Path -LiteralPath $modelClassNames)) {
    $modelClasses = Get-Content $modelClassNames -Raw | ConvertFrom-Json
    if ($modelClasses -notcontains "Not_Tomato_Leaf") {
      Write-Step "Model lama hanya 10 kelas, perlu retrain dengan 11 kelas"
      Remove-Item -Path $modelKeras -Force -ErrorAction SilentlyContinue
      $needRetrain = $true
    }
  }

  if ($needRetrain -or -not (Test-Path -LiteralPath $modelKeras)) {
    Write-Step "Training model (11 kelas termasuk Not_Tomato_Leaf)"
    & $venvPython "backend\train\train_model.py" --data-dir "datasets\processed" --epochs 12 --batch-size 16 --learning-rate 0.0001
  } else {
    Write-Step "Model sudah ada (11 kelas), skip training"
  }

  # --- Frontend: npm install ---
  if (-not (Test-Path -LiteralPath $nodeModulesDir)) {
    Write-Step "Install dependency frontend (npm install)"
    Push-Location $frontendDir
    npm install
    Pop-Location
  } else {
    Write-Step "node_modules sudah ada, skip npm install"
  }

  # --- Launch Backend ---
  Write-Step "Menjalankan backend API (FastAPI/Uvicorn) - port 8000"
  $backendProc = Start-Process -FilePath $venvPython `
    -ArgumentList @("-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload") `
    -WorkingDirectory $root `
    -PassThru

  # --- Launch Frontend (Vite dev server) ---
  Write-Step "Menjalankan frontend React (Vite dev server) - port 5173"
  $frontendProc = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c cd /d `"$frontendDir`" && npm run dev" `
    -PassThru

  Start-Sleep -Seconds 3

  Write-Host ""
  Write-Host "TomatoGuard aktif." -ForegroundColor Green
  Write-Host "Frontend : http://127.0.0.1:5173" -ForegroundColor Green
  Write-Host "Backend  : http://127.0.0.1:8000" -ForegroundColor Green
  Write-Host "Health   : http://127.0.0.1:8000/health" -ForegroundColor Green
  Write-Host ""
  Write-Host "PID Backend : $($backendProc.Id)" -ForegroundColor Yellow
  Write-Host "PID Frontend: $($frontendProc.Id)" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Untuk stop server, jalankan:" -ForegroundColor Magenta
  Write-Host "  Stop-Process -Id $($backendProc.Id),$($frontendProc.Id) -Force" -ForegroundColor Magenta
}
catch {
  Write-Host ""
  Write-Host "Gagal menjalankan TomatoGuard." -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}
