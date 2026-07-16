// src/components/OpsDashboard.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Paper,
  Stack,
  Typography,
  Grid,
  TextField,
  Skeleton,
} from "@mui/material";
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

function startOfDayIST(date) {
  const d = new Date(date);
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 3600000);
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, "0");
  const day = String(ist.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function DashboardTile({ label, count, amount, hint, tone = "default", loading = false }) {
  const tones = {
    default: { border: "#d1d5db", bg: "#fff", label: "#6b7280", value: "#111827", amount: "#4f46e5" },
    green: { border: "#bbf7d0", bg: "#f0fdf4", label: "#5da476", value: "#047857", amount: "#047857" },
    indigo: { border: "#c7d2fe", bg: "#eef2ff", label: "#6366d9", value: "#4338ca", amount: "#4f46e5" },
    blue: { border: "#bfdbfe", bg: "#eff6ff", label: "#5b7ee5", value: "#1d4ed8", amount: "#2563eb" },
    purple: { border: "#e9d5ff", bg: "#faf5ff", label: "#a855f7", value: "#7e22ce", amount: "#7c3aed" },
    red: { border: "#fecaca", bg: "#fff1f2", label: "#dc6464", value: "#b91c1c", amount: "#dc2626" },
    orange: { border: "#fed7aa", bg: "#fff7ed", label: "#d97745", value: "#c2410c", amount: "#ea580c" },
    muted: { border: "#e5e7eb", bg: "#fff", label: "#9ca3af", value: "#374151", amount: "#4f46e5" },
    pink: { border: "#fb7185", bg: "#fff1f2", label: "#e11d48", value: "#9f1239", amount: "#e11d48" },
    violet: { border: "#c4b5fd", bg: "#f5f3ff", label: "#7c3aed", value: "#5b21b6", amount: "#6d28d9" },
  };
  const palette = tones[tone] || tones.default;

  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${palette.border}`,
        bgcolor: palette.bg,
        borderRadius: 2,
        px: 2,
        py: 2,
        minHeight: 116,
        display: "grid",
        alignContent: "center",
        gap: 0.5,
      }}
    >
      <Typography variant="overline" sx={{ color: palette.label, fontWeight: 900, letterSpacing: 0.8, lineHeight: 1.2 }}>
        {label}
      </Typography>
      {loading ? (
        <Skeleton width={70} height={42} />
      ) : (
        <Typography variant="h4" sx={{ color: palette.value, fontWeight: 900, lineHeight: 1 }}>
          {Number(count || 0)}
        </Typography>
      )}
      {hint ? (
        <Typography variant="body2" sx={{ color: "#6b7280", fontWeight: 500 }}>
          {hint}
        </Typography>
      ) : amount !== undefined ? (
        <Typography variant="subtitle1" sx={{ color: palette.amount, fontWeight: 900 }}>
          {money(amount)}
        </Typography>
      ) : null}
    </Paper>
  );
}

// ==== Main ====
export default function OpsDashboard() {
  const [{ id: myAgentId, roles }, setIdentity] = useState(getLoggedIn());
  const isManager = useMemo(() => roles.includes("manager"), [roles]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const today = useMemo(() => startOfDayIST(new Date()), []);
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);

  const [metrics, setMetrics] = useState({
    tracking: {
      totals: {
        totalOrders: { count: 0, amount: 0 },
        codOrders: { count: 0, amount: 0 },
        prepaidOrders: { count: 0, amount: 0 },
        delayed: { count: 0, amount: 0 },
      },
      status: {},
      couriers: [],
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
      if (!customStart || !customEnd) {
        setLoading(false);
        return;
      }
      params = { ...params, range: "custom", start: customStart, end: customEnd };

      const { data } = await api.get(`/api/ops-dashboard/metrics`, { params });

      setMetrics({
        tracking: data?.tracking || {
          totals: {},
          status: {},
          couriers: [],
        },
        scope: data?.scope || (isManager ? "all" : "agent"),
        start: customStart,
        end: customEnd,
      });
    } catch (e) {
      console.error("ops metrics error", e);
      setError("Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }, [isManager, myAgentId, customStart, customEnd]);

  useEffect(() => setIdentity(getLoggedIn()), []);
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const tracking = metrics.tracking || {};
  const totals = tracking.totals || {};
  const status = tracking.status || {};
  const couriers = Array.isArray(tracking.couriers) ? tracking.couriers : [];
  const statusTiles = [
    ["DELIVERED", "delivered", "green"],
    ["IN TRANSIT", "inTransit", "indigo"],
    ["SHIPPED", "shipped", "blue"],
    ["OUT FOR DELIVERY", "outForDelivery", "purple"],
    ["RTO INITIATED", "rtoInitiated", "red"],
    ["RTO RECEIVED", "rtoReceived", "orange"],
    ["NOT SHIPPED", "notShipped", "muted"],
    ["CANCELED", "canceled", "muted"],
  ];

  const clearDates = () => {
    setCustomStart(today);
    setCustomEnd(today);
  };

  return (
    <Box sx={{ minHeight: "calc(100vh - 64px)", bgcolor: "#f8fafc", p: { xs: 2, md: 4 } }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "flex-start" }} gap={2}>
        <Typography variant="h5" sx={{ color: "#111827", fontWeight: 900, pt: 1 }}>
          Tracking Dashboard
        </Typography>
        <Stack direction="row" gap={1} alignItems="flex-end" flexWrap="wrap">
          <TextField
            size="small"
            type="date"
            label="From"
            InputLabelProps={{ shrink: true }}
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            sx={{ minWidth: 180, bgcolor: "#fff" }}
          />
          <TextField
            size="small"
            type="date"
            label="To"
            InputLabelProps={{ shrink: true }}
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            sx={{ minWidth: 180, bgcolor: "#fff" }}
          />
          <Button variant="outlined" onClick={clearDates} sx={{ height: 40, borderRadius: 2, textTransform: "none", color: "#6b7280", borderColor: "#e5e7eb" }}>
            Clear
          </Button>
        </Stack>
      </Stack>

      {error ? (
        <Typography variant="caption" color="error" sx={{ mt: 1, display: "inline-block" }}>
          {error}
        </Typography>
      ) : null}

      <Grid container spacing={2} sx={{ mt: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardTile label="TOTAL ORDERS" count={totals.totalOrders?.count} amount={totals.totalOrders?.amount} loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardTile label="COD ORDERS" count={totals.codOrders?.count} amount={totals.codOrders?.amount} loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardTile label="PREPAID ORDERS" count={totals.prepaidOrders?.count} amount={totals.prepaidOrders?.amount} loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardTile label="DELAYED" count={totals.delayed?.count} hint="Past 7-day SLA" loading={loading} />
        </Grid>
      </Grid>

      <Typography variant="overline" sx={{ display: "block", mt: 4, mb: 1.5, color: "#6b7280", fontWeight: 900, letterSpacing: 1 }}>
        BY STATUS
      </Typography>
      <Grid container spacing={2}>
        {statusTiles.map(([label, key, tone]) => (
          <Grid item xs={12} sm={6} md={3} key={key}>
            <DashboardTile label={label} count={status[key]?.count} amount={status[key]?.amount} tone={tone} loading={loading} />
          </Grid>
        ))}
      </Grid>

      <Typography variant="overline" sx={{ display: "block", mt: 4, mb: 1.5, color: "#6b7280", fontWeight: 900, letterSpacing: 1 }}>
        BY COURIER PARTNER
      </Typography>
      <Grid container spacing={2}>
        {couriers.map((courier) => (
          <Grid item xs={12} sm={6} md={3} key={courier.label}>
            <DashboardTile label={courier.label} count={courier.count} amount={courier.amount} loading={loading} />
          </Grid>
        ))}
        <Grid item xs={12} sm={6} md={3}>
          <DashboardTile label="LOST IN TRANSIT" count={status.lostInTransit?.count} amount={status.lostInTransit?.amount} tone="pink" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardTile label="REFUNDED" count={status.refunded?.count} amount={status.refunded?.amount} tone="violet" loading={loading} />
        </Grid>
      </Grid>
    </Box>
  );
}
