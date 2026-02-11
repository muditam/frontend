// ✅ Updated: adds simple caching + makes Sales(6) and Followup(5) cards in one line (desktop)
// Notes:
// - Cache key includes range + dates + agentFilter (for shipment/cod filtering)
// - TTL is configurable (default 3 minutes)
// - Uses sessionStorage (clears on tab close). Change to localStorage if you want persistence.

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  Select,
  FormControl,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from "@mui/material";
import axios from "axios";

import {
  Assignment,
  BarChart,
  CurrencyRupee,
  CurrencyRupeeOutlined,
  EventAvailable,
  EventBusy,
  MoreTime,
  Schedule,
  ShoppingCart,
  Today,
  TrendingUp,
} from "@mui/icons-material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

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

const cardSx = {
  p: 2,
  display: "flex",
  gap: 1.5,
  alignItems: "center",
  borderRadius: 2,
  border: "1px solid #E6E8EC",
  backgroundColor: "#FFFFFF",
  boxShadow: "0 1px 8px rgba(16, 24, 40, 0.06)",
  transition: "120ms ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 8px 22px rgba(16, 24, 40, 0.10)",
  },
};

const sectionPaperSx = {
  p: { xs: 2, md: 2.5 },
  borderRadius: 3,
  border: "1px solid #E6E8EC",
  backgroundColor: "#FFFFFF",
  boxShadow: "0 10px 30px rgba(16, 24, 40, 0.06)",
};

const ManagerSalesDashboard = () => {
  const [user, setUser] = useState(null);

  // Time range
  const [range, setRange] = useState("Today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const initialDates = useMemo(() => getDateRange("Today"), []);
  const [effectiveStart, setEffectiveStart] = useState(initialDates.startDate);
  const [effectiveEnd, setEffectiveEnd] = useState(initialDates.endDate);

  // Agents (for Shipment + COD sections)
  const [agents, setAgents] = useState(["All Agents"]);
  const [agentFilter, setAgentFilter] = useState("All Agents");

  // Sales Summary
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesSummary, setSalesSummary] = useState({
    openLeads: undefined,
    leadsAssigned: undefined,
    salesDone: undefined,
    conversionRate: undefined,
    totalSales: undefined,
    avgOrderValue: undefined,
  });
  const [todayStats, setTodayStats] = useState([]);
  const [showAgentPerformance, setShowAgentPerformance] = useState(false);

  // Followup Summary
  const [followupLoading, setFollowupLoading] = useState(false);
  const [followupStats, setFollowupStats] = useState([]);

  // Shipment Summary
  const [shipmentLoading, setShipmentLoading] = useState(false);
  const [shipmentData, setShipmentData] = useState([]);

  // COD vs Prepaid Summary
  const [codLoading, setCodLoading] = useState(false);
  const [codPrepaidStats, setCodPrepaidStats] = useState([]);

  // Sales Done Order IDs popup
  const [orderIdsPopupOpen, setOrderIdsPopupOpen] = useState(false);
  const [orderIds, setOrderIds] = useState("");

  // -------------------------------------------
  // Init user
  // -------------------------------------------
  useEffect(() => {
    const loggedInUser = JSON.parse(sessionStorage.getItem("user"));
    if (loggedInUser?.role === "Manager") setUser(loggedInUser);
  }, []);

  // -------------------------------------------
  // Fetch agents (cached)
  // -------------------------------------------
  const fetchAgents = useCallback(async () => {
    const cacheKey = `msd:agents:sales`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      setAgents(cached);
      return;
    }

    try {
      const res = await axios.get(`${API_BASE}/api/employees`, {
        params: { role: "Sales Agent" },
      });

      const activeAgents = (res.data || [])
        .filter((a) => a?.status === "active")
        .map((a) => a.fullName)
        .filter(Boolean);

      const list = ["All Agents", ...activeAgents];
      setAgents(list);
      cacheSet(cacheKey, list);
    } catch (e) {
      console.error("Error fetching agents:", e);
      setAgents(["All Agents"]);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchAgents();
  }, [user, fetchAgents]);

  // -------------------------------------------
  // Handlers: Range
  // -------------------------------------------
  const handleRangeChange = (e) => {
    const newRange = e.target.value;
    setRange(newRange);

    if (newRange !== "Custom range") {
      const { startDate, endDate } = getDateRange(newRange);
      setCustomStart("");
      setCustomEnd("");
      setEffectiveStart(startDate);
      setEffectiveEnd(endDate);
    }
  };

  const applyCustomRange = () => {
    if (!customStart || !customEnd) return;

    const start = customStart <= customEnd ? customStart : customEnd;
    const end = customStart <= customEnd ? customEnd : customStart;

    setEffectiveStart(start);
    setEffectiveEnd(end);
  };

  // -------------------------------------------
  // Fetch: Sales Summary (cached)
  // -------------------------------------------
  const fetchSalesSummaryData = useCallback(async (startDate, endDate) => {
    const cacheKey = `msd:sales:${startDate}:${endDate}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      setSalesSummary(cached.salesSummary);
      setTodayStats(cached.todayStats);
      return;
    }

    setSalesLoading(true);
    try {
      const [metricsRes, overallRes] = await Promise.all([
        axios.get(`${API_BASE}/api/orders/combined/sales-metrics`, {
          params: { startDate, endDate },
        }),
        axios.get(`${API_BASE}/api/sales-summary`, {
          params: { startDate, endDate },
        }),
      ]);

      const { salesDone, totalSales, avgOrderValue } = metricsRes.data || {};
      const overall = overallRes.data?.overall || {};
      const leadsAssigned = Number(overall.leadsAssigned || 0);

      const conversionRate =
        leadsAssigned > 0
          ? ((Number(salesDone || 0) / leadsAssigned) * 100).toFixed(2)
          : "0.00";

      const nextSalesSummary = {
        openLeads: overall.openLeads ?? 0,
        leadsAssigned: overall.leadsAssigned ?? 0,
        salesDone: salesDone ?? 0,
        conversionRate,
        totalSales: totalSales ?? 0,
        avgOrderValue: avgOrderValue ?? 0,
      };

      const nextTodayStats = overallRes.data?.perAgent || [];

      setSalesSummary(nextSalesSummary);
      setTodayStats(nextTodayStats);

      cacheSet(cacheKey, { salesSummary: nextSalesSummary, todayStats: nextTodayStats });
    } catch (e) {
      console.error("Error fetching sales summary:", e);
      setSalesSummary({
        openLeads: 0,
        leadsAssigned: 0,
        salesDone: 0,
        conversionRate: "0.00",
        totalSales: 0,
        avgOrderValue: 0,
      });
      setTodayStats([]);
    } finally {
      setSalesLoading(false);
    }
  }, []);

  // -------------------------------------------
  // Fetch: Followup Summary (cached)
  // -------------------------------------------
  const fetchFollowupData = useCallback(async (startDate, endDate) => {
    const cacheKey = `msd:followup:${startDate}:${endDate}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      setFollowupStats(cached);
      return;
    }

    setFollowupLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/followup-summarys`, {
        params: { startDate, endDate },
      });
      const list = res.data?.followup || [];
      setFollowupStats(list);
      cacheSet(cacheKey, list);
    } catch (e) {
      console.error("Error fetching followup summary:", e);
      setFollowupStats([]);
    } finally {
      setFollowupLoading(false);
    }
  }, []);

  // -------------------------------------------
  // Fetch: Shipment Summary (cached; includes agent)
  // -------------------------------------------
  const fetchShipmentData = useCallback(async (startDate, endDate, agentName) => {
    const agentKey = agentName && agentName !== "All Agents" ? agentName : "ALL";
    const cacheKey = `msd:ship:${startDate}:${endDate}:${agentKey}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      setShipmentData(cached);
      return;
    }

    setShipmentLoading(true);
    try {
      const params = { startDate, endDate };
      if (agentName && agentName !== "All Agents") params.agentName = agentName;

      const res = await axios.get(`${API_BASE}/api/all-shipment-summary`, { params });
      const list = res.data || [];
      setShipmentData(list);
      cacheSet(cacheKey, list);
    } catch (e) {
      console.error("Error fetching shipment summary:", e);
      setShipmentData([]);
    } finally {
      setShipmentLoading(false);
    }
  }, []);

  // -------------------------------------------
  // Fetch: COD vs Prepaid (cached)
  // -------------------------------------------
  const fetchCODvsPrepaidData = useCallback(async (startDate, endDate) => {
    const cacheKey = `msd:cod:${startDate}:${endDate}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      setCodPrepaidStats(cached);
      return;
    }

    setCodLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/cod-prepaid-summary`, {
        params: { startDate, endDate },
      });
      const list = res.data || [];
      setCodPrepaidStats(list);
      cacheSet(cacheKey, list);
    } catch (e) {
      console.error("Error fetching COD vs Prepaid summary:", e);
      setCodPrepaidStats([]);
    } finally {
      setCodLoading(false);
    }
  }, []);

  // -------------------------------------------
  // Refetch data on date change
  // -------------------------------------------
  useEffect(() => {
    if (!user) return;
    fetchSalesSummaryData(effectiveStart, effectiveEnd);
    fetchFollowupData(effectiveStart, effectiveEnd);
    fetchCODvsPrepaidData(effectiveStart, effectiveEnd);
  }, [
    user,
    effectiveStart,
    effectiveEnd,
    fetchSalesSummaryData,
    fetchFollowupData,
    fetchCODvsPrepaidData,
  ]);

  // Shipment refetch on date or agent filter change
  useEffect(() => {
    if (!user) return;
    fetchShipmentData(effectiveStart, effectiveEnd, agentFilter);
  }, [user, effectiveStart, effectiveEnd, agentFilter, fetchShipmentData]);

  // -------------------------------------------
  // Order IDs popup
  // -------------------------------------------
  const handleSalesDoneClick = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/sales-order-ids`, { params: {} });
      const ids = (res.data?.orderIds || []).join(", ");
      setOrderIds(ids || "No order IDs available");
    } catch (e) {
      console.error("Error fetching order IDs:", e);
      setOrderIds("No order IDs available");
    }
    setOrderIdsPopupOpen(true);
  };

  // -------------------------------------------
  // Derived followup totals
  // -------------------------------------------
  const followupTotals = useMemo(() => {
    const sumKey = (key) =>
      (followupStats || []).reduce((acc, s) => acc + Number(s?.[key] || 0), 0);

    return {
      noFollowupSet: sumKey("noFollowupSet"),
      followupMissed: sumKey("followupMissed"),
      followupToday: sumKey("followupToday"),
      followupTomorrow: sumKey("followupTomorrow"),
      followupLater: sumKey("followupLater"),
    };
  }, [followupStats]);

  // -------------------------------------------
  // COD client-side filter + totals
  // -------------------------------------------
  const codRows = useMemo(() => {
    if (agentFilter === "All Agents") return codPrepaidStats || [];
    return (codPrepaidStats || []).filter((r) => r?.agentName === agentFilter);
  }, [codPrepaidStats, agentFilter]);

  const codTotals = useMemo(() => {
    const totalOrders = codRows.reduce((acc, a) => acc + Number(a?.totalOrders || 0), 0);
    const totalCOD = codRows.reduce((acc, a) => acc + Number(a?.codOrders || 0), 0);
    const totalPrepaid = codRows.reduce((acc, a) => acc + Number(a?.prepaidOrders || 0), 0);

    const codPercent = totalOrders > 0 ? ((totalCOD / totalOrders) * 100).toFixed(1) : "0.0";
    const prepaidPercent =
      totalOrders > 0 ? ((totalPrepaid / totalOrders) * 100).toFixed(1) : "0.0";

    return { totalOrders, totalCOD, totalPrepaid, codPercent, prepaidPercent };
  }, [codRows]);

  if (!user) return null;

  return (
    <Box sx={{ px: { xs: 1.5, md: 3 }, py: 2, pb: 6 }}>
      {/* Global Controls */}
      <Paper sx={{ ...sectionPaperSx, maxWidth: 1190, mx: "auto", mb: 2.5 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography
              variant="h4"
              fontWeight={800}
              sx={{
                textAlign: "center",
                color: "#0F172A",
                letterSpacing: "0.2px",
                fontSize: { xs: "1.6rem", md: "2.1rem" },
              }}
            >
              {user?.fullName ? `${user.fullName} • Sales Team Dashboard` : "Sales Team Dashboard"}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
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
                  onChange={(e) => setCustomStart(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: 160 }}
                  InputProps={{ sx: { borderRadius: 2 } }}
                />
                <TextField
                  label="End"
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: 160 }}
                  InputProps={{ sx: { borderRadius: 2 } }}
                />
                <Button
                  variant="contained"
                  onClick={applyCustomRange}
                  sx={{
                    borderRadius: 2,
                    px: 2.5,
                    py: 1.2,
                    textTransform: "none",
                    fontWeight: 700,
                    backgroundColor: "#111827",
                    "&:hover": { backgroundColor: "#0B1220" },
                  }}
                >
                  Apply
                </Button>
              </>
            )}
          </Box>
        </Box>
      </Paper>

      {/* ===================== 1) SALES SUMMARY ===================== */}
      <Paper sx={{ ...sectionPaperSx, maxWidth: 1190, mx: "auto", mb: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#0F172A" }}>
              Sales Summary
            </Typography>
          </Box>

          <Button
            onClick={() => setShowAgentPerformance((v) => !v)}
            variant="outlined"
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700,
              borderColor: "#CBD5E1",
              color: "#0F172A",
              "&:hover": { borderColor: "#94A3B8", backgroundColor: "#F8FAFC" },
            }}
          >
            {showAgentPerformance ? "Hide Agent Performance" : "Show Agent Performance"}
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* ✅ Sales: 6 in one line (desktop) */}
        <Grid container spacing={1.5}>
          {[
            {
              label: "Open Leads",
              value: salesSummary.openLeads,
              icon: <TrendingUp sx={{ color: "#1976D2" }} />,
            },
            {
              label: "Leads Assigned",
              value: salesSummary.leadsAssigned,
              icon: <Assignment sx={{ color: "#FF9800" }} />,
            },
            {
              label: "Sales Done",
              value: salesSummary.salesDone,
              icon: (
                <ShoppingCart
                  sx={{ color: "#16A34A", cursor: "pointer" }}
                  onClick={handleSalesDoneClick}
                />
              ),
            },
            {
              label: "Conversion %",
              value:
                salesSummary.conversionRate !== undefined
                  ? `${salesSummary.conversionRate}%`
                  : undefined,
              icon: <BarChart sx={{ color: "#7C3AED" }} />,
            },
            {
              label: "Total Sales",
              value:
                salesSummary.totalSales !== undefined
                  ? `₹${fmt0(salesSummary.totalSales)}`
                  : undefined,
              icon: <CurrencyRupee sx={{ color: "#EF4444" }} />,
            },
            {
              label: "AOV",
              value:
                salesSummary.avgOrderValue !== undefined
                  ? `₹${fmt0(salesSummary.avgOrderValue)}`
                  : undefined,
              icon: <CurrencyRupeeOutlined sx={{ color: "#0EA5E9" }} />,
            },
          ].map((m) => (
            <Grid
              key={m.label}
              item
              xs={12}
              sm={6}
              md={2} // ✅ 6 cards in one line on md+
              lg={2}
            >
              <Box sx={{ ...cardSx, p: 1.4 }}>
                <Box sx={{ fontSize: 28, lineHeight: 1 }}>{m.icon}</Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="caption"
                    sx={{ color: "#64748B", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.4px" }}
                  >
                    {m.label}
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 900, color: "#0F172A", lineHeight: 1.2 }}
                  >
                    {salesLoading ? <CircularProgress size={16} /> : m.value ?? "—"}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Agent Performance (toggle) */}
        {showAgentPerformance && (
          <Box sx={{ mt: 2.5 }}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A", mb: 1 }}>
              Agent Performance
            </Typography>

            <TableContainer sx={{ borderRadius: 2, border: "1px solid #E6E8EC" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#F8FAFC" }}>
                    {[
                      "Agent Name",
                      "Open Leads",
                      "Leads Assigned",
                      "Sales Done",
                      "Conversion Rate",
                      "Total Sales",
                      "Average Order Value",
                    ].map((h) => (
                      <TableCell
                        key={h}
                        align="center"
                        sx={{ fontWeight: 900, color: "#334155", py: 1.2 }}
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {salesLoading && (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ p: 0 }}>
                        <LinearProgress />
                      </TableCell>
                    </TableRow>
                  )}

                  {!salesLoading && (todayStats || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 2, color: "#64748B" }}>
                        No data available
                      </TableCell>
                    </TableRow>
                  )}

                  {!salesLoading &&
                    (todayStats || []).map((row, idx) => (
                      <TableRow
                        key={row.agentName || idx}
                        sx={{
                          backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FBFDFF",
                          "&:hover": { backgroundColor: "#F1F5F9" },
                        }}
                      >
                        <TableCell sx={{ fontWeight: 800, color: "#0F172A" }}>
                          {row.agentName || "—"}
                        </TableCell>
                        <TableCell align="center">{row.openLeads || 0}</TableCell>
                        <TableCell align="center">{row.leadsAssigned || 0}</TableCell>
                        <TableCell align="center">{row.salesDone || 0}</TableCell>
                        <TableCell align="center">{row.conversionRate || 0}%</TableCell>
                        <TableCell align="center">₹{fmt0(row.totalSales || 0)}</TableCell>
                        <TableCell align="center">₹{fmt0(row.avgOrderValue || 0)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>

      {/* ===================== 2) FOLLOWUP SUMMARY ===================== */}
      <Paper sx={{ ...sectionPaperSx, maxWidth: 1190, mx: "auto", mb: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: "#0F172A" }}>
          Followup Summary
        </Typography>

        {/* ✅ Followup: 5 in one line (desktop) */}
        <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
          {[
            {
              label: "No Followup",
              value: followupTotals.noFollowupSet,
              icon: <Schedule sx={{ color: "#475569" }} />,
            },
            {
              label: "Missed",
              value: followupTotals.followupMissed,
              icon: <EventBusy sx={{ color: "#DC2626" }} />,
            },
            {
              label: "Today",
              value: followupTotals.followupToday,
              icon: <Today sx={{ color: "#16A34A" }} />,
            },
            {
              label: "Tomorrow",
              value: followupTotals.followupTomorrow,
              icon: <EventAvailable sx={{ color: "#F59E0B" }} />,
            },
            {
              label: "Later",
              value: followupTotals.followupLater,
              icon: <MoreTime sx={{ color: "#0284C7" }} />,
            },
          ].map((m) => (
            <Grid
              key={m.label}
              item
              xs={12}
              sm={6}
              md={2.4} // ✅ 5 cards in one line on md+ (MUI supports decimal columns)
              lg={2.4}
            >
              <Box sx={{ ...cardSx, p: 1.4 }}>
                <Box sx={{ fontSize: 28, lineHeight: 1 }}>{m.icon}</Box>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: "#64748B", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.4px" }}
                  >
                    {m.label}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A", lineHeight: 1.2 }}>
                    {followupLoading ? <CircularProgress size={16} /> : fmt0(m.value)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* ===================== 3) SHIPMENT SUMMARY ===================== */}
      <Paper sx={{ ...sectionPaperSx, maxWidth: 1190, mx: "auto", mb: 2.5 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "flex-start", md: "center" },
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
            mb: 1.5,
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#0F172A" }}>
              Shipment Status Summary
            </Typography>
          </Box>

          <FormControl sx={{ minWidth: 240 }}>
            <Select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              IconComponent={ExpandMoreIcon}
              sx={{
                borderRadius: 2,
                backgroundColor: "#FFFFFF",
              }}
            >
              {agents.map((a) => (
                <MenuItem key={a} value={a}>
                  {a}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <TableContainer sx={{ borderRadius: 2, border: "1px solid #E6E8EC" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#F8FAFC" }}>
                {["Category", "Count", "Amount", "Percentage"].map((h) => (
                  <TableCell
                    key={h}
                    align="center"
                    sx={{ fontWeight: 900, color: "#334155", py: 1.2 }}
                  >
                    {h}
                  </TableCell>
                ))}
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

              {!shipmentLoading && (shipmentData || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 2, color: "#64748B" }}>
                    No data available
                  </TableCell>
                </TableRow>
              )}

              {!shipmentLoading &&
                (shipmentData || []).map((row, idx) => (
                  <TableRow
                    key={`${row.category}-${idx}`}
                    sx={{
                      backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FBFDFF",
                      "&:hover": { backgroundColor: "#F1F5F9" },
                    }}
                  >
                    <TableCell align="center" sx={{ fontWeight: 800, color: "#0F172A" }}>
                      {row.category}
                    </TableCell>
                    <TableCell align="center">{row.count}</TableCell>
                    <TableCell align="center">₹{fmt2(row.amount)}</TableCell>
                    <TableCell align="center">{row.percentage}%</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ===================== 4) COD vs PREPAID ===================== */}
      <Paper sx={{ ...sectionPaperSx, maxWidth: 1190, mx: "auto" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "flex-start", md: "center" },
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
            mb: 1.5,
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#0F172A" }}>
              COD vs Prepaid Summary
            </Typography>
          </Box>

          <FormControl sx={{ minWidth: 240 }}>
            <Select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              IconComponent={ExpandMoreIcon}
              sx={{
                borderRadius: 2,
                backgroundColor: "#FFFFFF",
              }}
            >
              {agents.map((a) => (
                <MenuItem key={a} value={a}>
                  {a}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <TableContainer sx={{ borderRadius: 2, border: "1px solid #E6E8EC" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#F8FAFC" }}>
                {["Agent Name", "Total Orders", "COD Orders", "Prepaid Orders", "COD %", "Prepaid %"].map(
                  (h) => (
                    <TableCell
                      key={h}
                      align="center"
                      sx={{ fontWeight: 900, color: "#334155", py: 1.2 }}
                    >
                      {h}
                    </TableCell>
                  )
                )}
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

              {!codLoading && codRows.length > 0 && (
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

              {!codLoading && codRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 2, color: "#64748B" }}>
                    No data available
                  </TableCell>
                </TableRow>
              )}

              {!codLoading &&
                codRows.map((row, idx) => (
                  <TableRow
                    key={`${row.agentName}-${idx}`}
                    sx={{
                      backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FBFDFF",
                      "&:hover": { backgroundColor: "#F1F5F9" },
                    }}
                  >
                    <TableCell sx={{ fontWeight: 800, color: "#0F172A" }}>{row.agentName}</TableCell>
                    <TableCell align="center">{row.totalOrders}</TableCell>
                    <TableCell align="center">{row.codOrders}</TableCell>
                    <TableCell align="center">{row.prepaidOrders}</TableCell>
                    <TableCell align="center">{row.codPercentage}%</TableCell>
                    <TableCell align="center">{row.prepaidPercentage}%</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Order IDs Dialog */}
      <Dialog open={orderIdsPopupOpen} onClose={() => setOrderIdsPopupOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Sales Done Order IDs</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#0F172A" }}>{orderIds || "No order IDs available"}</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOrderIdsPopupOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManagerSalesDashboard;
