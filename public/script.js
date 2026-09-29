// ==========================================
// 1. จัดการ Modal แจ้งเตือนกลางจอ (Loading / Success / Error)
// ==========================================
const statusModal = document.getElementById('statusModal');
const statusCard = document.getElementById('statusCard');
const modalIconBox = document.getElementById('modalIconBox');
const iconLoading = document.getElementById('iconLoading');
const iconSuccess = document.getElementById('iconSuccess');
const iconError = document.getElementById('iconError');
const modalTitle = document.getElementById('modalTitle');
const modalDesc = document.getElementById('modalDesc');
const modalCloseBtn = document.getElementById('modalCloseBtn');

function showModal(type, title, desc) {
  statusCard.classList.remove('anim-pop', 'anim-shake');
  modalIconBox.classList.remove('loading-bg', 'success-bg', 'error-bg');
  iconLoading.style.display = 'none';
  iconSuccess.style.display = 'none';
  iconError.style.display = 'none';
  modalCloseBtn.style.display = 'none';

  modalTitle.textContent = title;
  modalDesc.textContent = desc;

  if (type === 'loading') {
    modalIconBox.classList.add('loading-bg');
    iconLoading.style.display = 'block';
  } else if (type === 'success') {
    modalIconBox.classList.add('success-bg');
    iconSuccess.style.display = 'block';
    modalCloseBtn.style.display = 'block';
    modalCloseBtn.className = 'modal-btn btn-primary';
    void statusCard.offsetWidth; // กระตุ้น DOM reflow เพื่อเริ่มแอนิเมชันใหม่
    statusCard.classList.add('anim-pop');
  } else if (type === 'error') {
    modalIconBox.classList.add('error-bg');
    iconError.style.display = 'block';
    modalCloseBtn.style.display = 'block';
    modalCloseBtn.className = 'modal-btn';
    void statusCard.offsetWidth;
    statusCard.classList.add('anim-shake');
  }

  statusModal.classList.add('active');
}

function hideModal() {
  statusModal.classList.remove('active');
}

modalCloseBtn.addEventListener('click', hideModal);

// ==========================================
// 2. จัดการสลับแบบฟอร์ม นิติบุคคล / บุคคลธรรมดา
// ==========================================
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

// ==========================================
// 3. ตรวจสอบเลข 13 หลักด้วย Modulo 11
// ==========================================
function validateThaiID(id) {
  if (!/^[0-9]{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(id.charAt(i), 10) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(id.charAt(12), 10);
}

// ==========================================
// 4. จัดการอัปโหลด ย่อรูป และ Preview
// ==========================================
const slipCamera = document.getElementById('slipCamera');
const slipGallery = document.getElementById('slipGallery');
const slipBase64 = document.getElementById('slipBase64');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const previewContainer = document.getElementById('previewContainer');
const slipPreview = document.getElementById('slipPreview');
let isImageProcessing = false;

function processImageFile(file) {
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showModal('error', 'ไฟล์ไม่ถูกต้อง', 'กรุณาเลือกไฟล์ที่เป็นรูปภาพเท่านั้น (JPG, PNG)');
    return;
  }

  isImageProcessing = true;
  fileNameDisplay.textContent = 'กำลังประมวลผลรูปภาพ...';
  fileNameDisplay.style.color = '#718096';

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

      const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.8);
      slipBase64.value = optimizedBase64;
      
      slipPreview.src = optimizedBase64;
      previewContainer.style.display = 'block';

      fileNameDisplay.textContent = `แนบรูปสำเร็จ: ${file.name || 'รูปถ่ายสลิป'}`;
      fileNameDisplay.style.color = '#16a34a';
      isImageProcessing = false;
    };

    img.onerror = function() {
      showModal('error', 'รูปภาพไม่ถูกต้อง', 'ไม่สามารถประมวลผลไฟล์รูปภาพนี้ได้ กรุณาลองใช้รูปอื่น');
      clearImagePreview();
      isImageProcessing = false;
    };

    img.src = event.target.result;
  };

  reader.onerror = function() {
    showModal('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถอ่านไฟล์รูปภาพได้');
    clearImagePreview();
    isImageProcessing = false;
  };

  reader.readAsDataURL(file);
}

function clearImagePreview() {
  slipBase64.value = '';
  slipPreview.src = '';
  previewContainer.style.display = 'none';
  fileNameDisplay.textContent = 'ยังไม่ได้เลือกรูปภาพ';
  fileNameDisplay.style.color = '#718096';
}

if (slipCamera) {
  slipCamera.addEventListener('change', (e) => processImageFile(e.target.files[0]));
}
if (slipGallery) {
  slipGallery.addEventListener('change', (e) => processImageFile(e.target.files[0]));
}

// ==========================================
// 5. จัดรูปแบบตัวเลขแบบ Real-time ขณะพิมพ์ (ใส่ขีดอัตโนมัติ)
// ==========================================
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
  if (v.startsWith('02')) {
    let formatted = v.substring(0, 2);
    if (v.length > 2) formatted += '-' + v.substring(2, 5);
    if (v.length > 5) formatted += '-' + v.substring(5, 9);
    return formatted;
  }
  let formatted = '';
  if (v.length > 0) formatted += v.substring(0, 3);
  if (v.length > 3) formatted += '-' + v.substring(3, 6);
  if (v.length > 6) formatted += '-' + v.substring(6, 10);
  return formatted;
}

const corpTaxInput = document.getElementById('corpTaxId');
if (corpTaxInput) {
  corpTaxInput.addEventListener('input', (e) => {
    e.target.value = formatTaxId(e.target.value);
  });
}

const indivTaxInput = document.getElementById('indivTaxId');
if (indivTaxInput) {
  indivTaxInput.addEventListener('input', (e) => {
    e.target.value = formatTaxId(e.target.value);
  });
}

const phoneInput = document.getElementById('phone');
if (phoneInput) {
  phoneInput.addEventListener('input', (e) => {
    e.target.value = formatPhone(e.target.value);
  });
}

// ==========================================
// 6. จัดการส่งข้อมูลฟอร์ม
// ==========================================
const form = document.getElementById('taxForm');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (isImageProcessing) {
    showModal('error', 'ระบบกำลังทำงาน', 'รูปภาพกำลังอยู่ระหว่างการประมวลผล กรุณารอสักครู่แล้วกดส่งอีกครั้ง');
    return;
  }

  const isCorporate = document.querySelector('input[name="taxType"]:checked').value === 'corporate';
  const corpNameInput = document.getElementById('corpName').value.trim();
  const indivNameInput = document.getElementById('indivName').value.trim();

  if (isCorporate && !corpNameInput) {
    showModal('error', 'ข้อมูลไม่ครบถ้วน', 'กรุณาระบุชื่อบริษัท/ชื่อนิติบุคคล');
    return;
  }
  if (!isCorporate && !indivNameInput) {
    showModal('error', 'ข้อมูลไม่ครบถ้วน', 'กรุณาระบุชื่อ-นามสกุล');
    return;
  }

  const taxIdInput = isCorporate ? document.getElementById('corpTaxId').value : document.getElementById('indivTaxId').value;
  const rawTaxId = taxIdInput.replace(/-/g, '');

  if (isCorporate && !validateThaiID(rawTaxId)) {
    showModal('error', 'ข้อมูลไม่ถูกต้อง', 'เลขประจำตัวผู้เสียภาษี 13 หลักของนิติบุคคลไม่ถูกต้อง');
    return;
  }
  if (!isCorporate && rawTaxId && !validateThaiID(rawTaxId)) {
    showModal('error', 'ข้อมูลไม่ถูกต้อง', 'เลขประจำตัวผู้เสียภาษี / บัตรประชาชนไม่ถูกต้อง');
    return;
  }

  if (!slipBase64.value) {
    showModal('error', 'แนบรูปภาพไม่ครบ', 'กรุณาอัปโหลดรูปภาพสลิปโอนเงิน');
    return;
  }

  submitBtn.disabled = true;
  showModal('loading', 'กำลังส่งข้อมูล...', 'กำลังอัปโหลดสลิปและบันทึกใบกำกับภาษี');

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
      form.reset();
      clearImagePreview();
      showModal('success', 'ส่งข้อมูลสำเร็จ!', 'ระบบได้รับข้อมูลและรูปภาพสลิปเรียบร้อยแล้ว');
    } else {
      const err = await response.json();
      showModal('error', 'เกิดข้อผิดพลาด', err.message || 'ไม่สามารถส่งข้อมูลได้');
    }
  } catch (error) {
    showModal('error', 'การเชื่อมต่อขัดข้อง', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
  } finally {
    submitBtn.disabled = false;
  }
});