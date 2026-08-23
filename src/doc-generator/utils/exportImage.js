import html2canvas from 'html2canvas';

export async function exportToImage(containerId, filename) {
  try {
    const container = document.getElementById(containerId);
    if (!container) {
      alert('ไม่พบองค์ประกอบรายงาน');
      return false;
    }
    
    const pages = container.querySelectorAll('.a4-page');
    if (pages && pages.length > 0) {
      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i];
        const canvas = await html2canvas(pageEl, {
          scale: 2, // High resolution (300 DPI target)
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 794
        });
        
        const imgData = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = imgData;
        a.download = pages.length === 1 ? `${filename}.png` : `${filename}_page${i + 1}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Small delay between downloads if multiple pages
        if (i < pages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    } else {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794
      });
      
      const imgData = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = imgData;
      a.download = `${filename}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    
    return true;
  } catch (error) {
    console.error('Error exporting Image:', error);
    alert('เกิดข้อผิดพลาดในการบันทึกเป็นรูปภาพ');
    return false;
  }
}
