import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./RetentionDashboard.css";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "http://localhost:5001").replace(/\/+$/, "");

const TIME_RANGE_OPTIONS = [
  "Today",
  "Yesterday",
  "Last 7 days",
  "Last 30 days",
  "Week to date",
  "Month to date",
  "Year to date",
  "Last 90 days",
  "Last 365 days",
  "Last month",
  "Last 12 months",
  "Last year",
  "Quarter to date",
  "Custom range",
];

const toISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateRange = (rangeValue) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let start = new Date(now);
  let end = new Date(now);

  const getWeekStart = (date) => {
    const copy = new Date(date);
    const day = copy.getDay();
    const diff = day === 0 ? 6 : day - 1;
    copy.setDate(copy.getDate() - diff);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };

  switch (rangeValue) {
    case "Today":
      break;
    case "Yesterday":
      start.setDate(now.getDate() - 1);
      end = new Date(start);
      break;
    case "Last 7 days":
      start.setDate(now.getDate() - 6);
      break;
    case "Last 30 days":
      start.setDate(now.getDate() - 29);
      break;
    case "Week to date":
      start = getWeekStart(now);
      break;
    case "Month to date":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      break;
    case "Year to date":
      start = new Date(now.getFullYear(), 0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case "Last 90 days":
      start.setDate(now.getDate() - 89);
      break;
    case "Last 365 days":
      start.setDate(now.getDate() - 364);
      break;
    case "Last month": {
      const year = now.getFullYear();
      const month = now.getMonth();
      const prevMonth = month - 1 < 0 ? 11 : month - 1;
      const prevYear = month - 1 < 0 ? year - 1 : year;
      start = new Date(prevYear, prevMonth, 1);
      end = new Date(prevYear, prevMonth + 1, 0);
      return { startDate: toISODate(start), endDate: toISODate(end) };
    }
    case "Last 12 months":
      start.setFullYear(now.getFullYear() - 1);
      break;
    case "Last year": {
      const y = now.getFullYear() - 1;
      start = new Date(y, 0, 1);
      end = new Date(y, 11, 31);
      return { startDate: toISODate(start), endDate: toISODate(end) };
    }
    case "Quarter to date": {
      const currentMonth = now.getMonth();
      const quarterStartMonth = currentMonth - (currentMonth % 3);
      start = new Date(now.getFullYear(), quarterStartMonth, 1);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case "Custom range":
      return { startDate: "", endDate: "" };
    default:
      break;
  }

  return { startDate: toISODate(start), endDate: toISODate(end) };
};

const prettyDate = (dateText = "") => {
  if (!dateText) return "";
  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateText;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const iconForMetric = (key) => {
  switch (key) {
    case "Global Orders":
      return "GO";
    case "Abandoned Carts":
      return "AC";
    case "Retention Leads":
      return "RL";
    case "Retention Sales":
      return "RS";
    case "Followup Today":
      return "FT";
    case "Missed Followups":
      return "MF";
    case "Active Leads":
      return "AL";
    case "Lost Leads":
      return "LL";
    default:
      return "•";
  }
};

const toneClassForMetric = (key) => {
  switch (key) {
    case "Global Orders":
      return "rd-tone-blue";
    case "Abandoned Carts":
      return "rd-tone-amber";
    case "Retention Leads":
      return "rd-tone-teal";
    case "Retention Sales":
      return "rd-tone-red";
    case "Followup Today":
      return "rd-tone-green";
    case "Missed Followups":
      return "rd-tone-red";
    case "Active Leads":
      return "rd-tone-blue";
    case "Lost Leads":
      return "rd-tone-slate";
    default:
      return "rd-tone-slate";
  }
};

const getSummaryHeading = (rangeValue) => {
  switch (rangeValue) {
    case "Today":
      return "Today Summary";
    case "Yesterday":
      return "Yesterday Summary";
    case "Week to date":
      return "Weekly Summary";
    case "Month to date":
      return "Monthly Summary";
    case "Year to date":
      return "Yearly Summary";
    case "Quarter to date":
      return "Quarterly Summary";
    case "Custom range":
      return "Custom Range Summary";
    default:
      return `${rangeValue} Summary`;
  }
};

export default function InternationalAgentDashboard() {
  const [loadingMain, setLoadingMain] = useState(true);
  const [selectedRange, setSelectedRange] = useState("Month to date");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [windowLabel, setWindowLabel] = useState("Month to date");
  const [stats, setStats] = useState({
    shopifyOrders: 0,
    abandonedCarts: 0,
    retentionLeads: 0,
    activeLeads: 0,
    lostLeads: 0,
    followupToday: 0,
    missedFollowups: 0,
    retentionSales: 0,
  });
  const [error, setError] = useState("");

  const user = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("user"));
    } catch {
      return null;
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setLoadingMain(true);
      setError("");

      const [
        shopifyRes,
        abandonedRes,
        retentionRes,
        activeRes,
        lostRes,
        todayRes,
        missedRes,
        salesRes,
      ] = await Promise.all([
        axios.get(`${API_BASE}/api/global-shopify-orders`, { params: { page: 1, limit: 1 } }),
        axios.get(`${API_BASE}/api/global-aband`, { params: { page: 1, limit: 1 } }),
        axios.get(`${API_BASE}/api/global-retention-leads`, { params: { page: 1, limit: 1 } }),
        axios.get(`${API_BASE}/api/global-retention-leads`, { params: { page: 1, limit: 1, status: "active" } }),
        axios.get(`${API_BASE}/api/global-retention-leads`, { params: { page: 1, limit: 1, status: "lost" } }),
        axios.get(`${API_BASE}/api/global-retention-leads`, { params: { page: 1, limit: 1, followupFilter: "today" } }),
        axios.get(`${API_BASE}/api/global-retention-leads`, { params: { page: 1, limit: 1, followupFilter: "missed" } }),
        axios.get(`${API_BASE}/api/global-retention-sales`, { params: { page: 1, limit: 1 } }),
      ]);

      setStats({
        shopifyOrders: Number(shopifyRes.data?.total || 0),
        abandonedCarts: Number(abandonedRes.data?.total || 0),
        retentionLeads: Number(retentionRes.data?.totalCount || 0),
        activeLeads: Number(activeRes.data?.totalCount || 0),
        lostLeads: Number(lostRes.data?.totalCount || 0),
        followupToday: Number(todayRes.data?.totalCount || 0),
        missedFollowups: Number(missedRes.data?.totalCount || 0),
        retentionSales: Number(salesRes.data?.totalCount || 0),
      });
    } catch (err) {
      console.error("Failed to load international dashboard:", err);
      setError(err.response?.data?.message || "Failed to load international dashboard.");
      setStats({
        shopifyOrders: 0,
        abandonedCarts: 0,
        retentionLeads: 0,
        activeLeads: 0,
        lostLeads: 0,
        followupToday: 0,
        missedFollowups: 0,
        retentionSales: 0,
      });
    } finally {
      setLoadingMain(false);
    }
  }, []);

  const loadForRange = useCallback(
    async (startDate, endDate) => {
      setWindowLabel(`${prettyDate(startDate)} - ${prettyDate(endDate)}`);
      await fetchStats();
    },
    [fetchStats]
  );

  useEffect(() => {
    const initial = getDateRange("Month to date");
    loadForRange(initial.startDate, initial.endDate);
  }, [loadForRange]);

  const onRangeChange = async (value) => {
    setSelectedRange(value);
    if (value === "Custom range") return;
    const range = getDateRange(value);
    await loadForRange(range.startDate, range.endDate);
  };

  const applyCustomRange = async () => {
    if (!customStart || !customEnd) return;
    await loadForRange(customStart, customEnd);
  };

  const totalActionable = stats.shopifyOrders + stats.abandonedCarts + stats.followupToday + stats.missedFollowups;
  const conversionRate = stats.retentionLeads > 0
    ? ((stats.retentionSales / stats.retentionLeads) * 100).toFixed(1)
    : "0.0";
  const followupCoverageRate = stats.retentionLeads > 0
    ? (((stats.followupToday + stats.missedFollowups) / stats.retentionLeads) * 100).toFixed(1)
    : "0.0";

  const executiveKpis = [
    { label: "Conversion Rate", value: `${conversionRate}%`, tone: "rd-chip-blue" },
    { label: "Actionable Queue", value: totalActionable.toLocaleString("en-IN"), tone: "rd-chip-teal" },
    { label: "Followup Coverage", value: `${followupCoverageRate}%`, tone: "rd-chip-violet" },
    { label: "Live Range", value: selectedRange, tone: "rd-chip-gold" },
  ];

  const summaryHeading = useMemo(() => getSummaryHeading(selectedRange), [selectedRange]);

  const topCards = [
    {
      label: "Global Orders",
      value: stats.shopifyOrders.toLocaleString("en-IN"),
    },
    {
      label: "Abandoned Carts",
      value: stats.abandonedCarts.toLocaleString("en-IN"),
    },
    {
      label: "Retention Leads",
      value: stats.retentionLeads.toLocaleString("en-IN"),
    },
    {
      label: "Retention Sales",
      value: stats.retentionSales.toLocaleString("en-IN"),
    },
  ];

  const followupCards = [
    {
      label: "Followup Today",
      value: stats.followupToday.toLocaleString("en-IN"),
    },
    {
      label: "Missed Followups",
      value: stats.missedFollowups.toLocaleString("en-IN"),
    },
    {
      label: "Active Leads",
      value: stats.activeLeads.toLocaleString("en-IN"),
    },
    {
      label: "Lost Leads",
      value: stats.lostLeads.toLocaleString("en-IN"),
    },
  ];

  return (
    <div className="rd-page rd-retention-page">
      <div className="rd-shell">
        <section className="rd-hero rd-retention-hero rd-fade-1">
          <div>
            <h1>{user?.fullName || "International Agent"} Dashboard</h1>
            <div className="rd-meta-line">
              <span className="rd-dot" />
              <span>{windowLabel}</span>
            </div>
          </div>

          <div className="rd-hero-controls">
            <div className="rd-filters">
              <label htmlFor="rd-range">Date Range</label>
              <select
                id="rd-range"
                value={selectedRange}
                onChange={(event) => onRangeChange(event.target.value)}
              >
                {TIME_RANGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="rd-drr-panel">
              <span className="rd-drr-text">
                Queue:
                <strong className="rd-drr-green">{totalActionable.toLocaleString("en-IN")}</strong>
              </span>
              <span className="rd-drr-divider" />
              <span className="rd-drr-text">
                Sales:
                <strong className="rd-drr-gold">{stats.retentionSales.toLocaleString("en-IN")}</strong>
              </span>
            </div>
          </div>
        </section>

        <section className="rd-kpi-ribbon rd-fade-2">
          {executiveKpis.map((kpi) => (
            <article key={kpi.label} className="rd-kpi-pill">
              <span className={`rd-kpi-label ${kpi.tone}`}>{kpi.label}</span>
              <strong>{kpi.value}</strong>
            </article>
          ))}
        </section>

        {selectedRange === "Custom range" && (
          <section className="rd-custom-range rd-fade-3">
            <div className="rd-field">
              <label htmlFor="rd-start">Start Date</label>
              <input
                id="rd-start"
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
              />
            </div>
            <div className="rd-field">
              <label htmlFor="rd-end">End Date</label>
              <input
                id="rd-end"
                type="date"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
              />
            </div>
            <button type="button" className="rd-btn-primary" onClick={applyCustomRange}>
              Apply
            </button>
          </section>
        )}

        {loadingMain && <div className="rd-top-loader" aria-hidden="true" />}
        {error ? (
          <section className="rd-section rd-fade-3">
            <div className="rd-section-head">
              <h2>Dashboard Error</h2>
            </div>
            <div className="rd-empty">{error}</div>
          </section>
        ) : null}

        <section className="rd-section rd-fade-3">
          <div className="rd-section-head">
            <h2>{summaryHeading}</h2>
          </div>
          <div className="rd-card-grid rd-grid-4">
            {topCards.map((card) => (
              <article
                key={card.label}
                className={`rd-metric-card ${toneClassForMetric(card.label)}`}
              >
                <span className="rd-icon">{iconForMetric(card.label)}</span>
                <span className="rd-label">{card.label}</span>
                <span className="rd-value">{card.value}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="rd-section rd-fade-4">
          <div className="rd-section-head">
            <h2>Followup Summary</h2>
          </div>
          <div className="rd-card-grid rd-grid-4">
            {followupCards.map((card) => (
              <article
                key={card.label}
                className={`rd-metric-card ${toneClassForMetric(card.label)}`}
              >
                <span className="rd-icon">{iconForMetric(card.label)}</span>
                <span className="rd-label">{card.label}</span>
                <span className="rd-value">{card.value}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
