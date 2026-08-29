import html2canvas from 'html2canvas';

function isMobileDevice() {
  const ua = navigator.userAgent || '';
  const isTouchDevice = (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
  const isMobileUA = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isIpadOS = /Macintosh/i.test(ua) && isTouchDevice;
  return isMobileUA || isIpadOS;
}

export async function exportToImage(containerId, filename) {
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    let container = document.getElementById(containerId);
    if (!container) {
      container = document.getElementById('previewCard');
    }
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
          width: 794,
          height: 1123,
          windowWidth: 794,
          windowHeight: 1123,
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDoc, clonedEl) => {
            if (!clonedDoc.querySelector('#sarabun-font-link')) {
              const link = clonedDoc.createElement('link');
              link.id = 'sarabun-font-link';
              link.rel = 'stylesheet';
              link.href = 'https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap';
              clonedDoc.head.appendChild(link);
            }
            clonedEl.style.transform = 'none';
            clonedEl.style.margin = '0';
            clonedEl.style.boxShadow = 'none';
            clonedEl.style.fontFamily = "'Sarabun', 'TH Sarabun New', sans-serif";
          }
        });
        
        const pageFilename = pages.length === 1 ? `${filename}.png` : `${filename}_page${i + 1}.png`;
        
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
        width: 794,
        windowWidth: 794,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc, clonedEl) => {
          if (!clonedDoc.querySelector('#sarabun-font-link')) {
            const link = clonedDoc.createElement('link');
            link.id = 'sarabun-font-link';
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap';
            clonedDoc.head.appendChild(link);
          }
          clonedEl.style.transform = 'none';
          clonedEl.style.margin = '0';
          clonedEl.style.boxShadow = 'none';
          clonedEl.style.fontFamily = "'Sarabun', 'TH Sarabun New', sans-serif";
        }
      });
      
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        const file = new File([blob], `${filename}.png`, { type: 'image/png' });
        filesToShare.push(file);
      }
      downloadedImages.push({ canvas, filename: `${filename}.png` });
    }
    
    // On Mobile: Trigger native share sheet where user can tap "Save Image" to save directly into Camera Roll / Photo Library
    if (isMobileDevice() && filesToShare.length > 0 && navigator.canShare && navigator.canShare({ files: filesToShare })) {
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

    // On Computer (PC / Mac / Laptop): Directly download image file(s) to computer Downloads folder
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
