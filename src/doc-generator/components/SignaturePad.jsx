import React, { useRef, useState } from 'react';

export default function SignaturePad({ onSave, onCancel, currentSignature }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    if (e.cancelable) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    if (isDrawing) {
      if (e && e.cancelable) e.preventDefault();
      setIsDrawing(false);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Check if canvas is empty by checking pixel data
    const ctx = canvas.getContext('2d');
    const pixelBuffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
    const hasPixels = pixelBuffer.some(color => color !== 0);
    
    if (hasPixels) {
      onSave(canvas.toDataURL('image/png'));
    } else {
      onSave(null); // Empty signature
    }
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onSave(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ padding: '14px 18px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', maxWidth: '560px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>เซ็นชื่อด้านล่าง หรืออัปโหลดรูปภาพ</div>
        <label className="btn ghost" style={{ padding: '4px 10px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          📷 อัปโหลดรูปลายเซ็น
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
        </label>
      </div>

      <div style={{ border: '1.5px dashed #94a3b8', borderRadius: '6px', background: '#fff', touchAction: 'none', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          width={600}
          height={240}
          style={{ width: '100%', height: '140px', display: 'block', cursor: 'crosshair' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', alignItems: 'center' }}>
        <button className="btn ghost" onClick={handleClear} style={{ color: '#ef4444', borderColor: '#fca5a5' }}>ลบ / วาดใหม่</button>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onCancel && <button className="btn ghost" onClick={onCancel}>ยกเลิก</button>}
          <button className="btn primary" onClick={handleSave}>บันทึกลายเซ็น</button>
        </div>
      </div>
      
      {currentSignature && (
        <div style={{ marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>ลายเซ็นปัจจุบัน:</div>
          <img src={currentSignature} alt="Signature" style={{ maxHeight: '60px', border: '1px solid #cbd5e1', background: '#fff' }} />
          <button className="icon-btn danger" style={{ marginLeft: '10px' }} onClick={() => onSave(null)}>X ลบลายเซ็น</button>
        </div>
      )}
    </div>
  );
}
