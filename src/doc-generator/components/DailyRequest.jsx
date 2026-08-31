import React from 'react';

export function createDefaultRequestTasks() {
  return [{ item: '', supervisor: '', note: '' }];
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
            {([...(data.tasks || []), ...new Array(8).fill({ item: '', supervisor: '', note: '' })].slice(0, Math.max(8, (data.tasks || []).length))).map((t, i) => (
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
        {data.hasApprover !== false ? (
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', marginTop: '40px', gap: '20px' }}>
            
            {/* Requester */}
            <div className="signer-box" style={{ width: '260px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 20px', border: '1px solid transparent' }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px', textAlign: 'center' }}>ผู้ขออนุมัติ</div>
              
              <div style={{ marginTop: '16px', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ height: '52px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', width: '100%', marginBottom: '4px' }}>
                  {data.requesterSignature ? (
                    <img src={data.requesterSignature} alt="signature" style={{ maxHeight: '48px', maxWidth: '160px', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ height: '24px' }}></div>
                  )}
                </div>
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

              <div style={{ fontSize: '11.5px', marginBottom: '16px', lineHeight: '2.2', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                 หมายเหตุ: ....................................................................
                 <br/>
                 ...........................................................................................
              </div>

              <div className="signer-box" style={{ width: '100%', minWidth: 'auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ height: '52px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', width: '100%', marginBottom: '4px' }}>
                  {data.approverSignature ? (
                    <img src={data.approverSignature} alt="approver signature" style={{ maxHeight: '48px', maxWidth: '160px', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ height: '24px' }}></div>
                  )}
                </div>
                <div className="signer-line" style={{ width: '160px', margin: '0 auto 8px', borderBottom: '1px solid currentColor' }}></div>
                <div className="signer-name" style={{ fontWeight: 'bold', marginBottom: '4px' }}>({data.approverName || '...................................................'})</div>
                <div className="signer-role" style={{ marginBottom: '4px' }}>ตำแหน่ง: {data.approverRole || 'ที่ปรึกษาโครงการฯ / ผู้จัดการโครงการ'}</div>
                <div className="signer-date">วันที่: {data.approverDate ? formatThaiDate(data.approverDate) : '......../......../........'}</div>
              </div>
            </div>

          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', marginTop: '40px', paddingRight: '40px' }}>
            {/* Requester Only */}
            <div className="signer-box" style={{ width: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 20px', border: '1px solid transparent' }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px', textAlign: 'center' }}>ผู้ขออนุมัติ</div>
              
              <div style={{ marginTop: '16px', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ height: '52px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', width: '100%', marginBottom: '4px' }}>
                  {data.requesterSignature ? (
                    <img src={data.requesterSignature} alt="signature" style={{ maxHeight: '48px', maxWidth: '160px', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ height: '24px' }}></div>
                  )}
                </div>
                <div className="signer-line" style={{ width: '160px', margin: '0 auto 8px', borderBottom: '1px solid currentColor' }}></div>
                <div className="signer-name" style={{ fontWeight: 'bold', marginBottom: '4px' }}>({data.requesterName || '...................................................'})</div>
                <div className="signer-role" style={{ marginBottom: '4px' }}>ตำแหน่ง: {data.requesterRole || 'ผู้จัดการโครงการ'}</div>
                <div className="signer-date">วันที่: {formatThaiDate(data.requesterDate || data.date)}</div>
              </div>
            </div>
          </div>
        )}

      </div>
  );
}
