// src/components/OrderAnalytics.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Card,
  CardContent,
  Chip,
  Skeleton,
} from "@mui/material";
import axios from "axios";

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";

// ===== Range helpers (trimmed to 5 options) =====
const RANGE_OPTS = [
  "Custom range",
  "Today",
  "Yesterday",
  "Last 7 days",
  "Last 30 days",
];

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

// Small wrapper card
function SmallCard({ children }) {
  return (
    <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function OrderAnalytics() {
  // Range state
  const [range, setRange] = useState("Today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]); // [{agentId, agentName, counts:{all,pending,confirmed,cnp,callBack,cancel,addLog}}]
  const [error, setError] = useState("");

  const computedRange = useMemo(() => {
    if (range === "Custom range" && customStart && customEnd) {
      return { start: customStart, end: customEnd };
    }
    return getPresetRange(range);
  }, [range, customStart, customEnd]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params =
        range === "Custom range"
          ? { range: "custom", start: computedRange.start, end: computedRange.end }
          : { range, start: computedRange.start, end: computedRange.end };

      const { data } = await axios.get(`${API_BASE}/api/order-analytics/agents`, { params });
      setRows(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      console.error("order analytics error", e);
      setError("Failed to load order analytics");
    } finally {
      setLoading(false);
    }
  }, [range, computedRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (range === "Custom range" && customStart && customEnd) {
      fetchData();
    }
  }, [range, customStart, customEnd, fetchData]);

  // Totals per column
  const totals = useMemo(() => {
    const sum = { all: 0, pending: 0, confirmed: 0, cnp: 0, callBack: 0, cancel: 0, addLog: 0 };
    for (const r of rows) {
      const c = r.counts || {};
      sum.all += c.all || 0;
      sum.pending += c.pending || 0;
      sum.confirmed += c.confirmed || 0;
      sum.cnp += c.cnp || 0;
      sum.callBack += c.callBack || 0;
      sum.cancel += c.cancel || 0;
      sum.addLog += c.addLog || 0;
    }
    return sum;
  }, [rows]);

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
      {/* Header: Range */}
      <SmallCard>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between">
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

            <Chip
              size="small"
              variant="outlined"
              label={`Range: ${computedRange.start} → ${computedRange.end}`}
            />
          </Stack>

          {error ? (
            <Typography variant="caption" color="error">{error}</Typography>
          ) : null}
        </Stack>
      </SmallCard>

      {/* Table with all columns visible */}
      <Paper sx={{ mt: 2, borderRadius: 3, border: "1px solid", borderColor: "divider" }} elevation={0}>
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, minWidth: 220 }}>Agent Name (Active)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>All</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Pending</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Confirmed Orders</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>CNP</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Call Back</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Cancel</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Add Log Count</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton width={180} /></TableCell>
                    {[...Array(7)].map((__, j) => (
                      <TableCell key={j} align="right"><Skeleton width={40} /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Typography variant="body2">No data for the selected range.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const c = r.counts || {};
                  return (
                    <TableRow key={r.agentId} hover>
                      <TableCell>{r.agentName || "-"}</TableCell>
                      <TableCell align="right">{c.all || 0}</TableCell>
                      <TableCell align="right">{c.pending || 0}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{c.confirmed || 0}</TableCell>
                      <TableCell align="right">{c.cnp || 0}</TableCell>
                      <TableCell align="right">{c.callBack || 0}</TableCell>
                      <TableCell align="right">{c.cancel || 0}</TableCell>
                      <TableCell align="right">{c.addLog || 0}</TableCell>
                    </TableRow>
                  );
                })
              )}

              {!loading && rows.length > 0 && (
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Total</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>{totals.all}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>{totals.pending}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>{totals.confirmed}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>{totals.cnp}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>{totals.callBack}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>{totals.cancel}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>{totals.addLog}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
