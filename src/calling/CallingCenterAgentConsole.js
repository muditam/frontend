import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "./CallingCenter.css";
import { ZOOM_DIAL_EVENT } from "./dialer";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");

const api = axios.create({ baseURL: API_BASE, withCredentials: true });

function getSessionUserHeader() {
  try {
    return sessionStorage.getItem("user") || "";
  } catch (_) {
    return "";
  }
}

api.interceptors.request.use((config) => {
  const header = getSessionUserHeader();
  if (header) {
    config.headers = config.headers || {};
    config.headers["x-session-user"] = header;
  }
  return config;
});

export default function CallingCenterAgentConsole() {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("Connecting softphone...");
  const [connected, setConnected] = useState(false);
  const [calls, setCalls] = useState([]);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const pendingDialRef = useRef("");

  const getPhoneLabel = (row) =>
    row?.displayPhone ||
    row?.phoneNumber ||
    row?.callerNumber ||
    row?.calleeNumber ||
    "-";

  const fetchCalls = async () => {
    const { data } = await api.get("/api/zoom/calls", { params: { page: 1, limit: 20 } });
    const nextRows = data?.rows || [];
    setCalls(nextRows);
    setSelected((prev) => {
      if (!prev?.callId) return nextRows[0] || null;
      return nextRows.find((row) => row.callId === prev.callId) || nextRows[0] || null;
    });
  };

  useEffect(() => {
    fetchCalls().catch(() => {});
  }, []);

  const triggerDial = useCallback((n = phone) => {
    const clean = String(n || "").trim();
    if (!clean) return;
    const iframe = document.getElementById("zoom-softphone-frame");
    iframe?.contentWindow?.postMessage({ type: "zp-make-call", phoneNumber: clean }, "https://applications.zoom.us");
    setStatus(`Dial request sent for ${clean}`);
  }, [phone]);

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== "https://applications.zoom.us") return;
      const { type, data } = event.data || {};
      if (type === "zp-softphone-ready") {
        setConnected(true);
        setStatus("Softphone ready");
      }
      if (type === "zp-call-state-change") {
        setStatus(`Call state: ${data?.state || "updated"}`);
        fetchCalls().catch(() => {});
      }
    };
    const onDialRequest = (e) => {
      const p = e.detail?.phoneNumber;
      if (p) {
        setPhone(p);
        triggerDial(p);
      }
    };
    window.addEventListener("message", onMessage);
    window.addEventListener(ZOOM_DIAL_EVENT, onDialRequest);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener(ZOOM_DIAL_EVENT, onDialRequest);
    };
  }, [triggerDial]);

  useEffect(() => {
    const dial = new URLSearchParams(window.location.search).get("dial") || "";
    if (!dial) return;
    pendingDialRef.current = dial;
    setPhone(dial);
    setStatus(`Preparing Zoom call for ${dial}`);
  }, []);

  const handleSoftphoneLoad = useCallback(() => {
    const queuedDial = pendingDialRef.current;
    if (!queuedDial) return;
    pendingDialRef.current = "";
    setTimeout(() => triggerDial(queuedDial), 700);
  }, [triggerDial]);

  const saveNote = async () => {
    if (!selected) return;
    await api.put(`/api/zoom/calls/${encodeURIComponent(selected.callId)}/notes`, { notes: note });
    setStatus("Note saved");
    fetchCalls();
  };

  const summary = useMemo(() => {
    const total = calls.length;
    const answered = calls.filter((c) => Number(c.duration || 0) > 0).length;
    const missed = total - answered;
    return { total, answered, missed };
  }, [calls]);

  return (
    <div className="calling-center-page">
      <div className="cc-title">Calling Center</div>
      <div className="cc-subtitle">Fast dialing, live call state, and structured notes for high-quality follow-ups.</div>
      <div className="cc-grid">
        <div className="cc-card">
          <div className="cc-head">
            <div>
              <strong>Calling Center · Agent Console</strong>
              <div className="cc-status-line">{status}</div>
            </div>
            <span className="cc-pill">{connected ? "Ready" : "Booting"}</span>
          </div>
          <div className="cc-body">
            <div className="cc-actions" style={{ marginBottom: 12 }}>
              <input className="cc-search" style={{ maxWidth: 260 }} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter number" />
              <button className="cc-btn cc-btn-primary" onClick={() => triggerDial()}>Dial</button>
              <button className="cc-btn" onClick={() => fetchCalls()}>Refresh Calls</button>
            </div>
            <div className="cc-iframe-wrap">
              <iframe
                id="zoom-softphone-frame"
                className="cc-iframe"
                title="Zoom Phone"
                src="https://applications.zoom.us/integration/phone/embeddablephone/home"
                onLoad={handleSoftphoneLoad}
                allow="microphone; speaker"
              />
            </div>
          </div>
        </div>

        <div className="cc-card">
          <div className="cc-head"><strong>Live Call Panel</strong></div>
          <div className="cc-body">
            <div className="cc-kpi" style={{ marginBottom: 14 }}>
              <div className="cc-kpi-card"><div>Total</div><strong>{summary.total}</strong></div>
              <div className="cc-kpi-card"><div>Answered</div><strong>{summary.answered}</strong></div>
              <div className="cc-kpi-card"><div>Missed</div><strong>{summary.missed}</strong></div>
              <div className="cc-kpi-card"><div>Connected</div><strong>{connected ? "Yes" : "No"}</strong></div>
            </div>

            <div style={{ maxHeight: 290, overflow: "auto", border: "1px solid #d9e2ec", borderRadius: 10 }}>
              <table className="cc-table">
                <thead><tr><th>Phone</th><th>Direction</th><th>Duration</th></tr></thead>
                <tbody>
                  {calls.map((c) => (
                    <tr key={c.callId} onClick={() => { setSelected(c); setNote(c.notes || ""); }} style={{ cursor: "pointer", background: selected?.callId === c.callId ? "#f2fbfa" : "#fff" }}>
                      <td>{getPhoneLabel(c)}</td><td>{c.direction || "-"}</td><td>{c.duration || 0}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Call Notes</div>
              <textarea className="cc-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Write call outcomes, objections, and follow-up context..." />
              <div className="cc-actions" style={{ marginTop: 10 }}>
                <button className="cc-btn cc-btn-primary" onClick={saveNote} disabled={!selected}>Save Note</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
