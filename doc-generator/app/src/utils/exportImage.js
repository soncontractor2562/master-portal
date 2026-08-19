import html2canvas from 'html2canvas';

export async function exportToImage(elementId, filename) {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      alert('ไม่พบองค์ประกอบรายงาน');
      return false;
    }
    
    // Temporarily ensure element is visible for capture
    const originalDisplay = element.style.display;
    element.style.display = 'block';
    
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution (300 DPI target)
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 800
    });
    
    element.style.display = originalDisplay;
    
    // Convert to Image Data URL
    const imgData = canvas.toDataURL('image/png');
    
    // Create download link
    const a = document.createElement('a');
    a.href = imgData;
    a.download = `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    return true;
  } catch (error) {
    console.error('Error exporting Image:', error);
    alert('เกิดข้อผิดพลาดในการบันทึกเป็นรูปภาพ');
    return false;
  }
}
