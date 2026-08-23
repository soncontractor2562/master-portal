import React from 'react';

export function createDefaultRequestTasks() {
  return new Array(8).fill(null).map(() => ({ item: '', supervisor: '', note: '' }));
}

export function DailyRequestView({ data, company, themeClass, formatThaiDate }) {
  return (
    <div className={`a4-page ${themeClass}`}>
        
        <div className="report-header" style={{ marginBottom: '16px' }}>
          <div className="header-top">
            <div className="logo-company">
              {company.logo && <img src={company.logo} alt="Company Logo" />}
              <div className="company-name">{company.name || 'บริษัท ซัน คอนแทรคเตอร์ จำกัด'}</div>
            </div>
            <div className="doc-header-title">
              <div className="doc-main-title">DAILY REQUEST</div>
              <div className="doc-sub-title">ใบขออนุมัติปฏิบัติงานประจำวัน</div>
            </div>
          </div>
          <div className="header-divider"></div>
          <div className="header-meta-grid">
            <div className="meta-left">
              <div className="meta-item"><b>โครงการ:</b> {data.project || '-'}</div>
              <div className="meta-item"><b>เจ้าของโครงการ:</b> {data.owner || '-'}</div>
            </div>
            <div className="meta-right">
              <div className="meta-right-inline">
                <div className="meta-item"><b>วันที่:</b> {formatThaiDate(data.date)}</div>
                <div className="meta-item"><b>ประเภทวัน:</b> {data.workType || 'ปกติ'}</div>
              </div>
              <div className="meta-item" style={{ marginTop: '2px' }}><b>เวลาทำงาน:</b> {data.time || '8.00 - 17.00 น.'}</div>
            </div>
          </div>
        </div>

        <div className="section-title-wrap">
          <div className="section-title-text">รายการขอปฏิบัติงานประจำวัน (Daily Request Log)</div>
        </div>
        <table className="report-tasks-table" style={{ fontSize: '12.5px', marginBottom: '24px' }}>
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>ลำดับ</th>
              <th>รายละเอียดงาน</th>
              <th style={{ width: '160px' }}>ผู้ควบคุมงาน</th>
              <th style={{ width: '200px' }}>หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {data.tasks.map((t, i) => (
              <tr key={i}>
                <td style={{ textAlign: 'center', height: '36px' }}>{i + 1}</td>
                <td style={{ padding: '4px 8px' }}>{t.item}</td>
                <td style={{ padding: '4px 8px' }}>{t.supervisor}</td>
                <td style={{ padding: '4px 8px' }}>{t.note}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signatures Redesign */}
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'stretch', marginTop: '40px', gap: '20px' }}>
          
          {/* Requester */}
          <div className="signer-box" style={{ position: 'relative', width: '220px', display: 'flex', flexDirection: 'column', paddingTop: '20px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '13px', textAlign: 'center' }}>ผู้ขออนุมัติ</div>
            
            <div style={{ marginTop: 'auto', width: '100%', textAlign: 'center', position: 'relative', paddingTop: '60px' }}>
              {data.requesterSignature && (
                <img src={data.requesterSignature} alt="signature" style={{ position: 'absolute', bottom: '65px', left: '50%', transform: 'translateX(-50%)', maxHeight: '55px', maxWidth: '100%', objectFit: 'contain' }} />
              )}
              <div className="signer-line" style={{ width: '160px', margin: '0 auto 8px', borderBottom: '1px solid currentColor' }}></div>
              <div className="signer-name" style={{ fontWeight: 'bold', marginBottom: '4px' }}>({data.requesterName || '...................................................'})</div>
              <div className="signer-role" style={{ marginBottom: '4px' }}>ตำแหน่ง: {data.requesterRole || 'ผู้จัดการโครงการ'}</div>
              <div className="signer-date">วันที่: {formatThaiDate(data.requesterDate || data.date)}</div>
            </div>
          </div>

          {/* Approver */}
          <div className="approver-box" style={{ width: '320px', padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '16px', fontSize: '13px' }}>ผู้อนุมัติ (ผลพิจารณา)</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '14px', height: '14px', border: '1px solid currentColor' }}></div> อนุมัติ
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '14px', height: '14px', border: '1px solid currentColor' }}></div> ไม่อนุมัติ
                </div>
            </div>

            <div style={{ fontSize: '11.5px', marginBottom: '32px', lineHeight: '2.2', overflow: 'hidden', whiteSpace: 'nowrap' }}>
               หมายเหตุ: ....................................................................
               <br/>
               ...........................................................................................
            </div>

            <div className="signer-box" style={{ position: 'relative', width: '100%', minWidth: 'auto', textAlign: 'center', marginTop: 'auto' }}>
              <div className="signer-line" style={{ width: '160px', margin: '0 auto 12px', borderBottom: '1px solid currentColor' }}></div>
              <div className="signer-name" style={{ fontWeight: 'bold', marginBottom: '4px' }}>({data.approverName || '...................................................'})</div>
              <div className="signer-role" style={{ marginBottom: '4px' }}>ตำแหน่ง: {data.approverRole || 'ที่ปรึกษาโครงการฯ'}</div>
              <div className="signer-date">วันที่: ......../......../........</div>
            </div>
          </div>

        </div>

      </div>
  );
}
