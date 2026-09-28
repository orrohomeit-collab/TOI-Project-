// 1. จัดการสลับแบบฟอร์ม นิติบุคคล / บุคคลธรรมดา
const taxTypeRadios = document.querySelectorAll('input[name="taxType"]');
const corpFields = document.getElementById('corporateFields');
const indivFields = document.getElementById('individualFields');

taxTypeRadios.forEach(radio => {
  radio.addEventListener('change', (e) => {
    if (e.target.value === 'corporate') {
      corpFields.style.display = 'block';
      indivFields.style.display = 'none';
    } else {
      corpFields.style.display = 'none';
      indivFields.style.display = 'block';
    }
  });
});

// 2. ฟังก์ชันตรวจสอบเลข 13 หลักด้วยอัลกอริทึม Modulo 11
function validateThaiID(id) {
  if (!/^[0-9]{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseFloat(id.charAt(i)) * (13 - i);
  }
  let checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseFloat(id.charAt(12));
}

// 3. จัดการอัปโหลดไฟล์ ย่อด้วย Canvas และแปลงเป็น Base64
const slipUpload = document.getElementById('slipUpload');
const slipBase64 = document.getElementById('slipBase64');
const fileNameDisplay = document.getElementById('fileNameDisplay');

slipUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  fileNameDisplay.textContent = file.name;

  const reader = new FileReader();
  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1200;
      let width = img.width;
      let height = img.height;

      // ค่อยๆ ย่อขนาดถ้าเกิน 1200px
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // แปลงเป็น Base64 ที่คุณภาพ 80%
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      slipBase64.value = dataUrl;
    }
    img.src = event.target.result;
  }
  reader.readAsDataURL(file);
});

// 4. จัดการฟอร์ม Submit
const form = document.getElementById('taxForm');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const isCorporate = document.querySelector('input[name="taxType"]:checked').value === 'corporate';
  const taxIdInput = isCorporate ? document.getElementById('corpTaxId').value : document.getElementById('indivTaxId').value;
  
  // ถอดเครื่องหมายขีด (-) ออกให้เหลือแต่ตัวเลข 13 หลักเพื่อเอาไปตรวจสอบ Modulo 11
  const rawTaxId = taxIdInput.replace(/-/g, '');
  
  // เช็คเงื่อนไขตรวจสอบเลข 13 หลัก
  if (isCorporate && !validateThaiID(rawTaxId)) {
    alert("เลขประจำตัวผู้เสียภาษี 13 หลักของนิติบุคคลไม่ถูกต้อง");
    return;
  }
  if (!isCorporate && rawTaxId && !validateThaiID(rawTaxId)) {
    alert("เลขบัตรประชาชน/ผู้เสียภาษี ไม่ถูกต้อง");
    return;
  }

  // เช็คว่าแนบสลิปหรือยัง
  if (!slipBase64.value) {
    alert("กรุณาอัปโหลดรูปภาพสลิปโอนเงิน");
    return;
  }

  // ปิดปุ่มกันกดซ้ำ
  submitBtn.disabled = true;
  submitBtn.textContent = 'กำลังส่งข้อมูล...';

  // รวบรวมข้อมูลเป็น JSON ก้อนเดียว (ส่งค่าแบบมีขีดเข้า Google Sheet ได้เลยเพื่อให้อ่านง่าย)
  const payload = {
    orderId: document.getElementById('orderId').value,
    type: isCorporate ? 'นิติบุคคล' : 'บุคคลธรรมดา',
    taxName: isCorporate ? document.getElementById('corpName').value : document.getElementById('indivName').value,
    taxId: taxIdInput || '-', // ใช้ตัวแปร taxIdInput ที่มีขีด (-) แทรกอยู่
    branch: isCorporate ? document.getElementById('branch').value : '-',
    address: document.getElementById('address').value,
    contactName: isCorporate ? document.getElementById('contactName').value : document.getElementById('indivName').value,
    phone: document.getElementById('phone').value,
    email: document.getElementById('email').value,
    slipImage: slipBase64.value
  };

  // ... โค้ดส่วน fetch ส่งข้อมูลเหมือนเดิม ...
  try {
    // ส่งไปที่ /api/submit
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      alert("ส่งข้อมูลสำเร็จ!");
      form.reset();
      slipBase64.value = "";
      fileNameDisplay.textContent = "คลิกเพื่อเลือกไฟล์รูปภาพ (JPG, PNG)";
    } else {
      const err = await response.json();
      alert("เกิดข้อผิดพลาด: " + (err.message || 'ไม่สามารถส่งข้อมูลได้'));
    }
  } catch (error) {
    alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'ยืนยันข้อมูล';
  }
});

// ==========================================
// ส่วนที่เพิ่มใหม่: จัดการรูปแบบตัวเลข (ใส่ขีดอัตโนมัติ)
// ==========================================

// ฟังก์ชันจัดรูปแบบเลขประจำตัว (X-XXXX-XXXXX-XX-X)
function formatTaxId(value) {
  let v = value.replace(/\D/g, ''); // ลบตัวอักษรที่ไม่ใช่ตัวเลขออกทั้งหมด
  let formatted = '';
  if (v.length > 0) formatted += v.substring(0, 1);
  if (v.length > 1) formatted += '-' + v.substring(1, 5);
  if (v.length > 5) formatted += '-' + v.substring(5, 10);
  if (v.length > 10) formatted += '-' + v.substring(10, 12);
  if (v.length > 12) formatted += '-' + v.substring(12, 13);
  return formatted;
}

// ฟังก์ชันจัดรูปแบบเบอร์โทรศัพท์ (XXX-XXX-XXXX)
function formatPhone(value) {
  let v = value.replace(/\D/g, '');
  let formatted = '';
  if (v.length > 0) formatted += v.substring(0, 3);
  if (v.length > 3) formatted += '-' + v.substring(3, 6);
  if (v.length > 6) formatted += '-' + v.substring(6, 10);
  return formatted;
}

// ดักจับการพิมพ์เพื่อเปลี่ยนฟอร์แมตทันที
document.getElementById('corpTaxId').addEventListener('input', (e) => {
  e.target.value = formatTaxId(e.target.value);
});
document.getElementById('indivTaxId').addEventListener('input', (e) => {
  e.target.value = formatTaxId(e.target.value);
});
document.getElementById('phone').addEventListener('input', (e) => {
  e.target.value = formatPhone(e.target.value);
});