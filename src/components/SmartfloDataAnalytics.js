// pages/SmartfloDataAnalytics.jsx  (UPDATED - fancier UI, clearer visuals)
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  TextField,
  Button,
  MenuItem,
  Typography,
  Grid,
  Stack,
  Divider,
  Chip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import dayjs from "dayjs";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Label,
} from "recharts";

const fmtApi = (d) => dayjs(d).format("YYYY-MM-DD HH:mm:ss");
const fmtLocal = (d) => dayjs(d).format("YYYY-MM-DDTHH:mm");

const defaultRange = () => {
  const end = dayjs().endOf("day");
  const start = end.subtract(7, "day").startOf("day");
  return { start, end };
};

const DIRECTIONS = [
  { label: "All", value: "" },
  { label: "Inbound", value: "inbound" },
  { label: "Outbound", value: "outbound" },
];

const CALL_TYPES = [
  { label: "All", value: "" },
  { label: "Answered", value: "c" },
  { label: "Missed", value: "m" },
];

// Colors & gradients
const PALETTE = {
  primary: "#1e88e5", // blue
  success: "#2e7d32", // green darker for contrast
  warning: "#fb8c00", // orange
  error: "#e53935",   // red
  inbound: "#6d28d9", // purple
  outbound: "#00897b",// teal
  neutral: "#90a4ae",
};

function Stat({ label, value, sub, color = "inherit" }) {
  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 3,
        boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
        background:
          "linear-gradient(180deg, rgba(250,250,251,1) 0%, rgba(255,255,255,1) 100%)",
      }}
    >
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={800} color={color}>
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.secondary">
          {sub}
        </Typography>
      )}
    </Paper>
  );
}

const quickRanges = [
  { label: "Today", range: () => ({ start: dayjs().startOf("day"), end: dayjs().endOf("day") }) },
  {
    label: "Last 7 Days",
    range: () => ({ start: dayjs().subtract(7, "day").startOf("day"), end: dayjs().endOf("day") }),
  },
  {
    label: "Last 30 Days",
    range: () => ({
      start: dayjs().subtract(30, "day").startOf("day"),
      end: dayjs().endOf("day"),
    }),
  },
];

const fnum = (n) => (n != null ? n.toLocaleString() : "-");
const pct = (num, den) => (den ? Math.round((num / den) * 100) : 0);
const toHMSS = (sec) => {
  const s = Math.max(0, Number(sec || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
};

export default function SmartfloDataAnalytics() {
  const { start, end } = useMemo(defaultRange, []);
  const [fromDate, setFromDate] = useState(fmtLocal(start));
  const [toDate, setToDate] = useState(fmtLocal(end));
  const [direction, setDirection] = useState("");
  const [callType, setCallType] = useState("");
  const [loading, setLoading] = useState(false);

  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [byHour, setByHour] = useState([]);
  const [topAgents, setTopAgents] = useState([]);

  // Derived datasets for charts
  const directionSplit = useMemo(() => {
    if (!summary) return [];
    return [
      { name: "Inbound", value: summary.inbound || 0, color: PALETTE.inbound },
      { name: "Outbound", value: summary.outbound || 0, color: PALETTE.outbound },
    ];
  }, [summary]);

  const statusSplit = useMemo(() => {
    if (!summary) return [];
    return [
      { name: "Answered", value: summary.answered || 0, color: PALETTE.primary },
      { name: "Missed", value: summary.missed || 0, color: PALETTE.error },
    ];
  }, [summary]);

  const dailyAnsweredMissed = useMemo(
    () =>
      daily.map((d) => ({
        date: d.date,
        Answered: d.answered,
        Missed: d.missed,
      })),
    [daily]
  );

  const byHourDecorated = useMemo(
    () =>
      byHour.map((h) => ({
        ...h,
        label: `${h.hour}:00`,
      })),
    [byHour]
  );

  const agentsWithMissed = useMemo(
    () =>
      topAgents.map((a) => ({
        ...a,
        name: a.agent,
        missed: Math.max(0, (a.total || 0) - (a.answered || 0)),
      })),
    [topAgents]
  );

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = {
        from_date: fmtApi(dayjs(fromDate)),
        to_date: fmtApi(dayjs(toDate)),
        per_page: 200,
        max_pages: 25,
      };
      if (direction) params.direction = direction;
      if (callType) params.call_type = callType;

      const { data } = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/smartflo/analytics",
        { params }
      );
      setSummary(data.summary);
      setDaily(data.daily);
      setByHour(data.byHour);
      setTopAgents(data.topAgents);
    } catch (e) {
      console.error(e);
      alert("Failed to load analytics. Check server logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyQuickRange = (makeRange) => {
    const { start, end } = makeRange();
    setFromDate(fmtLocal(start));
    setToDate(fmtLocal(end));
  };

  const answeredRate = summary ? pct(summary.answered, summary.total) : 0;
  const missedRate = summary ? pct(summary.missed, summary.total) : 0;

  return (
    <Box p={2}>
      <Typography variant="h6" mb={2} fontWeight={800}>
        Smartflo — Data Analytics
      </Typography>

      {/* Filters */}
      <Paper
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 3,
          boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems="center"
          flexWrap="wrap"
        >
          <TextField
            label="From"
            type="datetime-local"
            size="small"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="To"
            type="datetime-local"
            size="small"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            select
            size="small"
            label="Direction"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            {DIRECTIONS.map((d) => (
              <MenuItem key={d.value} value={d.value}>
                {d.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Call Type"
            value={callType}
            onChange={(e) => setCallType(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            {CALL_TYPES.map((ct) => (
              <MenuItem key={ct.value} value={ct.value}>
                {ct.label}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            onClick={fetchAnalytics}
            startIcon={<RefreshIcon />}
            disabled={loading}
            sx={{ minWidth: 140 }}
          >
            {loading ? "Loading..." : "Refresh"}
          </Button>

          <Stack direction="row" spacing={1} sx={{ ml: { md: "auto" } }}>
            {quickRanges.map((r) => (
              <Chip
                key={r.label}
                label={r.label}
                onClick={() => applyQuickRange(r.range)}
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            ))}
          </Stack>
        </Stack>
      </Paper>

      {/* Summary */}
      <Grid container spacing={2} mb={2}>
        <Grid item xs={6} md={2.4}>
          <Stat label="Total Calls" value={fnum(summary?.total)} color={PALETTE.neutral} />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <Stat label="Inbound" value={fnum(summary?.inbound)} color={PALETTE.inbound} />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <Stat label="Outbound" value={fnum(summary?.outbound)} color={PALETTE.outbound} />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <Stat
            label="Answered"
            value={`${fnum(summary?.answered)} (${answeredRate}%)`}
            color={PALETTE.primary}
          />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <Stat
            label="Missed"
            value={`${fnum(summary?.missed)} (${missedRate}%)`}
            color={PALETTE.error}
          />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <Stat
            label="Avg Duration"
            value={summary?.avgDuration ? toHMSS(summary.avgDuration) : "-"}
            sub="Per call"
            color={PALETTE.success}
          />
        </Grid>
      </Grid>

      {/* Direction & Status split (donuts) */}
      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, borderRadius: 3, height: 360 }}>
            <Typography fontWeight={700} mb={1}>
              Direction Split
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="gradInbound" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={PALETTE.inbound} stopOpacity={1} />
                      <stop offset="100%" stopColor="#a78bfa" stopOpacity={1} />
                    </linearGradient>
                    <linearGradient id="gradOutbound" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={PALETTE.outbound} stopOpacity={1} />
                      <stop offset="100%" stopColor="#80cbc4" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={directionSplit}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                  >
                    {directionSplit.map((entry, index) => (
                      <Cell
                        key={`d-${index}`}
                        fill={index === 0 ? "url(#gradInbound)" : "url(#gradOutbound)"}
                      />
                    ))}
                    <Label
                      value={`${fnum(summary?.total || 0)}\nTotal`}
                      position="center"
                      style={{ textAnchor: "middle", fontWeight: 700, whiteSpace: "pre-line" }}
                    />
                  </Pie>
                  <Tooltip formatter={(v) => fnum(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, borderRadius: 3, height: 360 }}>
            <Typography fontWeight={700} mb={1}>
              Answered vs Missed
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="gradAnswered" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={PALETTE.primary} stopOpacity={1} />
                      <stop offset="100%" stopColor="#90caf9" stopOpacity={1} />
                    </linearGradient>
                    <linearGradient id="gradMissed" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={PALETTE.error} stopOpacity={1} />
                      <stop offset="100%" stopColor="#ef9a9a" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={statusSplit}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                  >
                    {statusSplit.map((entry, index) => (
                      <Cell
                        key={`s-${index}`}
                        fill={index === 0 ? "url(#gradAnswered)" : "url(#gradMissed)"}
                      />
                    ))}
                    <Label
                      value={`${answeredRate}%\nAnswered`}
                      position="center"
                      style={{ textAnchor: "middle", fontWeight: 700, whiteSpace: "pre-line" }}
                    />
                  </Pie>
                  <Tooltip formatter={(v) => fnum(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }}>
        <Chip label="Daily Answered vs Missed" />
      </Divider>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Box sx={{ height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyAnsweredMissed}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Answered" stackId="a" fill={PALETTE.primary} />
              <Bar dataKey="Missed" stackId="a" fill={PALETTE.error} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      <Divider sx={{ my: 2 }}>
        <Chip label="Hourly Call Volume" />
      </Divider>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Box sx={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byHourDecorated}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill={PALETTE.warning}>
                {byHourDecorated.map((entry, idx) => (
                  <Cell
                    key={`h-${idx}`}
                    fill={entry.count === Math.max(...byHourDecorated.map((x) => x.count))
                      ? "#ff7043"
                      : PALETTE.warning}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      <Divider sx={{ my: 2 }}>
        <Chip label="Top Agents — Answered vs Missed" />
      </Divider>

      <Paper sx={{ p: 2, borderRadius: 3 }}>
        <Box sx={{ height: 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={agentsWithMissed}
              margin={{ left: 20, right: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="answered" name="Answered" fill={PALETTE.primary} />
              <Bar dataKey="missed" name="Missed" fill={PALETTE.error} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      <Typography variant="caption" color="text.secondary" display="block" mt={2}>
        Tip: Use the quick range chips for faster exploration. Hover over bars and pie slices to
        see exact values.
      </Typography>
    </Box>
  );
}
 