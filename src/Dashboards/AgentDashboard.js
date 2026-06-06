import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import IncentiveSummarySection from "../components/IncentiveSummarySection";
import "./RetentionDashboard.css";
import { getCachedData } from "../utils/apiCache";

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";
const DASHBOARD_CACHE_TTL_MS = 60 * 1000;
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;

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

const clampPercent = (value) => {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, parsed));
};

const formatMoney = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const iconForMetric = (key) => {
  if (String(key).toLowerCase().startsWith("sales done")) {
    return "SD";
  }
  switch (key) {
    case "Open Leads":
      return "OL";
    case "Lead Assign":
    case "Leads Assigned Today":
      return "LA";
    case "Conversion Rate":
      return "CR";
    case "Total Sales":
      return "TS";
    case "Average Order Value":
      return "AOV";
    case "No Followup Set":
      return "NS";
    case "Followup Missed":
      return "FM";
    case "Followup Today":
      return "FT";
    case "Followup Tomorrow":
      return "FR";
    case "Followup Later":
      return "FL";
    default:
      return "•";
  }
};

const toneClassForMetric = (key) => {
  if (String(key).toLowerCase().startsWith("sales done")) {
    return "rd-tone-orange";
  }
  switch (key) {
    case "Open Leads":
      return "rd-tone-blue";
    case "Lead Assign":
    case "Leads Assigned Today":
      return "rd-tone-green";
    case "Conversion Rate":
      return "rd-tone-cyan";
    case "Total Sales":
      return "rd-tone-red";
    case "Average Order Value":
      return "rd-tone-amber";
    case "No Followup Set":
      return "rd-tone-slate";
    case "Followup Missed":
      return "rd-tone-red";
    case "Followup Today":
      return "rd-tone-green";
    case "Followup Tomorrow":
      return "rd-tone-amber";
    case "Followup Later":
      return "rd-tone-cyan";
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

const getSalesDoneLabel = (rangeValue) => {
  switch (rangeValue) {
    case "Today":
      return "Sales Done Today";
    case "Yesterday":
      return "Sales Done Yesterday";
    case "Week to date":
      return "Sales Done (Weekly)";
    case "Month to date":
      return "Sales Done (Monthly)";
    case "Year to date":
      return "Sales Done (Yearly)";
    case "Last 7 days":
      return "Sales Done (Last 7 Days)";
    case "Last 30 days":
      return "Sales Done (Last 30 Days)";
    case "Last 90 days":
      return "Sales Done (Last 90 Days)";
    case "Last 365 days":
      return "Sales Done (Last 365 Days)";
    case "Last month":
      return "Sales Done (Last Month)";
    case "Last 12 months":
      return "Sales Done (Last 12 Months)";
    case "Last year":
      return "Sales Done (Last Year)";
    case "Quarter to date":
      return "Sales Done (Quarterly)";
    case "Custom range":
      return "Sales Done (Custom Range)";
    default:
      return "Sales Done";
  }
};

const normalizeShipmentTone = (label = "") => {
  const value = String(label).toLowerCase();
  if (value.includes("deliver")) return "good";
  if (value.includes("rto") || value.includes("cancel") || value.includes("return")) return "bad";
  if (value.includes("unknown") || value.includes("not available")) return "neutral";
  return "info";
};

const AgentDashboard = () => {
  const [loadingMain, setLoadingMain] = useState(true);
  const [loadingLeadSource, setLoadingLeadSource] = useState(false);
  const [loadingShipment, setLoadingShipment] = useState(false);

  const [todayStats, setTodayStats] = useState({});
  const [followupStats, setFollowupStats] = useState({});
  const [leadSourceData, setLeadSourceData] = useState([]);
  const [shipmentStatusSummary, setShipmentStatusSummary] = useState([]);

  const [selectedRange, setSelectedRange] = useState("Month to date");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [windowLabel, setWindowLabel] = useState("Month to date");
  const [target, setTarget] = useState(0);
  const [salesProgress, setSalesProgress] = useState(0);

  const user = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("user"));
    } catch {
      return null;
    }
  }, []);

  const canShowDrrPanel = Boolean(user?.permissions?.navbar?.drrPanel);

  const fetchTodayAndFollowup = useCallback(async (agentName, startDate, endDate) => {
    setLoadingMain(true);
    try {
      const [todayData, followupData, salesSummaryData] = await getCachedData(
        `sales-agent:summary:${agentName}:${startDate}:${endDate}`,
        async () => {
          const [todayRes, followupRes, salesSummaryRes] = await Promise.all([
            axios.get(`${API_BASE}/api/dashboard/today-summary-agent`, {
              params: { agentAssignedName: agentName, startDate, endDate },
            }),
            axios.get(`${API_BASE}/api/dashboard/followup-summary-agent`, {
              params: { agentAssignedName: agentName, startDate, endDate },
            }),
            axios.get(`${API_BASE}/api/sales-summary`, {
              params: { startDate, endDate },
            }),
          ]);
          return [todayRes?.data || {}, followupRes?.data || {}, salesSummaryRes?.data || {}];
        },
        DASHBOARD_CACHE_TTL_MS
      );

      const perAgentSummary = Array.isArray(salesSummaryData?.perAgent)
        ? salesSummaryData.perAgent
        : [];
      const summaryRow =
        perAgentSummary.find(
          (row) => String(row?.agentName || "").trim().toLowerCase() === String(agentName || "").trim().toLowerCase()
        ) || {};

      const leadsAssigned = Number(summaryRow?.leadsAssigned || 0);
      const salesDone = Number(todayData?.salesDone || 0);
      const conversionRate = leadsAssigned > 0 ? Number(((salesDone / leadsAssigned) * 100).toFixed(2)) : 0;

      setTodayStats({
        ...todayData,
        openLeads: Number(summaryRow?.openLeads || 0),
        leadsAssigned,
        leadsAssignedToday: leadsAssigned,
        conversionRate,
      });
      setFollowupStats(followupData || {});
    } catch (error) {
      console.error("Error fetching sales dashboard summary:", error);
      setTodayStats({});
      setFollowupStats({});
    } finally {
      setLoadingMain(false);
    }
  }, []);

  const fetchLeadSourceSummary = useCallback(async (agentName, startDate, endDate) => {
    setLoadingLeadSource(true);
    try {
      const data = await getCachedData(
        `sales-agent:lead-source:${agentName}:${startDate}:${endDate}`,
        async () => {
          const response = await axios.get(`${API_BASE}/api/dashboard/lead-source-summary-limited`, {
            params: { agentAssignedName: agentName, startDate, endDate },
          });
          return response?.data;
        },
        DASHBOARD_CACHE_TTL_MS
      );
      setLeadSourceData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching lead source summary:", error);
      setLeadSourceData([]);
    } finally {
      setLoadingLeadSource(false);
    }
  }, []);

  const fetchShipmentStatusSummary = useCallback(async (agentName, startDate, endDate) => {
    setLoadingShipment(true);
    try {
      const data = await getCachedData(
        `sales-agent:shipment:${agentName}:${startDate}:${endDate}`,
        async () => {
          const response = await axios.get(`${API_BASE}/api/dashboard/shipment-status-summary`, {
            params: { agentName, startDate, endDate },
          });
          return response?.data;
        },
        DASHBOARD_CACHE_TTL_MS
      );
      setShipmentStatusSummary(Array.isArray(data?.shipmentStatusSummary) ? data.shipmentStatusSummary : []);
    } catch (error) {
      console.error("Error fetching shipment status summary:", error);
      setShipmentStatusSummary([]);
    } finally {
      setLoadingShipment(false);
    }
  }, []);

  const loadForRange = useCallback(async (startDate, endDate) => {
    if (!user?.fullName || !startDate || !endDate) return;
    setWindowLabel(`${prettyDate(startDate)} - ${prettyDate(endDate)}`);
    await Promise.all([
      fetchTodayAndFollowup(user.fullName, startDate, endDate),
      fetchLeadSourceSummary(user.fullName, startDate, endDate),
      fetchShipmentStatusSummary(user.fullName, startDate, endDate),
    ]);
  }, [fetchLeadSourceSummary, fetchShipmentStatusSummary, fetchTodayAndFollowup, user?.fullName]);

  useEffect(() => {
    if (!user?.fullName) return;
    const initial = getDateRange("Month to date");
    loadForRange(initial.startDate, initial.endDate);
  }, [loadForRange, user?.fullName]);

  useEffect(() => {
    async function fetchTarget() {
      if (!user?.fullName || !user?.email) return;
      try {
        const data = await getCachedData(
          `sales-agent:target:${user.fullName}:${user.email}`,
          async () => {
            const response = await axios.get(`${API_BASE}/api/employees`, {
              params: {
                fullName: user.fullName,
                email: user.email,
              },
            });
            return response.data;
          },
          PROFILE_CACHE_TTL_MS
        );
        if (data && data[0]) {
          setTarget(Number(data[0].target || 0));
        }
      } catch (error) {
        console.error("Error fetching employee target:", error);
      }
    }

    fetchTarget();
  }, [user?.email, user?.fullName]);

  useEffect(() => {
    async function fetchSalesProgress() {
      if (!user?.fullName) return;
      try {
        const data = await getCachedData(
          `sales-agent:progress:${user.fullName}`,
          async () => {
            const response = await axios.get(`${API_BASE}/api/retention-sales/progress`, {
              params: { name: user.fullName },
            });
            return response?.data;
          },
          DASHBOARD_CACHE_TTL_MS
        );
        setSalesProgress(Number(data?.total || 0));
      } catch (error) {
        console.error("Error fetching sales progress:", error);
      }
    }

    fetchSalesProgress();
  }, [user?.fullName]);

  const workingDaysLeft = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const date = today.getDate();
    const lastDay = new Date(year, month + 1, 0).getDate();

    let days = 0;
    for (let day = date; day <= lastDay; day += 1) {
      const check = new Date(year, month, day);
      if (check.getDay() !== 0) days += 1;
    }
    return days;
  }, []);

  const dailySalesRequired =
    workingDaysLeft > 0 && target - salesProgress > 0
      ? Math.ceil((target - salesProgress) / workingDaysLeft)
      : 0;

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

  const handleBoxClick = (label) => {
    const normalizedLabel = String(label).toLowerCase().startsWith("sales done")
      ? "Sales Done"
      : label;
    if (normalizedLabel === "Sales Done" || normalizedLabel === "Total Sales" || normalizedLabel === "Average Order Value") {
      window.open("/sales/my-sales", "_blank");
      return;
    }

    window.open("/sales/my-leads", "_blank");
  };

  const salesDoneLabel = useMemo(() => getSalesDoneLabel(selectedRange), [selectedRange]);
  const summaryHeading = useMemo(() => getSummaryHeading(selectedRange), [selectedRange]);

  const salesCards = [
    {
      label: "Open Leads",
      value: Number(todayStats.openLeads || 0).toLocaleString("en-IN"),
      sub: "Leads still in motion",
    },
    {
      label: "Lead Assign",
      value: Number(todayStats.leadsAssigned || todayStats.leadsAssignedToday || 0).toLocaleString("en-IN"),
      sub: "Assigned leads",
    },
    {
      label: salesDoneLabel,
      value: Number(todayStats.salesDone || 0).toLocaleString("en-IN"),
      sub: "Confirmed conversions",
    },
    {
      label: "Conversion Rate",
      value: `${Number(todayStats.conversionRate || 0).toFixed(2)}%`,
      sub: "Lead to sale quality",
    },
    {
      label: "Total Sales",
      value: formatMoney(todayStats.totalSales),
      sub: "Gross revenue",
    },
    {
      label: "Average Order Value",
      value: formatMoney(todayStats.avgOrderValue),
      sub: "",
    },
  ];

  const followupCards = [
    { label: "No Followup Set", key: "noFollowupSet" },
    { label: "Followup Missed", key: "followupMissed" },
    { label: "Followup Today", key: "followupToday" },
    { label: "Followup Tomorrow", key: "followupTomorrow" },
    { label: "Followup Later", key: "followupLater" },
  ];

  const leadSourceTotals = leadSourceData.reduce(
    (total, row) => ({
      leadsAssigned: total.leadsAssigned + Number(row.leadsAssigned || 0),
      leadsConverted: total.leadsConverted + Number(row.leadsConverted || 0),
      salesAmount: total.salesAmount + Number(row.salesAmount || 0),
    }),
    { leadsAssigned: 0, leadsConverted: 0, salesAmount: 0 }
  );

  const leadSourceTotalConversion = leadSourceTotals.leadsAssigned
    ? ((leadSourceTotals.leadsConverted / leadSourceTotals.leadsAssigned) * 100).toFixed(2)
    : "0.00";

  const totalFollowupVolume = followupCards.reduce(
    (sum, card) => sum + Number(followupStats?.[card.key] || 0),
    0
  );
  const followupCoverage = Number(followupStats.followupToday || 0) + Number(followupStats.followupTomorrow || 0);
  const followupCoverageRate = totalFollowupVolume
    ? ((followupCoverage / totalFollowupVolume) * 100).toFixed(1)
    : "0.0";

  const deliveredShipmentRow = shipmentStatusSummary.find((row) =>
    String(row?.category || "").toLowerCase().includes("deliver")
  );
  const deliveredShipmentCount = Number(deliveredShipmentRow?.totalOrders || 0);

  const executiveKpis = [
    {
      label: "Conversion Rate",
      value: `${Number(todayStats.conversionRate || 0).toFixed(2)}%`,
      tone: "rd-chip-blue",
    },
    {
      label: "Delivered Shipments",
      value: deliveredShipmentCount.toLocaleString("en-IN"),
      tone: "rd-chip-teal",
    },
    {
      label: "Followup Coverage",
      value: `${followupCoverageRate}%`,
      tone: "rd-chip-violet",
    },
    {
      label: "Live Range",
      value: selectedRange,
      tone: "rd-chip-gold",
    },
  ];

  return (
    <div className="rd-page rd-sales-page">
      <div className="rd-shell">
        <section className="rd-hero rd-sales-hero rd-fade-1">
          <div>
            <h1>{user?.fullName || "Sales Agent"} Dashboard</h1>
            <div className="rd-meta-line">
              <span className="rd-dot" />
              <span>{windowLabel}</span>
            </div>
          </div>

          <div className="rd-hero-controls">
            <div className="rd-filters">
              <label htmlFor="sales-range">Date Range</label>
              <select
                id="sales-range"
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

            {canShowDrrPanel && (
              <div className="rd-drr-panel">
                <span className="rd-drr-text">
                  DRR: <strong className="rd-drr-green">{dailySalesRequired > 0 ? formatMoney(dailySalesRequired) : "₹0"}</strong>
                </span>
                <span className="rd-drr-divider" />
                <span className="rd-drr-text">
                  Target: ({Math.floor(salesProgress)}/{Math.floor(target)})
                  <strong className="rd-drr-gold">
                    {target > 0 ? `${Math.floor((salesProgress / target) * 100)}%` : "0%"}
                  </strong>
                </span>
              </div>
            )}
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
              <label htmlFor="sales-start">Start Date</label>
              <input
                id="sales-start"
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
              />
            </div>
            <div className="rd-field">
              <label htmlFor="sales-end">End Date</label>
              <input
                id="sales-end"
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

        {(loadingMain || loadingLeadSource || loadingShipment) && (
          <div className="rd-top-loader" aria-hidden="true" />
        )}

        <section className="rd-section rd-fade-3">
          <div className="rd-section-head">
            <h2>{summaryHeading}</h2>
          </div>
          <div className="rd-card-grid rd-grid-3">
            {salesCards.map((card) => (
              <button
                type="button"
                key={card.label}
                className={`rd-metric-card ${toneClassForMetric(card.label)}`}
                onClick={() => handleBoxClick(card.label)}
              >
                <span className="rd-icon">{iconForMetric(card.label)}</span>
                <span className="rd-label">{card.label}</span>
                <span className="rd-value">{card.value}</span>
                {card.sub ? <span className="rd-sub">{card.sub}</span> : null}
              </button>
            ))}
          </div>
        </section>

        <section className="rd-section rd-fade-4">
          <div className="rd-section-head">
            <h2>Followup Summary</h2>
          </div>
          <div className="rd-card-grid rd-grid-3">
            {followupCards.map((card) => (
              <button
                type="button"
                key={card.label}
                className={`rd-metric-card ${toneClassForMetric(card.label)}`}
                onClick={() => handleBoxClick(card.label)}
              >
                <span className="rd-icon">{iconForMetric(card.label)}</span>
                <span className="rd-label">{card.label}</span>
                <span className="rd-value">
                  {Number(followupStats?.[card.key] || 0).toLocaleString("en-IN")}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="rd-section rd-fade-5">
          <div className="rd-section-head">
            <h2>Lead Source Summary</h2>
          </div>
          <div className="rd-table-wrap">
            <table className="rd-table">
              <thead>
                <tr>
                  <th>Lead Source</th>
                  <th>Lead Assigned</th>
                  <th>Leads Converted</th>
                  <th>Conversion Rate</th>
                  <th>Sales Amount</th>
                </tr>
              </thead>
              <tbody>
                {loadingLeadSource ? (
                  <tr>
                    <td colSpan={5} className="rd-empty">
                      Loading lead source summary...
                    </td>
                  </tr>
                ) : leadSourceData.length > 0 ? (
                  <>
                    {leadSourceData.map((row, index) => (
                      <tr key={`${row.leadSource || "source"}-${index}`}>
                        <td>{row.leadSource || "Unknown"}</td>
                        <td>{Number(row.leadsAssigned || 0).toLocaleString("en-IN")}</td>
                        <td>{Number(row.leadsConverted || 0).toLocaleString("en-IN")}</td>
                        <td>
                          <div className="rd-percent-cell">
                            <span>{Number(row.conversionRate || 0).toFixed(2)}%</span>
                            <div className="rd-progress rd-progress-tight">
                              <span
                                className="rd-progress-fill"
                                style={{ width: `${clampPercent(row.conversionRate)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>{formatMoney(row.salesAmount)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td><strong>Total</strong></td>
                      <td>{leadSourceTotals.leadsAssigned.toLocaleString("en-IN")}</td>
                      <td>{leadSourceTotals.leadsConverted.toLocaleString("en-IN")}</td>
                      <td>{leadSourceTotalConversion}%</td>
                      <td>{formatMoney(leadSourceTotals.salesAmount)}</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan={5} className="rd-empty">
                      No lead source data found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rd-section rd-fade-6">
          <div className="rd-section-head">
            <h2>Shipment Status</h2>
          </div>
          <div className="rd-table-wrap">
            <table className="rd-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Total Orders</th>
                  <th>Total Amount</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {loadingShipment ? (
                  <tr>
                    <td colSpan={4} className="rd-empty">
                      Loading shipment summary...
                    </td>
                  </tr>
                ) : shipmentStatusSummary.length > 0 ? (
                  shipmentStatusSummary.map((row, index) => (
                    <tr key={`${row.category || "shipment"}-${index}`}>
                      <td>
                        <div className="rd-status">
                          <span className={`rd-status-dot rd-${normalizeShipmentTone(row.category)}`} />
                          <span>{row.category || "Unknown"}</span>
                        </div>
                      </td>
                      <td>{Number(row.totalOrders || 0).toLocaleString("en-IN")}</td>
                      <td>{formatMoney(row.totalAmount)}</td>
                      <td>
                        <div className="rd-percent-cell">
                          <span>{Number(row.percentage || 0).toFixed(2)}%</span>
                          <div className="rd-progress rd-progress-tight">
                            <span
                              className="rd-progress-fill"
                              style={{ width: `${clampPercent(row.percentage)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="rd-empty">
                      No shipment data found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <IncentiveSummarySection agentName={user?.fullName} />
      </div>
    </div>
  );
};

export default AgentDashboard;
