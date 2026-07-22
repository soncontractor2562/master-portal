import React, { useRef } from 'react';

export default function StoreDragDropView() {
  const iframeRef = useRef(null);

  return (
    <div className="module-iframe-wrap">
      <iframe
        ref={iframeRef}
        src="/apps/store-dragdrop/index.html"
        title="Store Drag & Drop System"
        className=""
        scrolling="yes"
      />
    </div>
  );
}
