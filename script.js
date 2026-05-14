// script.js - Logika Inbound Scanner

// MASUKKAN URL WEB APP GOOGLE APPS SCRIPT DI SINI
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyFnAt_k_cKbY0lHxyDAHnxxLHdpzCGDDTmz99BLhOa3y3B7do9XOHflh3qPjbo9z2mRQ/exec';

window.onload = function() {
  const savedName = localStorage.getItem('inbound_checker_name');
  if(savedName) document.getElementById('checkedBy').value = savedName;
  
  const savedCabang = localStorage.getItem('inbound_cabang');
  if(savedCabang) document.getElementById('cabang').value = savedCabang;
}

// VARIABEL KAMERA
let html5QrcodeScanner;

// BUKA KAMERA
function openCamera() {
  // Tampilkan kotak modal
  document.getElementById('camera-modal').style.display = 'flex';
  
  // Jika scanner belum dibuat, inisialisasi sekarang
  if (!html5QrcodeScanner) {
    html5QrcodeScanner = new Html5QrcodeScanner(
      "qr-reader", 
      { 
        fps: 10, 
        qrbox: {width: 250, height: 150}, // Ukuran kotak scan
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] 
      }, 
      false
    );
  }
  
  // Jalankan kamera
  html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

// TUTUP KAMERA
function closeCamera() {
  document.getElementById('camera-modal').style.display = 'none';
  
  // Hentikan kamera agar tidak makan baterai di background
  if (html5QrcodeScanner) {
    html5QrcodeScanner.clear().catch(error => {
      console.error("Gagal menutup kamera: ", error);
    });
  }
}

// JIKA BARCODE BERHASIL TERBACA
function onScanSuccess(decodedText, decodedResult) {
  // 1. Tutup kamera otomatis
  closeCamera();
  
  // 2. Masukkan hasil teks barcode ke input form
  const barcodeInput = document.getElementById('barcode');
  barcodeInput.value = decodedText;
  
  // 3. Panggil fungsi pencarian SKU (seakan-akan kita mengetik)
  lookupSKU(decodedText);
}

// JIKA KAMERA SEDANG MENCARI (Abaikan saja errornya)
function onScanFailure(error) {
  // Fungsi ini dipanggil berkali-kali per detik jika belum menemukan barcode
  // Sengaja dikosongkan agar console tidak penuh dengan error
}

let typingTimer;
const doneTypingInterval = 500;

function lookupSKU(barcodeValue) {
  const skuInput = document.getElementById('sku');
  const btnSimpan = document.getElementById('btnSimpan');
  const btnRequest = document.getElementById('btnRequest');
  
  clearTimeout(typingTimer);
  
  // Hapus warna highlight saat user mulai ngetik ulang
  skuInput.classList.remove('sku-found', 'sku-not-found');
  
  if (barcodeValue.trim().length > 0) {
    skuInput.value = "Mencari SKU..."; 
    
    btnSimpan.style.display = "block";
    btnRequest.style.display = "none";
    
    typingTimer = setTimeout(() => {
      fetchSKUFromGAS(barcodeValue.trim());
    }, doneTypingInterval);
  } else {
    skuInput.value = ""; 
    btnSimpan.style.display = "block";
    btnRequest.style.display = "none";
  }
}

async function fetchSKUFromGAS(barcode) {
  const skuInput = document.getElementById('sku');
  const btnSimpan = document.getElementById('btnSimpan');
  const btnRequest = document.getElementById('btnRequest');
  
  try {
    const response = await fetch(`${SCRIPT_URL}?barcode=${encodeURIComponent(barcode)}`);
    const result = await response.json();
    
    if (result.status === "success") {
      skuInput.value = result.sku;
      skuInput.classList.add('sku-found'); // Tambah highlight biru
      
      btnSimpan.style.display = "block";
      btnRequest.style.display = "none";
    } else if (result.status === "not_found") {
      skuInput.value = result.sku; 
      skuInput.classList.add('sku-not-found'); // Tambah highlight merah
      
      btnSimpan.style.display = "none";
      btnRequest.style.display = "block";
    } else {
      skuInput.value = "Error sistem";
      skuInput.classList.add('sku-not-found');
    }
  } catch (error) {
    console.error("Gagal mengambil data SKU:", error);
    skuInput.value = "Gagal terhubung ke server";
    skuInput.classList.add('sku-not-found');
  }
}

async function simpanData() {
  const cabang = document.getElementById('cabang').value;
  const barcode = document.getElementById('barcode').value;
  const sku = document.getElementById('sku').value;
  const expDate = document.getElementById('expDate').value;
  const qty = document.getElementById('qty').value;
  const checkedBy = document.getElementById('checkedBy').value;

  if(!barcode || !qty || !checkedBy || !expDate) {
    alert("Barcode, Tanggal Exp, QTY, dan Checked By wajib diisi!");
    return;
  }
  
  if(sku === "Mencari SKU..." || sku === "SKU TIDAK DITEMUKAN" || sku === "Gagal terhubung ke server" || sku === "") {
    alert("Pastikan Barcode valid dan SKU telah ditemukan sebelum menyimpan!");
    return;
  }

  localStorage.setItem('inbound_checker_name', checkedBy);
  localStorage.setItem('inbound_cabang', cabang);

  const payload = {
    cabang: cabang,
    barcode: barcode,
    sku: sku,
    expDate: expDate,
    qty: qty,
    checkedBy: checkedBy
  };

  const btn = document.getElementById('btnSimpan');
  btn.innerText = "MENYIMPAN...";
  btn.disabled = true;

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', 
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    if(result.status === "success") {
      document.getElementById('barcode').value = '';
      document.getElementById('sku').value = '';
      document.getElementById('expDate').value = '';
      document.getElementById('qty').value = '';
      document.getElementById('barcode').focus(); 
      
      // Hapus warna highlight setelah data berhasil disimpan
      document.getElementById('sku').classList.remove('sku-found', 'sku-not-found');
    } else {
      alert("Gagal menyimpan data: " + result.message);
    }
  } catch (error) {
    alert("Terjadi kesalahan koneksi saat mengirim data.");
    console.error(error);
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
    alert("Barcode, Tanggal Exp, QTY, dan Checked By tetap wajib diisi untuk Request!");
    return;
  }

  const btn = document.getElementById('btnRequest');
  btn.innerText = "MENGIRIM...";
  btn.disabled = true;

  const payload = {
    cabang: cabang,
    barcode: barcode,
    sku: "", 
    expDate: expDate,
    qty: qty,
    checkedBy: checkedBy
  };
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', 
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    if(result.status === "success") {
      alert("Berhasil! Data masuk ke Sheet dan menunggu update SKU dari Admin.");
      document.getElementById('barcode').value = '';
      document.getElementById('sku').value = '';
      document.getElementById('expDate').value = '';
      document.getElementById('qty').value = '';
      document.getElementById('barcode').focus();
      
      // Hapus warna highlight setelah data berhasil direquest
      document.getElementById('sku').classList.remove('sku-found', 'sku-not-found');
      
      document.getElementById('btnSimpan').style.display = "block";
      btn.style.display = "none";
    } else {
      alert("Gagal mengirim request: " + result.message);
    }
  } catch (error) {
    alert("Terjadi kesalahan koneksi.");
    console.error(error);
  } finally {
    btn.innerText = "REQUEST UPDATE DATA";
    btn.disabled = false;
  }
}
