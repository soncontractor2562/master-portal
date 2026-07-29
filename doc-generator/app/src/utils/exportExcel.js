import ExcelJS from 'exceljs';

export async function exportToExcel(data) {
  try {
    const response = await fetch('/template.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    
    const worksheet = workbook.worksheets[0]; // First sheet

    // General Info
    worksheet.getCell('E3').value = data.projectName || '';
    worksheet.getCell('E4').value = data.date || '';
    
    // Workday type (Normal vs Holiday)
    worksheet.getCell('R4').value = '';
    // Assuming U4 is the checkbox for holiday based on nearby columns
    worksheet.getCell('U4').value = ''; 
    
    if (data.workDay === 'ปกติ') {
      worksheet.getCell('R4').value = 'ü';
    } else if (data.workDay === 'วันหยุด') {
      // Find the cell next to "วันหยุด" and put 'ü'. Let's just put it in U4.
      worksheet.getCell('U4').value = 'ü'; 
    }
    
    worksheet.getCell('Y4').value = data.workHours || '8.00 - 17.00 น.';

    // Tasks (Starts at row 8, max ~13 rows)
    const taskStartRow = 8;
    for (let i = 0; i < Math.min(data.tasks.length, 13); i++) {
      const row = taskStartRow + i;
      const task = data.tasks[i];
      worksheet.getCell(`A${row}`).value = i + 1;
      worksheet.getCell(`C${row}`).value = task.description || '';
      worksheet.getCell(`U${row}`).value = task.amount || '';
      worksheet.getCell(`W${row}`).value = task.unit || '';
      worksheet.getCell(`Y${row}`).value = task.remark || '';
    }

    // Dynamic Row Finding for Problems and Manpower
    let problemRow = -1;
    let manpowerRow = -1;
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        if (cell.value && typeof cell.value === 'string') {
          if (cell.value.includes('ปัญหาและอุปสรรค์')) problemRow = rowNumber + 1;
          if (cell.value.includes('บุคลากรในการทำงาน')) manpowerRow = rowNumber + 2; 
        }
      });
    });

    if (problemRow !== -1) {
      worksheet.getCell(`C${problemRow}`).value = data.problems || '';
    }

    if (manpowerRow !== -1) {
      // Manpower (Col A = Position, G = Amount)
      for (let i = 0; i < Math.min(data.manpower.length, 15); i++) {
        worksheet.getCell(`A${manpowerRow + i}`).value = data.manpower[i].position || '';
        worksheet.getCell(`G${manpowerRow + i}`).value = data.manpower[i].amount || '';
      }
      
      // Machinery (Col J = Item, Q = Amount)
      for (let i = 0; i < Math.min(data.machinery.length, 15); i++) {
        worksheet.getCell(`J${manpowerRow + i}`).value = data.machinery[i].item || '';
        worksheet.getCell(`Q${manpowerRow + i}`).value = data.machinery[i].amount || '';
      }
      
      // Materials (Col T = Item, AB = Amount)
      for (let i = 0; i < Math.min(data.materials.length, 15); i++) {
        worksheet.getCell(`T${manpowerRow + i}`).value = data.materials[i].item || '';
        worksheet.getCell(`AB${manpowerRow + i}`).value = data.materials[i].amount || '';
      }
    }

    // Export
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `Daily_Report_${data.date || 'Export'}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Error exporting Excel:', error);
    alert('เกิดข้อผิดพลาดในการสร้างไฟล์ Excel');
    return false;
  }
}
