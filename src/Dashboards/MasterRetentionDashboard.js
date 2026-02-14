import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  LinearProgress,
  TextField,
  MenuItem,
  Select,
  FormControl,
  Button,
  Divider,
  Chip,
} from "@mui/material";
import axios from "axios";
import { Link as RouterLink } from "react-router-dom";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  AccountCircle,
  ShoppingCart,
  CurrencyRupee,
  TrendingUp,
  PersonOff,
  EventBusy,
  EventAvailable,
  Event,
  Update,
  HighlightOff,
  Call,
  WhatsApp,
  Groups,
  AssignmentTurnedIn,
} from "@mui/icons-material";

import TotalSalesDrilldown from "../pages/filtered/TotalSalesDrilldown";

// -------------------------------------------
// Config
// -------------------------------------------
const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";
const CACHE_TTL_MS = 3 * 60 * 1000; // ✅ 3 minutes

// -------------------------------------------
// Time-range dropdown options
// -------------------------------------------
const timeRangeOptions = [
  "Custom range",
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
];

// -------------------------------------------
// Local YYYY-MM-DD (safe vs toISOString date-shift)
// -------------------------------------------
const toISODateLocal = (d) => {
  const tz = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - tz);
  return local.toISOString().slice(0, 10);
};

// -------------------------------------------
// Compute start/end date from a range
// -------------------------------------------
const getDateRange = (rangeValue) => {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

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
    case "Week to date": {
      const day = now.getDay(); // 0=Sun
      const diff = day === 0 ? 6 : day - 1; // Monday start
      start.setDate(now.getDate() - diff);
      break;
    }
    case "Month to date":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "Year to date":
      start = new Date(now.getFullYear(), 0, 1);
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
      return { startDate: toISODateLocal(start), endDate: toISODateLocal(end) };
    }
    case "Last 12 months":
      start.setFullYear(now.getFullYear() - 1);
      break;
    case "Last year": {
      const y = now.getFullYear() - 1;
      start = new Date(y, 0, 1);
      end = new Date(y, 11, 31);
      return { startDate: toISODateLocal(start), endDate: toISODateLocal(end) };
    }
    case "Quarter to date": {
      const currentMonth = now.getMonth();
      const quarterStartMonth = currentMonth - (currentMonth % 3);
      start = new Date(now.getFullYear(), quarterStartMonth, 1);
      break;
    }
    default:
      break;
  }

  return { startDate: toISODateLocal(start), endDate: toISODateLocal(end) };
};

// -------------------------------------------
// Formatters
// -------------------------------------------
const fmt0 = (n) =>
  Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const fmt2 = (n) =>
  Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

// -------------------------------------------
// ✅ Simple sessionStorage cache helpers
// -------------------------------------------
const cacheGet = (key) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts) return null;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed.data ?? null;
  } catch {
    return null;
  }
};

const cacheSet = (key, data) => {
  try {
    sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // ignore quota errors
  }
};

// -------------------------------------------
// UI styles
// -------------------------------------------
const sectionPaperSx = {
  p: { xs: 2, md: 2.5 },
  borderRadius: 3,
  border: "1px solid #E6E8EC",
  backgroundColor: "#FFFFFF",
  boxShadow: "0 10px 30px rgba(16, 24, 40, 0.06)",
};

const cardSx = {
  p: 1.6,
  display: "flex",
  gap: 1.4,
  alignItems: "center",
  borderRadius: 2.2,
  border: "1px solid #E6E8EC",
  backgroundColor: "#FFFFFF",
  boxShadow: "0 1px 8px rgba(16, 24, 40, 0.06)",
  transition: "120ms ease",
  minHeight: 74,
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 10px 24px rgba(16, 24, 40, 0.10)",
  },
};

const headerCellSx = {
  fontWeight: 900,
  color: "#334155",
  py: 1.2,
  textAlign: "center",
  backgroundColor: "#F8FAFC",
};

const rowHoverSx = {
  "&:hover": { backgroundColor: "#F1F5F9" },
};

const ManagerRetentionDashboard = () => {
  // -------------------------------------------
  // Global Date Range (single range for all sections)
  // -------------------------------------------
  const initialDates = useMemo(() => getDateRange("Today"), []);
  const [range, setRange] = useState("Today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [effectiveStart, setEffectiveStart] = useState(initialDates.startDate);
  const [effectiveEnd, setEffectiveEnd] = useState(initialDates.endDate);

  // -------------------------------------------
  // UI toggles (no dropdown, just buttons)
  // -------------------------------------------
  const [showHealthExpertMetrics, setShowHealthExpertMetrics] = useState(false);
  const [showFollowupMetrics, setShowFollowupMetrics] = useState(false);
  const [showReachoutDetails, setShowReachoutDetails] = useState(false);
  const [showCodDetails, setShowCodDetails] = useState(false);

  // -------------------------------------------
  // Dialog
  // -------------------------------------------
  const [showTotalSalesDialog, setShowTotalSalesDialog] = useState(false);

  // -------------------------------------------
  // Shared loading states (separated, so toggles don't block others)
  // -------------------------------------------
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [followupLoading, setFollowupLoading] = useState(false);
  const [shipmentLoading, setShipmentLoading] = useState(false);
  const [reachoutLoading, setReachoutLoading] = useState(false);
  const [codLoading, setCodLoading] = useState(false);
  const [agentShipmentLoading, setAgentShipmentLoading] = useState(false);

  // -------------------------------------------
  // Health Experts list (used for shipment agent filter & reachouts)
  // -------------------------------------------
  const [healthExperts, setHealthExperts] = useState([]); // [{_id, fullName}, ...]
  const [selectedHealthExpert, setSelectedHealthExpert] = useState("");

  // -------------------------------------------
  // 1) Health Expert Summary + Metrics (cards + table)
  // -------------------------------------------
  const [healthExpertSummary, setHealthExpertSummary] = useState({
    totalActiveCustomers: 0,
    totalSalesDone: 0,
    totalSalesAmount: 0,
    avgOrderValue: 0,
  });
  const [healthExpertMetrics, setHealthExpertMetrics] = useState([]); // per health expert

  // -------------------------------------------
  // 2) Followup Summary (6 cards + table)
  // -------------------------------------------
  const [followupTotals, setFollowupTotals] = useState({
    totalNoFollowupSet: 0,
    totalFollowupMissed: 0,
    totalFollowupToday: 0,
    totalFollowupTomorrow: 0,
    totalFollowupLater: 0,
    totalLostCustomers: 0,
  });
  const [followupRows, setFollowupRows] = useState([]); // per health expert

  // -------------------------------------------
  // 3) Shipment Summary + Agent-wise Shipment
  // -------------------------------------------
  const [shipmentSummary, setShipmentSummary] = useState([]); // overall categories
  const [agentShipmentSummary, setAgentShipmentSummary] = useState([]); // categories for selected health expert

  // -------------------------------------------
  // 4) Reached Out Logs (lazy fetch)
  // -------------------------------------------
  const [reachoutTotals, setReachoutTotals] = useState({
    totalExperts: 0,
    totalCount: 0,
    WhatsApp: 0,
    Call: 0,
    Both: 0,
  });
  const [reachoutRows, setReachoutRows] = useState([]); // [{healthExpertAssigned, totalCount, WhatsApp, Call, Both}]
  const lastReachoutKeyRef = useRef("");

  // -------------------------------------------
  // 5) COD vs Prepaid (fetch for cards; details table toggle)
  // -------------------------------------------
  const [codRows, setCodRows] = useState([]); // per health expert
  const codTotals = useMemo(() => {
    const totalOrders = (codRows || []).reduce((acc, a) => acc + Number(a?.totalOrders || 0), 0);
    const totalCOD = (codRows || []).reduce((acc, a) => acc + Number(a?.codOrders || 0), 0);
    const totalPrepaid = (codRows || []).reduce((acc, a) => acc + Number(a?.prepaidOrders || 0), 0);

    const codPercent = totalOrders > 0 ? ((totalCOD / totalOrders) * 100).toFixed(1) : "0.0";
    const prepaidPercent = totalOrders > 0 ? ((totalPrepaid / totalOrders) * 100).toFixed(1) : "0.0";

    return { totalOrders, totalCOD, totalPrepaid, codPercent, prepaidPercent };
  }, [codRows]);

  // -------------------------------------------
  // Helpers: normalize custom date range without "Apply" button
  // -------------------------------------------
  const normalizeCustomDates = useCallback((a, b) => {
    if (!a || !b) return null;
    const start = a <= b ? a : b;
    const end = a <= b ? b : a;
    return { start, end };
  }, []);

  // -------------------------------------------
  // Fetch: Health experts list (cached)
  // -------------------------------------------
  const fetchHealthExperts = useCallback(async () => {
    const cacheKey = `mrd:experts:list`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      setHealthExperts(cached);
      return cached;
    }

    try {
      const res = await axios.get(`${API_BASE}/api/employees`, {
        params: { role: "Retention Agent" },
      });
      const active = (res.data || []).filter((e) => e?.status === "active" && e?.fullName);
      setHealthExperts(active);
      cacheSet(cacheKey, active);
      return active;
    } catch (e) {
      console.error("Error fetching health experts:", e);
      setHealthExperts([]);
      return [];
    }
  }, []);

  // -------------------------------------------
  // Fetch: Active customer counts (cached)
  // -------------------------------------------
  const fetchActiveCustomerCounts = useCallback(async () => {
    const cacheKey = `mrd:activeCounts`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    try {
      const res = await axios.get(`${API_BASE}/api/leads/retention/active-counts`);
      cacheSet(cacheKey, res.data || []);
      return res.data || [];
    } catch (e) {
      console.error("Error fetching active customer counts:", e);
      return [];
    }
  }, []);

  // -------------------------------------------
  // Fetch: Aggregated sales (cached by date)
  // -------------------------------------------
  const fetchAggregatedSales = useCallback(async (startDate, endDate) => {
    const cacheKey = `mrd:aggSales:${startDate}:${endDate}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    try {
      const res = await axios.get(`${API_BASE}/api/retention-sales/aggregated`, {
        params: { startDate, endDate },
      });
      cacheSet(cacheKey, res.data || []);
      return res.data || [];
    } catch (e) {
      console.error("Error fetching aggregated sales:", e);
      return [];
    }
  }, []);

  // -------------------------------------------
  // ✅ 1) Health Expert Summary + Metrics
  // -------------------------------------------
  const fetchHealthExpertSummaryAndMetrics = useCallback(
    async (startDate, endDate) => {
      const cacheKey = `mrd:heSummary:${startDate}:${endDate}`;
      const cached = cacheGet(cacheKey);
      if (cached) {
        setHealthExpertSummary(cached.summary);
        setHealthExpertMetrics(cached.metrics);
        return;
      }

      setSummaryLoading(true);
      try {
        const experts = healthExperts.length ? healthExperts : await fetchHealthExperts();
        const [activeCountsArr, aggregatedSales] = await Promise.all([
          fetchActiveCustomerCounts(),
          fetchAggregatedSales(startDate, endDate),
        ]);

        let totalActiveCustomers = 0;
        let totalSalesDone = 0;
        let totalSalesAmount = 0;

        const metrics = (experts || []).map((expert) => {
          const activeCountMatch = (activeCountsArr || []).find((x) => x?._id === expert.fullName);
          const activeCustomers = activeCountMatch ? Number(activeCountMatch.activeCount || 0) : 0;

          const salesMatch = (aggregatedSales || []).find((x) => x?.agentName === expert.fullName);
          const salesDone = Number(salesMatch?.salesDone || 0);
          const totalSales = Number(salesMatch?.totalSales || 0);
          const avgOrderValue = Number(salesMatch?.avgOrderValue || 0);

          totalActiveCustomers += activeCustomers;
          totalSalesDone += salesDone;
          totalSalesAmount += totalSales;

          return {
            healthExpertName: expert.fullName,
            activeCustomers,
            salesDone,
            totalSales,
            avgOrderValue,
          };
        });

        const avgOrderValue =
          totalSalesDone > 0 ? Number(totalSalesAmount / totalSalesDone) : 0;

        const summary = {
          totalActiveCustomers,
          totalSalesDone,
          totalSalesAmount,
          avgOrderValue,
        };

        setHealthExpertSummary(summary);
        setHealthExpertMetrics(metrics);

        cacheSet(cacheKey, { summary, metrics });
      } catch (e) {
        console.error("Error building health expert summary:", e);
        setHealthExpertSummary({
          totalActiveCustomers: 0,
          totalSalesDone: 0,
          totalSalesAmount: 0,
          avgOrderValue: 0,
        });
        setHealthExpertMetrics([]);
      } finally {
        setSummaryLoading(false);
      }
    },
    [
      healthExperts,
      fetchHealthExperts,
      fetchActiveCustomerCounts,
      fetchAggregatedSales,
    ]
  );

  // -------------------------------------------
  // ✅ 2) Followup Summary + Metrics (cached by date)
  // -------------------------------------------
  const fetchFollowupSummaryAndMetrics = useCallback(async (startDate, endDate) => {
    const cacheKey = `mrd:followup:${startDate}:${endDate}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      setFollowupTotals(cached.totals);
      setFollowupRows(cached.rows);
      return;
    }

    setFollowupLoading(true);
    try {
      // backend may accept (startDate,endDate); safe even if ignored
      const res = await axios.get(`${API_BASE}/api/retention-sales/aggregated-followup`, {
        params: { startDate, endDate },
      });

      const rows = res.data?.summary || res.data?.followup || res.data || [];
      const totals = (rows || []).reduce(
        (acc, r) => {
          acc.totalNoFollowupSet += Number(r?.noFollowupSet || 0);
          acc.totalFollowupMissed += Number(r?.followupMissed || 0);
          acc.totalFollowupToday += Number(r?.followupToday || 0);
          acc.totalFollowupTomorrow += Number(r?.followupTomorrow || 0);
          acc.totalFollowupLater += Number(r?.followupLater || 0);
          acc.totalLostCustomers += Number(r?.lostCustomers || 0);
          return acc;
        },
        {
          totalNoFollowupSet: 0,
          totalFollowupMissed: 0,
          totalFollowupToday: 0,
          totalFollowupTomorrow: 0,
          totalFollowupLater: 0,
          totalLostCustomers: 0,
        }
      );

      setFollowupRows(rows);
      setFollowupTotals(totals);

      cacheSet(cacheKey, { totals, rows });
    } catch (e) {
      console.error("Error fetching followup summary:", e);
      setFollowupRows([]);
      setFollowupTotals({
        totalNoFollowupSet: 0,
        totalFollowupMissed: 0,
        totalFollowupToday: 0,
        totalFollowupTomorrow: 0,
        totalFollowupLater: 0,
        totalLostCustomers: 0,
      });
    } finally {
      setFollowupLoading(false);
    }
  }, []);

  // -------------------------------------------
  // ✅ 3) Shipment summary (cached by date)
  // -------------------------------------------
  const fetchShipmentSummary = useCallback(async (startDate, endDate) => {
    const cacheKey = `mrd:ship:${startDate}:${endDate}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      setShipmentSummary(cached);
      return;
    }

    setShipmentLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/retention-sales/shipment-summary`, {
        params: { startDate, endDate },
      });
      const list = res.data || [];
      setShipmentSummary(list);
      cacheSet(cacheKey, list);
    } catch (e) {
      console.error("Error fetching shipment summary:", e);
      setShipmentSummary([]);
    } finally {
      setShipmentLoading(false);
    }
  }, []);

  // -------------------------------------------
  // ✅ 3b) Agent-wise shipment (cached by date+expert)
  // -------------------------------------------
  const fetchAgentShipment = useCallback(async (healthExpertName, startDate, endDate) => {
    if (!healthExpertName) {
      setAgentShipmentSummary([]);
      return;
    }

    const cacheKey = `mrd:shipAgent:${healthExpertName}:${startDate}:${endDate}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      setAgentShipmentSummary(cached);
      return;
    }

    setAgentShipmentLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/retention-sales/shipment-summary/agent`, {
        params: { agentName: healthExpertName, startDate, endDate },
      });
      const list = res.data || [];
      setAgentShipmentSummary(list);
      cacheSet(cacheKey, list);
    } catch (e) {
      console.error("Error fetching agent shipment summary:", e);
      setAgentShipmentSummary([]);
    } finally {
      setAgentShipmentLoading(false);
    }
  }, []);

  // -------------------------------------------
  // ✅ 4) Reachout logs (LAZY; cached by date)
  // -------------------------------------------
  const fetchReachoutLogs = useCallback(
    async (startDate, endDate) => {
      const cacheKey = `mrd:reachouts:${startDate}:${endDate}`;
      const cached = cacheGet(cacheKey);
      if (cached) {
        setReachoutTotals(cached.totals);
        setReachoutRows(cached.rows);
        lastReachoutKeyRef.current = cacheKey;
        return;
      }

      setReachoutLoading(true);
      try {
        const experts = healthExperts.length ? healthExperts : await fetchHealthExperts();

        const rows = await Promise.all(
          (experts || []).map(async (expert) => {
            try {
              const res = await axios.get(`${API_BASE}/api/reachout-logs/count`, {
                params: {
                  startDate,
                  endDate,
                  healthExpertAssigned: expert.fullName,
                },
              });
              const d = res.data || {};
              return {
                healthExpertAssigned: expert.fullName,
                totalCount: Number(d.totalCount || 0),
                WhatsApp: Number(d.WhatsApp || 0),
                Call: Number(d.Call || 0),
                Both: Number(d.Both || 0),
              };
            } catch {
              return {
                healthExpertAssigned: expert.fullName,
                totalCount: 0,
                WhatsApp: 0,
                Call: 0,
                Both: 0,
              };
            }
          })
        );

        const totals = rows.reduce(
          (acc, r) => {
            acc.totalExperts += 1;
            acc.totalCount += Number(r.totalCount || 0);
            acc.WhatsApp += Number(r.WhatsApp || 0);
            acc.Call += Number(r.Call || 0);
            acc.Both += Number(r.Both || 0);
            return acc;
          },
          { totalExperts: 0, totalCount: 0, WhatsApp: 0, Call: 0, Both: 0 }
        );

        setReachoutRows(rows);
        setReachoutTotals(totals);

        cacheSet(cacheKey, { totals, rows });
        lastReachoutKeyRef.current = cacheKey;
      } catch (e) {
        console.error("Error fetching reachout logs:", e);
        setReachoutRows([]);
        setReachoutTotals({ totalExperts: 0, totalCount: 0, WhatsApp: 0, Call: 0, Both: 0 });
      } finally {
        setReachoutLoading(false);
      }
    },
    [healthExperts, fetchHealthExperts]
  );

  // -------------------------------------------
  // ✅ 5) COD vs Prepaid (cached by date)
  // -------------------------------------------
  const fetchCodPrepaid = useCallback(async (startDate, endDate) => {
    const cacheKey = `mrd:cod:${startDate}:${endDate}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      setCodRows(cached);
      return;
    }

    setCodLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/retention-sales/cod-prepaid-summary`, {
        params: { startDate, endDate },
      });
      const list = res.data || [];
      setCodRows(list);
      cacheSet(cacheKey, list);
    } catch (e) {
      console.error("Error fetching COD vs Prepaid:", e);
      setCodRows([]);
    } finally {
      setCodLoading(false);
    }
  }, []);

  // -------------------------------------------
  // Range handlers (NO Apply button)
  // -------------------------------------------
  const handleRangeChange = (e) => {
    const next = e.target.value;
    setRange(next);

    if (next !== "Custom range") {
      const { startDate, endDate } = getDateRange(next);
      setCustomStart("");
      setCustomEnd("");
      setEffectiveStart(startDate);
      setEffectiveEnd(endDate);
    }
  };

  const handleCustomStart = (val) => {
    setCustomStart(val);
    const norm = normalizeCustomDates(val, customEnd);
    if (range === "Custom range" && norm) {
      setEffectiveStart(norm.start);
      setEffectiveEnd(norm.end);
    }
  };

  const handleCustomEnd = (val) => {
    setCustomEnd(val);
    const norm = normalizeCustomDates(customStart, val);
    if (range === "Custom range" && norm) {
      setEffectiveStart(norm.start);
      setEffectiveEnd(norm.end);
    }
  };

  // -------------------------------------------
  // Initial load: experts list (cached) once
  // -------------------------------------------
  useEffect(() => {
    fetchHealthExperts();
  }, [fetchHealthExperts]);

  // -------------------------------------------
  // Load core sections on date change (only the essentials)
  // - Health Expert Summary (cards) + metrics (for toggle)
  // - Followup totals + rows (for toggle)
  // - Shipment summary
  // - COD totals (we need cards; table is toggle)
  // -------------------------------------------
  useEffect(() => {
    if (!effectiveStart || !effectiveEnd) return;

    fetchHealthExpertSummaryAndMetrics(effectiveStart, effectiveEnd);
    fetchFollowupSummaryAndMetrics(effectiveStart, effectiveEnd);
    fetchShipmentSummary(effectiveStart, effectiveEnd);
    fetchCodPrepaid(effectiveStart, effectiveEnd);
  }, [
    effectiveStart,
    effectiveEnd,
    fetchHealthExpertSummaryAndMetrics,
    fetchFollowupSummaryAndMetrics,
    fetchShipmentSummary,
    fetchCodPrepaid,
  ]);

  // -------------------------------------------
  // Agent-wise shipment on filter/date change
  // -------------------------------------------
  useEffect(() => {
    if (!selectedHealthExpert) {
      setAgentShipmentSummary([]);
      return;
    }
    fetchAgentShipment(selectedHealthExpert, effectiveStart, effectiveEnd);
  }, [selectedHealthExpert, effectiveStart, effectiveEnd, fetchAgentShipment]);

  // -------------------------------------------
  // Reachouts are LAZY: only fetch when user expands AND date changes
  // -------------------------------------------
  useEffect(() => {
    if (!showReachoutDetails) return;
    const key = `mrd:reachouts:${effectiveStart}:${effectiveEnd}`;
    // avoid refetch jitter even before cache hit
    if (lastReachoutKeyRef.current === key && reachoutRows.length) return;
    fetchReachoutLogs(effectiveStart, effectiveEnd);
  }, [showReachoutDetails, effectiveStart, effectiveEnd, fetchReachoutLogs, reachoutRows.length]);

  // -------------------------------------------
  // Derived dates for links
  // -------------------------------------------
  const shipmentDates = useMemo(() => ({ startDate: effectiveStart, endDate: effectiveEnd }), [
    effectiveStart,
    effectiveEnd,
  ]);

  // -------------------------------------------
  // UI
  // -------------------------------------------
  return (
    <Box sx={{ px: { xs: 1.5, md: 3 }, py: 2, pb: 6 }}>
      {/* Top Bar: Heading LEFT, Range RIGHT */}
      <Paper sx={{ ...sectionPaperSx, maxWidth: 1220, mx: "auto", mb: 2.5 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            alignItems: { xs: "flex-start", md: "center" },
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 900, color: "#0F172A", letterSpacing: "0.2px" }}
            >
              Manager Retention Dashboard
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748B", mt: 0.4 }}>
              Range: <b>{shipmentDates.startDate}</b> to <b>{shipmentDates.endDate}</b>
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1.2, flexWrap: "wrap", alignItems: "center" }}>
            <TextField
              select
              label="Range"
              value={range}
              onChange={handleRangeChange}
              sx={{ width: 220 }}
              InputProps={{ sx: { borderRadius: 2 } }}
            >
              {timeRangeOptions.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </TextField>

            {range === "Custom range" && (
              <>
                <TextField
                  label="Start"
                  type="date"
                  value={customStart}
                  onChange={(e) => handleCustomStart(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: 160 }}
                  InputProps={{ sx: { borderRadius: 2 } }}
                />
                <TextField
                  label="End"
                  type="date"
                  value={customEnd}
                  onChange={(e) => handleCustomEnd(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: 160 }}
                  InputProps={{ sx: { borderRadius: 2 } }}
                />
                <Chip
                  label="Auto-applied"
                  size="small"
                  sx={{ borderRadius: 2, bgcolor: "#F1F5F9", color: "#0F172A", fontWeight: 700 }}
                />
              </>
            )}
          </Box>
        </Box>
      </Paper>

      {/* ===================== 1) HEALTH EXPERT SUMMARY ===================== */}
      <Paper sx={{ ...sectionPaperSx, maxWidth: 1220, mx: "auto", mb: 2.5 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A" }}>
            Health Expert’s Summary
          </Typography>

          <Button
            onClick={() => setShowHealthExpertMetrics((v) => !v)}
            variant="outlined"
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 800,
              borderColor: "#CBD5E1",
              color: "#0F172A",
              "&:hover": { borderColor: "#94A3B8", backgroundColor: "#F8FAFC" },
            }}
          >
            {showHealthExpertMetrics ? "Hide Health Expert Metrics" : "Show Health Expert Metrics"}
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* 4 cards in one line on desktop */}
        <Grid container spacing={1.5}>
          {[
            {
              label: "Active Customers",
              value: healthExpertSummary.totalActiveCustomers,
              icon: <AccountCircle sx={{ color: "#0EA5E9" }} />,
            },
            {
              label: "Sales Done",
              value: healthExpertSummary.totalSalesDone,
              icon: <ShoppingCart sx={{ color: "#16A34A" }} />,
            },
            {
              label: "Total Sales",
              value: `₹${fmt0(healthExpertSummary.totalSalesAmount)}`,
              icon: <CurrencyRupee sx={{ color: "#EF4444" }} />,
              onClick: () => setShowTotalSalesDialog(true),
              clickable: true,
            },
            {
              label: "Avg Order Value",
              value: `₹${fmt0(healthExpertSummary.avgOrderValue)}`,
              icon: <TrendingUp sx={{ color: "#7C3AED" }} />,
            },
          ].map((m) => (
            <Grid key={m.label} item xs={12} sm={6} md={3}>
              <Box
                onClick={m.onClick}
                sx={{
                  ...cardSx,
                  cursor: m.clickable ? "pointer" : "default",
                  outline: "none",
                }}
              >
                <Box sx={{ fontSize: 28, lineHeight: 1 }}>{m.icon}</Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#64748B",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                    }}
                  >
                    {m.label}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A" }}>
                    {summaryLoading ? <CircularProgress size={16} /> : m.value}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Drilldown */}
        <TotalSalesDrilldown
          open={showTotalSalesDialog}
          onClose={() => setShowTotalSalesDialog(false)}
          initialDates={{ startDate: effectiveStart, endDate: effectiveEnd }}
        />

        {/* Health Expert Metrics Table (toggle) */}
        {showHealthExpertMetrics && (
          <Box sx={{ mt: 2.5 }}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A", mb: 1 }}>
              Health Expert Metrics
            </Typography>

            <TableContainer sx={{ borderRadius: 2, border: "1px solid #E6E8EC" }} component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headerCellSx}>Health Expert Name</TableCell>
                    <TableCell sx={headerCellSx}>Active Customers</TableCell>
                    <TableCell sx={headerCellSx}>Sales Done</TableCell>
                    <TableCell sx={headerCellSx}>Total Sales</TableCell>
                    <TableCell sx={headerCellSx}>Avg Order Value</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {summaryLoading && (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ p: 0 }}>
                        <LinearProgress />
                      </TableCell>
                    </TableRow>
                  )}

                  {!summaryLoading && (healthExpertMetrics || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 2, color: "#64748B" }}>
                        No data available
                      </TableCell>
                    </TableRow>
                  )}

                  {!summaryLoading &&
                    (healthExpertMetrics || []).map((r, idx) => (
                      <TableRow
                        key={r.healthExpertName || idx}
                        sx={{
                          backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FBFDFF",
                          ...rowHoverSx,
                        }}
                      >
                        <TableCell sx={{ fontWeight: 800, color: "#0F172A" }}>
                          {r.healthExpertName}
                        </TableCell>
                        <TableCell align="center">{fmt0(r.activeCustomers)}</TableCell>
                        <TableCell align="center">{fmt0(r.salesDone)}</TableCell>
                        <TableCell align="center">₹{fmt2(r.totalSales)}</TableCell>
                        <TableCell align="center">₹{fmt2(r.avgOrderValue)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>

      {/* ===================== 2) FOLLOWUP SUMMARY ===================== */}
      <Paper sx={{ ...sectionPaperSx, maxWidth: 1220, mx: "auto", mb: 2.5 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A" }}>
            Followup Summary
          </Typography>

          <Button
            onClick={() => setShowFollowupMetrics((v) => !v)}
            variant="outlined"
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 800,
              borderColor: "#CBD5E1",
              color: "#0F172A",
              "&:hover": { borderColor: "#94A3B8", backgroundColor: "#F8FAFC" },
            }}
          >
            {showFollowupMetrics ? "Hide Followup Metrics" : "Show Followup Metrics"}
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* ✅ 6 cards in one line on md+ */}
        <Grid container spacing={1.5}>
          {[
            { label: "No Followup Set", value: followupTotals.totalNoFollowupSet, icon: <PersonOff sx={{ color: "#0F172A" }} /> },
            { label: "Missed", value: followupTotals.totalFollowupMissed, icon: <EventBusy sx={{ color: "#DC2626" }} /> },
            { label: "Followup Today", value: followupTotals.totalFollowupToday, icon: <EventAvailable sx={{ color: "#16A34A" }} /> },
            { label: "Tomorrow", value: followupTotals.totalFollowupTomorrow, icon: <Event sx={{ color: "#F59E0B" }} /> },
            { label: "Followup Later", value: followupTotals.totalFollowupLater, icon: <Update sx={{ color: "#0284C7" }} /> },
            { label: "Lost Customers", value: followupTotals.totalLostCustomers, icon: <HighlightOff sx={{ color: "#7C3AED" }} /> },
          ].map((m) => (
            <Grid key={m.label} item xs={12} sm={6} md={2}>
              <Box sx={cardSx}>
                <Box sx={{ fontSize: 28, lineHeight: 1 }}>{m.icon}</Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#64748B",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                    }}
                  >
                    {m.label}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A" }}>
                    {followupLoading ? <CircularProgress size={16} /> : fmt0(m.value)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Followup Metrics Table (toggle) */}
        {showFollowupMetrics && (
          <Box sx={{ mt: 2.5 }}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A", mb: 1 }}>
              Health Expert Followup Metrics
            </Typography>

            <TableContainer sx={{ borderRadius: 2, border: "1px solid #E6E8EC" }} component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headerCellSx}>Health Expert Name</TableCell>
                    <TableCell sx={headerCellSx}>No Followup Set</TableCell>
                    <TableCell sx={headerCellSx}>Missed</TableCell>
                    <TableCell sx={headerCellSx}>Today</TableCell>
                    <TableCell sx={headerCellSx}>Tomorrow</TableCell>
                    <TableCell sx={headerCellSx}>Later</TableCell>
                    <TableCell sx={headerCellSx}>Lost Customers</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {followupLoading && (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ p: 0 }}>
                        <LinearProgress />
                      </TableCell>
                    </TableRow>
                  )}

                  {!followupLoading && (followupRows || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 2, color: "#64748B" }}>
                        No data available
                      </TableCell>
                    </TableRow>
                  )}

                  {!followupLoading &&
                    (followupRows || []).map((r, idx) => (
                      <TableRow
                        key={r.agentName || r.healthExpertName || idx}
                        sx={{
                          backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FBFDFF",
                          ...rowHoverSx,
                        }}
                      >
                        <TableCell sx={{ fontWeight: 800, color: "#0F172A" }}>
                          {r.agentName || r.healthExpertName || "—"}
                        </TableCell>
                        <TableCell align="center">{fmt0(r.noFollowupSet)}</TableCell>
                        <TableCell align="center">{fmt0(r.followupMissed)}</TableCell>
                        <TableCell align="center">{fmt0(r.followupToday)}</TableCell>
                        <TableCell align="center">{fmt0(r.followupTomorrow)}</TableCell>
                        <TableCell align="center">{fmt0(r.followupLater)}</TableCell>
                        <TableCell align="center">{fmt0(r.lostCustomers)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>

      {/* ===================== 3) SHIPMENT SUMMARY ===================== */}
      <Paper sx={{ ...sectionPaperSx, maxWidth: 1220, mx: "auto", mb: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A" }}>
          Shipment Status Summary
        </Typography>
        <Typography variant="body2" sx={{ color: "#64748B", mt: 0.5 }}>
          Click any row to open details in a new tab.
        </Typography>

        <Divider sx={{ my: 2 }} />

        {/* Overall shipment summary */}
        <TableContainer sx={{ borderRadius: 2, border: "1px solid #E6E8EC" }} component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellSx}>Category</TableCell>
                <TableCell sx={headerCellSx}>Count</TableCell>
                <TableCell sx={headerCellSx}>Amount</TableCell>
                <TableCell sx={headerCellSx}>Percentage</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {shipmentLoading && (
                <TableRow>
                  <TableCell colSpan={4} sx={{ p: 0 }}>
                    <LinearProgress />
                  </TableCell>
                </TableRow>
              )}

              {!shipmentLoading && (shipmentSummary || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 2, color: "#64748B" }}>
                    No data available
                  </TableCell>
                </TableRow>
              )}

              {!shipmentLoading &&
                (shipmentSummary || []).map((row, idx) => {
                  const amount = row.totalAmount ?? row.amount ?? 0;
                  return (
                    <TableRow
                      key={`${row.category}-${idx}`}
                      component={RouterLink}
                      to={`/shipment-details?category=${encodeURIComponent(
                        row.category
                      )}&startDate=${shipmentDates.startDate}&endDate=${shipmentDates.endDate}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        textDecoration: "none",
                        backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FBFDFF",
                        cursor: "pointer",
                        ...rowHoverSx,
                      }}
                    >
                      <TableCell sx={{ fontWeight: 800, color: "#0F172A" }} align="center">
                        {row.category}
                      </TableCell>
                      <TableCell align="center">{fmt0(row.count)}</TableCell>
                      <TableCell align="center">₹{fmt2(amount)}</TableCell>
                      <TableCell align="center">{row.percentage}%</TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Agent-wise shipment */}
        <Box sx={{ mt: 3 }}>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              alignItems: { xs: "flex-start", md: "center" },
              justifyContent: "space-between",
              flexWrap: "wrap",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A" }}>
              Health Expert Wise Shipment Status
            </Typography>

            <FormControl sx={{ minWidth: 280 }}>
              <Select
                value={selectedHealthExpert}
                onChange={(e) => setSelectedHealthExpert(e.target.value)}
                displayEmpty
                IconComponent={ExpandMoreIcon}
                sx={{ borderRadius: 2, backgroundColor: "#FFFFFF" }}
              >
                <MenuItem value="">
                  <em>Select Health Expert</em>
                </MenuItem>
                {(healthExperts || []).map((e) => (
                  <MenuItem key={e._id} value={e.fullName}>
                    {e.fullName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Divider sx={{ my: 2 }} />

          <TableContainer sx={{ borderRadius: 2, border: "1px solid #E6E8EC" }} component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headerCellSx}>Category</TableCell>
                  <TableCell sx={headerCellSx}>Count</TableCell>
                  <TableCell sx={headerCellSx}>Amount</TableCell>
                  <TableCell sx={headerCellSx}>Percentage</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {agentShipmentLoading && (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ p: 0 }}>
                      <LinearProgress />
                    </TableCell>
                  </TableRow>
                )}

                {!agentShipmentLoading && !selectedHealthExpert && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 2, color: "#64748B" }}>
                      Please select a Health Expert.
                    </TableCell>
                  </TableRow>
                )}

                {!agentShipmentLoading && selectedHealthExpert && (agentShipmentSummary || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 2, color: "#64748B" }}>
                      No shipment data for this Health Expert.
                    </TableCell>
                  </TableRow>
                )}

                {!agentShipmentLoading &&
                  selectedHealthExpert &&
                  (agentShipmentSummary || []).map((row, idx) => {
                    const amount = row.totalAmount ?? row.amount ?? 0;
                    return (
                      <TableRow
                        key={`${row.category}-${idx}`}
                        component={RouterLink}
                        to={`/shipment-details?agent=${encodeURIComponent(
                          selectedHealthExpert
                        )}&category=${encodeURIComponent(
                          row.category
                        )}&startDate=${shipmentDates.startDate}&endDate=${shipmentDates.endDate}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          textDecoration: "none",
                          backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FBFDFF",
                          cursor: "pointer",
                          ...rowHoverSx,
                        }}
                      >
                        <TableCell sx={{ fontWeight: 800, color: "#0F172A" }} align="center">
                          {row.category}
                        </TableCell>
                        <TableCell align="center">{fmt0(row.count)}</TableCell>
                        <TableCell align="center">₹{fmt2(amount)}</TableCell>
                        <TableCell align="center">{row.percentage}%</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>

      {/* ===================== 4) REACHED OUT LOGS ===================== */}
      <Paper sx={{ ...sectionPaperSx, maxWidth: 1220, mx: "auto", mb: 2.5 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A" }}>
            Reached Out Logs
          </Typography>

          <Button
            onClick={() => setShowReachoutDetails((v) => !v)}
            variant="outlined"
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 800,
              borderColor: "#CBD5E1",
              color: "#0F172A",
              "&:hover": { borderColor: "#94A3B8", backgroundColor: "#F8FAFC" },
            }}
          >
            {showReachoutDetails ? "Hide Reached Out Logs Summary" : "Show Reached Out Logs Summary"}
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Totals row (shows after data loaded; otherwise shows —) */}
        <Grid container spacing={1.5}>
          {[
            { label: "Total Health Experts", value: reachoutTotals.totalExperts, icon: <Groups sx={{ color: "#0F172A" }} /> },
            { label: "Total Reachouts", value: reachoutTotals.totalCount, icon: <AssignmentTurnedIn sx={{ color: "#16A34A" }} /> },
            { label: "WhatsApp", value: reachoutTotals.WhatsApp, icon: <WhatsApp sx={{ color: "#16A34A" }} /> },
            { label: "Call", value: reachoutTotals.Call, icon: <Call sx={{ color: "#0284C7" }} /> },
            { label: "Both", value: reachoutTotals.Both, icon: <Update sx={{ color: "#7C3AED" }} /> },
          ].map((m) => (
            <Grid key={m.label} item xs={12} sm={6} md={2.4}>
              <Box sx={cardSx}>
                <Box sx={{ fontSize: 28, lineHeight: 1 }}>{m.icon}</Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#64748B",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                    }}
                  >
                    {m.label}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A" }}>
                    {reachoutLoading ? <CircularProgress size={16} /> : fmt0(m.value)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Details table (toggle) */}
        {showReachoutDetails && (
          <Box sx={{ mt: 2.5 }}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A", mb: 1 }}>
              Reached Out Logs Summary
            </Typography>

            <TableContainer sx={{ borderRadius: 2, border: "1px solid #E6E8EC" }} component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headerCellSx}>Health Expert Assigned</TableCell>
                    <TableCell sx={headerCellSx}>Total Reachouts</TableCell>
                    <TableCell sx={headerCellSx}>WhatsApp</TableCell>
                    <TableCell sx={headerCellSx}>Call</TableCell>
                    <TableCell sx={headerCellSx}>Both</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {reachoutLoading && (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ p: 0 }}>
                        <LinearProgress />
                      </TableCell>
                    </TableRow>
                  )}

                  {!reachoutLoading && (reachoutRows || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 2, color: "#64748B" }}>
                        No data available
                      </TableCell>
                    </TableRow>
                  )}

                  {!reachoutLoading &&
                    (reachoutRows || []).map((r, idx) => (
                      <TableRow
                        key={`${r.healthExpertAssigned}-${idx}`}
                        sx={{
                          backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FBFDFF",
                          ...rowHoverSx,
                        }}
                      >
                        <TableCell sx={{ fontWeight: 800, color: "#0F172A" }}>
                          {r.healthExpertAssigned}
                        </TableCell>
                        <TableCell align="center">{fmt0(r.totalCount)}</TableCell>
                        <TableCell align="center">{fmt0(r.WhatsApp)}</TableCell>
                        <TableCell align="center">{fmt0(r.Call)}</TableCell>
                        <TableCell align="center">{fmt0(r.Both)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>

      {/* ===================== 5) COD vs PREPAID ===================== */}
      <Paper sx={{ ...sectionPaperSx, maxWidth: 1220, mx: "auto" }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A" }}>
            COD vs Prepaid
          </Typography>

          <Button
            onClick={() => setShowCodDetails((v) => !v)}
            variant="outlined"
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 800,
              borderColor: "#CBD5E1",
              color: "#0F172A",
              "&:hover": { borderColor: "#94A3B8", backgroundColor: "#F8FAFC" },
            }}
          >
            {showCodDetails ? "Hide COD vs Prepaid Summary" : "Show COD vs Prepaid Summary"}
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* ✅ Top summary (all in one line on desktop) */}
        <Grid container spacing={1.5}>
          {[
            { label: "Total Orders", value: codTotals.totalOrders, icon: <ShoppingCart sx={{ color: "#0F172A" }} /> },
            { label: "COD Orders", value: codTotals.totalCOD, icon: <CurrencyRupee sx={{ color: "#EF4444" }} /> },
            { label: "Prepaid Orders", value: codTotals.totalPrepaid, icon: <CurrencyRupee sx={{ color: "#16A34A" }} /> },
            { label: "COD %", value: `${codTotals.codPercent}%`, icon: <TrendingUp sx={{ color: "#F59E0B" }} /> },
            { label: "Prepaid %", value: `${codTotals.prepaidPercent}%`, icon: <TrendingUp sx={{ color: "#0284C7" }} /> },
          ].map((m) => (
            <Grid key={m.label} item xs={12} sm={6} md={2.4}>
              <Box sx={cardSx}>
                <Box sx={{ fontSize: 28, lineHeight: 1 }}>{m.icon}</Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#64748B",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                    }}
                  >
                    {m.label}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A" }}>
                    {codLoading ? <CircularProgress size={16} /> : m.value}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Details table (toggle) */}
        {showCodDetails && (
          <Box sx={{ mt: 2.5 }}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A", mb: 1 }}>
              COD vs Prepaid Summary
            </Typography>

            <TableContainer sx={{ borderRadius: 2, border: "1px solid #E6E8EC" }} component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headerCellSx}>Health Expert Name</TableCell>
                    <TableCell sx={headerCellSx}>Total Orders</TableCell>
                    <TableCell sx={headerCellSx}>COD Orders</TableCell>
                    <TableCell sx={headerCellSx}>Prepaid Orders</TableCell>
                    <TableCell sx={headerCellSx}>COD %</TableCell>
                    <TableCell sx={headerCellSx}>Prepaid %</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {codLoading && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ p: 0 }}>
                        <LinearProgress />
                      </TableCell>
                    </TableRow>
                  )}

                  {!codLoading && (codRows || []).length > 0 && (
                    <TableRow sx={{ backgroundColor: "#EEF6FF" }}>
                      <TableCell sx={{ fontWeight: 900 }}>TOTAL</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>
                        {codTotals.totalOrders}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>
                        {codTotals.totalCOD}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>
                        {codTotals.totalPrepaid}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>
                        {codTotals.codPercent}%
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>
                        {codTotals.prepaidPercent}%
                      </TableCell>
                    </TableRow>
                  )}

                  {!codLoading && (codRows || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 2, color: "#64748B" }}>
                        No data available
                      </TableCell>
                    </TableRow>
                  )}

                  {!codLoading &&
                    (codRows || []).map((r, idx) => {
                      const total = Number(r.totalOrders || 0);
                      const cod = Number(r.codOrders || 0);
                      const prepaid = Number(r.prepaidOrders || 0);
                      const codPct = total > 0 ? ((cod / total) * 100).toFixed(1) : "0.0";
                      const prepaidPct = total > 0 ? ((prepaid / total) * 100).toFixed(1) : "0.0";

                      return (
                        <TableRow
                          key={`${r.agentName}-${idx}`}
                          sx={{
                            backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FBFDFF",
                            ...rowHoverSx,
                          }}
                        >
                          <TableCell sx={{ fontWeight: 800, color: "#0F172A" }}>
                            {r.agentName || "—"}
                          </TableCell>
                          <TableCell align="center">{total}</TableCell>
                          <TableCell align="center">{cod}</TableCell>
                          <TableCell align="center">{prepaid}</TableCell>
                          <TableCell align="center">{codPct}%</TableCell>
                          <TableCell align="center">{prepaidPct}%</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ManagerRetentionDashboard;
