const { google } = require('googleapis');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const body = req.body;

    // 1. จัดการรูปภาพ แยก Base64 string
    const matches = body.slipImage.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('รูปแบบไฟล์รูปภาพไม่ถูกต้อง');
    }
    const base64Data = matches[2];

    // 2. ส่งรูปภาพไปฝากที่ Imgbb 
    // ใช้ URLSearchParams เพื่อจัดฟอร์แมตข้อมูลให้เว็บ Imgbb อ่านง่าย
    const formData = new URLSearchParams();
    formData.append('key', process.env.IMGBB_API_KEY); // ดึงรหัส API Key จาก Vercel
    formData.append('image', base64Data);

    const imgbbRes = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData,
    });
    
    const imgbbData = await imgbbRes.json();
    
    if (!imgbbData.success) {
      throw new Error('ไม่สามารถอัปโหลดรูปภาพไปยัง Imgbb ได้');
    }

    // ได้ลิงก์รูปภาพมาแล้ว พร้อมส่งเข้า Sheet
    const fileLink = imgbbData.data.url; 

    // 3. จัดการ Authentication ของ Google Sheets (ใช้ Service Account เดิมได้เลย เพราะ Sheet ไม่มีปัญหาเรื่องโควต้าพื้นที่)
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // 4. บันทึกข้อมูลทั้งหมดลง Google Sheet
    const sheets = google.sheets({ version: 'v4', auth });
    const currentDate = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
    
    const rowData = [
      currentDate,
      'รอตรวจสอบ',
      body.orderId,
      body.type,
      body.taxName,
      `'${body.taxId}`,
      body.branch,
      body.address,
      body.contactName,
      `'${body.phone}`,
      body.email,
      fileLink // ใส่ลิงก์รูปลงในคอลัมน์ L
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A:L', 
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowData],
      },
    });

    return res.status(200).json({ success: true, message: 'ส่งข้อมูลสำเร็จ' });

  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', error: error.message });
  }
}