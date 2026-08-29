import html2canvas from 'html2canvas';

export async function exportToImage(containerId, filename) {
  try {
    const container = document.getElementById(containerId);
    if (!container) {
      alert('ไม่พบองค์ประกอบรายงาน');
      return false;
    }
    
    const pages = container.querySelectorAll('.a4-page');
    const filesToShare = [];
    const downloadedImages = [];

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
        
        const pageFilename = pages.length === 1 ? `${filename}.png` : `${filename}_page${i + 1}.png`;
        
        // Convert canvas to blob & File for mobile share sheet (which allows "Save to Photos" / "บันทึกภาพลงคลัง")
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (blob) {
          const file = new File([blob], pageFilename, { type: 'image/png' });
          filesToShare.push(file);
        }
        downloadedImages.push({ canvas, filename: pageFilename });
      }
    } else {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794
      });
      
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        const file = new File([blob], `${filename}.png`, { type: 'image/png' });
        filesToShare.push(file);
      }
      downloadedImages.push({ canvas, filename: `${filename}.png` });
    }
    
    // On Mobile: Trigger native share sheet where user can tap "Save Image" to save directly into Camera Roll / Photo Library
    if (filesToShare.length > 0 && navigator.canShare && navigator.canShare({ files: filesToShare })) {
      try {
        await navigator.share({
          files: filesToShare,
          title: filename,
          text: `บันทึกรูปภาพ ${filename}`
        });
        return true;
      } catch (shareErr) {
        if (shareErr.name === 'AbortError') {
          return true;
        }
      }
    }

    // Fallback: standard browser download for Desktop
    for (let i = 0; i < downloadedImages.length; i++) {
      const { canvas, filename: fName } = downloadedImages[i];
      const imgData = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = imgData;
      a.download = fName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      if (i < downloadedImages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error exporting Image:', error);
    alert('เกิดข้อผิดพลาดในการบันทึกเป็นรูปภาพ');
    return false;
  }
}
