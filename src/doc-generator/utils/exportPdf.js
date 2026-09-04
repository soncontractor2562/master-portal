import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';

function isMobileDevice() {
  const ua = navigator.userAgent || '';
  const isTouchDevice = (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
  const isMobileUA = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isIpadOS = /Macintosh/i.test(ua) && isTouchDevice;
  return isMobileUA || isIpadOS;
}

// Convert all external images (Google Drive, Logo, etc.) inside container to local Base64 dataURIs
export async function inlineAllImagesToBase64(container) {
  if (!container) return;
  const images = Array.from(container.querySelectorAll('img'));
  if (images.length === 0) return;

  await Promise.all(
    images.map(async (img) => {
      const src = img.getAttribute('src');
      if (!src || src.startsWith('data:')) return;

      try {
        const res = await fetch(src, { mode: 'cors' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const reader = new FileReader();
        const dataUrl = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
        if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
          img.src = dataUrl;
        }
      } catch (err) {
        console.warn('inlineAllImagesToBase64 error for:', src, err);
      }
    })
  );

  // Wait until all images have complete === true and naturalWidth > 0
  await Promise.all(
    images.map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        setTimeout(resolve, 2500);
      });
    })
  );
}

export async function exportToPdf(containerId, filename) {
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
    
    // Ensure 100% of images are converted to local Base64 dataURIs before capturing
    await inlineAllImagesToBase64(container);
    await new Promise(r => setTimeout(r, 120));

    // Check if there are multiple A4 pages
    const pages = container.querySelectorAll('.a4-page');
    const pdf = new jsPDF('p', 'mm', 'a4', true);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const renderOptions = {
      quality: 0.92,
      pixelRatio: 2, // 300 DPI high-definition output
      backgroundColor: '#ffffff',
      cacheBust: false
    };
    
    if (pages && pages.length > 0) {
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) {
          pdf.addPage('a4', 'p');
        }
        const pageEl = pages[i];
        const imgData = await htmlToImage.toJpeg(pageEl, renderOptions);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }
    } else {
      const imgData = await htmlToImage.toJpeg(container, renderOptions);
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    }
    
    // On Mobile: Use Web Share API (share to LINE, Mail, Files, AirDrop)
    if (isMobileDevice()) {
      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], `${filename}.pdf`, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({
            files: [pdfFile],
            title: `${filename}.pdf`,
            text: `เอกสารรายงาน ${filename}`
          });
          return true;
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') {
            return true;
          }
          pdf.save(`${filename}.pdf`);
          return true;
        }
      }
    }

    // On Computer (PC / Mac / Laptop): Directly download to computer
    pdf.save(`${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Error exporting PDF:', error);
    alert('เกิดข้อผิดพลาดในการบันทึกเป็น PDF: ' + (error?.message || error));
    return false;
  }
}

export async function generatePdfBase64(containerId) {
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    let container = document.getElementById(containerId);
    if (!container) {
      container = document.getElementById('previewCard');
    }
    if (!container) {
      return null;
    }

    // Ensure 100% of images are converted to local Base64 dataURIs before capturing
    await inlineAllImagesToBase64(container);
    await new Promise(r => setTimeout(r, 120));

    const pages = container.querySelectorAll('.a4-page');
    const pdf = new jsPDF('p', 'mm', 'a4', true);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const renderOptions = {
      quality: 0.90,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: false
    };

    if (pages && pages.length > 0) {
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) {
          pdf.addPage('a4', 'p');
        }
        const pageEl = pages[i];
        const imgData = await htmlToImage.toJpeg(pageEl, renderOptions);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }
    } else {
      const imgData = await htmlToImage.toJpeg(container, renderOptions);
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    }

    return pdf.output('datauristring');
  } catch (err) {
    console.error('generatePdfBase64 error:', err);
    return null;
  }
}
