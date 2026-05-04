import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Paper,
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
  AccessTimeOutlined as AccessTimeOutlinedIcon,
  CheckCircleRounded as CheckCircleRoundedIcon,
  CurrencyRupee as CurrencyRupeeIcon,
  ExpandMore as ExpandMoreIcon,
  Groups2 as Groups2Icon,
  InfoOutlined as InfoOutlinedIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
  SaveOutlined as SaveOutlinedIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
} from "@mui/icons-material";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

const BRAND = {
  bg: "#f6f8fb",
  card: "#ffffff",
  text: "#0f172a",
  subtext: "#64748b",
  muted: "#94a3b8",
  border: "#e2e8f0",
  borderStrong: "#cbd5e1",
  primary: "#2563eb",
  primarySoft: "#eff6ff",
  primaryTint: "#eef6ff",
  success: "#16a34a",
  successSoft: "#f0fdf4",
  warning: "#f59e0b",
  warningSoft: "#fffbeb",
  warningDeep: "#d97706",
  warningBorder: "#fcd34d",
  orange: "#ea580c",
  orangeSoft: "#fff7ed",
  violet: "#7c3aed",
  violetSoft: "#f5f3ff",
  accent: "#e25c1a",
  accentSoft: "#fef0e8",
  danger: "#dc2626",
  shadow: "0 1px 3px rgba(15,23,42,0.06)",
  shadowLg: "0 8px 24px rgba(15,23,42,0.12)",
};

const TEAM_LEADER_RESET = {
  iso: "2026-05-01",
  year: 2026,
  monthIndex: 4,
  label: "May 1, 2026",
};

const AGENT_STEPS = [
  { threshold: 5, hike: 1000 },
  { threshold: 8, hike: 1000 },
  { threshold: 10, hike: 1000 },
  { threshold: 15, hike: 1000 },
  { threshold: 20, hike: 1100 },
  { threshold: 25, hike: 1200 },
  { threshold: 30, hike: 1300 },
  { threshold: 35, hike: 1400 },
  { threshold: 40, hike: 1500 },
  { threshold: 45, hike: 1600 },
  { threshold: 50, hike: 1700, note: "Qualify for ATL, final call with management" },
  { threshold: 55, hike: 1800 },
  { threshold: 60, hike: 1900 },
  { threshold: 70, hike: 2000 },
  { threshold: 80, hike: 2000, note: "Qualify for TL, final call with management" },
  { threshold: 90, hike: 2200 },
  { threshold: 100, hike: 2300 },
  { threshold: 110, hike: 2400 },
  { threshold: 130, hike: 2400 },
  { threshold: 150, hike: 2400 },
  { threshold: 170, hike: 2400 },
  { threshold: 190, hike: 2400 },
  { threshold: 210, hike: 2400 },
  { threshold: 230, hike: 2400 },
  { threshold: 250, hike: 2400 },
  { threshold: 270, hike: 2400 },
  { threshold: 290, hike: 2400 },
  { threshold: 310, hike: 2400 },
  { threshold: 330, hike: 2400 },
  { threshold: 350, hike: 2400 },
];

const TEAM_LEADER_STEPS = [
  { threshold: 25, hike: 1000 },
  { threshold: 50, hike: 1500 },
  { threshold: 100, hike: 1500 },
  { threshold: 150, hike: 1500 },
  { threshold: 200, hike: 1500 },
  { threshold: 250, hike: 1500 },
  { threshold: 300, hike: 1500 },
  { threshold: 350, hike: 1500 },
  { threshold: 400, hike: 1500, note: "Qualify for Sr TL, final call with management", shortLabel: "4 Cr milestone" },
  { threshold: 450, hike: 2000 },
  { threshold: 500, hike: 2000 },
  { threshold: 550, hike: 2000 },
  { threshold: 600, hike: 2000 },
  { threshold: 650, hike: 2000 },
  { threshold: 700, hike: 2000 },
  { threshold: 750, hike: 2000 },
  { threshold: 800, hike: 2000, note: "Qualify for ASM, final call with management" },
  { threshold: 850, hike: 2000 },
  { threshold: 900, hike: 2000 },
  { threshold: 950, hike: 2000 },
  { threshold: 1000, hike: 2000 },
];

const AGENT_MILESTONES = [
  { threshold: 50, label: "ATL milestone", note: "Qualify for ATL, final call with management" },
  { threshold: 80, label: "TL milestone", note: "Qualify for TL, final call with management" },
];

const TEAM_LEADER_MILESTONES = [
  { threshold: 400, label: "4 Cr milestone", note: "Qualify for Sr TL, final call with management" },
  { threshold: 800, label: "ASM milestone", note: "Qualify for ASM, final call with management" },
];

function getCurrentUser() {
  try {
    return JSON.parse(sessionStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

function mergeStoredProfile(employee = {}, storedUser = {}) {
  return {
    ...employee,
    joiningDate: employee?.joiningDate || storedUser?.joiningDate || "",
    joiningSalary:
      employee?.joiningSalary !== null && employee?.joiningSalary !== undefined
        ? employee.joiningSalary
        : storedUser?.joiningSalary ?? null,
    currentSalary:
      employee?.currentSalary !== null && employee?.currentSalary !== undefined
        ? employee.currentSalary
        : storedUser?.currentSalary ?? null,
    teamLeaderStartDate:
      employee?.teamLeaderStartDate || storedUser?.teamLeaderStartDate || "",
  };
}

function getActorName() {
  const user = getCurrentUser();
  return user?.fullName || user?.name || user?.email || "Unknown";
}

function getEntityId(entity) {
  return String(entity?._id || entity?.id || "").trim();
}

function resolveTeamMember(member, employeesById) {
  if (!member) return null;

  if (typeof member === "string") {
    return employeesById.get(String(member).trim()) || { _id: String(member).trim() };
  }

  const memberId = getEntityId(member);
  const matchedEmployee = memberId ? employeesById.get(memberId) : null;

  return {
    ...(matchedEmployee || {}),
    ...member,
    fullName:
      member?.fullName ||
      matchedEmployee?.fullName ||
      member?.name ||
      matchedEmployee?.name ||
      "",
    email: member?.email || matchedEmployee?.email || "",
    monthlyDeliveredSales:
      member?.monthlyDeliveredSales ||
      matchedEmployee?.monthlyDeliveredSales ||
      {},
  };
}

function normalizeRole(role = "") {
  return String(role || "").trim().toLowerCase();
}

function isTeamLeaderRole(role = "") {
  const normalized = normalizeRole(role);
  return normalized === "team leader" || normalized === "team-leader" || normalized === "teamleader";
}

function isSuperAdminRole(role = "") {
  const normalized = normalizeRole(role);
  return (
    normalized === "super admin" ||
    normalized === "super-admin" ||
    normalized === "superadmin"
  );
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatLakhs(value) {
  const rounded = Math.round(Number(value || 0) * 10) / 10;
  return `${rounded.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 1,
    maximumFractionDigits: 1,
  })} L`;
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== "";
}

function formatCurrencyOrDash(value) {
  return hasValue(value) ? formatCurrency(value) : "—";
}

function formatLakhsOrDash(value) {
  return hasValue(value) ? formatLakhs(value) : "—";
}

function getMonthKeyFromDate(date = new Date()) {
  return date.toLocaleString("default", { month: "short", year: "2-digit" });
}

function sumHikesUntil(steps, index) {
  if (index < 0) return 0;
  return steps.slice(0, index + 1).reduce((sum, step) => sum + Number(step.hike || 0), 0);
}

function getCurrentStepIndex(steps, salesLakhs) {
  let currentIndex = -1;
  steps.forEach((step, index) => {
    if (salesLakhs >= step.threshold) currentIndex = index;
  });
  return currentIndex;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildTableRows(steps, baseSalary) {
  let runningSalary = Number(baseSalary || 0);
  return steps.map((step, index) => {
    runningSalary += Number(step.hike || 0);
    return {
      ...step,
      slabNumber: index + 1,
      slabSalary: runningSalary,
    };
  });
}

function formatSlabLabel(stepOrRow) {
  if (!stepOrRow) return "";
  return `Slab ${stepOrRow.slabNumber} · ${stepOrRow.threshold}L`;
}

function findNextEffectiveHikeRow(tableRows, currentSalary, currentStepIndex) {
  return (
    tableRows.find(
      (row, index) => index > currentStepIndex && Number(row.slabSalary || 0) > Number(currentSalary || 0)
    ) || null
  );
}

function parseMonthKey(monthKey = "") {
  const [monthName, yearPart] = String(monthKey || "").trim().split(/\s+/);
  const monthMap = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11,
  };

  const normalizedMonth = String(monthName || "").trim().toLowerCase();
  if (!monthMap.hasOwnProperty(normalizedMonth) || !yearPart) return null;

  const normalizedYearPart = String(yearPart).trim();
  const year =
    normalizedYearPart.length === 2
      ? Number(`20${normalizedYearPart}`)
      : Number(normalizedYearPart);
  if (Number.isNaN(year)) return null;

  return {
    year,
    monthIndex: monthMap[normalizedMonth],
  };
}

function sumMonthlySalesFrom(monthlyDeliveredSales = {}, resetConfig) {
  return Object.entries(monthlyDeliveredSales || {}).reduce((sum, [monthKey, value]) => {
    const parsed = parseMonthKey(monthKey);
    if (!parsed) return sum;

    const isAfterReset =
      parsed.year > resetConfig.year ||
      (parsed.year === resetConfig.year && parsed.monthIndex >= resetConfig.monthIndex);

    if (!isAfterReset) return sum;
    return sum + Number(value || 0);
  }, 0);
}

function getTrailingNinetyDayRange() {
  const end = dayjs().endOf("day");
  const start = end.subtract(89, "day").startOf("day");
  return {
    start,
    end,
    startDate: start.format("YYYY-MM-DD"),
    endDate: end.format("YYYY-MM-DD"),
  };
}

function getLastNinetyDaysAverageLakhsFromRows(rows = []) {
  const { start, end } = getTrailingNinetyDayRange();
  const totalLakhs = (Array.isArray(rows) ? rows : []).reduce((sum, row) => {
    const rowDate = dayjs(row?.date);
    if (!rowDate.isValid()) return sum;
    if (rowDate.isBefore(start) || rowDate.isAfter(end)) return sum;
    return sum + Number(row?.amount || 0) / 100000;
  }, 0);

  if (totalLakhs <= 0) return null;
  return totalLakhs / 3;
}

function getMilestoneDisplayLabel(milestone) {
  if (!milestone?.label) return "next promotion";
  return String(milestone.label).replace(/\s*milestone$/i, "").trim();
}

function findCurrentEmployee(employees, sessionUser) {
  const userId = getEntityId(sessionUser);
  const email = String(sessionUser?.email || "").trim().toLowerCase();
  const fullName = String(sessionUser?.fullName || "").trim().toLowerCase();

  return (
    employees.find((employee) => {
      const employeeId = getEntityId(employee);
      const employeeEmail = String(employee?.email || "").trim().toLowerCase();
      const employeeName = String(employee?.fullName || "").trim().toLowerCase();
      return (
        (userId && employeeId === userId) ||
        (email && employeeEmail === email) ||
        (fullName && employeeName === fullName)
      );
    }) || null
  );
}

function getTrackConfig(role = "") {
  if (isTeamLeaderRole(role)) {
    return {
      key: "teamLeader",
      title: "Team Leader",
      revenueLabel: "Team revenue since May 1, 2026",
      revenueHelper:
        "Progression is based on team revenue only from May 1, 2026 onward. Self revenue is not counted in this ladder.",
      steps: TEAM_LEADER_STEPS,
      milestones: TEAM_LEADER_MILESTONES,
      roleNote:
        "Once your role is updated to Team Leader, your increments follow the Team Leader slab.",
    };
  }

  const normalized = normalizeRole(role);
  if (normalized === "sales agent" || normalized === "retention agent") {
    return {
      key: "agent",
      title: role || "Sales Agent",
      revenueLabel: "Lifetime delivered sales",
      revenueHelper: "Progression is based on your own delivered revenue.",
      steps: AGENT_STEPS,
      milestones: AGENT_MILESTONES,
      roleNote:
        "If you are not promoted to Team Leader after the milestone, increments continue on the same sales slab ladder.",
    };
  }

  return null;
}

function getTenureMeta(employee, trackConfig) {
  if (!employee || !trackConfig) {
    return {
      badgeLabel: "Tenure unavailable",
      startDate: null,
      monthsFloat: 0,
    };
  }

  const startDate =
    trackConfig.key === "teamLeader"
      ? employee?.teamLeaderStartDate || TEAM_LEADER_RESET.iso
      : employee?.joiningDate;

  const start = dayjs(startDate);
  if (!start.isValid()) {
    return {
      badgeLabel: "Tenure unavailable",
      startDate: null,
      monthsFloat: 0,
    };
  }

  const monthsFloat = Math.max(0, dayjs().diff(start, "day") / 30);
  const monthsWhole = Math.max(0, dayjs().diff(start, "month"));

  if (trackConfig.key === "teamLeader" && monthsWhole === 0) {
    return {
      badgeLabel: `New · Started ${start.format("MMM D, YYYY")}`,
      startDate: start,
      monthsFloat,
    };
  }

  const yearsPart = Math.floor(monthsWhole / 12);
  const monthsPart = monthsWhole % 12;
  let label = "";
  if (!yearsPart) {
    label = `${monthsPart} month${monthsPart === 1 ? "" : "s"}`;
  } else if (!monthsPart) {
    label = `${yearsPart} year${yearsPart === 1 ? "" : "s"}`;
  } else {
    label = `${yearsPart} year${yearsPart === 1 ? "" : "s"} ${monthsPart} month${monthsPart === 1 ? "" : "s"}`;
  }

  return {
    badgeLabel: `Tenure: ${label}`,
    startDate: start,
    monthsFloat,
  };
}

function getPaceMetrics({
  salesLakhs,
  tenureMonthsFloat,
  salesRequired,
  recentRows,
  milestoneRequiredLakhs,
}) {
  if (!tenureMonthsFloat || tenureMonthsFloat < 1) {
    return {
      hasEnoughData: false,
      avgMonthlyLakhs: 0,
      lastNinetyDaysAvgLakhs: null,
      monthsToNextSlab: null,
      monthsToPromotion: null,
    };
  }

  const avgMonthlyLakhs = salesLakhs / tenureMonthsFloat;
  const lastNinetyDaysAvgLakhs = getLastNinetyDaysAverageLakhsFromRows(recentRows);
  const monthsToNextSlab =
    lastNinetyDaysAvgLakhs && lastNinetyDaysAvgLakhs > 0 && salesRequired > 0
      ? salesRequired / lastNinetyDaysAvgLakhs
      : salesRequired > 0
      ? null
      : 0;
  const monthsToPromotion =
    avgMonthlyLakhs > 0 && milestoneRequiredLakhs > 0
      ? milestoneRequiredLakhs / avgMonthlyLakhs
      : null;

  return {
    hasEnoughData: avgMonthlyLakhs > 0 || (lastNinetyDaysAvgLakhs && lastNinetyDaysAvgLakhs > 0),
    avgMonthlyLakhs,
    lastNinetyDaysAvgLakhs,
    monthsToNextSlab,
    monthsToPromotion,
  };
}

function formatMonthsEstimate(value) {
  if (value === null || value === undefined) return "—";
  if (!Number.isFinite(value)) return "—";
  if (value <= 0) return "This month";
  return `${value.toFixed(value < 10 ? 1 : 0)} mo`;
}

function getCurrentMonthRevenue(employee) {
  const monthKey = getMonthKeyFromDate();
  const monthlyDeliveredSales = employee?.monthlyDeliveredSales || {};
  if (!Object.prototype.hasOwnProperty.call(monthlyDeliveredSales, monthKey)) {
    return {
      monthKey,
      revenue: null,
    };
  }

  return {
    monthKey,
    revenue: Number(monthlyDeliveredSales[monthKey] || 0),
  };
}

function inferHikeHistory({ steps, currentStepIndex, startDate, baseSalary, currentSalesLakhs }) {
  if (currentStepIndex < 0) return [];

  const validStart = startDate && dayjs(startDate).isValid() ? dayjs(startDate) : null;
  const totalDays = validStart ? Math.max(1, dayjs().diff(validStart, "day")) : 0;
  let runningSalary = Number(baseSalary || 0);

  return steps.slice(0, currentStepIndex + 1).map((step, index) => {
    runningSalary += Number(step.hike || 0);

    let estimatedDate = null;
    if (validStart && currentSalesLakhs > 0) {
      const ratio = clamp(step.threshold / currentSalesLakhs, 0, 1);
      estimatedDate = validStart.add(Math.round(totalDays * ratio), "day");
    }

    return {
      slabNumber: index + 1,
      threshold: step.threshold,
      hike: step.hike,
      salary: runningSalary,
      note: step.note || "",
      monthLabel: estimatedDate ? estimatedDate.format("MMM YYYY") : "Timing unavailable",
    };
  });
}

function getTeamMemberMonthlyLabel(member) {
  const { revenue } = getCurrentMonthRevenue(member);
  if (revenue === null || revenue <= 0) return "— L this month";
  return `${formatLakhs(revenue / 100000)} this month`;
}

function buildGrowthSnapshot(employee, employeesById, options = {}) {
  const { recentRows = [] } = options;
  const trackConfig = getTrackConfig(employee?.role);
  const supportedRole = Boolean(trackConfig);
  const resolvedTeamMembers =
    trackConfig?.key === "teamLeader"
      ? (employee?.teamMembers || [])
          .map((member) => resolveTeamMember(member, employeesById))
          .filter(Boolean)
      : [];
  const joiningSalaryValue = hasValue(employee?.joiningSalary)
    ? Number(employee?.joiningSalary)
    : 0;
  const liveCurrentSalary = hasValue(employee?.currentSalary)
    ? Number(employee?.currentSalary)
    : joiningSalaryValue;
  const slabBaseSalary =
    trackConfig?.key === "teamLeader" ? liveCurrentSalary : joiningSalaryValue;
  const revenueRupees = !trackConfig
    ? 0
    : trackConfig.key === "teamLeader"
    ? resolvedTeamMembers.reduce(
        (sum, member) =>
          sum +
          sumMonthlySalesFrom(
            member?.monthlyDeliveredSales || {},
            TEAM_LEADER_RESET
          ),
        0
      )
    : Number(employee?.totalDeliveredSales || 0);
  const salesLakhs = revenueRupees / 100000;
  const currentStepIndex = trackConfig
    ? getCurrentStepIndex(trackConfig.steps, salesLakhs)
    : -1;
  const tableRows = trackConfig
    ? buildTableRows(trackConfig.steps, slabBaseSalary)
    : [];
  const currentRow = currentStepIndex >= 0 ? tableRows[currentStepIndex] || null : null;
  const immediateNextRow =
    currentStepIndex >= 0 ? tableRows[currentStepIndex + 1] || null : tableRows[0] || null;
  const earnedSlabSalary =
    trackConfig?.key === "agent"
      ? joiningSalaryValue + sumHikesUntil(trackConfig.steps, currentStepIndex)
      : currentRow?.slabSalary || liveCurrentSalary;
  const isSalaryAheadOfSlab =
    trackConfig?.key === "agent" && liveCurrentSalary > earnedSlabSalary;
  const displayNextRow =
    isSalaryAheadOfSlab && trackConfig?.key === "agent"
      ? findNextEffectiveHikeRow(tableRows, liveCurrentSalary, currentStepIndex)
      : immediateNextRow;
  const progressStartThreshold = currentRow ? currentRow.threshold : 0;
  const progressTargetThreshold = displayNextRow
    ? displayNextRow.threshold
    : progressStartThreshold;
  const progressPercent =
    displayNextRow && progressTargetThreshold > progressStartThreshold
      ? clamp(
          ((salesLakhs - progressStartThreshold) /
            (progressTargetThreshold - progressStartThreshold)) *
            100,
          0,
          100
        )
      : currentRow
      ? 100
      : 0;
  const salesRequired = displayNextRow
    ? Math.max(0, displayNextRow.threshold - salesLakhs)
    : 0;
  const nextMilestone = trackConfig
    ? trackConfig.milestones.find((milestone) => salesLakhs < milestone.threshold) ||
      null
    : null;
  const milestoneRequiredLakhs = nextMilestone
    ? Math.max(0, nextMilestone.threshold - salesLakhs)
    : 0;
  const tenureMeta = getTenureMeta(employee, trackConfig);
  const paceMetrics = getPaceMetrics({
    salesLakhs,
    tenureMonthsFloat: tenureMeta.monthsFloat,
    salesRequired,
    recentRows,
    milestoneRequiredLakhs,
  });
  const hikeHistory = trackConfig
    ? inferHikeHistory({
        steps: trackConfig.steps,
        currentStepIndex,
        startDate: tenureMeta.startDate,
        baseSalary: slabBaseSalary,
        currentSalesLakhs: salesLakhs,
      })
    : [];
  const tlMemberCount = resolvedTeamMembers.length;
  const salaryCatchupGap = Math.max(0, liveCurrentSalary - earnedSlabSalary);
  const profileIncomplete =
    !hasValue(employee?.joiningDate) ||
    !hasValue(employee?.joiningSalary) ||
    !hasValue(employee?.currentSalary);

  let statusNote = "On track";
  if (!supportedRole) {
    statusNote = "Unsupported role";
  } else if (profileIncomplete) {
    statusNote = "Profile incomplete";
  } else if (isSalaryAheadOfSlab) {
    statusNote = displayNextRow
      ? `Delayed hike · correction until ${formatSlabLabel(displayNextRow)}`
      : "Delayed hike · salary ahead of ladder";
  } else if (currentRow && !displayNextRow) {
    statusNote = "Top slab reached";
  } else if (!currentRow) {
    statusNote = "First slab pending";
  }

  return {
    trackConfig,
    supportedRole,
    resolvedTeamMembers,
    liveCurrentSalary,
    slabBaseSalary,
    revenueRupees,
    salesLakhs,
    currentStepIndex,
    tableRows,
    currentRow,
    displayNextRow,
    earnedSlabSalary,
    isSalaryAheadOfSlab,
    progressStartThreshold,
    progressTargetThreshold,
    progressPercent,
    salesRequired,
    nextMilestone,
    tenureMeta,
    paceMetrics,
    hikeHistory,
    tlMemberCount,
    salaryCatchupGap,
    profileIncomplete,
    statusNote,
  };
}

function SummaryCard({ icon, label, value, helper, accentColor, iconBackground }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.25,
        borderRadius: 3,
        border: `1px solid ${BRAND.border}`,
        borderLeft: `4px solid ${accentColor}`,
        boxShadow: BRAND.shadow,
        height: "100%",
        bgcolor: BRAND.card,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 2.5,
            display: "grid",
            placeItems: "center",
            bgcolor: iconBackground,
            color: accentColor,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              color: BRAND.subtext,
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.45,
            }}
          >
            {label}
          </Typography>
          <Typography
            sx={{
              mt: 0.45,
              color: BRAND.text,
              fontSize: { xs: 20, md: 24 },
              fontWeight: 800,
              lineHeight: 1.15,
            }}
          >
            {value}
          </Typography>
          {helper ? (
            <Typography sx={{ mt: 0.75, color: BRAND.subtext, fontSize: 12.5 }}>
              {helper}
            </Typography>
          ) : null}
        </Box>
      </Stack>
    </Paper>
  );
}

function PaceItem({ label, value, helper }) {
  return (
    <Box sx={{ flex: 1, minWidth: 180 }}>
      <Typography sx={{ color: BRAND.subtext, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </Typography>
      <Typography sx={{ mt: 0.45, color: BRAND.text, fontSize: 20, fontWeight: 800 }}>
        {value}
      </Typography>
      {helper ? (
        <Typography sx={{ mt: 0.35, color: BRAND.subtext, fontSize: 12.5 }}>
          {helper}
        </Typography>
      ) : null}
    </Box>
  );
}

function AdminGrowthTableSection({ title, helper, rows, revenueLabel }) {
  return (
    <Paper
      elevation={0}
      sx={{
        mt: 2,
        borderRadius: 4,
        border: `1px solid ${BRAND.border}`,
        boxShadow: BRAND.shadow,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          px: { xs: 2, md: 2.5 },
          py: 2,
          borderBottom: `1px solid ${BRAND.border}`,
          bgcolor: "#fff",
        }}
      >
        <Typography sx={{ color: BRAND.text, fontWeight: 800, fontSize: 20 }}>
          {title}
        </Typography>
        <Typography sx={{ mt: 0.5, color: BRAND.subtext, fontSize: 14 }}>
          {helper}
        </Typography>
      </Box>

      <TableContainer
        sx={{
          overflowX: "auto",
          overflowY: "auto",
          maxHeight: 620,
          bgcolor: "#fff",
        }}
      >
        <Table stickyHeader sx={{ minWidth: 1480 }}>
          <TableHead>
            <TableRow>
              {[
                "Employee",
                "Role",
                "Joining Salary",
                "Current Salary",
                "Current Slab",
                "Next Slab / Hike",
                "Next Slab Salary",
                revenueLabel,
                "Earned Slab Salary",
                "Sales Required",
                "Status Note",
              ].map((label) => (
                <TableCell
                  key={label}
                  sx={{
                    py: 1.5,
                    px: 2,
                    bgcolor: "#f8fafc",
                    borderBottom: `1px solid ${BRAND.border}`,
                    color: BRAND.text,
                    fontSize: 12.5,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                  }}
                >
                  {label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length ? (
              rows.map(({ employee, snapshot }, index) => (
                <TableRow
                  key={getEntityId(employee) || `${employee?.email}-${index}`}
                  sx={{
                    bgcolor: index % 2 === 0 ? "#ffffff" : "#fcfdff",
                    "& td": {
                      borderBottom: "1px solid #eef2f7",
                      verticalAlign: "top",
                    },
                  }}
                >
                  <TableCell sx={{ py: 1.5, px: 2 }}>
                    <Typography sx={{ color: BRAND.text, fontWeight: 700 }}>
                      {employee?.fullName || employee?.email || "Unnamed employee"}
                    </Typography>
                    {employee?.email ? (
                      <Typography sx={{ mt: 0.35, color: BRAND.subtext, fontSize: 12.5 }}>
                        {employee.email}
                      </Typography>
                    ) : null}
                  </TableCell>

                  <TableCell sx={{ py: 1.5, px: 2, color: BRAND.text, fontWeight: 600 }}>
                    {employee?.role || "—"}
                  </TableCell>

                  <TableCell sx={{ py: 1.5, px: 2, color: BRAND.text, fontWeight: 700 }}>
                    {formatCurrencyOrDash(employee?.joiningSalary)}
                  </TableCell>

                  <TableCell sx={{ py: 1.5, px: 2, color: BRAND.text, fontWeight: 700 }}>
                    {formatCurrencyOrDash(employee?.currentSalary)}
                  </TableCell>

                  <TableCell sx={{ py: 1.5, px: 2 }}>
                    <Typography sx={{ color: BRAND.text, fontWeight: 700 }}>
                      {snapshot.currentRow ? formatSlabLabel(snapshot.currentRow) : "Not unlocked yet"}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ py: 1.5, px: 2 }}>
                    <Typography sx={{ color: BRAND.text, fontWeight: 700 }}>
                      {snapshot.displayNextRow
                        ? snapshot.isSalaryAheadOfSlab
                          ? `Next Hike At · ${formatSlabLabel(snapshot.displayNextRow)}`
                          : formatSlabLabel(snapshot.displayNextRow)
                        : snapshot.isSalaryAheadOfSlab
                        ? "Await ladder update"
                        : "Top slab reached"}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ py: 1.5, px: 2, color: BRAND.text, fontWeight: 700 }}>
                    {snapshot.displayNextRow
                      ? formatCurrencyOrDash(snapshot.displayNextRow.slabSalary)
                      : "—"}
                  </TableCell>

                  <TableCell sx={{ py: 1.5, px: 2, color: BRAND.text, fontWeight: 700 }}>
                    {formatCurrency(snapshot.revenueRupees)}
                  </TableCell>

                  <TableCell sx={{ py: 1.5, px: 2, color: BRAND.text, fontWeight: 700 }}>
                    {snapshot.profileIncomplete
                      ? "—"
                      : formatCurrencyOrDash(snapshot.earnedSlabSalary)}
                  </TableCell>

                  <TableCell sx={{ py: 1.5, px: 2, color: BRAND.text, fontWeight: 700 }}>
                    {snapshot.displayNextRow ? formatLakhsOrDash(snapshot.salesRequired) : "—"}
                  </TableCell>

                  <TableCell sx={{ py: 1.5, px: 2 }}>
                    <Typography sx={{ color: BRAND.subtext, fontSize: 13.25, lineHeight: 1.5 }}>
                      {snapshot.statusNote}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={11} sx={{ py: 3, px: 2 }}>
                  <Typography sx={{ color: BRAND.subtext }}>
                    No active employees found in this section.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

export default function GrowthTracker() {
  const sessionUser = useMemo(() => getCurrentUser(), []);
  const [employee, setEmployee] = useState(null);
  const [allEmployees, setAllEmployees] = useState([]);
  const [recentIncentiveRows, setRecentIncentiveRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState("");
  const [openProfileDialog, setOpenProfileDialog] = useState(false);
  const [showPromotionInfo, setShowPromotionInfo] = useState(false);
  const [profileDraft, setProfileDraft] = useState({
    joiningDate: "",
    joiningSalary: "",
    currentSalary: "",
  });

  useEffect(() => {
    let active = true;

    async function loadGrowthContext() {
      setLoading(true);
      setError("");

      try {
        const { data } = await api.get("/api/employees");
        const employees = Array.isArray(data) ? data : [];
        if (active) {
          setAllEmployees(employees);
        }
        const currentEmployee = findCurrentEmployee(employees, sessionUser);

        if (!currentEmployee) {
          throw new Error("We could not find your employee record.");
        }

        const currentEmployeeId = getEntityId(currentEmployee);
        let employeeData = currentEmployee;
        const currentIsSuperAdmin = isSuperAdminRole(
          currentEmployee?.role || sessionUser?.role
        );

        if (currentEmployeeId && !currentIsSuperAdmin) {
          const detailResponse = await api.get(`/api/employees/${currentEmployeeId}`);
          employeeData = detailResponse?.data || currentEmployee;
        }

        if (!active) return;

        const hydratedEmployee = mergeStoredProfile(employeeData, sessionUser);
        setEmployee(hydratedEmployee);

        const needsJoiningDate = !hydratedEmployee?.joiningDate;
        const needsJoiningSalary =
          hydratedEmployee?.joiningSalary === null ||
          hydratedEmployee?.joiningSalary === undefined ||
          hydratedEmployee?.joiningSalary === "";
        const needsCurrentSalary =
          hydratedEmployee?.currentSalary === null ||
          hydratedEmployee?.currentSalary === undefined ||
          hydratedEmployee?.currentSalary === "";

        if (
          !currentIsSuperAdmin &&
          (needsJoiningDate || needsJoiningSalary || needsCurrentSalary)
        ) {
          setProfileDraft({
            joiningDate: hydratedEmployee?.joiningDate
              ? dayjs(hydratedEmployee.joiningDate).format("YYYY-MM-DD")
              : "",
            joiningSalary:
              hydratedEmployee?.joiningSalary === null || hydratedEmployee?.joiningSalary === undefined
                ? ""
                : String(hydratedEmployee.joiningSalary),
            currentSalary:
              hydratedEmployee?.currentSalary === null || hydratedEmployee?.currentSalary === undefined
                ? ""
                : String(hydratedEmployee.currentSalary),
          });
          setOpenProfileDialog(true);
        }
      } catch (loadError) {
        if (!active) return;
        setError(
          loadError?.response?.data?.message ||
            loadError?.message ||
            "Unable to load your growth plan right now."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    loadGrowthContext();

    return () => {
      active = false;
    };
  }, [sessionUser]);

  useEffect(() => {
    let active = true;

    async function loadRecentPaceRows() {
      const trackConfig = getTrackConfig(employee?.role);
      if (!employee || trackConfig?.key !== "agent" || !employee?.fullName) {
        if (active) setRecentIncentiveRows([]);
        return;
      }

      try {
        const { startDate, endDate } = getTrailingNinetyDayRange();
        const { data } = await api.get("/api/incentives", {
          params: {
            agentName: employee.fullName,
            startDate,
            endDate,
          },
        });

        if (!active) return;
        setRecentIncentiveRows(Array.isArray(data) ? data : []);
      } catch (paceError) {
        console.error("Failed to load recent incentive rows:", paceError);
        if (!active) return;
        setRecentIncentiveRows([]);
      }
    }

    loadRecentPaceRows();

    return () => {
      active = false;
    };
  }, [employee?.fullName, employee?.role]);

  const employeesById = useMemo(() => {
    const lookup = new Map();
    allEmployees.forEach((item) => {
      const id = getEntityId(item);
      if (id) lookup.set(id, item);
    });
    return lookup;
  }, [allEmployees]);
  const selfSnapshot = useMemo(
    () => buildGrowthSnapshot(employee, employeesById, { recentRows: recentIncentiveRows }),
    [employee, employeesById, recentIncentiveRows]
  );
  const trackConfig = selfSnapshot.trackConfig;
  const tenureMeta = selfSnapshot.tenureMeta;
  const resolvedTeamMembers = selfSnapshot.resolvedTeamMembers;
  const liveCurrentSalary = selfSnapshot.liveCurrentSalary;
  const revenueRupees = selfSnapshot.revenueRupees;
  const salesLakhs = selfSnapshot.salesLakhs;
  const currentStepIndex = selfSnapshot.currentStepIndex;
  const tableRows = selfSnapshot.tableRows;
  const currentRow = selfSnapshot.currentRow;
  const displayNextRow = selfSnapshot.displayNextRow;
  const earnedSlabSalary = selfSnapshot.earnedSlabSalary;
  const isSalaryAheadOfSlab = selfSnapshot.isSalaryAheadOfSlab;
  const progressStartThreshold = selfSnapshot.progressStartThreshold;
  const progressTargetThreshold = selfSnapshot.progressTargetThreshold;
  const progressPercent = selfSnapshot.progressPercent;
  const salesRequired = selfSnapshot.salesRequired;
  const nextMilestone = selfSnapshot.nextMilestone;
  const supportedRole = selfSnapshot.supportedRole;
  const paceMetrics = selfSnapshot.paceMetrics;
  const hikeHistory = selfSnapshot.hikeHistory;
  const tlMemberCount = selfSnapshot.tlMemberCount;
  const salaryCatchupGap = selfSnapshot.salaryCatchupGap;
  const isSuperAdmin = isSuperAdminRole(employee?.role || sessionUser?.role);
  const superAdminRows = useMemo(
    () =>
      (allEmployees || [])
        .filter((item) => String(item?.status || "").toLowerCase() === "active")
        .map((item) => ({
          employee: item,
          snapshot: buildGrowthSnapshot(item, employeesById),
        }))
        .filter(({ snapshot }) => snapshot.supportedRole),
    [allEmployees, employeesById]
  );
  const teamLeaderRows = useMemo(
    () =>
      superAdminRows.filter(
        ({ employee: item }) => getTrackConfig(item?.role)?.key === "teamLeader"
      ),
    [superAdminRows]
  );
  const salesRetentionRows = useMemo(
    () =>
      superAdminRows.filter(
        ({ employee: item }) => getTrackConfig(item?.role)?.key === "agent"
      ),
    [superAdminRows]
  );

  async function handleSaveProfile() {
    if (!employee) return;

    if (!profileDraft.joiningDate || !profileDraft.joiningSalary || !profileDraft.currentSalary) {
      setError("Please share joining date, joining salary and current salary to continue.");
      return;
    }

    const parsedSalary = Number(profileDraft.joiningSalary);
    const parsedCurrentSalary = Number(profileDraft.currentSalary);
    if (Number.isNaN(parsedSalary) || parsedSalary < 0) {
      setError("Joining salary must be a valid non-negative number.");
      return;
    }
    if (Number.isNaN(parsedCurrentSalary) || parsedCurrentSalary < 0) {
      setError("Current salary must be a valid non-negative number.");
      return;
    }

    setSavingProfile(true);
    setError("");

    try {
      const employeeId = getEntityId(employee);
      const payload = {
        joiningDate: profileDraft.joiningDate,
        joiningSalary: parsedSalary,
        currentSalary: parsedCurrentSalary,
        changedByName: getActorName(),
      };

      const response = await api.put(`/api/employees/${employeeId}`, payload, {
        headers: { "x-agent-name": getActorName() },
      });

      const updatedEmployee = response?.data?.employee
        ? {
            ...employee,
            ...response.data.employee,
          }
        : {
            ...employee,
            joiningDate: profileDraft.joiningDate,
            joiningSalary: parsedSalary,
            currentSalary: parsedCurrentSalary,
          };

      setEmployee(updatedEmployee);
      setOpenProfileDialog(false);

      try {
        const raw = sessionStorage.getItem("user");
        const storedUser = raw ? JSON.parse(raw) : {};
        const nextStoredUser = {
          ...storedUser,
          joiningDate: updatedEmployee.joiningDate,
          joiningSalary: updatedEmployee.joiningSalary,
          currentSalary: updatedEmployee.currentSalary,
          teamLeaderStartDate: updatedEmployee.teamLeaderStartDate || storedUser?.teamLeaderStartDate,
        };
        sessionStorage.setItem("user", JSON.stringify(nextStoredUser));
        localStorage.setItem("user", JSON.stringify(nextStoredUser));
      } catch {
        // Ignore session/local storage sync failures.
      }
    } catch (saveError) {
      setError(
        saveError?.response?.data?.message ||
          "We could not save your joining details. Please try again."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "70vh",
          display: "grid",
          placeItems: "center",
          bgcolor: BRAND.bg,
          px: 2,
        }}
      >
        <Stack alignItems="center" spacing={1.5}>
          <CircularProgress size={28} />
          <Typography sx={{ color: BRAND.subtext }}>Loading your growth plan...</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100%",
        bgcolor: BRAND.bg,
        px: { xs: 1.5, md: 3 },
        py: { xs: 2, md: 3 },
        fontFamily: "'Noto Sans', system-ui, sans-serif",
      }}
    >
      <Box sx={{ maxWidth: 1360, mx: "auto" }}>
        {error ? (
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 3 }}>
            {error}
          </Alert>
        ) : null}

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 4,
            border: `1px solid ${BRAND.border}`,
            boxShadow: BRAND.shadow,
            background:
              "linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(226,92,26,0.07) 100%)",
          }}
        >
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", lg: "center" }}
          >
            <Box sx={{ maxWidth: 860 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip
                  label={employee?.role || "Role"}
                  sx={{
                    borderRadius: 999,
                    bgcolor: BRAND.primarySoft,
                    color: BRAND.primary,
                    fontWeight: 700,
                    border: "1px solid #bfdbfe",
                  }}
                />
                {!isSuperAdmin ? (
                  <Chip
                    icon={<AccessTimeOutlinedIcon sx={{ fontSize: 16 }} />}
                    label={tenureMeta.badgeLabel}
                    sx={{
                      borderRadius: 999,
                      bgcolor: "#ffffff",
                      color: BRAND.subtext,
                      fontWeight: 600,
                      border: `1px solid ${BRAND.borderStrong}`,
                      "& .MuiChip-icon": {
                        color: BRAND.subtext,
                      },
                    }}
                  />
                ) : null}
              </Stack>

              <Typography
                sx={{
                  mt: 1.5,
                  color: BRAND.text,
                  fontSize: { xs: 28, md: 34 },
                  fontFamily: "'Syne', 'Noto Sans', system-ui, sans-serif",
                  fontWeight: 800,
                  lineHeight: 1.1,
                }}
              >
                {isSuperAdmin ? "Growth Plan Overview" : "My Growth Plan"}
              </Typography>

              <Typography sx={{ mt: 1, color: BRAND.subtext, fontSize: 15 }}>
                {isSuperAdmin
                  ? "Review active Team Leader and Sales / Retention ladders in one place, with current salaries, current slabs, next slabs, and delayed-hike states."
                  : supportedRole
                  ? trackConfig.revenueHelper
                  : "This page is currently designed for Sales Agent, Retention Agent, and Team Leader roles."}
              </Typography>

              {supportedRole && !isSuperAdmin ? (
                <Typography sx={{ mt: 1, color: BRAND.text, fontSize: 14, fontWeight: 600 }}>
                  {trackConfig.roleNote}
                </Typography>
              ) : null}
            </Box>

            <Box
              sx={{
                minWidth: { xs: "100%", lg: 320 },
                width: { xs: "100%", lg: 320 },
                p: 2.25,
                borderRadius: 3,
                bgcolor: "#fff",
                border: `1px solid ${BRAND.border}`,
                boxShadow: BRAND.shadow,
              }}
            >
              <Typography sx={{ color: BRAND.subtext, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>
                {isSuperAdmin ? "Active Employees" : "Current Progress"}
              </Typography>
              <Typography sx={{ mt: 0.75, color: BRAND.text, fontSize: 28, fontWeight: 800 }}>
                {isSuperAdmin
                  ? String(teamLeaderRows.length + salesRetentionRows.length)
                  : supportedRole
                  ? formatLakhs(salesLakhs)
                  : "--"}
              </Typography>
              <Typography sx={{ mt: 0.6, color: BRAND.subtext, fontSize: 13 }}>
                {isSuperAdmin
                  ? `${teamLeaderRows.length} team leaders · ${salesRetentionRows.length} sales / retention`
                  : supportedRole
                  ? `${trackConfig.revenueLabel}`
                  : "Growth tracking becomes available once your role is supported here."}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {isSuperAdmin ? (
          <>
            <AdminGrowthTableSection
              title="Team Leader"
              helper="Active Team Leaders only. Revenue uses mapped team sales from May 1, 2026 onward."
              rows={teamLeaderRows}
              revenueLabel="Team Revenue"
            />

            <AdminGrowthTableSection
              title="Sales / Retention"
              helper="Active Sales Agents and Retention Agents only. Revenue uses lifetime delivered sales."
              rows={salesRetentionRows}
              revenueLabel="Delivered Sales"
            />
          </>
        ) : !supportedRole ? (
          <Paper
            elevation={0}
            sx={{
              mt: 2,
              p: 3,
              borderRadius: 4,
              border: `1px solid ${BRAND.border}`,
              boxShadow: BRAND.shadow,
            }}
          >
            <Typography sx={{ color: BRAND.text, fontWeight: 700, fontSize: 18 }}>
              Growth plan is not configured for your current role yet.
            </Typography>
            <Typography sx={{ mt: 1, color: BRAND.subtext }}>
              Supported roles on this page: Sales Agent, Retention Agent, and Team Leader.
            </Typography>
          </Paper>
        ) : (
          <>
            <Box
              sx={{
                mt: 2,
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  xl: trackConfig.key === "teamLeader"
                    ? "repeat(5, minmax(0, 1fr))"
                    : "repeat(4, minmax(0, 1fr))",
                },
                gap: 2,
              }}
            >
              <SummaryCard
                icon={<CurrencyRupeeIcon fontSize="small" />}
                label="Current Salary"
                value={formatCurrency(liveCurrentSalary)}
                helper={
                  employee?.joiningSalary !== null && employee?.joiningSalary !== undefined
                    ? `Joining salary: ${formatCurrency(employee.joiningSalary)}`
                    : "This is the salary saved in your employee profile."
                }
                accentColor={BRAND.success}
                iconBackground={BRAND.successSoft}
              />

              <SummaryCard
                icon={<TrendingUpIcon fontSize="small" />}
                label={trackConfig.revenueLabel}
                value={formatCurrency(revenueRupees)}
                helper={
                  trackConfig.key === "teamLeader"
                    ? `Counts revenue from ${TEAM_LEADER_RESET.label} onward`
                    : "Lifetime delivered revenue counted for slab movement"
                }
                accentColor={BRAND.primary}
                iconBackground={BRAND.primarySoft}
              />

              {trackConfig.key === "teamLeader" ? (
                <SummaryCard
                  icon={<Groups2Icon fontSize="small" />}
                  label="Team Members"
                  value={String(tlMemberCount)}
                  helper="Currently mapped members in your team"
                  accentColor={BRAND.accent}
                  iconBackground={BRAND.accentSoft}
                />
              ) : null}

              <SummaryCard
                icon={<TimelineIcon fontSize="small" />}
                label="Current Slab"
                value={currentRow ? formatSlabLabel(currentRow) : "Not unlocked yet"}
                helper={
                  currentRow
                    ? trackConfig.key === "agent"
                      ? isSalaryAheadOfSlab
                        ? `Earned slab salary: ${formatCurrency(earnedSlabSalary)} · current salary is ahead by ${formatCurrency(salaryCatchupGap)}`
                        : `Earned slab salary: ${formatCurrency(earnedSlabSalary)}`
                      : `Projected slab salary: ${formatCurrency(currentRow.slabSalary)}`
                    : `First unlock starts at ${formatSlabLabel(tableRows[0])}`
                }
                accentColor={BRAND.orange}
                iconBackground={BRAND.orangeSoft}
              />

              <SummaryCard
                icon={<KeyboardArrowRightIcon fontSize="small" />}
                label={isSalaryAheadOfSlab ? "Next Hike At" : "Next Slab"}
                value={
                  displayNextRow
                    ? formatSlabLabel(displayNextRow)
                    : isSalaryAheadOfSlab
                    ? "Await ladder update"
                    : "Top slab reached"
                }
                helper={
                  displayNextRow
                    ? isSalaryAheadOfSlab
                      ? `${formatLakhs(salesRequired)} more needed before hikes resume above ${formatCurrency(liveCurrentSalary)}`
                      : `${formatLakhs(salesRequired)} more needed to jump`
                    : isSalaryAheadOfSlab
                    ? "Your current salary is already above the highest slab salary in this ladder."
                    : "You have already unlocked the highest available slab."
                }
                accentColor={BRAND.violet}
                iconBackground={BRAND.violetSoft}
              />
            </Box>

            {trackConfig.key === "agent" ? (
              <Paper
                elevation={0}
                sx={{
                  mt: 2,
                  p: 2.25,
                  borderRadius: 4,
                  border: `1px solid ${BRAND.border}`,
                  boxShadow: BRAND.shadow,
                }}
              >
                <Typography sx={{ color: BRAND.text, fontWeight: 800, fontSize: 18 }}>
                  Pace Tracker
                </Typography>
                {!paceMetrics.hasEnoughData ? (
                  <Typography sx={{ mt: 1, color: BRAND.subtext }}>
                    Not enough data yet
                  </Typography>
                ) : (
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    sx={{ mt: 1.5 }}
                  >
                    <PaceItem
                      label="Avg monthly delivery"
                      value={formatLakhs(paceMetrics.avgMonthlyLakhs)}
                      helper="Based on lifetime sales divided by tenure months"
                    />
                    <PaceItem
                      label="Last 90 day avg"
                      value={formatLakhsOrDash(paceMetrics.lastNinetyDaysAvgLakhs)}
                      helper="Estimated from delivered sales across the trailing 90 days"
                    />
                    <PaceItem
                      label={isSalaryAheadOfSlab ? "Months to next hike" : "Months to next slab"}
                      value={formatMonthsEstimate(paceMetrics.monthsToNextSlab)}
                      helper={
                        displayNextRow
                          ? `Towards ${formatSlabLabel(displayNextRow)} using your last 90 day average`
                          : "No next slab pending"
                      }
                    />
                    <PaceItem
                      label={`Months to promotion to ${getMilestoneDisplayLabel(nextMilestone)}`}
                      value={
                        nextMilestone
                          ? formatMonthsEstimate(paceMetrics.monthsToPromotion)
                          : "Milestone reached"
                      }
                      helper={
                        nextMilestone
                          ? `Estimated towards the ${getMilestoneDisplayLabel(nextMilestone)} milestone using your current average delivery pace`
                          : "You have already crossed the promotion milestones defined in this ladder"
                      }
                    />
                  </Stack>
                )}
              </Paper>
            ) : null}

            <Paper
              elevation={0}
              sx={{
                mt: 2,
                p: { xs: 2, md: 2.5 },
                borderRadius: 4,
                border: `1px solid ${BRAND.border}`,
                boxShadow: BRAND.shadow,
                bgcolor: "#f8fbff",
              }}
            >
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", md: "center" }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ color: BRAND.text, fontWeight: 800, fontSize: 20 }}>
                    {isSalaryAheadOfSlab ? "Progress to next hike" : "Progress to next slab"}
                  </Typography>
                  <Typography sx={{ mt: 0.6, color: BRAND.subtext, fontSize: 14 }}>
                    {displayNextRow
                      ? isSalaryAheadOfSlab
                        ? `Your salary is ahead of ${currentRow ? formatSlabLabel(currentRow) : "your earned slab"}. Hikes resume at ${formatSlabLabel(displayNextRow)}.`
                        : `You are currently between ${progressStartThreshold} L and ${progressTargetThreshold} L.`
                      : isSalaryAheadOfSlab
                      ? "Your current salary is already above the highest salary defined in this ladder."
                      : "You are already at the top of the current slab structure."}
                  </Typography>
                </Box>

                {displayNextRow ? (
                  <Chip
                    label={`${
                      isSalaryAheadOfSlab ? "Next Hike" : "Next Slab"
                    }: ${formatSlabLabel(displayNextRow)} · ${formatCurrency(
                      displayNextRow.slabSalary
                    )}`}
                    sx={{
                      borderRadius: 999,
                      bgcolor: BRAND.violetSoft,
                      color: BRAND.violet,
                      fontWeight: 700,
                      border: "1px solid #ddd6fe",
                    }}
                  />
                ) : null}
              </Stack>

              {trackConfig.key === "teamLeader" && salesLakhs === 0 ? (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    borderRadius: 3,
                    border: `1px dashed ${BRAND.borderStrong}`,
                    bgcolor: "#ffffff",
                  }}
                >
                  <Typography sx={{ color: BRAND.text, fontWeight: 700, fontSize: 16 }}>
                    Your team's revenue will appear here once mapped members begin delivering sales from May 1, 2026 onward.
                  </Typography>
                  <Typography sx={{ mt: 0.7, color: BRAND.subtext, fontSize: 13 }}>
                    Current TL progress is shown as 0 L until qualifying team revenue starts flowing in this reset cycle.
                  </Typography>

                  <Box sx={{ mt: 2 }}>
                    <Typography sx={{ color: BRAND.text, fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.4 }}>
                      Mapped team members
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 1.2 }}>
                      {resolvedTeamMembers.length ? (
                        resolvedTeamMembers.map((member) => (
                          <Stack
                            key={getEntityId(member) || member?.fullName}
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{
                              px: 1.5,
                              py: 1.1,
                              borderRadius: 2.5,
                              bgcolor: BRAND.card,
                              border: `1px solid ${BRAND.border}`,
                            }}
                          >
                            <Typography sx={{ color: BRAND.text, fontWeight: 600 }}>
                              {member?.fullName || member?.email || "Unnamed member"}
                            </Typography>
                            <Typography sx={{ color: BRAND.subtext, fontSize: 13 }}>
                              {getTeamMemberMonthlyLabel(member)}
                            </Typography>
                          </Stack>
                        ))
                      ) : (
                        <Typography sx={{ color: BRAND.subtext, fontSize: 13 }}>
                          No mapped team members yet.
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                </Box>
              ) : (
                <>
                  {isSalaryAheadOfSlab ? (
                    <Box
                      sx={{
                        mt: 2,
                        p: 1.5,
                        borderRadius: 3,
                        border: `1px solid #fde68a`,
                        bgcolor: BRAND.warningSoft,
                      }}
                    >
                      <Typography sx={{ color: BRAND.text, fontWeight: 700, fontSize: 14 }}>
                        Your current salary is ahead of your earned slab salary by {formatCurrency(salaryCatchupGap)}.
                      </Typography>
                      <Typography sx={{ mt: 0.5, color: BRAND.subtext, fontSize: 13.5, lineHeight: 1.6 }}>
                        Upcoming slab crossings may correct the ladder without a salary change. Your next actual hike will happen once you reach {displayNextRow ? formatSlabLabel(displayNextRow) : "a higher slab defined in the ladder"}.
                      </Typography>
                    </Box>
                  ) : null}

                  <Box sx={{ mt: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={progressPercent}
                      sx={{
                        height: 12,
                        borderRadius: 999,
                        backgroundColor: "#dbeafe",
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 999,
                          backgroundColor: BRAND.primary,
                        },
                      }}
                    />
                  </Box>

                  <Box
                    sx={{
                      mt: 1.3,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    <Typography sx={{ color: BRAND.subtext, fontSize: 13 }}>
                      Current: <b style={{ color: BRAND.text }}>{formatLakhs(salesLakhs)}</b>
                    </Typography>
                    <Typography sx={{ color: BRAND.subtext, fontSize: 13 }}>
                      {displayNextRow
                        ? isSalaryAheadOfSlab
                          ? `Required for next hike: ${formatLakhs(salesRequired)}`
                          : `Required to jump: ${formatLakhs(salesRequired)}`
                        : "No further slab pending"}
                    </Typography>
                  </Box>
                </>
              )}

            </Paper>

            <Paper
              elevation={0}
              sx={{
                mt: 2,
                p: 2.25,
                borderRadius: 4,
                border: `1px solid ${BRAND.border}`,
                boxShadow: BRAND.shadow,
              }}
            >
              <Typography sx={{ color: BRAND.text, fontWeight: 800, fontSize: 18 }}>
                My Hike History
              </Typography>
              <Typography sx={{ mt: 0.5, color: BRAND.subtext, fontSize: 13.5 }}>
                Inferred from slabs crossed so far. These dates are estimated and will be replaceable with exact records later.
              </Typography>

              {!hikeHistory.length ? (
                <Typography sx={{ mt: 1.5, color: BRAND.subtext }}>
                  {trackConfig.key === "agent"
                    ? "No hikes recorded yet. Your first hike will appear here once you cross the 5L slab."
                    : "No hikes recorded yet. Your first hike will appear here once you cross the 25L slab."}
                </Typography>
              ) : (
                <Box sx={{ mt: 2, pl: 1 }}>
                  {hikeHistory.map((entry, index) => (
                    <Stack
                      key={`${entry.threshold}-${index}`}
                      direction="row"
                      spacing={1.5}
                      sx={{ position: "relative", pb: index === hikeHistory.length - 1 ? 0 : 2.5 }}
                    >
                      <Box sx={{ position: "relative", pt: 0.55 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            bgcolor: BRAND.primary,
                            border: "3px solid #dbeafe",
                            position: "relative",
                            zIndex: 1,
                          }}
                        />
                        {index !== hikeHistory.length - 1 ? (
                          <Box
                            sx={{
                              position: "absolute",
                              left: "50%",
                              top: 12,
                              width: 2,
                              height: "calc(100% + 18px)",
                              transform: "translateX(-50%)",
                              bgcolor: "#dbeafe",
                            }}
                          />
                        ) : null}
                      </Box>

                      <Box
                        sx={{
                          flex: 1,
                          p: 1.5,
                          borderRadius: 3,
                          bgcolor: "#fbfdff",
                          border: `1px solid ${BRAND.border}`,
                        }}
                      >
                        <Stack
                          direction={{ xs: "column", md: "row" }}
                          justifyContent="space-between"
                          alignItems={{ xs: "flex-start", md: "center" }}
                          spacing={1}
                        >
                          <Box>
                            <Typography sx={{ color: BRAND.text, fontWeight: 700 }}>
                              {entry.monthLabel}
                            </Typography>
                            <Typography sx={{ mt: 0.35, color: BRAND.subtext, fontSize: 13.5 }}>
                              Slab crossed: {formatSlabLabel(entry)}
                            </Typography>
                          </Box>

                          <Chip
                            size="small"
                            label="Estimated"
                            sx={{
                              borderRadius: 999,
                              bgcolor: BRAND.primarySoft,
                              color: BRAND.primary,
                              fontWeight: 700,
                              border: "1px solid #bfdbfe",
                            }}
                          />
                        </Stack>

                        <Stack
                          direction={{ xs: "column", md: "row" }}
                          spacing={2}
                          sx={{ mt: 1.2 }}
                        >
                          <Typography sx={{ color: BRAND.text, fontWeight: 700 }}>
                            Hike: {formatCurrency(entry.hike)}
                          </Typography>
                          <Typography sx={{ color: BRAND.text, fontWeight: 700 }}>
                            New salary: {formatCurrency(entry.salary)}
                          </Typography>
                        </Stack>

                        {entry.note ? (
                          <Typography sx={{ mt: 0.8, color: BRAND.warningDeep, fontSize: 13 }}>
                            {entry.note}
                          </Typography>
                        ) : null}
                      </Box>
                    </Stack>
                  ))}
                </Box>
              )}
            </Paper>

            <Paper
              elevation={0}
              sx={{
                mt: 2,
                borderRadius: 4,
                border: `1px solid ${BRAND.border}`,
                boxShadow: BRAND.shadow,
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  px: { xs: 2, md: 2.5 },
                  py: 2,
                  borderBottom: `1px solid ${BRAND.border}`,
                  bgcolor: "#fff",
                }}
              >
                <Typography sx={{ color: BRAND.text, fontWeight: 800, fontSize: 20 }}>
                  Slab progression
                </Typography>
                <Typography sx={{ mt: 0.5, color: BRAND.subtext, fontSize: 14 }}>
                  Summary first, full progression below. Highlighted row shows your current slab.
                </Typography>
                {trackConfig.key === "teamLeader" ? (
                  <Stack direction="row" spacing={0.8} alignItems="flex-start" sx={{ mt: 1.25 }}>
                    <InfoOutlinedIcon sx={{ fontSize: 16, color: BRAND.subtext, mt: "2px" }} />
                    <Typography sx={{ color: BRAND.subtext, fontSize: 12.5 }}>
                      Slab salary projections in this view use your current salary base of {formatCurrency(liveCurrentSalary)}.
                      {employee?.joiningSalary !== null && employee?.joiningSalary !== undefined
                        ? ` Joining salary ${formatCurrency(employee.joiningSalary)} is kept as reference.`
                        : ""}
                    </Typography>
                  </Stack>
                ) : null}
              </Box>

              <TableContainer
                sx={{
                  overflowX: "auto",
                  overflowY: "auto",
                  maxHeight: 560,
                  bgcolor: "#fff",
                }}
              >
                <Table stickyHeader sx={{ minWidth: 700 }}>
                  <TableHead>
                    <TableRow>
                      {["Slab", "Salary Hike", "Slab Salary"].map((label) => (
                        <TableCell
                          key={label}
                          sx={{
                            py: 1.5,
                            px: 2,
                            bgcolor: "#f8fafc",
                            borderBottom: `1px solid ${BRAND.border}`,
                            color: BRAND.text,
                            fontSize: 12.5,
                            fontWeight: 800,
                            whiteSpace: "nowrap",
                            position: "sticky",
                            top: 0,
                            zIndex: 2,
                          }}
                        >
                          {label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {tableRows.map((row, index) => {
                      const isCurrent = index === currentStepIndex;
                      const isUnlocked = salesLakhs >= row.threshold;
                      const isMilestone = Boolean(row.note);
                      const isCatchupStep =
                        Boolean(isSalaryAheadOfSlab && displayNextRow && row.slabNumber === displayNextRow.slabNumber);
                      const isCorrectionOnly =
                        Boolean(
                          isSalaryAheadOfSlab &&
                            displayNextRow &&
                            index > currentStepIndex &&
                            row.slabNumber < displayNextRow.slabNumber
                        );
                      const noteLabel = row.note || row.shortLabel || "";

                      return (
                        <TableRow
                          key={`${row.threshold}-${row.hike}`}
                          sx={{
                            bgcolor: isCurrent
                              ? "#eef6ff"
                              : isCatchupStep
                              ? "#f7f5ff"
                              : isMilestone
                              ? "#fffcf4"
                              : index % 2 === 0
                              ? "#ffffff"
                              : "#fcfdff",
                            "& td": {
                              borderBottom: "1px solid #eef2f7",
                            },
                            "& td:first-of-type": {
                              borderLeft: isMilestone
                                ? `4px solid ${BRAND.warningDeep}`
                                : isCurrent
                                ? "4px solid #93c5fd"
                                : isCatchupStep
                                ? `4px solid ${BRAND.violet}`
                                : "4px solid transparent",
                            },
                          }}
                        >
                          <TableCell sx={{ py: 1.5, px: 2, fontWeight: 700, color: BRAND.text }}>
                            <Stack spacing={0.85}>
                              <Typography sx={{ fontWeight: 800, color: BRAND.text }}>
                                {formatSlabLabel(row)}
                              </Typography>
                              {noteLabel ? (
                                <Typography sx={{ color: BRAND.accent, fontSize: 12.5, fontWeight: 700, lineHeight: 1.5 }}>
                                  {noteLabel}
                                </Typography>
                              ) : null}
                              {isCorrectionOnly ? (
                                <Typography sx={{ color: BRAND.subtext, fontSize: 12.5, lineHeight: 1.5 }}>
                                  Salary ladder correction only. No salary change at this slab.
                                </Typography>
                              ) : null}
                              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                {isCurrent ? (
                                  <Chip
                                    size="small"
                                    label="Current"
                                    sx={{
                                      height: 22,
                                      borderRadius: 999,
                                      bgcolor: BRAND.primarySoft,
                                      color: BRAND.primary,
                                      fontWeight: 700,
                                      border: "1px solid #bfdbfe",
                                    }}
                                  />
                                ) : null}
                                {!isCurrent && isCatchupStep ? (
                                  <Chip
                                    size="small"
                                    label="Hike resumes here"
                                    sx={{
                                      height: 22,
                                      borderRadius: 999,
                                      bgcolor: BRAND.violetSoft,
                                      color: BRAND.violet,
                                      fontWeight: 700,
                                      border: "1px solid #ddd6fe",
                                    }}
                                  />
                                ) : null}
                                {!isCurrent && !isCatchupStep && isCorrectionOnly ? (
                                  <Chip
                                    size="small"
                                    label="Correction only"
                                    sx={{
                                      height: 22,
                                      borderRadius: 999,
                                      bgcolor: "#f8fafc",
                                      color: BRAND.subtext,
                                      fontWeight: 700,
                                      border: `1px solid ${BRAND.border}`,
                                    }}
                                  />
                                ) : null}
                                {!isCurrent && isUnlocked ? (
                                  <Chip
                                    size="small"
                                    icon={<CheckCircleRoundedIcon sx={{ fontSize: 14 }} />}
                                    label="Unlocked"
                                    sx={{
                                      height: 22,
                                      borderRadius: 999,
                                      bgcolor: BRAND.successSoft,
                                      color: BRAND.success,
                                      fontWeight: 700,
                                      border: "1px solid #bbf7d0",
                                      "& .MuiChip-icon": {
                                        color: BRAND.success,
                                        ml: 0.6,
                                      },
                                    }}
                                  />
                                ) : null}
                              </Stack>
                            </Stack>
                          </TableCell>

                          <TableCell sx={{ py: 1.5, px: 2, color: BRAND.text, fontWeight: 700 }}>
                            {formatCurrency(row.hike)}
                          </TableCell>

                          <TableCell sx={{ py: 1.5, px: 2, color: BRAND.text, fontWeight: 800 }}>
                            {formatCurrency(row.slabSalary)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                mt: 2,
                p: 1.5,
                borderRadius: 4,
                border: `1px solid ${BRAND.border}`,
                boxShadow: BRAND.shadow,
                bgcolor: "#ffffff",
              }}
            >
              <Typography sx={{ color: BRAND.text, fontWeight: 700, fontSize: 14 }}>
                {nextMilestone
                  ? nextMilestone.note
                  : "Continue crossing each slab to keep progressing on the same ladder."}
              </Typography>

              <Button
                onClick={() => setShowPromotionInfo((current) => !current)}
                endIcon={
                  <ExpandMoreIcon
                    sx={{
                      transform: showPromotionInfo ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                    }}
                  />
                }
                sx={{
                  mt: 1,
                  p: 0,
                  minWidth: 0,
                  textTransform: "none",
                  fontWeight: 700,
                  color: BRAND.primary,
                  "&:hover": { bgcolor: "transparent" },
                }}
              >
                What happens if I don&apos;t get promoted?
              </Button>

              <Collapse in={showPromotionInfo}>
                <Typography sx={{ mt: 1, color: BRAND.subtext, fontSize: 13.5, lineHeight: 1.6 }}>
                  If you are not promoted after reaching this milestone, your salary increments continue on the same slab ladder. You will keep receiving hikes as you cross each new slab.
                </Typography>
              </Collapse>
            </Paper>
          </>
        )}
      </Box>

      <Dialog
        open={openProfileDialog}
        fullWidth
        maxWidth="xs"
        disableEscapeKeyDown
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Complete your growth profile</DialogTitle>
        <DialogContent sx={{ pt: "12px !important" }}>
          <Typography sx={{ color: BRAND.subtext, fontSize: 14, mb: 2 }}>
            We need your joining date, joining salary, and current salary to calculate your growth plan.
            Once you save them here, they will also be stored in your employee record.
          </Typography>

          <Stack spacing={2}>
            <TextField
              label="Joining Date"
              type="date"
              value={profileDraft.joiningDate}
              onChange={(event) =>
                setProfileDraft((current) => ({
                  ...current,
                  joiningDate: event.target.value,
                }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <TextField
              label="Joining Salary"
              type="number"
              value={profileDraft.joiningSalary}
              onChange={(event) =>
                setProfileDraft((current) => ({
                  ...current,
                  joiningSalary: event.target.value,
                }))
              }
              inputProps={{ min: 0 }}
              fullWidth
            />

            <TextField
              label="Current Salary"
              type="number"
              value={profileDraft.currentSalary}
              onChange={(event) =>
                setProfileDraft((current) => ({
                  ...current,
                  currentSalary: event.target.value,
                }))
              }
              inputProps={{ min: 0 }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            variant="contained"
            onClick={handleSaveProfile}
            disabled={savingProfile}
            startIcon={savingProfile ? null : <SaveOutlinedIcon />}
            sx={{
              textTransform: "none",
              borderRadius: 2.5,
              px: 2.5,
              bgcolor: "#111827",
              boxShadow: "none",
              "&:hover": { bgcolor: "#0b1220", boxShadow: "none" },
            }}
          >
            {savingProfile ? "Saving..." : "Save and continue"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
