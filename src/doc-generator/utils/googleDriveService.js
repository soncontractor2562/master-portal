/**
 * Google Drive Integration Service for Master Portal
 * Communicates with Google Apps Script Webhook
 */

export async function uploadToGoogleDrive({ webhookUrl, folderId, filename, base64Data, projectName, docType }) {
  if (!webhookUrl || !webhookUrl.trim()) {
    throw new Error('กรุณาระบุ Google Apps Script Webhook URL ในหน้า "⚙️ ตั้งค่า / ทะเบียน" ก่อน');
  }

  // Clean base64 string
  let cleanBase64 = base64Data;
  if (cleanBase64.includes(',')) {
    cleanBase64 = cleanBase64.split(',')[1];
  }

  const payload = {
    action: 'uploadFile',
    filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
    mimeType: 'application/pdf',
    base64Data: cleanBase64,
    folderId: folderId ? folderId.trim() : '',
    projectName: projectName ? projectName.trim() : 'ทั่วไป',
    docType: docType || 'report'
  };

  try {
    const res = await fetch(webhookUrl.trim(), {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8' // Avoids CORS preflight with Google Apps Script
      }
    });

    const data = await res.json();
    if (data.status === 'success' || data.success) {
      return {
        success: true,
        fileUrl: data.fileUrl || data.url || (data.fileId ? `https://drive.google.com/file/d/${data.fileId}/view` : ''),
        fileId: data.fileId,
        folderName: data.folderName
      };
    } else {
      throw new Error(data.message || data.error || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
    }
  } catch(err) {
    if (err.message && err.message.includes('Webhook URL')) {
      throw err;
    }
    console.error('Google Drive Upload Error:', err);
    throw new Error(`ไม่สามารถเชื่อมต่อ Google Drive Webhook ได้: ${err.message}`);
  }
}

export async function testGoogleDriveWebhook(webhookUrl) {
  if (!webhookUrl || !webhookUrl.trim()) {
    throw new Error('กรุณากรอก Webhook URL');
  }

  try {
    const res = await fetch(webhookUrl.trim(), {
      method: 'POST',
      body: JSON.stringify({ action: 'ping' }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    const data = await res.json();
    if (data.status === 'success' || data.success) {
      return { success: true, message: data.message || 'เชื่อมต่อ Google Drive สำเร็จ!' };
    }
    throw new Error(data.message || 'Webhook ตอบกลับไม่ถูกต้อง');
  } catch(err) {
    throw new Error(`การทดสอบเชื่อมต่อล้มเหลว: ${err.message}`);
  }
}
