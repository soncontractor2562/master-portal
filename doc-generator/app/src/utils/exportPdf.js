import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function exportToPdf(elementId, filename) {
  try {
    const element = document.getElementById(elementId);
    if (!element) return false;
    
    // Temporarily position element visible on screen off-screen
    const originalDisplay = element.style.display;
    element.style.display = 'block';
    
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 800
    });
    
    element.style.display = originalDisplay;
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${filename}.pdf`);
    
    return true;
  } catch (error) {
    console.error('Error exporting PDF:', error);
    alert('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF');
    return false;
  }
}
