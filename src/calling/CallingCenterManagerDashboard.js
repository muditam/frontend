import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./CallingCenter.css";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
const api = axios.create({ baseURL: API_BASE, withCredentials: true });
const MANAGER_STREAM_EVENT = "manager_overview_update";
const PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "custom", label: "Custom" },
];

function getSessionUserHeader() {
  try {
    const raw = sessionStorage.getItem("user");
    return raw || "";
  } catch (_) {
    return "";
  }
}

function joinApiBase(path) {
  return API_BASE ? `${API_BASE}${path}` : path;
}

function formatMinutesFromSeconds(value) {
  const minutes = Number(value || 0) / 60;
  if (!Number.isFinite(minutes)) return "0 min";
  return `${minutes.toFixed(1)} min`;
}

api.interceptors.request.use((config) => {
  const header = getSessionUserHeader();
  if (header) {
    config.headers = config.headers || {};
    config.headers["x-session-user"] = header;
  }
  return config;
});

export default function CallingCenterManagerDashboard() {
  const EMPTY_DATA = {
    total: 0,
    answered: 0,
    missed: 0,
    avgDuration: 0,
    incoming: 0,
    outgoing: 0,
    answeredRate: 0,
    totalDuration: 0,
    waitTime: { totalSec: 0, samples: 0, avgSec: 0 },
    voicemailStats: { yes: 0, no: 0, unknown: 0 },
    recordedStats: { yes: 0, no: 0, unknown: 0 },
    topResults: [],
    statusBreakdown: [],
    directionBreakdown: [],
    byHour: [],
    deviceBreakdown: [],
    siteBreakdown: [],
    topRepeatDestinations: [],
    topRepeatSources: [],
    perAgent: [],
  };
  const [data, setData] = useState({
    ...EMPTY_DATA,
  });
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const streamRef = useRef(null);
  const reconnectRef = useRef(null);
  const pollRef = useRef(null);
  const unmountedRef = useRef(false);
  const retryCountRef = useRef(0);

  const getRangeParams = () => {
    const params = { preset };
    if (preset === "custom" && startDate && endDate) {
      params.start = `${startDate}T00:00:00.000`;
      params.end = `${endDate}T23:59:59.999`;
    }
    return params;
  };

  const load = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError("");
      const { data } = await api.get("/api/zoom/calls/manager/overview", { params: getRangeParams() });
      setData(data || {});
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load manager dashboard data";
      setError(message);
      console.error("Calling center manager dashboard load failed:", message, err);
      throw err;
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    unmountedRef.current = false;

    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    const startPolling = () => {
      if (pollRef.current) return;
      pollRef.current = setInterval(() => {
        load({ silent: true }).catch(() => {});
      }, 15000);
    };

    const closeStream = () => {
      if (streamRef.current) {
        try {
          streamRef.current.close();
        } catch (_) {
          // noop
        }
        streamRef.current = null;
      }
    };

    const connectStream = () => {
      closeStream();
      const header = getSessionUserHeader();
      const sessionUser = header || "";
      const qp = new URLSearchParams();
      if (sessionUser) qp.set("sessionUser", sessionUser);
      const p = getRangeParams();
      Object.entries(p).forEach(([k, v]) => {
        if (v) qp.set(k, String(v));
      });
      const query = qp.toString();
      const url = joinApiBase(`/api/zoom/calls/manager/stream${query ? `?${query}` : ""}`);
      const es = new EventSource(url, { withCredentials: true });
      streamRef.current = es;

      es.onopen = () => {
        setLive(true);
        retryCountRef.current = 0;
        stopPolling();
      };

      es.addEventListener(MANAGER_STREAM_EVENT, (event) => {
        try {
          const payload = JSON.parse(event.data || "{}");
          setData(payload || {});
          setLoading(false);
        } catch (_) {
          // noop
        }
      });

      es.onerror = () => {
        setLive(false);
        closeStream();
        startPolling();
        const retryMs = Math.min(30000, 1000 * 2 ** retryCountRef.current);
        retryCountRef.current += 1;
        reconnectRef.current = setTimeout(() => {
          if (!unmountedRef.current) connectStream();
        }, retryMs);
      };
    };

    setLoading(true);
    load()
      .catch(() => {})
      .finally(() => connectStream());

    return () => {
      unmountedRef.current = true;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      stopPolling();
      closeStream();
    };
  }, [preset, startDate, endDate]);

  return (
    <div className="calling-center-page">
      <div className="cc-card">
        <div className="cc-head"><strong>Calling Center · Manager Dashboard</strong><button className="cc-btn" onClick={() => load()} disabled={loading}>Refresh{live ? " · Live" : ""}</button></div>
        <div className="cc-body">
          {error ? <div className="cc-empty" style={{ marginBottom: 12 }}>{error}</div> : null}
          <div className="cc-actions" style={{ marginBottom: 12 }}>
            <select className="cc-search" style={{ maxWidth: 190 }} value={preset} onChange={(e) => setPreset(e.target.value)}>
              {PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            {preset === "custom" && (
              <>
                <input className="cc-search" style={{ maxWidth: 170 }} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <input className="cc-search" style={{ maxWidth: 170 }} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </>
            )}
          </div>
          <div className={`cc-kpi ${loading ? "cc-loading-block" : ""}`} style={{ marginBottom: 14 }}>
            <div className="cc-kpi-card"><div>Total Calls</div><strong>{data.total}</strong></div>
            <div className="cc-kpi-card"><div>Answered</div><strong>{data.answered}</strong></div>
            <div className="cc-kpi-card"><div>Missed</div><strong>{data.missed}</strong></div>
            <div className="cc-kpi-card"><div>Avg Duration</div><strong>{data.avgDuration}s</strong></div>
            <div className="cc-kpi-card"><div>Incoming</div><strong>{data.incoming || 0}</strong></div>
            <div className="cc-kpi-card"><div>Outgoing</div><strong>{data.outgoing || 0}</strong></div>
            <div className="cc-kpi-card"><div>Answer Rate</div><strong>{Number(data.answeredRate || 0).toFixed(2)}%</strong></div>
            <div className="cc-kpi-card"><div>Total Talk Time</div><strong>{Math.round(Number(data.totalDuration || 0) / 60)}m</strong></div>
            <div className="cc-kpi-card"><div>Avg Wait Time</div><strong>{Number(data.waitTime?.avgSec || 0)}s</strong></div>
            <div className="cc-kpi-card"><div>Voicemail Y/N</div><strong>{Number(data.voicemailStats?.yes || 0)}/{Number(data.voicemailStats?.no || 0)}</strong></div>
            <div className="cc-kpi-card"><div>Recorded Y/N</div><strong>{Number(data.recordedStats?.yes || 0)}/{Number(data.recordedStats?.no || 0)}</strong></div>
          </div>
          <div className={loading ? "cc-loading-block" : ""}>
          <table className="cc-table">
            <thead><tr><th>Agent</th><th>Calls</th><th>Answered</th><th>Missed</th><th>In</th><th>Out</th><th>Avg Dur</th><th>Answer %</th><th>Duration</th></tr></thead>
            <tbody>
              {(data.perAgent || []).map((a) => (
                <tr key={a.agentId}><td>{a.agentName || a.agentId}</td><td>{a.calls}</td><td>{a.answered}</td><td>{a.missed}</td><td>{a.incoming || 0}</td><td>{a.outgoing || 0}</td><td>{a.avgDuration || 0}s</td><td>{Number(a.answerRate || 0).toFixed(2)}%</td><td>{formatMinutesFromSeconds(a.duration)}</td></tr>
              ))}
            </tbody>
          </table>
          </div>

          <div className={`cc-analytics-grid ${loading ? "cc-loading-block" : ""}`} style={{ marginTop: 14 }}>
            <div className="cc-card cc-inner-card">
              <div className="cc-head"><strong>Call Results</strong></div>
              <div className="cc-body">
                <table className="cc-table">
                  <thead><tr><th>Result</th><th>Count</th></tr></thead>
                  <tbody>{(data.topResults || []).map((r) => <tr key={r.name}><td>{r.name}</td><td>{r.count}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
            <div className="cc-card cc-inner-card">
              <div className="cc-head"><strong>Status Breakdown</strong></div>
              <div className="cc-body">
                <table className="cc-table">
                  <thead><tr><th>Status</th><th>Count</th></tr></thead>
                  <tbody>{(data.statusBreakdown || []).map((r) => <tr key={r.name}><td>{r.name}</td><td>{r.count}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
            <div className="cc-card cc-inner-card">
              <div className="cc-head"><strong>Hourly Pattern</strong></div>
              <div className="cc-body">
                <table className="cc-table">
                  <thead><tr><th>Hour</th><th>Calls</th><th>Answered</th><th>Missed</th></tr></thead>
                  <tbody>{(data.byHour || []).filter((x) => x.calls > 0).map((r) => <tr key={r.hour}><td>{String(r.hour).padStart(2, "0")}:00</td><td>{r.calls}</td><td>{r.answered}</td><td>{r.missed}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
            <div className="cc-card cc-inner-card">
              <div className="cc-head"><strong>Device & Site Usage</strong></div>
              <div className="cc-body">
                <div className="cc-mini-title">Devices</div>
                <table className="cc-table" style={{ marginBottom: 10 }}>
                  <thead><tr><th>Device</th><th>Count</th></tr></thead>
                  <tbody>{(data.deviceBreakdown || []).map((r) => <tr key={r.name}><td>{r.name}</td><td>{r.count}</td></tr>)}</tbody>
                </table>
                <div className="cc-mini-title">Sites</div>
                <table className="cc-table">
                  <thead><tr><th>Site</th><th>Count</th></tr></thead>
                  <tbody>{(data.siteBreakdown || []).map((r) => <tr key={r.name}><td>{r.name}</td><td>{r.count}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
            <div className="cc-card cc-inner-card">
              <div className="cc-head"><strong>Top Repeat Destinations</strong></div>
              <div className="cc-body">
                <table className="cc-table">
                  <thead><tr><th>Phone</th><th>Calls</th></tr></thead>
                  <tbody>{(data.topRepeatDestinations || []).map((r) => <tr key={r.phone}><td>{r.phone}</td><td>{r.count}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
            <div className="cc-card cc-inner-card">
              <div className="cc-head"><strong>Top Repeat Sources</strong></div>
              <div className="cc-body">
                <table className="cc-table">
                  <thead><tr><th>Phone</th><th>Calls</th></tr></thead>
                  <tbody>{(data.topRepeatSources || []).map((r) => <tr key={r.phone}><td>{r.phone}</td><td>{r.count}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
