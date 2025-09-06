import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import IncomingCallToast from "./IncomingCallToast";

function didKey(v) {
  // must match the server’s normalization
  return String(v || "").replace(/\D/g, "").slice(-10);
}

// Simple store inside boot
function Boot() {
  const [toasts, setToasts] = useState([]);
  const esRef = useRef(null);
  const recentIdsRef = useRef(new Map()); // uuid -> ts (for dedupe)

  useEffect(() => {
    function pruneOld() {
      const now = Date.now();
      for (const [k, ts] of recentIdsRef.current) {
        if (now - ts > 60_000) recentIdsRef.current.delete(k); // keep 1 minute
      }
    }

    function start() {
      let user = {};
      try { user = JSON.parse(sessionStorage.getItem("user") || "{}"); } catch {}
      const raw = user?.callerId || user?.agentNumber || "";
      const key = didKey(raw);

      if (!key) {
        console.warn("[SSE] No DID found in sessionStorage.user (callerId/agentNumber).");
        return;
      }

      // Close any previous connection before opening a new one
      try { esRef.current?.close(); } catch {}

      const url = `https://muditamleads-14f32a10d7f7.herokuapp.com/api/sse?did=${encodeURIComponent(key)}`;
      const es = new EventSource(url); // no cookies needed
      esRef.current = es;

      es.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);

          // ignore non-call messages
          if (!data || data.type !== "incoming_call") return;

          // dedupe using uuid or callId
          const id = data.uuid || data.callId || `${data.did}:${data.ani}:${data.start_stamp}`;
          pruneOld();
          if (recentIdsRef.current.has(id)) return;
          recentIdsRef.current.set(id, Date.now());

          setToasts((cur) => [...cur, data]);
        } catch {}
      };

      es.onerror = () => {
        // let browser auto-reconnect; if needed you can log here
      };
    }

    // initial attempt
    start();

    // re-try after login (when sessionStorage.user is set)
    const onSet = () => start();
    window.addEventListener("session:user:set", onSet);

    return () => {
      window.removeEventListener("session:user:set", onSet);
      try { esRef.current?.close(); } catch {}
    };
  }, []);

  return (
    <>
      {toasts.map((t, i) => (
        <IncomingCallToast
          key={`${t.uuid || t.callId || `${t.did}-${t.ani}-${i}`}`}
          event={t}
          onClose={() => setToasts((cur) => cur.filter((_, idx) => idx !== i))}
        />
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
  });
})();
