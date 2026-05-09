import React, { useEffect, useState } from "react";
import axios from "axios";
import "./CallingCenter.css";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
const api = axios.create({ baseURL: API_BASE, withCredentials: true });

export default function CallingCenterManagerDashboard() {
  const [data, setData] = useState({ total: 0, answered: 0, missed: 0, avgDuration: 0, perAgent: [] });

  const load = async () => {
    const { data } = await api.get("/api/zoom/calls/manager/overview");
    setData(data || {});
  };

  useEffect(() => { load().catch(() => {}); }, []);

  return (
    <div className="calling-center-page">
      <div className="cc-card">
        <div className="cc-head"><strong>Calling Center · Manager Dashboard</strong><button className="cc-btn" onClick={load}>Refresh</button></div>
        <div className="cc-body">
          <div className="cc-kpi" style={{ marginBottom: 14 }}>
            <div className="cc-kpi-card"><div>Total Calls</div><strong>{data.total}</strong></div>
            <div className="cc-kpi-card"><div>Answered</div><strong>{data.answered}</strong></div>
            <div className="cc-kpi-card"><div>Missed</div><strong>{data.missed}</strong></div>
            <div className="cc-kpi-card"><div>Avg Duration</div><strong>{data.avgDuration}s</strong></div>
          </div>
          <table className="cc-table">
            <thead><tr><th>Agent</th><th>Calls</th><th>Answered</th><th>Missed</th><th>Duration</th></tr></thead>
            <tbody>
              {(data.perAgent || []).map((a) => (
                <tr key={a.agentId}><td>{a.agentId}</td><td>{a.calls}</td><td>{a.answered}</td><td>{a.missed}</td><td>{a.duration}s</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
