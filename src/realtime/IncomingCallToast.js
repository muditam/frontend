// src/realtime/IncomingCallToast.js
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const injectOnce = (() => {
  let done = false;
  return () => {
    if (done) return;
    done = true;
    const css = `
      @keyframes callShake {
        0%   { transform: translate3d(0,0,0) rotate(0deg); }
        15%  { transform: translate3d(-3px, 0, 0) rotate(-0.6deg); }
        30%  { transform: translate3d(3px, 0, 0) rotate(0.6deg); }
        45%  { transform: translate3d(-3px, 0, 0) rotate(-0.6deg); }
        60%  { transform: translate3d(3px, 0, 0) rotate(0.6deg); }
        75%  { transform: translate3d(-2px, 0, 0) rotate(-0.4deg); }
        100% { transform: translate3d(0,0,0) rotate(0deg); }
      }
      @keyframes pulseRing {
        0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.45); }
        70% { box-shadow: 0 0 0 16px rgba(16,185,129,0); }
        100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
      }
      .incoming-overlay {
        position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
        z-index: 9999; pointer-events: none; /* so the page is still clickable outside the card */
      }
      .incoming-card {
        pointer-events: auto;
        width: min(92vw, 460px);
        border-radius: 16px;
        background: radial-gradient(120% 120% at 10% -10%, #1f2937 0%, #0b0b0b 60%);
        color: #fff;
        padding: 16px 18px;
        box-shadow:
          0 18px 45px rgba(0,0,0,.45),
          inset 0 1px 0 rgba(255,255,255,.04);
        border: 1px solid rgba(255,255,255,.08);
        animation: callShake .9s ease-in-out infinite;
      }
      .incoming-header {
        display:flex; align-items:center; gap:10px; margin-bottom:8px;
      }
      .incoming-avatar {
        width: 46px; height: 46px; border-radius: 50%; display:grid; place-items:center;
        background:#10b981; color:#0b0b0b; font-weight:800; font-size:18px;
        animation: pulseRing 1.6s ease-out infinite;
      }
      .incoming-title {
        font-size: 17px; font-weight: 800; line-height: 1.1;
      }
      .incoming-badge {
        display:inline-block; margin-top:4px; font-size:12px;
        padding:3px 8px; border-radius:999px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.12);
      }
      .incoming-sub { font-size: 13.5px; opacity:.92; margin: 10px 0 6px; }
      .incoming-row { display:flex; gap:10px; margin-top: 12px; }
      .incoming-btn {
        flex:1; border:none; cursor:pointer; padding:10px 12px;
        border-radius: 12px; font-weight: 700; font-size: 14px;
      }
      .incoming-primary {
        background:#fff; color:#0b0b0b;
      }
      .incoming-primary:hover { filter: brightness(.96); }
      .incoming-ghost {
        background:transparent; color:#fff; border:1px solid rgba(255,255,255,.18);
      }
      .incoming-ghost:hover { background: rgba(255,255,255,.06); }
    `;
    const tag = document.createElement("style");
    tag.id = "incoming-call-toast-styles";
    tag.appendChild(document.createTextNode(css));
    document.head.appendChild(tag);
  };
})();

const styles = {
  // overlay div is handled via CSS class so we can center it
};

export default function IncomingCallToast({ event, onClose }) {
  injectOnce();

  // auto-dismiss after 20s (still keeps shaking until then)
  const timerRef = useRef();
  useEffect(() => {
    timerRef.current = setTimeout(onClose, 20000);
    return () => clearTimeout(timerRef.current);
  }, [onClose]);

  const mask = (n) =>
    n ? String(n).replace(/(\d{3})(\d{4})(\d{3})/, "$1-$2-$3") : "";

  const goTo = (href) => {
    try {
      const navEvent = new CustomEvent("app:navigate", { detail: { href } });
      window.dispatchEvent(navEvent);
    } catch {}
    window.location.href = href;
  };

  const customerName =
    (event.known && event.lead?.name) ? event.lead.name : "New Customer";

  const initials = (str) =>
    String(str || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(s => s[0]?.toUpperCase() || "")
      .join("") || "CU";

  const card = (
    <div className="incoming-card">
      <div className="incoming-header">
        <div className="incoming-avatar">{initials(customerName)}</div>
        <div>
          <div className="incoming-title">Incoming Call — {customerName}</div>
          <div className="incoming-badge">
            {event.known ? "Existing Customer" : "New Customer"}
          </div>
        </div>
      </div>

      {/* DID removed as requested */}
      <div className="incoming-sub">📞 {mask(event.ani)}</div>

      {event.known && event.lead && (
        <div className="incoming-sub">
          👤 {event.lead.agentAssigned ? `${event.lead.agentAssigned} • ` : ""}
          {event.lead.lastOrderDate ? `Last: ${event.lead.lastOrderDate}` : ""}
        </div>
      )}

      <div className="incoming-row">
        {event.known && event.lead?._id ? (
          <button
            className="incoming-btn incoming-primary"
            onClick={() => {
              onClose();
              goTo(`/lead/${event.lead._id}`);
            }}
          >
            Open Lead
          </button>
        ) : (
          <button
            className="incoming-btn incoming-primary"
            onClick={() => {
              onClose();
              goTo(`/leadmanagement?phone=${event.ani}`);
            }}
          >
            Create Lead
          </button>
        )}
        <button className="incoming-btn incoming-ghost" onClick={onClose}>
          Dismiss
        </button>
      </div>
    </div>
  );

  const container = document.getElementById("incoming-call-toasts");
  // Centered overlay container
  return container
    ? createPortal(
        <div className="incoming-overlay">{card}</div>,
        container
      )
    : null;
}
