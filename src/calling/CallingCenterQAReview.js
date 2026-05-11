import React, { useEffect, useState } from "react";
import axios from "axios";
import "./CallingCenter.css";

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

export default function CallingCenterQAReview() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const getPhoneLabel = (row) =>
    row?.displayPhone ||
    row?.phoneNumber ||
    row?.callerNumber ||
    row?.calleeNumber ||
    "-";

  const getCallTime = (row) => {
    const raw = row?.startTime || row?.createdAt;
    if (!raw) return "-";
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return "-";
    return dt.toLocaleString();
  };

  const search = async (nextPage = page) => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/zoom/calls", { params: { q, page: nextPage, limit } });
      const nextRows = data?.rows || [];
      setRows(nextRows);
      setTotal(Number(data?.total || 0));
      setPage(Number(data?.page || nextPage));
      setSelected((prev) => {
        if (!prev?.callId) return nextRows[0] || null;
        return nextRows.find((row) => row.callId === prev.callId) || nextRows[0] || null;
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { search(1).catch(() => {}); }, []);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const fromRow = total === 0 ? 0 : (page - 1) * limit + 1;
  const toRow = total === 0 ? 0 : Math.min(total, page * limit);

  return (
    <div className="calling-center-page">
      <div className="cc-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="cc-card">
          <div className="cc-head"><strong>Calling Center · QA Review</strong></div>
          <div className="cc-body">
            <div className="cc-actions" style={{ marginBottom: 10 }}>
              <input className="cc-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search transcript or phone" />
              <button className="cc-btn cc-btn-primary" onClick={() => search(1)} disabled={loading}>Search</button>
            </div>
            <div className={loading ? "cc-loading-block" : ""}>
            <table className="cc-table">
              <thead><tr><th>Phone</th><th>Direction</th><th>Rec</th><th>Transcript</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.callId} onClick={() => setSelected(r)} style={{ cursor: "pointer" }}>
                    <td>{getPhoneLabel(r)}</td><td>{r.direction || "-"}</td><td>{r.recordingStatus || "none"}</td><td>{r.transcriptStatus || "none"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div className="cc-pagination">
              <div className="cc-pagination-meta">
                {loading ? "Loading..." : `Showing ${fromRow}-${toRow} of ${total}`}
              </div>
              <div className="cc-actions">
                <button className="cc-btn" onClick={() => search(page - 1)} disabled={loading || page <= 1}>Prev</button>
                <span className="cc-page-indicator">Page {page} / {totalPages}</span>
                <button className="cc-btn" onClick={() => search(page + 1)} disabled={loading || page >= totalPages}>Next</button>
              </div>
            </div>
          </div>
        </div>

        <div className="cc-card">
          <div className="cc-head"><strong>Review Detail</strong></div>
          <div className="cc-body">
            {!selected ? <div style={{ color: "#5f6b7a" }}>Select a call to review recording/transcript.</div> : (
              <>
                <div style={{ marginBottom: 10 }}><strong>Phone:</strong> {getPhoneLabel(selected)}</div>
                <div style={{ marginBottom: 10 }}><strong>Caller:</strong> {selected.callerNumber || "-"}</div>
                <div style={{ marginBottom: 10 }}><strong>Callee:</strong> {selected.calleeNumber || "-"}</div>
                <div style={{ marginBottom: 10 }}><strong>Direction:</strong> {selected.direction || "-"}</div>
                <div style={{ marginBottom: 10 }}><strong>Status:</strong> {selected.status || "-"}</div>
                <div style={{ marginBottom: 10 }}><strong>Started:</strong> {getCallTime(selected)}</div>
                <div style={{ marginBottom: 10 }}><strong>Recording:</strong> {selected.recordingUrl ? <a href={selected.recordingUrl} target="_blank" rel="noreferrer">Open recording</a> : "Not available"}</div>
                <div><strong>Transcript</strong></div>
                <div style={{ whiteSpace: "pre-wrap", marginTop: 8, fontSize: 13 }}>{selected.transcriptContent || "No transcript yet."}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
