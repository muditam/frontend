import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const styles = {
  wrap: { position: "fixed", right: 16, bottom: 16, zIndex: 9999 },
  card: {
    background: "#111", color: "#fff", borderRadius: 14,
    padding: "14px 14px", boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    maxWidth: 360, marginTop: 10
  },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 6 },
  sub: { fontSize: 13, opacity: 0.9, marginBottom: 8 },
  row: { display: "flex", gap: 8, marginTop: 8 },
  btn: { flex: 1, background: "#fff", color: "#111", borderRadius: 10, padding: "8px 10px", border: "none", cursor: "pointer" },
  ghost: { flex: 1, background: "transparent", color: "#fff", border: "1px solid #444", borderRadius: 10, padding: "8px 10px", cursor: "pointer" },
};

export default function IncomingCallToast({ event, onClose }) {
  const timerRef = useRef();
  useEffect(() => { timerRef.current = setTimeout(onClose, 20000); return () => clearTimeout(timerRef.current); }, [onClose]);
  const mask = (n) => (n ? String(n).replace(/(\d{3})(\d{4})(\d{3})/, "$1-$2-$3") : "");

  const goTo = (href) => {
    try {
      // Prefer SPA navigation if available
      const navEvent = new CustomEvent("app:navigate", { detail: { href } });
      window.dispatchEvent(navEvent);
    } catch {}
    // Fallback: hard nav
    window.location.href = href;
  };

  const card = (
    <div style={styles.card}>
      <div style={styles.title}>
        Incoming Call {event.known ? "— Existing Customer" : "— New Customer"}
      </div>
      <div style={styles.sub}>📞 {mask(event.ani)} • DID: {event.did}</div>
      {event.known && event.lead && (
        <div style={styles.sub}>
          👤 {event.lead.name || "—"}
          {event.lead.agentAssigned ? ` • ${event.lead.agentAssigned}` : ""}
          {event.lead.lastOrderDate ? ` • Last: ${event.lead.lastOrderDate}` : ""}
        </div>
      )}
      <div style={styles.row}>
        {event.known && event.lead?._id ? (
          <button style={styles.btn} onClick={() => { onClose(); goTo(`/lead/${event.lead._id}`); }}>
            Open Lead
          </button>
        ) : (
          <button style={styles.btn} onClick={() => { onClose(); goTo(`/leadmanagement?phone=${event.ani}`); }}>
            Create Lead
          </button>
        )}
        <button style={styles.ghost} onClick={onClose}>Dismiss</button>
      </div>
    </div>
  );

  const container = document.getElementById("incoming-call-toasts");
  return container ? createPortal(<div style={styles.wrap}>{card}</div>, container) : null;
}
