import React, { useEffect, useState } from "react";
import axios from "axios";
import "./CallingCenter.css";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
const api = axios.create({ baseURL: API_BASE, withCredentials: true });

export default function CallingCenterQAReview() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);

  const search = async () => {
    const { data } = await api.get("/api/zoom/calls", { params: { q, page: 1, limit: 50 } });
    setRows(data?.rows || []);
  };

  useEffect(() => { search().catch(() => {}); }, []);

  return (
    <div className="calling-center-page">
      <div className="cc-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="cc-card">
          <div className="cc-head"><strong>Calling Center · QA Review</strong></div>
          <div className="cc-body">
            <div className="cc-actions" style={{ marginBottom: 10 }}>
              <input className="cc-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search transcript or phone" />
              <button className="cc-btn cc-btn-primary" onClick={search}>Search</button>
            </div>
            <table className="cc-table">
              <thead><tr><th>Phone</th><th>Rec</th><th>Transcript</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.callId} onClick={() => setSelected(r)} style={{ cursor: "pointer" }}>
                    <td>{r.phoneNumber || "-"}</td><td>{r.recordingStatus}</td><td>{r.transcriptStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="cc-card">
          <div className="cc-head"><strong>Review Detail</strong></div>
          <div className="cc-body">
            {!selected ? <div style={{ color: "#5f6b7a" }}>Select a call to review recording/transcript.</div> : (
              <>
                <div style={{ marginBottom: 10 }}><strong>Phone:</strong> {selected.phoneNumber || "-"}</div>
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
