const { google } = require('googleapis');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const body = req.body;

    // 1. แปลงรูป Base64 เป็น Buffer
    const matches = body.slipImage.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('รูปแบบไฟล์รูปภาพไม่ถูกต้อง');
    }
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const fileName = `/slip_${body.orderId}_${Date.now()}.jpg`;

    // 2. อัปโหลดรูปภาพขึ้น Dropbox
    const uploadRes = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DROPBOX_ACCESS_TOKEN}`,
        'Dropbox-API-Arg': JSON.stringify({
          path: fileName,
          mode: 'add',
          autorename: true,
          mute: false
        }),
        'Content-Type': 'application/octet-stream',
      },
      body: buffer,
    });

    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) {
      throw new Error('ไม่สามารถอัปโหลดรูปไปยัง Dropbox ได้');
    }

    // 3. สร้างลิงก์แชร์สำหรับเปิดดูรูปภาพ
    const linkRes = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DROPBOX_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: uploadData.path_display,
      }),
    });

    const linkData = await linkRes.json();
    // แปลงลิงก์ให้กดคลิกดูรูปภาพได้โดยตรง
    const fileLink = linkData.url ? linkData.url.replace('?dl=0', '?dl=1') : '';

    // 4. บันทึกข้อมูลและลิงก์รูปลง Google Sheet (ใช้ Service Account เดิมได้เลย)
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
      fileLink // ลิงก์รูปจาก Dropbox ในคอลัมน์ L
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A:L', 
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [rowData] },
    });

    return res.status(200).json({ success: true, message: 'ส่งข้อมูลสำเร็จ' });

  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', error: error.message });
  }
}