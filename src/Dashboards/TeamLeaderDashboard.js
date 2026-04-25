import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
  MenuItem,
} from "@mui/material";
import {
  AccountCircle,
  AssignmentReturn,
  CurrencyRupee,
  DirectionsBike,
  Edit,
  EmojiEvents,
  Event,
  EventAvailable,
  EventBusy,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  HighlightOff,
  Inventory,
  LocalHospital,
  LocalShipping,
  PersonOff,
  Phone,
  Restaurant,
  Schedule,
  ShoppingCart,
  TrendingUp,
  Update,
} from "@mui/icons-material";
import "./RetentionDashboard.css";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

const DS = {
  palette: {
    canvas: "#f1f4f9",
    surface: "#FFFFFF",
    surfaceAlt: "#FFFFFF",
    ink: "#0F172A",
    textSecondary: "#6B7280",
    textMuted: "#64748B",
    accent: "#1D4ED8",
    accentSoft: "#38BDF8",
    success: "#2E7D32",
    warning: "#ED6C02",
    error: "#D32F2F",
    info: "#0288D1",
    tableHeader: "#F3F4F6",
    border: "#E6E8EC",
    borderStrong: "#9FB4C9",
  },
  radius: {
    panel: 28,
    card: 11,
    button: 20,
    input: 16,
    pill: 999,
  },
  shadow: {
    soft: "0 1px 8px rgba(16, 24, 40, 0.06)",
    medium: "0 12px 24px rgba(9, 30, 66, 0.14)",
  },
};

const appFont = '"Segoe UI","Inter","SF Pro Text","Helvetica Neue",Arial,sans-serif';

const isSalesDepartment = (emp = {}) =>
  String(emp.department || "").trim().toLowerCase() === "sales";

const getEntityId = (entity) => String(entity?._id || entity?.id || "").trim();

const getLeaderId = (member = {}) =>
  member?.teamLeader?._id || member?.teamLeader?.id || member?.teamLeader || "";

const TEAM_COMBINED_OPTION = "__TEAM_COMBINED__";

const isTeamLeaderRole = (role = "") => {
  const normalized = String(role || "").trim().toLowerCase().replace(/[-_]+/g, " ");
  return normalized === "team leader";
};

const fmt0 = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const fmt1 = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 1 });
const fmt2 = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const pct = (achieved, target) => {
  const safeTarget = Number(target || 0);
  if (!safeTarget) return 0;
  return Math.max(0, (Number(achieved || 0) / safeTarget) * 100);
};

const formatMoney = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

const getSummaryHeading = (rangeValue) => {
  switch (rangeValue) {
    case "Today":
      return "Today Summary";
    case "Yesterday":
      return "Yesterday Summary";
    case "Month to date":
      return "Monthly Summary";
    case "Custom range":
      return "Custom Range Summary";
    default:
      return `${rangeValue} Summary`;
  }
};

const getWorkingDaysLeft = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const date = today.getDate();
  const lastDay = new Date(year, month + 1, 0).getDate();
  let days = 0;
  for (let d = date; d <= lastDay; d += 1) {
    const check = new Date(year, month, d);
    if (check.getDay() !== 0) days += 1;
  }
  return days;
};

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
    case "Month to date":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
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
    default:
      break;
  }

  return { startDate: toISODateLocal(start), endDate: toISODateLocal(end) };
};

const timeRangeOptions = [
  "Month to date",
  "Today",
  "Yesterday",
  "Last 7 days",
  "Last 30 days",
  "Last month",
  "Custom range",
];

const sectionPaperSx = {
  p: 1.4,
  borderRadius: "13px",
  border: `1px solid ${DS.palette.border}`,
  backgroundColor: DS.palette.surface,
  boxShadow: DS.shadow.soft,
};

const cardSx = {
  p: 1.25,
  display: "flex",
  gap: 1.4,
  alignItems: "center",
  borderRadius: DS.radius.card,
  border: `1px solid ${DS.palette.border}`,
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  boxShadow: DS.shadow.soft,
  transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
  minHeight: 74,
  minWidth: 0,
  width: "100%",
  overflow: "hidden",
  "&:hover": {
    borderColor: DS.palette.borderStrong,
    boxShadow: DS.shadow.medium,
  },
};

const headerCellSx = {
  fontWeight: 900,
  color: DS.palette.ink,
  py: 1.2,
  textAlign: "center",
  backgroundColor: DS.palette.tableHeader,
};

const rowHoverSx = {
  "&:hover": { backgroundColor: "#F8F4F1" },
};

const actionButtonSx = {
  borderRadius: 8,
  textTransform: "none",
  fontWeight: 800,
  px: 2.2,
  py: 0.6,
  borderColor: "#CBD5E1",
  color: DS.palette.ink,
  backgroundColor: DS.palette.surfaceAlt,
  "&:hover": {
    borderColor: "#94A3B8",
    backgroundColor: "#F8FAFC",
  },
};

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: DS.radius.input,
    backgroundColor: DS.palette.surfaceAlt,
  },
};

const sectionTitleSx = {
  fontWeight: 900,
  color: DS.palette.ink,
};

const monthlyBadgeConfig = {
  "TOTAL TARGET": { short: "TT", tone: "rd-tone-blue" },
  ACHIEVED: { short: "AC", tone: "rd-tone-orange" },
  REMAINING: { short: "RM", tone: "rd-tone-teal" },
  PROGRESS: { short: "PG", tone: "rd-tone-red" },
};

const TEAM_PERFORMANCE_SORT_OPTIONS = [
  { value: "achievement_desc", label: "Achievement % (High to Low)" },
  { value: "achievement_asc", label: "Achievement % (Low to High)" },
  { value: "remaining_desc", label: "Remaining Target (High to Low)" },
  { value: "remaining_asc", label: "Remaining Target (Low to High)" },
  { value: "incentive_desc", label: "Incentive Earned (High to Low)" },
  { value: "incentive_asc", label: "Incentive Earned (Low to High)" },
];

const getTeamSlabRate = (achievementPct = 0) => {
  const pctVal = Number(achievementPct || 0);
  if (pctVal >= 120) return 1.75;
  if (pctVal >= 110) return 1.25;
  if (pctVal >= 100) return 1.0;
  if (pctVal >= 90) return 0.6;
  return 0;
};

const getSlabMeta = (achieved = 0, target = 0) => {
  const safeTarget = Number(target || 0);
  const safeAchieved = Number(achieved || 0);
  const pctValue = safeTarget > 0 ? (safeAchieved / safeTarget) * 100 : 0;
  const currentRate = getTeamSlabRate(pctValue);
  const nextThreshold = [90, 100, 110, 120].find((threshold) => pctValue < threshold);
  const nextRate =
    nextThreshold === 90
      ? 0.6
      : nextThreshold === 100
        ? 1
        : nextThreshold === 110
          ? 1.25
          : nextThreshold === 120
            ? 1.75
            : currentRate;
  const needToNext =
    safeTarget > 0 && nextThreshold
      ? Math.max(0, (safeTarget * nextThreshold) / 100 - safeAchieved)
      : 0;

  return {
    pctValue,
    currentRate,
    nextRate,
    needToNext,
  };
};

const prettyLabel = (label = "") =>
  String(label)
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");

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
    key: "in_transit",
    label: "In Transit",
    color: "#2563EB",
    icon: <DirectionsBike sx={{ fontSize: 20 }} />,
    match: (cat) => String(cat).toLowerCase().includes("transit"),
  },
  {
    key: "out_for_delivery",
    label: "Out for Delivery",
    color: "#7C3AED",
    icon: <Schedule sx={{ fontSize: 20 }} />,
    match: (cat) => String(cat).toLowerCase().includes("out for delivery"),
  },
  {
    key: "rto",
    label: "RTO",
    color: "#DC2626",
    icon: <AssignmentReturn sx={{ fontSize: 20 }} />,
    match: (cat) => String(cat).toLowerCase().includes("rto"),
  },
];

const ShipmentCard = ({ label, icon, color, count, amount, percentage, loading }) => (
  <Box sx={cardSx}>
    {loading ? (
      <Box sx={{ display: "flex", flex: 1, justifyContent: "center" }}>
        <CircularProgress size={20} />
      </Box>
    ) : (
      <Box sx={{ display: "flex", flexDirection: "column", width: "100%", gap: 0.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ color, display: "flex", alignItems: "center" }}>{icon}</Box>
            <Typography sx={{ fontWeight: 900, color: DS.palette.ink, fontSize: "0.85rem" }}>
              {label}
            </Typography>
          </Box>
          <Typography sx={{ fontWeight: 900, color: DS.palette.textMuted, fontSize: "0.9rem" }}>
            ({fmt0(count)})
          </Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ fontSize: "0.95rem", fontWeight: 900, color: DS.palette.ink }}>
            ₹{fmt2(amount)}
          </Typography>
          <Chip
            label={`${percentage}%`}
            size="small"
            sx={{ backgroundColor: color, color: "#fff", fontWeight: 900, height: 20, fontSize: "0.7rem" }}
          />
        </Box>
      </Box>
    )}
  </Box>
);

const MetricCard = ({ title, value, sub }) => {
  const cfg = monthlyBadgeConfig[title] || {
    short: "MM",
    tone: "rd-tone-slate",
  };

  return (
    <article className={`rd-metric-card ${cfg.tone}`}>
      <span className="rd-icon">{cfg.short}</span>
      <span className="rd-label">{prettyLabel(title)}</span>
      <span className="rd-value">{value}</span>
      {sub ? <span className="rd-sub">{sub}</span> : null}
    </article>
  );
};

export default function TeamLeaderDashboard() {
  const initialDates = useMemo(() => getDateRange("Month to date"), []);

  const [loading, setLoading] = useState(true);
  const [leaderName, setLeaderName] = useState("");
  const [rows, setRows] = useState([]);
  const [teamMemberNames, setTeamMemberNames] = useState([]);

  const [range, setRange] = useState("Month to date");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [effectiveStart, setEffectiveStart] = useState(initialDates.startDate);
  const [effectiveEnd, setEffectiveEnd] = useState(initialDates.endDate);

  const [showHealthExpertMetrics, setShowHealthExpertMetrics] = useState(false);
  const [showActivityMetrics, setShowActivityMetrics] = useState(false);
  const [showFollowupMetrics, setShowFollowupMetrics] = useState(false);
  const [showCodDetails, setShowCodDetails] = useState(false);
  const [showOtherShipments, setShowOtherShipments] = useState(false);
  const [teamPerformanceSort, setTeamPerformanceSort] = useState("achievement_desc");
  const [memberTableSort, setMemberTableSort] = useState({ col: "drr", dir: "desc" });

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [followupLoading, setFollowupLoading] = useState(false);
  const [shipmentLoading, setShipmentLoading] = useState(false);
  const [codLoading, setCodLoading] = useState(false);
  const [agentShipmentLoading, setAgentShipmentLoading] = useState(false);

  const [healthExpertSummary, setHealthExpertSummary] = useState({
    totalActiveCustomers: 0,
    totalSalesDone: 0,
    totalSalesAmount: 0,
    avgOrderValue: 0,
  });
  const [healthExpertMetrics, setHealthExpertMetrics] = useState([]);

  const [activityCards, setActivityCards] = useState({
    diabetes: 0,
    liver: 0,
    cholesterol: 0,
    noCondition: 0,
  });
  const [activityRows, setActivityRows] = useState([]);
  const [activityTotals, setActivityTotals] = useState({
    assignedTotal: 0,
    dietPlansCreated: 0,
    profileUpdates: 0,
    profileUpdatesPct: 0,
    conditionUpdates: 0,
    conditionUpdatesPct: 0,
    firstCallConnected: 0,
    firstCallPercentage: 0,
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
  const [agentDeliveredMap, setAgentDeliveredMap] = useState({});
  const [selectedHealthExpert, setSelectedHealthExpert] = useState("");
  const [agentShipmentSummary, setAgentShipmentSummary] = useState([]);

  const [codRows, setCodRows] = useState([]);

  const teamNameSet = useMemo(
    () => new Set((teamMemberNames || []).map((name) => String(name || "").trim()).filter(Boolean)),
    [teamMemberNames]
  );

  useEffect(() => {
    const loadContext = async () => {
      setLoading(true);
      try {
        const sessionUser = JSON.parse(sessionStorage.getItem("user") || "{}");
        const sessionUserId = String(sessionUser?._id || sessionUser?.id || "").trim();

        const { data } = await api.get("/api/employees");
        const employees = Array.isArray(data) ? data : [];
        const activeEmployees = employees.filter((emp) => String(emp?.status || "").toLowerCase() === "active");

        const current =
          activeEmployees.find((emp) => {
            const id = getEntityId(emp);
            const sameId = sessionUserId && id === sessionUserId;
            const sameEmail =
              String(emp?.email || "").trim().toLowerCase() ===
              String(sessionUser?.email || "").trim().toLowerCase();
            const sameName =
              String(emp?.fullName || "").trim().toLowerCase() ===
              String(sessionUser?.fullName || "").trim().toLowerCase();
            return sameId || sameEmail || sameName;
          }) || sessionUser;

        const leaderId = getEntityId(current);

        const teamMembers = activeEmployees.filter((emp) => {
          if (!isSalesDepartment(emp)) return false;
          return String(getLeaderId(emp)) === String(leaderId);
        });

        const memberNames = teamMembers
          .map((member) => String(member?.fullName || "").trim())
          .filter(Boolean);

        const progressByName = {};
        const fetchProgress = async (name) => {
          if (!name) return 0;
          if (Object.prototype.hasOwnProperty.call(progressByName, name)) return progressByName[name];
          try {
            const { data: progress } = await api.get(
              `/api/retention-sales/progress?name=${encodeURIComponent(name)}`
            );
            progressByName[name] = Number(progress?.total || 0);
            return progressByName[name];
          } catch {
            progressByName[name] = 0;
            return 0;
          }
        };

        const selfTarget = Number(current?.target || 0);
        const selfAchieved = await fetchProgress(current?.fullName || sessionUser?.fullName || "");
        const excludeSelfTarget = isTeamLeaderRole(current?.role);

        const memberRows = await Promise.all(
          teamMembers.map(async (member) => {
            const target = Number(member?.target || 0);
            const achieved = await fetchProgress(member?.fullName || "");
            return {
              id: getEntityId(member),
              name: member?.fullName || "-",
              target,
              achieved,
              pending: Math.max(0, target - achieved),
              progress: pct(achieved, target),
            };
          })
        );

        const selfRow = {
          id: getEntityId(current) || "self",
          name: `${current?.fullName || sessionUser?.fullName || "Self"} (Self)`,
          target: 0,
          achieved: 0,
          pending: 0,
          progress: 0,
        };

        setLeaderName(current?.fullName || sessionUser?.fullName || "Team Leader");
        setRows(excludeSelfTarget ? memberRows : [selfRow, ...memberRows]);
        setTeamMemberNames(memberNames);
        setSelectedHealthExpert(TEAM_COMBINED_OPTION);
      } catch (error) {
        console.error("Failed to load team leader dashboard context:", error);
        setLeaderName("Team Leader");
        setRows([]);
        setTeamMemberNames([]);
        setSelectedHealthExpert(TEAM_COMBINED_OPTION);
      } finally {
        setLoading(false);
      }
    };

    loadContext();
  }, []);

  const normalizeCustomDates = useCallback((a, b) => {
    if (!a || !b) return null;
    const start = a <= b ? a : b;
    const end = a <= b ? b : a;
    return { start, end };
  }, []);

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

  const fetchHealthSummary = useCallback(async (startDate, endDate, namesSet, names) => {
    setSummaryLoading(true);
    try {
      const [activeCountsRes, aggregatedRes] = await Promise.all([
        api.get("/api/leads/retention/active-counts"),
        api.get("/api/retention-sales/aggregated", { params: { startDate, endDate } }),
      ]);

      const activeCountsArr = Array.isArray(activeCountsRes?.data) ? activeCountsRes.data : [];
      const aggregatedSales = Array.isArray(aggregatedRes?.data) ? aggregatedRes.data : [];

      const metrics = (names || []).map((name) => {
        const activeCustomers = Number(
          activeCountsArr.find((x) => String(x?._id || "").trim() === name)?.activeCount || 0
        );
        const salesMatch = aggregatedSales.find((x) => String(x?.agentName || "").trim() === name);
        const salesDone = Number(salesMatch?.salesDone || 0);
        const totalSales = Number(salesMatch?.totalSales || 0);
        const avgOrderValue = Number(salesMatch?.avgOrderValue || 0);
        return { healthExpertName: name, activeCustomers, salesDone, totalSales, avgOrderValue };
      });

      const summary = metrics.reduce(
        (acc, item) => {
          acc.totalActiveCustomers += Number(item.activeCustomers || 0);
          acc.totalSalesDone += Number(item.salesDone || 0);
          acc.totalSalesAmount += Number(item.totalSales || 0);
          return acc;
        },
        { totalActiveCustomers: 0, totalSalesDone: 0, totalSalesAmount: 0 }
      );
      summary.avgOrderValue = summary.totalSalesDone > 0 ? summary.totalSalesAmount / summary.totalSalesDone : 0;

      setHealthExpertSummary(summary);
      setHealthExpertMetrics(metrics.filter((m) => namesSet.has(String(m.healthExpertName || "").trim())));
    } catch (error) {
      console.error("Failed to fetch team health summary:", error);
      setHealthExpertSummary({ totalActiveCustomers: 0, totalSalesDone: 0, totalSalesAmount: 0, avgOrderValue: 0 });
      setHealthExpertMetrics([]);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchActivitySummary = useCallback(async (startDate, endDate, namesSet, names) => {
    setActivityLoading(true);
    try {
      const [conditionRes, activityRes] = await Promise.all([
        api.get("/api/retention-activity/condition-cards", {
          params: { agentNames: (names || []).join(",") },
        }),
        api.get("/api/retention-activity/health-expert-activity-summary", {
          params: { startDate, endDate },
        }),
      ]);

      const conditionData = conditionRes?.data || {};
      const rows = Array.isArray(activityRes?.data?.rows) ? activityRes.data.rows : [];
      const filteredRows = rows.filter((row) => namesSet.has(String(row?.agentName || "").trim()));

      const totals = filteredRows.reduce(
        (acc, row) => {
          acc.assignedTotal += Number(row?.assignedTotal || 0);
          acc.dietPlansCreated += Number(row?.dietPlansCreated || 0);
          acc.profileUpdates += Number(row?.profileUpdates || 0);
          acc.conditionUpdates += Number(row?.conditionUpdates || 0);
          acc.firstCallConnected += Number(row?.firstCallConnected || 0);
          return acc;
        },
        {
          assignedTotal: 0,
          dietPlansCreated: 0,
          profileUpdates: 0,
          profileUpdatesPct: 0,
          conditionUpdates: 0,
          conditionUpdatesPct: 0,
          firstCallConnected: 0,
          firstCallPercentage: 0,
        }
      );

      totals.profileUpdatesPct = totals.assignedTotal
        ? Number(((totals.profileUpdates / totals.assignedTotal) * 100).toFixed(1))
        : 0;
      totals.conditionUpdatesPct = totals.assignedTotal
        ? Number(((totals.conditionUpdates / totals.assignedTotal) * 100).toFixed(1))
        : 0;
      totals.firstCallPercentage = totals.assignedTotal
        ? Number(((totals.firstCallConnected / totals.assignedTotal) * 100).toFixed(2))
        : 0;

      setActivityCards({
        diabetes: Number(conditionData?.diabetes || 0),
        liver: Number(conditionData?.liver || 0),
        cholesterol: Number(conditionData?.cholesterol || 0),
        noCondition: Number(conditionData?.noCondition || 0),
      });
      setActivityRows(filteredRows);
      setActivityTotals(totals);
    } catch (error) {
      console.error("Failed to fetch team activity summary:", error);
      setActivityCards({ diabetes: 0, liver: 0, cholesterol: 0, noCondition: 0 });
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
      setActivityLoading(false);
    }
  }, []);

  const fetchFollowupSummary = useCallback(async (startDate, endDate, namesSet) => {
    setFollowupLoading(true);
    try {
      const { data } = await api.get("/api/retention-sales/aggregated-followup", {
        params: { startDate, endDate },
      });
      const rows = Array.isArray(data?.summary)
        ? data.summary
        : Array.isArray(data)
        ? data
        : [];

      const filteredRows = rows.filter((row) =>
        namesSet.has(String(row?.agentName || row?.healthExpertName || "").trim())
      );

      const totals = filteredRows.reduce(
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

      setFollowupRows(filteredRows);
      setFollowupTotals(totals);
    } catch (error) {
      console.error("Failed to fetch team followup summary:", error);
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

  const fetchShipmentSummary = useCallback(async (startDate, endDate, names) => {
    setShipmentLoading(true);
    try {
      const perAgent = await Promise.all(
        (names || []).map(async (agentName) => {
          const { data } = await api.get("/api/retention-sales/shipment-summary/agent", {
            params: { agentName, startDate, endDate },
          });
          return Array.isArray(data) ? data : [];
        })
      );

      const categoryMap = {};
      const deliveredByAgent = {};
      const deliveredDef = SHIPMENT_CARD_DEFS.find((d) => d.key === "delivered");
      perAgent.forEach((rowsPerAgent, idx) => {
        const agentName = (names || [])[idx];
        let agentDelivered = 0;
        rowsPerAgent.forEach((row) => {
          const category = String(row?.category || "").trim();
          if (!category || category.toLowerCase() === "total orders") return;
          if (!categoryMap[category]) {
            categoryMap[category] = { category, count: 0, totalAmount: 0 };
          }
          categoryMap[category].count += Number(row?.count || 0);
          categoryMap[category].totalAmount += Number(row?.totalAmount || row?.amount || 0);
          if (deliveredDef?.match(category)) {
            agentDelivered += Number(row?.totalAmount || row?.amount || 0);
          }
        });
        if (agentName) deliveredByAgent[agentName] = agentDelivered;
      });
      setAgentDeliveredMap(deliveredByAgent);

      const list = Object.values(categoryMap);
      const totalCount = list.reduce((sum, row) => sum + Number(row.count || 0), 0);
      const totalAmount = list.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);

      const withPct = list.map((row) => ({
        ...row,
        percentage: totalCount > 0 ? ((Number(row.count || 0) / totalCount) * 100).toFixed(2) : "0.00",
      }));

      setShipmentSummary([
        {
          category: "Total Orders",
          count: totalCount,
          totalAmount,
          percentage: "100.00",
        },
        ...withPct,
      ]);
    } catch (error) {
      console.error("Failed to fetch team shipment summary:", error);
      setShipmentSummary([]);
    } finally {
      setShipmentLoading(false);
    }
  }, []);

  const fetchAgentShipment = useCallback(async (healthExpertName, startDate, endDate) => {
    if (!healthExpertName) {
      setAgentShipmentSummary([]);
      return;
    }
    setAgentShipmentLoading(true);
    try {
      const { data } = await api.get("/api/retention-sales/shipment-summary/agent", {
        params: { agentName: healthExpertName, startDate, endDate },
      });
      const rows = Array.isArray(data) ? data : [];
      setAgentShipmentSummary(
        rows.filter((row) => String(row?.category || "").trim().toLowerCase() !== "total orders")
      );
    } catch (error) {
      console.error("Failed to fetch health expert shipment summary:", error);
      setAgentShipmentSummary([]);
    } finally {
      setAgentShipmentLoading(false);
    }
  }, []);

  const fetchCodPrepaid = useCallback(async (startDate, endDate, namesSet) => {
    setCodLoading(true);
    try {
      const { data } = await api.get("/api/retention-sales/cod-prepaid-summary", {
        params: { startDate, endDate },
      });
      const rows = Array.isArray(data) ? data : [];
      setCodRows(rows.filter((row) => namesSet.has(String(row?.agentName || "").trim())));
    } catch (error) {
      console.error("Failed to fetch team COD/prepaid summary:", error);
      setCodRows([]);
    } finally {
      setCodLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!teamMemberNames.length || !effectiveStart || !effectiveEnd) {
      setHealthExpertSummary({ totalActiveCustomers: 0, totalSalesDone: 0, totalSalesAmount: 0, avgOrderValue: 0 });
      setHealthExpertMetrics([]);
      setActivityCards({ diabetes: 0, liver: 0, cholesterol: 0, noCondition: 0 });
      setActivityRows([]);
      setFollowupRows([]);
      setShipmentSummary([]);
      setCodRows([]);
      return;
    }

    fetchHealthSummary(effectiveStart, effectiveEnd, teamNameSet, teamMemberNames);
    fetchActivitySummary(effectiveStart, effectiveEnd, teamNameSet, teamMemberNames);
    fetchFollowupSummary(effectiveStart, effectiveEnd, teamNameSet);
    fetchShipmentSummary(effectiveStart, effectiveEnd, teamMemberNames);
    fetchCodPrepaid(effectiveStart, effectiveEnd, teamNameSet);
  }, [
    teamMemberNames,
    teamNameSet,
    effectiveStart,
    effectiveEnd,
    fetchHealthSummary,
    fetchActivitySummary,
    fetchFollowupSummary,
    fetchShipmentSummary,
    fetchCodPrepaid,
  ]);

  useEffect(() => {
    if (!selectedHealthExpert || selectedHealthExpert === TEAM_COMBINED_OPTION) {
      setAgentShipmentSummary([]);
      return;
    }
    if (!teamNameSet.has(selectedHealthExpert)) {
      setAgentShipmentSummary([]);
      return;
    }
    fetchAgentShipment(selectedHealthExpert, effectiveStart, effectiveEnd);
  }, [selectedHealthExpert, effectiveStart, effectiveEnd, teamNameSet, fetchAgentShipment]);

  const healthExpertShipmentOptions = useMemo(
    () => [TEAM_COMBINED_OPTION, ...(teamMemberNames || [])],
    [teamMemberNames]
  );

  const isTeamCombinedSelected = selectedHealthExpert === TEAM_COMBINED_OPTION;

  const displayedShipmentRows = useMemo(() => {
    if (isTeamCombinedSelected) {
      return (shipmentSummary || []).filter(
        (row) => String(row?.category || "").trim().toLowerCase() !== "total orders"
      );
    }
    return agentShipmentSummary;
  }, [isTeamCombinedSelected, shipmentSummary, agentShipmentSummary]);

  const displayedShipmentLoading = isTeamCombinedSelected ? shipmentLoading : agentShipmentLoading;

  const totals = useMemo(() => {
    const target = rows.reduce((sum, row) => sum + Number(row?.target || 0), 0);
    const achieved = rows.reduce((sum, row) => sum + Number(row?.achieved || 0), 0);
    const pending = Math.max(0, target - achieved);
    const progress = pct(achieved, target);
    return { target, achieved, pending, progress };
  }, [rows]);

  const codTotals = useMemo(() => {
    const totalOrders = codRows.reduce((acc, a) => acc + Number(a?.totalOrders || 0), 0);
    const totalCOD = codRows.reduce((acc, a) => acc + Number(a?.codOrders || 0), 0);
    const totalPrepaid = codRows.reduce((acc, a) => acc + Number(a?.prepaidOrders || 0), 0);
    const totalPartial = codRows.reduce((acc, a) => acc + Number(a?.partialOrders || 0), 0);
    const getPct = (val) => (totalOrders > 0 ? ((val / totalOrders) * 100).toFixed(1) : "0.0");

    return {
      totalOrders,
      totalCOD,
      totalPrepaid,
      totalPartial,
      codPercent: getPct(totalCOD),
      prepaidPercent: getPct(totalPrepaid),
      partialPercent: getPct(totalPartial),
    };
  }, [codRows]);

  const shipmentCards = useMemo(() => {
    const rowsForCards = (shipmentSummary || []).filter(
      (r) => String(r?.category || "").trim().toLowerCase() !== "total orders"
    );

    const cards = SHIPMENT_CARD_DEFS.map((def) => {
      const matched = rowsForCards.filter((r) => def.match(r?.category || ""));
      return {
        ...def,
        count: matched.reduce((a, r) => a + Number(r?.count || 0), 0),
        amount: matched.reduce((a, r) => a + Number(r?.totalAmount ?? r?.amount ?? 0), 0),
        percentage: matched
          .reduce((a, r) => a + Number(r?.percentage || 0), 0)
          .toFixed(1),
      };
    });

    const otherRows = rowsForCards.filter(
      (r) => !SHIPMENT_CARD_DEFS.some((d) => d.match(r?.category || ""))
    );

    return {
      cards,
      otherRows,
      otherCount: otherRows.reduce((a, r) => a + Number(r?.count || 0), 0),
      otherAmount: otherRows.reduce((a, r) => a + Number(r?.totalAmount ?? r?.amount ?? 0), 0),
      otherPercentage: otherRows
        .reduce((a, r) => a + Number(r?.percentage || 0), 0)
        .toFixed(1),
    };
  }, [shipmentSummary]);

  const windowLabel = `${effectiveStart || "—"} - ${effectiveEnd || "—"}`;
  const summaryHeading = useMemo(() => getSummaryHeading(range), [range]);
  const workingDaysLeft = getWorkingDaysLeft();
  const dailySalesRequired =
    workingDaysLeft > 0 && totals.pending > 0
      ? Math.ceil(totals.pending / workingDaysLeft)
      : 0;
  const targetProgress = totals.target > 0 ? ((totals.achieved / totals.target) * 100).toFixed(0) : "0";

  const sortedMemberRows = useMemo(() => {
    const withExtras = rows.map((row) => ({
      ...row,
      delivered: agentDeliveredMap[row.name] || 0,
      drr: workingDaysLeft > 0 ? row.pending / workingDaysLeft : 0,
    }));
    const { col, dir } = memberTableSort;
    const mult = dir === "asc" ? 1 : -1;
    return [...withExtras].sort((a, b) => {
      if (col === "name") return mult * String(a.name).localeCompare(String(b.name));
      return mult * ((Number(a[col]) || 0) - (Number(b[col]) || 0));
    });
  }, [rows, workingDaysLeft, agentDeliveredMap, memberTableSort]);

  const handleMemberSort = (col) => {
    setMemberTableSort((prev) =>
      prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" }
    );
  };

  const totalFollowupVolume =
    Number(followupTotals.totalNoFollowupSet || 0) +
    Number(followupTotals.totalFollowupMissed || 0) +
    Number(followupTotals.totalFollowupToday || 0) +
    Number(followupTotals.totalFollowupTomorrow || 0) +
    Number(followupTotals.totalFollowupLater || 0);
  const followupCoverage =
    Number(followupTotals.totalFollowupToday || 0) +
    Number(followupTotals.totalFollowupTomorrow || 0);
  const followupCoverageRate = totalFollowupVolume
    ? ((followupCoverage / totalFollowupVolume) * 100).toFixed(1)
    : "0.0";

  const deliveredShipmentCount = Number(
    shipmentCards.cards.find((c) => c.key === "delivered")?.count || 0
  );
  const deliveredShipmentAmount = Number(
    shipmentCards.cards.find((c) => c.key === "delivered")?.amount || 0
  );
  const conversionRate = healthExpertSummary.totalActiveCustomers
    ? ((Number(healthExpertSummary.totalSalesDone || 0) / Number(healthExpertSummary.totalActiveCustomers || 0)) * 100).toFixed(2)
    : "0.00";
  const totalSlabMeta = getSlabMeta(totals.achieved, totals.target);
  const deliveredSlabMeta = getSlabMeta(deliveredShipmentAmount, totals.target);

  const executiveKpis = [
    { label: "Conversion Rate", value: `${conversionRate}%`, tone: "rd-chip-blue" },
    {
      label: "Delivered Shipments",
      value: deliveredShipmentCount.toLocaleString("en-IN"),
      tone: "rd-chip-teal",
    },
    { label: "Followup Coverage", value: `${followupCoverageRate}%`, tone: "rd-chip-violet" },
    { label: "Live Range", value: range, tone: "rd-chip-gold" },
  ];

  const teamPerformanceRows = useMemo(
    () =>
      rows.map((row) => {
        const target = Number(row?.target || 0);
        const achieved = Number(row?.achieved || 0);
        const remaining = Math.max(0, target - achieved);
        const achievementPct = target > 0 ? (achieved / target) * 100 : 0;
        const slabRate = getTeamSlabRate(achievementPct);
        const incentiveEarned = achieved * (slabRate / 100);
        const nextThreshold = [90, 100, 110, 120].find((threshold) => achievementPct < threshold);
        const gapToNextSlab =
          target > 0 && nextThreshold
            ? Math.max(0, (target * nextThreshold) / 100 - achieved)
            : 0;

        return {
          ...row,
          target,
          achieved,
          remaining,
          achievementPct,
          slabRate,
          incentiveEarned,
          gapToNextSlab,
        };
      }),
    [rows]
  );

  const sortedTeamPerformanceRows = useMemo(() => {
    const copied = [...teamPerformanceRows];
    const sorters = {
      achievement_desc: (a, b) => b.achievementPct - a.achievementPct,
      achievement_asc: (a, b) => a.achievementPct - b.achievementPct,
      remaining_desc: (a, b) => b.remaining - a.remaining,
      remaining_asc: (a, b) => a.remaining - b.remaining,
      incentive_desc: (a, b) => b.incentiveEarned - a.incentiveEarned,
      incentive_asc: (a, b) => a.incentiveEarned - b.incentiveEarned,
    };
    copied.sort(sorters[teamPerformanceSort] || sorters.achievement_desc);
    return copied;
  }, [teamPerformanceRows, teamPerformanceSort]);

  const topPerformers = useMemo(
    () => [...teamPerformanceRows].sort((a, b) => b.achievementPct - a.achievementPct).slice(0, 4),
    [teamPerformanceRows]
  );

  const lagContributors = useMemo(
    () => [...teamPerformanceRows].sort((a, b) => b.remaining - a.remaining).slice(0, 4),
    [teamPerformanceRows]
  );

  if (loading) {
    return (
      <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div className="rd-page rd-sales-page" style={{ fontFamily: appFont }}>
      <div className="rd-shell">
        <Box sx={{ p: { xs: 0.5, md: 1 } }}>
          <Stack spacing={1.4}>
        <section className="rd-hero rd-sales-hero rd-fade-1">
          <div>
            <h1>{leaderName || "Team Leader"} Dashboard</h1>
            <div className="rd-meta-line">
              <span className="rd-dot" />
              <span>{windowLabel}</span>
            </div>
          </div>

          <div className="rd-hero-controls">
            <div className="rd-filters">
              <label htmlFor="team-leader-range">Date Range</label>
              <select
                id="team-leader-range"
                value={range}
                onChange={handleRangeChange}
              >
                {timeRangeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="rd-drr-panel">
              <span className="rd-drr-text">
                DRR: <strong className="rd-drr-green">{dailySalesRequired > 0 ? formatMoney(dailySalesRequired) : "₹0"}</strong>
              </span>
              <span className="rd-drr-divider" />
              <span className="rd-drr-text">
                Target: ({fmt0(totals.achieved)}/{fmt0(totals.target)})
                <strong className="rd-drr-gold">{targetProgress}%</strong>
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

        {range === "Custom range" && (
          <section className="rd-custom-range rd-fade-3">
            <div className="rd-field">
              <label htmlFor="team-leader-start">Start Date</label>
              <input
                id="team-leader-start"
                type="date"
                value={customStart}
                onChange={(event) => handleCustomStart(event.target.value)}
              />
            </div>
            <div className="rd-field">
              <label htmlFor="team-leader-end">End Date</label>
              <input
                id="team-leader-end"
                type="date"
                value={customEnd}
                onChange={(event) => handleCustomEnd(event.target.value)}
              />
            </div>
          </section>
        )}

        {!teamMemberNames.length && (
          <Paper sx={{ ...sectionPaperSx, maxWidth: 1400, mx: "auto", width: "100%" }}>
          <Typography sx={{ color: DS.palette.textMuted, fontWeight: 700 }}>
              No active sales team members are mapped to this team leader.
            </Typography>
          </Paper>
        )}

        <Paper sx={{ ...sectionPaperSx, maxWidth: 1400, mx: "auto", width: "100%" }}>
          <Box sx={{ mb: 1.25 }}>
            <Typography variant="h6" sx={sectionTitleSx}>{summaryHeading}</Typography>
          </Box>
          <Box
            className="rd-card-grid"
            sx={{
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "repeat(4, minmax(0, 1fr))",
              },
            }}
          >
            <MetricCard title="TOTAL TARGET" value={`₹${fmt0(totals.target)}`} sub="Self + Team" />
            <MetricCard title="ACHIEVED" value={`₹${fmt0(totals.achieved)}`} />
            <MetricCard title="REMAINING" value={`₹${fmt0(totals.pending)}`} />
            <MetricCard title="PROGRESS" value={`${fmt1(totals.progress)}%`} />
          </Box>

          <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Chip
              label={`Current Delivered Slab: ${fmt2(deliveredSlabMeta.currentRate)}%`}
              sx={{ fontWeight: 800, backgroundColor: "#EEF2FF", color: "#1E293B" }}
            />
            <Button
              size="small"
              variant="contained"
              onClick={() => { window.location.href = "/incentives"; }}
              sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800, backgroundColor: "#0F172A", "&:hover": { backgroundColor: "#0B1220" } }}
            >
              View Summary
            </Button>
          </Box>
          <Grid container spacing={1.5}>
            {[
              { label: "Total Sales Slab", amount: totals.achieved, meta: totalSlabMeta },
              { label: "Delivered Sales Slab", amount: deliveredShipmentAmount, meta: deliveredSlabMeta },
            ].map(({ label, amount, meta }) => (
              <Grid item xs={12} sm={6} key={label}>
                <Box sx={{ border: "1px solid #E5E7EB", borderRadius: 2, p: 1.4, display: "flex", alignItems: "center", gap: 2 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ color: DS.palette.textMuted, fontWeight: 800, fontSize: "0.75rem", mb: 0.3 }}>{label}</Typography>
                    <Typography sx={{ fontWeight: 900, color: DS.palette.ink, fontSize: "0.95rem" }}>₹{fmt2(amount)}</Typography>
                    <LinearProgress variant="determinate" value={Math.max(0, Math.min(100, meta.pctValue))} sx={{ mt: 0.6, height: 5, borderRadius: 999, backgroundColor: "#E2E8F0" }} />
                  </Box>
                  <Box
                    sx={{
                      flexShrink: 0,
                      backgroundColor: "#FFF7ED",
                      border: "1px solid #FED7AA",
                      borderRadius: 2,
                      px: 1.2,
                      py: 0.7,
                      textAlign: "center",
                    }}
                  >
                    <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: "#92400e", letterSpacing: 0.3, textTransform: "uppercase", mb: 0.2 }}>
                      Need to next slab
                    </Typography>
                    <Typography sx={{ fontWeight: 900, color: "#c2410c", fontSize: "0.95rem", lineHeight: 1.2 }}>
                      ₹{fmt2(meta.needToNext)}
                    </Typography>
                    <Typography sx={{ fontWeight: 800, color: "#b45309", fontSize: "0.75rem", mt: 0.2 }}>
                      → {fmt2(meta.nextRate)}%
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>

          <Paper elevation={0} sx={{ mt: 2, border: "1px solid #e5e7eb", borderRadius: 2.5, overflow: "hidden" }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow
                    sx={{
                      background: "linear-gradient(90deg, #0c66e4 0%, #0f7ad8 100%)",
                      "& .MuiTableCell-root": {
                        color: "#f4f9ff",
                        fontWeight: 800,
                        borderBottom: "none",
                      },
                      "& .MuiTableSortLabel-root": { color: "#f4f9ff !important" },
                      "& .MuiTableSortLabel-root:hover": { color: "#fff !important" },
                      "& .MuiTableSortLabel-root.Mui-active": { color: "#fff !important" },
                      "& .MuiTableSortLabel-icon": { color: "#f4f9ff !important" },
                    }}
                  >
                    {[
                      { id: "name", label: "Member", align: "left" },
                      { id: "target", label: "Target", align: "right" },
                      { id: "achieved", label: "Achieved", align: "right" },
                      { id: "delivered", label: "Delivered", align: "right" },
                      { id: "pending", label: "Remaining", align: "right" },
                      { id: "progress", label: "Progress", align: "right" },
                      { id: "drr", label: "DRR", align: "right" },
                    ].map(({ id, label, align }) => (
                      <TableCell key={id} align={align}>
                        <TableSortLabel
                          active={memberTableSort.col === id}
                          direction={memberTableSort.col === id ? memberTableSort.dir : "desc"}
                          onClick={() => handleMemberSort(id)}
                        >
                          {label}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedMemberRows.map((row) => {
                    const overAchieved = row.target > 0 && row.achieved >= row.target;
                    return (
                    <TableRow key={row.id} sx={overAchieved ? { backgroundColor: "#f0fdf4" } : {}}>
                      <TableCell sx={{ fontWeight: 700, color: "#111827" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          {overAchieved && (
                            <EmojiEvents sx={{ fontSize: 16, color: "#d97706" }} />
                          )}
                          {row.name}
                        </Box>
                      </TableCell>
                      <TableCell align="right">₹{fmt0(row.target)}</TableCell>
                      <TableCell align="right" sx={{ color: "#059669", fontWeight: 700 }}>₹{fmt0(row.achieved)}</TableCell>
                      <TableCell align="right" sx={{ color: "#0369a1", fontWeight: 700 }}>₹{fmt0(row.delivered)}</TableCell>
                      <TableCell align="right" sx={{ color: "#dc2626", fontWeight: 700 }}>₹{fmt0(row.pending)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: overAchieved ? "#16a34a" : "#111827" }}>
                        {fmt1(row.progress)}%
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: "#7c3aed" }}>₹{fmt0(row.drr)}</TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Paper>

        <Paper sx={{ ...sectionPaperSx, maxWidth: 1400, mx: "auto", width: "100%" }}>
          <Box>
            <Typography variant="h6" sx={sectionTitleSx}>Team Performance Drilldown</Typography>
            <Typography sx={{ color: DS.palette.textMuted, fontWeight: 500 }}>
              Track who is hitting targets, lagging, current slab, and next-slab gap.
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={1.5}>
            <Grid item xs={12} md={6}>
              <Typography sx={{ color: DS.palette.textMuted, fontWeight: 800, mb: 1 }}>Top Performers</Typography>
              <Stack spacing={1}>
                {topPerformers.map((member) => (
                  <Box
                    key={`top-${member.id}`}
                    sx={{
                      border: `1px solid ${DS.palette.border}`,
                      borderRadius: 2,
                      p: 1.3,
                      backgroundColor: "#F9FBFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 900, color: DS.palette.ink, lineHeight: 1.2 }}>
                        {member.name}
                      </Typography>
                      <Typography sx={{ color: DS.palette.textMuted, mt: 0.3 }}>
                        Achieved ₹{fmt2(member.achieved)} | Incentive ₹{fmt2(member.incentiveEarned)}
                      </Typography>
                    </Box>
                    <Chip
                      label={`${fmt1(member.achievementPct)}%`}
                      size="small"
                      sx={{ backgroundColor: "#2E7D32", color: "#fff", fontWeight: 800 }}
                    />
                  </Box>
                ))}
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography sx={{ color: DS.palette.textMuted, fontWeight: 800, mb: 1 }}>Lag Contributors</Typography>
              <Stack spacing={1}>
                {lagContributors.map((member) => (
                  <Box
                    key={`lag-${member.id}`}
                    sx={{
                      border: `1px solid ${DS.palette.border}`,
                      borderRadius: 2,
                      p: 1.3,
                      backgroundColor: "#FFFAF6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 900, color: DS.palette.ink, lineHeight: 1.2 }}>
                        {member.name}
                      </Typography>
                      <Typography sx={{ color: DS.palette.textMuted, mt: 0.3 }}>
                        Slab {fmt2(member.slabRate)}% | Need ₹{fmt2(member.gapToNextSlab)} to next slab
                      </Typography>
                    </Box>
                    <Chip
                      label={`Lag ₹${fmt2(member.remaining)}`}
                      size="small"
                      sx={{ backgroundColor: "#EF6C00", color: "#fff", fontWeight: 800 }}
                    />
                  </Box>
                ))}
              </Stack>
            </Grid>
          </Grid>

        </Paper>

        <Paper sx={{ ...sectionPaperSx, maxWidth: 1400, mx: "auto", width: "100%" }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="h6" sx={sectionTitleSx}>Health Expert's Summary</Typography>
            <Button onClick={() => setShowHealthExpertMetrics((v) => !v)} variant="outlined" sx={actionButtonSx}>
              {showHealthExpertMetrics ? "Hide Health Expert Metrics" : "Show Health Expert Metrics"}
            </Button>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={1.5}>
            {[
              { label: "Active Customers", value: healthExpertSummary.totalActiveCustomers, icon: <AccountCircle sx={{ color: "#0EA5E9" }} /> },
              { label: "Sales Done", value: healthExpertSummary.totalSalesDone, icon: <ShoppingCart sx={{ color: "#16A34A" }} /> },
              { label: "Total Sales", value: `₹${fmt0(healthExpertSummary.totalSalesAmount)}`, icon: <CurrencyRupee sx={{ color: "#EF4444" }} /> },
              { label: "Avg Order Value", value: `₹${fmt0(healthExpertSummary.avgOrderValue)}`, icon: <TrendingUp sx={{ color: "#7C3AED" }} /> },
            ].map((m) => (
              <Grid key={m.label} item xs={12} sm={6} md={3}>
                <Box sx={cardSx}>
                  <Box sx={{ fontSize: 28, lineHeight: 1 }}>{m.icon}</Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" sx={{ color: DS.palette.textMuted, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.4px" }}>{m.label}</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900, color: DS.palette.ink }}>{summaryLoading ? <CircularProgress size={16} /> : m.value}</Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>

          {showHealthExpertMetrics && (
            <Box sx={{ mt: 2.5 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: DS.palette.ink, mb: 1 }}>Health Expert Metrics</Typography>
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
                      <TableRow><TableCell colSpan={5} sx={{ p: 0 }}><LinearProgress /></TableCell></TableRow>
                    )}
                    {!summaryLoading && healthExpertMetrics.length === 0 && (
                      <TableRow><TableCell colSpan={5} align="center" sx={{ py: 2, color: DS.palette.textMuted }}>No data available</TableCell></TableRow>
                    )}
                    {!summaryLoading && healthExpertMetrics.map((r, idx) => (
                      <TableRow key={r.healthExpertName || idx} sx={{ backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FBFDFF", ...rowHoverSx }}>
                        <TableCell sx={{ fontWeight: 800, color: DS.palette.ink }}>{r.healthExpertName}</TableCell>
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

        <Paper sx={{ ...sectionPaperSx, maxWidth: 1400, mx: "auto", width: "100%" }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="h6" sx={sectionTitleSx}>Activity Summary</Typography>
            <Button onClick={() => setShowActivityMetrics((v) => !v)} variant="outlined" sx={actionButtonSx}>
              {showActivityMetrics ? "Hide Activity Details" : "Show Activity Details"}
            </Button>
          </Box>
          <Divider sx={{ my: 2 }} />

          <Grid container spacing={1.5}>
            {[
              { label: "Diabetes", value: activityCards.diabetes, icon: <LocalHospital sx={{ color: "#DC2626" }} /> },
              { label: "Liver", value: activityCards.liver, icon: <LocalHospital sx={{ color: "#F59E0B" }} /> },
              { label: "Cholesterol", value: activityCards.cholesterol, icon: <LocalHospital sx={{ color: "#0EA5E9" }} /> },
              { label: "No Condition", value: activityCards.noCondition, icon: <LocalHospital sx={{ color: DS.palette.textMuted }} /> },
            ].map((m) => (
              <Grid key={m.label} item xs={12} sm={6} md={3}>
                <Box sx={cardSx}>
                  <Box sx={{ fontSize: 28, lineHeight: 1 }}>{m.icon}</Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" sx={{ color: DS.palette.textMuted, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.4px" }}>{m.label}</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900, color: DS.palette.ink }}>{activityLoading ? <CircularProgress size={16} /> : fmt0(m.value)}</Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={1.5} sx={{ mt: 1.5 }}>
            {[
              { label: "Diet Plans Created", value: fmt0(activityTotals.dietPlansCreated), icon: <Restaurant sx={{ color: "#16A34A" }} /> },
              { label: "Profile Updates", value: `${fmt0(activityTotals.profileUpdates)} (${activityTotals.profileUpdatesPct}%)`, icon: <Edit sx={{ color: "#0EA5E9" }} /> },
              { label: "Condition Updates", value: `${fmt0(activityTotals.conditionUpdates)} (${activityTotals.conditionUpdatesPct}%)`, icon: <LocalHospital sx={{ color: "#F59E0B" }} /> },
              { label: "First Call Connected", value: `${fmt0(activityTotals.firstCallConnected)} (${activityTotals.firstCallPercentage}%)`, icon: <Phone sx={{ color: "#7C3AED" }} /> },
            ].map((m, index) => (
              <Grid key={`${m.label}-${index}`} item xs={12} sm={6} md={3}>
                <Box sx={cardSx}>
                  <Box sx={{ fontSize: 28, lineHeight: 1 }}>{m.icon}</Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" sx={{ color: DS.palette.textMuted, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.4px" }}>{m.label}</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900, color: DS.palette.ink }}>{activityLoading ? <CircularProgress size={16} /> : m.value}</Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>

          {showActivityMetrics && (
            <Box sx={{ mt: 2.5 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: DS.palette.ink, mb: 1 }}>Health Expert Activity Metrics</Typography>
              <TableContainer sx={{ borderRadius: 2, border: "1px solid #E6E8EC" }} component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headerCellSx}>Agent Name</TableCell>
                      <TableCell sx={headerCellSx}>Assigned</TableCell>
                      <TableCell sx={headerCellSx}>Diet Plans</TableCell>
                      <TableCell sx={headerCellSx}>Profile Updates</TableCell>
                      <TableCell sx={headerCellSx}>Profile %</TableCell>
                      <TableCell sx={headerCellSx}>Condition Updates</TableCell>
                      <TableCell sx={headerCellSx}>Condition %</TableCell>
                      <TableCell sx={headerCellSx}>First Call Connected</TableCell>
                      <TableCell sx={headerCellSx}>First Call %</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activityLoading && (
                      <TableRow><TableCell colSpan={9} sx={{ p: 0 }}><LinearProgress /></TableCell></TableRow>
                    )}
                    {!activityLoading && activityRows.length === 0 && (
                      <TableRow><TableCell colSpan={9} align="center" sx={{ py: 2, color: DS.palette.textMuted }}>No data available</TableCell></TableRow>
                    )}
                    {!activityLoading && activityRows.map((r, idx) => (
                      <TableRow key={`${r.agentName}-${idx}`} sx={{ backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FBFDFF", ...rowHoverSx }}>
                        <TableCell sx={{ fontWeight: 800, color: DS.palette.ink }}>{r.agentName}</TableCell>
                        <TableCell align="center">{fmt0(r.assignedTotal)}</TableCell>
                        <TableCell align="center">{fmt0(r.dietPlansCreated ?? 0)}</TableCell>
                        <TableCell align="center">{fmt0(r.profileUpdates)}</TableCell>
                        <TableCell align="center">{r.profileUpdatesPct}%</TableCell>
                        <TableCell align="center">{fmt0(r.conditionUpdates)}</TableCell>
                        <TableCell align="center">{r.conditionUpdatesPct}%</TableCell>
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

        <Paper sx={{ ...sectionPaperSx, maxWidth: 1400, mx: "auto", width: "100%" }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="h6" sx={sectionTitleSx}>Followup Summary</Typography>
            <Button onClick={() => setShowFollowupMetrics((v) => !v)} variant="outlined" sx={actionButtonSx}>
              {showFollowupMetrics ? "Hide Followup Metrics" : "Show Followup Metrics"}
            </Button>
          </Box>
          <Divider sx={{ my: 2 }} />

          <Grid container spacing={1.5}>
            {[
              { label: "No Set", value: followupTotals.totalNoFollowupSet, icon: <PersonOff sx={{ color: DS.palette.ink }} /> },
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
                    <Typography variant="caption" sx={{ color: DS.palette.textMuted, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.4px" }}>{m.label}</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900, color: DS.palette.ink }}>{followupLoading ? <CircularProgress size={16} /> : fmt0(m.value)}</Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>

          {showFollowupMetrics && (
            <Box sx={{ mt: 2.5 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: DS.palette.ink, mb: 1 }}>Health Expert Followup Metrics</Typography>
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
                      <TableRow><TableCell colSpan={7} sx={{ p: 0 }}><LinearProgress /></TableCell></TableRow>
                    )}
                    {!followupLoading && followupRows.length === 0 && (
                      <TableRow><TableCell colSpan={7} align="center" sx={{ py: 2, color: DS.palette.textMuted }}>No data available</TableCell></TableRow>
                    )}
                    {!followupLoading && followupRows.map((r, idx) => (
                      <TableRow key={`${r.agentName || r.healthExpertName}-${idx}`} sx={{ backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FBFDFF", ...rowHoverSx }}>
                        <TableCell sx={{ fontWeight: 800, color: DS.palette.ink }}>{r.agentName || r.healthExpertName || "—"}</TableCell>
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

        <Paper sx={{ ...sectionPaperSx, maxWidth: 1400, mx: "auto", width: "100%" }}>
          <Typography variant="h6" sx={sectionTitleSx}>Shipment Summary</Typography>
          <Typography variant="body1" sx={{ color: DS.palette.textMuted, mt: 0.7 }}>
            Click any card to open details. Click "Other" to see remaining categories.
          </Typography>
          <Divider sx={{ my: 2 }} />

          <Grid container spacing={1.5}>
            {shipmentCards.cards.map((card) => (
              <Grid key={card.key} item xs={12} sm={6} md={2.4}>
                <ShipmentCard
                  label={card.label}
                  icon={card.icon}
                  color={card.color}
                  count={card.count}
                  amount={card.amount}
                  percentage={card.percentage}
                  loading={shipmentLoading}
                />
              </Grid>
            ))}

            <Grid item xs={12} sm={6} md={2.4}>
              <Box onClick={() => setShowOtherShipments((v) => !v)} sx={{ ...cardSx, cursor: "pointer" }}>
                {shipmentLoading ? (
                  <Box sx={{ display: "flex", flex: 1, justifyContent: "center" }}>
                    <CircularProgress size={20} />
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", width: "100%", gap: 0.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Inventory sx={{ color: DS.palette.textMuted, fontSize: 20 }} />
                        <Typography sx={{ fontWeight: 900, color: DS.palette.ink, fontSize: "0.85rem" }}>Other</Typography>
                      </Box>
                      <Typography sx={{ fontWeight: 900, color: DS.palette.textMuted, fontSize: "0.9rem" }}>
                        ({fmt0(shipmentCards.otherCount)})
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography sx={{ fontSize: "0.95rem", fontWeight: 900, color: DS.palette.ink }}>
                        ₹{fmt2(shipmentCards.otherAmount)}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 900, color: DS.palette.textMuted }}>
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

          {showOtherShipments && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 1.5 }} />
              <Typography variant="body2" sx={{ fontWeight: 800, color: DS.palette.textMuted, mb: 1, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Other — Breakdown
              </Typography>
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
                    {!shipmentLoading && shipmentCards.otherRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 2, color: DS.palette.textMuted }}>
                          No other categories
                        </TableCell>
                      </TableRow>
                    )}
                    {!shipmentLoading && shipmentCards.otherRows.map((row, idx) => (
                      <TableRow key={`${row.category}-${idx}`} sx={{ backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FBFDFF", ...rowHoverSx }}>
                        <TableCell sx={{ fontWeight: 800, color: DS.palette.ink }} align="center">{row.category}</TableCell>
                        <TableCell align="center">{fmt0(row.count)}</TableCell>
                        <TableCell align="center">₹{fmt2(row.totalAmount ?? row.amount ?? 0)}</TableCell>
                        <TableCell align="center">{row.percentage}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: "flex", gap: 2, alignItems: { xs: "flex-start", md: "center" }, justifyContent: "space-between", flexWrap: "wrap" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: DS.palette.ink }}>
                Health Expert Wise Shipment Status
              </Typography>
              <Autocomplete
                disablePortal
                openOnFocus
                disableClearable
                size="small"
                options={healthExpertShipmentOptions}
                value={selectedHealthExpert || TEAM_COMBINED_OPTION}
                onChange={(_, v) => setSelectedHealthExpert(v || TEAM_COMBINED_OPTION)}
                isOptionEqualToValue={(a, b) => a === b}
                sx={{ minWidth: 280, ...fieldSx }}
                getOptionLabel={(option) =>
                  option === TEAM_COMBINED_OPTION ? "Team (Combined)" : String(option || "")
                }
                renderInput={(params) => (
                  <TextField {...params} size="small" placeholder="Search health expert..." />
                )}
              />
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
                  {displayedShipmentLoading && (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ p: 0 }}>
                        <LinearProgress />
                      </TableCell>
                    </TableRow>
                  )}

                  {!displayedShipmentLoading && !selectedHealthExpert && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 2, color: DS.palette.textMuted }}>
                        Please select a view.
                      </TableCell>
                    </TableRow>
                  )}

                  {!displayedShipmentLoading && selectedHealthExpert && displayedShipmentRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 2, color: DS.palette.textMuted }}>
                        {isTeamCombinedSelected
                          ? "No shipment data for this team."
                          : "No shipment data for this Health Expert."}
                      </TableCell>
                    </TableRow>
                  )}

                  {!displayedShipmentLoading && selectedHealthExpert && displayedShipmentRows.map((row, idx) => (
                    <TableRow key={`${row.category}-${idx}`} sx={{ backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FBFDFF", ...rowHoverSx }}>
                      <TableCell sx={{ fontWeight: 800, color: DS.palette.ink }} align="center">{row.category}</TableCell>
                      <TableCell align="center">{fmt0(row.count)}</TableCell>
                      <TableCell align="center">₹{fmt2(row.totalAmount ?? row.amount ?? 0)}</TableCell>
                      <TableCell align="center">{row.percentage}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>

        <Paper sx={{ ...sectionPaperSx, maxWidth: 1400, mx: "auto", width: "100%" }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="h6" sx={sectionTitleSx}>COD vs Prepaid</Typography>
            <Button onClick={() => setShowCodDetails((v) => !v)} variant="outlined" sx={actionButtonSx}>
              {showCodDetails ? "Hide COD vs Prepaid Summary" : "Show COD vs Prepaid Summary"}
            </Button>
          </Box>
          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(7, minmax(0, 1fr))" } }}>
            {[
              { label: "Total Orders", value: codTotals.totalOrders, icon: <ShoppingCart sx={{ color: DS.palette.ink }} /> },
              { label: "COD Orders", value: codTotals.totalCOD, icon: <CurrencyRupee sx={{ color: "#EF4444" }} /> },
              { label: "Prepaid", value: codTotals.totalPrepaid, icon: <CurrencyRupee sx={{ color: "#16A34A" }} /> },
              { label: "Partial Paid", value: codTotals.totalPartial, icon: <Update sx={{ color: "#7C3AED" }} /> },
              { label: "COD %", value: `${codTotals.codPercent}%`, icon: <TrendingUp sx={{ color: "#F59E0B" }} /> },
              { label: "Prepaid %", value: `${codTotals.prepaidPercent}%`, icon: <TrendingUp sx={{ color: "#0284C7" }} /> },
              { label: "Partial %", value: `${codTotals.partialPercent}%`, icon: <TrendingUp sx={{ color: "#8B5CF6" }} /> },
            ].map((m) => (
              <Box key={m.label} sx={cardSx}>
                <Box sx={{ fontSize: 24, lineHeight: 1 }}>{m.icon}</Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" sx={{ color: DS.palette.textMuted, fontWeight: 900, textTransform: "uppercase", fontSize: "0.65rem" }}>{m.label}</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: DS.palette.ink }}>{codLoading ? <CircularProgress size={12} /> : m.value}</Typography>
                </Box>
              </Box>
            ))}
          </Box>

          {showCodDetails && (
            <Box sx={{ mt: 2.5 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: DS.palette.ink, mb: 1 }}>COD vs Prepaid Summary</Typography>
              <TableContainer sx={{ borderRadius: 2, border: "1px solid #E6E8EC" }} component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headerCellSx}>Health Expert Name</TableCell>
                      <TableCell sx={headerCellSx}>Total Orders</TableCell>
                      <TableCell sx={headerCellSx}>COD</TableCell>
                      <TableCell sx={headerCellSx}>Prepaid</TableCell>
                      <TableCell sx={headerCellSx}>Partial</TableCell>
                      <TableCell sx={headerCellSx}>COD %</TableCell>
                      <TableCell sx={headerCellSx}>Prepaid %</TableCell>
                      <TableCell sx={headerCellSx}>Partial %</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
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
                    {codRows.map((r, idx) => {
                      const total = Number(r.totalOrders || 0);
                      const getAgentPct = (val) => (total > 0 ? ((val / total) * 100).toFixed(1) : "0.0");
                      return (
                        <TableRow key={idx} sx={{ backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FBFDFF", ...rowHoverSx }}>
                          <TableCell sx={{ fontWeight: 800 }}>{r.agentName}</TableCell>
                          <TableCell align="center">{total}</TableCell>
                          <TableCell align="center">{r.codOrders}</TableCell>
                          <TableCell align="center">{r.prepaidOrders}</TableCell>
                          <TableCell align="center">{r.partialOrders}</TableCell>
                          <TableCell align="center">{getAgentPct(Number(r.codOrders || 0))}%</TableCell>
                          <TableCell align="center">{getAgentPct(Number(r.prepaidOrders || 0))}%</TableCell>
                          <TableCell align="center">{getAgentPct(Number(r.partialOrders || 0))}%</TableCell>
                        </TableRow>
                      );
                    })}
                    {!codRows.length && (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 2, color: DS.palette.textMuted }}>
                          No data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Paper>
          </Stack>
        </Box>
      </div>
    </div>
  );
}
