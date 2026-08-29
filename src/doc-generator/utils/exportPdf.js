import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

function isMobileDevice() {
  const ua = navigator.userAgent || '';
  const isTouchDevice = (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
  const isMobileUA = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isIpadOS = /Macintosh/i.test(ua) && isTouchDevice;
  return isMobileUA || isIpadOS;
}

export async function exportToPdf(containerId, filename) {
  try {
    // Wait for fonts to be ready
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
    
    // Check if there are multiple A4 pages
    const pages = container.querySelectorAll('.a4-page');
    const pdf = new jsPDF('p', 'mm', 'a4', true); // enable fast compression
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    if (pages && pages.length > 0) {
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) {
          pdf.addPage('a4', 'p');
        }
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
              link.href = 'https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap';
              clonedDoc.head.appendChild(link);
            }
            clonedEl.style.transform = 'none';
            clonedEl.style.margin = '0';
            clonedEl.style.boxShadow = 'none';
            clonedEl.style.fontFamily = "'Sarabun', 'TH Sarabun New', sans-serif";
          }
        });
        // Use JPEG with 0.88 quality for optimal compression (drops 30MB down to ~1.2MB with high fidelity)
        const imgData = canvas.toDataURL('image/jpeg', 0.88);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
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
            link.href = 'https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap';
            clonedDoc.head.appendChild(link);
          }
          clonedEl.style.transform = 'none';
          clonedEl.style.margin = '0';
          clonedEl.style.boxShadow = 'none';
          clonedEl.style.fontFamily = "'Sarabun', 'TH Sarabun New', sans-serif";
        }
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.88);
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, (canvas.height * pdfWidth) / canvas.width, undefined, 'FAST');
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
    alert('เกิดข้อผิดพลาดในการบันทึกเป็น PDF');
    return false;
  }
}
