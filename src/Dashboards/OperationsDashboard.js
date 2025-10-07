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
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import axios from "axios";

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";

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

const formatIstTodayLabel = () =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    month: "short",
    day: "2-digit",
  }).format(new Date());

// ---- range helpers ----
const RANGE_OPTS = [
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

function startOfDayIST(date) {
  // Convert 'date' (local) to IST 00:00 and return YYYY-MM-DD
  const d = new Date(date);
  // get IST components by shifting to IST
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
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
    case "Last 90 days":
      return { start: addDays(today, -89), end: today };
    case "Last 365 days":
      return { start: addDays(today, -364), end: today };
    case "Week to date": {
      // IST week starts Monday (ISO). Find Monday of this week.
      const d = new Date(today);
      const day = d.getDay() === 0 ? 7 : d.getDay(); // Mon=1..Sun=7
      const monday = addDays(today, -(day - 1));
      return { start: monday, end: today };
    }
    case "Month to date": {
      const d = new Date(today);
      const first = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      return { start: first, end: today };
    }
    case "Year to date": {
      const d = new Date(today);
      const first = `${d.getFullYear()}-01-01`;
      return { start: first, end: today };
    }
    case "Last month": {
      const d = new Date(today);
      const m = d.getMonth(); // 0..11
      const y = d.getFullYear();
      const first = new Date(y, m - 1, 1);
      const last = new Date(y, m, 0); // day 0 of current month = last day prev month
      return { start: startOfDayIST(first), end: startOfDayIST(last) };
    }
    case "Last 12 months": {
      const d = new Date(today);
      const start = new Date(d.getFullYear(), d.getMonth() - 11, 1);
      return { start: startOfDayIST(start), end: today };
    }
    case "Last year": {
      const d = new Date(today);
      const ly = d.getFullYear() - 1;
      return { start: `${ly}-01-01`, end: `${ly}-12-31` };
    }
    case "Quarter to date": {
      const d = new Date(today);
      const m = d.getMonth(); // 0..11
      const qStartMonth = Math.floor(m / 3) * 3;
      const first = new Date(d.getFullYear(), qStartMonth, 1);
      return { start: startOfDayIST(first), end: today };
    }
    default:
      return { start: today, end: today };
  }
}

// ------- UI atom -------
function MetricTile({ title, value, help, icon, tint, loading }) {
  const Icon = icon;
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        height: "100%",
        bgcolor: `${tint}.50`,
        border: "1px solid",
        borderColor: `${tint}.200`,
        transition: "transform 120ms ease, box-shadow 120ms ease",
        "&:hover": { transform: "translateY(-2px)", boxShadow: 2 },
      }}
    >
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: `${tint}.100`,
              border: "1px solid",
              borderColor: `${tint}.200`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon sx={{ fontSize: 28, color: `${tint}.700` }} />
          </Box>

          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ opacity: 0.7 }} noWrap>
              {title}
            </Typography>
            {loading ? (
              <Skeleton variant="text" width={72} height={36} />
            ) : (
              <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1 }}>
                {value}
              </Typography>
            )}
            {help ? (
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                {help}
              </Typography>
            ) : null}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ------- main -------
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
    today: { addLogCount: 0, confirmedCount: 0, cnpCount: 0, cancelCount: 0 },
    scope: "all",
  });

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      let params = !isManager && myAgentId ? { agentId: myAgentId } : {};
      if (range === "Custom range") {
        if (customStart && customEnd) {
          params = { ...params, range: "custom", start: customStart, end: customEnd };
        } else {
          // wait until both dates are picked
          setLoading(false);
          return;
        }
      } else {
        const { start, end } = getPresetRange(range);
        params = { ...params, range, start, end };
      }

      const { data } = await axios.get(`${API_BASE}/api/ops-dashboard/metrics`, { params });
      setMetrics({
        today: {
          addLogCount: Number(data?.today?.addLogCount || 0),
          confirmedCount: Number(data?.today?.confirmedCount || 0),
          cnpCount: Number(data?.today?.cnpCount || 0),
          cancelCount: Number(data?.today?.cancelCount || 0),
        },
        scope: data?.scope || (isManager ? "all" : "agent"),
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

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
      {/* Header bar with “Select Range” like screenshot */}
      <Paper
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          background: "linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0) 100%)",
        }}
        elevation={0}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Stack spacing={0.5}>
            <Typography variant="h6" fontWeight={800}>
              Operations Dashboard
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip size="small" color="primary" variant="outlined" label={`Scope: ${isManager ? "All Agents" : "Me"}`} />
              <Chip size="small" variant="outlined" label={`Today (IST): ${formatIstTodayLabel()}`} />
              {range !== "Custom range" ? (
                <Chip size="small" variant="outlined" label={`Range: ${range}`} />
              ) : null}
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

      {/* Metric tiles, screenshot-like spacing */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricTile
            title="Add Log"
            value={metrics.today.addLogCount}
            help="Unique orders logged in range"
            icon={EditNoteRoundedIcon}
            tint="grey"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricTile
            title="Confirmed"
            value={metrics.today.confirmedCount}
            icon={CheckCircleRoundedIcon}
            tint="teal"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricTile
            title="CNP"
            value={metrics.today.cnpCount}
            icon={BlockRoundedIcon}
            tint="amber"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricTile
            title="Cancel"
            value={metrics.today.cancelCount}
            icon={CancelRoundedIcon}
            tint="red"
            loading={loading}
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 3, opacity: 0.5 }} /> 
    </Box>
  );
}
