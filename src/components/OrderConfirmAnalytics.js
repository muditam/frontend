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
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
} from "@mui/material";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import DoneAllOutlinedIcon from "@mui/icons-material/DoneAllOutlined";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import WorkHistoryOutlinedIcon from "@mui/icons-material/WorkHistoryOutlined";
import axios from "axios";

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";

// ===== Range helpers =====
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

const money = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

const formatDateTime = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

function SmallCard({ children }) {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        background: "#fff",
      }}
    >
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function KpiCard({ icon, label, value, prefix = "", accent = "primary" }) {
  const palette =
    {
      primary: { bg: "rgba(25,118,210,.08)", color: "#1976d2" },
      green: { bg: "rgba(76,175,80,.10)", color: "#2e7d32" },
      orange: { bg: "rgba(255,171,0,.14)", color: "#ff9800" },
      teal: { bg: "rgba(0,150,136,.12)", color: "#00796b" },
    }[accent] || { bg: "rgba(25,118,210,.08)", color: "#1976d2" };

  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        background: "#fafafa",
        px: 2.5,
        py: 2,
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: palette.bg,
              color: palette.color,
            }}
          >
            {icon}
          </Box>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
            {label}
          </Typography>
        </Stack>

        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          {prefix}
          {value}
        </Typography>
      </Stack>
    </Card>
  );
}

export default function OrderAnalytics() {
  const [range, setRange] = useState("Today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  const [totalsBox, setTotalsBox] = useState({
    totalOrders: 0,
    totalWorkedOrders: 0,
    totalAmountOfOrders: 0,
    totalAmountOfWorkedOrders: 0,
  });

  const [agentDialog, setAgentDialog] = useState({
    open: false,
    agentId: "",
    agentName: "",
  });
  const [agentDetailsLoading, setAgentDetailsLoading] = useState(false);
  const [agentDetails, setAgentDetails] = useState(null);

  const computedRange = useMemo(() => {
    if (range === "Custom range") {
      if (customStart && customEnd) {
        return { start: customStart, end: customEnd };
      }
      return { start: "", end: "" };
    }
    return getPresetRange(range);
  }, [range, customStart, customEnd]);

  const isCustomRangeIncomplete =
    range === "Custom range" && (!customStart || !customEnd);

  const isCustomRangeInvalid =
    range === "Custom range" &&
    customStart &&
    customEnd &&
    customStart > customEnd;

  const resetTotals = () => {
    setTotalsBox({
      totalOrders: 0,
      totalWorkedOrders: 0,
      totalAmountOfOrders: 0,
      totalAmountOfWorkedOrders: 0,
    });
  };

  const fetchData = useCallback(async () => {
    if (isCustomRangeIncomplete || isCustomRangeInvalid) {
      setRows([]);
      resetTotals();
      return;
    }

    try {
      setLoading(true);
      setError("");

      const params =
        range === "Custom range"
          ? { range: "custom", start: computedRange.start, end: computedRange.end }
          : { range, start: computedRange.start, end: computedRange.end };

      const { data } = await axios.get(`${API_BASE}/api/order-analytics/agents`, {
        params,
      });

      setRows(Array.isArray(data?.items) ? data.items : []);

      if (data?.totals) {
        setTotalsBox({
          totalOrders: Number(data.totals.totalOrders || 0),
          totalWorkedOrders: Number(data.totals.totalWorkedOrders || 0),
          totalAmountOfOrders: Number(data.totals.totalAmountOfOrders || 0),
          totalAmountOfWorkedOrders: Number(data.totals.totalAmountOfWorkedOrders || 0),
        });
      } else {
        resetTotals();
      }
    } catch (e) {
      console.error("order analytics error", e);
      setError("Failed to load order analytics");
      setRows([]);
      resetTotals();
    } finally {
      setLoading(false);
    }
  }, [range, computedRange, isCustomRangeIncomplete, isCustomRangeInvalid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAgentDetails = useCallback(
    async (row) => {
      if (!row?.agentId) return;
      if (isCustomRangeIncomplete || isCustomRangeInvalid) return;

      try {
        setError("");
        setAgentDialog({
          open: true,
          agentId: row.agentId,
          agentName: row.agentName || "",
        });
        setAgentDetailsLoading(true);
        setAgentDetails(null);

        const params =
          range === "Custom range"
            ? { range: "custom", start: computedRange.start, end: computedRange.end }
            : { range, start: computedRange.start, end: computedRange.end };

        const { data } = await axios.get(
          `${API_BASE}/api/order-analytics/agents/${row.agentId}/details`,
          { params }
        );

        setAgentDetails(data || null);
      } catch (e) {
        console.error("agent details error", e);
        setError("Failed to load agent details");
        setAgentDetails(null);
      } finally {
        setAgentDetailsLoading(false);
      }
    },
    [range, computedRange, isCustomRangeIncomplete, isCustomRangeInvalid]
  );

  const closeAgentDetails = () => {
    setAgentDialog({ open: false, agentId: "", agentName: "" });
    setAgentDetails(null);
    setAgentDetailsLoading(false);
  };

  const tableTotals = useMemo(() => {
    const sum = {
      all: 0,
      pending: 0,
      confirmed: 0,
      cnp: 0,
      callBack: 0,
      cancel: 0,
      addLog: 0,
    };

    for (const r of rows) {
      const c = r.counts || {};
      sum.all += c.all ?? 0;
      sum.pending += c.pending ?? 0;
      sum.confirmed += c.confirmed ?? 0;
      sum.cnp += c.cnp ?? 0;
      sum.callBack += c.callBack ?? 0;
      sum.cancel += c.cancel ?? 0;
      sum.addLog += c.addLog ?? 0;
    }

    return sum;
  }, [rows]);

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
      <SmallCard>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
        >
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
              label={
                computedRange.start && computedRange.end
                  ? `Range: ${computedRange.start} → ${computedRange.end}`
                  : "Select custom range"
              }
            />
          </Stack>

          {isCustomRangeInvalid ? (
            <Typography variant="caption" color="error">
              Start date cannot be after end date.
            </Typography>
          ) : error ? (
            <Typography variant="caption" color="error">
              {error}
            </Typography>
          ) : null}
        </Stack>
      </SmallCard>

      <Box sx={{ mt: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            {loading ? (
              <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 }}>
                <Skeleton variant="rounded" height={64} />
              </Card>
            ) : (
              <KpiCard
                icon={<AssignmentOutlinedIcon fontSize="small" />}
                label="Total Orders"
                value={totalsBox.totalOrders}
                accent="primary"
              />
            )}
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            {loading ? (
              <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 }}>
                <Skeleton variant="rounded" height={64} />
              </Card>
            ) : (
              <KpiCard
                icon={<WorkHistoryOutlinedIcon fontSize="small" />}
                label="Total Worked Orders"
                value={totalsBox.totalWorkedOrders}
                accent="orange"
              />
            )}
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            {loading ? (
              <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 }}>
                <Skeleton variant="rounded" height={64} />
              </Card>
            ) : (
              <KpiCard
                icon={<CurrencyRupeeIcon fontSize="small" />}
                label="Total Amount of Orders"
                value={money(totalsBox.totalAmountOfOrders).replace("₹", "")}
                prefix="₹"
                accent="teal"
              />
            )}
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            {loading ? (
              <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 }}>
                <Skeleton variant="rounded" height={64} />
              </Card>
            ) : (
              <KpiCard
                icon={<DoneAllOutlinedIcon fontSize="small" />}
                label="Total Amount of Worked Orders"
                value={money(totalsBox.totalAmountOfWorkedOrders).replace("₹", "")}
                prefix="₹"
                accent="green"
              />
            )}
          </Grid>
        </Grid>
      </Box>

      <Paper sx={{ mt: 2, borderRadius: 3, border: "1px solid", borderColor: "divider" }} elevation={0}>
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, minWidth: 220 }}>
                  Agent Name (Active)
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  All
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  Pending
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  Confirmed Orders
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  CNP
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  Call Back
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  Cancel
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  Add Log Count
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton width={180} />
                    </TableCell>
                    {[...Array(7)].map((__, j) => (
                      <TableCell key={j} align="right">
                        <Skeleton width={40} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Typography variant="body2">
                      {isCustomRangeIncomplete
                        ? "Please select custom start and end date."
                        : "No data for the selected range."}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const c = r.counts || {};
                  return (
                    <TableRow key={r.agentId} hover>
                      <TableCell>
                        <Button
                          variant="text"
                          onClick={() => openAgentDetails(r)}
                          sx={{
                            textTransform: "none",
                            p: 0,
                            minWidth: 0,
                            fontWeight: 700,
                            justifyContent: "flex-start",
                          }}
                        >
                          {r.agentName || "-"}
                        </Button>
                      </TableCell>
                      <TableCell align="right">{c.all || 0}</TableCell>
                      <TableCell align="right">{c.pending || 0}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {c.confirmed || 0}
                      </TableCell>
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
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    {tableTotals.all}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    {tableTotals.pending}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    {tableTotals.confirmed}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    {tableTotals.cnp}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    {tableTotals.callBack}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    {tableTotals.cancel}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    {tableTotals.addLog}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={agentDialog.open} onClose={closeAgentDetails} maxWidth="lg" fullWidth>
        <DialogTitle>
          Agent Details — {agentDialog.agentName || "Agent"}
        </DialogTitle>

        <DialogContent dividers>
          {agentDetailsLoading ? (
            <Stack spacing={2}>
              <Skeleton variant="rounded" height={80} />
              <Skeleton variant="rounded" height={80} />
              <Skeleton variant="rounded" height={240} />
            </Stack>
          ) : !agentDetails ? (
            <Typography variant="body2">No details found.</Typography>
          ) : (
            <Stack spacing={2}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1}
                alignItems={{ xs: "flex-start", md: "center" }}
                justifyContent="space-between"
              >
                <Chip
                  variant="outlined"
                  label={`Selected Range: ${agentDetails?.window?.start || "-"} → ${agentDetails?.window?.end || "-"}`}
                />
                <Chip
                  color="primary"
                  variant="outlined"
                  label={`Today (IST): ${agentDetails?.todayWindow?.start || "-"}`}
                />
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <KpiCard
                    icon={<DoneAllOutlinedIcon fontSize="small" />}
                    label="Confirmed in Selected Range"
                    value={agentDetails?.summary?.confirmedInSelectedWindow || 0}
                    accent="green"
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <KpiCard
                    icon={<AssignmentOutlinedIcon fontSize="small" />}
                    label="Confirmed Today"
                    value={agentDetails?.summary?.confirmedToday || 0}
                    accent="primary"
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <KpiCard
                    icon={<WorkHistoryOutlinedIcon fontSize="small" />}
                    label="Today Confirmed - Today Orders"
                    value={agentDetails?.summary?.confirmedTodaySameDate || 0}
                    accent="orange"
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <KpiCard
                    icon={<CurrencyRupeeIcon fontSize="small" />}
                    label="Today Confirmed - Previous Orders"
                    value={agentDetails?.summary?.confirmedTodayPreviousDate || 0}
                    accent="teal"
                  />
                </Grid>
              </Grid>

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  background: "#fafafa",
                }}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1}
                  useFlexGap
                  flexWrap="wrap"
                >
                  <Chip label={`CNP Today: ${agentDetails?.summary?.cnpToday || 0}`} />
                  <Chip label={`Call Back Today: ${agentDetails?.summary?.callBackToday || 0}`} />
                  <Chip label={`Cancel Today: ${agentDetails?.summary?.cancelToday || 0}`} />
                  <Chip label={`Add Log Today: ${agentDetails?.summary?.addLogToday || 0}`} />
                  <Chip
                    color="success"
                    variant="outlined"
                    label={`Selected Range Amount: ${money(agentDetails?.summary?.confirmedAmountInSelectedWindow || 0)}`}
                  />
                  <Chip
                    color="primary"
                    variant="outlined"
                    label={`Today Confirmed Amount: ${money(agentDetails?.summary?.confirmedAmountToday || 0)}`}
                  />
                  <Chip
                    color="warning"
                    variant="outlined"
                    label={`Previous-Date Confirmed Amount Today: ${money(agentDetails?.summary?.confirmedTodayPreviousDateAmount || 0)}`}
                  />
                </Stack>
              </Paper>

              <Divider />

              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Confirmed Orders List
              </Typography>

              <TableContainer
                component={Paper}
                elevation={0}
                sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Order Name</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Order Date</TableCell>
                      <TableCell>Confirmed At</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {Array.isArray(agentDetails?.items) && agentDetails.items.length > 0 ? (
                      agentDetails.items.map((it) => (
                        <TableRow key={it._id} hover>
                          <TableCell>{it.orderName || "-"}</TableCell>
                          <TableCell>{it.customerName || "-"}</TableCell>
                          <TableCell>{it.contactNumber || "-"}</TableCell>
                          <TableCell>{formatDateTime(it.orderDate || it.createdAt)}</TableCell>
                          <TableCell>{formatDateTime(it.confirmedAt)}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={it.orderType || "-"}
                              color={it.orderType === "Previous-date order" ? "warning" : "success"}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">{money(it.amount || 0)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <Typography variant="body2">
                            No confirmed orders found for this agent in the selected range.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={closeAgentDetails}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}