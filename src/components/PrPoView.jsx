import React, { useRef } from 'react';

export default function PrPoView() {
  const iframeRef = useRef(null);

  return (
    <div className="module-iframe-wrap">
      <iframe
        ref={iframeRef}
        src="/apps/pr-po/index.html"
        title="PR / PO System"
        className=""
        scrolling="yes"
      />
    </div>
  );
}
