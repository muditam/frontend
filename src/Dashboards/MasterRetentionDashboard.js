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
  TableSortLabel,


} from "@mui/material";
import {
  LocalShipping,
  DirectionsBike,
  AssignmentReturn,
  Inventory,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";


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
  Restaurant,
  Edit,
  Phone,
  LocalHospital,
} from "@mui/icons-material";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";

import TotalSalesDrilldown from "../pages/filtered/TotalSalesDrilldown";
import RetentionOverviewCombined from "../pages/retention/RetentionOverviewCombined";

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";
const CACHE_TTL_MS = 5 * 60 * 1000;

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


const toISODateLocal = (d) => {
  const tz = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - tz);
  return local.toISOString().slice(0, 10);
};


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
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
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



const fmt0 = (n) =>
  Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });


const fmt2 = (n) =>
  Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });



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




const sectionPaperSx = {
  p: { xs: 2, md: 2.5 },
  borderRadius: 3,
  border: "1px solid #E6E8EC",
  backgroundColor: "#FFFFFF",
  boxShadow: "0 10px 30px rgba(16, 24, 40, 0.06)",
};
const fiveCardRowSx = {
  display: "grid",
  gap: 1.5,
  width: "100%",
  gridTemplateColumns: {
    xs: "1fr",
    sm: "repeat(2, minmax(0, 1fr))",
    md: "repeat(5, minmax(0, 1fr))",
  },
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


  // ✅ important
  minWidth: 0,
  width: "100%",
  overflow: "hidden",
};


const SHIPMENT_CARD_DEFS = [
  {
    key: "delivered",
    label: "Delivered",
    color: "#16A34A",
    icon: <LocalShipping sx={{ fontSize: 20 }} />,
    match: (cat) =>
      String(cat).toLowerCase().includes("delivered") &&
      !String(cat).toLowerCase().includes("rto"),
  },
  {
    key: "rto",
    label: "RTO",
    color: "#DC2626",
    icon: <AssignmentReturn sx={{ fontSize: 20 }} />,
    match: (cat) => String(cat).trim().toLowerCase() === "rto",
  },
  {
    key: "rto_delivered",
    label: "RTO Delivered",
    color: "#F97316",
    icon: <AssignmentReturn sx={{ fontSize: 20 }} />,
    match: (cat) => String(cat).trim().toLowerCase() === "rto delivered",
  },
  {
    key: "in_transit",
    label: "In Transit",
    color: "#2563EB",
    icon: <DirectionsBike sx={{ fontSize: 20 }} />,
    match: (cat) => String(cat).trim().toLowerCase() === "in transit",
  },
];
const defaultFilter = createFilterOptions({
  stringify: (opt) => opt?.fullName || "",
});

const filterTop5ThenSearch = (options, state) => {
  const q = (state.inputValue || "").trim();
  if (!q) return options.slice(0, 5);         // 👈 only 5 when empty
  return defaultFilter(options, state);       // 👈 normal search when typing
};


const ShipmentCard = ({ label, icon, color, count, amount, percentage, loading, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      ...cardSx,
      cursor: onClick ? "pointer" : "default",
      "&:hover": onClick ? cardSx["&:hover"] : undefined,
    }}
  >
    {loading ? (
      <Box sx={{ display: "flex", flex: 1, justifyContent: "center" }}>
        <CircularProgress size={20} />
      </Box>
    ) : (
      <Box sx={{ display: "flex", flexDirection: "column", width: "100%", gap: 0.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ color, display: "flex", alignItems: "center" }}>{icon}</Box>
            <Typography sx={{ fontWeight: 900, color: "#0F172A", fontSize: "0.85rem" }}>
              {label}
            </Typography>
          </Box>
          <Typography sx={{ fontWeight: 900, color: "#64748B", fontSize: "0.9rem" }}>
            ({fmt0(count)})
          </Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ fontSize: "0.95rem", fontWeight: 900, color: "#0F172A" }}>
            ₹{fmt2(amount)}
          </Typography>
          <Chip
            label={`${percentage}%`}
            size="small"
            sx={{
              backgroundColor: color,
              color: "#fff",
              fontWeight: 900,
              height: 20,
              fontSize: "0.7rem",
            }}
          />
        </Box>
      </Box>
    )}
  </Box>
);




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

const healthExpertSortFields = {
  activeCustomers: "Active Customers",
  salesDone: "Sales Done",
  totalSales: "Total Sales",
  avgOrderValue: "Avg Order Value",
};


const ManagerRetentionDashboard = () => {
  const initialDates = useMemo(() => getDateRange("Today"), []);
  const [range, setRange] = useState("Today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [effectiveStart, setEffectiveStart] = useState(initialDates.startDate);
  const [effectiveEnd, setEffectiveEnd] = useState(initialDates.endDate);


  const [showHealthExpertMetrics, setShowHealthExpertMetrics] = useState(false);
  const [showActivityMetrics, setShowActivityMetrics] = useState(false);
  const [showFollowupMetrics, setShowFollowupMetrics] = useState(false);
  const [showReachoutDetails, setShowReachoutDetails] = useState(false);
  const [showCodDetails, setShowCodDetails] = useState(false);


  const [showTotalSalesDialog, setShowTotalSalesDialog] = useState(false);


  const [summaryLoading, setSummaryLoading] = useState(false);
  // ✅ Split into 2 loading states: cards (condition) vs table (agent rows)
  const [activityCardsLoading, setActivityCardsLoading] = useState(false);
  const [activityTableLoading, setActivityTableLoading] = useState(false);
  const [followupLoading, setFollowupLoading] = useState(false);
  const [shipmentLoading, setShipmentLoading] = useState(false);
  const [reachoutLoading, setReachoutLoading] = useState(false);
  const [codLoading, setCodLoading] = useState(false);
  const [agentShipmentLoading, setAgentShipmentLoading] = useState(false);


  const [healthExperts, setHealthExperts] = useState([]);
  const [selectedHealthExpert, setSelectedHealthExpert] = useState("");


  const [healthExpertSummary, setHealthExpertSummary] = useState({
    totalActiveCustomers: 0,
    totalSalesDone: 0,
    totalSalesAmount: 0,
    avgOrderValue: 0,
  });
  const [healthExpertMetrics, setHealthExpertMetrics] = useState([]);
  const [healthExpertSort, setHealthExpertSort] = useState({ field: "", direction: "desc" });


  // ✅ Condition cards (separate endpoint — not date-dependent)
  const [activityCards, setActivityCards] = useState({
    diabetes: 0,
    liver: 0,
    cholesterol: 0,
    noCondition: 0,
  });


  // ✅ Agent activity table (date-dependent endpoint)
  const [activityRows, setActivityRows] = useState([]);
  const [activityTotals, setActivityTotals] = useState({
    assignedTotal: 0,
    dietPlansCreated: 0,
    profileUpdates: 0,
    profileUpdatesPct: 0,
    conditionUpdates: 0,
    conditionUpdatesPct: 0,
    firstCallConnected: 0,   // flat count
    firstCallPercentage: 0,  // flat %, 2 decimal from backend
  });


  const [followupTotals, setFollowupTotals] = useState({
    totalNoFollowupSet: 0,
    totalFollowupMissed: 0,
    totalFollowupToday: 0,
    totalFollowupTomorrow: 0,
    totalFollowupLater: 0,
    totalLostCustomers: 0,
  });
  const [followupRows, setFollowupRows] = useState([]);


  const [shipmentSummary, setShipmentSummary] = useState([]);
  const [agentShipmentSummary, setAgentShipmentSummary] = useState([]);


  const [reachoutTotals, setReachoutTotals] = useState({
    totalExperts: 0,
    totalCount: 0,
    WhatsApp: 0,
    Call: 0,
    Both: 0,
  });
  const [showOtherShipments, setShowOtherShipments] = useState(false);


  const [reachoutRows, setReachoutRows] = useState([]);
  const lastReachoutKeyRef = useRef("");


  const [codRows, setCodRows] = useState([]);
  const codTotals = useMemo(() => {
  const rows = codRows || [];
  const totalOrders = rows.reduce((acc, a) => acc + Number(a?.totalOrders || 0), 0);
  const totalCOD = rows.reduce((acc, a) => acc + Number(a?.codOrders || 0), 0);
  const totalPrepaid = rows.reduce((acc, a) => acc + Number(a?.prepaidOrders || 0), 0);
  const totalPartial = rows.reduce((acc, a) => acc + Number(a?.partialOrders || 0), 0);

  const getPct = (val) => (totalOrders > 0 ? ((val / totalOrders) * 100).toFixed(1) : "0.0");

  return { 
    totalOrders, totalCOD, totalPrepaid, totalPartial, 
    codPercent: getPct(totalCOD), 
    prepaidPercent: getPct(totalPrepaid), 
    partialPercent: getPct(totalPartial) 
  };
}, [codRows]);


  const normalizeCustomDates = useCallback((a, b) => {
    if (!a || !b) return null;
    const start = a <= b ? a : b;
    const end = a <= b ? b : a;
    return { start, end };
  }, []);


  // -------------------------------------------
  // Fetch helpers (unchanged from original)
  // -------------------------------------------
  const fetchHealthExperts = useCallback(async () => {
    const cacheKey = `mrd:experts:list`;
    const cached = cacheGet(cacheKey);
    if (cached) { setHealthExperts(cached); return cached; }
    try {
      const res = await axios.get(`${API_BASE}/api/employees`, { params: { role: "Retention Agent" } });
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


  const fetchAggregatedSales = useCallback(async (startDate, endDate) => {
    const cacheKey = `mrd:aggSales:${startDate}:${endDate}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
    try {
      const res = await axios.get(`${API_BASE}/api/retention-sales/aggregated`, { params: { startDate, endDate } });
      cacheSet(cacheKey, res.data || []);
      return res.data || [];
    } catch (e) {
      console.error("Error fetching aggregated sales:", e);
      return [];
    }
  }, []);


  // -------------------------------------------
  // 1) Health Expert Summary
  // -------------------------------------------
  const fetchHealthExpertSummaryAndMetrics = useCallback(
    async (startDate, endDate) => {
      const cacheKey = `mrd:heSummary:${startDate}:${endDate}`;
      const cached = cacheGet(cacheKey);
      if (cached) { setHealthExpertSummary(cached.summary); setHealthExpertMetrics(cached.metrics); return; }


      setSummaryLoading(true);
      try {
        const experts = healthExperts.length ? healthExperts : await fetchHealthExperts();
        const [activeCountsArr, aggregatedSales] = await Promise.all([
          fetchActiveCustomerCounts(),
          fetchAggregatedSales(startDate, endDate),
        ]);


        let totalActiveCustomers = 0, totalSalesDone = 0, totalSalesAmount = 0;


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


          return { healthExpertName: expert.fullName, activeCustomers, salesDone, totalSales, avgOrderValue };
        });


        const avgOrderValue = totalSalesDone > 0 ? Number(totalSalesAmount / totalSalesDone) : 0;
        const summary = { totalActiveCustomers, totalSalesDone, totalSalesAmount, avgOrderValue };


        setHealthExpertSummary(summary);
        setHealthExpertMetrics(metrics);
        cacheSet(cacheKey, { summary, metrics });
      } catch (e) {
        console.error("Error building health expert summary:", e);
        setHealthExpertSummary({ totalActiveCustomers: 0, totalSalesDone: 0, totalSalesAmount: 0, avgOrderValue: 0 });
        setHealthExpertMetrics([]);
      } finally {
        setSummaryLoading(false);
      }
    },
    [healthExperts, fetchHealthExperts, fetchActiveCustomerCounts, fetchAggregatedSales]
  );


  // -------------------------------------------
  // ✅ 2a) Condition Cards — SEPARATE endpoint, NOT date-dependent
  //        Loads fast independently, cached with fixed key
  // -------------------------------------------
  const fetchConditionCards = useCallback(async () => {
    const cacheKey = `mrd:conditionCards`;
    const cached = cacheGet(cacheKey);
    if (cached) { setActivityCards(cached); return; }


    setActivityCardsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/retention-activity/condition-cards`);
      const data = res.data || { diabetes: 0, liver: 0, cholesterol: 0, noCondition: 0 };
      setActivityCards(data);
      cacheSet(cacheKey, data);
    } catch (e) {
      console.error("Error fetching condition cards:", e);
      setActivityCards({ diabetes: 0, liver: 0, cholesterol: 0, noCondition: 0 });
    } finally {
      setActivityCardsLoading(false);
    }
  }, []);


  // -------------------------------------------
  // ✅ 2b) Agent Activity Table — date-dependent endpoint
  //        Parallel aggregations on backend → fast
  // -------------------------------------------
  const fetchActivityTable = useCallback(async (startDate, endDate) => {
    const cacheKey = `mrd:activityTable:${startDate}:${endDate}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      setActivityRows(cached.rows);
      setActivityTotals(cached.totals);
      return;
    }


    setActivityTableLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE}/api/retention-activity/health-expert-activity-summary`,
        { params: { startDate, endDate } }
      );
      const data = res.data || {};
      const rows = data.rows || [];
      const totals = data.totals || {
        assignedTotal: 0,
        dietPlansCreated: 0,
        profileUpdates: 0,
        profileUpdatesPct: 0,
        conditionUpdates: 0,
        conditionUpdatesPct: 0,
        firstCallConnected: 0,
        firstCallPercentage: 0,
      };


      setActivityRows(rows);
      setActivityTotals(totals);
      cacheSet(cacheKey, { rows, totals });
    } catch (e) {
      console.error("Error fetching activity table:", e);
      setActivityRows([]);
      setActivityTotals({
        assignedTotal: 0,
        dietPlansCreated: 0,
        profileUpdates: 0,
        profileUpdatesPct: 0,
        conditionUpdates: 0,
        conditionUpdatesPct: 0,
        firstCallConnected: 0,
        firstCallPercentage: 0,
      });
    } finally {
      setActivityTableLoading(false);
    }
  }, []);


  // -------------------------------------------
  // 3) Followup
  // -------------------------------------------
  const fetchFollowupSummaryAndMetrics = useCallback(async (startDate, endDate) => {
    const cacheKey = `mrd:followup:${startDate}:${endDate}`;
    const cached = cacheGet(cacheKey);
    if (cached) { setFollowupTotals(cached.totals); setFollowupRows(cached.rows); return; }


    setFollowupLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/retention-sales/aggregated-followup`, { params: { startDate, endDate } });
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
        { totalNoFollowupSet: 0, totalFollowupMissed: 0, totalFollowupToday: 0, totalFollowupTomorrow: 0, totalFollowupLater: 0, totalLostCustomers: 0 }
      );
      setFollowupRows(rows);
      setFollowupTotals(totals);
      cacheSet(cacheKey, { totals, rows });
    } catch (e) {
      console.error("Error fetching followup summary:", e);
      setFollowupRows([]);
      setFollowupTotals({ totalNoFollowupSet: 0, totalFollowupMissed: 0, totalFollowupToday: 0, totalFollowupTomorrow: 0, totalFollowupLater: 0, totalLostCustomers: 0 });
    } finally {
      setFollowupLoading(false);
    }
  }, []);


  // -------------------------------------------
  // 4) Shipment
  // -------------------------------------------
  const fetchShipmentSummary = useCallback(async (startDate, endDate) => {
    const cacheKey = `mrd:ship:${startDate}:${endDate}`;
    const cached = cacheGet(cacheKey);
    if (cached) { setShipmentSummary(cached); return; }
    setShipmentLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/retention-sales/shipment-summary`, { params: { startDate, endDate } });
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


  const fetchAgentShipment = useCallback(async (healthExpertName, startDate, endDate) => {
    if (!healthExpertName) { setAgentShipmentSummary([]); return; }
    const cacheKey = `mrd:shipAgent:${healthExpertName}:${startDate}:${endDate}`;
    const cached = cacheGet(cacheKey);
    if (cached) { setAgentShipmentSummary(cached); return; }
    setAgentShipmentLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/retention-sales/shipment-summary/agent`, { params: { agentName: healthExpertName, startDate, endDate } });
      const list = res.data || [];
      setAgentShipmentSummary(list);
      cacheSet(cacheKey, list);
    } catch (e) {
      console.error("Error fetching agent shipment:", e);
      setAgentShipmentSummary([]);
    } finally {
      setAgentShipmentLoading(false);
    }
  }, []);


  // -------------------------------------------
  // 5) Reachout logs (lazy)
  // -------------------------------------------
  const fetchReachoutLogs = useCallback(async (startDate, endDate) => {
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
              params: { startDate, endDate, healthExpertAssigned: expert.fullName },
            });
            const d = res.data || {};
            return { healthExpertAssigned: expert.fullName, totalCount: Number(d.totalCount || 0), WhatsApp: Number(d.WhatsApp || 0), Call: Number(d.Call || 0), Both: Number(d.Both || 0) };
          } catch {
            return { healthExpertAssigned: expert.fullName, totalCount: 0, WhatsApp: 0, Call: 0, Both: 0 };
          }
        })
      );
      const totals = rows.reduce(
        (acc, r) => { acc.totalExperts++; acc.totalCount += r.totalCount; acc.WhatsApp += r.WhatsApp; acc.Call += r.Call; acc.Both += r.Both; return acc; },
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
  }, [healthExperts, fetchHealthExperts]);


  // -------------------------------------------
  // 6) COD vs Prepaid
  // -------------------------------------------
  const fetchCodPrepaid = useCallback(async (startDate, endDate) => {
    const cacheKey = `mrd:cod:${startDate}:${endDate}`;
    const cached = cacheGet(cacheKey);
    if (cached) { setCodRows(cached); return; }
    setCodLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/retention-sales/cod-prepaid-summary`, { params: { startDate, endDate } });
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
  // Range handlers
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
    if (range === "Custom range" && norm) { setEffectiveStart(norm.start); setEffectiveEnd(norm.end); }
  };


  const handleCustomEnd = (val) => {
    setCustomEnd(val);
    const norm = normalizeCustomDates(customStart, val);
    if (range === "Custom range" && norm) { setEffectiveStart(norm.start); setEffectiveEnd(norm.end); }
  };


  // -------------------------------------------
  // Effects
  // -------------------------------------------
  useEffect(() => { fetchHealthExperts(); }, [fetchHealthExperts]);


  // ✅ Condition cards: load ONCE on mount (not date-dependent)
  useEffect(() => { fetchConditionCards(); }, [fetchConditionCards]);


  // ✅ Date-sensitive fetches fire in parallel
  useEffect(() => {
    if (!effectiveStart || !effectiveEnd) return;
    fetchHealthExpertSummaryAndMetrics(effectiveStart, effectiveEnd);
    fetchActivityTable(effectiveStart, effectiveEnd);          // agent table only
    fetchFollowupSummaryAndMetrics(effectiveStart, effectiveEnd);
    fetchShipmentSummary(effectiveStart, effectiveEnd);
    fetchCodPrepaid(effectiveStart, effectiveEnd);
  }, [
    effectiveStart, effectiveEnd,
    fetchHealthExpertSummaryAndMetrics,
    fetchActivityTable,
    fetchFollowupSummaryAndMetrics,
    fetchShipmentSummary,
    fetchCodPrepaid,
  ]);


  useEffect(() => {
    if (!selectedHealthExpert) { setAgentShipmentSummary([]); return; }
    fetchAgentShipment(selectedHealthExpert, effectiveStart, effectiveEnd);
  }, [selectedHealthExpert, effectiveStart, effectiveEnd, fetchAgentShipment]);


  useEffect(() => {
    if (!showReachoutDetails) return;
    const key = `mrd:reachouts:${effectiveStart}:${effectiveEnd}`;
    if (lastReachoutKeyRef.current === key && reachoutRows.length) return;
    fetchReachoutLogs(effectiveStart, effectiveEnd);
  }, [showReachoutDetails, effectiveStart, effectiveEnd, fetchReachoutLogs, reachoutRows.length]);


  const shipmentDates = useMemo(() => ({ startDate: effectiveStart, endDate: effectiveEnd }), [effectiveStart, effectiveEnd]);



  const activityLoading = activityCardsLoading || activityTableLoading;

  const sortedHealthExpertMetrics = useMemo(() => {
    const rows = [...(healthExpertMetrics || [])];
    const { field, direction } = healthExpertSort;

    if (!field) return rows;

    return rows.sort((a, b) => {
      const aValue = Number(a?.[field] || 0);
      const bValue = Number(b?.[field] || 0);
      const valueCompare = direction === "asc" ? aValue - bValue : bValue - aValue;

      if (valueCompare !== 0) return valueCompare;

      return String(a?.healthExpertName || "").localeCompare(String(b?.healthExpertName || ""));
    });
  }, [healthExpertMetrics, healthExpertSort]);

  const handleHealthExpertSort = (field) => {
    setHealthExpertSort((current) => ({
      field,
      direction: current.field === field && current.direction === "desc" ? "asc" : "desc",
    }));
  };

  const getHealthExpertSortDirection = (field) =>
    healthExpertSort.field === field ? healthExpertSort.direction : "desc";

  const renderHealthExpertSortHeader = (field) => (
    <TableSortLabel
      active={healthExpertSort.field === field}
      direction={getHealthExpertSortDirection(field)}
      hideSortIcon={false}
      onClick={() => handleHealthExpertSort(field)}
      sx={{
        color: "#334155 !important",
        justifyContent: "center",
        width: "100%",
        "& .MuiTableSortLabel-icon": {
          color: "#334155 !important",
          opacity: healthExpertSort.field === field ? 1 : 0.45,
        },
      }}
    >
      {healthExpertSortFields[field]}
    </TableSortLabel>
  );


  const shipmentCards = useMemo(() => {
  const rows = (shipmentSummary || []).filter(
    (r) => String(r?.category || "").trim().toLowerCase() !== "total orders"
  );

  const getAmount = (r) => Number(r?.totalAmount ?? r?.amount ?? 0);

  const cards = SHIPMENT_CARD_DEFS.map((def) => {
    const matched = rows.filter((r) => def.match(r?.category || ""));
    return {
      ...def,
      matched,
      count: matched.reduce((a, r) => a + Number(r?.count || 0), 0),
      amount: matched.reduce((a, r) => a + getAmount(r), 0),
      percentage: matched.reduce((a, r) => a + Number(r?.percentage || 0), 0).toFixed(1),
    };
  });

  const otherRows = rows.filter(
    (r) => !SHIPMENT_CARD_DEFS.some((d) => d.match(r?.category || ""))
  );

  return {
    cards,
    otherRows,
    otherCount: otherRows.reduce((a, r) => a + Number(r?.count || 0), 0),
    otherAmount: otherRows.reduce((a, r) => a + getAmount(r), 0),
    otherPercentage: otherRows.reduce((a, r) => a + Number(r?.percentage || 0), 0).toFixed(1),
  };
}, [shipmentSummary]);


  return (
    <Box sx={{ px: { xs: 1.5, md: 3 }, py: 2, pb: 6 }}>
      {/* Top Bar */}
      <Paper sx={{ ...sectionPaperSx, maxWidth: 1220, mx: "auto", mb: 2.5 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: { xs: "flex-start", md: "center" }, justifyContent: "space-between", flexWrap: "wrap" }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, color: "#0F172A", letterSpacing: "0.2px" }}>
              Manager Retention Dashboard
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748B", mt: 0.4 }}>
              Range: <b>{shipmentDates.startDate}</b> to <b>{shipmentDates.endDate}</b>
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1.2, flexWrap: "wrap", alignItems: "center" }}>
            <TextField select label="Range" value={range} onChange={handleRangeChange} sx={{ width: 220 }} InputProps={{ sx: { borderRadius: 2 } }}>
              {timeRangeOptions.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </TextField>
            {range === "Custom range" && (
              <>
                <TextField label="Start" type="date" value={customStart} onChange={(e) => handleCustomStart(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 160 }} InputProps={{ sx: { borderRadius: 2 } }} />
                <TextField label="End" type="date" value={customEnd} onChange={(e) => handleCustomEnd(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 160 }} InputProps={{ sx: { borderRadius: 2 } }} />
                <Chip label="Auto-applied" size="small" sx={{ borderRadius: 2, bgcolor: "#F1F5F9", color: "#0F172A", fontWeight: 700 }} />
              </>
            )}
          </Box>
        </Box>
      </Paper>

      {/* ===================== 1) HEALTH EXPERT SUMMARY ===================== */}
      <Paper sx={{ ...sectionPaperSx, maxWidth: 1220, mx: "auto", mb: 2.5 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A" }}>Health Expert's Summary</Typography>
          <Button onClick={() => setShowHealthExpertMetrics((v) => !v)} variant="outlined" sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800, borderColor: "#CBD5E1", color: "#0F172A", "&:hover": { borderColor: "#94A3B8", backgroundColor: "#F8FAFC" } }}>
            {showHealthExpertMetrics ? "Hide Health Expert Metrics" : "Show Health Expert Metrics"}
          </Button>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Grid container spacing={1.5}>
          {[
            { label: "Active Customers", value: healthExpertSummary.totalActiveCustomers, icon: <AccountCircle sx={{ color: "#0EA5E9" }} /> },
            { label: "Sales Done", value: healthExpertSummary.totalSalesDone, icon: <ShoppingCart sx={{ color: "#16A34A" }} /> },
            { label: "Total Sales", value: `₹${fmt0(healthExpertSummary.totalSalesAmount)}`, icon: <CurrencyRupee sx={{ color: "#EF4444" }} />, onClick: () => setShowTotalSalesDialog(true), clickable: true },
            { label: "Avg Order Value", value: `₹${fmt0(healthExpertSummary.avgOrderValue)}`, icon: <TrendingUp sx={{ color: "#7C3AED" }} /> },
          ].map((m) => (
            <Grid key={m.label} item xs={12} sm={6} md={3}>
              <Box onClick={m.onClick} sx={{ ...cardSx, cursor: m.clickable ? "pointer" : "default" }}>
                <Box sx={{ fontSize: 28, lineHeight: 1 }}>{m.icon}</Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.4px" }}>{m.label}</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A" }}>{summaryLoading ? <CircularProgress size={16} /> : m.value}</Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>


        <TotalSalesDrilldown open={showTotalSalesDialog} onClose={() => setShowTotalSalesDialog(false)} initialDates={{ startDate: effectiveStart, endDate: effectiveEnd }} />


        {showHealthExpertMetrics && (
          <Box sx={{ mt: 2.5 }}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A", mb: 1 }}>Health Expert Metrics</Typography>
            <TableContainer sx={{ borderRadius: 2, border: "1px solid #E6E8EC" }} component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headerCellSx}>Health Expert Name</TableCell>
                    <TableCell sx={headerCellSx}>{renderHealthExpertSortHeader("activeCustomers")}</TableCell>
                    <TableCell sx={headerCellSx}>{renderHealthExpertSortHeader("salesDone")}</TableCell>
                    <TableCell sx={headerCellSx}>{renderHealthExpertSortHeader("totalSales")}</TableCell>
                    <TableCell sx={headerCellSx}>{renderHealthExpertSortHeader("avgOrderValue")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summaryLoading && <TableRow><TableCell colSpan={5} sx={{ p: 0 }}><LinearProgress /></TableCell></TableRow>}
                  {!summaryLoading && (healthExpertMetrics || []).length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 2, color: "#64748B" }}>No data available</TableCell></TableRow>}
                  {!summaryLoading && sortedHealthExpertMetrics.map((r, idx) => (
                    <TableRow key={r.healthExpertName || idx} sx={{ backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FBFDFF", ...rowHoverSx }}>
                      <TableCell sx={{ fontWeight: 800, color: "#0F172A" }}>{r.healthExpertName}</TableCell>
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


      {/* ===================== 2) ACTIVITY SUMMARY ===================== */}
      <Paper sx={{ ...sectionPaperSx, maxWidth: 1220, mx: "auto", mb: 2.5 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A" }}>Activity Summary</Typography>
          <Button onClick={() => setShowActivityMetrics((v) => !v)} variant="outlined" sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800, borderColor: "#CBD5E1", color: "#0F172A", "&:hover": { borderColor: "#94A3B8", backgroundColor: "#F8FAFC" } }}>
            {showActivityMetrics ? "Hide Activity Details" : "Show Activity Details"}
          </Button>
        </Box>
        <Divider sx={{ my: 2 }} />


        {/* Row 1: Condition Cards (not date-dependent, loads instantly) */}
        <Grid container spacing={1.5}>
          {[
            { label: "Diabetes", value: activityCards.diabetes, icon: <LocalHospital sx={{ color: "#DC2626" }} /> },
            { label: "Liver", value: activityCards.liver, icon: <LocalHospital sx={{ color: "#F59E0B" }} /> },
            { label: "Cholesterol", value: activityCards.cholesterol, icon: <LocalHospital sx={{ color: "#0EA5E9" }} /> },
            { label: "No Condition", value: activityCards.noCondition, icon: <LocalHospital sx={{ color: "#64748B" }} /> },
          ].map((m) => (
            <Grid key={m.label} item xs={12} sm={6} md={3}>
              <Box sx={cardSx}>
                <Box sx={{ fontSize: 28, lineHeight: 1 }}>{m.icon}</Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.4px" }}>{m.label}</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A" }}>
                    {activityCardsLoading ? <CircularProgress size={16} /> : fmt0(m.value)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>


        {/* Row 2: Agent Activity Totals (date-dependent) */}
        <Grid container spacing={1.5} sx={{ mt: 1.5 }}>
          {[
            {
              label: "Diet Plans Created",
              value: fmt0(activityTotals.dietPlansCreated),
              icon: <Restaurant sx={{ color: "#16A34A" }} />,
            },
            {
              label: "Profile Updates",
              value: `${fmt0(activityTotals.profileUpdates)} (${activityTotals.profileUpdatesPct}%)`,
              icon: <Edit sx={{ color: "#0EA5E9" }} />,
            },
            {
              label: "Condition Updates",
              value: `${fmt0(activityTotals.conditionUpdates)} (${activityTotals.conditionUpdatesPct}%)`,
              icon: <LocalHospital sx={{ color: "#F59E0B" }} />,
            },
            {
              // ✅ FIXED: shows count (connected) + % against assigned
              // e.g. assigned=20, connected=5 → "5 (25%)"
              label: "First Call Connected",
              value: `${fmt0(activityTotals.firstCallConnected)} (${activityTotals.firstCallPercentage}%)`,
              icon: <Phone sx={{ color: "#7C3AED" }} />,
            },
          ].map((m, index) => (
            <Grid key={`${m.label}-${index}`} item xs={12} sm={6} md={3}>
              <Box sx={cardSx}>
                <Box sx={{ fontSize: 28, lineHeight: 1 }}>{m.icon}</Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.4px" }}>{m.label}</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A" }}>
                    {activityTableLoading ? <CircularProgress size={16} /> : m.value}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>


        {/* Agent Activity Table */}
        {showActivityMetrics && (
          <Box sx={{ mt: 2.5 }}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A", mb: 1 }}>Health Expert Activity Metrics</Typography>
            <TableContainer sx={{ borderRadius: 2, border: "1px solid #E6E8EC" }} component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headerCellSx}>Expert Name</TableCell>
                    <TableCell sx={headerCellSx}>Assigned</TableCell>
                    <TableCell sx={headerCellSx}>Diet Plans</TableCell>
                    <TableCell sx={headerCellSx}>Profile Updates</TableCell>
                    <TableCell sx={headerCellSx}>Profile %</TableCell>
                    <TableCell sx={headerCellSx}>Condition Updates</TableCell>
                    <TableCell sx={headerCellSx}>Condition %</TableCell>
                    {/* ✅ FIXED: single "First Call Connected" column showing count only */}
                    <TableCell sx={headerCellSx}>First Call Connected</TableCell>
                    <TableCell sx={headerCellSx}>First Call %</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activityTableLoading && <TableRow><TableCell colSpan={9} sx={{ p: 0 }}><LinearProgress /></TableCell></TableRow>}
                  {!activityTableLoading && (activityRows || []).length === 0 && (
                    <TableRow><TableCell colSpan={9} align="center" sx={{ py: 2, color: "#64748B" }}>No data available</TableCell></TableRow>
                  )}
                  {!activityTableLoading && (activityRows || []).map((r, idx) => (
                    <TableRow key={`${r.agentName}-${idx}`} sx={{ backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FBFDFF", ...rowHoverSx }}>
                      <TableCell sx={{ fontWeight: 800, color: "#0F172A" }}>{r.agentName}</TableCell>
                      <TableCell align="center">{fmt0(r.assignedTotal)}</TableCell>
                      <TableCell align="center">{fmt0(r.dietPlansCreated ?? 0)}</TableCell>
                      <TableCell align="center">{fmt0(r.profileUpdates)}</TableCell>
                      <TableCell align="center">{r.profileUpdatesPct}%</TableCell>
                      <TableCell align="center">{fmt0(r.conditionUpdates)}</TableCell>
                      <TableCell align="center">{r.conditionUpdatesPct}%</TableCell>
                      {/* ✅ FIXED: only show connected count, no "X / Y" fraction */}
                      <TableCell align="center">{fmt0(r.firstCallConnected)}</TableCell>
                      <TableCell align="center">{r.firstCallPercentage}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>


      {/* ===================== 3) FOLLOWUP SUMMARY ===================== */}
      <Paper sx={{ ...sectionPaperSx, maxWidth: 1220, mx: "auto", mb: 2.5 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A" }}>Followup Summary</Typography>
          <Button onClick={() => setShowFollowupMetrics((v) => !v)} variant="outlined" sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800, borderColor: "#CBD5E1", color: "#0F172A", "&:hover": { borderColor: "#94A3B8", backgroundColor: "#F8FAFC" } }}>
            {showFollowupMetrics ? "Hide Followup Metrics" : "Show Followup Metrics"}
          </Button>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Grid container spacing={1.5}>
          {[
            { label: "No  Set", value: followupTotals.totalNoFollowupSet, icon: <PersonOff sx={{ color: "#0F172A" }} /> },
            { label: "Missed", value: followupTotals.totalFollowupMissed, icon: <EventBusy sx={{ color: "#DC2626" }} /> },
            { label: "Today", value: followupTotals.totalFollowupToday, icon: <EventAvailable sx={{ color: "#16A34A" }} /> },
            { label: "Tomorrow", value: followupTotals.totalFollowupTomorrow, icon: <Event sx={{ color: "#F59E0B" }} /> },
            { label: "Later", value: followupTotals.totalFollowupLater, icon: <Update sx={{ color: "#0284C7" }} /> },
            { label: "Lost", value: followupTotals.totalLostCustomers, icon: <HighlightOff sx={{ color: "#7C3AED" }} /> },
          ].map((m) => (
            <Grid key={m.label} item xs={12} sm={6} md={2}>
              <Box sx={cardSx}>
                <Box sx={{ fontSize: 28, lineHeight: 1 }}>{m.icon}</Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.4px" }}>{m.label}</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A" }}>{followupLoading ? <CircularProgress size={16} /> : fmt0(m.value)}</Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
        {showFollowupMetrics && (
          <Box sx={{ mt: 2.5 }}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A", mb: 1 }}>Health Expert Followup Metrics</Typography>
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
                  {followupLoading && <TableRow><TableCell colSpan={7} sx={{ p: 0 }}><LinearProgress /></TableCell></TableRow>}
                  {!followupLoading && (followupRows || []).length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 2, color: "#64748B" }}>No data available</TableCell></TableRow>}
                  {!followupLoading && (followupRows || []).map((r, idx) => (
                    <TableRow key={r.agentName || r.healthExpertName || idx} sx={{ backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FBFDFF", ...rowHoverSx }}>
                      <TableCell sx={{ fontWeight: 800, color: "#0F172A" }}>{r.agentName || r.healthExpertName || "—"}</TableCell>
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


      {/* ===================== 4) SHIPMENT SUMMARY ===================== */}
      <Paper sx={{ ...sectionPaperSx, maxWidth: 1220, mx: "auto", mb: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A" }}>
          Shipment Summary
        </Typography>
        <Typography variant="body2" sx={{ color: "#64748B", mt: 0.5 }}>
          Click any card to open details. Click “Other” to see remaining categories.
        </Typography>

        <Divider sx={{ my: 2 }} />

        {/* ✅ 5 cards in one row without overflow */}
        <Grid
          container
          spacing={1.5}
          sx={{ width: "100%", m: 0 }}
          columns={{ xs: 12, sm: 12, md: 10, lg: 10, xl: 10 }}
        >
          {shipmentCards.cards.map((card) => {
            const hasMatches = (card.matched?.length || 0) > 0;
            const to = hasMatches
              ? `/shipment-details?category=${encodeURIComponent(card.label)}&group=${encodeURIComponent(card.key)}&startDate=${shipmentDates.startDate}&endDate=${shipmentDates.endDate}`
              : null;

            return (
              <Grid key={card.key} item xs={12} sm={6} md={2}>
                <ShipmentCard
                  label={card.label}
                  icon={card.icon}
                  color={card.color}
                  count={card.count}
                  amount={card.amount}
                  percentage={card.percentage}
                  loading={shipmentLoading}
                  onClick={to ? () => window.open(to, "_blank", "noopener,noreferrer") : undefined}
                />
              </Grid>
            );
          })}

          {/* OTHER card (toggle) */}
          <Grid item xs={12} sm={6} md={2}>
            <Box
              onClick={() => setShowOtherShipments((v) => !v)}
              sx={{ ...cardSx, cursor: "pointer", width: "100%", minWidth: 0, overflow: "hidden" }}
            >
              {shipmentLoading ? (
                <Box sx={{ display: "flex", flex: 1, justifyContent: "center" }}>
                  <CircularProgress size={20} />
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", width: "100%", gap: 0.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Inventory sx={{ color: "#64748B", fontSize: 20 }} />
                      <Typography sx={{ fontWeight: 900, color: "#0F172A", fontSize: "0.85rem" }}>
                        Other
                      </Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 900, color: "#64748B", fontSize: "0.9rem" }}>
                      ({fmt0(shipmentCards.otherCount)})
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography sx={{ fontSize: "0.95rem", fontWeight: 900, color: "#0F172A" }}>
                      ₹{fmt2(shipmentCards.otherAmount)}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Typography sx={{ fontSize: "0.75rem", fontWeight: 900, color: "#64748B" }}>
                        {shipmentCards.otherPercentage}%
                      </Typography>
                      {showOtherShipments ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>

        {/* OTHER breakdown table (only when expanded) */}
        {showOtherShipments && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 1.5 }} />
            <Typography
              variant="body2"
              sx={{
                fontWeight: 800,
                color: "#64748B",
                mb: 1,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Other — Breakdown
            </Typography>

            <TableContainer
              sx={{ borderRadius: 2, border: "1px solid #E6E8EC", width: "100%", overflowX: "auto" }}
              component={Paper}
            >
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

                  {!shipmentLoading && (shipmentCards.otherRows || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 2, color: "#64748B" }}>
                        No other categories
                      </TableCell>
                    </TableRow>
                  )}

                  {!shipmentLoading &&
                    (shipmentCards.otherRows || []).map((row, idx) => {
                      const amount = row.totalAmount ?? row.amount ?? 0;
                      return (
                        <TableRow
                          key={`${row.category}-${idx}`}
                          component={RouterLink}
                          to={`/shipment-details?category=${encodeURIComponent(row.category)}&startDate=${shipmentDates.startDate}&endDate=${shipmentDates.endDate}`}
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
        )}

        {/* ✅ NEW: HEALTH EXPERT WISE SHIPMENT STATUS (just below Shipment Summary) */}
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
              <Autocomplete
                disablePortal
                openOnFocus
                size="small"
                options={healthExperts || []}
                getOptionLabel={(opt) => opt?.fullName || ""}
                filterOptions={filterTop5ThenSearch}
                value={(healthExperts || []).find((x) => x.fullName === selectedHealthExpert) || null}
                onChange={(_, v) => setSelectedHealthExpert(v?.fullName || "")}
                isOptionEqualToValue={(a, b) => a?.fullName === b?.fullName}
                noOptionsText="No match found"
                ListboxProps={{ style: { maxHeight: 260 } }}
                slotProps={{
                  popupIndicator: { sx: { display: "none" } },
                }}
                sx={{
                  minWidth: 280,
                  "& .MuiInputBase-root": {
                    height: 36,
                    paddingRight: "8px",
                    borderRadius: 2,
                    backgroundColor: "#fff",
                  },
                  "& .MuiInputBase-input": {
                    padding: "0 12px",
                    fontSize: 13.5,
                  },
                  "& .MuiAutocomplete-endAdornment": {
                    top: "calc(50% - 12px)",
                  },
                }}
                renderInput={(params) => (
                  <TextField {...params} size="small" placeholder="Search health expert..." />
                )}
              />
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
                        to={`/shipment-details?agent=${encodeURIComponent(selectedHealthExpert)}&category=${encodeURIComponent(row.category)}&startDate=${shipmentDates.startDate}&endDate=${shipmentDates.endDate}`}
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









      {/* ===================== 5) REACHED OUT LOGS ===================== */}
      <Paper sx={{ ...sectionPaperSx, maxWidth: 1220, mx: "auto", mb: 2.5 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A" }}>Reached Out Logs</Typography>
          <Button onClick={() => setShowReachoutDetails((v) => !v)} variant="outlined" sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800, borderColor: "#CBD5E1", color: "#0F172A", "&:hover": { borderColor: "#94A3B8", backgroundColor: "#F8FAFC" } }}>
            {showReachoutDetails ? "Hide Reached Out Logs Summary" : "Show Reached Out Logs Summary"}
          </Button>
        </Box>
        <Divider sx={{ my: 2 }} />
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
                  <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.4px" }}>{m.label}</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A" }}>{reachoutLoading ? <CircularProgress size={16} /> : fmt0(m.value)}</Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
        {showReachoutDetails && (
          <Box sx={{ mt: 2.5 }}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A", mb: 1 }}>Reached Out Logs Summary</Typography>
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
                  {reachoutLoading && <TableRow><TableCell colSpan={5} sx={{ p: 0 }}><LinearProgress /></TableCell></TableRow>}
                  {!reachoutLoading && (reachoutRows || []).length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 2, color: "#64748B" }}>No data available</TableCell></TableRow>}
                  {!reachoutLoading && (reachoutRows || []).map((r, idx) => (
                    <TableRow key={`${r.healthExpertAssigned}-${idx}`} sx={{ backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FBFDFF", ...rowHoverSx }}>
                      <TableCell sx={{ fontWeight: 800, color: "#0F172A" }}>{r.healthExpertAssigned}</TableCell>
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


      {/* ===================== 6) COD vs PREPAID ===================== */}
      <Paper sx={{ ...sectionPaperSx, maxWidth: 1220, mx: "auto" }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A" }}>COD vs Prepaid</Typography>
          <Button onClick={() => setShowCodDetails((v) => !v)} variant="outlined" sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800, borderColor: "#CBD5E1", color: "#0F172A", "&:hover": { borderColor: "#94A3B8", backgroundColor: "#F8FAFC" } }}>
            {showCodDetails ? "Hide COD vs Prepaid Summary" : "Show COD vs Prepaid Summary"}
          </Button>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Grid container spacing={1.5}>
  {[
    { label: "Total Orders", value: codTotals.totalOrders, icon: <ShoppingCart sx={{ color: "#0F172A" }} /> },
    { label: "COD Orders", value: codTotals.totalCOD, icon: <CurrencyRupee sx={{ color: "#EF4444" }} /> },
    { label: "Prepaid", value: codTotals.totalPrepaid, icon: <CurrencyRupee sx={{ color: "#16A34A" }} /> },
    { label: "Partial Paid", value: codTotals.totalPartial, icon: <Update sx={{ color: "#7C3AED" }} /> },
    { label: "COD %", value: `${codTotals.codPercent}%`, icon: <TrendingUp sx={{ color: "#F59E0B" }} /> },
    { label: "Prepaid %", value: `${codTotals.prepaidPercent}%`, icon: <TrendingUp sx={{ color: "#0284C7" }} /> },
    { label: "Partial %", value: `${codTotals.partialPercent}%`, icon: <TrendingUp sx={{ color: "#8B5CF6" }} /> },
  ].map((m) => (
    <Grid key={m.label} item xs={12} sm={6} md={1.7}> {/* md={1.7} for 7 cards across */}
      <Box sx={cardSx}>
        <Box sx={{ fontSize: 24, lineHeight: 1 }}>{m.icon}</Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 900, textTransform: "uppercase", fontSize: '0.65rem' }}>{m.label}</Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#0F172A" }}>{codLoading ? <CircularProgress size={12} /> : m.value}</Typography>
        </Box>
      </Box>
    </Grid>
  ))}
</Grid>
        {showCodDetails && (
          <Box sx={{ mt: 2.5 }}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A", mb: 1 }}>COD vs Prepaid Summary</Typography>
            <TableContainer sx={{ borderRadius: 2, border: "1px solid #E6E8EC" }} component={Paper}>
              <Table size="small">
                <TableHead>
  <TableRow>
    <TableCell sx={headerCellSx}>Health Expert Name</TableCell>
    <TableCell sx={headerCellSx}>Total Orders</TableCell>
    <TableCell sx={headerCellSx}>COD</TableCell>
    <TableCell sx={headerCellSx}>Prepaid</TableCell>
    <TableCell sx={headerCellSx}>Partial</TableCell> {/* New */}
    <TableCell sx={headerCellSx}>COD %</TableCell>
    <TableCell sx={headerCellSx}>Prepaid %</TableCell>
    <TableCell sx={headerCellSx}>Partial %</TableCell> {/* New */}
  </TableRow>
</TableHead>
<TableBody>
  {/* Total Row */}
  <TableRow sx={{ backgroundColor: "#EEF6FF" }}>
    <TableCell sx={{ fontWeight: 900 }}>TOTAL</TableCell>
    <TableCell align="center" sx={{ fontWeight: 800 }}>{codTotals.totalOrders}</TableCell>
    <TableCell align="center" sx={{ fontWeight: 800 }}>{codTotals.totalCOD}</TableCell>
    <TableCell align="center" sx={{ fontWeight: 800 }}>{codTotals.totalPrepaid}</TableCell>
    <TableCell align="center" sx={{ fontWeight: 800 }}>{codTotals.totalPartial}</TableCell>
    <TableCell align="center" sx={{ fontWeight: 800 }}>{codTotals.codPercent}%</TableCell>
    <TableCell align="center" sx={{ fontWeight: 800 }}>{codTotals.prepaidPercent}%</TableCell>
    <TableCell align="center" sx={{ fontWeight: 800 }}>{codTotals.partialPercent}%</TableCell>
  </TableRow>
  {/* Agent Rows */}
  {codRows.map((r, idx) => {
    const total = Number(r.totalOrders || 0);
    const getAgentPct = (val) => total > 0 ? ((val / total) * 100).toFixed(1) : "0.0";
    return (
      <TableRow key={idx} sx={{ backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FBFDFF", ...rowHoverSx }}>
        <TableCell sx={{ fontWeight: 800 }}>{r.agentName}</TableCell>
        <TableCell align="center">{total}</TableCell>
        <TableCell align="center">{r.codOrders}</TableCell>
        <TableCell align="center">{r.prepaidOrders}</TableCell>
        <TableCell align="center">{r.partialOrders}</TableCell>
        <TableCell align="center">{getAgentPct(r.codOrders)}%</TableCell>
        <TableCell align="center">{getAgentPct(r.prepaidOrders)}%</TableCell>
        <TableCell align="center">{getAgentPct(r.partialOrders)}%</TableCell>
      </TableRow>
    );
  })}
</TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>

      {/* ===================== NEW) RETENTION OVERVIEW COMBINED ===================== */}
      <Paper sx={{ ...sectionPaperSx, maxWidth: 1220, mx: "auto", mb: 2.5, p: 0 }}>
        <RetentionOverviewCombined />
      </Paper>
    </Box>
  );
};


export default ManagerRetentionDashboard;
