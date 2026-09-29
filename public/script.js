// 1. สลับแบบฟอร์ม นิติบุคคล / บุคคลธรรมดา[cite: 1]
const taxTypeRadios = document.querySelectorAll('input[name="taxType"]');
const corpFields = document.getElementById('corporateFields');
const indivFields = document.getElementById('individualFields');

taxTypeRadios.forEach(radio => {
  radio.addEventListener('change', (e) => {
    const isCorp = e.target.value === 'corporate';
    corpFields.style.display = isCorp ? 'block' : 'none';
    indivFields.style.display = isCorp ? 'none' : 'block';
  });
});

// 2. ตรวจสอบเลข 13 หลักด้วย Modulo 11[cite: 1]
function validateThaiID(id) {
  if (!/^[0-9]{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(id.charAt(i), 10) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(id.charAt(12), 10);
}

// 3. จัดการอัปโหลด บีบอัดรูปแนวตั้ง/แนวนอนด้วย Canvas และแปลงเป็น Base64
const slipUpload = document.getElementById('slipUpload');
const slipBase64 = document.getElementById('slipBase64');
const fileNameDisplay = document.getElementById('fileNameDisplay');
let isImageProcessing = false;

slipUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('กรุณาเลือกไฟล์ที่เป็นรูปภาพเท่านั้น');
    slipUpload.value = '';
    return;
  }

  isImageProcessing = true;
  fileNameDisplay.textContent = `กำลังประมวลผล: ${file.name}...`;

  const reader = new FileReader();
  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const MAX_DIMENSION = 1200;
      let width = img.width;
      let height = img.height;

      // ปรับขนาดโดยอิงด้านที่ยาวที่สุด
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // แปลงเป็น JPEG คุณภาพ 80% เพื่อคุมขนาดไฟล์ไม่ให้เกินเพดาน Vercel[cite: 1]
      slipBase64.value = canvas.toDataURL('image/jpeg', 0.8);
      fileNameDisplay.textContent = `พร้อมใช้งาน: ${file.name}`;
      isImageProcessing = false;
    };

    img.onerror = function() {
      alert('ไม่สามารถประมวลผลไฟล์รูปภาพนี้ได้ กรุณาลองใช้รูปอื่น');
      slipUpload.value = '';
      slipBase64.value = '';
      fileNameDisplay.textContent = 'คลิกเพื่อเลือกไฟล์รูปภาพ (JPG, PNG)';
      isImageProcessing = false;
    };

    img.src = event.target.result;
  };

  reader.onerror = function() {
    alert('เกิดข้อผิดพลาดในการอ่านไฟล์');
    isImageProcessing = false;
  };

  reader.readAsDataURL(file);
});

// 4. จัดรูปแบบข้อความ (Tax ID & Phone)[cite: 1]
function formatTaxId(value) {
  const v = value.replace(/\D/g, '').substring(0, 13);
  let formatted = '';
  if (v.length > 0) formatted += v.substring(0, 1);
  if (v.length > 1) formatted += '-' + v.substring(1, 5);
  if (v.length > 5) formatted += '-' + v.substring(5, 10);
  if (v.length > 10) formatted += '-' + v.substring(10, 12);
  if (v.length > 12) formatted += '-' + v.substring(12, 13);
  return formatted;
}

function formatPhone(value) {
  const v = value.replace(/\D/g, '').substring(0, 10);
  // รองรับเบอร์สำนักงาน 02 (9 หลัก)
  if (v.startsWith('02')) {
    let formatted = v.substring(0, 2);
    if (v.length > 2) formatted += '-' + v.substring(2, 5);
    if (v.length > 5) formatted += '-' + v.substring(5, 9);
    return formatted;
  }
  // เบอร์มือถือ 10 หลัก
  let formatted = '';
  if (v.length > 0) formatted += v.substring(0, 3);
  if (v.length > 3) formatted += '-' + v.substring(3, 6);
  if (v.length > 6) formatted += '-' + v.substring(6, 10);
  return formatted;
}

// ควบคุม Cursor ไม่ให้กระโดดด้วย blur/focus
const taxInputs = [document.getElementById('corpTaxId'), document.getElementById('indivTaxId')];
taxInputs.forEach(input => {
  if (!input) return;
  input.addEventListener('focus', (e) => {
    e.target.value = e.target.value.replace(/-/g, '');
  });
  input.addEventListener('blur', (e) => {
    e.target.value = formatTaxId(e.target.value);
  });
});

const phoneInput = document.getElementById('phone');
if (phoneInput) {
  phoneInput.addEventListener('focus', (e) => {
    e.target.value = e.target.value.replace(/-/g, '');
  });
  phoneInput.addEventListener('blur', (e) => {
    e.target.value = formatPhone(e.target.value);
  });
}

// 5. ส่งข้อมูลฟอร์ม[cite: 1]
const form = document.getElementById('taxForm');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (isImageProcessing) {
    alert('รูปภาพกำลังอยู่ระหว่างการประมวลผล กรุณารอสักครู่แล้วกดส่งอีกครั้ง');
    return;
  }

  const isCorporate = document.querySelector('input[name="taxType"]:checked').value === 'corporate';
  const corpNameInput = document.getElementById('corpName').value.trim();
  const indivNameInput = document.getElementById('indivName').value.trim();

  // ดักตรวจสอบการกรอกชื่อ
  if (isCorporate && !corpNameInput) {
    alert('กรุณาระบุชื่อบริษัท/ชื่อนิติบุคคล');
    return;
  }
  if (!isCorporate && !indivNameInput) {
    alert('กรุณาระบุชื่อ-นามสกุล');
    return;
  }

  const taxIdInput = isCorporate ? document.getElementById('corpTaxId').value : document.getElementById('indivTaxId').value;
  const rawTaxId = taxIdInput.replace(/-/g, '');

  // ตรวจสอบเลข 13 หลัก
  if (isCorporate && !validateThaiID(rawTaxId)) {
    alert('เลขประจำตัวผู้เสียภาษี 13 หลักของนิติบุคคลไม่ถูกต้อง');
    return;
  }
  if (!isCorporate && rawTaxId && !validateThaiID(rawTaxId)) {
    alert('เลขประจำตัวผู้เสียภาษี / บัตรประชาชนไม่ถูกต้อง');
    return;
  }

  // ตรวจสอบว่ามีสลิปพร้อมส่งหรือไม่[cite: 1]
  if (!slipBase64.value) {
    alert('กรุณาอัปโหลดรูปภาพสลิปโอนเงิน');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'กำลังส่งข้อมูล...';

  const payload = {
    orderId: document.getElementById('orderId').value,
    type: isCorporate ? 'นิติบุคคล' : 'บุคคลธรรมดา',
    taxName: isCorporate ? corpNameInput : indivNameInput,
    taxId: taxIdInput || '-',
    branch: isCorporate ? document.getElementById('branch').value : '-',
    address: document.getElementById('address').value,
    contactName: isCorporate ? document.getElementById('contactName').value : indivNameInput,
    phone: phoneInput.value,
    email: document.getElementById('email').value,
    slipImage: slipBase64.value
  };

  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      alert('ส่งข้อมูลสำเร็จ!');
      form.reset();
      slipBase64.value = '';
      fileNameDisplay.textContent = 'คลิกเพื่อเลือกไฟล์รูปภาพ (JPG, PNG)';
    } else {
      const err = await response.json();
      alert('เกิดข้อผิดพลาด: ' + (err.message || 'ไม่สามารถส่งข้อมูลได้'));
    }
  } catch (error) {
    alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'ยืนยันข้อมูล';
  }
});