import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  Paper,
  Popover,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowUpward as ArrowUpwardIcon,
  CheckCircle as CheckCircleIcon,
  Autorenew as AutorenewIcon,
  Cancel as CancelIcon,
  VisibilityOutlined as ViewIcon,
  AccountBalanceWalletOutlined as WalletBalanceIcon,
  RedeemOutlined as RedeemIcon,
} from "@mui/icons-material";
import WalletRedeemDialog from "./WalletRedeemDialog";

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";
const MIN_WALLET_MONTH = "2026-03";

const BRAND = {
  bg: "#f6f8fb",
  card: "#ffffff",
  border: "#e6ebf2",
  text: "#152033",
  sub: "#667085",
  primary: "#2563eb",
  available: "#16a34a",
  coming: "#f59e0b",
  reversed: "#dc2626",
  unknown: "#94a3b8",
  atRisk: "#ea580c",
  coin: "#7c3aed",
  coinSoft: "#f5f3ff",
  coinBorder: "#ddd6fe",
  prepaid: "#0f766e",
  prepaidSoft: "#ecfeff",
  partial: "#7c2d12",
  partialSoft: "#fff7ed",
  referral: "#1d4ed8",
  referralSoft: "#eff6ff",
};

const TABLE_CELL_COMMON_SX = {
  py: 1.5,
  px: 2,
  verticalAlign: "middle",
  borderBottom: "1px solid #eef2f7",
};

const TABLE_HEAD_SX = {
  ...TABLE_CELL_COMMON_SX,
  fontWeight: 700,
  color: BRAND.text,
  backgroundColor: "#f8fafc",
  whiteSpace: "nowrap",
};

const COL_DATE = { width: "12%" };
const COL_ORDER = { width: "15%" };
const COL_CUSTOMER = { width: "20%" };
const COL_AMOUNT = { width: "13%" };
const COL_STATUS = { width: "18%" };
const COL_WALLET = { width: "12%" };
const COL_INCENTIVE = { width: "10%" };

function getAuthHeaders() {
  try {
    const raw = sessionStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    return user ? { "x-session-user": JSON.stringify(user) } : {};
  } catch {
    return {};
  }
}

function getSessionUser() {
  try {
    const raw = sessionStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getCurrentMonthValue() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const currentMonth = `${yyyy}-${mm}`;
  return currentMonth < MIN_WALLET_MONTH ? MIN_WALLET_MONTH : currentMonth;
}

function VKRTargetProgressBar({ value = 0, threshold = 60 }) {
  const safeValue = Math.max(0, Math.min(100, Number(value || 0)));
  const safeThreshold = Math.max(0, Math.min(100, Number(threshold || 60)));
  const isSafe = safeValue >= safeThreshold;

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          position: "relative",
          height: 12,
          borderRadius: 999,
          overflow: "hidden",
          border: "1px solid #e5e7eb",
          background: isSafe ? "#dcfce7" : "#fee2e2",
        }}
      >
        <Box
          sx={{
            height: "100%",
            width: `${safeValue}%`,
            background: isSafe ? "#16a34a" : "#dc2626",
            transition: "width 0.35s ease",
            borderRadius: 999,
          }}
        />
      </Box>

      <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.75 }}>
        <Typography variant="caption" sx={{ color: BRAND.sub, fontWeight: 600 }}>
          0%
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: isSafe ? BRAND.available : BRAND.reversed,
            fontWeight: 700,
          }}
        >
          Min. Required: {safeThreshold}%
        </Typography>
        <Typography variant="caption" sx={{ color: BRAND.sub, fontWeight: 600 }}>
          100%
        </Typography>
      </Stack>
    </Box>
  );
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN");
}

function monthToStartDate(monthValue) {
  if (!monthValue) return "";
  return `${monthValue}-01`;
}

function monthToEndDate(monthValue) {
  if (!monthValue) return "";
  const [year, month] = monthValue.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${monthValue}-${String(lastDay).padStart(2, "0")}`;
}

function formatMonthLabel(monthValue) {
  if (!monthValue) return "-";
  const [year, month] = monthValue.split("-").map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function getBucketMeta(bucket) {
  switch (bucket) {
    case "available":
      return {
        label: "Available",
        color: BRAND.available,
        chipColor: "success",
        icon: <CheckCircleIcon sx={{ fontSize: 16 }} />,
      };
    case "coming":
      return {
        label: "Upcoming",
        color: BRAND.coming,
        chipColor: "warning",
        icon: <AutorenewIcon sx={{ fontSize: 16 }} />,
      };
    case "reversed":
      return {
        label: "Lost",
        color: BRAND.reversed,
        chipColor: "error",
        icon: <CancelIcon sx={{ fontSize: 16 }} />,
      };
    default:
      return {
        label: "Unknown",
        color: BRAND.unknown,
        chipColor: "default",
        icon: null,
      };
  }
}

function getStatusMeta(status = "") {
  const s = String(status || "").toUpperCase();

  if (
    s.includes("RTO") ||
    s.includes("CANCEL") ||
    s.includes("RETURN") ||
    s.includes("UNDELIVER")
  ) {
    return { label: status || "Reversed", color: "error" };
  }

  if (s.includes("DELIVERED")) {
    return { label: status || "Delivered", color: "success" };
  }

  if (
    s.includes("TRANSIT") ||
    s.includes("OUT FOR DELIVERY") ||
    s.includes("SHIPPED") ||
    s.includes("DISPATCH")
  ) {
    return { label: status || "Coming", color: "warning" };
  }

  return { label: status || "Unknown", color: "default" };
}

function formatSignedCurrency(value, walletBucket) {
  const amount = Number(value || 0);

  if (walletBucket === "reversed") {
    return `-₹${Math.abs(amount).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  if (walletBucket === "available" || walletBucket === "coming") {
    return `+₹${Math.abs(amount).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return `₹${Math.abs(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getSlabRange(revenueValue) {
  const revenue = Number(revenueValue || 0);

  if (revenue < 150000) {
    return { currentPercent: 0, min: 0, max: 150000, nextPercent: 1 };
  }
  if (revenue < 200000) {
    return { currentPercent: 1, min: 150000, max: 200000, nextPercent: 1.5 };
  }
  if (revenue < 300000) {
    return { currentPercent: 1.5, min: 200000, max: 300000, nextPercent: 2 };
  }
  if (revenue < 400000) {
    return { currentPercent: 2, min: 300000, max: 400000, nextPercent: 2.5 };
  }
  if (revenue < 500000) {
    return { currentPercent: 2.5, min: 400000, max: 500000, nextPercent: 3 };
  }
  if (revenue < 600000) {
    return { currentPercent: 3, min: 500000, max: 600000, nextPercent: 3.5 };
  }
  if (revenue < 800000) {
    return { currentPercent: 3.5, min: 600000, max: 800000, nextPercent: 4 };
  }
  if (revenue < 1000000) {
    return { currentPercent: 4, min: 800000, max: 1000000, nextPercent: null };
  }

  return { currentPercent: 4, min: 1000000, max: 1000000, nextPercent: null };
}

function getSlabTone(percent = 0) {
  if (percent >= 4) {
    return {
      bar: "#16a34a",
      track: "#dcfce7",
      text: "#15803d",
      chipBg: "#dcfce7",
      chipBorder: "#bbf7d0",
    };
  }

  if (percent >= 3) {
    return {
      bar: "#f59e0b",
      track: "#fef3c7",
      text: "#b45309",
      chipBg: "#fef3c7",
      chipBorder: "#fde68a",
    };
  }

  if (percent >= 2) {
    return {
      bar: "#2563eb",
      track: "#dbeafe",
      text: "#1d4ed8",
      chipBg: "#dbeafe",
      chipBorder: "#bfdbfe",
    };
  }

  if (percent >= 1) {
    return {
      bar: "#7c3aed",
      track: "#ede9fe",
      text: "#6d28d9",
      chipBg: "#ede9fe",
      chipBorder: "#ddd6fe",
    };
  }

  return {
    bar: "#64748b",
    track: "#e2e8f0",
    text: "#475569",
    chipBg: "#f1f5f9",
    chipBorder: "#cbd5e1",
  };
}

function WalletDistributionBar({
  available = 0,
  coming = 0,
  reversed = 0,
  unknown = 0,
}) {
  const total = available + coming + reversed + unknown;

  const availablePct = total ? (available / total) * 100 : 0;
  const comingPct = total ? (coming / total) * 100 : 0;
  const reversedPct = total ? (reversed / total) * 100 : 0;
  const unknownPct = total ? (unknown / total) * 100 : 0;

  return (
    <Box>
      <Box
        sx={{
          height: 12,
          borderRadius: 999,
          overflow: "hidden",
          display: "flex",
          background: "#edf2f7",
          border: `1px solid ${BRAND.border}`,
        }}
      >
        <Box sx={{ width: `${availablePct}%`, background: BRAND.available }} />
        <Box sx={{ width: `${comingPct}%`, background: BRAND.coming }} />
        <Box sx={{ width: `${reversedPct}%`, background: BRAND.reversed }} />
        <Box sx={{ width: `${unknownPct}%`, background: BRAND.unknown }} />
      </Box>

      <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 10, height: 10, borderRadius: "50%", background: BRAND.available }} />
          <Typography variant="caption" color="text.secondary">
            Available
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 10, height: 10, borderRadius: "50%", background: BRAND.coming }} />
          <Typography variant="caption" color="text.secondary">
            Upcoming
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 10, height: 10, borderRadius: "50%", background: BRAND.reversed }} />
          <Typography variant="caption" color="text.secondary">
            Lost
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 10, height: 10, borderRadius: "50%", background: BRAND.unknown }} />
          <Typography variant="caption" color="text.secondary">
            Unknown
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

function SummaryMetric({ title, value, sub, color, bg, borderColor }) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 160,
        p: 2,
        borderRadius: 2.5,
        border: `1px solid ${borderColor || BRAND.border}`,
        background: bg || "#fff",
      }}
    >
      <Typography
        variant="body2"
        sx={{ color: BRAND.sub, fontWeight: 500, mb: 0.75 }}
      >
        {title}
      </Typography>
      <Typography
        variant="h5"
        sx={{ color: color || BRAND.text, fontWeight: 800, lineHeight: 1.1 }}
      >
        {value}
      </Typography>
      {sub ? (
        <Typography variant="caption" sx={{ color: BRAND.sub }}>
          {sub}
        </Typography>
      ) : null}
    </Box>
  );
}

export default function IncentivesPage() {
  const sessionUser = useMemo(() => getSessionUser(), []);
  const defaultMonth = useMemo(() => getCurrentMonthValue(), []);

  const isManagerView = useMemo(() => {
    const role = String(sessionUser?.role || "").toLowerCase();
    return (
      ["admin", "manager", "super-admin", "team-leader"].includes(role) ||
      sessionUser?.hasTeam === true
    );
  }, [sessionUser]);

  const selfAgent = useMemo(() => {
    const fullName = sessionUser?.fullName || "";
    if (!fullName) return null;

    return {
      _id: sessionUser?._id || sessionUser?.id || "self",
      fullName,
      role: sessionUser?.role || "",
    };
  }, [sessionUser]);

  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [startMonth, setStartMonth] = useState(defaultMonth);
  const [endMonth, setEndMonth] = useState(defaultMonth);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const [incentiveSummaryOpen, setIncentiveSummaryOpen] = useState(false);
  const [walletSummaryOpen, setWalletSummaryOpen] = useState(false);
  const [walletRulesOpen, setWalletRulesOpen] = useState(false);

  const [walletAnchorEl, setWalletAnchorEl] = useState(null);
  const [convertAmount, setConvertAmount] = useState("");
  const [convertLoading, setConvertLoading] = useState(false);
  const [convertError, setConvertError] = useState("");
  const [walletOverride, setWalletOverride] = useState(null);
  const [redeemOpen, setRedeemOpen] = useState(false);

  const headers = useMemo(() => getAuthHeaders(), []);

  const derivedStartDate = useMemo(() => monthToStartDate(startMonth), [startMonth]);
  const derivedEndDate = useMemo(() => monthToEndDate(endMonth), [endMonth]);

  const clearPageState = useCallback(() => {
    setData(null);
    setWalletOverride(null);
    setError("");
    setIncentiveSummaryOpen(false);
    setWalletSummaryOpen(false);
    setWalletRulesOpen(false);
  }, []);

  const fetchAgents = useCallback(async () => {
  setLoadingAgents(true);
  setError("");

  try {
    if (!isManagerView) {
      setAgents(selfAgent ? [selfAgent] : []);
      setSelectedAgent(selfAgent || null);
      return;
    }

    const res = await axios.get(`${API_BASE}/api/employees`, {
      params: { status: "active" },
      headers,
    });

    const list = Array.isArray(res.data) ? res.data : res.data?.employees || [];

    const filtered = list.filter(
      (emp) =>
        emp?.status === "active" &&
        (emp?.role === "Sales Agent" || emp?.role === "Retention Agent")
    );

    setAgents(filtered);
  } catch (err) {
    console.error("Error fetching agents:", err);
    setError("Failed to load agents");
  } finally {
    setLoadingAgents(false);
  }
}, [headers, isManagerView, selfAgent]);

  const fetchIncentives = useCallback(async () => {
    const effectiveAgentName = isManagerView
      ? selectedAgent?.fullName
      : selfAgent?.fullName;

    if (!effectiveAgentName) {
      setError(isManagerView ? "Please select an agent" : "Agent not found in session");
      return;
    }

    if (!startMonth || !endMonth) {
      setError("Please select both start month and end month");
      return;
    }

    if (startMonth > endMonth) {
      setError("End month cannot be earlier than start month");
      return;
    }

    setLoadingData(true);
    setError("");
    setWalletOverride(null);

    try {
      const res = await axios.get(`${API_BASE}/api/incentives-new`, {
        headers,
        params: {
          agentName: effectiveAgentName,
          startDate: derivedStartDate,
          endDate: derivedEndDate,
        },
      });

      setData(res.data);
    } catch (err) {
      console.error("Error fetching incentives:", err);
      setData(null);
      setError(err?.response?.data?.message || "Failed to load incentive data");
    } finally {
      setLoadingData(false);
    }
  }, [
    headers,
    isManagerView,
    selectedAgent,
    selfAgent,
    startMonth,
    endMonth,
    derivedStartDate,
    derivedEndDate,
  ]);

  const handleResetFilters = useCallback(() => {
    setSelectedAgent(isManagerView ? null : selfAgent || null);
    setStartMonth(defaultMonth);
    setEndMonth(defaultMonth);
    clearPageState();
  }, [clearPageState, defaultMonth, isManagerView, selfAgent]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    if (!isManagerView && selfAgent?.fullName && !data && startMonth && endMonth) {
      fetchIncentives();
    }
  }, [
    isManagerView,
    selfAgent,
    data,
    startMonth,
    endMonth,
    fetchIncentives,
  ]);

  const summary = data?.summary || {};
  const slab = data?.slab || {};
  const rows = data?.rows || [];
  const walletCoin = data?.walletCoin || {};
  const walletData = data?.wallet || {};

  const walletProjectedCoins = Number(
    walletCoin.projectedCoins ?? summary.walletCoinProjected ?? 0
  );
  const walletBaseEarnedCoins = Number(
  walletCoin.baseEarnedCoins ?? summary.walletCoinBaseEarned ?? 0
);
  const walletLapsedCoins = Number(
    walletCoin.lapsedCoins ?? summary.walletCoinLapsed ?? 0
  );
  const walletQualifyingOrders = Number(
    walletCoin.qualifyingOrders ?? summary.walletCoinQualifyingOrders ?? 0
  );
  const walletDeliveredOrders = Number(
    walletCoin.deliveredQualifyingOrders ?? summary.walletCoinDeliveredOrders ?? 0
  );
  const walletNote =
    walletCoin.note || summary.walletCoinNote || "Wallet coin summary";
  const walletTarget = walletCoin.target || {};
  const walletPeriod = walletCoin.period || {};
  const walletSop = walletCoin.sop || {};
  const walletRows = walletCoin.rows || [];
  const walletRules = walletCoin.rules || {};
  const walletAchievementPercent = Number(walletTarget.achievementPercent ?? 0);

  const prepaidCoins = Number(
    summary.prepaidCoins ??
    walletCoin.prepaidCoins ??
    data?.extraCoins?.prepaidCoins ??
    0
  );
  const partialPaidCoins = Number(
    summary.partialPaidCoins ??
    walletCoin.partialPaidCoins ??
    data?.extraCoins?.partialPaidCoins ??
    0
  );
  const referralPatientCoins = Number(
    summary.referralPatientCoins ??
    walletCoin.referralPatientCoins ??
    data?.extraCoins?.referralPatientCoins ??
    0
  );

  const prepaidCount = Number(
    summary.prepaidCount ??
    walletCoin.prepaidCount ??
    data?.extraCoins?.prepaidCount ??
    0
  );
  const partialPaidCount = Number(
    summary.partialPaidCount ??
    walletCoin.partialPaidCount ??
    data?.extraCoins?.partialPaidCount ??
    0
  );
  const referralPatientCount = Number(
    summary.referralPatientCount ??
    walletCoin.referralPatientCount ??
    data?.extraCoins?.referralPatientCount ??
    0
  );

  const displayAvailableCoinValue = Number(
    walletOverride?.availableCoin ??
    walletData.availableCoin ??
    walletCoin.availableCoin ??
    summary.availableWalletCoin ??
    walletBaseEarnedCoins ??
    0
  );

  const displayAvailableCashValue = Number(
    walletOverride?.availableCash ??
    walletData.availableCash ??
    summary.availableIncentive ??
    0
  );

  const displayedConvertedCash = Number(
    walletData.totalCashConverted ?? summary.totalCashConverted ?? 0
  );
  const displayedConvertedCoin = Number(
    walletData.totalCoinReceived ?? summary.convertedCoinAdded ?? 0
  );

  const deliveredRevenueValue = Number(slab.deliveredRevenue || 0);
  const totalRevenueValue = Number(slab.totalRevenue || summary.totalRevenue || 0);

  const deliveredPercent = Number(
    slab.deliveredPercent ?? slab.incentivePercent ?? 0
  );
  const totalPercent = Number(slab.totalPercent ?? 0);

  const deliveredSlabRange = useMemo(
    () => getSlabRange(deliveredRevenueValue),
    [deliveredRevenueValue]
  );

  const totalSlabRange = useMemo(
    () => getSlabRange(totalRevenueValue),
    [totalRevenueValue]
  );

  const deliveredProgress = useMemo(() => {
    const target = Number(deliveredSlabRange.max || 0);
    if (!target) return 0;

    const value = (deliveredRevenueValue / target) * 100;
    return Math.max(0, Math.min(100, value));
  }, [deliveredRevenueValue, deliveredSlabRange.max]);

  const totalProgress = useMemo(() => {
    const target = Number(totalSlabRange.max || 0);
    if (!target) return 0;

    const value = (totalRevenueValue / target) * 100;
    return Math.max(0, Math.min(100, value));
  }, [totalRevenueValue, totalSlabRange.max]);

  const deliveredAmountToNextSlab = useMemo(() => {
    if (!deliveredSlabRange.nextPercent) return 0;
    return Math.max(0, deliveredSlabRange.max - deliveredRevenueValue);
  }, [deliveredRevenueValue, deliveredSlabRange]);

  const totalAmountToNextSlab = useMemo(() => {
    if (!totalSlabRange.nextPercent) return 0;
    return Math.max(0, totalSlabRange.max - totalRevenueValue);
  }, [totalRevenueValue, totalSlabRange]);

  const deliveredTone = useMemo(
    () => getSlabTone(deliveredPercent),
    [deliveredPercent]
  );

  const totalTone = useMemo(
    () => getSlabTone(totalPercent),
    [totalPercent]
  );

  const walletPopoverOpen = Boolean(walletAnchorEl);

  const handleOpenConvertPopover = (event) => {
    setWalletAnchorEl(event.currentTarget);
    setConvertAmount("");
    setConvertError("");
  };

  const handleCloseWalletPopover = () => {
    if (convertLoading) return;
    setWalletAnchorEl(null);
    setConvertAmount("");
    setConvertError("");
  };

  const handleConvertCashToCoin = async () => {
    const amount = Number(convertAmount || 0);

    if (!data?.agentName) {
      setConvertError("Please load wallet data first.");
      return;
    }

    if (!amount || Number.isNaN(amount) || amount <= 0) {
      setConvertError("Please enter a valid cash amount.");
      return;
    }

    if (amount > displayAvailableCashValue) {
      setConvertError("Entered amount is greater than available cash.");
      return;
    }

    setConvertLoading(true);
    setConvertError("");

    try {
      const res = await axios.post(
        `${API_BASE}/api/wallet/convert-cash-to-coin`,
        {
          agentName: data.agentName,
          startDate: derivedStartDate,
          endDate: derivedEndDate,
          cashAmount: amount,
        },
        { headers }
      );

      const nextCash = Number(
        res.data?.wallet?.availableCash ??
        res.data?.availableCash ??
        displayAvailableCashValue - amount
      );

      const nextCoin = Number(
        res.data?.wallet?.availableCoin ??
        res.data?.availableCoin ??
        displayAvailableCoinValue + amount
      );

      setWalletOverride({
        availableCash: nextCash,
        availableCoin: nextCoin,
      });

      setData((prev) =>
        prev
          ? {
            ...prev,
            wallet: {
              ...(prev.wallet || {}),
              ...(res.data?.wallet || {}),
              availableCash: nextCash,
              availableCoin: nextCoin,
            },
            summary: {
              ...(prev.summary || {}),
              availableIncentive: nextCash,
              availableWalletCoin: nextCoin,
              totalCashConverted:
                res.data?.wallet?.totalCashConverted ??
                prev?.wallet?.totalCashConverted ??
                prev?.summary?.totalCashConverted,
              convertedCoinAdded:
                res.data?.wallet?.totalCoinReceived ??
                prev?.wallet?.totalCoinReceived ??
                prev?.summary?.convertedCoinAdded,
            },
            walletCoin: {
              ...(prev.walletCoin || {}),
              availableCoin: nextCoin,
            },
          }
          : prev
      );

      handleCloseWalletPopover();
    } catch (err) {
      console.error("Error converting cash to coin:", err);
      setConvertError(
        err?.response?.data?.message || "Failed to convert cash into coin."
      );
    } finally {
      setConvertLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", p: 3, background: BRAND.bg }}>
      <Stack spacing={3}>
        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, color: BRAND.text, letterSpacing: -0.4 }}
          >
            Wallet
          </Typography>
        </Box>

        <WalletRedeemDialog
          open={redeemOpen}
          onClose={() => setRedeemOpen(false)}
          headers={headers}
          agentName={data?.agentName || selectedAgent?.fullName || selfAgent?.fullName || ""}
          startDate={derivedStartDate}
          endDate={derivedEndDate}
          availableCoin={displayAvailableCoinValue}
        />

        <Popover
          open={walletPopoverOpen}
          anchorEl={walletAnchorEl}
          onClose={handleCloseWalletPopover}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          PaperProps={{
            sx: {
              width: 360,
              borderRadius: 3,
              border: `1px solid ${BRAND.coinBorder}`,
              boxShadow: "0 12px 32px rgba(15, 23, 42, 0.12)",
              p: 2,
            },
          }}
        >
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: BRAND.text }}>
                Convert Cash to Coin
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={1.5}
              sx={{
                p: 1.5,
                borderRadius: 2.5,
                border: `1px solid ${BRAND.border}`,
                background: "#fafcff",
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: BRAND.sub }}>
                  Available Cash
                </Typography>
                <Typography variant="h6" sx={{ color: BRAND.available, fontWeight: 800 }}>
                  {formatCurrency(displayAvailableCashValue)}
                </Typography>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: BRAND.sub }}>
                  Available Coin
                </Typography>
                <Typography variant="h6" sx={{ color: BRAND.coin, fontWeight: 800 }}>
                  {formatNumber(displayAvailableCoinValue)}
                </Typography>
              </Box>
            </Stack>

            <Typography variant="caption" sx={{ color: BRAND.sub }}>
              Period: {formatMonthLabel(startMonth)} to {formatMonthLabel(endMonth)}
            </Typography>

            {convertError ? <Alert severity="error">{convertError}</Alert> : null}

            <TextField
              label="Cash Amount"
              type="number"
              size="small"
              value={convertAmount}
              onChange={(e) => setConvertAmount(e.target.value)}
              fullWidth
            />

            <Stack direction="row" spacing={1.25} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={handleCloseWalletPopover}
                disabled={convertLoading}
                sx={{ textTransform: "none", borderRadius: 2 }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleConvertCashToCoin}
                disabled={convertLoading || !convertAmount}
                sx={{ textTransform: "none", borderRadius: 2, boxShadow: "none" }}
              >
                {convertLoading ? "Converting..." : "Convert"}
              </Button>
            </Stack>
          </Stack>
        </Popover>

        {error ? <Alert severity="error">{error}</Alert> : null}

        <Paper
          sx={{
            p: 2,
            borderRadius: 3,
            border: `1px solid ${BRAND.border}`,
            boxShadow: "0 8px 30px rgba(15, 23, 42, 0.04)",
          }}
        >
          <Stack spacing={2}>
            <Stack
              direction={{ xs: "column", xl: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", xl: "center" }}
              justifyContent="space-between"
            >
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                alignItems={{ xs: "stretch", md: "center" }}
                flexWrap="wrap"
                sx={{ flex: 1 }}
              >
                {isManagerView && (
                  <Autocomplete
                    sx={{
                      width: { xs: "100%", md: 260 },
                      flexShrink: 0,
                    }}
                    options={agents}
                    loading={loadingAgents}
                    value={selectedAgent}
                    onChange={(_, value) => {
                      setSelectedAgent(value);
                      clearPageState();
                    }}
                    isOptionEqualToValue={(option, value) =>
                      option?.fullName === value?.fullName
                    }
                    getOptionLabel={(option) =>
                      option?.fullName ? `${option.fullName} (${option.role || ""})` : ""
                    }
                    renderInput={(params) => (
                      <TextField {...params} label="Select Agent" size="small" />
                    )}
                  />
                )}

                <TextField
                  label="Start Month"
                  type="month"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: MIN_WALLET_MONTH }}
                  value={startMonth}
                  onChange={(e) => {
                    setStartMonth(e.target.value);
                    clearPageState();
                  }}
                  sx={{ width: { xs: "100%", md: 170 } }}
                />

                <TextField
                  label="End Month"
                  type="month"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: MIN_WALLET_MONTH }}
                  value={endMonth}
                  onChange={(e) => {
                    setEndMonth(e.target.value);
                    clearPageState();
                  }}
                  sx={{ width: { xs: "100%", md: 170 } }}
                />

                <Button
                  variant="contained"
                  onClick={fetchIncentives}
                  disabled={
                    !(isManagerView ? selectedAgent?.fullName : selfAgent?.fullName) ||
                    !startMonth ||
                    !endMonth ||
                    loadingData
                  }
                  sx={{
                    width: { xs: "100%", md: 100 },
                    textTransform: "none",
                    borderRadius: 2,
                    boxShadow: "none",
                  }}
                >
                  Apply
                </Button>

                <Button
                  variant="outlined"
                  onClick={handleResetFilters}
                  sx={{
                    width: { xs: "100%", md: 100 },
                    textTransform: "none",
                    borderRadius: 2,
                  }}
                >
                  Reset
                </Button>
              </Stack>

              <Box
                sx={{
                  minWidth: { xs: "100%", xl: 420 },
                  p: 1.75,
                  borderRadius: 3,
                  border: `1px solid ${BRAND.coinBorder}`,
                  background: "linear-gradient(180deg, #ffffff 0%, #f8f5ff 100%)",
                  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
                }}
              >
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      background: BRAND.coinSoft,
                      border: `1px solid ${BRAND.coinBorder}`,
                      color: BRAND.coin,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <WalletBalanceIcon fontSize="small" />
                  </Box>

                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{ color: BRAND.sub, fontWeight: 600, mb: 0.5 }}
                    >
                      Available Wallet Balance
                    </Typography>

                    <Typography
                      variant="h6"
                      sx={{ color: BRAND.text, fontWeight: 800, lineHeight: 1.2 }}
                    >
                      {formatNumber(displayAvailableCoinValue)} Coins |{" "}
                      {formatCurrency(displayAvailableCashValue)} Cash
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                    <Button
                      variant="contained"
                      startIcon={<RedeemIcon />}
                      onClick={() => setRedeemOpen(true)}
                      disabled={!data || Number(displayAvailableCoinValue || 0) <= 0}
                      sx={{
                        textTransform: "none",
                        borderRadius: 2.5,
                        boxShadow: "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Redeem
                    </Button>

                    <Button
                      variant="outlined"
                      onClick={handleOpenConvertPopover}
                      disabled={!data || Number(displayAvailableCashValue || 0) <= 0}
                      sx={{
                        textTransform: "none",
                        borderRadius: 2.5,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Convert
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            </Stack>
          </Stack>
        </Paper>

        {loadingData ? (
          <Paper
            sx={{
              p: 5,
              borderRadius: 3,
              border: `1px solid ${BRAND.border}`,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <CircularProgress />
          </Paper>
        ) : data ? (
          <>
            <Paper
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: `1px solid ${BRAND.border}`,
                boxShadow: "0 8px 30px rgba(15, 23, 42, 0.04)",
              }}
            >
              <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", md: "center" }}
                spacing={2}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: BRAND.text }}>
                    Cash Summary
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Chip
                    icon={<ArrowUpwardIcon />}
                    label={`Current Delivered Slab: ${deliveredPercent}%`}
                    sx={{
                      background: "#eff6ff",
                      color: BRAND.primary,
                      fontWeight: 700,
                      border: "1px solid #bfdbfe",
                    }}
                  />
                  <Button
                    variant="contained"
                    startIcon={<ViewIcon />}
                    onClick={() => setIncentiveSummaryOpen(true)}
                    sx={{
                      textTransform: "none",
                      borderRadius: 2,
                      boxShadow: "none",
                    }}
                  >
                    View Summary
                  </Button>
                </Stack>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5}>
                <Box sx={{ flex: 1.15 }}>
                  <Typography
                    variant="body2"
                    sx={{ color: BRAND.sub, fontWeight: 600, mb: 1.25 }}
                  >
                    Cash Distribution
                  </Typography>

                  <WalletDistributionBar
                    available={displayAvailableCashValue}
                    coming={summary.comingIncentive || 0}
                    reversed={summary.reversedIncentive || 0}
                    unknown={0}
                  />

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    sx={{ mt: 2, flexWrap: "wrap" }}
                  >
                    <SummaryMetric
                      title="Available Cash"
                      value={formatCurrency(displayAvailableCashValue)}
                      sub={`${formatNumber(summary.deliveredOrders || 0)} delivered orders`}
                      color={BRAND.available}
                    />
                    <SummaryMetric
                      title="Upcoming Cash"
                      value={formatCurrency(summary.comingIncentive)}
                      sub={`${formatNumber(summary.comingOrders || 0)} undelivered orders`}
                      color={BRAND.coming}
                    />
                    <SummaryMetric
                      title="At Risk"
                      value={formatCurrency(summary.atRiskIncentive)}
                      sub={`${formatNumber(summary.atRiskOrders || 0)} orders older than 5 days`}
                      color={BRAND.atRisk}
                    />
                    <SummaryMetric
                      title="Lost"
                      value={formatCurrency(summary.reversedIncentive)}
                      sub={`${formatNumber(summary.reversedOrders || 0)} RTO orders`}
                      color={BRAND.reversed}
                    />
                  </Stack>
                </Box>

                <Box
                  sx={{
                    flex: 0.95,
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    gap: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      border: `1px solid ${BRAND.border}`,
                      background: "#fbfdff",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: BRAND.sub, fontWeight: 600, mb: 1.25 }}
                    >
                      Total Sales Slab
                    </Typography>

                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                        <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND.text }}>
                          {formatCurrency(totalRevenueValue)}
                        </Typography>
                        <Chip
                          label={`${totalPercent}%`}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            color: totalTone.text,
                            backgroundColor: totalTone.chipBg,
                            border: `1px solid ${totalTone.chipBorder}`,
                          }}
                        />
                      </Stack>

                      <LinearProgress
                        variant="determinate"
                        value={totalProgress}
                        sx={{
                          height: 7,
                          borderRadius: 999,
                          backgroundColor: totalTone.track,
                          "& .MuiLinearProgress-bar": {
                            borderRadius: 999,
                            backgroundColor: totalTone.bar,
                          },
                        }}
                      />

                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" sx={{ color: BRAND.sub }}>
                          ₹0.00
                        </Typography>
                        <Typography variant="caption" sx={{ color: BRAND.sub }}>
                          {formatCurrency(totalSlabRange.max)}
                        </Typography>
                      </Stack>

                      {totalSlabRange.nextPercent ? (
                        <Typography variant="body2" sx={{ color: BRAND.sub, mt: 0.25 }}>
                          Need{" "}
                          <Box component="span" sx={{ fontWeight: 700, color: BRAND.text }}>
                            {formatCurrency(totalAmountToNextSlab)}
                          </Box>{" "}
                          more total to reach{" "}
                          <Box component="span" sx={{ fontWeight: 700, color: totalTone.text }}>
                            {totalSlabRange.nextPercent}%
                          </Box>
                        </Typography>
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{ color: totalTone.text, mt: 0.25, fontWeight: 700 }}
                        >
                          Highest slab reached
                        </Typography>
                      )}
                    </Stack>
                  </Box>

                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      border: `1px solid ${BRAND.border}`,
                      background: "#fbfdff",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: BRAND.sub, fontWeight: 600, mb: 1.25 }}
                    >
                      Delivered Sales Slab
                    </Typography>

                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                        <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND.text }}>
                          {formatCurrency(deliveredRevenueValue)}
                        </Typography>
                        <Chip
                          label={`${deliveredPercent}%`}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            color: deliveredTone.text,
                            backgroundColor: deliveredTone.chipBg,
                            border: `1px solid ${deliveredTone.chipBorder}`,
                          }}
                        />
                      </Stack>

                      <LinearProgress
                        variant="determinate"
                        value={deliveredProgress}
                        sx={{
                          height: 7,
                          borderRadius: 999,
                          backgroundColor: deliveredTone.track,
                          "& .MuiLinearProgress-bar": {
                            borderRadius: 999,
                            backgroundColor: deliveredTone.bar,
                          },
                        }}
                      />

                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" sx={{ color: BRAND.sub }}>
                          ₹0.00
                        </Typography>
                        <Typography variant="caption" sx={{ color: BRAND.sub }}>
                          {formatCurrency(deliveredSlabRange.max)}
                        </Typography>
                      </Stack>

                      {deliveredSlabRange.nextPercent ? (
                        <Typography variant="body2" sx={{ color: BRAND.sub, mt: 0.25 }}>
                          Need{" "}
                          <Box component="span" sx={{ fontWeight: 700, color: BRAND.text }}>
                            {formatCurrency(deliveredAmountToNextSlab)}
                          </Box>{" "}
                          more delivered to reach{" "}
                          <Box component="span" sx={{ fontWeight: 700, color: deliveredTone.text }}>
                            {deliveredSlabRange.nextPercent}%
                          </Box>
                        </Typography>
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{ color: deliveredTone.text, mt: 0.25, fontWeight: 700 }}
                        >
                          Highest slab reached
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                </Box>
              </Stack>
            </Paper>

            <Paper
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: `1px solid ${BRAND.border}`,
                boxShadow: "0 8px 30px rgba(15, 23, 42, 0.04)",
              }}
            >
              <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", md: "center" }}
                spacing={2}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: BRAND.text }}>
                    Coins Summary
                  </Typography>
                  <Typography variant="body2" sx={{ color: BRAND.sub, mt: 0.5 }}>
                    {walletNote}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Button
                    variant="contained"
                    startIcon={<ViewIcon />}
                    onClick={() => setWalletSummaryOpen(true)}
                    sx={{
                      textTransform: "none",
                      borderRadius: 2,
                      boxShadow: "none",
                    }}
                  >
                    View Summary
                  </Button>

                  <Button
                    variant="outlined"
                    onClick={() => setWalletRulesOpen(true)}
                    sx={{
                      textTransform: "none",
                      borderRadius: 2,
                    }}
                  >
                    Rules
                  </Button>
                </Stack>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} alignItems="stretch">
                <Box
                  sx={{
                    flex: 1.15,
                    p: 2,
                    borderRadius: 2.5,
                    border: `1px solid ${BRAND.coinBorder}`,
                    background: BRAND.coinSoft,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: BRAND.sub, fontWeight: 600, mb: 0.75 }}
                  >
                    VKR Sales
                  </Typography>

                  <Stack spacing={1.25}>
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", md: "flex-start" }}
                      spacing={1.5}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          variant="h5"
                          sx={{ color: BRAND.coin, fontWeight: 800, lineHeight: 1.1 }}
                        >
                          {walletAchievementPercent}%
                        </Typography>

                        <Typography variant="caption" sx={{ color: BRAND.sub }}>
                          Target: {formatNumber(walletTarget.deliveredCount || 0)} /{" "}
                          {formatNumber(walletTarget.monthlyTargetCount || 0)}
                        </Typography>
                      </Box>

                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.25}
                        sx={{
                          width: { xs: "100%", md: "auto" },
                          minWidth: { md: 380 },
                        }}
                      >
                        <SummaryMetric
                          title="Earned Coins"
                          value={formatNumber(walletBaseEarnedCoins)}
                          sub={`${formatNumber(walletDeliveredOrders)} delivered qualifying orders`}
                          color={BRAND.coin}
                          bg="#ffffff"
                          borderColor={BRAND.coinBorder}
                        />

                        <SummaryMetric
                          title="Lapsed Coins"
                          value={formatNumber(walletLapsedCoins)}
                          sub={`${walletAchievementPercent}% achievement`}
                          color={BRAND.reversed}
                          bg="#ffffff"
                          borderColor="#fecaca"
                        />
                      </Stack>
                    </Stack>

                    <Box sx={{ mt: 0.5 }}>
                      <VKRTargetProgressBar
                        value={walletAchievementPercent}
                        threshold={walletTarget.minAchievementPercentToRetain || 60}
                      />
                    </Box>
                  </Stack>
                </Box>

                <Box
                  sx={{
                    flex: 1,
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                    gap: 1.5,
                  }}
                >
                  <SummaryMetric
                    title="Prepaid"
                    value={formatNumber(prepaidCoins)}
                    sub={`${formatNumber(prepaidCount)} orders · 30 coins each`}
                    color={BRAND.prepaid}
                    bg={BRAND.prepaidSoft}
                    borderColor="#ccfbf1"
                  />
                  <SummaryMetric
                    title="Partial Paid"
                    value={formatNumber(partialPaidCoins)}
                    sub={`${formatNumber(partialPaidCount)} orders · 10 coins each`}
                    color={BRAND.partial}
                    bg={BRAND.partialSoft}
                    borderColor="#fed7aa"
                  />
                  <SummaryMetric
                    title="Referral Patient"
                    value={formatNumber(referralPatientCoins)}
                    sub={`${formatNumber(referralPatientCount)} referrals · 200 coins each`}
                    color={BRAND.referral}
                    bg={BRAND.referralSoft}
                    borderColor="#bfdbfe"
                  />
                </Box>
              </Stack>
            </Paper>

            <Dialog
              open={incentiveSummaryOpen}
              onClose={() => setIncentiveSummaryOpen(false)}
              fullWidth
              maxWidth="xl"
            >
              <DialogTitle sx={{ fontWeight: 800, color: BRAND.text }}>
                Cash Summary
              </DialogTitle>

              <DialogContent dividers sx={{ p: 0 }}>
                <TableContainer
                  sx={{
                    borderTop: `1px solid ${BRAND.border}`,
                    overflowX: "auto",
                  }}
                >
                  <Table
                    sx={{
                      minWidth: 980,
                      tableLayout: "fixed",
                      "& .MuiTableCell-root": {
                        ...TABLE_CELL_COMMON_SX,
                      },
                    }}
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ ...TABLE_HEAD_SX, ...COL_DATE }}>Date</TableCell>
                        <TableCell sx={{ ...TABLE_HEAD_SX, ...COL_ORDER }}>Order ID</TableCell>
                        <TableCell sx={{ ...TABLE_HEAD_SX, ...COL_CUSTOMER }}>Customer</TableCell>
                        <TableCell sx={{ ...TABLE_HEAD_SX, ...COL_AMOUNT }}>Amount</TableCell>
                        <TableCell sx={{ ...TABLE_HEAD_SX, ...COL_STATUS }}>
                          Shipment Status
                        </TableCell>
                        <TableCell sx={{ ...TABLE_HEAD_SX, ...COL_WALLET }}>Wallet</TableCell>
                        <TableCell
                          sx={{ ...TABLE_HEAD_SX, ...COL_INCENTIVE }}
                          align="right"
                        >
                          Incentive
                        </TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {rows.length ? (
                        rows.map((row, index) => {
                          const bucketMeta = getBucketMeta(row.walletBucket);
                          const statusMeta = getStatusMeta(row.deliveryStatus);

                          return (
                            <TableRow
                              key={`${row.orderId || "row"}-${index}`}
                              hover
                              sx={{
                                "&:last-child td": { borderBottom: 0 },
                              }}
                            >
                              <TableCell sx={COL_DATE}>{formatDate(row.date)}</TableCell>

                              <TableCell
                                sx={{
                                  ...COL_ORDER,
                                  fontWeight: 600,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {row.orderId || "-"}
                              </TableCell>

                              <TableCell
                                sx={{
                                  ...COL_CUSTOMER,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {row.name || "-"}
                              </TableCell>

                              <TableCell
                                sx={{
                                  ...COL_AMOUNT,
                                  fontWeight: 600,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {formatCurrency(row.amount)}
                              </TableCell>

                              <TableCell sx={COL_STATUS}>
                                <Chip
                                  size="small"
                                  label={statusMeta.label}
                                  color={statusMeta.color}
                                  variant="outlined"
                                  sx={{ maxWidth: "100%" }}
                                />
                              </TableCell>

                              <TableCell sx={COL_WALLET}>
                                <Chip
                                  size="small"
                                  label={bucketMeta.label}
                                  color={bucketMeta.chipColor}
                                  icon={bucketMeta.icon}
                                  sx={{ maxWidth: "100%" }}
                                />
                              </TableCell>

                              <TableCell
                                align="right"
                                sx={{
                                  ...COL_INCENTIVE,
                                  fontWeight: 700,
                                  color: bucketMeta.color,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {formatSignedCurrency(row.incentiveAmount, row.walletBucket)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                            No records found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </DialogContent>

              <DialogActions sx={{ p: 2 }}>
                <Button
                  onClick={() => setIncentiveSummaryOpen(false)}
                  variant="outlined"
                  sx={{ textTransform: "none", borderRadius: 2 }}
                >
                  Close
                </Button>
              </DialogActions>
            </Dialog>

            <Dialog
              open={walletSummaryOpen}
              onClose={() => setWalletSummaryOpen(false)}
              fullWidth
              maxWidth="xl"
            >
              <DialogTitle sx={{ fontWeight: 800, color: BRAND.text }}>
                Wallet Summary
              </DialogTitle>

              <DialogContent dividers sx={{ p: 0 }}>
                <Box sx={{ p: 2 }}>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    justifyContent="space-between"
                    spacing={1.5}
                    sx={{ mb: 2 }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ color: BRAND.sub }}>
                        SOP:{" "}
                        <Box component="span" sx={{ color: BRAND.text, fontWeight: 700 }}>
                          {walletSop.name || "VKR Plan Coin"}
                        </Box>
                      </Typography>
                      <Typography variant="body2" sx={{ color: BRAND.sub, mt: 0.5 }}>
                        Value per count:{" "}
                        <Box component="span" sx={{ color: BRAND.text, fontWeight: 700 }}>
                          {formatNumber(walletSop.valuePerCount || 0)}
                        </Box>
                      </Typography>
                      <Typography variant="body2" sx={{ color: BRAND.sub, mt: 0.5 }}>
                        Achievement:{" "}
                        <Box component="span" sx={{ color: BRAND.text, fontWeight: 700 }}>
                          {walletAchievementPercent}%
                        </Box>
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      <Chip
                        label={`Available: ${formatNumber(displayAvailableCoinValue)}`}
                        variant="outlined"
                      />
                      <Chip
                        label={`Projected: ${formatNumber(walletProjectedCoins)}`}
                        variant="outlined"
                      />
                      <Chip
                        label={`Lapsed: ${formatNumber(walletLapsedCoins)}`}
                        variant="outlined"
                      />
                    </Stack>
                  </Stack>
                </Box>

                <TableContainer
                  sx={{
                    borderTop: `1px solid ${BRAND.border}`,
                    overflowX: "auto",
                  }}
                >
                  <Table sx={{ minWidth: 900 }}>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                        <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Order ID</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Phone Number</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Shipment Status</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {walletRows.length ? (
                        walletRows.map((row, index) => (
                          <TableRow key={`${row.orderId || "wallet"}-${index}`} hover>
                            <TableCell>{formatDate(row.date)}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>
                              {row.orderId || "-"}
                            </TableCell>
                            <TableCell>{row.customerName || "-"}</TableCell>
                            <TableCell>{row.contactNumber || "-"}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={row.shipmentStatus || "Unknown"}
                                color={row.isDelivered ? "success" : "default"}
                                variant={row.isDelivered ? "filled" : "outlined"}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                            No wallet records found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </DialogContent>

              <DialogActions sx={{ p: 2 }}>
                <Button
                  onClick={() => setWalletSummaryOpen(false)}
                  variant="outlined"
                  sx={{ textTransform: "none", borderRadius: 2 }}
                >
                  Close
                </Button>
              </DialogActions>
            </Dialog>

            <Dialog
              open={walletRulesOpen}
              onClose={() => setWalletRulesOpen(false)}
              fullWidth
              maxWidth="sm"
            >
              <DialogTitle sx={{ fontWeight: 800, color: BRAND.text }}>
                Wallet Rules
              </DialogTitle>

              <DialogContent dividers>
                <Stack spacing={1.25}>
                  <Typography variant="body2" sx={{ color: BRAND.sub }}>
                    Below 60% target coins lapse:{" "}
                    <Box component="span" sx={{ color: BRAND.text, fontWeight: 700 }}>
                      {walletRules.below60PercentTargetCoinsLapse ? "Yes" : "No"}
                    </Box>
                  </Typography>

                  <Typography variant="body2" sx={{ color: BRAND.sub }}>
                    Redeemable only on Diwali:{" "}
                    <Box component="span" sx={{ color: BRAND.text, fontWeight: 700 }}>
                      {walletRules.redeemableOnlyOnDiwali ? "Yes" : "No"}
                    </Box>
                  </Typography>

                  <Typography variant="body2" sx={{ color: BRAND.sub }}>
                    Redeemable months:{" "}
                    <Box component="span" sx={{ color: BRAND.text, fontWeight: 700 }}>
                      {Array.isArray(walletRules.redeemableOnlyTwiceAYear)
                        ? walletRules.redeemableOnlyTwiceAYear.join(", ")
                        : "-"}
                    </Box>
                  </Typography>

                  <Typography variant="body2" sx={{ color: BRAND.sub }}>
                    Cannot convert to cash:{" "}
                    <Box component="span" sx={{ color: BRAND.text, fontWeight: 700 }}>
                      {walletRules.cannotConvertToCash ? "Yes" : "No"}
                    </Box>
                  </Typography>

                  <Typography variant="body2" sx={{ color: BRAND.sub }}>
                    Cash can convert to coin:{" "}
                    <Box component="span" sx={{ color: BRAND.text, fontWeight: 700 }}>
                      {walletRules.cashCanConvertToCoin ? "Yes" : "No"}
                    </Box>
                  </Typography>

                  <Typography variant="body2" sx={{ color: BRAND.sub }}>
                    Coins are counted from:{" "}
                    <Box component="span" sx={{ color: BRAND.text, fontWeight: 700 }}>
                      {walletRules.coinCollectionStartsFrom || "2026-03-01"}
                    </Box>
                  </Typography>

                  <Typography variant="body2" sx={{ color: BRAND.sub }}>
                    Total converted cash in this range:{" "}
                    <Box component="span" sx={{ color: BRAND.text, fontWeight: 700 }}>
                      {formatCurrency(displayedConvertedCash)}
                    </Box>
                  </Typography>

                  <Typography variant="body2" sx={{ color: BRAND.sub }}>
                    Total converted coin in this range:{" "}
                    <Box component="span" sx={{ color: BRAND.text, fontWeight: 700 }}>
                      {formatNumber(displayedConvertedCoin)}
                    </Box>
                  </Typography>

                  <Typography variant="body2" sx={{ color: BRAND.sub }}>
                    Period:{" "}
                    <Box component="span" sx={{ color: BRAND.text, fontWeight: 700 }}>
                      {walletPeriod.effectiveStartDate || walletPeriod.startDate || "-"} to{" "}
                      {walletPeriod.endDate || "-"}
                    </Box>
                  </Typography>
                </Stack>
              </DialogContent>

              <DialogActions sx={{ p: 2 }}>
                <Button
                  onClick={() => setWalletRulesOpen(false)}
                  variant="outlined"
                  sx={{ textTransform: "none", borderRadius: 2 }}
                >
                  Close
                </Button>
              </DialogActions>
            </Dialog>
          </>
        ) : null}
      </Stack>
    </Box>
  );
}