// 1. จัดการ Modal แจ้งเตือนสถานะ
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
    void statusCard.offsetWidth;
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

// 2. จัดการรูปภาพใบเสร็จ ย่อขนาด และสร้าง Preview
const receiptCamera = document.getElementById('receiptCamera');
const receiptGallery = document.getElementById('receiptGallery');
const receiptBase64 = document.getElementById('receiptBase64');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const previewContainer = document.getElementById('previewContainer');
const receiptPreview = document.getElementById('receiptPreview');
let isImageProcessing = false;

function processImageFile(file) {
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showModal('error', 'ไฟล์ไม่ถูกต้อง', 'กรุณาเลือกไฟล์รูปภาพใบเสร็จเท่านั้น (JPG, PNG, GIF)');
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

      const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.82);
      receiptBase64.value = optimizedBase64;
      receiptPreview.src = optimizedBase64;
      previewContainer.style.display = 'block';

      fileNameDisplay.textContent = `แนบรูปใบเสร็จสำเร็จ: ${file.name || 'รูปภาพ'}`;
      fileNameDisplay.style.color = '#16a34a';
      isImageProcessing = false;
    };

    img.onerror = function() {
      showModal('error', 'รูปภาพไม่ถูกต้อง', 'ไม่สามารถอ่านรูปภาพนี้ได้ กรุณาลองใช้รูปอื่น');
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
  receiptBase64.value = '';
  receiptPreview.src = '';
  previewContainer.style.display = 'none';
  fileNameDisplay.textContent = 'ยังไม่ได้เลือกรูปภาพใบเสร็จ';
  fileNameDisplay.style.color = '#718096';
}

if (receiptCamera) {
  receiptCamera.addEventListener('change', (e) => processImageFile(e.target.files[0]));
}
if (receiptGallery) {
  receiptGallery.addEventListener('change', (e) => processImageFile(e.target.files[0]));
}

// 3. จัด Format เบอร์โทรศัพท์ขณะพิมพ์
const phoneInput = document.getElementById('phone');
if (phoneInput) {
  phoneInput.addEventListener('input', (e) => {
    const v = e.target.value.replace(/\D/g, '').substring(0, 10);
    let formatted = '';
    if (v.startsWith('02')) {
      if (v.length > 0) formatted += v.substring(0, 2);
      if (v.length > 2) formatted += '-' + v.substring(2, 5);
      if (v.length > 5) formatted += '-' + v.substring(5, 9);
    } else {
      if (v.length > 0) formatted += v.substring(0, 3);
      if (v.length > 3) formatted += '-' + v.substring(3, 6);
      if (v.length > 6) formatted += '-' + v.substring(6, 10);
    }
    e.target.value = formatted;
  });
}

// 4. จัดการส่งข้อมูลฟอร์มประกัน
const form = document.getElementById('warrantyForm');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (isImageProcessing) {
    showModal('error', 'ระบบกำลังทำงาน', 'รูปภาพกำลังอยู่ระหว่างการประมวลผล กรุณารอสักครู่แล้วกดส่งอีกครั้ง');
    return;
  }

  if (!receiptBase64.value) {
    showModal('error', 'แนบรูปภาพไม่ครบ', 'กรุณาอัปโหลดรูปภาพใบเสร็จรับเงิน');
    return;
  }

  submitBtn.disabled = true;
  showModal('loading', 'กำลังส่งข้อมูล...', 'ระบบกำลังบันทึกข้อมูลประกันและอัปโหลดใบเสร็จ');

  const payload = {
    model: document.getElementById('model').value.trim(),
    serialCode: document.getElementById('serialCode').value.trim(),
    orderNo: document.getElementById('orderNo').value.trim(),
    customerName: document.getElementById('customerName').value.trim(),
    phone: phoneInput.value.trim(),
    email: document.getElementById('email').value.trim(),
    address: document.getElementById('address').value.trim(),
    buyDate: document.getElementById('buyDate').value,
    store: document.getElementById('store').value.trim(),
    receiptImage: receiptBase64.value,
    remark: document.getElementById('remark').value.trim() || '-'
  };

  try {
    const response = await fetch('/api/warranty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      form.reset();
      clearImagePreview();
      showModal('success', 'ลงทะเบียนสำเร็จ!', 'ระบบได้บันทึกข้อมูลการรับประกันสินค้าของคุณเรียบร้อยแล้ว');
    } else {
      const err = await response.json();
      showModal('error', 'เกิดข้อผิดพลาด', err.message || 'ไม่สามารถลงทะเบียนได้ในขณะนี้');
    }
  } catch (error) {
    showModal('error', 'การเชื่อมต่อขัดข้อง', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
  } finally {
    submitBtn.disabled = false;
  }
});