import * as htmlToImage from 'html-to-image';

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
    const renderOptions = {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true
    };

    if (pages && pages.length > 0) {
      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i];
        const imgData = await htmlToImage.toPng(pageEl, renderOptions);
        const pageFilename = pages.length === 1 ? `${filename}.png` : `${filename}_page${i + 1}.png`;
        
        const res = await fetch(imgData);
        const blob = await res.blob();
        if (blob) {
          const file = new File([blob], pageFilename, { type: 'image/png' });
          filesToShare.push(file);
        }
        downloadedImages.push({ imgData, filename: pageFilename });
      }
    } else {
      const imgData = await htmlToImage.toPng(container, renderOptions);
      const res = await fetch(imgData);
      const blob = await res.blob();
      if (blob) {
        const file = new File([blob], `${filename}.png`, { type: 'image/png' });
        filesToShare.push(file);
      }
      downloadedImages.push({ imgData, filename: `${filename}.png` });
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
      const { imgData, filename: fName } = downloadedImages[i];
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
    alert('เกิดข้อผิดพลาดในการบันทึกเป็นรูปภาพ: ' + (error?.message || error));
    return false;
  }
}
