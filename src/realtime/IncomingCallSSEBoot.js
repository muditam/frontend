import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import IncomingCallToast from "./IncomingCallToast";

// Simple store inside boot
function Boot() {
  const [toasts, setToasts] = useState([]);
  const esRef = useRef(null);

  useEffect(() => {
    // get agent DID/callerId from session (adjust keys if needed)
    let user = {};
    try { user = JSON.parse(sessionStorage.getItem("user") || "{}"); } catch {}
    const did = user?.callerId || user?.agentNumber || "";

    if (!did) {
      console.warn("[SSE] No DID found in sessionStorage.user (callerId/agentNumber).");
      return;
    }

    const es = new EventSource(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/sse?did=${encodeURIComponent(did)}`, { withCredentials: true });
    esRef.current = es; 

    es.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data?.type === "incoming_call") {
          setToasts((cur) => [...cur, data]);
        }
      } catch {}
    };
    es.onerror = () => { /* allow browser auto-reconnect */ };

    return () => { try { es.close(); } catch {} };
  }, []);

  return (
    <>
      {toasts.map((t, i) => (
        <IncomingCallToast key={`${t.uuid || t.callId || i}-${i}`} event={t}
          onClose={() => setToasts((cur) => cur.filter((_, idx) => idx !== i))} />
      ))}
    </>
  );
}

// Mount point creator + SPA navigation bridge
(function boot() {
  // Add a container element for portals
  let host = document.getElementById("incoming-call-toasts");
  if (!host) {
    host = document.createElement("div");
    host.id = "incoming-call-toasts";
    document.body.appendChild(host);
  }
  const root = createRoot(host);
  root.render(<Boot />);

  // Optional: listen for custom SPA navigate events from toast
  window.addEventListener("app:navigate", (e) => {
    const href = e?.detail?.href;
    if (!href) return;
    // If your app exposes a global navigate, hook here.
    // Otherwise, the toast falls back to window.location.href.
  });
})();
