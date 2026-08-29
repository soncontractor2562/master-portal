import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function exportToPdf(containerId, filename) {
  try {
    const container = document.getElementById(containerId);
    if (!container) {
      alert('ไม่พบองค์ประกอบรายงาน');
      return false;
    }
    
    // Check if there are multiple A4 pages
    const pages = container.querySelectorAll('.a4-page');
    const pdf = new jsPDF('p', 'mm', 'a4');
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
          windowWidth: 794
        });
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
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
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, (canvas.height * pdfWidth) / canvas.width);
    }
    
    // Try Web Share API on mobile devices first (allows direct share to LINE, Mail, Files, etc.)
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
    } else {
      pdf.save(`${filename}.pdf`);
      return true;
    }
  } catch (error) {
    console.error('Error exporting PDF:', error);
    alert('เกิดข้อผิดพลาดในการบันทึกเป็น PDF');
    return false;
  }
}
