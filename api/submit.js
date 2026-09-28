const { google } = require('googleapis');
const { Readable } = require('stream');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const body = req.body;

    // 1. ตั้งค่า Authentication แบบ OAuth2 (ใช้ Refresh Token ของเจ้าของ Drive)
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    // 2. อัปโหลดรูปภาพสลิปเข้า Google Drive
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    const matches = body.slipImage.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('รูปแบบไฟล์รูปภาพไม่ถูกต้อง');
    }
    const mimeType = matches[1];
    const base64Data = matches[2];
    
    const buffer = Buffer.from(base64Data, 'base64');
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const driveRes = await drive.files.create({
      requestBody: {
        name: `slip_${body.orderId}_${Date.now()}.jpg`, 
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID], 
      },
      media: {
        mimeType: mimeType,
        body: stream,
      },
      fields: 'id, webViewLink', 
    });

    const fileLink = driveRes.data.webViewLink;

    // 3. บันทึกข้อมูลลง Google Sheet
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
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
      fileLink
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