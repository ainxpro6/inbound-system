const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyFnAt_k_cKbY0lHxyDAHnxxLHdpzCGDDTmz99BLhOa3y3B7do9XOHflh3qPjbo9z2mRQ/exec';

const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function playSound(type) {
  if (audioCtx.state === 'suspended') { audioCtx.resume(); }
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  if (type === 'success') {
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); 
    gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1); 
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.1);
  } else if (type === 'error') {
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(150, audioCtx.currentTime); 
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4); 
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.4);
  }
}

// --- INISIALISASI SAAT WEB DIBUKA ---
window.onload = function() {
  const savedName = localStorage.getItem('inbound_checker_name');
  if(savedName) document.getElementById('checkedBy').value = savedName;
  
  const savedCabang = localStorage.getItem('inbound_cabang');
  if(savedCabang) document.getElementById('cabang').value = savedCabang;

  // Begitu web dibuka, diam-diam download database MasterSKU
  syncMasterData(); 
}

// --- FUNGSI DOWNLOAD DATABASE KE MEMORI HP ---
async function syncMasterData() {
  const skuInput = document.getElementById('sku');
  skuInput.placeholder = "Memperbarui database..."; 
  
  try {
    const response = await fetch(`${SCRIPT_URL}?action=get_master`);
    const result = await response.json();
    
    if (result.status === "success") {
      // Simpan seluruh data kamus ke memori browser
      localStorage.setItem('master_sku_db', JSON.stringify(result.data));
      skuInput.placeholder = "Database siap. Mulai Scan!";
    }
  } catch (error) {
    console.error("Gagal sinkronisasi data master:", error);
    skuInput.placeholder = "Gagal memuat database terbaru.";
  }
}

// --- VARIABEL KAMERA (TETAP SAMA) ---
let html5QrcodeScanner;

function openCamera() {
  document.getElementById('camera-modal').style.display = 'flex';
  if (!html5QrcodeScanner) {
    html5QrcodeScanner = new Html5QrcodeScanner(
      "qr-reader", 
      { 
        fps: 30, 
        qrbox: { width: 300, height: 100 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.UPC_E
        ],
        videoConstraints: { facingMode: "environment", width: { min: 640, ideal: 1280 }, height: { min: 480, ideal: 720 } }
      }, false
    );
  }
  html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

function closeCamera() {
  document.getElementById('camera-modal').style.display = 'none';
  if (html5QrcodeScanner) {
    html5QrcodeScanner.clear().catch(error => console.error(error));
  }
}

function onScanSuccess(decodedText, decodedResult) {
  closeCamera();
  document.getElementById('barcode').value = decodedText;
  lookupSKU(decodedText);
}

function onScanFailure(error) {}

// --- LOGIKA PENCARIAN SKU (SEKARANG INSTAN) ---
let typingTimer;
const doneTypingInterval = 300; // Dikurangi jadi 0.3 detik biar makin ngebut

function lookupSKU(barcodeValue) {
  const skuInput = document.getElementById('sku');
  const btnSimpan = document.getElementById('btnSimpan');
  const btnRequest = document.getElementById('btnRequest');
  
  clearTimeout(typingTimer);
  skuInput.classList.remove('sku-found', 'sku-not-found');
  
  const barcode = barcodeValue.trim();
  
  if (barcode.length > 0) {
    skuInput.value = "Mencari..."; 
    btnSimpan.style.display = "block";
    btnRequest.style.display = "none";
    
    // Jeda sebentar biar UI kelihatan mulus, lalu cek memori HP
    typingTimer = setTimeout(() => {
      checkLocalSKU(barcode);
    }, doneTypingInterval);
  } else {
    skuInput.value = ""; 
    btnSimpan.style.display = "block";
    btnRequest.style.display = "none";
  }
}

// Cek data di memori HP, bukan nembak ke server lagi!
function checkLocalSKU(barcode) {
  const skuInput = document.getElementById('sku');
  const btnSimpan = document.getElementById('btnSimpan');
  const btnRequest = document.getElementById('btnRequest');
  
  // Ambil database dari memori browser
  const masterDataString = localStorage.getItem('master_sku_db');
  const masterData = masterDataString ? JSON.parse(masterDataString) : null;
  
  if (!masterData) {
    skuInput.value = "Menunggu database...";
    skuInput.classList.add('sku-not-found');
    return;
  }

  // Cek apakah barcode ada di dalam kamus
  if (masterData[barcode]) {
    // KETEMU! INSTAN
    skuInput.value = masterData[barcode];
    skuInput.classList.add('sku-found'); 
    btnSimpan.style.display = "block";
    btnRequest.style.display = "none";
    playSound('success'); 
  } else {
    // TIDAK KETEMU
    skuInput.value = "SKU TIDAK DITEMUKAN"; 
    skuInput.classList.add('sku-not-found'); 
    btnSimpan.style.display = "none";
    btnRequest.style.display = "block";
    playSound('error');
  }
}

// --- FUNGSI SIMPAN & REQUEST (TETAP SAMA, DITAMBAH SUARA) ---
async function simpanData() {
  const cabang = document.getElementById('cabang').value;
  const barcode = document.getElementById('barcode').value;
  const sku = document.getElementById('sku').value;
  const expDate = document.getElementById('expDate').value;
  const qty = document.getElementById('qty').value;
  const checkedBy = document.getElementById('checkedBy').value;

  if(!barcode || !qty || !checkedBy || !expDate) {
    playSound('error');
    alert("Semua kolom wajib diisi!");
    return;
  }
  
  if(sku === "Mencari..." || sku === "SKU TIDAK DITEMUKAN" || sku === "Menunggu database..." || sku === "") {
    playSound('error');
    alert("Pastikan Barcode valid dan SKU telah ditemukan sebelum menyimpan!");
    return;
  }

  localStorage.setItem('inbound_checker_name', checkedBy);
  localStorage.setItem('inbound_cabang', cabang);

  const payload = { cabang: cabang, barcode: barcode, sku: sku, expDate: expDate, qty: qty, checkedBy: checkedBy };

  const btn = document.getElementById('btnSimpan');
  btn.innerText = "MENYIMPAN...";
  btn.disabled = true;

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    if(result.status === "success") {
      playSound('success'); // Beep sukses simpan
      document.getElementById('barcode').value = '';
      document.getElementById('sku').value = '';
      document.getElementById('expDate').value = '';
      document.getElementById('qty').value = '';
      document.getElementById('barcode').focus(); 
      document.getElementById('sku').classList.remove('sku-found', 'sku-not-found');
    } else {
      playSound('error');
      alert("Gagal menyimpan data: " + result.message);
    }
  } catch (error) {
    playSound('error');
    alert("Terjadi kesalahan koneksi saat mengirim data.");
  } finally {
    btn.innerText = "SIMPAN";
    btn.disabled = false;
  }
}

async function requestUpdate() {
  const cabang = document.getElementById('cabang').value;
  const barcode = document.getElementById('barcode').value;
  const expDate = document.getElementById('expDate').value;
  const qty = document.getElementById('qty').value;
  const checkedBy = document.getElementById('checkedBy').value;

  if(!barcode || !qty || !checkedBy || !expDate) {
    playSound('error');
    alert("Semua kolom wajib diisi untuk Request!");
    return;
  }

  const btn = document.getElementById('btnRequest');
  btn.innerText = "MENGIRIM...";
  btn.disabled = true;

  const payload = { cabang: cabang, barcode: barcode, sku: "", expDate: expDate, qty: qty, checkedBy: checkedBy };

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    if(result.status === "success") {
      playSound('success');
      alert("Request terkirim! Baris akan ditandai warna di Spreadsheet.");
      document.getElementById('barcode').value = '';
      document.getElementById('sku').value = '';
      document.getElementById('expDate').value = '';
      document.getElementById('qty').value = '';
      document.getElementById('barcode').focus();
      document.getElementById('sku').classList.remove('sku-found', 'sku-not-found');
      document.getElementById('btnSimpan').style.display = "block";
      btn.style.display = "none";
    } else {
      playSound('error');
      alert("Gagal mengirim request: " + result.message);
    }
  } catch (error) {
    playSound('error');
    alert("Terjadi kesalahan koneksi.");
  } finally {
    btn.innerText = "REQUEST UPDATE DATA";
    btn.disabled = false;
  }
}
