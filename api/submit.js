const { google } = require('googleapis');
const { Readable } = require('stream');

export default async function handler(req, res) {
  // อนุญาตเฉพาะ Method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const body = req.body;

    // 1. จัดการ Credentials และ Authentication
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';

    // ถ้าระบบหรือผู้ใช้ใส่เครื่องหมายคำพูด (") ครอบหัวท้ายไว้ ให้ตัดทิ้ง
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }

    // บังคับแปลงตัวอักษร \n ให้เป็นคำสั่งขึ้นบรรทัดใหม่จริงๆ เพื่อป้องกัน OpenSSL Error
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
      },
      scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    });

    // 2. อัปโหลดรูปภาพสลิปเข้า Google Drive
    const drive = google.drive({ version: 'v3', auth });
    
    // แยก Base64 string ออกจากส่วน Header (data:image/jpeg;base64,...)
    const matches = body.slipImage.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('รูปแบบไฟล์รูปภาพไม่ถูกต้อง');
    }
    const mimeType = matches[1];
    const base64Data = matches[2];
    
    // แปลง Base64 เป็น Buffer และ Readable Stream ให้ Drive API อ่านได้
    const buffer = Buffer.from(base64Data, 'base64');
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    // สร้างไฟล์ใน Drive
    const driveRes = await drive.files.create({
      requestBody: {
        name: `slip_${body.orderId}_${Date.now()}.jpg`, // ตั้งชื่อไฟล์ให้ไม่ซ้ำ
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID], // ระบุโฟลเดอร์ปลายทาง
      },
      media: {
        mimeType: mimeType,
        body: stream,
      },
      fields: 'id, webViewLink', // ขอลิงก์สำหรับดูไฟล์กลับมา
    });

    const fileLink = driveRes.data.webViewLink;

    // 3. บันทึกข้อมูลลง Google Sheet
    const sheets = google.sheets({ version: 'v4', auth });
    
    // จัดเวลาให้เป็น Timezone ประเทศไทย
    const currentDate = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
    
    // จัดเรียงข้อมูลให้ตรงกับคอลัมน์ A ถึง L
    // สังเกตว่าเลขผู้เสียภาษีและเบอร์โทร จะใส่ single quote (') นำหน้า เพื่อป้องกัน Google Sheet ตัดเลข 0 ข้างหน้าทิ้ง
    const rowData = [
      currentDate,                // A: Timestamp
      'รอตรวจสอบ',                  // B: สถานะ
      body.orderId,               // C: Order ID
      body.type,                  // D: ประเภท
      body.taxName,               // E: ชื่อผู้เสียภาษี
      `'${body.taxId}`,           // F: เลข 13 หลัก
      body.branch,                // G: สาขา
      body.address,               // H: ที่อยู่
      body.contactName,           // I: ชื่อผู้ติดต่อ
      `'${body.phone}`,           // J: เบอร์โทร
      body.email,                 // K: อีเมล
      fileLink                    // L: ลิงก์สลิป
    ];

    // แทรกลงบรรทัดล่างสุดของชีต (สมมติว่าชีตชื่อ Sheet1 หากเปลี่ยนชื่อชีต ต้องมาแก้ตรงนี้ด้วย)
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A:L', 
      valueInputOption: 'USER_ENTERED', // ให้ Sheet มองเหมือนเราพิมพ์เอง
      requestBody: {
        values: [rowData],
      },
    });

    // ส่งข้อความกลับไปหาหน้าบ้านว่าทำงานเสร็จสมบูรณ์
    return res.status(200).json({ success: true, message: 'ส่งข้อมูลสำเร็จ' });

  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', error: error.message });
  }
}