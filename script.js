// script.js - Logika Inbound Scanner

// MASUKKAN URL WEB APP GOOGLE APPS SCRIPT DI SINI
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyFnAt_k_cKbY0lHxyDAHnxxLHdpzCGDDTmz99BLhOa3y3B7do9XOHflh3qPjbo9z2mRQ/exec';

window.onload = function() {
  const savedName = localStorage.getItem('inbound_checker_name');
  if(savedName) document.getElementById('checkedBy').value = savedName;
  
  const savedCabang = localStorage.getItem('inbound_cabang');
  if(savedCabang) document.getElementById('cabang').value = savedCabang;
}

function openCamera() {
  alert("Integrasi kamera siap ditambahkan.");
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
