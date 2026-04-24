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
  FormControlLabel,
  LinearProgress,
  Paper,
  Popover,
  Stack,
  Switch,
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
const MIN_WALLET_MONTH = "2026-04";

const TEAM_INCENTIVE_STEPS = [
  { threshold: 90, percent: 0.6 },
  { threshold: 100, percent: 1 },
  { threshold: 110, percent: 1.25 },
  { threshold: 120, percent: 1.75 },
];

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

const CONTAINED_BUTTON_SX = {
  textTransform: "none",
  borderRadius: 2,
  boxShadow: "none",
  backgroundColor: "#111827",
  color: "#ffffff",
  "&:hover": {
    backgroundColor: "#0b1220",
    boxShadow: "none",
  },
  "&.Mui-disabled": {
    backgroundColor: "#d1d5db",
    color: "#ffffff",
  },
};

const OUTLINED_BUTTON_SX = {
  textTransform: "none",
  borderRadius: 2,
  color: BRAND.text,
  borderColor: "#cbd5e1",
  "&:hover": {
    borderColor: BRAND.text,
    backgroundColor: "#f8fafc",
  },
  "&.Mui-disabled": {
    borderColor: "#e5e7eb",
    color: "#9ca3af",
  },
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

const COL_AGENT = { width: "14%" };
const COL_DATE = { width: "12%" };
const COL_ORDER = { width: "15%" };
const COL_CUSTOMER = { width: "20%" };
const COL_AMOUNT = { width: "13%" };
const COL_STATUS = { width: "18%" };
const COL_WALLET = { width: "12%" };
const COL_INCENTIVE = { width: "10%" };

function round2(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeComparable(value = "") {
  return String(value || "").trim().toLowerCase();
}

function getEntityId(entity) {
  if (!entity) return "";
  return String(entity._id || entity.id || "").trim();
}

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
    s.includes("PROCESSING") ||
    s.includes("CREATED") ||
    s.includes("NEW") ||
    s.includes("OPEN") ||
    s.includes("CONFIRMED") ||
    s.includes("READY TO SHIP") ||
    s.includes("AWB") ||
    s.includes("TRANSIT") ||
    s.includes("OUT FOR DELIVERY") ||
    s.includes("SHIPPED") ||
    s.includes("DISPATCH") ||
    s.includes("MANIFEST") ||
    s.includes("BOOKED") ||
    s.includes("PICKED") ||
    s.includes("PICKUP") ||
    s.includes("REACHED HUB") ||
    s.includes("AT HUB")
  ) {
    return { label: status || "Coming", color: "warning" };
  }

  return { label: status || "Unknown", color: "default" };
}

function isReversedWalletCoinStatus(status = "") {
  const s = String(status || "").toUpperCase();

  return (
    s.includes("RTO") ||
    s.includes("CANCEL") ||
    s.includes("RETURN") ||
    s.includes("UNDELIVER")
  );
}

function isUpcomingWalletCoinStatus(status = "") {
  const s = String(status || "").toUpperCase();

  if (!s) return false;
  if (s.includes("DELIVERED")) return false;
  if (isReversedWalletCoinStatus(s)) return false;

  return (
    s.includes("PROCESSING") ||
    s.includes("TRANSIT") ||
    s.includes("OUT FOR DELIVERY") ||
    s.includes("SHIPPED") ||
    s.includes("DISPATCH") ||
    s.includes("MANIFEST") ||
    s.includes("BOOKED") ||
    s.includes("PICKED") ||
    s.includes("PICKUP") ||
    s.includes("REACHED HUB") ||
    s.includes("AT HUB")
  );
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

  if (revenue < 200000) {
    return { currentPercent: 1, min: 0, max: 200000, nextPercent: 2.5 };
  }
  if (revenue < 300000) {
    return { currentPercent: 2.5, min: 200000, max: 300000, nextPercent: 3.5 };
  }
  if (revenue < 400000) {
    return { currentPercent: 3.5, min: 300000, max: 400000, nextPercent: 5 };
  }
  if (revenue < 500000) {
    return { currentPercent: 5, min: 400000, max: 500000, nextPercent: 6 };
  }
  if (revenue < 600000) {
    return { currentPercent: 6, min: 500000, max: 600000, nextPercent: 7 };
  }
  if (revenue < 800000) {
    return { currentPercent: 7, min: 600000, max: 800000, nextPercent: null };
  }

  return { currentPercent: 7, min: 800000, max: 800000, nextPercent: null };
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

function getTeamIncentivePercent(achievementPercent = 0) {
  const safeValue = Number(achievementPercent || 0);

  if (safeValue >= 120) return 1.75;
  if (safeValue >= 110) return 1.25;
  if (safeValue >= 100) return 1;
  if (safeValue >= 90) return 0.6;
  return 0;
}

function getNextTeamThreshold(achievementPercent = 0) {
  const safeValue = Number(achievementPercent || 0);
  return TEAM_INCENTIVE_STEPS.find((item) => safeValue < item.threshold) || null;
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

function WalletDistributionBar({
  available = 0,
  coming = 0,
  atRisk = 0,
  reversed = 0,
  unknown = 0,
}) {
  const segments = [
    {
      key: "available",
      label: "Available",
      value: Math.max(0, Number(available || 0)),
      color: BRAND.available,
    },
    {
      key: "coming",
      label: "Upcoming",
      value: Math.max(0, Number(coming || 0)),
      color: BRAND.coming,
    },
    {
      key: "atRisk",
      label: "At Risk",
      value: Math.max(0, Number(atRisk || 0)),
      color: BRAND.atRisk,
    },
    {
      key: "reversed",
      label: "Lost",
      value: Math.max(0, Number(reversed || 0)),
      color: BRAND.reversed,
    },
    {
      key: "unknown",
      label: "Unknown",
      value: Math.max(0, Number(unknown || 0)),
      color: BRAND.unknown,
    },
  ];

  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const pct = (value) => (total ? (value / total) * 100 : 0);
  const legendSegments = segments.filter(
    (segment) => segment.key !== "unknown" || segment.value > 0
  );

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
        {segments.map((segment) => (
          <Box
            key={segment.key}
            title={`${segment.label}: ${formatCurrency(segment.value)} (${pct(segment.value).toFixed(1)}%)`}
            sx={{ width: `${pct(segment.value)}%`, background: segment.color }}
          />
        ))}
      </Box>

      <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }}>
        {legendSegments.map((segment) => (
          <Stack key={segment.key} direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", background: segment.color }} />
            <Typography variant="caption" color="text.secondary">
              {segment.label} {pct(segment.value).toFixed(1)}%
            </Typography>
          </Stack>
        ))}
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

function buildTeamAggregateData(responses = [], members = [], label = "Team") {
  const safeResponses = responses.filter(Boolean);

  const teamTargetValue = round2(
    members.reduce((sum, member) => sum + toNumber(member?.target, 0), 0)
  );

  const flattenedRows = safeResponses
    .flatMap((response) =>
      (response?.rows || []).map((row) => ({
        ...row,
        agentName: response?.agentName || "",
      }))
    )
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const flattenedWalletRows = safeResponses
    .flatMap((response) =>
      (response?.walletCoin?.rows || []).map((row) => ({
        ...row,
        agentName: response?.agentName || "",
      }))
    )
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const baseDeliveredRevenue = round2(
    safeResponses.reduce(
      (sum, response) =>
        sum +
        toNumber(
          response?.slab?.deliveredRevenue ?? response?.summary?.deliveredRevenue,
          0
        ),
      0
    )
  );

  const baseTotalRevenue = round2(
    safeResponses.reduce(
      (sum, response) =>
        sum +
        toNumber(
          response?.slab?.totalRevenue ?? response?.summary?.totalRevenue,
          0
        ),
      0
    )
  );

  const deliveredAchievementPercent = teamTargetValue
    ? round2((baseDeliveredRevenue / teamTargetValue) * 100)
    : 0;

  const totalAchievementPercent = teamTargetValue
    ? round2((baseTotalRevenue / teamTargetValue) * 100)
    : 0;

  const deliveredPercent = getTeamIncentivePercent(deliveredAchievementPercent);
  const totalPercent = getTeamIncentivePercent(totalAchievementPercent);

  const rows = flattenedRows.map((row) => {
    const walletBucket = row.walletBucket || "unknown";
    const amount = toNumber(row.amount, 0);

    return {
      ...row,
      amount,
      walletBucket,
      incentivePercent: toNumber(row.incentivePercent, 0),
      incentiveAmount: toNumber(row.incentiveAmount, 0),
    };
  });

  const availableRows = rows.filter((row) => row.walletBucket === "available");
  const comingRows = rows.filter((row) => row.walletBucket === "coming" && !row.isAtRisk);
  const atRiskRows = rows.filter((row) => row.walletBucket === "coming" && row.isAtRisk);
  const reversedRows = rows.filter((row) => row.walletBucket === "reversed");
  const unknownRows = rows.filter((row) => row.walletBucket === "unknown");

  const deliveredRevenue = round2(
    availableRows.reduce((sum, row) => sum + toNumber(row.amount, 0), 0)
  );
  const comingRevenue = round2(
    comingRows.reduce((sum, row) => sum + toNumber(row.amount, 0), 0)
  );
  const atRiskRevenue = round2(
    atRiskRows.reduce((sum, row) => sum + toNumber(row.amount, 0), 0)
  );
  const reversedRevenue = round2(
    reversedRows.reduce((sum, row) => sum + toNumber(row.amount, 0), 0)
  );
  const unknownRevenue = round2(
    unknownRows.reduce((sum, row) => sum + toNumber(row.amount, 0), 0)
  );

  const availableIncentive = round2(
    safeResponses.reduce(
      (sum, response) => sum + toNumber(response?.summary?.availableIncentive, 0),
      0
    )
  );

  const comingIncentive = round2(
    safeResponses.reduce(
      (sum, response) => sum + toNumber(response?.summary?.comingIncentive, 0),
      0
    )
  );

  const atRiskIncentive = round2(
    safeResponses.reduce(
      (sum, response) => sum + toNumber(response?.summary?.atRiskIncentive, 0),
      0
    )
  );

  const reversedIncentive = round2(
    safeResponses.reduce(
      (sum, response) => sum + toNumber(response?.summary?.reversedIncentive, 0),
      0
    )
  );

  const walletAvailableCash = round2(
    safeResponses.reduce(
      (sum, response) =>
        sum +
        toNumber(
          response?.wallet?.availableCash ?? response?.summary?.availableIncentive,
          0
        ),
      0
    )
  );

  const walletAvailableCoin = round2(
    safeResponses.reduce(
      (sum, response) =>
        sum +
        toNumber(
          response?.wallet?.availableCoin ?? response?.walletCoin?.availableCoin,
          0
        ),
      0
    )
  );

  const totalCashConverted = round2(
    safeResponses.reduce(
      (sum, response) =>
        sum +
        toNumber(
          response?.wallet?.totalCashConverted ??
          response?.summary?.totalCashConverted,
          0
        ),
      0
    )
  );

  const totalCoinReceived = round2(
    safeResponses.reduce(
      (sum, response) =>
        sum +
        toNumber(
          response?.wallet?.totalCoinReceived ??
          response?.summary?.convertedCoinAdded,
          0
        ),
      0
    )
  );

  const prepaidCount = safeResponses.reduce(
    (sum, response) =>
      sum +
      toNumber(
        response?.summary?.prepaidCount ?? response?.walletCoin?.prepaidCount,
        0
      ),
    0
  );

  const partialPaidCount = safeResponses.reduce(
    (sum, response) =>
      sum +
      toNumber(
        response?.summary?.partialPaidCount ??
        response?.walletCoin?.partialPaidCount,
        0
      ),
    0
  );

  const referralPatientCount = safeResponses.reduce(
    (sum, response) =>
      sum +
      toNumber(
        response?.summary?.referralPatientCount ??
        response?.walletCoin?.referralPatientCount,
        0
      ),
    0
  );

  const prepaidCoins = round2(
    safeResponses.reduce(
      (sum, response) =>
        sum +
        toNumber(
          response?.summary?.prepaidCoins ?? response?.walletCoin?.prepaidCoins,
          0
        ),
      0
    )
  );

  const partialPaidCoins = round2(
    safeResponses.reduce(
      (sum, response) =>
        sum +
        toNumber(
          response?.summary?.partialPaidCoins ??
          response?.walletCoin?.partialPaidCoins,
          0
        ),
      0
    )
  );

  const referralPatientCoins = round2(
    safeResponses.reduce(
      (sum, response) =>
        sum +
        toNumber(
          response?.summary?.referralPatientCoins ??
          response?.walletCoin?.referralPatientCoins,
          0
        ),
      0
    )
  );

  const walletProjectedCoins = round2(
    safeResponses.reduce(
      (sum, response) =>
        sum +
        toNumber(
          response?.walletCoin?.projectedCoins ??
          response?.summary?.walletCoinProjected,
          0
        ),
      0
    )
  );

  const walletBaseEarnedCoins = round2(
    safeResponses.reduce(
      (sum, response) =>
        sum +
        toNumber(
          response?.walletCoin?.baseEarnedCoins ??
          response?.summary?.walletCoinBaseEarned,
          0
        ),
      0
    )
  );

  const walletLapsedCoins = round2(
    safeResponses.reduce(
      (sum, response) =>
        sum +
        toNumber(
          response?.walletCoin?.lapsedCoins ??
          response?.summary?.walletCoinLapsed,
          0
        ),
      0
    )
  );

  const walletQualifyingOrders = safeResponses.reduce(
    (sum, response) =>
      sum +
      toNumber(
        response?.walletCoin?.qualifyingOrders ??
        response?.summary?.walletCoinQualifyingOrders,
        0
      ),
    0
  );

  const walletDeliveredOrders = safeResponses.reduce(
    (sum, response) =>
      sum +
      toNumber(
        response?.walletCoin?.deliveredQualifyingOrders ??
        response?.summary?.walletCoinDeliveredOrders,
        0
      ),
    0
  );

  const walletDeliveredVkrCount = round2(
    safeResponses.reduce(
      (sum, response) => sum + toNumber(response?.walletCoin?.target?.deliveredCount, 0),
      0
    )
  );

  const walletMonthlyTargetCount = round2(
    safeResponses.reduce(
      (sum, response) => sum + toNumber(response?.walletCoin?.target?.monthlyTargetCount, 0),
      0
    )
  );

  const walletWorkingDays = round2(
    safeResponses.reduce(
      (sum, response) => sum + toNumber(response?.walletCoin?.target?.workingDays, 0),
      0
    )
  );

  const walletDailyTarget = round2(
    safeResponses.reduce(
      (sum, response) => sum + toNumber(response?.walletCoin?.target?.dailyTarget, 0),
      0
    )
  );

  const walletAchievementPercent = walletMonthlyTargetCount
    ? round2((walletDeliveredVkrCount / walletMonthlyTargetCount) * 100)
    : 0;

  const rules =
    safeResponses.find((response) => response?.walletCoin?.rules)?.walletCoin?.rules ||
    {};

  const sop =
    safeResponses.find((response) => response?.walletCoin?.sop)?.walletCoin?.sop ||
    {};

  const period =
    safeResponses.find((response) => response?.walletCoin?.period)?.walletCoin?.period ||
    {};

  const target =
    safeResponses.find((response) => response?.walletCoin?.target)?.walletCoin?.target ||
    {};

  const walletNote =
    safeResponses.find((response) => response?.walletCoin?.note)?.walletCoin?.note ||
    "Team wallet coin summary";

  return {
    agentName: label,
    role: "Team",
    isTeamAggregate: true,
    teamMembers: members,
    teamTargetValue,
    slab: {
      deliveredRevenue,
      deliveredPercent,
      totalRevenue: baseTotalRevenue,
      totalPercent,
      incentivePercent: deliveredPercent,
      deliveredAchievementPercent,
      totalAchievementPercent,
    },
    summary: {
      totalOrders: rows.length,
      deliveredOrders: availableRows.length,
      comingOrders: comingRows.length,
      reversedOrders: reversedRows.length,
      unknownOrders: unknownRows.length,

      deliveredRevenue,
      comingRevenue,
      reversedRevenue,
      unknownRevenue,
      totalRevenue: baseTotalRevenue,

      availableIncentive,
      comingIncentive,
      reversedIncentive,

      atRiskOrders: atRiskRows.length,
      atRiskRevenue,
      atRiskIncentive,

      totalVisibleIncentive: round2(availableIncentive + comingIncentive),

      totalCashConverted,
      convertedCoinAdded: totalCoinReceived,

      walletCoinProjected: walletProjectedCoins,
      walletCoinLapsed: walletLapsedCoins,
      walletCoinQualifyingOrders: walletQualifyingOrders,
      walletCoinDeliveredOrders: walletDeliveredOrders,
      walletCoinBaseEarned: walletBaseEarnedCoins,
      walletCoinNote: walletNote,

      prepaidCount,
      partialPaidCount,
      referralPatientCount,
      prepaidCoins,
      partialPaidCoins,
      referralPatientCoins,
    },
    wallet: {
      availableCash: walletAvailableCash,
      availableCoin: walletAvailableCoin,
      totalCashConverted,
      totalCoinReceived,
    },
    walletCoin: {
      projectedCoins: walletProjectedCoins,
      baseEarnedCoins: walletBaseEarnedCoins,
      earnedCoins: walletBaseEarnedCoins,
      lapsedCoins: walletLapsedCoins,
      qualifyingOrders: walletQualifyingOrders,
      deliveredQualifyingOrders: walletDeliveredOrders,
      prepaidCount,
      partialPaidCount,
      referralPatientCount,
      prepaidCoins,
      partialPaidCoins,
      referralPatientCoins,
      note: walletNote,
      sop,
      target: {
        ...target,
        dailyTarget: walletDailyTarget,
        workingDays: walletWorkingDays,
        deliveredCount: walletDeliveredVkrCount,
        monthlyTargetCount: walletMonthlyTargetCount,
        achievementPercent: walletAchievementPercent,
      },
      period,
      rows: flattenedWalletRows,
      rules,
      convertedCoinAdded: totalCoinReceived,
      availableCoin: walletAvailableCoin,
    },
    rows,
  };
}



export default function IncentivesPage() {
  const sessionUser = useMemo(() => getSessionUser(), []);
  const defaultMonth = useMemo(() => getCurrentMonthValue(), []);
  const headers = useMemo(() => getAuthHeaders(), []);
  const cumulativeStartDate = useMemo(() => monthToStartDate(MIN_WALLET_MONTH), []);

  const sessionRole = useMemo(
    () => String(sessionUser?.role || "").toLowerCase(),
    [sessionUser]
  );

  const hasTeam = sessionUser?.hasTeam === true;
  const isManagerWithTeam = sessionRole === "manager" && hasTeam;
  const isRetentionWithTeam = sessionRole === "retention agent" && hasTeam;
  const isAdminLike = ["admin", "manager", "super-admin", "team-leader"].includes(
    sessionRole
  );
  const canManageAgents = isAdminLike;

  const selfAgent = useMemo(() => {
    const fullName = sessionUser?.fullName || "";
    if (!fullName) return null;

    return {
      _id: sessionUser?._id || sessionUser?.id || "self",
      fullName,
      role: sessionUser?.role || "",
      email: sessionUser?.email || "",
      target: sessionUser?.target || 0,
      hasTeam: sessionUser?.hasTeam || false,
      teamMembers: sessionUser?.teamMembers || [],
      status: "active",
    };
  }, [sessionUser]);

  const [employees, setEmployees] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [startMonth, setStartMonth] = useState(defaultMonth);
  const [endMonth, setEndMonth] = useState(defaultMonth);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [balanceData, setBalanceData] = useState(null);

  const [incentiveSummaryOpen, setIncentiveSummaryOpen] = useState(false);
  const [walletSummaryOpen, setWalletSummaryOpen] = useState(false);
  const [walletRulesOpen, setWalletRulesOpen] = useState(false);
  const [walletAgentsOpen, setWalletAgentsOpen] = useState(false);
  const [agentVkrRows, setAgentVkrRows] = useState([]);

  const [walletAnchorEl, setWalletAnchorEl] = useState(null);
  const [convertAmount, setConvertAmount] = useState("");
  const [convertLoading, setConvertLoading] = useState(false);
  const [convertError, setConvertError] = useState("");
  const [walletOverride, setWalletOverride] = useState(null);
  const [redeemOpen, setRedeemOpen] = useState(false);

  const [teamViewEnabled, setTeamViewEnabled] = useState(false);

  const derivedStartDate = useMemo(() => monthToStartDate(startMonth), [startMonth]);
  const derivedEndDate = useMemo(() => monthToEndDate(endMonth), [endMonth]);

  useEffect(() => {
    if (!isRetentionWithTeam) {
      setTeamViewEnabled(false);
    }
  }, [isRetentionWithTeam]);

  const currentEmployeeRecord = useMemo(() => {
    return (
      employees.find((emp) => {
        const sameEmail =
          normalizeComparable(emp?.email) &&
          normalizeComparable(emp?.email) === normalizeComparable(sessionUser?.email);

        const sameName =
          normalizeComparable(emp?.fullName) === normalizeComparable(sessionUser?.fullName);

        return sameEmail || sameName;
      }) || selfAgent
    );
  }, [employees, selfAgent, sessionUser]);

  const teamAgents = useMemo(() => {
    const rawTeamMembers =
      currentEmployeeRecord?.teamMembers || sessionUser?.teamMembers || [];

    const memberIds = new Set(
      (Array.isArray(rawTeamMembers) ? rawTeamMembers : [])
        .map((item) => {
          if (!item) return "";
          if (typeof item === "string") return item.trim();
          return getEntityId(item);
        })
        .filter(Boolean)
    );

    if (!memberIds.size) return [];

    return employees.filter((emp) => {
      const empId = getEntityId(emp);
      return (
        memberIds.has(empId) &&
        emp?.status === "active" &&
        (emp?.role === "Sales Agent" || emp?.role === "Retention Agent")
      );
    });
  }, [currentEmployeeRecord, employees, sessionUser]);

  const usingCombinedTeamView = useMemo(() => {
    if (isManagerWithTeam) {
      return !selectedAgent;
    }

    if (isRetentionWithTeam) {
      return teamViewEnabled;
    }

    return false;
  }, [isManagerWithTeam, isRetentionWithTeam, selectedAgent, teamViewEnabled]);

  const canShowAgentDropdown =
    canManageAgents || (isRetentionWithTeam && !usingCombinedTeamView);

  const agentOptions = useMemo(() => {
    const filtered = employees.filter(
      (emp) =>
        emp?.status === "active" &&
        (emp?.role === "Sales Agent" || emp?.role === "Retention Agent")
    );

    if (canManageAgents) {
      return filtered;
    }

    if (isRetentionWithTeam) {
      const selfId = getEntityId(selfAgent);
      const uniqueTeamAgents = teamAgents.filter(
        (emp) => getEntityId(emp) !== selfId
      );

      return selfAgent ? [selfAgent, ...uniqueTeamAgents] : uniqueTeamAgents;
    }

    return selfAgent ? [selfAgent] : [];
  }, [
    canManageAgents,
    employees,
    isRetentionWithTeam,
    selfAgent,
    teamAgents,
  ]);

  const clearPageState = useCallback(() => {
    setData(null);
    setBalanceData(null);
    setWalletOverride(null);
    setError("");
    setIncentiveSummaryOpen(false);
    setWalletSummaryOpen(false);
    setWalletRulesOpen(false);
    setWalletAgentsOpen(false);
    setAgentVkrRows([]);
  }, []);

  const fetchEmployees = useCallback(async () => {
    setLoadingAgents(true);
    setError("");

    try {
      if (!canManageAgents && !hasTeam) {
        setEmployees(selfAgent ? [selfAgent] : []);
        setSelectedAgent(selfAgent || null);
        return;
      }

      const res = await axios.get(`${API_BASE}/api/employees`, {
        params: { status: "active" },
        headers,
      });

      const list = Array.isArray(res.data) ? res.data : res.data?.employees || [];
      setEmployees(list);

      if (isManagerWithTeam) {
        setSelectedAgent(null);
      } else if (isRetentionWithTeam) {
        setSelectedAgent(null);
      } else if (!canManageAgents && selfAgent) {
        setSelectedAgent(selfAgent);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
      setError("Failed to load employees");
    } finally {
      setLoadingAgents(false);
    }
  }, [canManageAgents, hasTeam, headers, isManagerWithTeam, isRetentionWithTeam, selfAgent]);

  const fetchIncentivesForAgent = useCallback(
    async (agentName, startDate, endDate) => {
      const res = await axios.get(`${API_BASE}/api/incentives-new`, {
        headers,
        params: {
          agentName,
          startDate,
          endDate,
        },
      });

      return res.data;
    },
    [headers]
  );

  const buildAgentVkrRow = useCallback((response, fallbackAgent = {}) => {
    const vkrCountTotal = round2(
      response?.walletCoin?.target?.deliveredCount ??
      response?.walletCoin?.deliveredQualifyingOrders ??
      response?.summary?.walletCoinDeliveredOrders ??
      0
    );

    return {
      agentName: response?.agentName || fallbackAgent?.fullName || "-",
      role: response?.role || fallbackAgent?.role || "",
      vkrCountTotal,
    };
  }, []);

  const fetchIncentives = useCallback(async () => {
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
      if (usingCombinedTeamView) {
        if (!teamAgents.length) {
          setData(null);
          setBalanceData(null);
          setAgentVkrRows([]);
          setError("No team members found for this user.");
          setLoadingData(false);
          return;
        }

        const [selectedResponses, cumulativeResponses] = await Promise.all([
          Promise.all(
            teamAgents.map((member) =>
              fetchIncentivesForAgent(member.fullName, derivedStartDate, derivedEndDate)
            )
          ),
          Promise.all(
            teamAgents.map((member) =>
              fetchIncentivesForAgent(member.fullName, cumulativeStartDate, derivedEndDate)
            )
          ),
        ]);

        const selectedTeamData = buildTeamAggregateData(
          selectedResponses,
          teamAgents,
          `${sessionUser?.fullName || "Team"} Team`
        );

        const cumulativeTeamData = buildTeamAggregateData(
          cumulativeResponses,
          teamAgents,
          `${sessionUser?.fullName || "Team"} Team`
        );

        const nextAgentVkrRows = cumulativeResponses
          .map((response, index) => buildAgentVkrRow(response, teamAgents[index]))
          .sort(
            (a, b) =>
              b.vkrCountTotal - a.vkrCountTotal ||
              String(a.agentName).localeCompare(String(b.agentName))
          );

        setData(selectedTeamData);
        setBalanceData(cumulativeTeamData);
        setAgentVkrRows(nextAgentVkrRows);
      } else {
        const effectiveAgentName =
          selectedAgent?.fullName ||
          (!canManageAgents && !isRetentionWithTeam ? selfAgent?.fullName : "");

        if (!effectiveAgentName) {
          setError(canManageAgents ? "Please select an agent" : "Agent not found in session");
          setLoadingData(false);
          return;
        }

        const [selectedResponse, cumulativeResponse] = await Promise.all([
          fetchIncentivesForAgent(effectiveAgentName, derivedStartDate, derivedEndDate),
          fetchIncentivesForAgent(effectiveAgentName, cumulativeStartDate, derivedEndDate),
        ]);

        setData(selectedResponse);
        setBalanceData(cumulativeResponse);
        setAgentVkrRows([
          buildAgentVkrRow(
            cumulativeResponse,
            selectedAgent || selfAgent || { fullName: effectiveAgentName }
          ),
        ]);
      }
    } catch (err) {
      console.error("Error fetching incentives:", err);
      setData(null);
      setBalanceData(null);
      setAgentVkrRows([]);
      setError(err?.response?.data?.message || "Failed to load incentive data");
    } finally {
      setLoadingData(false);
    }
  }, [
    buildAgentVkrRow,
    canManageAgents,
    cumulativeStartDate,
    derivedEndDate,
    derivedStartDate,
    endMonth,
    fetchIncentivesForAgent,
    isRetentionWithTeam,
    selectedAgent,
    selfAgent,
    sessionUser,
    startMonth,
    teamAgents,
    usingCombinedTeamView,
  ]);

  const handleResetFilters = useCallback(() => {
    if (isManagerWithTeam) {
      setSelectedAgent(null);
    } else if (isRetentionWithTeam) {
      setSelectedAgent(null);
    } else {
      setSelectedAgent(selfAgent || null);
    }

    setStartMonth(defaultMonth);
    setEndMonth(defaultMonth);

    if (isRetentionWithTeam) {
      setTeamViewEnabled(false);
    }

    clearPageState();
  }, [
    clearPageState,
    defaultMonth,
    isManagerWithTeam,
    isRetentionWithTeam,
    selfAgent,
  ]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    if (!startMonth || !endMonth || data) return;

    if (isManagerWithTeam && teamAgents.length && !selectedAgent) {
      fetchIncentives();
      return;
    }

    if (isRetentionWithTeam) {
      if (usingCombinedTeamView && teamAgents.length) {
        fetchIncentives();
        return;
      }

      if (!usingCombinedTeamView && selectedAgent?.fullName) {
        fetchIncentives();
        return;
      }

      return;
    }

    if (!canManageAgents && selfAgent?.fullName) {
      fetchIncentives();
    }
  }, [
    canManageAgents,
    data,
    endMonth,
    fetchIncentives,
    isManagerWithTeam,
    isRetentionWithTeam,
    selectedAgent,
    selfAgent,
    startMonth,
    teamAgents,
    usingCombinedTeamView,
  ]);

  const summary = data?.summary || {};
  const slab = data?.slab || {};
  const rows = data?.rows || [];
  const walletCoin = data?.walletCoin || {};
  const walletData = data?.wallet || {};

  const balanceSummary = balanceData?.summary || {};
  const balanceWallet = balanceData?.wallet || {};
  const balanceWalletCoin = balanceData?.walletCoin || {};

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

  const walletUpcomingRows = walletRows.filter(
    (row) =>
      !row?.isDelivered &&
      isUpcomingWalletCoinStatus(row?.shipmentStatus || "")
  );

  const walletUpcomingOrders = walletUpcomingRows.length;

  const walletUpcomingCoins = round2(
    walletUpcomingRows.reduce(
      (sum, row) => sum + Number(row?.coinsIfDelivered || 0),
      0
    )
  );

  const walletTargetVisibleOrders = Number(walletTarget.deliveredCount ?? 0);

  const prepaidCoins = Number(
    summary.prepaidCoins ?? walletCoin.prepaidCoins ?? data?.extraCoins?.prepaidCoins ?? 0
  );

  const partialPaidCoins = Number(
    summary.partialPaidCoins ?? walletCoin.partialPaidCoins ?? data?.extraCoins?.partialPaidCoins ?? 0
  );

  const referralPatientCoins = Number(
    summary.referralPatientCoins ??
    walletCoin.referralPatientCoins ??
    data?.extraCoins?.referralPatientCoins ??
    0
  );

  const prepaidCount = Number(
    summary.prepaidCount ?? walletCoin.prepaidCount ?? data?.extraCoins?.prepaidCount ?? 0
  );

  const partialPaidCount = Number(
    summary.partialPaidCount ?? walletCoin.partialPaidCount ?? data?.extraCoins?.partialPaidCount ?? 0
  );

  const referralPatientCount = Number(
    summary.referralPatientCount ??
    walletCoin.referralPatientCount ??
    data?.extraCoins?.referralPatientCount ??
    0
  );

  const displayAvailableCoinValue = Number(
    walletOverride?.availableCoin ??
    balanceWallet.availableCoin ??
    balanceWalletCoin.availableCoin ??
    balanceSummary.availableWalletCoin ??
    walletData.availableCoin ??
    walletCoin.availableCoin ??
    summary.availableWalletCoin ??
    walletBaseEarnedCoins ??
    0
  );

  const displayAvailableCashValue = Number(
    walletOverride?.availableCash ??
    balanceWallet.availableCash ??
    balanceSummary.availableIncentive ??
    walletData.availableCash ??
    summary.availableIncentive ??
    0
  );

  const displayedConvertedCash = Number(
    balanceWallet.totalCashConverted ??
    balanceSummary.totalCashConverted ??
    walletData.totalCashConverted ??
    summary.totalCashConverted ??
    0
  );

  const displayedConvertedCoin = Number(
    balanceWallet.totalCoinReceived ??
    balanceSummary.convertedCoinAdded ??
    walletData.totalCoinReceived ??
    summary.convertedCoinAdded ??
    0
  );

  const deliveredRevenueValue = Number(slab.deliveredRevenue || 0);
  const totalRevenueValue = Number(slab.totalRevenue || summary.totalRevenue || 0);

  const teamTargetValue = Number(
    data?.teamTargetValue ?? currentEmployeeRecord?.target ?? walletTarget.monthlyTargetCount ?? 0
  );

  const isTeamData = Boolean(data?.isTeamAggregate);

  const deliveredAchievementPercent = Number(
    isTeamData
      ? slab.deliveredAchievementPercent ?? 0
      : deliveredRevenueValue && teamTargetValue
        ? round2((deliveredRevenueValue / teamTargetValue) * 100)
        : 0
  );

  const totalAchievementPercent = Number(
    isTeamData
      ? slab.totalAchievementPercent ?? 0
      : totalRevenueValue && teamTargetValue
        ? round2((totalRevenueValue / teamTargetValue) * 100)
        : 0
  );

  const apiDeliveredPercent = Number(
    slab.deliveredPercent ?? slab.incentivePercent ?? 0
  );

  const apiTotalPercent = Number(slab.totalPercent ?? 0);

  const deliveredSlabRange = useMemo(() => {
    if (!isTeamData) return getSlabRange(deliveredRevenueValue);

    const nextThreshold = getNextTeamThreshold(deliveredAchievementPercent);

    return {
      currentPercent: apiDeliveredPercent,
      min: 0,
      max: nextThreshold
        ? round2((teamTargetValue * nextThreshold.threshold) / 100)
        : deliveredRevenueValue,
      nextPercent: nextThreshold ? nextThreshold.percent : null,
      nextThreshold: nextThreshold?.threshold || null,
    };
  }, [
    apiDeliveredPercent,
    deliveredAchievementPercent,
    deliveredRevenueValue,
    isTeamData,
    teamTargetValue,
  ]);

  const totalSlabRange = useMemo(() => {
    if (!isTeamData) return getSlabRange(totalRevenueValue);

    const nextThreshold = getNextTeamThreshold(totalAchievementPercent);

    return {
      currentPercent: apiTotalPercent,
      min: 0,
      max: nextThreshold
        ? round2((teamTargetValue * nextThreshold.threshold) / 100)
        : totalRevenueValue,
      nextPercent: nextThreshold ? nextThreshold.percent : null,
      nextThreshold: nextThreshold?.threshold || null,
    };
  }, [apiTotalPercent, isTeamData, teamTargetValue, totalAchievementPercent, totalRevenueValue]);

  const deliveredPercent = isTeamData ? apiDeliveredPercent : deliveredSlabRange.currentPercent;
  const totalPercent = isTeamData ? apiTotalPercent : totalSlabRange.currentPercent;

  const deliveredProgress = useMemo(() => {
    if (!isTeamData) {
      const target = Number(deliveredSlabRange.max || 0);
      if (!target) return 0;

      const value = (deliveredRevenueValue / target) * 100;
      return Math.max(0, Math.min(100, value));
    }

    return Math.max(0, Math.min(100, deliveredAchievementPercent));
  }, [deliveredAchievementPercent, deliveredRevenueValue, deliveredSlabRange.max, isTeamData]);

  const totalProgress = useMemo(() => {
    if (!isTeamData) {
      const target = Number(totalSlabRange.max || 0);
      if (!target) return 0;

      const value = (totalRevenueValue / target) * 100;
      return Math.max(0, Math.min(100, value));
    }

    return Math.max(0, Math.min(100, totalAchievementPercent));
  }, [isTeamData, totalAchievementPercent, totalRevenueValue, totalSlabRange.max]);

  const deliveredAmountToNextSlab = useMemo(() => {
    if (!deliveredSlabRange.nextPercent) return 0;

    if (!isTeamData) {
      return Math.max(0, deliveredSlabRange.max - deliveredRevenueValue);
    }

    return Math.max(
      0,
      round2((teamTargetValue * (deliveredSlabRange.nextThreshold || 0)) / 100) -
      deliveredRevenueValue
    );
  }, [deliveredRevenueValue, deliveredSlabRange, isTeamData, teamTargetValue]);

  const totalAmountToNextSlab = useMemo(() => {
    if (!totalSlabRange.nextPercent) return 0;

    if (!isTeamData) {
      return Math.max(0, totalSlabRange.max - totalRevenueValue);
    }

    return Math.max(
      0,
      round2((teamTargetValue * (totalSlabRange.nextThreshold || 0)) / 100) -
      totalRevenueValue
    );
  }, [isTeamData, teamTargetValue, totalRevenueValue, totalSlabRange]);

  const deliveredTone = useMemo(() => getSlabTone(deliveredPercent), [deliveredPercent]);
  const totalTone = useMemo(() => getSlabTone(totalPercent), [totalPercent]);

  const walletPopoverOpen = Boolean(walletAnchorEl);
  const canUseWalletActions = !usingCombinedTeamView && Boolean(data);

  const handleOpenConvertPopover = (event) => {
    if (!canUseWalletActions) return;
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
          startDate: cumulativeStartDate,
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

      setBalanceData((prev) =>
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
          agentName={
            data?.agentName || selectedAgent?.fullName || selfAgent?.fullName || ""
          }
          startDate={cumulativeStartDate}
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
                <Typography
                  variant="h6"
                  sx={{ color: BRAND.available, fontWeight: 800 }}
                >
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
              Balance Period: {formatMonthLabel(MIN_WALLET_MONTH)} to{" "}
              {formatMonthLabel(endMonth)}
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
                sx={OUTLINED_BUTTON_SX}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleConvertCashToCoin}
                disabled={convertLoading || !convertAmount}
                sx={CONTAINED_BUTTON_SX}
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
                {canShowAgentDropdown && (
                  <Autocomplete
                    sx={{
                      width: { xs: "100%", md: 260 },
                      flexShrink: 0,
                    }}
                    options={agentOptions}
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
                      option?.fullName
                        ? `${option.fullName} (${option.role || ""})`
                        : ""
                    }
                    renderInput={(params) => (
                      <TextField {...params} label="Select Agent" size="small" />
                    )}
                  />
                )}

                {isManagerWithTeam && (
                  <Chip
                    label={
                      selectedAgent?.fullName
                        ? "Individual View"
                        : `Combined Team View • ${teamAgents.length} members`
                    }
                    sx={{
                      height: 40,
                      fontWeight: 700,
                      border: `1px solid ${BRAND.border}`,
                      background: "#f8fafc",
                    }}
                  />
                )}

                {isRetentionWithTeam && (
                  <FormControlLabel
                    sx={{ ml: 0 }}
                    control={
                      <Switch
                        checked={teamViewEnabled}
                        onChange={(e) => {
                          setTeamViewEnabled(e.target.checked);
                          if (e.target.checked) {
                            setSelectedAgent(null);
                          }
                          clearPageState();
                        }}
                      />
                    }
                    label="Team All View"
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
                    loadingData ||
                    !startMonth ||
                    !endMonth ||
                    (!usingCombinedTeamView &&
                      !(selectedAgent?.fullName ||
                        (!canManageAgents && !isRetentionWithTeam
                          ? selfAgent?.fullName
                          : ""))) ||
                    (usingCombinedTeamView && teamAgents.length === 0)
                  }
                  sx={{
                    ...CONTAINED_BUTTON_SX,
                    width: { xs: "100%", md: 100 },
                  }}
                >
                  Apply
                </Button>

                <Button
                  variant="outlined"
                  onClick={handleResetFilters}
                  sx={{
                    ...OUTLINED_BUTTON_SX,
                    width: { xs: "100%", md: 100 },
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

                    <Typography variant="caption" sx={{ color: BRAND.sub }}>
                      Balance from {formatMonthLabel(MIN_WALLET_MONTH)} to{" "}
                      {formatMonthLabel(endMonth)}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                    <Button
                      variant="contained"
                      startIcon={<RedeemIcon />}
                      onClick={() => setRedeemOpen(true)}
                      disabled={
                        !canUseWalletActions || Number(displayAvailableCoinValue || 0) <= 0
                      }
                      sx={{
                        ...CONTAINED_BUTTON_SX,
                        borderRadius: 2.5,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Redeem
                    </Button>

                    <Button
                      variant="outlined"
                      onClick={handleOpenConvertPopover}
                      disabled={
                        !canUseWalletActions || Number(displayAvailableCashValue || 0) <= 0
                      }
                      sx={{
                        ...OUTLINED_BUTTON_SX,
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
                      background: "#f3f4f6",
                      color: BRAND.text,
                      fontWeight: 700,
                      border: "1px solid #d1d5db",
                      "& .MuiChip-icon": {
                        color: "#4b5563",
                      },
                    }}
                  />

                  <Button
                    variant="contained"
                    startIcon={<ViewIcon />}
                    onClick={() => setIncentiveSummaryOpen(true)}
                    sx={CONTAINED_BUTTON_SX}
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
                    Incentive Cash Distribution
                  </Typography>

                  <WalletDistributionBar
                    available={summary.availableIncentive || 0}
                    coming={summary.comingIncentive || 0}
                    atRisk={summary.atRiskIncentive || 0}
                    reversed={summary.reversedIncentive || 0}
                    unknown={summary.unknownIncentive || 0}
                  />

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    sx={{ mt: 2, flexWrap: "wrap" }}
                  >
                    <SummaryMetric
                      title="Available Cash"
                      value={formatCurrency(summary.availableIncentive)}
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
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="baseline"
                      >
                        <Typography
                          variant="h5"
                          sx={{ fontWeight: 800, color: BRAND.text }}
                        >
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
                          {isTeamData ? "0%" : "₹0.00"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: BRAND.sub }}>
                          {isTeamData
                            ? totalSlabRange.nextThreshold
                              ? `${totalSlabRange.nextThreshold}%`
                              : "120%+"
                            : formatCurrency(totalSlabRange.max)}
                        </Typography>
                      </Stack>

                      {totalSlabRange.nextPercent ? (
                        <Typography variant="body2" sx={{ color: BRAND.sub, mt: 0.25 }}>
                          Need{" "}
                          <Box
                            component="span"
                            sx={{ fontWeight: 700, color: BRAND.text }}
                          >
                            {formatCurrency(totalAmountToNextSlab)}
                          </Box>{" "}
                          more total to reach{" "}
                          <Box
                            component="span"
                            sx={{ fontWeight: 700, color: totalTone.text }}
                          >
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

                      {isTeamData ? (
                        <Typography variant="caption" sx={{ color: BRAND.sub }}>
                          Achievement: {totalAchievementPercent}% of team target
                        </Typography>
                      ) : null}
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
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="baseline"
                      >
                        <Typography
                          variant="h5"
                          sx={{ fontWeight: 800, color: BRAND.text }}
                        >
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
                          {isTeamData ? "0%" : "₹0.00"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: BRAND.sub }}>
                          {isTeamData
                            ? deliveredSlabRange.nextThreshold
                              ? `${deliveredSlabRange.nextThreshold}%`
                              : "120%+"
                            : formatCurrency(deliveredSlabRange.max)}
                        </Typography>
                      </Stack>

                      {deliveredSlabRange.nextPercent ? (
                        <Typography variant="body2" sx={{ color: BRAND.sub, mt: 0.25 }}>
                          Need{" "}
                          <Box
                            component="span"
                            sx={{ fontWeight: 700, color: BRAND.text }}
                          >
                            {formatCurrency(deliveredAmountToNextSlab)}
                          </Box>{" "}
                          more delivered to reach{" "}
                          <Box
                            component="span"
                            sx={{ fontWeight: 700, color: deliveredTone.text }}
                          >
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

                      {isTeamData ? (
                        <Typography variant="caption" sx={{ color: BRAND.sub }}>
                          Achievement: {deliveredAchievementPercent}% of team target
                        </Typography>
                      ) : null}
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
                    sx={CONTAINED_BUTTON_SX}
                  >
                    View Summary
                  </Button>

                  <Button
                    variant="outlined"
                    onClick={() => setWalletRulesOpen(true)}
                    sx={OUTLINED_BUTTON_SX}
                  >
                    Rules
                  </Button>
                </Stack>
              </Stack>

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
                    <Table sx={{ minWidth: 980 }}>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                          <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Order ID</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                          {data?.isTeamAggregate ? (
                            <TableCell sx={{ fontWeight: 700 }}>Agent</TableCell>
                          ) : null}
                          <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Shipment Status</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Wallet</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">
                            Incentive
                          </TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {data?.rows?.length ? (
                          data.rows.map((row, index) => {
                            const bucketMeta = getBucketMeta(row.walletBucket);
                            const statusMeta = getStatusMeta(row.deliveryStatus);

                            return (
                              <TableRow key={`${row.orderId || "row"}-${index}`} hover>
                                <TableCell>{formatDate(row.date)}</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>{row.orderId || "-"}</TableCell>
                                <TableCell>{row.name || row.customerName || "-"}</TableCell>
                                {data?.isTeamAggregate ? (
                                  <TableCell>{row.agentName || "-"}</TableCell>
                                ) : null}
                                <TableCell sx={{ fontWeight: 600 }}>
                                  {formatCurrency(row.amount)}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    label={statusMeta.label}
                                    color={statusMeta.color}
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    label={bucketMeta.label}
                                    color={bucketMeta.chipColor}
                                    icon={bucketMeta.icon}
                                  />
                                </TableCell>
                                <TableCell
                                  align="right"
                                  sx={{ fontWeight: 700, color: bucketMeta.color }}
                                >
                                  {formatSignedCurrency(row.incentiveAmount, row.walletBucket)}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={data?.isTeamAggregate ? 8 : 7}
                              align="center"
                              sx={{ py: 4 }}
                            >
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
                    sx={OUTLINED_BUTTON_SX}
                  >
                    Close
                  </Button>
                </DialogActions>
              </Dialog>

              <Divider sx={{ my: 2 }} />

              <Dialog
                open={walletSummaryOpen}
                onClose={() => {
                  setWalletSummaryOpen(false);
                  setWalletAgentsOpen(false);
                }}
                fullWidth
                maxWidth="xl"
              >
                <DialogTitle sx={{ fontWeight: 800, color: BRAND.text }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={2}
                  >
                    <Box component="span">Wallet Summary</Box>

                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setWalletAgentsOpen(true)}
                      disabled={!agentVkrRows.length}
                      sx={{
                        ...OUTLINED_BUTTON_SX,
                        fontWeight: 700,
                      }}
                    >
                      View Agents
                    </Button>
                  </Stack>
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
                          {data?.isTeamAggregate ? (
                            <TableCell sx={{ fontWeight: 700 }}>Agent</TableCell>
                          ) : null}
                          <TableCell sx={{ fontWeight: 700 }}>Shipment Status</TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {(walletCoin.rows || []).length ? (
                          (walletCoin.rows || []).map((row, index) => (
                            <TableRow key={`${row.orderId || "wallet"}-${index}`} hover>
                              <TableCell>{formatDate(row.date)}</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>{row.orderId || "-"}</TableCell>
                              <TableCell>{row.customerName || "-"}</TableCell>
                              <TableCell>{row.contactNumber || "-"}</TableCell>
                              {data?.isTeamAggregate ? (
                                <TableCell>{row.agentName || "-"}</TableCell>
                              ) : null}
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
                            <TableCell
                              colSpan={data?.isTeamAggregate ? 6 : 5}
                              align="center"
                              sx={{ py: 4 }}
                            >
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
                    onClick={() => {
                      setWalletSummaryOpen(false);
                      setWalletAgentsOpen(false);
                    }}
                    variant="outlined"
                    sx={OUTLINED_BUTTON_SX}
                  >
                    Close
                  </Button>
                </DialogActions>
              </Dialog>

              <Dialog
                open={walletAgentsOpen}
                onClose={() => setWalletAgentsOpen(false)}
                fullWidth
                maxWidth="sm"
              >
                <DialogTitle sx={{ fontWeight: 800, color: BRAND.text }}>
                  Agent VKR Total
                </DialogTitle>

                <DialogContent dividers sx={{ p: 0 }}>
                  <TableContainer sx={{ overflowX: "auto" }}>
                    <Table sx={{ minWidth: 520 }}>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                          <TableCell sx={{ fontWeight: 700 }}>Agent Name</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">
                            VKR Count Total
                          </TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {agentVkrRows.length ? (
                          agentVkrRows.map((row, index) => (
                            <TableRow key={`${row.agentName || "agent"}-${index}`} hover>
                              <TableCell sx={{ fontWeight: 600 }}>
                                {row.agentName || "-"}
                              </TableCell>
                              <TableCell>{row.role || "-"}</TableCell>
                              <TableCell
                                align="right"
                                sx={{ fontWeight: 800, color: BRAND.coin }}
                              >
                                {formatNumber(row.vkrCountTotal)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                              No agent data found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                  <Button
                    onClick={() => setWalletAgentsOpen(false)}
                    variant="outlined"
                    sx={OUTLINED_BUTTON_SX}
                  >
                    Close
                  </Button>
                </DialogActions>
              </Dialog>

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
                          Target: {formatNumber(walletTargetVisibleOrders)} /{" "}
                          {formatNumber(walletTarget.monthlyTargetCount || 0)}
                        </Typography>
                      </Box>

                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.25}
                        sx={{
                          width: { xs: "100%", md: "auto" },
                          minWidth: { md: 570 },
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
                          title="Upcoming Coins"
                          value={formatNumber(walletUpcomingCoins)}
                          sub={`${formatNumber(walletUpcomingOrders)} upcoming qualifying orders`}
                          color={BRAND.coming}
                          bg="#ffffff"
                          borderColor="#fde68a"
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
                    sub={`${formatNumber(prepaidCount)} orders`}
                    color={BRAND.prepaid}
                    bg={BRAND.prepaidSoft}
                    borderColor="#ccfbf1"
                  />
                  <SummaryMetric
                    title="Partial Paid"
                    value={formatNumber(partialPaidCoins)}
                    sub={`${formatNumber(partialPaidCount)} orders`}
                    color={BRAND.partial}
                    bg={BRAND.partialSoft}
                    borderColor="#fed7aa"
                  />
                  <SummaryMetric
                    title="Referral Patient"
                    value={formatNumber(referralPatientCoins)}
                    sub={`${formatNumber(referralPatientCount)} referrals`}
                    color={BRAND.referral}
                    bg={BRAND.referralSoft}
                    borderColor="#bfdbfe"
                  />
                </Box>
              </Stack>
            </Paper>


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
                      {walletRules.coinCollectionStartsFrom || "2026-04-01"}
                    </Box>
                  </Typography>

                  <Typography variant="body2" sx={{ color: BRAND.sub }}>
                    Total converted cash:{" "}
                    <Box component="span" sx={{ color: BRAND.text, fontWeight: 700 }}>
                      {formatCurrency(displayedConvertedCash)}
                    </Box>
                  </Typography>

                  <Typography variant="body2" sx={{ color: BRAND.sub }}>
                    Total converted coin:{" "}
                    <Box component="span" sx={{ color: BRAND.text, fontWeight: 700 }}>
                      {formatNumber(displayedConvertedCoin)}
                    </Box>
                  </Typography>

                  <Typography variant="body2" sx={{ color: BRAND.sub }}>
                    Balance period:{" "}
                    <Box component="span" sx={{ color: BRAND.text, fontWeight: 700 }}>
                      {cumulativeStartDate} to {derivedEndDate}
                    </Box>
                  </Typography>

                  {usingCombinedTeamView ? (
                    <Typography variant="body2" sx={{ color: BRAND.sub }}>
                      Team members included:{" "}
                      <Box component="span" sx={{ color: BRAND.text, fontWeight: 700 }}>
                        {teamAgents.map((member) => member.fullName).join(", ") || "-"}
                      </Box>
                    </Typography>
                  ) : null}
                </Stack>
              </DialogContent>

              <DialogActions sx={{ p: 2 }}>
                <Button
                  onClick={() => setWalletRulesOpen(false)}
                  variant="outlined"
                  sx={OUTLINED_BUTTON_SX}
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
