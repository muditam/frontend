// src/components/OpsDashboard.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Skeleton,
  Tooltip,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import CurrencyExchangeRoundedIcon from "@mui/icons-material/CurrencyExchangeRounded";
import { alpha, useTheme } from "@mui/material/styles";
import axios from "axios";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// ==== Auth helper ====
const getLoggedIn = () => {
  const rawUser = sessionStorage.getItem("user");
  if (!rawUser) return { id: null, fullName: "", roles: [] };
  try {
    const parsed = JSON.parse(rawUser);
    const roles = []
      .concat(parsed?.role || [])
      .concat(parsed?.roles || [])
      .filter(Boolean)
      .map((r) => String(r).toLowerCase());
    return {
      id: parsed?._id || parsed?.id || null,
      fullName: parsed?.fullName || parsed?.name || "",
      roles,
    };
  } catch {
    return { id: null, fullName: "", roles: [] };
  }
};

// ==== Date helpers (IST-safe) ====
const formatIstTodayLabel = () =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    month: "short",
    day: "2-digit",
  }).format(new Date());

// keep exactly these options
const RANGE_OPTS = ["Custom range", "Today", "Yesterday", "Last 7 days", "Last 30 days"];

function startOfDayIST(date) {
  const d = new Date(date);
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 3600000);
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, "0");
  const day = String(ist.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(dateStr, delta) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + delta);
  return startOfDayIST(d);
}
function getPresetRange(preset) {
  const today = startOfDayIST(new Date());
  switch (preset) {
    case "Today":
      return { start: today, end: today };
    case "Yesterday": {
      const y = addDays(today, -1);
      return { start: y, end: y };
    }
    case "Last 7 days":
      return { start: addDays(today, -6), end: today };
    case "Last 30 days":
      return { start: addDays(today, -29), end: today };
    default:
      return { start: today, end: today };
  }
}

// ==== UI atom: improved MetricTile ====
function MetricTile({ title, value, help, icon: Icon, paletteKey = "info", loading = false }) {
  const theme = useTheme();
  const base = theme.palette[paletteKey] || theme.palette.info;
  const bg = alpha(base.main, 0.08);
  const ring = alpha(base.main, 0.25);

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        height: "100%",
        background: `linear-gradient(180deg, ${alpha(base.main, 0.08)} 0%, ${alpha(
          base.main,
          0.02
        )} 100%)`,
        border: `1px solid ${ring}`,
        transition: "transform 120ms ease, box-shadow 120ms ease",
        "&:hover": { transform: "translateY(-2px)", boxShadow: 3 },
      }}
    >
      <CardContent sx={{ py: 2.25 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              p: 1.25,
              borderRadius: 2,
              bgcolor: bg,
              border: `1px solid ${ring}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon sx={{ fontSize: 28, color: base.main }} />
          </Box>

          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ opacity: 0.85 }} noWrap>
              {title}
            </Typography>
            {loading ? (
              <Skeleton variant="text" width={80} height={36} />
            ) : (
              <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1 }}>
                {value}
              </Typography>
            )}
            {help ? (
              <Typography variant="caption" sx={{ opacity: 0.75 }}>
                {help}
              </Typography>
            ) : null}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ==== Main ====
export default function OpsDashboard() {
  const [{ id: myAgentId, roles }, setIdentity] = useState(getLoggedIn());
  const isManager = useMemo(() => roles.includes("manager"), [roles]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // range state
  const [range, setRange] = useState("Today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [metrics, setMetrics] = useState({
    today: {
      addLogCount: 0,
      confirmedCount: 0,
      cnpCount: 0,
      cancelCount: 0,
      codToPrepaidCount: 0, // NEW
    },
    scope: "all",
    start: "",
    end: "",
  });

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      let params = !isManager && myAgentId ? { agentId: myAgentId } : {};
      let rangeStart = "";
      let rangeEnd = "";

      if (range === "Custom range") {
        if (customStart && customEnd) {
          params = { ...params, range: "custom", start: customStart, end: customEnd };
          rangeStart = customStart;
          rangeEnd = customEnd;
        } else {
          setLoading(false);
          return;
        }
      } else {
        const { start, end } = getPresetRange(range);
        params = { ...params, range, start, end };
        rangeStart = start;
        rangeEnd = end;
      }

      const { data } = await api.get(`/api/ops-dashboard/metrics`, { params });

      setMetrics({
        today: {
          addLogCount: Number(data?.today?.addLogCount || 0),
          confirmedCount: Number(data?.today?.confirmedCount || 0),
          cnpCount: Number(data?.today?.cnpCount || 0),
          cancelCount: Number(data?.today?.cancelCount || 0),
          codToPrepaidCount: Number(data?.today?.codToPrepaidCount || data?.today?.codToPrepaid || 0), // maps if backend uses either key
        },
        scope: data?.scope || (isManager ? "all" : "agent"),
        start: rangeStart,
        end: rangeEnd,
      });
    } catch (e) {
      console.error("ops metrics error", e);
      setError("Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }, [isManager, myAgentId, range, customStart, customEnd]);

  // init + identity
  useEffect(() => setIdentity(getLoggedIn()), []);
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // re-fetch when custom dates change (only if "Custom range" selected AND both dates picked)
  useEffect(() => {
    if (range === "Custom range" && customStart && customEnd) {
      fetchMetrics();
    }
  }, [range, customStart, customEnd, fetchMetrics]);

  const showRangeBadge =
    range === "Custom range"
      ? `${metrics.start || "—"} → ${metrics.end || "—"}`
      : range;

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
      {/* Header */}
      <Paper
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          background: "linear-gradient(180deg, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0) 100%)",
        }}
        elevation={0}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={2}
        >
          <Stack spacing={0.75}>
            <Typography variant="h6" fontWeight={800}>
              Operations Dashboard
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={`Scope: ${isManager ? "All Agents" : "Me"}`}
              />
              <Chip size="small" variant="outlined" label={`Today (IST): ${formatIstTodayLabel()}`} />
              <Chip size="small" variant="outlined" label={`Range: ${showRangeBadge}`} />
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="range-label">Select Range</InputLabel>
              <Select
                labelId="range-label"
                label="Select Range"
                value={range}
                onChange={(e) => setRange(e.target.value)}
              >
                {RANGE_OPTS.map((r) => (
                  <MenuItem key={r} value={r}>
                    {r}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {range === "Custom range" && (
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  type="date"
                  label="Start"
                  InputLabelProps={{ shrink: true }}
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
                <TextField
                  size="small"
                  type="date"
                  label="End"
                  InputLabelProps={{ shrink: true }}
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </Stack>
            )}
          </Stack>
        </Stack>

        {error ? (
          <Typography variant="caption" color="error" sx={{ mt: 1, display: "inline-block" }}>
            {error}
          </Typography>
        ) : null}
      </Paper>

      {/* Metric tiles */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Tooltip title="Unique orders logged in selected range">
            <Box>
              <MetricTile
                title="Add Log"
                value={metrics.today.addLogCount}
                help=""
                icon={EditNoteRoundedIcon}
                paletteKey="info"
                loading={loading}
              />
            </Box>
          </Tooltip>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Tooltip title="Orders marked Confirmed">
            <Box>
              <MetricTile
                title="Confirmed"
                value={metrics.today.confirmedCount}
                icon={CheckCircleRoundedIcon}
                paletteKey="success"
                loading={loading}
              />
            </Box>
          </Tooltip>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Tooltip title="Could Not Place (CNP)">
          <Box>
            <MetricTile
              title="CNP"
              value={metrics.today.cnpCount}
              icon={BlockRoundedIcon}
              paletteKey="warning"
              loading={loading}
            />
          </Box>
          </Tooltip>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Tooltip title="Cancelled Orders">
            <Box>
              <MetricTile
                title="Cancel"
                value={metrics.today.cancelCount}
                icon={CancelRoundedIcon}
                paletteKey="error"
                loading={loading}
              />
            </Box>
          </Tooltip>
        </Grid>

        {/* NEW: COD → Prepaid */}
        <Grid item xs={12} sm={6} md={3}>
          <Tooltip title="Orders successfully converted from COD to Prepaid">
            <Box>
              <MetricTile
                title="COD → Prepaid"
                value={metrics.today.codToPrepaidCount}
                icon={CurrencyExchangeRoundedIcon}
                paletteKey="secondary"
                loading={loading}
              />
            </Box>
          </Tooltip>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3, opacity: 0.5 }} />
    </Box>
  );
}
