import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CardContent,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Skeleton,
  Tooltip as MuiTooltip,
    ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  FunnelChart,
  Funnel,
  LabelList,
  Tooltip as ReTooltip,
} from "recharts";
import axios from "axios";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import GroupIcon from "@mui/icons-material/Group";
import CustomerCohortHeatmap from "./CustomerCohortHeatmap";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

const formatCurrency = (val) => `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
const formatPct = (val) => `${(val || 0).toFixed(1)}%`;

const DataCell = ({ count, countPct, amount, amountPct, type }) => {
  const isError = type === "error";

  const themeColor = isError ? "#D32F2F" : "#1B7F5A";
  const bgColor = isError ? "rgba(211,47,47,0.06)" : "rgba(27,127,90,0.08)";
  const borderColor = isError ? "rgba(211,47,47,0.22)" : "rgba(27,127,90,0.22)";

  return (
    <Stack spacing={0.8} alignItems="center" sx={{ py: 1.8 }}>
      {/* Count */}
      <Typography
        sx={{
          fontWeight: 950,
          fontSize: 18,
          color: "rgba(27,37,89,0.96)",
          lineHeight: 1.05,
          letterSpacing: "-0.2px",
        }}
      >
        {Number(count || 0).toLocaleString()}
        <Box
          component="span"
          sx={{
            ml: 0.8,
            fontWeight: 800,
            fontSize: 12,
            color: "rgba(113,128,150,0.95)",
          }}
        >
          ({formatPct(countPct)})
        </Box>
      </Typography>

      {/* Amount pill */}
      <Box
        sx={{
          bgcolor: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: 2,
          px: 1.4,
          py: 0.55,
          display: "inline-flex",
          alignItems: "baseline",
          gap: 0.7,
          minWidth: 150,
          justifyContent: "center",
        }}
      >
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: 14,
            color: themeColor,
            letterSpacing: "-0.1px",
          }}
        >
          {formatCurrency(amount)}
        </Typography>

        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 900,
            color: themeColor,
            opacity: 0.7,
          }}
        >
          {formatPct(amountPct)}
        </Typography>
      </Box>
    </Stack>
  );
};


function isSingleDay(start, end) {
  if (!start || !end) return false;
  return start === end;
}

function formatHourlyLabel(timeStr) {
  if (!timeStr) return '';
  const [hour] = timeStr.split(':');
  const h = parseInt(hour);
  
  if (h === 0) return '12am';
  if (h < 12) return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
}
function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function buildPill(label, color) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        borderRadius: "20px",
        px: 1.6,
        py: 0.8,
        bgcolor: `${color}22`,
        border: `1px solid ${color}55`,
      }}
    >
      <Box
        sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color }}
      />
      <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
        {label}
      </Typography>
    </Box>
  );
}

function formatDateLabel(dateStr) {
  const date = new Date(dateStr + 'T00:00:00.000Z');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getSmartTicks(dataLength, isSingle) {
  if (isSingle) {
    if (dataLength <= 24) {
      return [0, Math.floor(dataLength / 2), dataLength - 1];
    }
  } else {
    if (dataLength <= 7) {
      return Array.from({ length: dataLength }, (_, i) => i);
    } else if (dataLength <= 30) {
      const step = Math.ceil(dataLength / 5);
      return Array.from({ length: dataLength }, (_, i) => i).filter(i => i % step === 0);
    } else {
      const step = Math.ceil(dataLength / 8);
      return Array.from({ length: dataLength }, (_, i) => i).filter(i => i % step === 0);
    }
  }
  return [];
}

const RANGE_OPTIONS = ["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "Custom Range"];
const COMMON_COLORS = ['#2C5F6F', '#3A8F9F', '#5FB8A8', '#80CBC4'];

function formatDate(d) {
  return new Date(d).toISOString().split("T")[0];
}
function getRange(preset) {
  const today = new Date();
  const todayStr = formatDate(today);
  switch (preset) {
    case "Today":
      return { start: todayStr, end: todayStr };
    case "Yesterday": {
      let d = new Date();
      d.setDate(d.getDate() - 1);
      return { start: formatDate(d), end: formatDate(d) };
    }
    case "Last 7 Days": {
      let d = new Date();
      d.setDate(d.getDate() - 6);
      return { start: formatDate(d), end: todayStr };
    }
    case "Last 30 Days": {
      let d = new Date();
      d.setDate(d.getDate() - 29);
      return { start: formatDate(d), end: todayStr };
    }
    default:
      return { start: todayStr, end: todayStr };
  }
}
function OrdersSplitCard({ onlineOrders, teamOrders }) {
  return (
    <Card elevation={3} sx={{ borderRadius: 4, p: 3, background: "#fff" }}>
      <Stack direction="row" justifyContent="space-between">
        <Box sx={{ textAlign: "center", flex: 1 }}>
          <ShoppingCartIcon sx={{ fontSize: 32, color: "#1976d2" }} />
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Online Orders</Typography>
          <Typography sx={{ fontSize: 26, fontWeight: 800 }}>{onlineOrders}</Typography>
        </Box>
        <Divider orientation="vertical" flexItem sx={{ mx: 3 }} />
        <Box sx={{ textAlign: "center", flex: 1 }}>
          <GroupIcon sx={{ fontSize: 32, color: "#d81b60" }} />
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Team Orders</Typography>
          <Typography sx={{ fontSize: 26, fontWeight: 800 }}>{teamOrders}</Typography>
        </Box>
      </Stack>
    </Card>
  );
}
function FirstVsReturningCard({ firstTime, returning }) {
  return (
    <Card elevation={3} sx={{ borderRadius: 4, p: 3, background: "#fff" }}>
      <Typography sx={{ fontWeight: 700, mb: 2 }}>First-Time vs Returning</Typography>
      <Stack direction="row" justifyContent="space-between">
        <Box sx={{ flex: 1, textAlign: "center" }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>First-Time</Typography>
          <Typography sx={{ fontSize: 26, fontWeight: 800 }}>{firstTime}</Typography>
        </Box>
        <Divider orientation="vertical" flexItem sx={{ mx: 3 }} />
        <Box sx={{ flex: 1, textAlign: "center" }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Returning</Typography>
          <Typography sx={{ fontSize: 26, fontWeight: 800 }}>{returning}</Typography>
        </Box>
      </Stack>
    </Card>
  );
}
function EscalationDonut({ open = 0, closed = 0 }) {
  const pieData = [
    { name: "Closed", value: closed },
    { name: "Open", value: open },
  ];

  return (
    <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
      <Typography sx={{ fontWeight: 700, mb: 2 }}>Escalations Overview</Typography>

      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="55%"
            innerRadius={45}
            outerRadius={85}
            paddingAngle={2}
            labelLine={false}
            label={renderInsideValue}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={COMMON_COLORS[i]} />
            ))}
          </Pie>

          <Tooltip />
          <Legend formatter={legendWithCount} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
function CallsSplitCard({ incoming, outgoing }) {
  return (
    <Card elevation={3} sx={{ borderRadius: 4, p: 3, background: "#ffffff" }}>
      <Typography sx={{ fontWeight: 700, mb: 2, color: "#444" }}>Calls</Typography>
      <Stack direction="row" justifyContent="space-between">
        <Box sx={{ flex: 1, textAlign: "center" }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Incoming</Typography>
          <Typography sx={{ fontSize: 26, fontWeight: 800 }}>{incoming}</Typography>
        </Box>
        <Divider orientation="vertical" flexItem sx={{ mx: 3 }} />
        <Box sx={{ flex: 1, textAlign: "center" }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Outgoing</Typography>
          <Typography sx={{ fontSize: 26, fontWeight: 800 }}>{outgoing}</Typography>
        </Box>
      </Stack>
    </Card>
  );
}



function CODDeliveredCard({ count = 0, amount = 0 }) {
  return (
    <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
      <Typography sx={{ fontWeight: 700, mb: 2 }}>COD Delivered</Typography>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 500 }}>Delivered Orders</Typography>
        <Typography sx={{ fontSize: 22, fontWeight: 700 }}>{count}</Typography>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 500 }}>Total COD Amount</Typography>
        <Typography sx={{ fontSize: 22, fontWeight: 700 }}>₹{amount}</Typography>
      </Box>
    </Card>
  );
}

function RTOCard({ rto, rtoDelivered }) {
  return (
    <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
      <Typography sx={{ fontWeight: 700, mb: 2 }}>RTO & RTO Delivered</Typography>
      <Stack direction="row" justifyContent="space-between">
        <Box sx={{ flex: 1, textAlign: "center" }}>
          <Typography>RTO</Typography>
          <Typography sx={{ fontSize: 26, fontWeight: 800 }}>{rto}</Typography>
        </Box>
        <Divider orientation="vertical" flexItem sx={{ mx: 3 }} />
        <Box sx={{ flex: 1, textAlign: "center" }}>
          <Typography>RTO Delivered</Typography>
          <Typography sx={{ fontSize: 26, fontWeight: 800 }}>{rtoDelivered}</Typography>
        </Box>
      </Stack>
    </Card>
  );
}

function AOVCombinedCard({ online = {}, team = {}, combined = {} }) {
  return (
    <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
      <Typography sx={{ fontWeight: 700, mb: 2, textAlign: "center" }}>
        Average Order Value (AOV)
      </Typography>
      <Stack direction="row" justifyContent="space-between">
        <Box sx={{ flex: 1, textAlign: "center" }}>
          <Typography>Online</Typography>
          <Typography sx={{ fontSize: 24, fontWeight: 800, color: "#1976d2" }}>
            ₹{online.aov}
          </Typography>
          <Typography sx={{ fontSize: 12 }}>{online.orders} orders</Typography>
        </Box>
        <Divider orientation="vertical" flexItem sx={{ mx: 3 }} />
        <Box sx={{ flex: 1, textAlign: "center" }}>
          <Typography>Team</Typography>
          <Typography sx={{ fontSize: 24, fontWeight: 800, color: "#d81b60" }}>
            ₹{team.aov}
          </Typography>
          <Typography sx={{ fontSize: 12 }}>{team.orders} orders</Typography>
        </Box>
        <Divider orientation="vertical" flexItem sx={{ mx: 3 }} />
        <Box sx={{ flex: 1, textAlign: "center" }}>
          <Typography>Combined</Typography>
          <Typography sx={{ fontSize: 24, fontWeight: 800, color: "#2e7d32" }}>
            ₹{combined.aov}
          </Typography>
          <Typography sx={{ fontSize: 12 }}>{combined.orders} orders</Typography>
        </Box>
      </Stack>
    </Card>
  );
}

function FollowUpCard({ followUpsDue }) {
  return (
    <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
      <Typography sx={{ fontWeight: 700, mb: 2 }}>Follow-Ups Due</Typography>
      <Typography sx={{ fontSize: 32, fontWeight: 900, textAlign: "center" }}>
        {followUpsDue}
      </Typography>
    </Card>
  );
}

function NoConsultCard({ noConsult }) {
  return (
    <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
      <Typography>No Consult Ever</Typography>
      <Typography sx={{ fontSize: 32, fontWeight: 900, textAlign: "center" }}>
        {noConsult}
      </Typography>
    </Card>
  );
}

function NDRCard({ ndr }) {
  return (
    <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
      <Typography>NDR Orders</Typography>
      <Typography sx={{ fontSize: 32, fontWeight: 900, textAlign: "center" }}>
        {ndr}
      </Typography>
    </Card>
  );
}

function LossCard({ loss }) {
  return (
    <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
      <Typography>Total Loss Orders</Typography>
      <Typography
        sx={{ fontSize: 30, fontWeight: 900, color: "red", textAlign: "center" }}
      >
        {loss}
      </Typography>
    </Card>
  );
}

function DietPlansCard({ total }) {
  return (
    <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
      <Typography>Diet Plans Created</Typography>
      <Typography sx={{ fontSize: 32, fontWeight: 900, textAlign: "center" }}>
        {total}
      </Typography>
    </Card>
  );
}
function OrdersVsFulfilledCard({ total, fulfilled }) {
  return (
    <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
      <Typography sx={{ fontWeight: 700, mb: 2 }}>
        Total Orders vs Fulfilled
      </Typography>

      <Stack direction="row" justifyContent="space-between">
        <Box sx={{ textAlign: "center", flex: 1 }}>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            Total Orders
          </Typography>
          <Typography sx={{ fontSize: 28, fontWeight: 900, color: "#1976d2" }}>
            {total}
          </Typography>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ mx: 3 }} />

        <Box sx={{ textAlign: "center", flex: 1 }}>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            Fulfilled
          </Typography>
          <Typography sx={{ fontSize: 28, fontWeight: 900, color: "#2e7d32" }}>
            {fulfilled}
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
          Fulfillment Rate: {total > 0 ? ((fulfilled / total) * 100).toFixed(1) : 0}%
        </Typography>
      </Box>
    </Card>
  );
}



function EscalationCard({ open = 0, closed = 0 }) {
  const pieData = [
    { name: "Open", value: open },
    { name: "Closed", value: closed },
  ];

  return (
    <Card sx={{ p: 3, borderRadius: 3 }}>
      <Typography sx={{ fontWeight: 700, mb: 2 }}>
        Escalations (Open vs Closed)
      </Typography>

      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ value }) => value}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={COMMON_COLORS[i]} />
            ))}
          </Pie>

          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
function CallsInOutCard({ incoming = 0, outgoing = 0 }) {
  const pieData = [
    { name: "Incoming", value: incoming },
    { name: "Outgoing", value: outgoing },
  ];

  return (
    <Card sx={{ p: 3, borderRadius: 3 }}>
      <Typography sx={{ fontWeight: 700, mb: 2 }}>
        Calls (Incoming vs Outgoing)
      </Typography>

      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ value }) => value}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={COMMON_COLORS[i]} />
            ))}
          </Pie>

          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
function LeadsOverviewCard({ totalLeads = 0, followUpDue = 0, noConsult = 0 }) {

  const pieData = [
    { name: "Total Leads", value: totalLeads },
    { name: "Follow-up Due", value: followUpDue },
    { name: "No-Consult", value: noConsult },
  ];

  return (
    <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
      <Typography sx={{ fontWeight: 700, mb: 2 }}>
        Leads Overview
      </Typography>

      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={85}
            label={({ value }) => value}
            stroke="white"
            strokeWidth={1.2}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={COMMON_COLORS[i]} />
            ))}
          </Pie>

          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              borderRadius: "10px",
              border: "1px solid #e0e0e0",
            }}
            formatter={(value, name) => [value.toLocaleString(), name]}
          />

          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
const renderInsideValue = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
  if (!value) return null;

  const RAD = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={800}
      fill="#fff"
    >
      {Number(value).toLocaleString()}
    </text>
  );
};

const legendWithCount = (name, entry) =>
  `${name} (${Number(entry?.payload?.value || 0).toLocaleString()})`;

function LeadsOverviewDonut({ totalLeads = 0, followUpDue = 0, noConsult = 0 }) {
  const other = Math.max(totalLeads - followUpDue - noConsult, 0);

  const pieData = [
    { name: "Follow-up Due", value: followUpDue },
    { name: "No Consult Ever", value: noConsult },
    { name: "Other Leads", value: other },
  ];

  return (
    <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
      <Typography sx={{ fontWeight: 700, mb: 2 }}>Leads Overview</Typography>

      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="55%"
            innerRadius={45}
            outerRadius={85}
            paddingAngle={2}
            labelLine={false}
            label={renderInsideValue}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={COMMON_COLORS[i]} />
            ))}
          </Pie>

          <Tooltip />
          <Legend formatter={legendWithCount} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const normalizeEscalationStats = (raw = {}) => ({
  open: num(raw.open ?? raw.openCount ?? raw.totalOpen ?? raw?.counts?.open ?? raw?.open?.count),
  closed: num(raw.closed ?? raw.closedCount ?? raw.totalClosed ?? raw?.counts?.closed ?? raw?.closed?.count),
});

const normalizeFunnelStats = (raw = {}) => ({
  totalOrders: num(raw.totalOrders ?? raw.total ?? raw.orders ?? raw?.total?.count),
  fulfilled: {
    count: num(raw.fulfilled?.count ?? raw.fulfilledCount ?? raw.fulfilled ?? raw?.counts?.fulfilled),
    percentage: num(raw.fulfilled?.percentage ?? raw.fulfilledPct),
  },
  delivered: {
    count: num(raw.delivered?.count ?? raw.deliveredCount ?? raw.delivered ?? raw?.counts?.delivered),
    percentage: num(raw.delivered?.percentage ?? raw.deliveredPct),
  },
  rto: {
    count: num(raw.rto?.count ?? raw.rtoCount ?? raw.rto ?? raw?.counts?.rto),
    percentage: num(raw.rto?.percentage ?? raw.rtoPct),
  },
});

const normalizeAovStats = (raw = {}) => {
  // sometimes backend returns {data:{...}}
  const r = raw?.data ? raw.data : raw;

  if (r?.online || r?.team || r?.combined) {
    return {
      online: { aov: num(r.online?.aov), orders: num(r.online?.orders) },
      team: { aov: num(r.team?.aov), orders: num(r.team?.orders) },
      combined: { aov: num(r.combined?.aov), orders: num(r.combined?.orders) },
    };
  }

  return {
    online: { aov: num(r.onlineAov ?? r.online_aov ?? r.onlineAvg), orders: num(r.onlineOrders ?? r.online_orders) },
    team: { aov: num(r.teamAov ?? r.team_aov ?? r.teamAvg), orders: num(r.teamOrders ?? r.team_orders) },
    combined: { aov: num(r.combinedAov ?? r.aov ?? r.overallAov), orders: num(r.totalOrders ?? r.orders) },
  };
};


function AverageOrderValueCard({
  apiBase,
  start,
  end,
  aovStats,
  compareMode,
  compareStart,
  compareEnd,
  useCustomCompare,
}) {
  const [scope, setScope] = useState("combined");
  const [loading, setLoading] = useState(false);
  const [series, setSeries] = useState([]);

  const [summary, setSummary] = useState({
    currentAOV: 0,
    previousAOV: 0,
    changePct: 0,
    currentRange: null,
    previousRange: null,
  });

  const hasComparison = compareStart && compareEnd;

  // ============================================
  // AGGREGATE DATA FOR LARGE DATE RANGES
  // ============================================
// In the AverageOrderValueCard component, update the aggregateData function:

const aggregateData = (points, days) => {
  if (days <= 31) return points;

  if (days <= 90) {
    const weeks = [];
    for (let i = 0; i < points.length; i += 7) {
      const chunk = points.slice(i, i + 7);
      const validCurrent = chunk.filter(p => p.current > 0);
      const validPrev = chunk.filter(p => p.previous > 0);
      
      const avgCurrent = validCurrent.length > 0 
        ? validCurrent.reduce((s, p) => s + p.current, 0) / validCurrent.length 
        : 0;
      const avgPrev = validPrev.length > 0 
        ? validPrev.reduce((s, p) => s + p.previous, 0) / validPrev.length 
        : 0;
      
      weeks.push({
        label: chunk[0].label,
        current: Number(avgCurrent.toFixed(2)),
        previous: avgPrev > 0 ? Number(avgPrev.toFixed(2)) : null,  // 🔥 Set to null if 0
      });
    }
    return weeks;
  }

  const months = {};
  points.forEach(p => {
    const monthKey = p.label.slice(0, 7);
    if (!months[monthKey]) {
      months[monthKey] = { current: [], previous: [] };
    }
    months[monthKey].current.push(p.current);
    if (p.previous > 0) months[monthKey].previous.push(p.previous);  // 🔥 Only valid values
  });

  return Object.entries(months).map(([month, data]) => ({
    label: month,
    current: Number((data.current.reduce((s, v) => s + v, 0) / data.current.length).toFixed(2)),
    previous: data.previous.length > 0 
      ? Number((data.previous.reduce((s, v) => s + v, 0) / data.previous.length).toFixed(2))
      : null,  // 🔥 Set to null if no valid data
  }));
};
  // ============================================
  // FETCH AOV WITH COMPARISON
  // ============================================
  useEffect(() => {
    if (!start || !end) return;

    const fetchAOV = async () => {
      try {
        setLoading(true);

        const params = { start, end, scope };

        // 🔥 KEY FIX: Send comparison dates properly
        if (hasComparison) {
          params.compareMode = "custom";
          params.customCompareStart = compareStart;
          params.customCompareEnd = compareEnd;
        } else {
          params.compareMode = "none";
        }

        const res = await axios.get(
          `${apiBase}/api/super-admin/analytics/aov-over-time`,
          { params }
        );

        const { current, previous, points } = res.data || {};

        const currentAOV = current?.aov || 0;
        const previousAOV = previous?.aov || 0;

        const changePct =
          previousAOV > 0
            ? ((currentAOV - previousAOV) / previousAOV) * 100
            : 0;

        setSummary({
          currentAOV,
          previousAOV,
          changePct,
          currentRange: current?.range || { start, end },
          previousRange: previous?.range || null,
        });

        const dayCount = Math.ceil(
          (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)
        );
        
        const aggregated = aggregateData(points || [], dayCount);
        setSeries(aggregated);

      } catch (err) {
        console.error("AOV fetch error:", err);
        setSeries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAOV();
  }, [
    apiBase,
    start,
    end,
    scope,
    compareStart,  // 🔥 ADD THIS
    compareEnd,    // 🔥 ADD THIS
    hasComparison, // 🔥 ADD THIS
  ]);

  // ============================================
  // HELPERS
  // ============================================
  const fmtAOV = (v) =>
    `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  const fmtDate = (d) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const buildPill = (label, color) => (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        borderRadius: "20px",
        px: 1.6,
        py: 0.8,
        bgcolor: `${color}22`,
        border: `1px solid ${color}55`,
      }}
    >
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          bgcolor: color,
        }}
      />
      <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
        {label}
      </Typography>
    </Box>
  );

  const { currentAOV, previousAOV, changePct, currentRange, previousRange } =
    summary;

  const scopeStats = {
    online: aovStats?.online || { aov: 0, orders: 0 },
    team: aovStats?.team || { aov: 0, orders: 0 },
    combined: aovStats?.combined || { aov: 0, orders: 0 },
  };

  const renderScopeValue = (value) => {
    const s = scopeStats[value] || scopeStats.combined;
    return `${value[0].toUpperCase() + value.slice(1)} – ₹${s.aov.toLocaleString(
      "en-IN"
    )} · ${s.orders} orders`;
  };

  // ============================================
  // UI RENDER
  // ============================================
  return (
    <Card sx={{ p: 3, borderRadius: 4, height: 430, display: "flex", flexDirection: "column" }}>

      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography sx={{ fontSize: 22, fontWeight: 700 }}>
          Average Order Value
        </Typography>

        <FormControl size="small" sx={{ minWidth: 240 }}>
          <Select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            renderValue={renderScopeValue}
          >
            <MenuItem value="combined">{renderScopeValue("combined")}</MenuItem>
            <MenuItem value="online">{renderScopeValue("online")}</MenuItem>
            <MenuItem value="team">{renderScopeValue("team")}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* BIG NUMBER + PERCENT */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Typography sx={{ fontSize: 32, fontWeight: 800 }}>
          {fmtAOV(currentAOV)}
        </Typography>

        {hasComparison && previousAOV > 0 ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 700,
                color: changePct >= 0 ? "green" : "red",
              }}
            >
              {changePct >= 0 ? "▲" : "▼"} {Math.abs(changePct).toFixed(2)}%
            </Typography>
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              vs {fmtAOV(previousAOV)}
            </Typography>
          </Box>
        ) : null}
      </Box>

      {/* BEAUTIFUL DATE PILLS */}
      {hasComparison && previousRange && (
        <Box sx={{ display: "flex", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
          {buildPill(
            currentRange?.start === currentRange?.end
              ? fmtDate(currentRange?.start)
              : `${fmtDate(currentRange?.start)} – ${fmtDate(currentRange?.end)}`,
            "#2e7d32"
          )}
          {buildPill(
            previousRange?.start === previousRange?.end
              ? fmtDate(previousRange?.start)
              : `${fmtDate(previousRange?.start)} – ${fmtDate(previousRange?.end)}`,
            "#fbc02d"
          )}
        </Box>
      )}

      <Typography
        sx={{
          fontSize: 12,
          color: "text.secondary",
          mb: 1,
          textTransform: "uppercase",
        }}
      >
        Average order value over time
      </Typography>

      {/* CHART */}
      <Box sx={{ height: 250, flex: 1 }}>
        {loading ? (
          <Skeleton height={220} />
        ) : series.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 10 }}>
            <Typography color="text.secondary">No data available</Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 11 }}
             tickFormatter={(value) => {
  if (!value) return "";     // prevents INVALID DATE
  const isSingle = start === end;
  return isSingle ? formatHourlyLabel(value) : formatDateLabel(value);
}}

                interval={series.length > 5 ? Math.floor(series.length / 3) - 1 : 0}
              />
              <YAxis tickFormatter={(v) => `₹${v}`} tick={{ fontSize: 11 }} />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;

                  const isSingle = start === end;

                  return (
                    <div
                      style={{
                        background: "white",
                        padding: "10px",
                        borderRadius: "8px",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.15)"
                      }}
                    >
                      <strong>{isSingle ? formatHourlyLabel(label) : formatDateLabel(label)}</strong>

                      {payload.map((entry, i) => (
                        <div key={i} style={{ color: entry.color, marginTop: 4 }}>
                          <span style={{ fontWeight: 600 }}>
                            {entry.name === "current" 
                              ? (currentRange?.start === currentRange?.end 
                                  ? fmtDate(currentRange?.start)
                                  : `${fmtDate(currentRange?.start)} – ${fmtDate(currentRange?.end)}`)
                              : (previousRange?.start === previousRange?.end
                                  ? fmtDate(previousRange?.start)
                                  : `${fmtDate(previousRange?.start)} – ${fmtDate(previousRange?.end)}`)
                            }
                          </span>
                          : ₹{entry.value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </div>
                      ))}
                    </div>
                  );
                }}
              />

              <Legend
                formatter={(value) => {
                  if (value === "current") {
                    if (!currentRange) return "Current Period";
                    if (currentRange.start === currentRange.end) {
                      return fmtDate(currentRange.start);
                    }
                    return `${fmtDate(currentRange.start)} – ${fmtDate(currentRange.end)}`;
                  }

                  if (value === "previous") {
                    if (!previousRange) return "Previous Period";
                    if (previousRange.start === previousRange.end) {
                      return fmtDate(previousRange.start);
                    }
                    return `${fmtDate(previousRange.start)} – ${fmtDate(previousRange.end)}`;
                  }
                  return value;
                }}
              />

              <Line
                type="monotone"
                dataKey="current"
                name="current"
                stroke={COMMON_COLORS[0]} 
                strokeWidth={2}
                dot={{ r: 3 }}
              />

              {hasComparison && (
                <Line
                  type="monotone"
                  dataKey="previous"
                  name="previous"
                  stroke={COMMON_COLORS[1]} 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  strokeDasharray="5 5"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Card>
  );
}
function TotalCustomersCard({ total }) {
  return (
    <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
      <Typography sx={{ fontWeight: 700, mb: 1 }}>Total Customers</Typography>
      <Typography sx={{ fontSize: 36, fontWeight: 900, textAlign: "center", color: "#1976d2" }}>
        {total}
      </Typography>
    </Card>
  );
}

function ActiveCustomersCard({ active }) {
  return (
    <Card elevation={3} sx={{ borderRadius: 4, p: 3, textAlign: "center" }}>
      <Typography sx={{ fontSize: 36, fontWeight: 900, color: "#2e7d32" }}>
        {active}
      </Typography>
    </Card>
  );
}


function LostCustomersCard({ lost }) {
  return (
    <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
      <Typography sx={{ fontWeight: 700, mb: 1 }}>Lost Customers</Typography>
      <Typography sx={{ fontSize: 36, fontWeight: 900, textAlign: "center", color: "#d32f2f" }}>
        {lost}
      </Typography>
    </Card>
  );
}


function OrdersFunnelCard({ data }) {
    
  const funnelData = [
    { 
      name: 'Total Orders', 
      value: data?.totalOrders || 0,
      color: '#2C5F6F',
      showCount: true
    },
    { 
      name: 'Fulfilled', 
      value: data?.fulfilled?.count || 0,
      color: '#3A8F9F',
      showCount: true
    },
    { 
      name: 'Delivered', 
      value: data?.delivered?.count || 0,
      color: '#5FB8A8',
      showCount: true,
      independent: true // Mark as date-independent
    },
    { 
      name: 'RTO', 
      value: data?.rto?.count || 0,
      color: '#E57373',
      showCount: true,
      independent: true, // Mark as date-independent
      tooltip: `RTO: ${data?.rto?.breakdown?.rto || 0} | RTO Delivered: ${data?.rto?.breakdown?.rtoDelivered || 0}`
    }
  ];

  const formatLabel = (name, value, width) => {
    const fullText = `${name}: ${value.toLocaleString()}`;

    if (width < 150 || name.length > 12) {
      return {
        split: true,
        line1: name + ':',
        line2: value.toLocaleString()
      };
    }

    return { split: false, text: fullText };
  };

  return (
    <Card sx={{ p: 3, borderRadius: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography sx={{ fontWeight: 700, fontSize: 18 }}>
          Orders Funnel
        </Typography>
        
      
      </Stack>

      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <svg
          viewBox="0 0 300 350"
          style={{
            width: '100%',
            maxWidth: '400px',
            height: 'auto',
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))'
          }}
        >
          {funnelData.map((item, index) => {
            const topWidth = 280 - (index * 45);
            const bottomWidth = 280 - ((index + 1) * 45);
            const height = 80;
            const y = index * height;

            const avgWidth = (topWidth + bottomWidth) / 2;
            const leftX = (300 - topWidth) / 2;
            const rightX = leftX + topWidth;
            const bottomLeftX = (300 - bottomWidth) / 2;
            const bottomRightX = bottomLeftX + bottomWidth;

            const label = formatLabel(item.name, item.value, avgWidth);
            const fontSize = avgWidth > 150 ? 14 : 12;

            return (
              <g key={index}>
                {/* Trapezoid Shape */}
                <path
                  d={`M ${leftX} ${y}
                      L ${rightX} ${y}
                      L ${bottomRightX} ${y + height}
                      L ${bottomLeftX} ${y + height} Z`}
                  fill={item.color}
                  opacity="0.9"
                  stroke="white"
                  strokeWidth="2"
                />

                {/* Text Label */}
                {label.split ? (
                  <>
                    <text
                      x="150"
                      y={y + height / 2 - 8}
                      textAnchor="middle"
                      style={{ 
                        fontSize, 
                        fontWeight: 700, 
                        fill: '#fff',
                        fontFamily: 'Arial, sans-serif'
                      }}
                    >
                      {label.line1}
                    </text>
                    <text
                      x="150"
                      y={y + height / 2 + 8}
                      textAnchor="middle"
                      style={{ 
                        fontSize, 
                        fontWeight: 700, 
                        fill: '#fff',
                        fontFamily: 'Arial, sans-serif'
                      }}
                    >
                      {label.line2}
                    </text>
                  </>
                ) : (
                  <text
                    x="150"
                    y={y + height / 2 + 5}
                    textAnchor="middle"
                    style={{ 
                      fontSize, 
                      fontWeight: 700, 
                      fill: '#fff',
                      fontFamily: 'Arial, sans-serif'
                    }}
                  >
                    {label.text}
                  </text>
                )}

                {/* Show indicator for independent metrics */}
                {item.independent && (
                  <text
                    x="150"
                    y={y + height - 12}
                    textAnchor="middle"
                    style={{ 
                      fontSize: 10, 
                      fill: '#fff', 
                      opacity: 0.8,
                      fontFamily: 'Arial, sans-serif',
                      fontStyle: 'italic'
                    }}
                  >
                    
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </Box>

      {/* Legend with Breakdown - NO PERCENTAGES */}
      <Box sx={{ mt: 3, p: 2, bgcolor: '#F5F5F5', borderRadius: 2 }}>
        <Grid container spacing={2}>
          {funnelData.map((item, i) => (
            <Grid item xs={6} sm={3} key={i}>
              <MuiTooltip 
                title={item.tooltip || ''}
                placement="top"
                arrow
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Box 
                    sx={{ 
                      width: 12, 
                      height: 12, 
                      borderRadius: '2px',
                      bgcolor: item.color,
                      mt: 0.5,
                      flexShrink: 0
                    }} 
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ 
                      fontSize: 11, 
                      color: 'text.secondary', 
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5
                    }}>
                      {item.name}
                      {item.independent && (
                        <span style={{ fontSize: 10, opacity: 0.6 }}>⏱</span>
                      )}
                    </Typography>
                    <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
                      {item.value.toLocaleString()}
                    </Typography>
                    {/* NO PERCENTAGE SHOWN */}
                  </Box>
                </Box>
              </MuiTooltip>
            </Grid>
          ))}
        </Grid>
      </Box>


    </Card>
  );
}
function CODCard({ count, amount, percentage }) {
  return (
    <Card elevation={3} sx={{ borderRadius: 4, p: 2 }}>
      <Typography sx={{ fontSize: 14, color: "#555", fontWeight: 600 }}>
        COD Orders
      </Typography>

      <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
        <Box>
          <Typography sx={{ fontSize: 26, fontWeight: 900, color: "#d32f2f" }}>
            {count}
          </Typography>
          <Typography sx={{ fontSize: 12, color: "#777" }}>
            Orders
          </Typography>
        </Box>

        <Box sx={{ textAlign: "right" }}>
          <Typography sx={{ fontSize: 20, fontWeight: 700, color: "#2e7d32" }}>
            ₹{amount.toLocaleString()}
          </Typography>
          <Typography sx={{ fontSize: 12, color: "#2e7d32" }}>
            {percentage}
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
}
function PrepaidCard({ count, amount, percentage }) {
  return (
    <Card elevation={3} sx={{ borderRadius: 4, p: 2 }}>
      <Typography sx={{ fontSize: 14, color: "#555", fontWeight: 600 }}>
        Prepaid Orders
      </Typography>

      <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
        <Box>
          <Typography sx={{ fontSize: 26, fontWeight: 900, color: "#1976d2" }}>
            {count}
          </Typography>
          <Typography sx={{ fontSize: 12, color: "#777" }}>
            Orders
          </Typography>
        </Box>

        <Box sx={{ textAlign: "right" }}>
          <Typography sx={{ fontSize: 20, fontWeight: 700, color: "#388e3c" }}>
            ₹{amount.toLocaleString()}
          </Typography>
          <Typography sx={{ fontSize: 12, color: "#388e3c" }}>
            {percentage}
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
}
function TotalSalesCard({ amount }) {
  return (
    <Card
      elevation={3}
      sx={{ borderRadius: 3, p: 3, textAlign: "center" }}
    >
      <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 1 }}>
        Total Sales
      </Typography>

      <Typography
        sx={{
          fontSize: 30,
          fontWeight: 900,
          color: "#1976d2",
        }}
      >
        ₹{amount?.toLocaleString("en-IN") || 0}
      </Typography>
    </Card>
  );
}
function OrdersSplitPie({ onlineOrders = 0, teamOrders = 0 }) {
  const pieData = [
    { name: "Online Orders", value: onlineOrders },
    { name: "Team Orders", value: teamOrders },
  ];

  const renderInsideValue = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
    if (!value) return null;
    const RAD = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + r * Math.cos(-midAngle * RAD);
    const y = cy + r * Math.sin(-midAngle * RAD);

    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight={800}
        fill="#fff"
      >
        {Number(value).toLocaleString()}
      </text>
    );
  };

  return (
    <Card sx={{ p: 3, borderRadius: 3 }}>
      <Typography sx={{ fontWeight: 700, mb: 2 }}>Orders Split</Typography>

      <Box sx={{ width: "100%", height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="55%"              // 🔥 push slightly down to avoid top clipping
              innerRadius={45}
              outerRadius={85}
              paddingAngle={2}
              labelLine={false}      // 🔥 no outside label lines
              label={renderInsideValue}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={COMMON_COLORS[i]} />
              ))}
            </Pie>

            <Tooltip />
            <Legend
              formatter={(name, entry) =>
                `${name} (${Number(entry?.payload?.value || 0).toLocaleString()})`
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </Card>
  );
}

function FirstReturningDonut({ firstTime = 0, returning = 0 }) {
  const pieData = [
    { name: "First-Time", value: firstTime },
    { name: "Returning", value: returning },
  ];

  return (
    <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
      <Typography sx={{ fontWeight: 700, mb: 2 }}>Customer Mix</Typography>

      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="55%"
            innerRadius={45}
            outerRadius={85}
            paddingAngle={2}
            labelLine={false}
            label={renderInsideValue}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={COMMON_COLORS[i]} />
            ))}
          </Pie>

          <Tooltip />
          <Legend formatter={legendWithCount} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
function ComprehensiveSummaryTableIntegrated({ apiBase, start, end }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!start || !end) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `${apiBase}/api/super-admin/analytics/comprehensive-summary`,
          { params: { start, end } }
        );
        setData(res.data);
      } catch (err) {
        console.error("Failed to fetch summary:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [apiBase, start, end]);

  if (loading)
    return <Skeleton variant="rectangular" height={420} sx={{ borderRadius: 4 }} />;
  if (!data) return null;

  const rows = [
    { label: "Total Orders", data: data.total, color: "#2563EB", icon: "📊" },
    { label: "Team Orders", data: data.team, color: "#DB2777", icon: "👥" },
    { label: "Shopify Orders", data: data.shopify, color: "#16A34A", icon: "🛍️" },
  ];

  const headCellSx = {
    fontWeight: 900,
    fontSize: 11.5,
    letterSpacing: "0.9px",
    textTransform: "uppercase",
    color: "rgba(74,85,104,0.9)",
    bgcolor: "#F8FAFF",
    borderBottom: "1px solid rgba(226,232,240,0.9)",
    py: 1.6,
    whiteSpace: "nowrap",
  };

  const bodyCellSx = {
    borderBottom: "1px solid rgba(226,232,240,0.75)",
    py: 2.0,
  };

  return (
    <Card
      sx={{
        borderRadius: 4,
        boxShadow: "0px 8px 28px rgba(15, 23, 42, 0.06)",
        border: "1px solid rgba(226,232,240,0.95)",
        overflow: "hidden",
        mb: 4,
        background: "#fff",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 3,
          py: 2.4,
          borderBottom: "1px solid rgba(226,232,240,0.95)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: 20,
              fontWeight: 950,
              color: "rgba(27,37,89,0.96)",
              letterSpacing: "-0.3px",
              lineHeight: 1.15,
            }}
          >
            Comprehensive Order Analytics
          </Typography>
   
        </Box>

        <Chip
          label="LIVE"
          size="small"
          sx={{
            fontWeight: 900,
            bgcolor: "rgba(34,197,94,0.12)",
            color: "rgba(22,101,52,0.95)",
            border: "1px solid rgba(34,197,94,0.25)",
            borderRadius: 2,
          }}
        />
      </Box>

      <TableContainer
        sx={{
          maxHeight: 520,
          "&::-webkit-scrollbar": { height: 10, width: 10 },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(148,163,184,0.5)",
            borderRadius: 10,
          },
        }}
      >
        <Table stickyHeader sx={{ minWidth: 1100 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headCellSx, pl: 3 }}>Category</TableCell>
              <TableCell align="center" sx={headCellSx}>Total Orders</TableCell>
              <TableCell align="center" sx={headCellSx}>Prepaid</TableCell>
              <TableCell align="center" sx={headCellSx}>COD</TableCell>
              <TableCell align="center" sx={headCellSx}>Delivered</TableCell>
              <TableCell align="center" sx={headCellSx}>Undelivered</TableCell>
              <TableCell align="center" sx={headCellSx}>RTO</TableCell>
              <TableCell align="center" sx={{ ...headCellSx, pr: 3 }}>Avg Order Value</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.map((row, idx) => (
              <TableRow
                key={row.label}
                sx={{
                  bgcolor: idx % 2 === 0 ? "rgba(248,250,252,0.55)" : "#fff",
                  transition: "0.18s",
                  "&:hover": { bgcolor: "rgba(37,99,235,0.06)" },
                }}
              >
                {/* Category */}
                <TableCell sx={{ ...bodyCellSx, pl: 3, borderRight: "1px solid rgba(226,232,240,0.75)" }}>
                  <Stack direction="row" spacing={1.2} alignItems="center">
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        bgcolor: row.color,
                        boxShadow: "0 0 0 3px rgba(0,0,0,0.03)",
                      }}
                    />
                    <Box>
                      <Typography
                        sx={{
                          fontWeight: 950,
                          fontSize: 15.5,
                          color: "rgba(27,37,89,0.96)",
                          letterSpacing: "-0.2px",
                        }}
                      >
                        {row.icon} {row.label}
                      </Typography>
               
                    </Box>
                  </Stack>
                </TableCell>

                {/* Total Orders */}
                <TableCell align="center" sx={{ ...bodyCellSx, borderRight: "1px solid rgba(226,232,240,0.75)" }}>
                  <Typography
                    sx={{
                      fontWeight: 950,
                      fontSize: 22,
                      color: "rgba(27,37,89,0.96)",
                      lineHeight: 1.05,
                    }}
                  >
                    {Number(row.data.totalOrders || 0).toLocaleString()}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 13.5,
                      fontWeight: 900,
                      color: "rgba(45,55,72,0.88)",
                      mt: 0.4,
                    }}
                  >
                    {formatCurrency(row.data.totalAmount)}
                  </Typography>
                </TableCell>

                {/* Split cells */}
                <TableCell align="center" sx={bodyCellSx}>
                  <DataCell
                    count={row.data.prepaid.count}
                    countPct={row.data.prepaid.orderPercent}
                    amount={row.data.prepaid.amount}
                    amountPct={row.data.prepaid.amountPercent}
                  />
                </TableCell>

                <TableCell align="center" sx={bodyCellSx}>
                  <DataCell
                    count={row.data.cod.count}
                    countPct={row.data.cod.orderPercent}
                    amount={row.data.cod.amount}
                    amountPct={row.data.cod.amountPercent}
                    type="error"
                  />
                </TableCell>

                <TableCell align="center" sx={bodyCellSx}>
                  <DataCell
                    count={row.data.delivered.count}
                    countPct={row.data.delivered.orderPercent}
                    amount={row.data.delivered.amount}
                    amountPct={row.data.delivered.amountPercent}
                  />
                </TableCell>

                <TableCell align="center" sx={bodyCellSx}>
                  <DataCell
                    count={row.data.undelivered.count}
                    countPct={row.data.undelivered.orderPercent}
                    amount={row.data.undelivered.amount}
                    amountPct={row.data.undelivered.amountPercent}
                    type="error"
                  />
                </TableCell>

                <TableCell align="center" sx={bodyCellSx}>
                  <DataCell
                    count={row.data.rto.count}
                    countPct={row.data.rto.orderPercent}
                    amount={row.data.rto.amount}
                    amountPct={row.data.rto.amountPercent}
                    type="error"
                  />
                </TableCell>

                {/* AOV */}
                <TableCell
                  align="center"
                  sx={{
                    ...bodyCellSx,
                    pr: 3,
                    bgcolor: "rgba(3,105,161,0.06)",
                    borderLeft: "1px solid rgba(226,232,240,0.75)",
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 950,
                      fontSize: 20,
                      color: "rgba(3,105,161,0.95)",
                      letterSpacing: "-0.2px",
                    }}
                  >
                    {formatCurrency(row.data.aov)}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 900,
                      color: "rgba(3,105,161,0.72)",
                      mt: 0.4,
                      textTransform: "uppercase",
                      letterSpacing: "0.6px",
                    }}
                  >
                    AOV
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

export default function SuperAdminAnalytics() {
  const API = "https://muditamleads-14f32a10d7f7.herokuapp.com";
  
  const [compareMode, setCompareMode] = useState("previous");
  const [compareStart, setCompareStart] = useState("");
  const [compareEnd, setCompareEnd] = useState("");
  const [useCustomCompare, setUseCustomCompare] = useState(false);
const [compareDialogOpen, setCompareDialogOpen] = useState(false);
const [tempCompareStart, setTempCompareStart] = useState("");
const [tempCompareEnd, setTempCompareEnd] = useState("");
  const [preset, setPreset] = useState("Today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [escalationStats, setEscalationStats] = useState({ open: 0, closed: 0 });

  const [data, setData] = useState({ onlineOrders: 0, teamOrders: 0 });
  const [firstReturning, setFirstReturning] = useState({ firstTime: 0, returning: 0 });
  const [leadStats, setLeadStats] = useState({ totalLeads: 0 });
  const [loading, setLoading] = useState(false);
  const [deliveredStats, setDeliveredStats] = useState({ delivered: 0 });
  const [callStats, setCallStats] = useState({ incoming: 0, outgoing: 0 });
  const [codStats, setCodStats] = useState({ totalCount: 0, totalAmount: 0 });

  const [rtoStats, setRtoStats] = useState({ rto: 0, rtoDelivered: 0 });
  const [aovStats, setAovStats] = useState({
    online: { aov: 0, orders: 0 },
    team: { aov: 0, orders: 0 },
    combined: { aov: 0, orders: 0 },
  });
  const [followUpStats, setFollowUpStats] = useState({ followUpsDue: 0 });
  const [noConsultStats, setNoConsultStats] = useState({ noConsult: 0 });
  const [ndrStats, setNdrStats] = useState({ ndr: 0 });
  const [lossStats, setLossStats] = useState({ loss: 0 });
  const [dietStats, setDietStats] = useState({ totalDietPlans: 0 });
  const [orderVsConfirmed, setOrderVsConfirmed] = useState({
    totalOrders: 0,
    confirmedOrders: 0,
  });
  


  const [deliveredAgents, setDeliveredAgents] = useState([]);
  const [deliveredLoading, setDeliveredLoading] = useState(true);
  const [deliveredOpen, setDeliveredOpen] = useState(false);


  const [visibleLines, setVisibleLines] = useState({
    newCustomers: true,
    active: true,
    lost: true
  });

  
  const toggleLine = (lineKey) => {
    setVisibleLines(prev => ({
      ...prev,
      [lineKey]: !prev[lineKey]
    }));
  };

const [funnelStats, setFunnelStats] = useState({
  totalOrders: 0,
  fulfilled: { count: 0, percentage: 0 },
  delivered: { count: 0, percentage: 0 },
  rto: { count: 0, percentage: 0 }
});
  const [customerStats, setCustomerStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    lostCustomers: 0,
  });
  const [customerTrendFilters, setCustomerTrendFilters] = useState({
  compareMode: false,
  compareStart: null,
  compareEnd: null,
  useCustomCompare: false
});


  const [customerTrendData, setCustomerTrendData] = useState([]);
  const [customerTrendLoading, setCustomerTrendLoading] = useState(false);
const [paymentStats, setPaymentStats] = useState({
  cod: { count: 0, amount: 0, percentage: "0%" },
  prepaid: { count: 0, amount: 0, percentage: "0%" }
});
const [salesStats, setSalesStats] = useState({
  totalSales: 0,
});
const [orderTrendData, setOrderTrendData] = useState([]);
const [orderFilter, setOrderFilter] = useState("all"); 
const [orderTrendLoading, setOrderTrendLoading] = useState(false);
const [orderTrendSummary, setOrderTrendSummary] = useState({
  total: 0,
  percentChange: 0,
  comparison: { total: 0, percentChange: 0 },
  currentRange: null,
  previousRange: null
});

const [summaryLoading, setSummaryLoading] = useState(false);
const [summary, setSummary] = useState({
  totalSales: 0,
  totalOrders: 0,
  aov: 0,
  prepaid: { count: 0, amount: 0, percentage: 0 },
  cod: { count: 0, amount: 0, percentage: 0 },
});
const [escalationPriorityData, setEscalationPriorityData] = useState(null);
const [escalationPriorityLoading, setEscalationPriorityLoading] = useState(false);
const [activePriorityTab, setActivePriorityTab] = useState("high");



function EscalationPrioritySection() {
  if (escalationPriorityLoading) {
    return (
      <Card sx={{ p: 3, borderRadius: 4 }}>
        <Skeleton height={40} width="60%" sx={{ mb: 2 }} />
        <Skeleton height={120} />
      </Card>
    );
  }

  if (!escalationPriorityData || escalationPriorityData.summary.total === 0) {
    return (
      <Card sx={{ p: 3, borderRadius: 4, textAlign: "center" }}>
        <Typography color="text.secondary">
          No active escalations found
        </Typography>
      </Card>
    );
  }

  const { summary } = escalationPriorityData;

  return (
    <Card sx={{ p: 3, borderRadius: 4, boxShadow: "0px 4px 20px rgba(0,0,0,0.05)", border: "1px solid #E0E0E0", ...cardStyle }}>
      <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#1B2559", mb: 2 }}>
        Escalation Priority Analysis
      </Typography>

      <Stack direction="row" spacing={2}>
        <Box
          sx={{
            flex: 1,
            p: 2.5,
            borderRadius: 3,
            bgcolor: "#E8F5E9",
            border: "2px solid #388e3c",
            textAlign: "center",
            transition: "all 0.2s",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 4px 12px rgba(56,142,60,0.15)",
            },
          }}
        >
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: "#388e3c", mb: 1 }}>
            LOW PRIORITY
          </Typography>
          <Typography sx={{ fontSize: 36, fontWeight: 900, color: "#388e3c" }}>
            {summary.lowPriority}
          </Typography>
          <Typography sx={{ fontSize: 11, color: "#666", mt: 0.5 }}>
            0-2 days old
          </Typography>
        </Box>

        <Box
          sx={{
            flex: 1,
            p: 2.5,
            borderRadius: 3,
            bgcolor: "#FFF3E0",
            border: "2px solid #f57c00",
            textAlign: "center",
            transition: "all 0.2s",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 4px 12px rgba(245,124,0,0.15)",
            },
          }}
        >
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: "#f57c00", mb: 1 }}>
            MORE PRIORITY
          </Typography>
          <Typography sx={{ fontSize: 36, fontWeight: 900, color: "#f57c00" }}>
            {summary.mediumPriority}
          </Typography>
          <Typography sx={{ fontSize: 11, color: "#666", mt: 0.5 }}>
            3-4 days old
          </Typography>
        </Box>

        <Box
          sx={{
            flex: 1,
            p: 2.5,
            borderRadius: 3,
            bgcolor: "#FFEBEE",
            border: "2px solid #d32f2f",
            textAlign: "center",
            transition: "all 0.2s",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 4px 12px rgba(211,47,47,0.15)",
            },
          }}
        >
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: "#d32f2f", mb: 1 }}>
            URGENT HIGH PRIORITY
          </Typography>
          <Typography sx={{ fontSize: 36, fontWeight: 900, color: "#d32f2f" }}>
            {summary.highPriority}
          </Typography>
          <Typography sx={{ fontSize: 11, color: "#666", mt: 0.5 }}>
            5+ days old
          </Typography>
        </Box>

        <Box
          sx={{
            flex: 1,
            p: 2.5,
            borderRadius: 3,
            bgcolor: "#F5F5F5",
            border: "2px solid #9E9E9E",
            textAlign: "center",
            transition: "all 0.2s",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            },
          }}
        >
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: "#424242", mb: 1 }}>
            TOTAL OPEN
          </Typography>
          <Typography sx={{ fontSize: 36, fontWeight: 900, color: "#424242" }}>
            {summary.total}
          </Typography>
          <Typography sx={{ fontSize: 11, color: "#666", mt: 0.5 }}>
            All escalations
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
}
const loadEscalationPriorities = async () => {
  try {
    setEscalationPriorityLoading(true);
    const res = await axios.get(
      `${API}/api/super-admin/analytics/escalation-priority-stats`,
      { params: { start, end } }
    );
    setEscalationPriorityData(res.data);
  } catch (err) {
    console.error("Failed to fetch escalation priorities:", err);
  } finally {
    setEscalationPriorityLoading(false);
  }
   };

const loadSummary = async () => {
  try {
    setSummaryLoading(true);

    const res = await axios.get(`${API}/api/super-admin/analytics/dashboard-summary`, {
      params: { start, end }
    });

    setSummary(res.data);

  } catch (err) {
    console.error("Summary Fetch Error:", err);
  } finally {
    setSummaryLoading(false);
  }
};
const handleComparisonSave = () => {
  if (!tempCompareStart || !tempCompareEnd) {
    alert("Please select both dates");
    return;
  }
  if (tempCompareStart > tempCompareEnd) {
    alert("Start date must be before end date");
    return;
  }
  setCompareStart(tempCompareStart);
  setCompareEnd(tempCompareEnd);
  setCompareMode("custom");
  setUseCustomCompare(true);
  setCompareDialogOpen(false);
};

const handleComparisonReset = () => {
  setCompareStart("");
  setCompareEnd("");
  setCompareMode("none");
  setUseCustomCompare(false);
  setTempCompareStart("");
  setTempCompareEnd("");
  setCompareDialogOpen(false);
};



  const loadDeliveredRevenue = async () => {
    try {
      setDeliveredLoading(true);
      const res = await axios.get(`${API}/api/super-admin/analytics/delivered-sales-per-agent`);
      const sorted = (res.data.agents || []).sort(
        (a, b) => (b.totalDeliveredSales || 0) - (a.totalDeliveredSales || 0)
      );
      setDeliveredAgents(sorted);
    } catch (err) {
      console.error("Delivered Sales Fetch Error:", err);
    } finally {
      setDeliveredLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveredRevenue();
  }, []);

  const { start, end } =
    preset === "Custom Range" && customStart && customEnd
      ? { start: customStart, end: customEnd }
      : getRange(preset);
const safeGet = async (url, params, fallback) => {
  try {
    const res = await axios.get(url, { params });
    return res.data ?? fallback;
  } catch (err) {
    console.error(
      "❌ API failed:",
      url,
      "status:",
      err?.response?.status,
      "data:",
      err?.response?.data || err.message
    );
    return fallback;
  }
};


const loadAnalytics = async () => {
  setLoading(true);

  const orderData = await safeGet(`${API}/api/super-admin/analytics/orders`, { start, end }, {});
  setData(orderData || {});

  const frData = await safeGet(`${API}/api/super-admin/analytics/first-vs-returning`, { start, end }, {});
  setFirstReturning(frData || {});

  const leadsData = await safeGet(`${API}/api/super-admin/analytics/leads`, { start, end }, { totalLeads: 0 });
  setLeadStats({ totalLeads: leadsData.totalLeads || 0 });

  const callsData = await safeGet(`${API}/api/super-admin/analytics/calls`, { start, end }, { incoming: 0, outgoing: 0 });
  setCallStats(callsData);

  const delData = await safeGet(`${API}/api/super-admin/analytics/delivered`, { start, end }, { delivered: 0 });
  setDeliveredStats(delData);

  const rtoData = await safeGet(`${API}/api/super-admin/analytics/rto`, { start, end }, { rto: 0, rtoDelivered: 0 });
  setRtoStats(rtoData);

  const ovData = await safeGet(`${API}/api/super-admin/analytics/orders-vs-fulfilled`, { start, end }, {});
  setOrderVsConfirmed(ovData || {});
  setFunnelStats(normalizeFunnelStats(ovData || {})); 

  const dietData = await safeGet(`${API}/api/super-admin/analytics/diet-plans`, { start, end }, { totalDietPlans: 0 });
  setDietStats(dietData);

  const fuData = await safeGet(`${API}/api/super-admin/analytics/followups`, { start, end }, { followUpsDue: 0 });
  setFollowUpStats(fuData);

  const noConsultData = await safeGet(`${API}/api/super-admin/analytics/no-consult`, { start, end }, { noConsult: 0 });
  setNoConsultStats(noConsultData);

  const ndrData = await safeGet(`${API}/api/super-admin/analytics/ndr`, { start, end }, { ndr: 0 });
  setNdrStats(ndrData);

  const escData = await safeGet(`${API}/api/super-admin/analytics/escalations`, { start, end }, { open: 0, closed: 0 });
  setEscalationStats(normalizeEscalationStats(escData)); 

  const aovData = await safeGet(`${API}/api/super-admin/analytics/aov`, { start, end }, {});
  const normalizedAov = normalizeAovStats(aovData);
  setAovStats(normalizedAov); 

  const codData = await safeGet(`${API}/api/super-admin/analytics/cod-delivered`, { start, end }, { totalCount: 0, totalAmount: 0 });
  setCodStats({ totalCount: codData.totalCount || 0, totalAmount: codData.totalAmount || 0 });

  const custData = await safeGet(`${API}/api/super-admin/analytics/customer-stats`, { start, end }, {});
  setCustomerStats(custData || {});

  const payData = await safeGet(`${API}/api/super-admin/analytics/payment-mode-stats`, { start, end }, null);
  if (payData) setPaymentStats(payData);

  const salesData = await safeGet(`${API}/api/super-admin/analytics/sales-per-day`, { start, end }, []);
  const totalSales = (salesData || []).reduce((sum, d) => sum + (d.totalSales || 0), 0);
  setSalesStats({ totalSales });

  setLoading(false);
};


const loadCustomerTrends = async () => {
  try {
    setCustomerTrendLoading(true);
    const res = await axios.get(`${API}/api/super-admin/analytics/customer-trends`, {
      params: { 
        start, 
        end,
        compareStart: compareStart || undefined,
        compareEnd: compareEnd || undefined
      }
    });
    setCustomerTrendData(res.data || []);
  } catch (err) {
    console.error("Customer Trends Fetch Error:", err);
    setCustomerTrendData([]);
  } finally {
    setCustomerTrendLoading(false);
  }
};

  useEffect(() => {
    loadAnalytics();
    loadCustomerTrends();
     loadEscalationPriorities();
  }, [preset, customStart, customEnd, compareStart, compareEnd]);
useEffect(() => {
 const loadOrderTrend = async () => {
  if ((!compareStart || !compareEnd) && compareMode === "custom") return;

  try {
    setOrderTrendLoading(true);

    const params = {
      start,
      end,
      filter: orderFilter
    };

    if (compareStart && compareEnd) {
      params.compareStart = compareStart;
      params.compareEnd = compareEnd;
    }

    const trendRes = await axios.get(
      `${API}/api/super-admin/analytics/orders-over-time`,
      { params }
    );

    const processedTrend = trendRes.data.trend.map(p => ({
      ...p,
      previous: p.previous > 0 ? p.previous : null
    }));

    setOrderTrendData(processedTrend);


    setOrderTrendSummary({
      total: trendRes.data.total || 0,
      percentChange: trendRes.data.comparison?.percentChange || 0,
      comparison: {
        total: trendRes.data.comparison?.total || 0,
        percentChange: trendRes.data.comparison?.percentChange || 0,
      },
      currentRange: { 
        start: start,  
        end: end 
      },
      previousRange: compareStart && compareEnd ? {
        start: compareStart,  
        end: compareEnd
      } : null,
    });

  } catch(err) {
    console.error("Order Trend Error", err);
  } finally {
    setOrderTrendLoading(false);
  }
};

  loadOrderTrend();
}, [start, end, orderFilter, compareStart, compareEnd]);

useEffect(() => {
  loadSummary();
}, [start, end]);

  // ------------------- DATA HELPERS -------------------
  const ordersSplitPieData = [
    { name: "Online Orders", value: data.onlineOrders || 0 },
    { name: "Team Orders", value: data.teamOrders || 0 },
  ];

  const firstReturningPieData = [
    { name: "First-Time", value: firstReturning.firstTime || 0 },
    { name: "Returning", value: firstReturning.returning || 0 },
  ];

const cardStyle = {
  borderRadius: "12px", // Slightly less rounded for a tighter, professional feel
  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)", // Shopify-style flat shadow
  border: "1px solid #E2E8F0",
  height: "100%",
  backgroundColor: "#fff",
  transition: "all 0.2s ease-in-out",
  "&:hover": {
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      borderColor: "#CBD5E1",
  }
};

  return (
    <Box sx={{ p: 3, backgroundColor: "#F4F7FE", minHeight: "100vh" }}>
      
      {/* --- HEADER TITLE --- */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: "#1B2559", letterSpacing: "-0.5px" }}>
          Super Admin Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Overview of your sales, performance, and customer trends.
        </Typography>
      </Box>

<Card sx={{ p: 2, mb: 4, borderRadius: "16px", boxShadow: "0px 2px 10px rgba(0,0,0,0.03)" }}>
  <Stack
    direction={{ xs: "column", md: "row" }}
    alignItems="center"
    justifyContent="space-between"
    spacing={2}
  >
    {/* LEFT: main date range controls */}
    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
      <FormControl size="small" sx={{ minWidth: 200, bgcolor: "#F4F7FE", borderRadius: 2 }}>
        <InputLabel>Date Range</InputLabel>
        <Select
          value={preset}
          label="Date Range"
          onChange={(e) => setPreset(e.target.value)}
          sx={{ borderRadius: 2 }}
        >
          {RANGE_OPTIONS.map((r) => (
            <MenuItem key={r} value={r}>{r}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {preset === "Custom Range" && (
        <>
          <TextField
            type="date"
            size="small"
            label="Start"
            InputLabelProps={{ shrink: true }}
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
          />
          <TextField
            type="date"
            size="small"
            label="End"
            InputLabelProps={{ shrink: true }}
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
          />
        </>
      )}

      <Box sx={{ bgcolor: "#EAF3FF", px: 2, py: 1, borderRadius: "10px", color: "#1976d2" }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
          📅 {start} → {end}
        </Typography>
      </Box>
    </Stack>

    {/* RIGHT: Comparison Button */}
    <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
      <Button
        variant={compareStart && compareEnd ? "contained" : "outlined"}
        color={compareStart && compareEnd ? "primary" : "inherit"}
        onClick={() => {
          setTempCompareStart(compareStart);
          setTempCompareEnd(compareEnd);
          setCompareDialogOpen(true);
        }}
        sx={{
          borderRadius: "8px",
          textTransform: "none",
          fontWeight: 600,
          minWidth: 120,
        }}
      >
        📊 Compare
      </Button>

      {compareStart && compareEnd && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 2,
            py: 1,
            bgcolor: "#E8F5E9",
            borderRadius: "8px",
            border: "1px solid #4CAF50",
          }}
        >
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#2e7d32" }}>
            ✓ {compareStart} to {compareEnd}
          </Typography>
          <Button
            size="small"
            onClick={handleComparisonReset}
            sx={{ minWidth: "auto", p: 0.5, color: "#d32f2f", fontSize: 16 }}
          >
            ✕
          </Button>
        </Box>
      )}
    </Box>
  </Stack>
</Card>
<Dialog
  open={compareDialogOpen}
  onClose={() => setCompareDialogOpen(false)}
  maxWidth="sm"
  fullWidth
>
  <DialogTitle sx={{ fontWeight: 700, fontSize: 18 }}>
    Select Period to Compare
  </DialogTitle>

  <DialogContent dividers sx={{ p: 3 }}>
    <Stack spacing={3} sx={{ mt: 1 }}>
      <Box>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary", mb: 1 }}>
          Comparison Start Date
        </Typography>
        <TextField
          type="date"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={tempCompareStart}
          onChange={(e) => setTempCompareStart(e.target.value)}
          sx={{ "& input": { padding: "12px" } }}
        />
      </Box>

      <Box>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary", mb: 1 }}>
          Comparison End Date
        </Typography>
        <TextField
          type="date"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={tempCompareEnd}
          onChange={(e) => setTempCompareEnd(e.target.value)}
          sx={{ "& input": { padding: "12px" } }}
        />
      </Box>

      <Box sx={{ bgcolor: "#FFF3E0", p: 2, borderRadius: "8px", border: "1px solid #FFB74D" }}>
        <Typography sx={{ fontSize: 12, color: "#E65100" }}>
          <strong>💡 Tip:</strong> Compare against a past period to see growth or decline.
        </Typography>
      </Box>
    </Stack>
  </DialogContent>

  <DialogActions sx={{ p: 2 }}>
    <Button
      variant="outlined"
      onClick={() => setCompareDialogOpen(false)}
    >
      Cancel
    </Button>
    <Button
      variant="outlined"
      color="error"
      onClick={handleComparisonReset}
    >
      Clear
    </Button>
    <Button
      variant="contained"
      onClick={handleComparisonSave}
    >
      Apply
    </Button>
  </DialogActions>
</Dialog>

   <ComprehensiveSummaryTableIntegrated 
        apiBase={API} 
        start={start} 
        end={end} 
      />


<Grid container spacing={3}>

  {/* ========================== ROW 1 ========================== */}
  <Grid item xs={12} md={6}>
  {/* AOV Chart */}
  <AverageOrderValueCard
    apiBase={API}
    start={start}
    end={end}
    aovStats={aovStats}
    compareMode={compareStart && compareEnd ? "custom" : "none"}
    compareStart={compareStart}
    compareEnd={compareEnd}
    useCustomCompare={useCustomCompare}
  />
</Grid>


<Grid item xs={12} md={6}>
  {/* Total Orders Trend */}
  <Card sx={{ p: 3, borderRadius: 3 }}>
    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.2}}>
      <Typography sx={{ fontWeight: 700 }}>Total Orders</Typography>

      <Select
        size="small"
        value={orderFilter}
        onChange={(e) => setOrderFilter(e.target.value)}
        sx={{ height: 32 }}
      >
        <MenuItem value="all">All</MenuItem>
        <MenuItem value="cod">COD</MenuItem>
        <MenuItem value="prepaid">Prepaid</MenuItem>
      </Select>
    </Box>

{orderTrendLoading ? (
  <Skeleton height={40} width={140} />
) : (
  <Box sx={{ mb: 1 }}>
    
    {/* MAIN NUMBER + % CHANGE */}
    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      <Typography sx={{ fontSize: 32, fontWeight: 900 }}>
        {orderTrendSummary.total}
      </Typography>

      {compareStart && compareEnd && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              px: 1.5,
              py: 0.6,
              borderRadius: "20px",
              bgcolor:
                orderTrendSummary.percentChange >= 0
                  ? "#E8F5E9"
                  : "#FFEBEE",
              border:
                orderTrendSummary.percentChange >= 0
                  ? "1px solid #4CAF50"
                  : "1px solid #F44336",
            }}
          >
            {orderTrendSummary.percentChange >= 0 ? (
              <ArrowDropUpIcon sx={{ color: "#2e7d32", fontSize: 20 }} />
            ) : (
              <ArrowDropDownIcon sx={{ color: "#d32f2f", fontSize: 20 }} />
            )}

            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 700,
                color:
                  orderTrendSummary.percentChange >= 0
                    ? "#2e7d32"
                    : "#d32f2f",
              }}
            >
              {Math.abs(orderTrendSummary.percentChange).toFixed(2)}%
            </Typography>
          </Box>

          <Typography
            sx={{
              fontSize: 12,
              color: "text.secondary",
              fontWeight: 600,
            }}
          >
            vs {orderTrendSummary.comparison.total}
          </Typography>
        </Box>
      )}
    </Box>



{/* DATE RANGE PILLS */}
{orderTrendSummary.currentRange && orderTrendSummary.previousRange && (
  <Box sx={{ display: "flex", gap: 1.5, mt: 1, flexWrap: "wrap" }}>
    {/* CURRENT RANGE PILL */}
    {buildPill(
      orderTrendSummary.currentRange.start ===
        orderTrendSummary.currentRange.end
        ? fmtDate(orderTrendSummary.currentRange.start)
        : `${fmtDate(
            orderTrendSummary.currentRange.start
          )} – ${fmtDate(orderTrendSummary.currentRange.end)}`,
      "#2e7d32"
    )}

    {/* PREVIOUS RANGE PILL - 🔥 FIX: Check if it's a single day */}
{orderTrendSummary.previousRange && buildPill(
  fmtDate(orderTrendSummary.previousRange.start),   // 🔥 ALWAYS ONLY FIRST DATE
  "#fbc02d"
)}

  </Box>
)}
  </Box>
)}

    <Typography sx={{ fontSize: 13, mt: 1, opacity: 0.7 }}>
      Orders Over Time {compareStart && compareEnd && `(${start} vs ${compareStart})`}
    </Typography>

    {orderTrendLoading ? (
      <Skeleton height={260} variant="rectangular" sx={{ mt: 2 }} />
    ) : (
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={orderTrendData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const isSingle = isSingleDay(start, end);
              return isSingle
                ? formatHourlyLabel(value)
                : formatDateLabel(value);
            }}
            interval={
              orderTrendData.length > 5
                ? Math.floor(orderTrendData.length / 3) - 1
                : 0
            }
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (!active || !payload) return null;
              
              return (
                <div style={{
                  background: "white",
                  padding: "10px",
                  borderRadius: "8px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.15)"
                }}>
                  <strong>{label}</strong>
                  {payload.map((entry, i) => (
                    <div key={i} style={{ color: entry.color, marginTop: 4 }}>
                      {entry.name === "current" ? start : compareStart}: {entry.value}
                    </div>
                  ))}
                </div>
              );
            }}
          />
          <Legend 
            formatter={(value) => {
              if (value === "current") return start;
              if (value === "previous") return compareStart;
              return value;
            }}
          />
          
          {/* Current Period Line */}
          <Line
            type="monotone"
            dataKey="current"
            name="current"
            stroke={COMMON_COLORS[0]}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
          />

          {/* Comparison Period Line - Clean with connectNulls */}
          {orderTrendData.some(d => d.previous !== null && d.previous > 0) && (
            <Line
              type="monotone"
              dataKey="previous"
              name="previous"
              stroke={COMMON_COLORS[1]}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6 }}
              strokeDasharray="5 5"
              connectNulls={true}  // 🔥 Connects valid points, skips nulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    )}
  </Card>
</Grid>


  <Grid item xs={12} md={6}>

    <OrdersFunnelCard data={funnelStats} />
  </Grid>

  <Grid item xs={12} md={6}>




<Card
  sx={{
    p: 3,
    ...cardStyle,
    width: "100%",
    height: "100%",              // ✅ same height as Orders Funnel (when parent Grid item is flex)
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  }}
>
  {/* Header */}
  <Stack
    direction="row"
    justifyContent="space-between"
    alignItems="center"
    mb={1.5}
    sx={{ flexShrink: 0 }}
  >
    <Typography sx={{ fontWeight: 700, fontSize: 18, color: "#1B2559" }}>
      Customer Trends
    </Typography>

    <Box sx={{ display: "flex", gap: 1 }}>
      <Button
        variant={visibleLines.newCustomers ? "contained" : "outlined"}
        size="small"
        onClick={() => toggleLine("newCustomers")}
        sx={{
          fontSize: "10px",
          borderRadius: "6px",
          borderColor: COMMON_COLORS[0],
          bgcolor: visibleLines.newCustomers ? COMMON_COLORS[0] : "transparent",
          color: visibleLines.newCustomers ? "white" : COMMON_COLORS[0],
          px: 1.2,
          py: 0.4,
          minHeight: 26,
        }}
      >
        NEW
      </Button>

      <Button
        variant={visibleLines.active ? "contained" : "outlined"}
        size="small"
        onClick={() => toggleLine("active")}
        sx={{
          fontSize: "10px",
          borderRadius: "6px",
          borderColor: COMMON_COLORS[1],
          bgcolor: visibleLines.active ? COMMON_COLORS[1] : "transparent",
          color: visibleLines.active ? "white" : COMMON_COLORS[1],
          px: 1.2,
          py: 0.4,
          minHeight: 26,
        }}
      >
        ACTIVE
      </Button>

      <Button
        variant={visibleLines.lost ? "contained" : "outlined"}
        size="small"
        onClick={() => toggleLine("lost")}
        sx={{
          fontSize: "10px",
          borderRadius: "6px",
          borderColor: COMMON_COLORS[2],
          bgcolor: visibleLines.lost ? COMMON_COLORS[2] : "transparent",
          color: visibleLines.lost ? "white" : COMMON_COLORS[2],
          px: 1.2,
          py: 0.4,
          minHeight: 26,
        }}
      >
        LOST
      </Button>
    </Box>
  </Stack>

  {/* Body (kept inside fixed card height) */}
  <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
    {customerTrendLoading ? (
      <Skeleton variant="rectangular" sx={{ flex: 1, borderRadius: 2 }} />
    ) : customerTrendData.length === 0 ? (
      <Box sx={{ flex: 1, display: "grid", placeItems: "center" }}>
        <Typography color="text.secondary">No customer trend data available</Typography>
      </Box>
    ) : (
      <>
        {/* Chart takes remaining height */}
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={customerTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => {
                  const isSingle = isSingleDay(start, end);
                  return isSingle ? formatHourlyLabel(value) : formatDateLabel(value);
                }}
                interval={
                  customerTrendData.length > 5
                    ? Math.floor(customerTrendData.length / 3) - 1
                    : 0
                }
              />
              <YAxis tick={{ fontSize: 11 }} />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;

                  return (
                    <div
                      style={{
                        background: "white",
                        padding: "12px",
                        borderRadius: "8px",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
                        border: "1px solid #e0e0e0",
                        minWidth: "200px",
                      }}
                    >
                      <strong style={{ fontSize: "12px", color: "#333" }}>{label}</strong>

                      {payload.map((entry, i) => {
                        let lab = entry.name;
                        if (entry.name === "newCustomers") {
                          lab = start === end ? "New (Today)" : "New Customers";
                        } else if (entry.name === "compareNewCustomers") {
                          lab =
                            compareStart === compareEnd
                              ? "New (Comparison)"
                              : "New (Compare)";
                        }

                        return (
                          <div
                            key={i}
                            style={{
                              color: entry.color,
                              marginTop: "6px",
                              fontSize: "12px",
                              fontWeight: 600,
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "20px",
                            }}
                          >
                            <span>{lab}:</span>
                            <strong>{entry.value?.toLocaleString() || 0}</strong>
                          </div>
                        );
                      })}
                    </div>
                  );
                }}
              />

              <Legend
                formatter={(value) => {
                  if (value === "newCustomers") return `New (${start})`;
                  if (value === "compareNewCustomers") return `New (${compareStart})`;
                  if (value === "active") return "Active";
                  if (value === "lost") return "Lost";
                  return value;
                }}
                wrapperStyle={{ paddingTop: "8px" }}
              />

              {visibleLines.newCustomers && (
                <Line
                  dataKey="newCustomers"
                  stroke={COMMON_COLORS[0]}
                  strokeWidth={3}
                  dot={{ r: 3.5, fill: COMMON_COLORS[0] }}
                  name="newCustomers"
                />
              )}

              {visibleLines.newCustomers &&
                compareStart &&
                compareEnd &&
                customerTrendData.some((d) => d.compareNewCustomers > 0) && (
                  <Line
                    dataKey="compareNewCustomers"
                    stroke={COMMON_COLORS[1]}
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={{ r: 3.5, fill: COMMON_COLORS[1] }}
                    name="compareNewCustomers"
                  />
                )}

              {visibleLines.active && (
                <Line
                  dataKey="active"
                  stroke={COMMON_COLORS[1]}
                  strokeWidth={3}
                  dot={{ r: 3.5, fill: COMMON_COLORS[1] }}
                  name="active"
                />
              )}

              {visibleLines.lost && (
                <Line
                  dataKey="lost"
                  stroke={COMMON_COLORS[3]}
                  strokeWidth={3}
                  dot={{ r: 3.5, fill: COMMON_COLORS[3] }}
                  name="lost"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </Box>

        {/* Summary Stats (compact) */}
        <Box
          sx={{
            p: 1.25,
            bgcolor: "#F5F5F5",
            borderRadius: 2,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
            gap: 1,
            flexShrink: 0,
          }}
        >
          {visibleLines.newCustomers && (
            <Box sx={{ textAlign: "center" }}>
              <Typography sx={{ fontSize: 10, color: "text.secondary", fontWeight: 700 }}>
                Total New
              </Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 800, color: COMMON_COLORS[0] }}>
                {customerTrendData
                  .reduce((sum, d) => sum + (d.newCustomers || 0), 0)
                  .toLocaleString()}
              </Typography>
            </Box>
          )}

          {visibleLines.active && (
            <Box sx={{ textAlign: "center" }}>
              <Typography sx={{ fontSize: 10, color: "text.secondary", fontWeight: 700 }}>
                Active Customers
              </Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 800, color: COMMON_COLORS[1] }}>
                {(customerTrendData[0]?.active || 0).toLocaleString()}
              </Typography>
            </Box>
          )}

          {visibleLines.lost && (
            <Box sx={{ textAlign: "center" }}>
              <Typography sx={{ fontSize: 10, color: "text.secondary", fontWeight: 700 }}>
                Lost Customers
              </Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 800, color: COMMON_COLORS[3] }}>
                {(customerTrendData[0]?.lost || 0).toLocaleString()}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Escalations (wider + shorter cards) */}
        {escalationPriorityLoading ? (
          <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2, flexShrink: 0 }} />
        ) : (
          <Box
            sx={{
              p: 1.25,
              bgcolor: "#F5F5F5",
              borderRadius: 2,
              flexShrink: 0,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography sx={{ fontWeight: 800, color: "#1B2559", fontSize: 14 }}>
                Escalations
              </Typography>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, // ✅ wider (no empty 4th column)
                gap: 1.5,
              }}
            >
              {[
                {
                  title: "LOW PRIORITY",
                  value: escalationPriorityData?.summary?.lowPriority ?? 0,
                  sub: "0-2 days old",
                },
                {
                  title: "MORE PRIORITY",
                  value: escalationPriorityData?.summary?.mediumPriority ?? 0,
                  sub: "3-4 days old",
                },
                {
                  title: "URGENT HIGH PRIORITY",
                  value: escalationPriorityData?.summary?.highPriority ?? 0,
                  sub: "5+ days old",
                },
              ].map((c) => (
                <Box
                  key={c.title}
                  sx={{
                    p: 1.25,                 // ✅ reduced height
                    bgcolor: "#fff",
                    border: "1px solid #E2E8F0",
                    borderRadius: 2,
                    minHeight: 86,            // ✅ short card
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <Typography sx={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.6 }}>
                    {c.title}
                  </Typography>
                  <Typography sx={{ fontSize: 24, fontWeight: 900, lineHeight: 1.1, mt: 0.3 }}>
                    {c.value}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.3 }}>
                    {c.sub}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </>
    )}
  </Box>
</Card>

  </Grid>

  <Grid item xs={12}>

  </Grid>


<Grid container spacing={3} sx={{ mb: 4 }}>
  

  <Grid item xs={12} sm={6} md={3}>
    <Card sx={{ p: 3, ...cardStyle }}>
      <LeadsOverviewDonut
        totalLeads={leadStats.totalLeads}
        followUpDue={followUpStats.followUpsDue}
        noConsult={noConsultStats.noConsult}
      />
    </Card>
  </Grid>

  <Grid item xs={12} sm={6} md={3}>
    <Card sx={{ p: 3, ...cardStyle }}>
      <OrdersSplitPie
        onlineOrders={data.onlineOrders}
        teamOrders={data.teamOrders}
      />
    </Card>
  </Grid>


  <Grid item xs={12} sm={6} md={3}>
    <Card sx={{ p: 3, ...cardStyle }}>
      <FirstReturningDonut
        firstTime={firstReturning.firstTime}
        returning={firstReturning.returning}
      />
    </Card>
  </Grid>

  <Grid item xs={12} sm={6} md={3}>
    <Card sx={{ p: 3, ...cardStyle }}>
      <EscalationDonut
        open={escalationStats.open}
        closed={escalationStats.closed}
      />
    </Card>
  </Grid>
</Grid>
  <Grid item xs={12}>
    <CustomerCohortHeatmap />
  </Grid>
</Grid>


      <Dialog open={deliveredOpen} onClose={() => setDeliveredOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delivered Sales Per Agent</DialogTitle>
        <DialogContent dividers sx={{ p: 2 }}>
          {deliveredLoading ? (
            <Skeleton height={40} />
          ) : deliveredAgents.length === 0 ? (
            <Typography>No delivered sales yet</Typography>
          ) : (
            deliveredAgents.map((a, index) => {
              const revenue = a.totalDeliveredSales || 0;
              let medal = "";
              if (index === 0) medal = "🥇";
              else if (index === 1) medal = "🥈";
              else if (index === 2) medal = "🥉";
              return (
                <Box
                  key={index}
                  sx={{
                    p: 1.3, mb: 1, borderRadius: 2,
                    bgcolor: index < 3 ? "#FFF9E5" : "#F4F9FF",
                    border: index < 3 ? "1px solid #FFD966" : "1px solid #e0e0e0",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography sx={{ fontSize: 20 }}>{medal}</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{a.fullName}</Typography>
                  </Box>
                  <Typography sx={{ fontWeight: 700, color: index < 3 ? "#B8860B" : "#1976d2" }}>
                    ₹{revenue.toLocaleString()}
                  </Typography>
                </Box>
              );
            })
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeliveredOpen(false)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}


