const { google } = require('googleapis');
// ลบ Readable stream ออก เพราะไม่ได้ใช้ Drive แล้ว

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const body = req.body;

    // 1. แยก Base64 string เพื่อเตรียมส่งไป Imgur
    const matches = body.slipImage.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('รูปแบบไฟล์รูปภาพไม่ถูกต้อง');
    }
    const base64Data = matches[2];

    // 2. อัปโหลดรูปไปที่ Imgur (ฟรี ไม่ต้องใช้ API Key ของเรา)
    const imgurResponse = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: {
        // นี่คือ Client ID สาธารณะสำหรับอัปโหลดรูปแบบ Anonymous
        Authorization: 'Client-ID 1307ea2bc5ff2e8', 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Data,
        type: 'base64',
      }),
    });

    const imgurData = await imgurResponse.json();
    
    if (!imgurData.success) {
      throw new Error('ไม่สามารถอัปโหลดรูปภาพได้');
    }

    const fileLink = imgurData.data.link; // ได้ลิงก์รูปมาแล้ว

    // 3. จัดการ Authentication ของ Google Sheets (อันนี้บอตทำได้ ไม่มีปัญหาโควต้า)
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
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets', // เหลือแค่ Sheet
      ],
    });

    // 4. บันทึกข้อมูลและลิงก์รูปลง Google Sheet
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
      fileLink // ใส่ลิงก์ Imgur ลงในคอลัมน์ L
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