import React from 'react';

export function createDefaultPrItems() {
  return [
    { item: '', qty: '', unit: '', boqRef: '', usageArea: '' }
  ];
}

export function PurchaseRequisitionView({ data, company, themeClass, formatThaiDate }) {
  const companyName = company?.name || 'บริษัท ซัน คอนแทรคเตอร์ จำกัด';
  const companyAddress = company?.address || '55/96 หมู่6 แขวงทุ่งสองห้อง เขตหลักสี่ กรุงเทพมหานคร 10210';
  const items = data.items || [];
  const totalRows = Math.max(16, items.length);
  const rows = [...items, ...new Array(Math.max(0, totalRows - items.length)).fill({ item: '', qty: '', unit: '', boqRef: '', usageArea: '' })];

  return (
    <div className={`a4-page ${themeClass}`} style={{ display: 'flex', flexDirection: 'column', height: '1123px', boxSizing: 'border-box', padding: '32px 36px' }}>
      
      {/* 1. Header (Matching PDF Layout) */}
      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '2px' }}>
          {company?.logo && <img src={company.logo} alt="Company Logo" crossOrigin="anonymous" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />}
          <span style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.5px' }}>{companyName}</span>
        </div>
        <div style={{ fontSize: '11px', color: themeClass.includes('classic') ? '#222' : '#475569' }}>
          {companyAddress}
        </div>
      </div>

      {/* 2. Title & Metadata Grid */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '6px' }}>
            PR. / ใบขออนุมัติสั่งซื้อ
          </div>
          <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 'bold' }}>โครงการ :</span>
            <span style={{ borderBottom: '1px dotted #64748b', paddingBottom: '1px', minWidth: '180px', display: 'inline-block' }}>
              {data.project || '-'}
            </span>
          </div>
        </div>

        <div style={{ width: '220px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold' }}>เลขที่ :</span>
            <span style={{ borderBottom: '1px dotted #64748b', width: '130px', textAlign: 'center', display: 'inline-block' }}>
              {data.prNo || '-'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold' }}>วัน/เดือน/ปี :</span>
            <span style={{ borderBottom: '1px dotted #64748b', width: '130px', textAlign: 'center', display: 'inline-block' }}>
              {data.date ? formatThaiDate(data.date) : '-'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>วันที่ต้องการใช้ :</span>
            <span style={{ borderBottom: '1px dotted #64748b', width: '130px', textAlign: 'center', display: 'inline-block' }}>
              {data.requiredDate ? formatThaiDate(data.requiredDate) : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Items Table (6 Columns, Fixed 16 Rows) */}
      <table className="report-tasks-table pr-items-table" style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: themeClass.includes('classic') ? '#f1f5f9' : '#f8fafc', height: '26px' }}>
            <th style={{ width: '38px', textAlign: 'center', border: '1px solid #000', padding: '2px 4px' }}>ลำดับ</th>
            <th style={{ textAlign: 'center', border: '1px solid #000', padding: '2px 6px' }}>รายการ</th>
            <th style={{ width: '48px', textAlign: 'center', border: '1px solid #000', padding: '2px 4px' }}>จำนวน</th>
            <th style={{ width: '48px', textAlign: 'center', border: '1px solid #000', padding: '2px 4px' }}>หน่วย</th>
            <th style={{ width: '150px', textAlign: 'center', border: '1px solid #000', padding: '2px 4px', lineHeight: '1.2' }}>วัสดุในหมวดงาน /<br />ข้อที่ ( BOQ )</th>
            <th style={{ width: '150px', textAlign: 'center', border: '1px solid #000', padding: '2px 4px', lineHeight: '1.2' }}>นำไปใช้ในส่วนงาน /<br />บริเวณ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ height: '28px' }}>
              <td style={{ textAlign: 'center', border: '1px solid #000', padding: '1px 4px' }}>
                {r.item ? i + 1 : '\u00A0'}
              </td>
              <td style={{ border: '1px solid #000', padding: '1px 6px', textAlign: 'left' }}>
                {r.item || '\u00A0'}
              </td>
              <td style={{ textAlign: 'center', border: '1px solid #000', padding: '1px 4px' }}>
                {r.qty || '\u00A0'}
              </td>
              <td style={{ textAlign: 'center', border: '1px solid #000', padding: '1px 4px' }}>
                {r.unit || '\u00A0'}
              </td>
              <td style={{ border: '1px solid #000', padding: '1px 6px', textAlign: 'left' }}>
                {r.boqRef || '\u00A0'}
              </td>
              <td style={{ border: '1px solid #000', padding: '1px 6px', textAlign: 'left' }}>
                {r.usageArea || '\u00A0'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 4. Footer Signatures (Matching PDF Layout) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 'auto', paddingTop: '16px' }}>
        {/* Requester (Left) */}
        <div style={{ width: '320px', textAlign: 'left', fontSize: '11px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
            <span style={{ fontWeight: 'bold', width: '110px' }}>ผู้ขออนุมัติ / สั่งซื้อ :</span>
            <span style={{ borderBottom: '1px solid #000', flex: 1, height: '18px', textAlign: 'center' }}>
              {data.requesterName || ''}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 'bold', width: '110px' }}>วัน/เดือน/ปี :</span>
            <span style={{ borderBottom: '1px solid #000', flex: 1, height: '18px', textAlign: 'center' }}>
              {data.requesterDate ? formatThaiDate(data.requesterDate) : (data.date ? formatThaiDate(data.date) : '')}
            </span>
          </div>
        </div>

        {/* Approver (Right) */}
        <div style={{ width: '340px', textAlign: 'left', fontSize: '11px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
            <span style={{ fontWeight: 'bold', width: '150px' }}>ผู้อนุมัติ / ผู้จัดการโครงการ :</span>
            <span style={{ borderBottom: '1px solid #000', flex: 1, height: '18px', textAlign: 'center' }}>
              {data.approverName || ''}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 'bold', width: '150px' }}>วัน/เดือน/ปี :</span>
            <span style={{ borderBottom: '1px solid #000', flex: 1, height: '18px', textAlign: 'center' }}>
              {data.approverDate ? formatThaiDate(data.approverDate) : ''}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
