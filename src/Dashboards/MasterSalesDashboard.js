// ✅ Fixed: compact shipment cards | COD cards only + breakdown option | decoupled agent filters
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
  Chip,
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
  LocalShipping,
  DirectionsBike,
  AssignmentReturn,
  MoreHoriz,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import { Inventory } from "@mui/icons-material";


// -------------------------------------------
// Config
// -------------------------------------------
const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com"; // Change to your actual backend URL
const CACHE_TTL_MS = 3 * 60 * 1000;


const timeRangeOptions = [
  "Custom range", "Today", "Yesterday", "Last 7 days", "Last 30 days",
  "Week to date", "Month to date", "Year to date", "Last 90 days",
  "Last 365 days", "Last month", "Last 12 months", "Last year", "Quarter to date",
];


const toISODateLocal = (d) => {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
};


const getDateRange = (rangeValue) => {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);
  switch (rangeValue) {
    case "Today": break;
    case "Yesterday":
      start.setDate(now.getDate() - 1); end = new Date(start); break;
    case "Last 7 days": start.setDate(now.getDate() - 6); break;
    case "Last 30 days": start.setDate(now.getDate() - 29); break;
    case "Week to date": {
      const diff = now.getDay() === 0 ? 6 : now.getDay() - 1;
      start.setDate(now.getDate() - diff); break;
    }
    case "Month to date":
      start = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case "Year to date":
      start = new Date(now.getFullYear(), 0, 1); break;
    case "Last 90 days": start.setDate(now.getDate() - 89); break;
    case "Last 365 days": start.setDate(now.getDate() - 364); break;
    case "Last month": {
      const m = now.getMonth() - 1 < 0 ? 11 : now.getMonth() - 1;
      const y = now.getMonth() - 1 < 0 ? now.getFullYear() - 1 : now.getFullYear();
      return { startDate: toISODateLocal(new Date(y, m, 1)), endDate: toISODateLocal(new Date(y, m + 1, 0)) };
    }
    case "Last 12 months": start.setFullYear(now.getFullYear() - 1); break;
    case "Last year": {
      const y = now.getFullYear() - 1;
      return { startDate: toISODateLocal(new Date(y, 0, 1)), endDate: toISODateLocal(new Date(y, 11, 31)) };
    }
    case "Quarter to date": {
      const qm = now.getMonth() - (now.getMonth() % 3);
      start = new Date(now.getFullYear(), qm, 1); break;
    }
    default: break;
  }
  return { startDate: toISODateLocal(start), endDate: toISODateLocal(end) };
};


// -------------------------------------------
// Formatters
// -------------------------------------------
const fmt0 = (n) => Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const fmt2 = (n) => Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });


// -------------------------------------------
// Cache helpers
// -------------------------------------------
const cacheGet = (key) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || Date.now() - parsed.ts > CACHE_TTL_MS) { sessionStorage.removeItem(key); return null; }
    return parsed.data ?? null;
  } catch { return null; }
};
const cacheSet = (key, data) => {
  try { sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch { }
};


// -------------------------------------------
// Shared sx
// -------------------------------------------
const cardSx = {
  p: 2, display: "flex", gap: 1.5, alignItems: "center",
  borderRadius: 2, border: "1px solid #E6E8EC", backgroundColor: "#FFFFFF",
  boxShadow: "0 1px 8px rgba(16,24,40,0.06)", transition: "120ms ease",
  "&:hover": { transform: "translateY(-2px)", boxShadow: "0 8px 22px rgba(16,24,40,0.10)" },
};
const sectionPaperSx = {
  p: { xs: 2, md: 2.5 }, borderRadius: 3, border: "1px solid #E6E8EC",
  backgroundColor: "#FFFFFF", boxShadow: "0 10px 30px rgba(16,24,40,0.06)",
};


const SHIPMENT_CARD_DEFS = [
  {
    key: "delivered", label: "Delivered",
    color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0",
    icon: <LocalShipping sx={{ fontSize: 20 }} />,
    match: (cat) => cat.toLowerCase().includes("delivered") && !cat.toLowerCase().includes("rto"),
  },
  {
    key: "in_transit", label: "In Transit",
    color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE",
    icon: <DirectionsBike sx={{ fontSize: 20 }} />,
    match: (cat) => cat.toLowerCase().includes("transit"),
  },
  // ✅ New Card Definition
  {
    key: "out_for_delivery", label: "Out for Delivery",
    color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE",
    icon: <Schedule sx={{ fontSize: 20 }} />,
    match: (cat) => cat.toLowerCase().includes("out for delivery"),
  },
  {
    key: "rto", label: "RTO",
    color: "#DC2626", bg: "#FEF2F2", border: "#FECACA",
    icon: <AssignmentReturn sx={{ fontSize: 20 }} />,
    match: (cat) => cat.toLowerCase().includes("rto"),
  },
];
const ShipmentCard = ({ label, icon, color, count, amount, percentage, loading }) => (
  <Box sx={cardSx}>
    {loading ? (
      <Box sx={{ display: "flex", flex: 1, justifyContent: "center" }}><CircularProgress size={20} /></Box>
    ) : (
      <Box sx={{ display: "flex", flexDirection: "column", width: "100%", gap: 0.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ color, display: "flex", alignItems: "center" }}>{icon}</Box>
            <Typography sx={{ fontWeight: 900, color: "#0F172A", fontSize: "0.85rem" }}>{label}</Typography>
          </Box>
          <Typography sx={{ fontWeight: 900, color: "#64748B", fontSize: "0.9rem" }}>({fmt0(count)})</Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ fontSize: "0.95rem", fontWeight: 900, color: "#0F172A" }}>₹{fmt2(amount)}</Typography>
          <Chip label={`${percentage}%`} size="small" sx={{ backgroundColor: color, color: "#fff", fontWeight: 900, height: 20, fontSize: "0.7rem" }} />
        </Box>
      </Box>
    )}
  </Box>
);


const CODMetricCard = ({ label, value, icon, color, loading }) => (
  <Box sx={cardSx}>
    <Box sx={{ color, display: "flex", alignItems: "center", fontSize: 28 }}>{icon}</Box>
    <Box>
      <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</Typography>
      <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A", lineHeight: 1.2 }}>
        {loading ? <CircularProgress size={16} /> : value}
      </Typography>
    </Box>
  </Box>
);


const ManagerSalesDashboard = () => {
  const [user, setUser] = useState(null);


  const [range, setRange] = useState("Today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const initialDates = useMemo(() => getDateRange("Today"), []);
  const [effectiveStart, setEffectiveStart] = useState(initialDates.startDate);
  const [effectiveEnd, setEffectiveEnd] = useState(initialDates.endDate);


  // ✅ Fully separate agent filter states — changing one does NOT affect the other
  const [agents, setAgents] = useState(["All Agents"]);
  const [shipmentAgentFilter, setShipmentAgentFilter] = useState("All Agents");
  const [codAgentFilter, setCodAgentFilter] = useState("All Agents");


  // Sales
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesSummary, setSalesSummary] = useState({
    openLeads: undefined, leadsAssigned: undefined, salesDone: undefined,
    conversionRate: undefined, totalSales: undefined, avgOrderValue: undefined,
  });
  const [todayStats, setTodayStats] = useState([]);
  const [showAgentPerformance, setShowAgentPerformance] = useState(false);


  // Followup
  const [followupLoading, setFollowupLoading] = useState(false);
  const [followupStats, setFollowupStats] = useState([]);


  // Shipment — own state, own filter
  const [shipmentLoading, setShipmentLoading] = useState(false);
  const [shipmentData, setShipmentData] = useState([]);
  const [showOtherShipments, setShowOtherShipments] = useState(false);


  // COD — own state, own filter, client-side filter from full dataset
  const [codLoading, setCodLoading] = useState(false);
  const [codPrepaidStats, setCodPrepaidStats] = useState([]);


  // Order IDs popup
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
  // Fetch agents
  // -------------------------------------------
  const fetchAgents = useCallback(async () => {
    const cacheKey = `msd:agents:sales`;
    const cached = cacheGet(cacheKey);
    if (cached) { setAgents(cached); return; }
    try {
      const res = await axios.get(`${API_BASE}/api/employees`, { params: { role: "Sales Agent" } });
      const list = ["All Agents", ...(res.data || []).filter((a) => a?.status === "active").map((a) => a.fullName).filter(Boolean)];
      setAgents(list);
      cacheSet(cacheKey, list);
    } catch { setAgents(["All Agents"]); }
  }, []);


  useEffect(() => { if (user) fetchAgents(); }, [user, fetchAgents]);


  // -------------------------------------------
  // Range handlers
  // -------------------------------------------
  const handleRangeChange = (e) => {
    const v = e.target.value;
    setRange(v);
    if (v !== "Custom range") {
      const { startDate, endDate } = getDateRange(v);
      setCustomStart(""); setCustomEnd("");
      setEffectiveStart(startDate); setEffectiveEnd(endDate);
    }
  };
  const applyCustomRange = () => {
    if (!customStart || !customEnd) return;
    setEffectiveStart(customStart <= customEnd ? customStart : customEnd);
    setEffectiveEnd(customStart <= customEnd ? customEnd : customStart);
  };


  // -------------------------------------------
  // Fetch: Sales
  // -------------------------------------------
  const fetchSalesSummaryData = useCallback(async (startDate, endDate) => {
    const cacheKey = `msd:sales:${startDate}:${endDate}`;
    const cached = cacheGet(cacheKey);
    if (cached) { setSalesSummary(cached.salesSummary); setTodayStats(cached.todayStats); return; }
    setSalesLoading(true);
    try {
      const [metricsRes, overallRes] = await Promise.all([
        axios.get(`${API_BASE}/api/orders/combined/sales-metrics`, { params: { startDate, endDate } }),
        axios.get(`${API_BASE}/api/sales-summary`, { params: { startDate, endDate } }),
      ]);
      const { salesDone, totalSales, avgOrderValue } = metricsRes.data || {};
      const overall = overallRes.data?.overall || {};
      const leadsAssigned = Number(overall.leadsAssigned || 0);
      const conversionRate = leadsAssigned > 0 ? ((Number(salesDone || 0) / leadsAssigned) * 100).toFixed(2) : "0.00";
      const ss = { openLeads: overall.openLeads ?? 0, leadsAssigned: overall.leadsAssigned ?? 0, salesDone: salesDone ?? 0, conversionRate, totalSales: totalSales ?? 0, avgOrderValue: avgOrderValue ?? 0 };
      const ts = overallRes.data?.perAgent || [];
      setSalesSummary(ss); setTodayStats(ts);
      cacheSet(cacheKey, { salesSummary: ss, todayStats: ts });
    } catch {
      setSalesSummary({ openLeads: 0, leadsAssigned: 0, salesDone: 0, conversionRate: "0.00", totalSales: 0, avgOrderValue: 0 });
      setTodayStats([]);
    } finally { setSalesLoading(false); }
  }, []);


  // -------------------------------------------
  // Fetch: Followup
  // -------------------------------------------
  const fetchFollowupData = useCallback(async (startDate, endDate) => {
    const cacheKey = `msd:followup:${startDate}:${endDate}`;
    const cached = cacheGet(cacheKey);
    if (cached) { setFollowupStats(cached); return; }
    setFollowupLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/followup-summarys`, { params: { startDate, endDate } });
      const list = res.data?.followup || [];
      setFollowupStats(list); cacheSet(cacheKey, list);
    } catch { setFollowupStats([]); } finally { setFollowupLoading(false); }
  }, []);


  // -------------------------------------------
  // ✅ Fetch: Shipment — triggered ONLY by shipmentAgentFilter
  // -------------------------------------------
  const fetchShipmentData = useCallback(async (startDate, endDate, agentName) => {
    const agentKey = agentName && agentName !== "All Agents" ? agentName : "ALL";
    const cacheKey = `msd:ship:${startDate}:${endDate}:${agentKey}`;
    const cached = cacheGet(cacheKey);
    if (cached) { setShipmentData(cached); return; }
    setShipmentLoading(true);
    try {
      const params = { startDate, endDate };
      if (agentName && agentName !== "All Agents") params.agentName = agentName;
      const res = await axios.get(`${API_BASE}/api/all-shipment-summary`, { params });
      const list = res.data || [];
      setShipmentData(list); cacheSet(cacheKey, list);
    } catch { setShipmentData([]); } finally { setShipmentLoading(false); }
  }, []);


  // -------------------------------------------
  // ✅ Fetch: COD — fetches ALL data once, client-side filtered
  //    No extra API call when changing agent filter
  // -------------------------------------------
  const fetchCODvsPrepaidData = useCallback(async (startDate, endDate) => {
    const cacheKey = `msd:cod:${startDate}:${endDate}`;
    const cached = cacheGet(cacheKey);
    if (cached) { setCodPrepaidStats(cached); return; }
    setCodLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/cod-prepaid-summary`, { params: { startDate, endDate } });
      const list = res.data || [];
      setCodPrepaidStats(list); cacheSet(cacheKey, list);
    } catch { setCodPrepaidStats([]); } finally { setCodLoading(false); }
  }, []);


  // -------------------------------------------
  // Effects
  // -------------------------------------------
  useEffect(() => {
    if (!user) return;
    fetchSalesSummaryData(effectiveStart, effectiveEnd);
    fetchFollowupData(effectiveStart, effectiveEnd);
    fetchCODvsPrepaidData(effectiveStart, effectiveEnd); // fetches all; codAgentFilter filters client-side
  }, [user, effectiveStart, effectiveEnd, fetchSalesSummaryData, fetchFollowupData, fetchCODvsPrepaidData]);


  // ✅ Shipment re-fetches on its OWN filter only — never touches COD
  useEffect(() => {
    if (!user) return;
    fetchShipmentData(effectiveStart, effectiveEnd, shipmentAgentFilter);
  }, [user, effectiveStart, effectiveEnd, shipmentAgentFilter, fetchShipmentData]);


  // -------------------------------------------
  // Order IDs popup
  // -------------------------------------------
  const handleSalesDoneClick = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/sales-order-ids`, { params: {} });
      setOrderIds((res.data?.orderIds || []).join(", ") || "No order IDs available");
    } catch { setOrderIds("No order IDs available"); }
    setOrderIdsPopupOpen(true);
  };


  // -------------------------------------------
  // Derived: followup totals
  // -------------------------------------------
  const followupTotals = useMemo(() => {
    const sum = (key) => (followupStats || []).reduce((a, s) => a + Number(s?.[key] || 0), 0);
    return {
      noFollowupSet: sum("noFollowupSet"), followupMissed: sum("followupMissed"),
      followupToday: sum("followupToday"), followupTomorrow: sum("followupTomorrow"), followupLater: sum("followupLater"),
    };
  }, [followupStats]);


  // -------------------------------------------
  // Derived: Shipment aggregated cards
  // -------------------------------------------
  const shipmentCards = useMemo(() => {
    const rows = shipmentData || [];
    const cards = SHIPMENT_CARD_DEFS.map((def) => {
      const matched = rows.filter((r) => def.match(r.category || ""));
      return {
        ...def,
        count: matched.reduce((a, r) => a + Number(r.count || 0), 0),
        amount: matched.reduce((a, r) => a + Number(r.amount || 0), 0),
        percentage: matched.reduce((a, r) => a + Number(r.percentage || 0), 0).toFixed(1),
      };
    });
    const otherRows = rows.filter((r) => !SHIPMENT_CARD_DEFS.some((d) => d.match(r.category || "")));
    return {
      cards, otherRows,
      otherCount: otherRows.reduce((a, r) => a + Number(r.count || 0), 0),
      otherAmount: otherRows.reduce((a, r) => a + Number(r.amount || 0), 0),
      otherPercentage: otherRows.reduce((a, r) => a + Number(r.percentage || 0), 0).toFixed(1),
    };
  }, [shipmentData]);


  // -------------------------------------------
  // ✅ COD — client-side filter only, no new API call on agent change
  //    "All Agents — Breakdown" shows the per-agent table
  // -------------------------------------------
  const BREAKDOWN_OPTION = "All Agents — Breakdown";


  const codRows = useMemo(() => {
    if (codAgentFilter === "All Agents" || codAgentFilter === BREAKDOWN_OPTION) return codPrepaidStats || [];
    return (codPrepaidStats || []).filter((r) => r?.agentName === codAgentFilter);
  }, [codPrepaidStats, codAgentFilter]);


  const codTotals = useMemo(() => {
    const totalOrders = codRows.reduce((a, r) => a + Number(r?.totalOrders || 0), 0);
    const totalCOD = codRows.reduce((a, r) => a + Number(r?.codOrders || 0), 0);
    const totalPrepaid = codRows.reduce((a, r) => a + Number(r?.prepaidOrders || 0), 0);
    const totalPartial = codRows.reduce((a, r) => a + Number(r?.partialOrders || 0), 0); // New

    const getPct = (val) => (totalOrders > 0 ? ((val / totalOrders) * 100).toFixed(1) : "0.0");

    return {
      totalOrders, totalCOD, totalPrepaid, totalPartial,
      codPercent: getPct(totalCOD),
      prepaidPercent: getPct(totalPrepaid),
      partialPercent: getPct(totalPartial), // New
    };
  }, [codRows]);


  // COD dropdown: All Agents → individual agents → divider → Breakdown
  const codDropdownOptions = useMemo(() => [
    "All Agents",
    ...agents.filter((a) => a !== "All Agents"),
    BREAKDOWN_OPTION,
  ], [agents]);


  if (!user) return null;


  return (
    <Box sx={{ px: { xs: 1.5, md: 3 }, py: 2, pb: 6 }}>


      {/* ── Global Controls ── */}
      <Paper sx={{ ...sectionPaperSx, maxWidth: 1190, mx: "auto", mb: 2.5 }}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h4" fontWeight={800} sx={{ color: "#0F172A", letterSpacing: "0.2px", fontSize: { xs: "1.6rem", md: "2.1rem" } }}>
            {user?.fullName ? `${user.fullName} • Sales Team Dashboard` : "Sales Team Dashboard"}
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
            <TextField select label="Range" value={range} onChange={handleRangeChange} sx={{ width: 220 }} InputProps={{ sx: { borderRadius: 2 } }}>
              {timeRangeOptions.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </TextField>
            {range === "Custom range" && (
              <>
                <TextField label="Start" type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 160 }} InputProps={{ sx: { borderRadius: 2 } }} />
                <TextField label="End" type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 160 }} InputProps={{ sx: { borderRadius: 2 } }} />
                <Button variant="contained" onClick={applyCustomRange} sx={{ borderRadius: 2, px: 2.5, py: 1.2, textTransform: "none", fontWeight: 700, backgroundColor: "#111827", "&:hover": { backgroundColor: "#0B1220" } }}>Apply</Button>
              </>
            )}
          </Box>
        </Box>
      </Paper>


      {/* ── 1) SALES SUMMARY ── */}
      <Paper sx={{ ...sectionPaperSx, maxWidth: 1190, mx: "auto", mb: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#0F172A" }}>Sales Summary</Typography>
          <Button onClick={() => setShowAgentPerformance((v) => !v)} variant="outlined" sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, borderColor: "#CBD5E1", color: "#0F172A", "&:hover": { borderColor: "#94A3B8", backgroundColor: "#F8FAFC" } }}>
            {showAgentPerformance ? "Hide Agent Performance" : "Show Agent Performance"}
          </Button>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Grid container spacing={1.5}>
          {[
            { label: "Open Leads", value: salesSummary.openLeads, icon: <TrendingUp sx={{ color: "#1976D2" }} /> },
            { label: "Leads Assign", value: salesSummary.leadsAssigned, icon: <Assignment sx={{ color: "#FF9800" }} /> },
            { label: "Sales Done", value: salesSummary.salesDone, icon: <ShoppingCart sx={{ color: "#16A34A", cursor: "pointer" }} onClick={handleSalesDoneClick} /> },
            { label: "Conversion %", value: salesSummary.conversionRate !== undefined ? `${salesSummary.conversionRate}%` : undefined, icon: <BarChart sx={{ color: "#7C3AED" }} /> },
            { label: "Total Sales", value: salesSummary.totalSales !== undefined ? `₹${fmt0(salesSummary.totalSales)}` : undefined, icon: <CurrencyRupee sx={{ color: "#EF4444" }} /> },
            { label: "AOV", value: salesSummary.avgOrderValue !== undefined ? `₹${fmt0(salesSummary.avgOrderValue)}` : undefined, icon: <CurrencyRupeeOutlined sx={{ color: "#0EA5E9" }} /> },
          ].map((m) => (
            <Grid key={m.label} item xs={12} sm={6} md={2}>
              <Box sx={{ ...cardSx, p: 1.4 }}>
                <Box sx={{ fontSize: 28, lineHeight: 1 }}>{m.icon}</Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.4px" }}>{m.label}</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A", lineHeight: 1.2 }}>
                    {salesLoading ? <CircularProgress size={16} /> : m.value ?? "—"}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>


        {showAgentPerformance && (
          <Box sx={{ mt: 2.5 }}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A", mb: 1 }}>Agent Performance</Typography>
            <TableContainer sx={{ borderRadius: 2, border: "1px solid #E6E8EC" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#F8FAFC" }}>
                    {["Agent Name", "Open Leads", "Leads Assigned", "Sales Done", "Conversion Rate", "Total Sales", "Average Order Value"].map((h) => (
                      <TableCell key={h} align="center" sx={{ fontWeight: 900, color: "#334155", py: 1.2 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {salesLoading && <TableRow><TableCell colSpan={7} sx={{ p: 0 }}><LinearProgress /></TableCell></TableRow>}
                  {!salesLoading && (todayStats || []).length === 0 && (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 2, color: "#64748B" }}>No data available</TableCell></TableRow>
                  )}
                  {!salesLoading && (todayStats || []).map((row, idx) => (
                    <TableRow key={row.agentName || idx} sx={{ backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FBFDFF", "&:hover": { backgroundColor: "#F1F5F9" } }}>
                      <TableCell sx={{ fontWeight: 800, color: "#0F172A" }}>{row.agentName || "—"}</TableCell>
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


      {/* ── 2) FOLLOWUP SUMMARY ── */}
      <Paper sx={{ ...sectionPaperSx, maxWidth: 1190, mx: "auto", mb: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: "#0F172A" }}>Followup Summary</Typography>
        <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
          {[
            { label: "No Followup", value: followupTotals.noFollowupSet, icon: <Schedule sx={{ color: "#475569" }} /> },
            { label: "Missed", value: followupTotals.followupMissed, icon: <EventBusy sx={{ color: "#DC2626" }} /> },
            { label: "Today", value: followupTotals.followupToday, icon: <Today sx={{ color: "#16A34A" }} /> },
            { label: "Tomorrow", value: followupTotals.followupTomorrow, icon: <EventAvailable sx={{ color: "#F59E0B" }} /> },
            { label: "Later", value: followupTotals.followupLater, icon: <MoreTime sx={{ color: "#0284C7" }} /> },
          ].map((m) => (
            <Grid key={m.label} item xs={12} sm={6} md={2.4}>
              <Box sx={{ ...cardSx, p: 1.4 }}>
                <Box sx={{ fontSize: 28, lineHeight: 1 }}>{m.icon}</Box>
                <Box>
                  <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.4px" }}>{m.label}</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A", lineHeight: 1.2 }}>
                    {followupLoading ? <CircularProgress size={16} /> : fmt0(m.value)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>


      {/* ── 3) SHIPMENT STATUS SUMMARY ── */}
      <Paper sx={{ ...sectionPaperSx, maxWidth: 1190, mx: "auto", mb: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: { xs: "flex-start", md: "center" }, justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#0F172A" }}>Shipment Status Summary</Typography>
          {/* ✅ Shipment's OWN independent dropdown */}
          <FormControl sx={{ minWidth: 240 }}>
            <Select value={shipmentAgentFilter} onChange={(e) => setShipmentAgentFilter(e.target.value)} IconComponent={ExpandMoreIcon} sx={{ borderRadius: 2, backgroundColor: "#FFFFFF" }}>
              {agents.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
        <Grid container spacing={1.5}>
          {shipmentCards.cards.map((card) => (
            <Grid key={card.key} item xs={12} sm={6} md={2.4}>
              <ShipmentCard {...card} loading={shipmentLoading} />
            </Grid>
          ))}
          <Grid item xs={12} sm={6} md={2.4}>
            <Box
              onClick={() => setShowOtherShipments((v) => !v)}
              sx={{
                ...cardSx,
                cursor: "pointer",
                borderColor: "#E6E8EC", // Ensures it matches the standard grey border
                borderWidth: "1px"      // Removes the thicker 2px border
              }}
            >
              <Box sx={{ display: "flex", flexDirection: "column", width: "100%", gap: 0.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Inventory sx={{ color: "#64748B", fontSize: 20 }} />
                    <Typography sx={{ fontWeight: 900, color: "#0F172A", fontSize: "0.85rem" }}>Other</Typography>
                  </Box>
                  <Typography sx={{ fontWeight: 900, color: "#64748B", fontSize: "0.9rem" }}>({fmt0(shipmentCards.otherCount)})</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography sx={{ fontSize: "0.95rem", fontWeight: 900, color: "#0F172A" }}>₹{fmt2(shipmentCards.otherAmount)}</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography sx={{ fontSize: "0.75rem", fontWeight: 900, color: "#64748B" }}>{shipmentCards.otherPercentage}%</Typography>
                    {showOtherShipments ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                  </Box>
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>


        {showOtherShipments && shipmentCards.otherRows.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 1.5 }} />
            <Typography variant="body2" sx={{ fontWeight: 800, color: "#64748B", mb: 1, textTransform: "uppercase", letterSpacing: "0.5px" }}>Other — Breakdown</Typography>
            <TableContainer sx={{ borderRadius: 2, border: "1px solid #E6E8EC" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#F8FAFC" }}>
                    {["Category", "Count", "Amount", "Percentage"].map((h) => (
                      <TableCell key={h} align="center" sx={{ fontWeight: 900, color: "#334155", py: 1.2 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shipmentCards.otherRows.map((row, idx) => (
                    <TableRow key={`other-${idx}`} sx={{ backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FBFDFF", "&:hover": { backgroundColor: "#F1F5F9" } }}>
                      <TableCell align="center" sx={{ fontWeight: 800, color: "#0F172A" }}>{row.category}</TableCell>
                      <TableCell align="center">{row.count}</TableCell>
                      <TableCell align="center">₹{fmt2(row.amount)}</TableCell>
                      <TableCell align="center">{row.percentage}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>


      <Paper sx={{ ...sectionPaperSx, maxWidth: 1190, mx: "auto" }}>
        <Box sx={{ display: "flex", alignItems: { xs: "flex-start", md: "center" }, justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#0F172A" }}>COD vs Prepaid Summary</Typography>
          <FormControl sx={{ minWidth: 240 }}>
            <Select value={codAgentFilter} onChange={(e) => setCodAgentFilter(e.target.value)} IconComponent={ExpandMoreIcon} sx={{ borderRadius: 2, backgroundColor: "#FFFFFF" }}>
              {codDropdownOptions.map((a) => (
                <MenuItem key={a} value={a} sx={a === BREAKDOWN_OPTION ? { borderTop: "1px solid #E6E8EC", fontWeight: 700, color: "#2563EB", mt: 0.5 } : {}}>
                  {a}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Grid container spacing={1.5}>
          {[
            { label: "Total", value: fmt0(codTotals.totalOrders), icon: <ShoppingCart sx={{ fontSize: 24 }} />, color: "#2563EB" },
            { label: "COD", value: fmt0(codTotals.totalCOD), icon: <CurrencyRupee sx={{ fontSize: 24 }} />, color: "#DC2626" },
            { label: "Prepaid", value: fmt0(codTotals.totalPrepaid), icon: <Assignment sx={{ fontSize: 24 }} />, color: "#16A34A" },
            { label: "Partial", value: fmt0(codTotals.totalPartial), icon: <MoreTime sx={{ fontSize: 24 }} />, color: "#7C3AED" }, // New Card
            { label: "COD %", value: `${codTotals.codPercent}%`, icon: <BarChart sx={{ fontSize: 24 }} />, color: "#D97706" },
            { label: "Prepaid %", value: `${codTotals.prepaidPercent}%`, icon: <TrendingUp sx={{ fontSize: 24 }} />, color: "#0EA5E9" },
            { label: "Partial %", value: `${codTotals.partialPercent}%`, icon: <TrendingUp sx={{ fontSize: 24 }} />, color: "#8B5CF6" }, // New %
          ].map((m) => (
            <Grid key={m.label} item xs={12} sm={6} md={1.7}>
              <CODMetricCard {...m} loading={codLoading} />
            </Grid>
          ))}
        </Grid>


        {codAgentFilter === BREAKDOWN_OPTION && (
          <Box sx={{ mt: 2.5 }}>
            <Divider sx={{ mb: 1.5 }} />
            <Typography variant="body2" sx={{ fontWeight: 800, color: "#64748B", mb: 1, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              All Agents — Breakdown
            </Typography>
            <TableContainer sx={{ borderRadius: 2, border: "1px solid #E6E8EC" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#F8FAFC" }}>
                    {["Agent Name", "Total Orders", "COD Orders", "Prepaid Orders", "Partial Orders", "COD %", "Prepaid %", "Partial %"].map((h) => (
                      <TableCell key={h} align="center" sx={{ fontWeight: 900, color: "#334155", py: 1.2 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {codLoading && <TableRow><TableCell colSpan={8} sx={{ p: 0 }}><LinearProgress /></TableCell></TableRow>}
                  {!codLoading && codRows.map((row, idx) => (
                    <TableRow key={idx} sx={{ backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FBFDFF", "&:hover": { backgroundColor: "#F1F5F9" } }}>
                      <TableCell sx={{ fontWeight: 800, color: "#0F172A" }}>{row.agentName}</TableCell>
                      <TableCell align="center">{row.totalOrders}</TableCell>
                      <TableCell align="center">{row.codOrders}</TableCell>
                      <TableCell align="center">{row.prepaidOrders}</TableCell>
                      <TableCell align="center">{row.partialOrders}</TableCell> {/* New */}
                      <TableCell align="center">{row.codPercentage}%</TableCell>
                      <TableCell align="center">{row.prepaidPercentage}%</TableCell>
                      <TableCell align="center">{row.partialPercentage}%</TableCell> {/* New */}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>


      {/* Order IDs Dialog */}
      <Dialog open={orderIdsPopupOpen} onClose={() => setOrderIdsPopupOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Sales Done Order IDs</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#0F172A" }}>{orderIds || "No order IDs available"}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderIdsPopupOpen(false)} variant="outlined" sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800 }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};


export default ManagerSalesDashboard;

